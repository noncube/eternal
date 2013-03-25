var fs = require('fs'),
    path = require('path'),
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

var Service = function(key, opts) {
    if (!(this instanceof Service)) return new Service(key, opts);

    this.exec = opts.exec || process.execPath; // process.execPath points at node
    this.file = opts.file;
    this.max = opts.max;
    this.key = key;
    this.current = 0;

    if (opts.log)
        this.log = opts.log;

    if (opts.debug)
        this.debug = true;

    this.started = opts.started || Date.now();
};

Service.prototype.getSafe = function() {
    var obj = {},
        self = this;

    Object.keys(self).forEach(function(key) {
        if (typeof self[key] !== 'function' && typeof self[key] !== 'object') {
            obj[key] = self[key];
        }
    });

    obj.pid = self.proc.pid;

    return obj;
};

Service.prototype.start = function() {
    var self = this;

    self.log = self.log || path.join(util.ETERNAL_DIR, util.cleanKey(self.key)) + '.log';

    var out = fs.openSync(self.log, 'a'),
        err = fs.openSync(self.log, 'a');

    if (self.debug)
        console.log('DEBUG: running command `' + self.exec + ' ' + self.file + '`');

    self.proc = child_process.spawn(
        self.exec,
        [self.file],
        {stdio: [ 'ignore', out, err ]}
    );

    self.proc.on('exit', function(code, signal) {
        console.log('\n' + messages.nowStamp() + ': ' + self.key +
            ' exited with (' + code + ', ' + signal + ')');

        if (self.killed) {
            return self.killed(code, signal);
        }

        self.current++;

        if (self.max === 0 || self.current <= self.max) {
            console.log('Restarting... (number of total restarts: ' +
                self.current + ')');
            self.start();
        } else {
            console.log('Out of retries, ' + self.file + ' will not be restarted.');

            delete services[self.key];
            checkShutdown();
        }
    });

    return self;
};


var actions = {
    start: function(opts, done) {
        var key = getKey(opts);

        if (services[key]) {
            var warning = 'WARNING: ' + key + ' already running. ' +
                          'The existing process will be killed first.';
            console.log(warning);

            opts.response = {_WARNING: warning};

            return actions.stop({key: key}, function(response) {
                if (response && opts.debug)
                    console.log('DEBUG: "stop" response -\n  ', response);

                delete services[key];
                actions.start(opts, done);
            });
        }

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

        services[key] = Service(key, opts).start();

        done(opts.response);
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
        done(Object.keys(services).map(function(key) {
            return services[key].getSafe();
        }));
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
