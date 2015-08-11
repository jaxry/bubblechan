var myApp = myApp || {};
(function() {

'use strict';

function retrieveGraph(callback) {
    var req = new XMLHttpRequest();

    req.onreadystatechange = function() {
        if (req.readyState === req.DONE){
            if (req.status === 200) {
                return callback(JSON.parse(req.response));
            }
            else {
                return callback();
            }
        }
    };

    req.open('GET', window.location.pathname + '/json');
    req.send();
}

function pageLoad(controls) {
    if (document.hasFocus()) {
        controls.centerOnOp();
    }
    else window.addEventListener('focus', function f() {
        controls.centerOnOp();
        window.removeEventListener('focus', f);
    });
}

function renderGraph(json) {
    var graph = myApp.Graph();
    graph.addPosts(json.posts);

    var controls = myApp.Controls(graph);
    myApp.nodeInteraction(graph);
    pageLoad(controls);
}

function startApp() {
    var prompt = document.getElementById('loading-prompt');

    prompt.innerHTML = 'Generating graph...';

    retrieveGraph(function(json) {
        if (json) {
            prompt.innerHTML = 'Rendering...';

            setTimeout(function() {
                renderGraph(json);

                document.title = json.title;
                prompt.style.display = 'none';
            }, 50);
        }
        else {
            prompt.innerHTML = 'Thread not found';
            document.title = 'Thread not found';
        }
    });
}

startApp();

}());