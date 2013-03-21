var watch = require('node-watch'),
    child_process = require('child_process'),
    messages = require('./messages');



var services = {};
var start_service = function(opts) {

    var make_proc = function(service) {
        // TODO: right now this only fires up node stuff (process.execPath points at node)
        service.proc = child_process.spawn(
            process.execPath,
            [service.path],
            {stdio: 'inherit'} // todo: switch logging to something that makes more sense
        );
        service.proc.on('exit', function(code, signal) {
            service.current++;
            console.log('\n' + new Date() + ': ' + service.path +
                        ' exited with code ' + code);

            if (service.max === -1 || service.current <= service.max) {
                console.log('Restarting... (number of total restarts: ' +
                            service.current + ')');
                make_proc(service);
            } else {
                console.log('Out of retries, ' +
                            service.path + ' will not be restarted.');
            }
        });
    };

    var service = {};
    service.path = opts.file;
    service.max = opts.max;
    service.current = 0;

    make_proc(service);
    services[opts.file] = service;
};

var server = messages.createServer(function(data) {
    console.log(data);
    console.log(data._TYPE + ' received.');

    if (data._TYPE === 'job') {
        switch (data._VALUE[0]) {
            case 'start':
                start_service(data._VALUE);
        }

    }
});

process.on('SIGINT', function() {
    server.close();
    console.log((new Date) + ': end of the line');
});