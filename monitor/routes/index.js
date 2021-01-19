module.exports = (io) => {
  var express = require('express');
  var router = express.Router();
  var mysqlConnection = require('../../report/modules/mysql');
  var analytics = require('../modules/analytics.js');
  var WebSocketClient = require('websocket').client;
  var client = new WebSocketClient();
  var logger = require('../config/winston')(io);
  var binanceModule = require('../../report/modules/binanceModule');
  binanceModule.setConfigLogger(logger);
  var intervalMonitor = false;

  /* GET home page. */
  router.get('/startStopLossMonitoring', (req, res, next) => {

    var wind = 4;
    var timing = '1m';

    var startTime = new Date();
    var endTime = new Date(startTime);
    startTime.setHours(startTime.getHours() - wind);

    monitorStopPrice(startTime, endTime, timing);
    clearInterval(intervalMonitor);
    intervalMonitor = setInterval(function() {
      monitorStopPrice(startTime, endTime, timing);
    }, 1000 * 60);

    res.render('index', {
      page: 'Home',
      menuId: 'home',
      status: 'Monitoring ON',
      baseUrl: req.headers.host
    });
  });

  router.get('/stopStopLossMonitoring', (req, res, next) => {
    binanceModule.unsubscribeAll(() => {
      res.render('index', {
        page: 'Home',
        menuId: 'home',
        status: 'Monitoring OFF',
        baseUrl: req.headers.host
      });
    });
    clearInterval(intervalMonitor);
    intervalMonitor = false;
  });

  function monitorStopPrice(startTime, endTime, timing) {
    binanceModule.getAllOpenOrder({}, (bRes) => {

      if (bRes.status != 200) {
        sendStatus({
          code: -1,
          msg: 'Get all Order Error',
          obj: bRes.data
        });
        return;
      }

      if (bRes.data.length == 0) {
        sendStatus({
          code: -1,
          msg: 'No orders',
          obj: bRes.data
        });
        return;
      }

      clearInterval(intervalMonitor);
      intervalMonitor = false;
      sendStatus({
        code: 0,
        msg: 'Starting...'
      });
      var params = [];
      var historyStore = {};
      bRes.data.forEach((item, i) => {
        if (!historyStore[item.symbol]) {
          binanceModule.getCandleHistory(item.symbol, timing, +startTime, +endTime, (history) => {
            historyStore[item.symbol] = history;
            analytics.stopPriceCalc(historyStore[item.symbol]);
          });
          params.push(item.symbol.toLowerCase() + '@kline_' + timing);
        }
      });

      binanceModule.connect(client, () => {
        binanceModule.unsubscribeAll(() => {
          binanceModule.subscribe(params);
        });
      }, (raw) => {
        switch (raw.e) {
          case 'kline':
            if (!historyStore[raw.s])
              return;

            sendStatus({
              code: 0,
              msg: 'Running...'
            });

            var message = binanceModule.candleTransformer('stream', raw);
            var obj = historyStore[raw.s].pop();

            if (obj) {
              if (!binanceModule.timeEqualComparator(timing, obj, message)) {
                historyStore[raw.s].push(obj);
                historyStore[raw.s].shift();

                binanceModule.getAllOpenOrder({
                  symbol: raw.s
                }, (bRes) => {
                  var orders = [];
                  if (bRes.data.length != 0) {
                    bRes.data.forEach((item, i) => {
                      if (!orders[item.symbol])
                        orders[item.symbol] = [];
                      orders[item.symbol].push(item);
                    });

                    setNewStopPrice(raw.s, obj.stopPrice, obj, orders[raw.s]);
                  } else {
                    binanceModule.unsubscribe([raw.s.toLowerCase() + '@kline_' + timing]);
                    sendStatus('Unsubscribe: '+[raw.s.toLowerCase() + '@kline_' + timing])
                  }
                });
              }
            }

            historyStore[raw.s].push(message);
            analytics.stopPriceCalc(historyStore[raw.s]);
            break;
        }
      }, logger);
    });
  }

  function sendStatus(msg) {
    io.emit('statusMessage', msg);
  }

  function setNewStopPrice(symbol, stopPrice, lastCandle, orders) {

    orders.forEach((item, i) => {
      if (item.type == 'STOP_LOSS_LIMIT') {

        mysqlConnection.executeQueries({
          sql: 'select * from monitoring where orderId = ?',
          params: [item.orderId]
        }).then((resMon) => {

          if(resMon.lenght == 0) {
            logger.error('Order ID not present', error);
          }

          var type = resMon[0].type;

          if(type == 'noMonitor')
            return;

          binanceModule.cancelOrder({
            symbol: symbol,
            orderId: item.orderId
          }, (responseSL) => {
            if (responseSL.status != 200) {
              sendStatus({
                code: -1,
                msg: 'Order ID error',
                obj: responseSL.data
              });
              return;
            }

            mysqlConnection.executeQueries({
              sql: 'DELETE from monitoring where orderId = ?',
              params: [item.orderId]
            }).catch((error) => {
              logger.error('Query error delete order', error);
            });

            var spread = lastCandle.high - lastCandle.low;
            var stopParams = {
              timeInForce: 'GTC',
              symbol: symbol,
              quantity: parseFloat(item.origQty),
              price: parseFloat(stopPrice[type] - (spread / 4)),
              stopPrice: parseFloat(stopPrice[type])
            };

            binanceModule.setSellStopLimit(stopParams, (response) => {
              if (response.status != 200) {
                logger.error('Set Stop Limit error', response.data);

                if (response.data.code == -2010) {

                  binanceModule.setMarketOrder({
                    timeInForce: 'GTC',
                    symbol: symbol,
                    quantity: stopParams.quantity
                  }, (resLim) => {
                    if (resLim.status != 200) {
                      logger.error('Set Market order error', resLim.data);
                      return;
                    }

                    sendStatus({
                      code: 1,
                      msg: 'Order Market setted',
                      obj: stopParams
                    });
                  });
                }
              } else {
                mysqlConnection.executeQueries({
                  sql : 'INSERT INTO monitoring (symbol, type, orderId, initialValue) VALUES (?, ?, ?, ?) ',
                  params : [symbol, type, response.data.orderId, -1]
                }, true).then((resIn) => {
                  logger.info('Stop Limit setted: ', stopParams);
                  sendStatus({
                    code: 1,
                    msg: 'Stop Limit setted',
                    obj: stopParams
                  });
                }).catch((error) => {
                  logger.error('Query error insert stop limit', error);
                });
              }
            });
          });
        }).catch((error) => {
          logger.error('Query error get monitoring type', error);
        });
      }
    });
  }

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
