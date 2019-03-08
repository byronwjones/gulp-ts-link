'use strict';

const through = require('through2');
const PluginError = require('plugin-error');
const fs = require('fs');
const split = require('split');
const pathResolver = require('path').resolve;

const PLUGIN_NAME = 'gulp-ts-link';

function linkFile(options, readFrom, writeTo, onError, onCompleted) {
    //create a read stream if one not provided
    if(!readFrom) {
        onError('No input file name or stream provided');
        return;
    }
    if(Object.prototype.toString.call(readFrom) == '[object String]') {
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
    rootPath = null;
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
        writeTo.write(line + '\r\n');
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
            xref: /^\s*\/\/\s*@link:include\s+/i,
            write: /^\s*\/\/\s*@link:write\s/i,
            rootPath: /^\s*\/\/\s*@link:rootpath\s+/i,
            startOmit: /^\s*\/\/\s*@link:startomit($|\s.*)/i,
            endOmit: /^\s*\/\/\s*@link:endomit($|\s.*)/i,
            export: /^\s*export\s+/,
            import: /^\s*import\s+/
        };
        // handle external file reference
        if(!ignoringLines && rx.xref.test(line)){
            line = line.replace(rx.xref, '');
            line = !!rootPath ? pathResolver(rootPath, line) : pathResolver(line);
            
            //console.log('file path resolved to ' + line);
            //console.log('rootPath set to ' + rootPath);

            linkFile(line, writeTo, errorHandler, finishBufferRead);
        }
        // anything else handled locally
        else {
            // set root path for all include references below this line in this file
            if(rx.rootPath.test(line)) {
                line = line.replace(rx.rootPath, '');
                rootPath = line;
                //console.log('rootPath set to ' + rootPath);
            }
            // automatically ignore import statements
            else if(rx.import.test(line)) { }
            // write uncommented code into stream
            else if(!ignoringLines && rx.write.test(line)) {
                line = line.replace(rx.write, '');
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
            // remove export keyword
            else if(!ignoringLines && rx.export.test(line)) {
                line = line.replace(rx.export, '');
                writeLine(line);
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
//OPTIONS: outputAs, newLine, outFile, preserveImport, preserveExport
// PLUGIN
function main() {
  // define the Gulp stream
  var stream = through.obj(function(file, enc, cb) {
    if (file.isNull()) {
        return cb(null, file);
    }
    if (file.isBuffer()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Buffers are not supported in this version.'));
      return cb();
    }

    if (file.isStream()) {
      // define the stream that will transform the content
      var outStream = linkFile(file.contents, null, function error(err){
        this.emit('error', new PluginError(PLUGIN_NAME, err));
        !!outStream && outStream.end();
      }, function done(){
        outStream.end();
        cb(null, file);
      });

      // catch errors from the output stream
      outStream.on('error', this.emit.bind(this, 'error'));

      // transform file contents
      file.contents = outStream;
    }
    else {
        this.emit('error', new PluginError(PLUGIN_NAME, 'Unknown file type not supported'));
        return cb();
    }
  });

  // returning the file stream
  return stream;
}

// exporting the plugin main function
module.exports = main;