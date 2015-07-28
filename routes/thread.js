'use strict';

var express = require('express');
var graph = require('../graph.js');
var router = express.Router();

router.get('/:board/thread/:threadnum(\\d+)(/*)?', function(req, res) {
    graph.processThread(res, req.params.board, req.params.threadnum);
});

router.get('*', function(req, res) {
    res.status(404).send('Invalid URL');
});

module.exports = router;
