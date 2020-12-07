var binanceModule = {};

var WebSocketClient = require('websocket').client;
var client = new WebSocketClient();
const BN_CONF = require('../config/binanceConstants');
var logger = require('../config/winston');
var axios = require('axios');

client.on('connectFailed', function(error) {
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
      logger.debug("Received: '" + message.utf8Data + "'");
      var json = JSON.parse(message.utf8Data)
      
      if(json.id)
        return;

      binanceModule.reciveCallback(candleTransformer('stream', json));
    }
  });

  binanceModule.subscribe = function(param) {
    if (connection.connected) {
      var obj = {
        "method": "SUBSCRIBE",
        "params": param,
        "id": +new Date()
      }
      connection.sendUTF(JSON.stringify(obj));
    }

    return obj.id;
  }

  binanceModule.send = function(param) {
    if (connection.connected) {
      var obj = {
        "method": param.method,
        "params": param,
        "id": +new Date()
      }
      connection.sendUTF(JSON.stringify(obj));
      return obj.id;
    }
  }

  binanceModule.afterConnect();
});

binanceModule.connect = function(afterConnect, reciveCallback) {
  if (!binanceModule.connection || !binanceModule.connection.connected) {
    binanceModule.reciveCallback = reciveCallback;
    binanceModule.afterConnect = afterConnect;
    return client.connect(BN_CONF.WS_URL);
  }
}

binanceModule.getCandleHistory = function(symbol, interval, startTime, endTime, callback) {
  axios.all([
    axios({
      method: 'get',
      url: BN_CONF.API_CANDLE_HISTORY,
      params: {
        interval: interval,
        symbol: symbol,
        startTime: startTime,
        endTime: endTime
      }
    })
  ]).then(axios.spread((response) => {
    callback(candleTransformer('history', response.data));
  })).catch(error => {
    logger.error("Get history error: ", error);
  });
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
        "Date": new Date(input.k.t),
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
            "Date": new Date(message[0]),
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

module.exports = binanceModule;
