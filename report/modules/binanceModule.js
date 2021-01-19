var binanceModule = {};

const BN_CONF = require('../config/binanceConstants');
var logger = require('../config/winston');
var axios = require('axios').default;
var np = require('number-precision');
const crypto = require('crypto');
const qs = require('qs');

var ackCallbackMap = new Map();
var eventCallbackMap = new Map();
var weightServer = new Map();
var lastHTTPCode = 0;

binanceModule.setConfigLogger = (config) => {
  logger = config;
}

function registerClient(client) {
  client.on('connectFailed', function(error) {
    binanceModule.reciveCallback = null;
    binanceModule.afterConnect = null;
    logger.error('Connect Error: ' + error.toString());
  });

  client.on('connect', function(connection) {
    binanceModule.connection = connection;

    logger.info('WebSocket Client Connected');

    connection.on('error', function(error) {
      logger.error("Connection Error: " + error.toString());
    });

    connection.on('close', function() {
      binanceModule.connection = null;
      logger.info('Connection Closed');
    });

    connection.on('message', function(message) {
      if (message.type === 'utf8') {

        var json = JSON.parse(message.utf8Data)

        if (json.error) {
          logger.error("Binance error: ", json.error);
          return;
        }

        if (json.id !== undefined) {
          if (ackCallbackMap.has(json.id)) {
            ackCallbackMap.get(json.id)(json);
          }
        } else {
          eventCallbackMap.get(json.e)(json);
        }
      }
    });

    binanceModule.unsubscribe = function(param) {
      if (connection.connected) {
        var obj = {
          "method": "UNSUBSCRIBE",
          "params": param,
          "id": addEventCallback()
        }
        connection.sendUTF(JSON.stringify(obj));
      }

      return obj.id;
    }

    binanceModule.unsubscribeAll = function(callback) {

      if (connection.connected) {
        var obj = {
          "method": "LIST_SUBSCRIPTIONS",
          "id": addAckCallback(function(message) {
            binanceModule.unsubscribe(message.result);

            if (callback)
              callback();
          })
        }

        connection.sendUTF(JSON.stringify(obj));
        return obj.id;
      }

      return null;
    }

    binanceModule.subscribe = function(param) {
      if (connection.connected) {
        var events = param.map(function(d) {
          return {
            name: d.split('@')[1].split('_')[0],
            fn: function(message) {
              binanceModule.reciveCallback(message);
            }
          }
        });

        var obj = {
          "method": "SUBSCRIBE",
          "params": param,
          "id": addEventCallback(events)
        }
        connection.sendUTF(JSON.stringify(obj));

        return obj.id;
      }
    }

    binanceModule.afterConnect();
  });
}

binanceModule.connect = function(webSocketClient, afterConnect, reciveCallback) {
  if (!binanceModule.afterConnect) {
    registerClient(webSocketClient);
    binanceModule.reciveCallback = reciveCallback;
    binanceModule.afterConnect = afterConnect;
    return webSocketClient.connect(BN_CONF.WS_URL + (+new Date()));
  } else {
    binanceModule.reciveCallback = reciveCallback;
    binanceModule.afterConnect = afterConnect;
    binanceModule.afterConnect();
  }
}

function addAckCallback(fun) {
  return addEventCallback(null, fun);
}

function addEventCallback(eventsCalback, ackCallback) {
  var id = ackCallbackMap.size;

  ackCallbackMap.set(id, function(params) {
    if (ackCallback) {
      ackCallback(params);
    }
    ackCallbackMap.delete(id);
  });

  if (eventsCalback) {
    eventsCalback.forEach((eve, i) => {
      eventCallbackMap.set(eve.name, eve.fn);
    });
  }

  return id;
}

binanceModule.getWallet = (callback) => {
  autenticatedCall(BN_CONF.API_WALLET_INFO, 'get', {}, callback);
}

binanceModule.getAllOrder = (params, callback) => {
  autenticatedCall(BN_CONF.API_ALL_ORDER, 'get', params, callback);
}

binanceModule.getExchangeInfo = (callback) => {
  unatenticatedCall(BN_CONF.API_EXCHANGE_INFO, 'get', {}, callback);
}

