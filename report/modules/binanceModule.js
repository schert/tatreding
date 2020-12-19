var binanceModule = {};

var WebSocketClient = require('websocket').client;
var client = new WebSocketClient();
const BN_CONF = require('../config/binanceConstants');
var logger = require('../config/winston');
var axios = require('axios').default;
const crypto = require('crypto');
const qs = require('qs');

var ackCallbackMap = new Map();
var eventCallbackMap = new Map();
var weightServer = new Map();
var lastHTTPCode = 0;

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

    return obj.id;
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

binanceModule.connect = function(afterConnect, reciveCallback) {
  if (!binanceModule.afterConnect) {
    binanceModule.reciveCallback = reciveCallback;
    binanceModule.afterConnect = afterConnect;
    return client.connect(BN_CONF.WS_URL + (+new Date()));
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
  getAutenticadCall(BN_CONF.API_WALLET_INFO, 'get', {}, callback);
}

binanceModule.getAllOrder = (params, callback) => {
  getAutenticadCall(BN_CONF.API_ALL_ORDER, 'get', params, callback);
}

binanceModule.setSellStopLimit = (params, callback) => {
  // getAutenticadCall(BN_CONF.API_ORDER, 'post', {
  //   side: 'SELL',
  //   type: 'STOP_LOSS_LIMIT',
  // }, callback);
}

function getAutenticadCall(url, method, params, callback) {
  testServerWeigth(() => {

    params.timestamp = Date.now();
    params.signature = getSignature(params);

    axios({
      method: method,
      url: url,
      headers: {
        "X-MBX-APIKEY": BN_CONF.API_APIKEY
      },
      params: params
    }).then(response => {
      setServerWeigth(BN_CONF.API_ALL_ORDER, response);
      if (callback)
        callback(response);
    }).catch(error => {
      logger.error("Get all order error: ", error);
    });
  });
}

function getSignature(params) {
  return crypto.createHmac("sha256", BN_CONF.API_SECRET_KEY)
    .update(qs.stringify(params))
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
  testServerWeigth(() => {
    axios({
      method: 'get',
      url: BN_CONF.API_CANDLE_HISTORY,
      params: {
        interval: interval,
        symbol: symbol,
        startTime: startTime,
        endTime: endTime,
        limit: limit ? limit : 1000
      }
    }).then(response => {
      callback(candleTransformer('history', response.data));
      var startNewTime = response.data[response.data.length - 1][6];
      if (startNewTime < endTime) {
        getMultipleCandle(symbol, interval, startNewTime, endTime, callback, limit);
      } else {
        callback(null);
      }

      setServerWeigth(BN_CONF.API_CANDLE_HISTORY, response);
    }).catch(error => {
      logger.error("Get history error: ", error);
    });
  });
}

function setServerWeigth(url, response) {
  var headerf = [];
  Object.keys(response.headers).forEach((item, i) => {
    if (item.startsWith('x-mbx-')) {
      headerf[item] = response.headers[item];
    }
  });

  lastHTTPCode = response.status;
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
      return obj1.Date.getMinutes() == obj2.Date.getMinutes();
    case 'h':
      return obj1.Date.getHours() == obj2.Date.getHours();
    case 'd':
      return obj1.Date.getDate() == obj2.Date.getDate();
    case 'w':
      return Math.floor(obj1.Date.getDate() / 7) == Math.floor(obj2.Date.getDate() / 7);
    case 'M':
      return obj1.Date.getMonth() == obj2.Date.getMonth();
  }
}

function tryReconnect(connection) {
  logger.error("Binance socket not connected: ", connection);
  logger.info("Try reconnect");


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
        "Date": new Date(input.k.T),
          "Open": input.k.o,
          "High": input.k.h,
          "Low": input.k.l,
          "Close": input.k.c,
          "Volume": input.k.v
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
            "Date": new Date(message[6]),
            "Open": message[1],
            "High": message[2],
            "Low": message[3],
            "Close": message[4],
            "Volume": message[5]
          });
        });
        return out;
  }

  return null;
}
binanceModule.candleTransformer = candleTransformer;

module.exports = binanceModule;
