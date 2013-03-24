var fs = require('fs'),
    child_process = require('child_process'),

    async = require('async'),
    watch = require('node-watch'),

    messages = require('./messages'),
    util = require('./util');


var services = {};

// internal identification of a service
function getKey(opts) {
    return opts.key || opts.file || opts.exec;
}

function getService(opts) {
    return services[opts.key];
}

function checkShutdown() {
    if (Object.keys(services).length === 0) {
        console.log(messages.nowStamp() + ': no more running services, exiting...');
        exiting = true;
        process.exit(0);
    }
}

var actions = {
    start: function(opts, done) {
        var key = getKey(opts);

        opts.exec = util.getPath(opts.exec);
        if (opts.debug) console.log('DEBUG: exec is ' + opts.exec);

        // make sure that the requested programs are actually there
        try {
            fs.statSync(opts.exec);
            if (opts.file)
                fs.statSync(opts.file);
        } catch (e) {
            return done({_ERROR: e});
        }

        var make_proc = function(service, key) {

            // todo: switch logging to something that makes more sense
            if (opts.debug)
                console.log('DEBUG: running command `' + service.exec + ' ' + service.file + '`');

            service.proc = child_process.spawn(
                service.exec,
                [service.file],
                {stdio: 'inherit'}
            );
            service.proc.on('exit', function(code, signal) {
                console.log('\n' + messages.nowStamp() + ': ' + getKey(service) +
                    ' exited with (' + code + ', ' + signal + ')');

                if (service.killed) {
                    return service.killed(code, signal);
                }

                service.current++;

                if (service.max === 0 || service.current <= service.max) {
                    console.log('Restarting... (number of total restarts: ' +
                        service.current + ')');
                    make_proc(service, key);
                } else {
                    console.log('Out of retries, ' +
                        service.file + ' will not be restarted.');

                    delete services[key];
                    checkShutdown();
                }
            });
        };

        var service = {};

        service.exec = opts.exec || process.execPath; // process.execPath points at node
        service.file = opts.file;
        service.max = opts.max;
        service.key = key;
        service.current = 0;

        make_proc(service, key);
        services[key] = service;

        done();
    },

    stop: function(opts, done) {
        var service = getService(opts);

        if (!service) {
            return done({_ERROR: 'not_found'});
        }

        service.killed = function(code, signal) {
            delete services[opts.key];


            if (opts.debug)
                console.log('DEBUG: ' + getKey(service) + ' killed callback called');

            done();
            checkShutdown();
        };

        // todo: add timeout and then SIGKILL
        service.proc.kill('SIGTERM');
        if (opts.debug) console.log('DEBUG: sent SIGTERM to ' + getKey(service));

        console.log('\n' + messages.nowStamp() + ': stopping service ' + opts.key);
    },

    stopall: function(opts, done) {
        var tasks = [];

        Object.keys(services).forEach(function(key) {
            tasks.push(function(next) {
                actions.stop({key: key, debug: opts.debug}, next);
            });
        });

        async.parallel(tasks, done)
    },

    restart: function(opts, done) {
        var service = getService(opts);

        if (!service)
            return done({_ERROR: 'not_found'});

        actions.stop(opts, function(response) {
            console.log('service ' + opts.key + ' restarting...');

            actions.start(service, function(response) {
                if (response && response._ERROR) {
                    console.log(response);
                }

                done(response);
            });
        })
    },

    restartall: function(opts, done) {
        var tasks = [];

        Object.keys(services).forEach(function(key) {
            tasks.push(function(next) {
                actions.restart({key: key, debug: opts.debug}, next);
            });
        });

        async.parallel(tasks, done);
    },

    list: function(opts, done) {
        done(services);
    },

    // echo with an error if command unrecognized
    unknown: function(opts, done) {
        opts._ERROR = 'unknown command';
        done(opts);
    }
};

var server = messages.createServer(function(socket, data) {
    if (data._TYPE !== 'job')  // jobs only at this point
        return socket.end();

    console.log(data.stime + ' ' + data._VALUE[0] + ' ' + data._TYPE + ' received.');

    var action = actions[data._VALUE[0]] || actions.unknown;

    action(data._VALUE, function(response) {
        if (response) socket.write(JSON.stringify(response));
        socket.end();
    });
});

process.on('SIGHUP', function() {
    process.exit(0);
});
process.on('SIGINT', function() {
    process.exit(0);
});
process.on('SIGTERM', function() {
    process.exit(0);
});

process.on('exit', function() {
    server.close();
    console.log(messages.nowStamp() + ': exited cleanly.');
});
