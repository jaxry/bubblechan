'use strict';

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

exports.htmlToPlainText = (function() {

    var unescape = [/&quot;/g, /&#039;/g, /&lt;/g, /&gt;/g, /&amp;/g],
        lineBreak = /<br>/g,
        tags = /<.+?>/g;

    return function(str, newlineWithSpace) {
        return str.replace(lineBreak, newlineWithSpace ? ' ' : '\n')
                  .replace(tags, '')
                  .replace(unescape[0], '"')
                  .replace(unescape[1], "'")
                  .replace(unescape[2], '<')
                  .replace(unescape[3], '>')
                  .replace(unescape[4], '&');
    };
})();

exports.linkifyUrls = (function() {
    var wbr = /<wbr>/g;
    var url = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/ig;

    return function(str) {
        return str.replace(wbr, '')
                  .replace(url, '<a target="_blank" href="$&">$&</a>');
    };
})();