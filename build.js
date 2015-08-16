'use strict';

var fs = require('fs');
var childProcess = require('child_process');

try {
    fs.mkdirSync('./bin');
} catch(e) {
    if ( e.code !== 'EEXIST' ) throw e;
}

var dir = 'app/force_direct/';

childProcess.exec('gcc ' + dir + 'main.c ' + dir + 'barneshut.c ' + '-o ./bin/force_direct -lm -O3 -std=gnu99', 
    function(error, stdout, stderr) {
        if (error) console.log(error.stack);
    }
);