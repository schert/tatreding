module.exports = () => {
  var express = require('express');
  var router = express.Router();
  var logger = require('../config/winston');
  var binanceModule = require('../../report/modules/binanceModule');
  var mysqlConnection = require('../../report/modules/mysql');
  var analytics = require('../modules/analytics.js');
  var WebSocketClient = require('websocket').client;
  var client = new WebSocketClient();

  /* GET home page. */
  router.get('/startStopLossMonitoring', (req, res, next) => {

    var wind = 1;
    var timing = '1m';

    var startTime = new Date();
    var endTime = new Date(startTime);
    startTime.setHours(startTime.getHours() - wind);

    binanceModule.getAllOpenOrder({}, (bRes) => {

      if(bRes.data.length == 0) {
        res.render('index', {
          page: 'Home',
          menuId: 'home',
          status: 'no stop loss limit orders!',
          baseUrl: req.headers.host
        });
        return;
      }

      var params = [];
      var historyStore = {};
      bRes.data.forEach((item, i) => {
        binanceModule.getCandleHistory(item.symbol, timing, +startTime, +endTime, (history) => {
          historyStore[item.symbol] = history;

          historyStore[item.symbol].forEach((itemh, i) => {
            itemh.stopPrice = analytics.stopPriceCalc(historyStore[item.symbol].slice(0, i + 1));
          });
        });

        params.push(item.symbol + '@kline_' + timing);
      });

      if (!binanceModule.connection) {
        binanceModule.connect(client, () => {
          binanceModule.unsubscribeAll(() => {
            binanceModule.subscribe(params);
          });
        }, (raw) => {
          switch (raw.e) {
            case 'kline':
              var message = binanceModule.candleTransformer('stream', raw);
              var obj = historyStore.pop();

              if (obj) {
                if (!binanceModule.timeEqualComparator(timing, obj, message)) {
                  historyStore.push(obj);
                  historyStore.shift();
                }
              }

              message.stopPrice = analytics.stopPriceCalc(historyStore);
              historyStore.push(message);
              break;
          }
        });
      }

      res.render('index', {
        page: 'Home',
        menuId: 'home',
        status: 'bhu',
        baseUrl: req.headers.host
      });
    });
  });

  router.get('/stopStopLossMonitoring', (req, res, next) => {
    binanceModule.unsubscribeAll(() => {
      res.render('index', {
        status: 'stopped'
      });
    })
  });

  function updateWallet(callback) {
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

      mysqlConnection.executeQueries(querys, true).then(callback).catch((error) => {
        logger.error('Query error insert wallet', error);
      });
    });
  }

  function updateAllOrder(symbolFrom, symbolTo, startTime) {
    binanceModule.getAllOrder({
      symbol: (symbolFrom + symbolTo).toUpperCase(),
      startTime: +startTime
      // endTime: +endTime
    }, (response) => {
      var data = response.data;
      var querys = [];
      data.forEach((item, i) => {
        querys.push({
          sql: "INSERT INTO orders (clientOrderId, symbolFrom, symbolTo, side, type, quantity, price, time, response) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) \
          ON DUPLICATE KEY UPDATE symbolFrom=?, symbolTo=?, side=?, type=?, quantity=?, price=?, time=?, response=?",
          params: [item.clientOrderId, symbolFrom, symbolTo, item.side, item.type, item.executedQty, item.price, new Date(item.updateTime), JSON.stringify(item),
            symbolFrom, symbolTo, item.side, item.type, item.executedQty, item.price, new Date(item.updateTime), JSON.stringify(item)
          ]
        });
      });

      mysqlConnection.executeQueries(querys, true).catch((error) => {
        logger.error('Query error get all ordes', error);
      });
    });
  }

  return router;
}
