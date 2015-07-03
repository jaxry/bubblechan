var express = require('express');
var graph = require('../graph.js');
var router = express.Router();

router.get('/:board/thread/:threadnum(\\d+)(/*)?', function(req, res) {
    graph.processThread(res, req.params.board, req.params.threadnum);
});

module.exports = router;
