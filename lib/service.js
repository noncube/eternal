var watch = require('node-watch'),
    child_process = require('child_process'),
    path = require('path'),
    net = require('net');

console.log(process.argv);




var services = {};
var start_service = function(filepath) {

    var make_proc = function(service) {
        // TODO: right now this only fires up node stuff (process.execPath points at node)
        service.proc = child_process.spawn(
            process.execPath,
            [filepath],
            {stdio: 'inherit'} // todo: switch logging to something that makes more sense
        );
        service.proc.on('exit', function(code, signal) {
            console.log(filepath + ' exited with code ' + code + '. Restarting...');
            make_proc(service);
        });
    };

    var service = {};
    service.path = filepath;

    make_proc(service);
    services[filepath] = service;
};

start_service(process.argv[2]);