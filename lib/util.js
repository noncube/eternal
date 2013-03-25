var fs = require('fs'),
    path = require('path'),
    child_process = require('child_process');


var util = module.exports,
    ETERNAL_DIR = path.join(process.env.HOME, '.eternal'),
    log_path = path.join(ETERNAL_DIR, 'service.log');


util.ETERNAL_DIR = ETERNAL_DIR;

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

util.getPath = function (execPath) {
    if (execPath) {
        // check for relative/absolute paths
        if (execPath.search(/\//) === -1) {
            var paths = process.env.PATH.split(path.delimiter),
                current;

            for (var i = 0; i < paths.length; i++) {
                current = path.join(paths[i], execPath);

                try {
                    fs.statSync(current);
                } catch (e) { continue; }

                execPath = current;
                break;
            }
        }
    } else {
        // default to node
        execPath = process.execPath;
    }
    return execPath;
};

util.cleanKey = function(key) {
    return key.replace(/\\\\|\//g, '-');
};