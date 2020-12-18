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

    res.render('index', {
      page: 'Home',
      menuId: 'home',
      orders: {}
    });

    var startTime = new Date();
    var endTime = new Date(startTime);
    startTime.setHours(startTime.getHours() - wind);

    binanceModule.getAllOrder({
      symbol: (symbolFrom + symbolTo).toUpperCase(),
      startTime: +startTime
      // endTime: +endTime
    }, (response) => {
      var json = JSON.stringify(response.data);
      var data = response.data;
      var querys = [];
      data.forEach((item, i) => {
        querys.push({
          sql: "INSERT INTO orders (clientOrderId, symbolFrom, symbolTo, side, type, quantity, price, time, response) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) \
          ON DUPLICATE KEY UPDATE symbolFrom=?, symbolTo=?, side=?, type=?, quantity=?, price=?, time=?, response=?",
          params: [item.clientOrderId, symbolFrom, symbolTo, item.side, item.type, item.executedQty, item.price, new Date(item.updateTime), json,
            symbolFrom, symbolTo, item.side, item.type, item.executedQty, item.price, new Date(item.updateTime), json
          ]
        });
      });

      mysqlConnection.executeQueries(querys);
    });

    binanceModule.getWallet((response) => {
      var data = response.data.balances;
      var querys = [];
      data.forEach((item, i) => {
        querys.push({
          sql: "INSERT INTO wallet (platform, asset, free, locked) VALUES (?, ?, ?, ?) \
          ON DUPLICATE KEY UPDATE platform=?, asset=?, free=?, locked=?",
          params: ["BINANCE", item.asset, item.free, item.locked,
            "BINANCE", item.asset, item.free, item.locked
          ]
        });
      });

      mysqlConnection.executeQueries(querys);
    });

    binanceModule.getCandleHistory((symbolFrom + symbolTo).toUpperCase(), timing, +startTime, +endTime, (history) => {
      historyStore = history;

      io.emit('chartData', {
        realtime: false,
        update: false,
        data: historyStore
      });

      binanceModule.connect(() => {
        binanceModule.unsubscribeAll(() => {
          binanceModule.subscribe([
            symbolFrom + symbolTo + '@kline_' + timing
          ], "kline");
        })
      }, (raw) => {
        switch (raw.e) {
          case 'kline':
            var message = binanceModule.candleTransformer('stream', raw);
            var update = false;
            var obj = historyStore.pop();

            if (obj) {
              if (binanceModule.timeEqualComparator(timing, obj, message)) {
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
            break;
        }
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
