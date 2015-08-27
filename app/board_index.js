'use strict';

var util = require('./util');

var titles = {},
    ordered = [];

function makeBoardIndex(jsonBoards) {
    jsonBoards = jsonBoards.boards;

    for (var i = 0; i < jsonBoards.length; i++) {
        var board = jsonBoards[i];
        titles[board.board] = board.title;
        ordered.push(board.board);
    }
}

util.getJSON('http://a.4cdn.org/boards.json', makeBoardIndex);

exports.titles = titles;
exports.ordered = ordered;