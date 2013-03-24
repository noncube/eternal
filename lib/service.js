var watch = require('node-watch'),
    fs = require('fs'),
    child_process = require('child_process'),
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
        process.exit();
    }
}

var actions = {
    start: function(opts) {
        var key = getKey(opts);

        opts.exec = util.getPath(opts.exec);

        // make sure that the requested programs are actually there
        try {
            fs.statSync(opts.exec);
            if (opts.file)
                fs.statSync(opts.file);
        } catch (e) {
            return {_ERROR: e};
        }

        var make_proc = function(service, key) {

            // todo: switch logging to something that makes more sense
            service.proc = child_process.spawn(
                service.exec,
                [service.path],
                {stdio: 'inherit'}
            );
            service.proc.on('exit', function(code, signal) {
                if (service.killed) {
                    return;
                }

                service.current++;
                console.log('\n' + messages.nowStamp() + ': ' + service.path +
                    ' exited with code ' + code);


                if (service.max === 0 || service.current <= service.max) {
                    console.log('Restarting... (number of total restarts: ' +
                        service.current + ')');
                    make_proc(service, key);
                } else {
                    console.log('Out of retries, ' +
                        service.path + ' will not be restarted.');

                    delete services[key];
                    checkShutdown();
                }
            });
        };

        var service = {};

        service.exec = opts.exec || process.execPath; // process.execPath points at node
        service.file = opts.file;
        service.max = opts.max;
        service.key = opts.key;
        service.current = 0;

        make_proc(service, key);
        services[key] = service;
    },

    stop: function(opts) {
        var service = getService(opts);

        if (!service) {
            return {_ERROR: 'not_found'};
        }

        service.killed = true;
        service.proc.kill();
        console.log('\n' + messages.nowStamp() + ': stopping service ' + opts.key);

        delete services[opts.key];
        checkShutdown();
    },

    stopall: function() {
        Object.keys(services).forEach(function(key) {
            actions.stop({key: key});
        })
    },

    restart: function(opts) {
        var service = getService(opts);

        if (!service) {
            return {_ERROR: 'not_found'};
        }

        console.log('\n' + messages.nowStamp() + ': stopping service ' + opts.key);
        service.proc.kill('SIGTERM');
        delete service.proc;

        console.log('service ' + opts.key + ' restarting...');
        var response = actions.start(service);

        if (response._ERROR) {
            console.log(response);
        }

        return response;
    },

    restartall: function() {
        Object.keys(services).forEach(function(key) {
            actions.restart({key: key});
        })
    }
};

var server = messages.createServer(function(socket, data) {
    console.log(data);
    console.log(data.stime + ' ' + data._TYPE + ' received.');

    var response;

    if (data._TYPE === 'job') {
        var action = actions[data._VALUE[0]];

        if (typeof action === 'function')
            response = action(data._VALUE);
    }

    if (response) socket.write(JSON.stringify(response));
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
    console.log('\n' + messages.nowStamp() + ': exited cleanly.');
});
