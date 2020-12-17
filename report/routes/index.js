module.exports = function(io) {
  var express = require('express');
  var router = express.Router();
  var logger = require('../config/winston');
  var binanceModule = require('../modules/binanceModule');
  var utils = require('../modules/utils');
  var mysqlConnection = require('../modules/mysql');

  /* GET home page. */
  router.get('/:symbolFrom/:symbolTo/:window/:timing', function(req, res, next) {

    var wind = req.params.window;
    var timing = req.params.timing;
    var symbolTo = req.params.symbolTo;
    var symbolFrom = req.params.symbolFrom;

    mysqlConnection.executeQueries({sql : 'select * from manual_orders'}).then(response => {
      res.render('index', {
        page: 'Home',
        menuId: 'home',
        orders : response
      });
    }).catch(function(error) {
        logger.error('error execute query: ', error.message);
    });

    var startTime = new Date();
    var endTime = new Date(startTime);
    startTime.setHours(startTime.getHours() - wind);

    binanceModule.getCandleHistory((symbolFrom + symbolTo).toUpperCase(), timing, +startTime, +endTime, (history) => {
      historyStore = history;

      io.emit('chartData', {
        realtime: false,
        update: false,
        data: historyStore
      });

      binanceModule.connect(() => {
        binanceModule.unsubscribeAll(()=> {
          binanceModule.subscribe([
            symbolFrom + symbolTo + '@kline_' + timing
          ], "kline");
        })
      }, (message) => {
        message = binanceModule.candleTransformer('stream', message);
        var update = false;
        var obj = historyStore.pop();

        if (obj) {
          if (binanceModule.timeEqualComparetor(timing, obj, message)) {
            update = true;
          } else {
            historyStore.push(obj);
          }
        }

        historyStore.push(message);
        io.emit('chartData', {
          update: update,
          data: [message],
          realtime: true
        });
      });
    });
  });

  io.on('connection', (socket) => {
    logger.info('a user connected');
    socket.on('disconnect', () => {
      logger.info('user disconnected');
    });
  });

  return router;
}
