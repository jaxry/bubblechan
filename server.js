var express = require('express');
var threadRouter = require('./routes/thread');
var app = express();

app.use(express.static('public'));

app.use('/', threadRouter);

app.listen(3000);