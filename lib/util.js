var fs = require('fs'),
    path = require('path'),
    child_process = require('child_process');


var util = module.exports,
    log_path = path.join(process.env.HOME, '.eternal', 'service.log');


util.startServer = function() {
    var out = fs.openSync(log_path, 'a'),
        err = fs.openSync(log_path, 'a');

    // process.execPath is the path to current node interpreter
    var child = child_process.spawn(
        process.execPath,
        [path.join(__dirname, 'service.js')],
        {
            stdio: [ 'ignore', out, err ],
            detached: true
        }
    );

    return child;
};