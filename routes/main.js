'use strict';

var express = require('express');
var graph = require('../app/thread_to_graph');
var catalog = require('../app/catalog');
var router = express.Router();

function addTrailingSlash(req, res, next) {
    if (req.url.slice(-1) !== '/') {
        res.redirect(301, req.url.slice(1) + '/');
    }
    else next();
}

router.get('/board/:board/thread/:threadnum(\\d+)(/*)?', function(req, res) {
    graph(res, req.params.board, req.params.threadnum);
});

router.use('/board', addTrailingSlash);
router.get('/board/:board/', function(req, res) {
    catalog(res, req.params.board);
});

router.get('*', function(req, res) {
    res.status(404).send('Invalid URL');
});

module.exports = router;
