var http = require('http');

exports.getJSON = function(url, callback) {
    http.get(url, function(res) {
        var data = '';
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
            data += chunk;
        });
        res.on('end', function(){
            callback(data ? JSON.parse(data) : null);
        });
    });
};