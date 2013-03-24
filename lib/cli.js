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
    })
    .option('debug', {
        abbr: 'd',
        flag: true,
        help: 'Show debug output from ' + PKG_INFO.name
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
        abbr: 'm',
        default: 0,
        help: 'Max number of restarts. Set to 0 for infinite'
    })
    .option('key', {
        help: 'String to use to identify the app'
    })
    .option('watch', {
        abbr: 'w',
        flag: true,
        default: false,
        help: 'Watch files for changes and restart any time a change is detected'
    })
    .help("Run an application and restart it if it stops");

nomnom.command('stop')
    .option('key', {
        position: 1,
        help: 'Application to stop'
    })
    .callback(simple_action('stop this'))
    .help("Stop an application running under " + PKG_INFO.name);


nomnom.command('stopall')
    .callback(simple_action('stop all'));

nomnom.command('restart')
    .option('key', {
        position: 1,
        help: 'Application to restart'
    })
    .callback(simple_action('restart this'))
    .help("Restart an application running under " + PKG_INFO.name);

nomnom.command('restartall')
    .callback(simple_action('restart all'));

// for dev
nomnom.command('process')
    .callback(function(opts) {
        console.log(process);
    });

// parse options and execute callbacks above
var opts = nomnom.nom();

if (opts.debug)
    console.log('DEBUG: command sent with debug flag. options:\n', opts);

function start (opts) {

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
            if (opts.debug) console.log('DEBUG: eternal service running');

            console.log('telling eternal to watch this program...');
            return messages.sendJob(opts, callback);
        }

        if (err && err.code !== 'ENOENT') {
            return console.error('Something went wrong: ', err);
        }

        if (opts.debug) console.log('DEBUG: eternal service not running');
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

function simple_action(name) {

    return function(opts) {
        console.log('telling eternal to '+ name + ' program');
        messages.sendJob(opts, function(err, data) {
            if (!err)
                return console.log('Success!');

            if (err === 'not_found')
                return console.error(opts.key + ' was not found in eternal services');

            if (err.code === 'ENOENT')
                return console.log('eternal is not running any services');

            console.error('Something went wrong: ', err);
        });
    }
}