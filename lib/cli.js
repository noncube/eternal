#!/usr/bin/env node
var fs = require('fs'),
    path = require('path'),

    nomnom = require('nomnom'),

    messages = require('./messages'),
    util = require('./util');


var PKG_INFO = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf-8')),
    NAME = PKG_INFO.name;

nomnom.script(NAME)
    .option('version', {
        abbr: 'v',
        flag: true,
        help: 'Print version and exit',
        callback: function() {
            return NAME + " v" + PKG_INFO.version;
        }
    })
    .option('debug', {
        abbr: 'd',
        flag: true,
        help: 'Show debug output from ' + NAME
    });

nomnom.command('start')
    .callback(start)
    .option('exec', {
        abbr: 'e',
        help: 'Run something other than the node.js interpreter (' + process.execPath + ')'
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
    .callback(simple_action('stop this'))
    .option('key', {
        position: 1,
        help: 'Application to stop'
    })
    .help("Stop an application running under " + NAME);


nomnom.command('stopall')
    .callback(simple_action('stop all'))
    .help("Stop all applications running under " + NAME);

nomnom.command('restart')
    .callback(simple_action('restart this'))
    .option('key', {
        position: 1,
        help: 'Application to restart'
    })
    .help("Restart an application running under " + NAME);

nomnom.command('restartall')
    .callback(simple_action('restart all'))
    .help("Restart all applications running under " + NAME);

nomnom.command('list')
    .callback(list_services)
    .option('json', {
        flag: true,
        help: 'Output JSON instead of pretty-printing'
    })
    .help("list all applications");

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
        if (!err) {
            if (data._WARNING)
                console.log(data._WARNING);

            return console.log(data._RESULT || 'Success!')
        }

        if (err.code === 'ENOENT' && err.syscall === 'stat')
            return console.error(err.path + ' does not exist.');

        console.error('Something went wrong: ');
        console.trace(err.stack);
    };

    messages.pingServer(function(err, success) {
        if (success && !err) {
            if (opts.debug) console.log('DEBUG: ' + NAME + ' service running');

            console.log('telling ' + NAME + ' to watch this program...');
            return messages.sendJob(opts, callback);
        }

        if (err && err.code !== 'ENOENT') {
            return console.error('Something went wrong: ', err);
        }

        if (opts.debug) console.log('DEBUG: ' + NAME + ' service not running');
        console.log('starting ' + NAME + '... ');

        var serv = util.startServer();

        setTimeout(function(){
            // remove our service spawn reference, so this script will exit without waiting
            // for the child to finish
            serv.unref();

            console.log('telling ' + NAME + ' to watch this program');
            messages.sendJob(opts, callback);
        }, 800)
    });
}

function list_services(opts) {
    messages.sendJob(opts, function(err, data) {
        if (err) {
            if (err.code === 'ENOENT')
                return console.log(NAME + ' is not running any services');

            return console.error('Something went wrong: ', err);
        }

        var output = '';

        if (opts.json) {
            output = JSON.stringify(data);
        } else {
            output = 'file\t\tkey\t\tmax\tcurrent\tstarted at\n';
            output += data.map(function(item) {

                var out = item.file || item.exec;
                out += '\t\t';
                out += item.key + '\t\t';
                out += item.max + '\t';
                out += item.current + '\t';
                out += new Date(item.started);

                return out + '\n';
            });
        }
        console.log(output);
    });
}

function simple_action(name) {

    return function(opts) {
        console.log('telling ' + NAME + ' to '+ name + ' program');
        messages.sendJob(opts, function(err, data) {
            var msg = '',
                type = 'log';

            if (!err) {
                msg = data._WARNING || data._RESULT || 'Success!';

            } else if (err === 'not_found') {
                msg = opts.key + ' was not found in ' + NAME + ' services';
                type = 'error';

            } else if (err.code === 'ENOENT') {
                msg = NAME + ' is not running any services';
            }

            return msg ?
                console[type](msg) :
                console.error('Something went wrong: ', err);
        });
    }
}