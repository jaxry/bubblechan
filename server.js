'use strict';

var express = require('express');
var mainRouter = require('./routes/main');
var app = express();

app.use(express.static('public'));

app.use('/', mainRouter);

app.listen(3000);