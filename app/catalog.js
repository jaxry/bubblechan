'use strict';

var util = require('./util');
var boardList = require('./board_index');


function load_board(res, boardName) {

    function get4ChanBoard() {
        var url = 'http://a.4cdn.org/' + boardName + '/catalog.json';
        util.getJSON(url, serveHTML);
    }

    function serveHTML(jsonCatalog) {
        if (jsonCatalog) {
            var locals = {
                catalog: jsonCatalog,
                boardName: boardName,
                boards: boardList.titles,
                boardsOrdered: boardList.ordered
            };
            
            res.render('catalog.jade', locals);
        }
        else {
            res.status(404).send('Cannot find board');
        }
    }

    get4ChanBoard();
}

module.exports = load_board;