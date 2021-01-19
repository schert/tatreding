var utils = {};

utils.stopPriceCalc = (historyStore) => {
  historyStore.forEach((itemh, i) => {
    itemh.stopPrice = {};
    itemh.stopPrice.treding = tredingCalc(historyStore.slice(0, i + 1));
    itemh.stopPrice.longTerm = longTermCalc(historyStore.slice(0, i + 1));
  });
}

function applyAlgo(stopPrice, sample, q) {
  return (stopPrice * (1 - q)) + (sample * q);
}

function longTermCalc(historyStore) {
  var spreadMax, spreadMin;
  spreadMax = spreadMin = parseFloat(historyStore[0].high) - parseFloat(historyStore[0].low);
  var stopPrice = historyStore[0].close;

  historyStore.forEach((item, i) => {
    var spread = parseFloat(item.high) - parseFloat(item.low);
    if (spreadMax < spread)
      spreadMax = spread;

    if (spreadMin > spread)
      spreadMin = spread;
  });

  historyStore.forEach((item, i) => {
      stopPrice = applyAlgo(stopPrice, item.high - ((spreadMax + spreadMin) / 2), 0.03);
  });

  return stopPrice;
}

function tredingCalc(historyStore) {

  var spreadMax, spreadMin;
  spreadMax = spreadMin = parseFloat(historyStore[0].high) - parseFloat(historyStore[0].low);

  historyStore.forEach((item, i) => {
    var spread = parseFloat(item.high) - parseFloat(item.low);
    if (spreadMax < spread)
      spreadMax = spread;

    if (spreadMin > spread)
      spreadMin = spread;
  });

  var stopPrice = -1;
  var q = 0.5;
  var spreadRefer = (spreadMax - spreadMin != 0 ? spreadMax - spreadMin : 0.0001);

  var oldSpread = 0;
  historyStore.forEach((item, i) => {
    var open = parseFloat(item.open);
    var low = parseFloat(item.low);
    var high = parseFloat(item.high);
    var close = parseFloat(item.close);
    var market = open - ((open - close) / 2);

    if (stopPrice == -1)
      stopPrice = low;

    var spread = high - low;
    var q = ((spread - spreadMin) / spreadRefer);
    var qg = q;
    val = market - (1-q) * spread*1.2;

    if(open <= close && q > 0.45) {
      qg = 0.5 + q * 0.5;
    }

    if(open > close && q > 0.75) {
      qg = 0.01;
      val = low;
    }

    stopPrice = applyAlgo(stopPrice, val, qg);
  });

  return stopPrice;
}

module.exports = utils;
