'use strict';

var express = require('express');
var index = require('../app/index');
var thread = require('../app/thread');
var catalog = require('../app/catalog');
var router = express.Router();

function addTrailingSlash(req, res, next) {
    if (req.url.slice(-1) !== '/') {
        res.redirect(301, req.baseUrl + req.url + '/');
    }
    else next();
}

router.get('/board/:board/thread/:threadnum(\\d+)/json', function(req, res) {
    thread.getJSON(res, req.params.board, req.params.threadnum);
});

router.get('/board/:board/thread/:threadnum(\\d+)', function(req, res) {
    thread.getHTML(res, req.params.board, req.params.threadnum);
});

router.use('/board', addTrailingSlash);
router.get('/board/:board/', function(req, res) {
    catalog(res, req.params.board);
});

router.get('/', function(req, res) {
    index(res);
});

router.get('*', function(req, res) {
    res.status(404).send('Invalid URL');
});

module.exports = router;
