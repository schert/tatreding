module.exports = function(io) {
  var express = require('express');
  var router = express.Router();
  var logger = require('../config/winston');
  var binanceModule = require('../modules/binanceModule');
  var utils = require('../modules/utils');

  /* GET home page. */
  router.get('/', function(req, res, next) {
    res.render('index', {
      page: 'Home',
      menuId: 'home'
    });
  });

  var startTime = new Date();
  var endTime = new Date(startTime);
  var historyStore;
  startTime.setHours(startTime.getHours() - 2);
  binanceModule.getCandleHistory('XRPEUR', '1m', +startTime, +endTime, (history) => {
    historyStore = history;
    binanceModule.connect(() => {
      binanceModule.subscribe([
        'xrpeur@kline_1m'
      ]);
    }, (message) => {
      var obj = history.pop();
      if(obj.Date.getMinutes() == message.Date.getMinutes()) {
        history.push(message);
      } else {
        history.push(obj);
        history.push(message);
      }
      io.emit('chartData', historyStore);
    });
  });

  io.on('connection', (socket) => {
    logger.info('a user connected');
    io.emit('chartData', historyStore);
    socket.on('disconnect', () => {
      logger.info('user disconnected');
    });
  });

  return router;
}
