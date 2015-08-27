'use strict';

var boardList = require('./board_index');

module.exports = function(res) {
    res.render('index.jade', {boards: boardList.titles, boardsOrdered: boardList.ordered});
};