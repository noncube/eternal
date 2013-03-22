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



function checkShutdown() {
    if (Object.keys(services).length === 0) {
        console.log(messages.nowStamp() + ': no more running services, exiting...');
        exiting = true;
        process.exit();
    }
}

function start_service(opts) {
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

        var process;

        service.proc = child_process.spawn(
            service.exec,
            [service.path],
            {stdio: 'inherit'} // todo: switch logging to something that makes more sense
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
    service.path = opts.file;
    service.max = opts.max;
    service.current = 0;

    make_proc(service, key);
    services[key] = service;
}

function stop_service(opts) {
    var service = services[opts.key];

    if (!service) {
        return {_ERROR: 'not_found'};
    }

    service.killed = true;
    service.proc.kill();
    console.log('\n' + messages.nowStamp() + ': stopping service ' + opts.key);

    delete services[opts.key];
    checkShutdown();
}

function stop_all() {
    Object.keys(services).forEach(function(key) {
        stop_service({key: key});
    })
}



var server = messages.createServer(function(socket, data) {
    console.log(data);
    console.log(data.stime + ' ' + data._TYPE + ' received.');

    var response;

    if (data._TYPE === 'job') {
        switch (data._VALUE[0]) {
            case 'start':
                response = start_service(data._VALUE);
                break;
            case 'stop':
                response = stop_service(data._VALUE);
                break;
            case 'stopall':
                response = stop_all();
        }
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
