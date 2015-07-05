var childProcess = require('child_process');
var http = require('http');

var reQuotes = /href="#p(\d+)/g;

function copyProperties(props, from, to) {
    for (var i = 0; i < props.length; i++) {
        var prop = props[i];
        if (from[prop]) to[prop] = from[prop];
    }
}

function makeThreadObject(jsonThread, board) {
    var thread = {}
      , jsonPosts = jsonThread.posts
      , op = jsonPosts[0]
      , postTable = {}
      , lastUnrepliedPost;

    thread.title = op.semantic_url;
    thread.replyCount = op.replies;
    thread.posts = new Array(jsonPosts.length);

    for (var i = 0; i < jsonPosts.length; i++) {
        var post = {}
          , jp = jsonPosts[i];

        copyProperties(['no', 'name', 'trip', 'com', 'filename', 'ext', 'time'], jp, post);
        
        post.id = i;
        post.postUrl = 'http://boards.4chan.org/' + board + '/thread/' + op.no +  '#p' + jp.no;

        if (jp.filename) {
            post.img = 'http://i.4cdn.org/'+ board + '/'+ jp.tim + jp.ext;
            post.thumb = 'http://i.4cdn.org/' + board + '/' + jp.tim + 's.jpg';
            post.width = jp.w;
            post.height = jp.h;
        }

        postTable[post.no] = i;

        var parents = [];
        while(match = reQuotes.exec(post.com)) {
            parents.push(postTable[match[1]]);
        }
        if (parents.length > 0) {
            post.type = 'reply';
            post.parents = parents;
        }
        else if (i !== 0) {
            post.parents = [lastUnrepliedPost];
            post.type = 'standalone';
            lastUnrepliedPost = i;
        }
        else {
            post.parents = [];
            post.standalone = true;
            post.type = 'op';
            lastUnrepliedPost = i;
        }

        thread.posts[i] = post;
    }

    return thread;
}

function runForceDirect(posts, callback) {
    function parseForceDirectOutput(stdout) {
        var nodePoints = stdout.split(';');
        for (var i = 0; i < nodePoints.length - 1; i++) {
            var p = nodePoints[i].split(',');
            posts[i].pos = [parseFloat(p[0]), parseFloat(p[1])];
        }
        callback(posts);
    }

    var edgeString = ''
      , edgeCount = 0;

    for (var i = 0; i < posts.length; i++) {
        var post = posts[i];
        
        for (var j = 0; j < post.parents.length; j++) {
            edgeString += post.parents[j] + '-' + i + ';';
            edgeCount++;
        }
    }
    var argument = ' -e "' + edgeCount + '[' + edgeString + ']' + '"';
    argument += ' -n "' + posts.length + '"';

    childProcess.exec('./bin/force_direct' + argument, function(error, stdout, stderr) {
        parseForceDirectOutput(stdout);
    });
}

function get4ChanJSON(board, threadnum, callback) {
    http.get('http://a.4cdn.org/' + board + '/thread/' + threadnum + '.json', function(res){
        var data = '';
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
            data += chunk;
        });
        res.on('end', function(){
            callback(JSON.parse(data));
        });
    });

    // var jsonThread = ;
    // callback(jsonThread);
}

function processThread(res, board, threadnum) {
    var time = Date.now();

    var thread;

    function handleJson(jsonThread) {
        thread = makeThreadObject(jsonThread, board);
        setImmediate(runForceDirect, thread.posts, serveHTML);
    }

    function serveHTML() {
        console.log(Date.now() - time + ' ms');
        res.render('index.jade', {thread: thread});
    }

    get4ChanJSON(board, threadnum, handleJson);
}


exports.processThread = processThread;