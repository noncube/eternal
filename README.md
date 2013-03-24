#eternal

run things to eternity. It shouldn't matter what those runnable things happen to be.

This is a list of what the thing will do, not necessarily what it does currently.


##Commands:

####start \[script\]

Start a script. Usage: `eternal start thing.js`

#####Options

**--exec, -e** - specify an executable.  
Can be either absolute/relative path or a command found in $PATH
`Defaults to node`

**--max, -n** - specify max number of restarts.  
Set to 0 for infinite restarts
`Defaults to 10`

**--key** - identifier to use for the service. This identifier will be used in logs and commands.

#####Examples:

Start a node app that will restart forever:  
`eternal start app.js -n 0`

Start a ruby script:  
`eternal start script.rb -e ruby`

Start a script with an identifier:
`eternal start script.js --key stage_app`

####stop \[file\]

Stop a script. Usage: `eternal stop thing.js`

If a key was specified in `eternal start` command, it should be used instead of filename.

#####Examples:

`eternal stop app.js`

`eternal stop stage_app`


####stopall

Stop all eternal services \[for current user\]. Usage: `eternal stopall`


####restart \[file\]

Restart a script. Usage: `eternal restart thing.js`

If a key was specified in `eternal start` command, it should be used instead of filename.

#####Examples:

`eternal restart app.js`

`eternal restart stage_app`


####restartall

Restart all currently monitored services. Usage: `eternal restartall`


#TODO v0.1:

Commands:
* list

Options:
* log file name
* --watch: watch files for changes and restart, with options as to which files are watched

basic tests
