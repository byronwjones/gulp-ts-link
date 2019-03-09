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

    it('should not fail if no files were input to stream', function (done) {
      var stream = tsLink().pipe(streamAssert.end(done));

      stream.end();
    });

    it('should not emit TS/ES6 import statements by default', function (done) {
      use('import')
        .x().tsLink()
        .x().expectStreamLength(1)
        .x().expectContent('let f = 32;\r\n')
        .x().endStream(done);
    });

    it('should not emit TS/ES6 export statements by default', function (done) {
      use('export')
        .x().tsLink()
        .x().expectStreamLength(1)
        .x().expectContent('let d = 16;\r\n')
        .x().endStream(done);
    });

    it('should exclude `export` keyword when exporting a class/interface/etc.', function (done) {
      use('export-object')
        .x().tsLink()
        .x().expectStreamLength(1)
        .x().expectContent('class e {};\r\n')
        .x().endStream(done);
    });

    it('should emit content specified in @tslink:emit to output file.', function (done) {
      use('emit')
        .x().tsLink()
        .x().expectStreamLength(1)
        .x().expectContent('let g = 64;\r\n')
        .x().endStream(done);
    });

    it('should emit content from file specified in @tslink:inject comment to output file.', function (done) {
      use('inject')
        .x().tsLink()
        .x().expectStreamLength(1)
        .x().expectContent('let a = 2;\r\nlet b = 4;\r\nlet c = 8;\r\n')
        .x().endStream(done);
    });

    it('should use path specified in @tslink:relPath comment to resolve full path of all subsequent @tslink:inject comments.', function (done) {
      use('relpath')
        .x().tsLink()
        .x().expectStreamLength(1)
        .x().expectContent('let subDirA = 100;\r\nlet subDirB = 1000;\r\n')
        .x().endStream(done);
    });

    it('should not emit content between @tslink:startOmit and  @tslink:endOmit comments to output file.', function (done) {
      use('omit')
        .x().tsLink()
        .x().expectStreamLength(1)
        .x().expectContent('let k = 1024;\r\n')
        .x().endStream(done);
    });

    it('should return buffer file when input file content is buffer by default', function (done) {
      use('content', true) //buffer: true
        .x().tsLink()
        .x().expectStreamLength(1)
        .x().expectBufferFile()
        .x().endStream(done);
    });

    it('should return stream file when input file content is stream by default', function (done) {
      use('content', false) //buffer: false
        .x().tsLink()
        .x().expectStreamLength(1)
        .x().expectStreamFile()
        .x().endStream(done);
    });
  });

  describe('options', function () {
    it('should return stream file when outputAs is set to `stream`', function (done) {
      use('content', true) //input file is a buffer
        .x().tsLink({outputAs: 'stream'})
        .x().expectStreamLength(1)
        .x().expectStreamFile()
        .x().endStream(done);
    });

    it('should return buffer file when outputAs is set to `buffer`', function (done) {
      use('content', false) //input file is a stream
        .x().tsLink({outputAs: 'buffer'})
        .x().expectStreamLength(1)
        .x().expectBufferFile()
        .x().endStream(done);
    });

    it('should emit TS/ES6 import statements when preserveImport is true', function (done) {
      use('import')
        .x().tsLink({preserveImport: true})
        .x().expectStreamLength(1)
        .x().expectContent('import { d } from "./export";\r\nlet f = 32;\r\n')
        .x().endStream(done);
    });

    it('should emit TS/ES6 export statements when preserveExport is true', function (done) {
      use('export')
        .x().tsLink({preserveExport: true})
        .x().expectStreamLength(1)
        .x().expectContent('let d = 16;\r\nexport { d };\r\n')
        .x().endStream(done);
    });

    it('should use given new line character(s) when provided', function (done) {
      use('content')
        .x().tsLink({newLine: '$'})
        .x().expectStreamLength(1)
        .x().expectContent('let a = 2;$let b = 4;$let c = 8;$')
        .x().endStream(done);
    });

    it('should change the base directory used to resolve all relative paths and external file refences when provided', function (done) {
      use('base')
        .x().tsLink({base: './test/fixtures/subdirA'})
        .x().expectStreamLength(1)
        .x().expectContent('let subDirA = 100;\r\n')
        .x().endStream(done);
    });

    it('should change the file name when a different one is provided', function (done) {
      use('content')
        .x().tsLink({outFile: 'test.ts'})
        .x().expectStreamLength(1)
        .x().expectFile(function(file){
          expect(file.path.indexOf('test.ts') > 0).to.be.true;
        })
        .x().endStream(done);
    });
  });
});
