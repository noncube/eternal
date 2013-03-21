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

#####Examples:

Start a node app that will restart forever:
`eternal start app.js -n 0`

Start a ruby script:
`eternal start script.rb -e ruby`


#TODO:

show the list of running things:
--------------------------------

eternal list

Stop all running things:
------------------------

eternal stopall

stop this thing:
----------------

eternal stop thing.js

restart all of the things
-------------------------

eternal restartall

restart this thing
------------------

eternal restart thing

args:
-----

more to come.
