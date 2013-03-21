#eternal

run things to eternity. It shouldn't matter what those runnable things happen to be.

This is a list of what the thing will do, not necessarily what it does currently.


##Commands:

####start

Start a script. Usage: `eternal start thing.js`

#####Options

* --exec **-e** _default: node_  - specifies an executable.
Can be either absolute/relative path or a command found in $PATH

* --max **-n** _default: 10_ - specify max number of restarts.
Set to -1 for infinite restarts

#####Examples:

Start a node app:
`eternal start thing.js`

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
