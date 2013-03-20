var net = require('net'),
    path = require('path');


var messages = module.exports;

messages.SOCK_PATH = path.join(process.env.HOME, '.never', 'sock');


var wrap_sock = function(socket, callback) {
    var message = '';

    socket.setEncoding('utf-8');
    socket.on('data', function(data) {
        message += data;
    });
    socket.on('end', function() {
        callback(message);
    });
};

messages.createServer = function(message_handler) {
    var server = net.createServer({allowHalfOpen: true}, function(socket) {

        wrap_sock(socket, function(data) {
            var options = JSON.parse(data);

            if (options._TYPE === 'ping') {
                socket.write('hello');
            }
            socket.end();

            message_handler(options);
        });
    });

    server.listen(messages.SOCK_PATH, function() {
        console.log('never started');
    });

    process.on('exit', function() {
        server.close();
    });
};

messages.sendJob = function(job, callback) {
    var client = net.createConnection({path: messages.SOCK_PATH}, function() {
        client.end(JSON.stringify({_TYPE: 'job', _VALUE: job}))
    });

    wrap_sock(client, function(data) {
        callback();
    });

    client.on('error', callback);
};

messages.pingServer = function(callback) {

    var client = net.createConnection({path: messages.SOCK_PATH}, function() {
        client.end(JSON.stringify({_TYPE: 'ping'}))
    });

    wrap_sock(client, function(data) {
        if (data === 'hello') {
            callback();
        } else {
            callback('invalid response');
        }
    });

    client.on('error', callback);
};