# gulp-ts-link [![Build Status](https://travis-ci.com/byronwjones/gulp-ts-link.svg?branch=master)](https://travis-ci.com/byronwjones/gulp-ts-link)
Build a good ol' fashioned **nonmodular, ES3 compatible, single file** JavaScript library to run in a browser, while preserving all of the awesome code organization benefits that come from using multiple source files and TypeScript modules during development.  No more Webpack weirdness in your transpiled code.  Because sometimes, you can have it all.

## Installation
Make sure you have `npm`, then run the console command `npm install gulp-ts-link --save-dev`

## Usage
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

Of course, having all of your `@tslink:inject` directives in one file can become difficult to manage if you have several source files.  Files referenced with `@tslink:inject` can also contain `@tslink:inject` directives, so if you have a project structure like this:
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


PATHS RESOLVED FROM CWD BY DEFAULT - USE RELPATH
IMPORT REMOVED BY DEFAULT
EXPORT {} REMOVED BY DEFAULT
EXPORT KEYWORD REMOVED ONLY WHEN THIS PATTERN NOT FOLLOWED
NEED TO MASSAGE TO WORK WELL - ESP IF CREATING ES6 AND 3
CERTAIN LINES YOU DONT WANT
LINES YOU WANT TO ADD
PLUGIN USAGE
OPTIONS
 - outFile (else will be input file name)
 - base
 - outputAS
 - newLine
 - preserveImport
 - preserveExport
