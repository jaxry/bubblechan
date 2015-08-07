'use strict';

var childProcess = require('child_process');
var util = require('./util');

var reQuotes = /href="#p(\d+)/g;

function copyProperties(props, from, to) {
    for (var i = 0; i < props.length; i++) {
        var prop = props[i];
        if (from[prop]) to[prop] = from[prop];
    }
}

function makeThreadObject(jsonThread, board) {
    var thread = {},
        jsonPosts = jsonThread.posts,
        op = jsonPosts[0],
        postTable = {},
        lastUnrepliedPost;

    thread.title = op.sub || op.semantic_url.split('-').join(' ');
    thread.replyCount = op.replies;
    thread.posts = new Array(jsonPosts.length);

    for (var i = 0; i < jsonPosts.length; i++) {
        var post = {},
            jp = jsonPosts[i];

        copyProperties(['no', 'name', 'trip', 'com', 'filename', 'ext', 'time'], jp, post);
        
        post.id = i;
        post.postUrl = 'http://boards.4chan.org/' + board + '/thread/' + op.no +  '#p' + jp.no;

        if (jp.filename) {
            post.img = 'http://i.4cdn.org/'+ board + '/'+ jp.tim + jp.ext;
            post.thumb = 'http://i.4cdn.org/' + board + '/' + jp.tim + 's.jpg';
            post.width = jp.w;
            post.height = jp.h;
        }

        post.children = [];

        postTable[post.no] = i;

        var parents = [],
            match;
        while(match = reQuotes.exec(post.com)) {
            parents.push(postTable[match[1]]);
        }
        if (parents.length > 0) {
            post.type = 'reply';
        }
        else if (i !== 0) {
            parents = [lastUnrepliedPost];
            post.type = 'standalone';
            lastUnrepliedPost = i;
        }
        else {
            post.type = 'op';
            lastUnrepliedPost = i;
        }
        for (var j = 0; j < parents.length; j++) {
            thread.posts[parents[j]].children.push(i);
        }

        post.parents = parents;

        thread.posts[i] = post;
    }

    for (var i = 0; i < thread.posts.length; i++) {
        var post = thread.posts[i];
        post.centrality = Math.max(1, 1 + post.children.length - (post.type !== 'reply' ? 1 : 0));
    }

    return thread;
}

function runForceDirect(posts, callback) {
    function parseForceDirectOutput(stdout) {
        var nodeCoords = stdout.split(';');
        for (var i = 0; i < nodeCoords.length - 1; i++) {
            var p = nodeCoords[i].split(',');
            posts[i].pos = [parseFloat(p[0]), parseFloat(p[1])];
        }
        callback(posts);
    }

    var edgeString = '',
        edgeCount = 0;

    for (var i = 0; i < posts.length; i++) {
        var post = posts[i];
        
        for (var j = 0; j < post.children.length; j++) {
            edgeString += i + '-' + post.children[j]  + ';';
            edgeCount++;
        }
    }
    var argument = ' -e "' + edgeCount + '[' + edgeString + ']' + '"';
    argument += ' -n "' + posts.length + '"';

    childProcess.exec('./bin/force_direct' + argument, function(error, stdout, stderr) {
        parseForceDirectOutput(stdout);
    });
}

function processThread(res, board, threadnum) {
    var time = Date.now();

    var thread;

    function get4chanThread() {
        var url = 'http://a.4cdn.org/' + board + '/thread/' + threadnum + '.json';
        util.getJSON(url, handleJson);

        // var jsonThread = ;
        // handleJson(jsonThread);
    }

    function handleJson(jsonThread) {
        if (jsonThread) {
            thread = makeThreadObject(jsonThread, board);
            setImmediate(runForceDirect, thread.posts, serveHTML);
        }
        else {
            res.status(404).send('Cannot find thread');
        }
    }

    function serveHTML() {
        console.log(thread.title + ' - ' + (Date.now() - time) + ' ms');
        res.render('thread.jade', {thread: thread});
    }

    get4chanThread();
}

module.exports = processThread;