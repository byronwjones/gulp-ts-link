# gulp-ts-link [![Build Status](https://travis-ci.com/byronwjones/gulp-ts-link.svg?branch=master)](https://travis-ci.com/byronwjones/gulp-ts-link)
Build a good ol' fashioned **nonmodular, ES3 compatible, single file** JavaScript library to run in a browser, while preserving all of the awesome code organization benefits that come from using multiple source files and TypeScript modules during development.  No more Webpack weirdness in your transpiled code.  Because sometimes, you can have it all.

## Installation
Make sure you have `npm`, then run the console command `npm install gulp-ts-link --save-dev`

## Usage

### Preparation
To get started, you will need an *entry file* -- the place where all your individual TypeScript source files will come together to form a single TypeScript file, which you will in turn transpile to create your JavaScript library.  The order in which your source files are included in your entry file is manually defined using *comment directives*.  For example:

#### index.tslink.ts
```js
let myLibrary = (function(){
    // @tslink:inject source-file-a.ts
    
    // @tslink:inject source-file-b.ts
    
    // @tslink:inject source-file-c.ts
    
    let lib = new MyMainClass();
    
    return lib;
})();
```

Our entry file wraps our library in an IIFE (Immediated-Invoked Function Expression) to avoid polluting the global object, and uses the `@tslink:inject [path-to-source-file]` directive to specify where to place each of the source files in the output file.

> **IMPORTANT:** When an absolute path is not given, the path to file referenced in a `@tslink:inject` directive is relative to the location of the file containing the directive.

Of course, having all of your `@tslink:inject` directives in one file can become difficult to manage if you have several source files.  Files referenced with `@tslink:inject` may also contain `@tslink:inject` directives, so if you have a project structure like this:
```
|-- src
| |-- subdir-a
| | |-- source-file-a.ts
| | |-- source-file-b.ts
| |-- subdir-b
| | |-- source-file-a.ts
| | |-- source-file-b.ts
```

You can add an 'index' file to each subdirectory, each in turn containing references to source in that subdirectory:
<pre>
|-- src<br>
| |-- subdir-a<br>
| | |-- <b>index.tslink.ts</b><br>
| | |-- source-file-a.ts<br>
| | |-- source-file-b.ts<br>
| |-- subdir-b<br>
| | |-- <b>index.tslink.ts</b><br>
| | |-- source-file-a.ts<br>
| | |-- source-file-b.ts
</pre>

In which case, your entry file will only need to contain references to one file from each subdirectory.

This plugin typically 'demodularizes' the code in the output file automatically.  All `import` statements are omitted from the output file by default, as well as `export` *statements*, e.g.:
```js
export { foo as bar }
```
When a exporting a *declaration*, e.g.:
```js
export class Foo { }
```
Only the `export` keyword is omitted.

There may be some cases where you will need to alter the source emitted to the output file, especially if you intend to publish ES6 modules and a ES3 compatible library.  This can be accomplished using the `@tslink:startOmit`, `@tslink:endOmit`, and `@tslink:emit` directives:

#### source-file.ts
```js
import { foo } from "foo.ts";
// @tslink:startOmit
// all of the code between the 
//     @tslink:startOmit and @tslink:endOmit 
// directives will be omitted from the output file
let thisLineWillBeOmitted = true,
    thisOneToo = true;
// @tslink:endOmit

let bar:any = thisWillNotBeOmitted(ofCourse);

// @tslink:emit let baz:any = thisWillBeIncludedUncommented(yep);

export class MyAwesomeClass { }
export { thisLineWillBeOmitted }
```

#### resulting-output.ts
```js

let bar:any = thisWillNotBeOmitted(ofCourse);

let baz:any = thisWillBeIncludedUncommented(yep);

class MyAwesomeClass { }
```

### Implementation
```js
const gulp = require('gulp');
const tsLink = require('gulp-ts-link');

module.exports = function () {
    // Notice that buffer is set to false (using file stream).
    // By default, if input is stream, output is stream
    //     -- if input is buffer, output is buffer
    // Making sure the output file contents stream is highly recommended,
    //     especially if you anticipate a large output file
    return gulp.src('./src/index.tslink.ts', {buffer: false})
        .pipe(tsLink())
        .pipe(gulp.dest('./src/temp'));
};
```

By default, the output file name is the same as the input file name.  If you want to specify the name of the output file, you can pass it in:
```js
const gulp = require('gulp');
const tsLink = require('gulp-ts-link');

module.exports = function () {
    return gulp.src('./src/index.tslink.ts', {buffer: false})
        .pipe(tsLink('my-output-file.ts'))
        .pipe(gulp.dest('./src/temp'));
};
```
Pass in an options map if you wish to modify the default behavior of the plugin:
```js
const gulp = require('gulp');
const tsLink = require('gulp-ts-link');

module.exports = function () {
    return gulp.src('./src/index.tslink.ts', {buffer: false})
        .pipe(tsLink({ outFile: 'my-output-file.ts', outputAs: 'stream' }))
        .pipe(gulp.dest('./src/temp'));
};
```

### Options
<pre><b>outFile: string</b></pre>
The name of the file produced by this plugin. Same as the name of the input file by default.

<pre><b>outputAs: string</b></pre>
The output file content type. Acceptable values are:
 - `input`'`: Output file content type will match in the input file content type **(default)**
 - `buffer`: Output file content is a buffer
 - `stream`: Output file content is a stream
 Any other values given will be ignored, and the default value will be used.

<pre><b>newLine: string</b></pre>
The newline character sequence to use when creating the output file.  The default is `\r\n`.

<pre><b>preserveImport: Boolean</b></pre>
When true, TypeScript `import` declarations are not omitted from the output file.  The default is false.

<pre><b>preserveExport: Boolean</b></pre>
When true, TypeScript `export` statements are not omitted from the output file.  The default is false.  Note that this setting has no effect on how *declaration exports*, such as `export const foo = 1024`, are handled.  In the latter case, the `export` keyword is omiited from the output file.