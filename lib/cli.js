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
    var callback = function(err, data) {
        if (err) {
            if (err.code === 'ENOENT' && err.syscall === 'stat') {
                console.log(opts.file + ' does not exist.');
            } else {
                console.log('Something went wrong: ');
                console.trace(err.stack);
            }
        } else {
            console.log('Success!');
        }
    };

    messages.pingServer(function(err, success) {
        if (success && !err) {
            console.log('telling eternal to watch this program...');
            return messages.sendJob(opts, callback);
        }

        if (err && err.code !== 'ENOENT') {
            return console.log('Something went wrong: ', err);
        }

        console.log('starting eternal daemon... ');

        var serv = util.startServer();
        setTimeout(function(){
            // remove our service spawn reference, so this script will exit without waiting
            // for the child to finish
            serv.unref();

            console.log('telling eternal to watch this program');
            messages.sendJob(opts, callback);
        }, 1000)

    });

    console.log(opts);
//    console.log(process);
}


