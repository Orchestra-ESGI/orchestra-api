require('./listener');
require('./auto-update');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/user');
var sceneRouter = require('./routes/scene');
var roomRouter = require('./routes/room');
var deviceRouter = require('./routes/device');
var automationRouter = require('./routes/automation');
var firebaseRouter = require('./routes/firebase');

const swaggerUi = require('swagger-ui-express'), swaggerDocument = require('./swagger.json');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/user', usersRouter);
app.use('/device', deviceRouter);
app.use('/scene', sceneRouter);
app.use('/room', roomRouter);
app.use('/automation', automationRouter);
app.use('/notification', firebaseRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

module.exports = app;