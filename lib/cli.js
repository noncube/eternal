#!/usr/bin/env node
var fs = require('fs'),
    path = require('path'),
    nomnom = require('nomnom'),
    child_process = require('child_process');


var PKG_INFO = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf-8'));

nomnom.script(PKG_INFO.name)
    .option('version', {
        abbr: 'v',
        flag: true,
        help: 'Print version and exit',
        callback: function() {
            return PKG_INFO.name + " v" + PKG_INFO.version;
        }
    });

nomnom.command('start')
    .callback(start)
    .option('file', {
        position: 1,
        help: 'Application to run'
    })
    .option('max', {
        abbr: 'n',
        default: 10,
        help: 'Max number of restarts. Set to -1 for infinite'
    })
    .option('watch', {
        abbr: 'w',
        flag: true,
        default: false,
        help: 'Watch files for changes and restart any time a change is detected'
    })
    .help("Run the application and restart if it stops");

nomnom.command('stop')
    .option('file', {
        position: 0,
        help: 'Application to stop'
    })
    .callback(function(opts) {
        // todo
    })
    .help("Stop an application running under " + PKG_INFO.name);


nomnom.nom();



function start (opts) {
    var out = fs.openSync('./out.log', 'a'),
        err = fs.openSync('./out.log', 'a');

    // process.execPath is the current node path
    var child = child_process.spawn(
        process.execPath,
        [path.join(__dirname, 'service.js'), path.resolve(opts.file)],
        {
            stdio: [ 'ignore', out, err ],
            detached: true
        }
    );

    // remove our service spawn reference, so this script will exit without waiting
    // for the child to finish
    child.unref();

    console.log(opts);
    console.log(process);
}


