const expect = require('chai').expect;
const streamAssert = require('stream-assert');
const through = require('through2');
const tsLink = require('../');

function bufferContents () {
    var buf = [];

    var stream = through.obj(function(file, enc, cb) {
        //null file or file already buffered: nothing to do
        if (file.isNull() || file.isBuffer()) {
            return cb(null, file);
        }

        if (file.isStream()) {
        // define the stream that will transform the content
        var fStream = file.contents;
        
        fStream.on('data', function (data){ buf.push(data); });
        fStream.on('end', function(){
            file.contents = Buffer.concat(buf);
            cb(null, file);
        });
        }
        else {
            // should never happen
            throw new Error('Unexpected file type encountered');
        }
    });

    // returning the file stream
    return stream;
}
  
var StreamExtensionProto = {
    tsLink: function (options) {
        this.stream = this.stream.pipe(tsLink(options));
        return extendStream(this.stream);
    },
    expectStreamLength: function (len) {
        this.stream = this.stream.pipe(streamAssert.length(len));
        return extendStream(this.stream);
    },
    expectFile: function (assertion) {
        this.stream = this.stream.pipe(streamAssert.first(assertion));
        return extendStream(this.stream);
    },
    expectContent: function (txt) {
        this.stream = this.stream.pipe(bufferContents())
            .pipe(streamAssert.first(function (file) { 
            expect(file.contents.toString()).to.equal(txt);
        }));
        return extendStream(this.stream);
    },
    expectStreamFile: function () {
        return this.stream.x().expectFile(function (file) { 
            expect(file.isStream()).to.be.true;
        });
    },
    expectBufferFile: function () {
        return this.stream.x().expectFile(function (file) { 
            expect(file.isBuffer()).to.be.true;
        });
    },
    endStream: function (done) {
        this.stream = this.stream.pipe(streamAssert.end(done));
        return extendStream(this.stream);
    }  
};

function StreamExtension(s) {
    this.stream = s;
}
StreamExtension.prototype = StreamExtensionProto;

function extendStream (stream) {
    stream.x = function(){
        return new StreamExtension(stream);
    };
    return stream;
}

module.exports = extendStream;