binanceModule.cancelOrder = (params, callback) => {
  autenticatedCall(BN_CONF.API_ORDER, 'delete', params, callback);
}

binanceModule.avgPrice = (params, callback) => {
  unatenticatedCall(BN_CONF.API_AVG_PRICE, 'get', params, callback);
}

binanceModule.setSellStopLimit = (params, callback) => {
  params.side = 'SELL';
  params.type = 'STOP_LOSS_LIMIT';

  setOrder(params, callback);
}

binanceModule.setMarketOrder = (params, callback) => {
  params.side = 'SELL';
  params.type = 'MARKET';

  setOrder(params, callback);
}

binanceModule.getAllOpenOrder = (params, callback) => {
  autenticatedCall(BN_CONF.API_ALL_OPEN_ORDER, 'get', params, callback);
}

function setOrder(params, callback) {

  binanceModule.getExchangeInfo((response) => {
    for (const item of response.data.symbols) {
      if (item.symbol == params.symbol) {
        var tick = item.filters[0].tickSize;
        var step = item.filters[2].stepSize;

        np.enableBoundaryChecking(false);

        params.quantity = Math.floor(params.quantity/ step) * step;
        params.price = (np.round(params.price/ tick, 0)) * tick;
        params.stopPrice = (np.round(params.stopPrice/ tick, 0)) * tick;

        params.quantity = np.round(params.quantity, item.baseAssetPrecision);
        params.price = np.round(params.price, item.baseAssetPrecision);
        params.stopPrice = np.round(params.stopPrice, item.baseAssetPrecision);

        autenticatedCall(BN_CONF.API_ORDER, 'post', params, callback);
        return;
      }
    }

    logger.error('ExchangeInfo error');
  });
}

function unatenticatedCall(url, method, params, callback) {
  testServerWeigth(() => {
    axios({
      method: method,
      url: url,
      params: params
    }).then(response => {
      if (callback)
        callback(response);
      setServerWeigth(url, response);
    }).catch(error => {
      setServerWeigth(url, error.response);
      error = error.response ? {status: error.response.status, data : error.response.data} : error;
      logger.error("UnatenticatedCall error: ", error);
      callback(error);
    });
  });
}

function autenticatedCall(url, method, params, callback) {
  testServerWeigth(() => {

    syncBinanceTime((time) => {
      var delta = Date.now() - time;

      params.timestamp = Date.now() - delta;
      // params.recvWindow = 5000;
      var queryStr = qs.stringify(params);
      var siganture = getSignature(queryStr);

      axios({
        method: method,
        url: url + '?' + queryStr + '&signature=' + siganture,
        headers: {
          "X-MBX-APIKEY": BN_CONF.API_APIKEY
        }
      }).then(response => {
        setServerWeigth(BN_CONF.API_ALL_ORDER, response);
        if (callback)
          callback(response);
      }).catch(error => {
        setServerWeigth(url, error.response);
        error = error.response ? {status: error.response.status, data : error.response.data} : error;
        logger.error("AutenticatedCall error: ", error);
        callback(error);
      });
    });
  });
}

function syncBinanceTime(callbackSync) {
  unatenticatedCall(BN_CONF.API_TIME, 'get', {}, (res) => {
    if(res.status == 200)
      callbackSync(res.data.serverTime);
  });
}

function getSignature(queryStr) {
  return crypto.createHmac("sha256", BN_CONF.API_SECRET_KEY)
    .update(queryStr)
    .digest("hex");
}

binanceModule.getCandleHistory = (symbol, interval, startTime, endTime, callback, limit) => {
  var result = [];
  getMultipleCandle(symbol, interval, startTime, endTime, (res) => {
    if (res == null) {
      callback(result);
      return;
    }

    result = result.concat(res);
  }, limit);
}

