require('mocha');
const expect = require('chai').expect;
const fs = require('fs');
const resolvePath = require('path').resolve;
const streamAssert = require('stream-assert');
const File = require('vinyl');
const gulp = require('gulp');
const extendStream = require('./stream-extensions');
const tsLink = require('../');

function fxt (name) { 
  return resolvePath(__dirname, 'fixtures', name + '.ts'); 
}

function use (name, buffer) {
  var stream = gulp.src(fxt(name), {buffer: !!buffer});
  return extendStream(stream);
}

    //should return a stream when outputAs set to stream
    //should return a buffer when outputAs set to buffer
    //should emit imports when preserveImports true
    //should emit exports when preserveExports true
    //should change newLine char when one given
    //should change file name to outFile
    //should change current working directory when cwd given

    //FIXTURES:
    //src tag, ref line, src tag, ref line - relpath
    //import tag, code - import
    //code, export tag - export
    //emit tag - emit
    //ref tag, code - inject
    //code, code, code - content
    //start omit tag, code, code, code, end omit tag, code - omit

describe('gulp-ts-link', function() {

  describe('tsLink()', function() {
    it('should ignore null files', function (done) {
      // configure stream pipeline
      var stream = tsLink()
        .pipe(streamAssert.length(0))
        .pipe(streamAssert.end(done));

      // start stream with null file
      stream.write(new File());
      stream.end();
    });

    it('should not fail if no files were input to stream', function () {
      var stream = tsLink().pipe(streamAssert.end(done));

      stream.end();
    });

    it('should not emit TS/ES6 import statements by default', function (done) {
      use('import')
        .x.tsLink()
        .x.expectLength(1)
        .x.expectContent('let f = 32;')
        .x.endStream(done);
    });

    it('should not emit TS/ES6 export statements by default', function (done) {
      use('export')
        .x.tsLink()
        .x.expectLength(1)
        .x.expectContent('let d = 16;')
        .x.endStream(done);
    });

    it('should exclude `export` keyword when exporting a class/interface/etc.', function (done) {
      use('export')
        .x.tsLink()
        .x.expectLength(1)
        .x.expectContent('let d = 16;')
        .x.endStream(done);
    });

    it('should emit content specified in @tslink:emit to output file.', function (done) {
      use('emit')
        .x.tsLink()
        .x.expectLength(1)
        .x.expectContent('let g = 64;')
        .x.endStream(done);
    });

    it('should emit content from file specified in @tslink:inject comment to output file.', function (done) {
      use('inject')
        .x.tsLink()
        .x.expectLength(1)
        .x.expectContent('let a = 2;\r\nlet b = 4;\r\nlet c = 8;')
        .x.endStream(done);
    });

    it('should use path specified in @tslink:relPath comment to resolve full path of all subsequent @tslink:inject comments.', function (done) {
      use('relpath')
        .x.tsLink()
        .x.expectLength(1)
        .x.expectContent('let subDirA = 100;\r\nlet subDirB = 1000;')
        .x.endStream(done);
    });

    it('should not emit content between @tslink:startOmit and  @tslink:endOmit comments to output file.', function (done) {
      use('omit')
        .x.tsLink()
        .x.expectLength(1)
        .x.expectContent('let k = 1024;')
        .x.endStream(done);
    });

    it('should return buffer file when input file content is buffer by default', function (done) {
      use('content', true) //buffer: true
        .x.tsLink()
        .x.expectLength(1)
        .x.expectBufferFile()
        .x.endStream(done);
    });

    it('should return stream file when input file content is stream by default', function (done) {
      use('content', false) //buffer: false
        .x.tsLink()
        .x.expectLength(1)
        .x.expectStreamFile()
        .x.endStream(done);
    });
  });
  
  describe('options', function () {
    
  });
});
