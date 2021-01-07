module.exports = (io) => {
  var express = require('express');
  var router = express.Router();
  var logger = require('../config/winston');
  var binanceModule = require('../modules/binanceModule');
  var analytics = require('../../monitor/modules/analytics.js');
  var mysqlConnection = require('../modules/mysql');
  var WebSocketClient = require('websocket').client;
  var client = new WebSocketClient();

  /* GET home page. */
  router.get('/:symbolFrom/:symbolTo/:window?/:timing?', (req, res, next) => {

    var wind = req.params.window ? req.params.window : 1;
    var timing = req.params.timing ? req.params.timing : '1m';
    var symbolTo = req.params.symbolTo;
    var symbolFrom = req.params.symbolFrom;

    var startTime = new Date();
    var endTime = new Date(startTime);
    startTime.setHours(startTime.getHours() - wind);

    collectInfo(symbolFrom, symbolTo, startTime);

    mysqlConnection.executeQueries([{
        sql: "select * from wallet"
      },
      {
        sql: "select * from orders where symbolFrom=? and time>=?",
        params: [symbolFrom, startTime]
      }
    ]).then((response) => {

      binanceModule.getAllOpenOrder({}, (bRes) => {
        var alarms = [];
        response[0].forEach((item, i) => {
          if (item.free > 0 || item.locked > 0) {
            var filter = bRes.data.filter(value => new RegExp("^" + item.asset, "i").test(value.symbol));
            if (filter.length == 0 && item.asset != 'EUR') {
              alarms.push(item);
            }
          }
        });

        res.render('index', {
          page: 'Home',
          menuId: 'home',
          orders: response[1],
          url : req.originalUrl,
          baseUrl: req.headers.host,
          alarms: alarms,
          assets: response[0].map((e) => {
            e.asset = e.asset.toLowerCase();
            return e;
          })
        });

        binanceModule.getCandleHistory((symbolFrom + symbolTo).toUpperCase(), timing, +startTime, +endTime, (history) => {
          var historyStore = history;

          historyStore.forEach((item, i) => {
            item.stopPrice = analytics.stopPriceCalc(historyStore.slice(0, i+1));
          });


          io.emit('chartData', {
            realtime: false,
            update: false,
            data: historyStore
          });

          binanceModule.connect(client, () => {
            binanceModule.unsubscribeAll(() => {
              binanceModule.subscribe([
                symbolFrom + symbolTo + '@kline_' + timing
              ]);
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
                message.stopPrice = analytics.stopPriceCalc(historyStore);
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
    }).catch((error) => {
      logger.error('Query error waller and ordes', error);
    });
  });

  router.post('/order', (req, res, next) => {
    binanceModule.setSellStopLimit({
      timeInForce: 'GTC',
      symbol: req.body.symbol,
      quantity: parseFloat(req.body.quantity),
      price: parseFloat(req.body.limitPrice),
      stopPrice: parseFloat(req.body.stopPrice)
    }, (response) => {
      if (response.status != 200) {
        res.json(response.data, 400);
      } else {
        res.json(response.data);
      }
    });
  });

  io.on('connection', (socket) => {
    logger.info('a user connected');
    socket.on('disconnect', () => {
      logger.info('user disconnected');
    });
  });

  function collectInfo(symbolFrom, symbolTo, startTime) {
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

      mysqlConnection.executeQueries(querys, true).catch((error) => {
        logger.error('Query error insert wallet', error);
      });
    });
  }

  return router;
}
