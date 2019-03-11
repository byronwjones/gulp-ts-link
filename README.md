# gulp-ts-link [![Build Status](https://travis-ci.com/byronwjones/gulp-ts-link.svg?branch=master)](https://travis-ci.com/byronwjones/gulp-ts-link)
Build a good ol' fashioned **nonmodular, ES3 compatible, single file** JavaScript library to run in a browser, while preserving all of the awesome code organization benefits that come from using multiple source files and TypeScript modules during development.  No more Webpack weirdness in your transpiled code.  Because sometimes, you can have it all.

## Installation
Make sure you have `npm`, then run the console command `npm install gulp-ts-link --save-dev`

##Usage
Firstly, you'll need an *entry file* -- the place where all your individual TypeScript source files will come together to form a single TypeScript, which you will in turn transpile to create your JavaScript library.  The order in which your source files are included in your entry file is manually defined using *comment directives*.  For example:

###index.es3.ts
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

