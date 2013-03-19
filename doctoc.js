#!/usr/bin/env node

'use strict';

var path      =  require('path')
  , fs        =  require('fs')
  , file      =  require('./lib/file')
  , transform =  require('./lib/transform')
  , argv      =  process.argv
  , files;

function cleanPath(path) {
  var homeExpanded = (path.indexOf('~') === 0) ? process.env.HOME + path.substr(1) : path;

  // Escape all spaces
  return homeExpanded.replace(/\s/g, '\\ ');
}

function transformAndSave(files) {
  console.log('\n==================\n');
  
  var transformed = files
    .map(function (x) {
      var content = fs.readFileSync(x.path, 'utf8')
        , result = transform(content);
      result.path = x.path;
      return result;
    });
  var changed = transformed.filter(function (x) { return x.transformed; })
    , unchanged = transformed.filter(function (x) { return !x.transformed; });

  unchanged.forEach(function (x) {
    console.log('"%s" is up to date', x.path);
  });

  changed.forEach(function (x) { 
    console.log('"%s" will be updated', x.path);
    fs.writeFileSync(x.path + ".new", x.data, 'utf8'); // adding .new
  });
}

if (argv.length !== 3) {
  console.log('Usage: doctoc <path> (where path is some path to a directory (i.e. .) or a file (i.e. README.md) )');
  process.exit(0);
}

var target = cleanPath(argv[2]),
  stat = fs.statSync(target);

if (stat.isDirectory()) {
  console.log ('\nDocToccing "%s" and its sub directories.', target);
  files = file.findMarkdownFiles(target);
} else {
  console.log ('\nDocToccing single file "%s".', target);
  files = [{ path: target }];
}

transformAndSave(files);

console.log('\nEverything is OK.');

