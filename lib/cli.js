#!/usr/bin/env node
var fs = require('fs'),
    path = require('path'),

    nomnom = require('nomnom'),

    messages = require('./messages'),
    util = require('./util');


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
    .option('exec', {
        abbr: 'e',
        help: 'Run something other than the node.js interpreter'
    })
    .option('file', {
        position: 1,
        help: 'Application to run'
    })
    .option('max', {
        abbr: 'n',
        default: 0,
        help: 'Max number of restarts. Set to 0 for infinite'
    })
    .option('watch', {
        abbr: 'w',
        flag: true,
        default: false,
        help: 'Watch files for changes and restart any time a change is detected'
    })
    .help("Run an application and restart it if it stops");

nomnom.command('stop')
    .option('file', {
        position: 0,
        help: 'Application to stop'
    })
    .callback(function(opts) {
        // todo
    })
    .help("Stop an application running under " + PKG_INFO.name);


// for dev
nomnom.command('process')
    .callback(function(opts) {
        console.log(process);
    });

nomnom.nom();

function start (opts) {
    console.log(opts);

    var callback = function(err, data) {
        if (!err)
            return console.log('Success!');

        if (err.code === 'ENOENT' && err.syscall === 'stat')
            return console.error(err.path + ' does not exist.');

        console.error('Something went wrong: ');
        console.trace(err.stack);
    };

    messages.pingServer(function(err, success) {
        if (success && !err) {
            console.log('telling eternal to watch this program...');
            return messages.sendJob(opts, callback);
        }

        if (err && err.code !== 'ENOENT') {
            return console.error('Something went wrong: ', err);
        }

        console.log('starting eternal... ');

        var serv = util.startServer();

        setTimeout(function(){
            // remove our service spawn reference, so this script will exit without waiting
            // for the child to finish
            serv.unref();

            console.log('telling eternal to watch this program');
            messages.sendJob(opts, callback);
        }, 800)
    });
}