function getMultipleCandle(symbol, interval, startTime, endTime, callback, limit) {
  unatenticatedCall(BN_CONF.API_CANDLE_HISTORY, 'get', {
    interval: interval,
    symbol: symbol,
    startTime: startTime,
    endTime: endTime,
    limit: limit ? limit : 1000
  }, (response) => {
    callback(candleTransformer('history', response.data));
    var startNewTime = response.data[response.data.length - 1][6];
    if (startNewTime < endTime) {
      getMultipleCandle(symbol, interval, startNewTime, endTime, callback, limit);
    } else {
      callback(null);
    }
  });
}

function setServerWeigth(url, response) {
  var headerf = [];

  if(!response || !response.status)
    return;

  lastHTTPCode = response.status;

  if(!response.headers)
    return;

  Object.keys(response.headers).forEach((item, i) => {
    if (item.startsWith('x-mbx-')) {
      headerf[item] = response.headers[item];
    }
  });

  weightServer.set(url, headerf);
}

// TODO: rate test
function testServerWeigth(success) {

  if (lastHTTPCode == 429) {
    logger.error("Rate limit error!");
  } else {
    success();
  }
}

binanceModule.getOrders = () => {
  axios({
    method: 'post',
    url: '/user/12345',
    headers: {
      'X-Requested-With': 'XMLHttpRequest'
    },
    data: {
      firstName: 'Fred',
      lastName: 'Flintstone'
    }
  });
}

binanceModule.timeEqualComparator = (type, obj1, obj2) => {
  // m -> minutes; h -> hours; d -> days; w -> weeks; M -> months
  // 1m 3m 5m 15m 30m 1h 2h 4h 6h 8h 12h 1d 3d 1w 1M
  switch (type.substr(type.length - 1)) {
    case 'm':
      return obj1.date.getMinutes() == obj2.date.getMinutes();
    case 'h':
      return obj1.date.getHours() == obj2.date.getHours();
    case 'd':
      return obj1.date.getDate() == obj2.date.getDate();
    case 'w':
      return Math.floor(obj1.date.getDate() / 7) == Math.floor(obj2.date.getDate() / 7);
    case 'M':
      return obj1.date.getMonth() == obj2.date.getMonth();
  }
}

function candleTransformer(typeIn, input) {
  switch (typeIn) {
    case 'stream':
      // {
      //   "e": "kline", // Event type
      //   "E": 123456789, // Event time
      //   "s": "BNBBTC", // Symbol
      //   "k": {
      //     "t": 123400000, // Kline start time
      //     "T": 123460000, // Kline close time
      //     "s": "BNBBTC", // Symbol
      //     "i": "1m", // Interval
      //     "f": 100, // First trade ID
      //     "L": 200, // Last trade ID
      //     "o": "0.0010", // Open price
      //     "c": "0.0020", // Close price
      //     "h": "0.0025", // High price
      //     "l": "0.0015", // Low price
      //     "v": "1000", // Base asset volume
      //     "n": 100, // Number of trades
      //     "x": false, // Is this kline closed?
      //     "q": "1.0000", // Quote asset volume
      //     "V": "500", // Taker buy base asset volume
      //     "Q": "0.500", // Taker buy quote asset volume
      //     "B": "123456" // Ignore
      //   }
      // }
      if (!input.k) {
        return;
      }

      return {
        date: new Date(input.k.T),
          open: input.k.o,
          high: input.k.h,
          low: input.k.l,
          close: input.k.c,
          volume: input.k.v
      }
      case 'history':
        // [
        //   [
        //     1499040000000, // Open time
        //     "0.01634790", // Open
        //     "0.80000000", // High
        //     "0.01575800", // Low
        //     "0.01577100", // Close
        //     "148976.11427815", // Volume
        //     1499644799999, // Close time
        //     "2434.19055334", // Quote asset volume
        //     308, // Number of trades
        //     "1756.87402397", // Taker buy base asset volume
        //     "28.46694368", // Taker buy quote asset volume
        //     "17928899.62484339" // Ignore.
        //   ]
        // ]
        var out = Array();
        input.map((message) => {
          out.push({
            date: new Date(message[6]),
            open: message[1],
            high: message[2],
            low: message[3],
            close: message[4],
            volume: message[5]
          });
        });
        return out;
  }

  return null;
}
binanceModule.candleTransformer = candleTransformer;

module.exports = binanceModule;
