'use strict';

const through = require('through2');
const PluginError = require('plugin-error');
const fs = require('fs');
const split = require('split');
const pathResolver = require('path').resolve;
const pathJoin = require('path').join;
const ReadableStream = require('stream').Readable;

const PLUGIN_NAME = 'gulp-ts-link';

function isNullOrUndefined(obj) {
  return obj === (void 0) || obj === null; 
}
function isString(value) {
  return !isNullOrUndefined(value) && (typeof value === 'string');
}
function setConfiguration(options) {
  options = options || {};

  var config = {
    base: isString(options.base) ? options.base : null,
    outFile: isString(options.outFile) ? options.outFile : null,
    outputAs: 'input',
    newLine: isString(options.newLine) ? options.newLine : '\r\n',
    preserveImport: !!options.preserveImport,
    preserveExport: !!options.preserveExport
  };

  if(!!options.outputAs) {
    var oa = options.outputAs.toLowerCase().trim();
    var acceptable = ['input', 'buffer', 'stream'];
    if(acceptable.indexOf(oa) >= 0) { config.outputAs = oa; }
  }

  return config;
}

function linkFile(options, readFrom, writeTo, onError, onCompleted) {
    //create a read stream if one not provided
    if(!readFrom) {
        onError('No input file name or stream provided');
        return;
    }
    if(isString(readFrom)) {
        readFrom = readFrom.trim();
        if(readFrom === ''){
            onError('No input file name or stream provided');
            return;
        }

        try {
            readFrom = fs.createReadStream(readFrom);
        }
        catch(e) {
            onError(e.toString());
            return;
        }
    }
    //create a new write stream if one isn't provided
    writeTo = writeTo || through();

    // chunk stream by lines
    readFrom = readFrom.pipe(split());

    var lineBuffer = [], 
    bufferBusy = false, 
    doneReading = false, 
    completed = false, 
    ignoringLines = false,
    relPath = options.base;
    //process lines from input buffer
    readFrom.on('data', function(data) {
        lineBuffer.push(data);
        if(!bufferBusy && !completed) {
            readFromBuffer();
        }
    });
    readFrom.on('end', function() {
        doneReading = true;
        if(!bufferBusy && !completed) {
            readFromBuffer();
        }
    });
    readFrom.on('error', errorHandler);

    return writeTo;

    function errorHandler(e) {
        readFrom.close();
        onError('Error occurred while reading file: ' + e);
        doneReading = true;
        completed = true;
        onCompleted = null; // never fire callback
    }

    function writeLine(line) {
        writeTo.write(line + options.newLine);
    }

    function readFromBuffer() {
        if(completed){ return; }

        bufferBusy = true;
        if(!lineBuffer.length) {
            finishBufferRead();
            return;
        }

        var line = lineBuffer.shift();

        var rx = {
            inject: /^\s*\/\/\s*@tslink\s*:\s*inject\s+/i,
            emit: /^\s*\/\/\s*@tslink\s*:\s*emit\s/i,
            relPath: /^\s*\/\/\s*@tslink\s*:\s*relpath\s+/i,
            startOmit: /^\s*\/\/\s*@tslink\s*:\s*startomit($|\s.*)/i,
            endOmit: /^\s*\/\/\s*@tslink\s*:\s*endomit($|\s.*)/i,
            export: /^\s*export\s*\{\s*[^}\s]+\s*\}/,
            exportObj: /^\s*export\s+/,
            import: /^\s*import\s+/
        };
        // handle external file reference
        if(!ignoringLines && rx.inject.test(line)){
            line = line.replace(rx.inject, '');
            line = !!relPath ? pathResolver(relPath, line) : pathResolver(line);

            linkFile(options, line, writeTo, errorHandler, finishBufferRead);
        }
        // anything else handled locally
        else {
            // set root path for all include references below this line in this file
            if(rx.relPath.test(line)) {
                line = line.replace(rx.relPath, '');
                relPath = !!options.base ? pathResolver(options.base, line) : line;
            }
            // automatically ignore import statements
            else if(!options.preserveImport && rx.import.test(line)) { }
            // automatically ignore export statements with {}
            else if(!options.preserveExport && rx.export.test(line)) { }
            // remove export keyword on class/interface exports
            else if(!ignoringLines && rx.exportObj.test(line) && !rx.export.test(line)) {
                line = line.replace(rx.exportObj, '');
                writeLine(line);
            }
            // write uncommented content into stream
            else if(!ignoringLines && rx.emit.test(line)) {
                line = line.replace(rx.emit, '');
                writeLine(line);
            }
            // start omitting lines of code
            else if(rx.startOmit.test(line)) {
                ignoringLines = true;
            }
            // stop omitting lines of code
            else if(rx.endOmit.test(line)) {
                ignoringLines = false;
            }
            // normal line of code
            else if(!ignoringLines) {
                writeLine(line);
            }

            finishBufferRead();
        }
    }

    function finishBufferRead() {
        // read from the line buffer again if there are lines queued
        if(!!lineBuffer.length) {
            readFromBuffer();
        }
        else {
            if(doneReading) {
                !!onCompleted && onCompleted();// call if not null
                completed = true;
            }
            else {
                bufferBusy = false;
            }
        }
    }
}

// PLUGIN
function main(options) {
  // define the Gulp stream
  var stream = through.obj(function(file, enc, cb) {
    if (file.isNull()) {
        return cb(null, file);
    }
    
    // normalize options map with defaults
    if(isString(options)) {
      options = {outFile: options};
    }
    options = setConfiguration(options);

    var bufferContent = false,
    inStream,
    outBuffer = [];

    if (file.isBuffer()) {
      // convert buffer to stream
      inStream = new ReadableStream();
      inStream.push(file.contents);
      inStream.push(null);

      //output a buffer whenever input is buffer, unless user wants a stream
      bufferContent = options.outputAs !== 'stream';
    }
    else if (file.isStream()) {
      inStream = file.contents;

      // output a stream whenever input is a stream, unless user wants a buffer
      bufferContent = options.outputAs === 'buffer';
    }
    else {
        this.emit('error', new PluginError(PLUGIN_NAME, 'Unsupported file type encountered'));
        return cb();
    }

    // define the stream that will transform the content
    var outStream = linkFile(options, inStream, null, function error(err){
      this.emit('error', new PluginError(PLUGIN_NAME, err));
      outStream.end();
    }, function done(){
      outStream.end();
    });

    // catch errors from the output stream
    outStream.on('error', this.emit.bind(this, 'error'));

    // change file name if requested
    if(!!options.outFile) {
      file.path = pathJoin(file.base, options.outFile);
    }

    // when changing file content to buffer, we need to wait until done writing output stream to callback
    if(bufferContent) {
      outStream.on('data', function(data){
        outBuffer.push(data);
      });
      outStream.on('end', function() {
        file.contents = Buffer.concat(outBuffer);
        cb(null, file);
      });
    }
    else {
      file.contents = outStream;
      cb(null, file);
    }
  });

  // returning the file stream
  return stream;
}

// exporting the plugin main function
module.exports = main;