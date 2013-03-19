var watch = require('node-watch'),
    child_process = require('child_process'),
    path = require('path');

console.log(process.argv);

// TODO: right now this only fires up node stuff (process.execPath points at node)
var child = child_process.spawn(
    process.execPath,
    [process.argv[2]],
    {stdio: 'inherit'}
);

// todo: listen for proc death and restart up to max