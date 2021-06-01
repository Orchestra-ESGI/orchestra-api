var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');

var usersRouter = require('./routes/users');
var resetRouter = require('./routes/reset');
var sceneRouter = require('./routes/scene');

const swaggerUi = require('swagger-ui-express'), swaggerDocument = require('./swagger.json');

var app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/users', usersRouter);
app.use('/scene', sceneRouter);
app.use('/reset', resetRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

module.exports = app;
