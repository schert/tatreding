var utils = {};

utils.stopPriceCalc = (historyStore, fixRisk) => {

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
  var spreadRefer = spreadMax - spreadMin;

  function applyAlgo(stopPrice, sample, q) {
    return (stopPrice * (1 - q)) + (sample * q);
  }

  historyStore.forEach((item, i) => {
    var open = parseFloat(item.open);
    var low = parseFloat(item.low);
    var high = parseFloat(item.high);

    if (stopPrice == -1)
      stopPrice = open;

    var spread = high - low;
    // var close = parseFloat(item.close) - spreadMax;
    // var open = parseFloat(item.open) - spreadMax;

    var q = 0.3 + ((spread - spreadMin) / (spreadMax - spreadMin)) * 0.3;
    var close = parseFloat(item.close);
    var val = close - (spread/2);

    if (open > close) {
      q = (spread - spreadMin) / (spreadMax - spreadMin);
      val = open;
    }

    stopPrice = applyAlgo(stopPrice, val, q);
  });

  return stopPrice;
}

module.exports = utils;
