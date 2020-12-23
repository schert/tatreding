var euroAmount = $('#euroAmount');
var assetAmount = $('#assetAmount');
var wallet = $('#wallet');
var riskPer = $('#riskPer');
var limitPrice = $('#limitPrice');
var euroRisk = $('#euroRisk');
var stopPer = $('#stopPer');
var stopPrice = $('#stopPrice');
var walletAsset;
var updateFocus = {};

$(document).ready(function() {
  $.each(assets, function(k, v) {
    if (v.asset == asset) {
      $('.assetValue', wallet).text(v.free + " (locked: " + v.locked + ")");
      walletAsset = v;
    }
  });

  assetAmount.on('keyup mouseup', function() {
    var assetAmountVal = $(this).val();
    var riskPerVal = riskPer.val();
    var stopPerVal = stopPer.val();
    if (!assetAmountVal || isNaN(assetAmountVal) || assetAmountVal <= 0)
      return;

    var assetAmountVal = parseFloat(assetAmountVal);
    var amount = parseFloat(assetAmountVal);
    var assetPrice = getAssetPrice();
    euroAmount.val(euroAmountCalc(amount, assetPrice));

    if (!riskPerVal || isNaN(riskPerVal) || riskPerVal < 0)
      return;

    var limitP = limitPriceCalc(parseFloat(riskPerVal), assetPrice);
    limitPrice.val(limitP);
    euroRisk.val(euroRiskCalc(amount, assetPrice, limitP));

    if (!stopPerVal || isNaN(stopPerVal) || stopPerVal < 0)
      return;

    stopPrice.val(stopPriceCalc(assetPrice, parseFloat(stopPerVal), limitP));

    updateFocus.amount = $(this);
  });

  euroAmount.on('keyup mouseup', function() {
    var euroAmountVal = $(this).val();
    var riskPerVal = riskPer.val();
    var stopPerVal = stopPer.val();
    if (!euroAmountVal || isNaN(euroAmountVal) || euroAmountVal < 0)
      return;

    var assetPrice = getAssetPrice();
    var amount = amountAssetCalc(parseFloat(euroAmountVal), assetPrice);
    assetAmount.val(amount);

    if (!riskPerVal || isNaN(riskPerVal) || riskPerVal < 0)
      return;

    var limitP = limitPriceCalc(parseFloat(riskPerVal), assetPrice);
    limitPrice.val(limitP);
    euroRisk.val(euroRiskCalc(amount, assetPrice, limitP));

    if (!stopPerVal || isNaN(stopPerVal) || stopPerVal < 0)
      return;

    stopPrice.val(stopPriceCalc(assetPrice, parseFloat(stopPerVal), limitP));

    updateFocus.amount = $(this);
  });

  riskPer.on('keyup mouseup', function() {
    var assetAmountVal = assetAmount.val();
    var riskPerVal = $(this).val();
    var stopPerVal = stopPer.val();
    if (!assetAmountVal || isNaN(assetAmountVal) || assetAmountVal <= 0)
      return;

    var amount = parseFloat(assetAmountVal);
    var assetPrice = getAssetPrice();

    if (!riskPerVal || isNaN(riskPerVal) || riskPerVal < 0)
      return;

    var limitP = limitPriceCalc(parseFloat(riskPerVal), assetPrice);
    limitPrice.val(limitP);
    euroRisk.val(euroRiskCalc(amount, assetPrice, limitP));

    if (!stopPerVal || isNaN(stopPerVal) || stopPerVal < 0)
      return;

    stopPrice.val(stopPriceCalc(assetPrice, parseFloat(stopPerVal), limitP));

    updateFocus.risk = $(this);
  });

  euroRisk.on('keyup mouseup', function() {
    var assetAmountVal = assetAmount.val();
    var euroRiskVal = $(this).val();
    var stopPerVal = stopPer.val();
    if (!stopPerVal || isNaN(stopPerVal) || assetAmountVal <= 0)
      return;

    var amount = parseFloat(assetAmountVal);
    var assetPrice = getAssetPrice();

    if (!euroRiskVal || isNaN(euroRiskVal) || euroRiskVal < 0)
      return;

    var percAsset = percRiskCalc(parseFloat(euroRiskVal), assetPrice, amount);
    riskPer.val(percAsset);
    var limitP = limitPriceCalc(percAsset, assetPrice);
    limitPrice.val(limitP);

    if (!stopPerVal || isNaN(stopPerVal) || stopPerVal < 0)
      return;

    stopPrice.val(stopPriceCalc(assetPrice, parseFloat(stopPerVal), limitP));

    updateFocus.risk = $(this);
  });

  limitPrice.on('keyup mouseup', function() {
    var assetAmountVal = assetAmount.val();
    var euroRiskVal = euroRisk.val();
    var stopPerVal = stopPer.val();
    var limitPriceVal = $(this).val();
    if (!assetAmountVal || isNaN(assetAmountVal) || assetAmountVal <= 0)
      return;

    var assetPrice = getAssetPrice();
    var amount = parseFloat(assetAmountVal);

    if (!limitPriceVal || isNaN(limitPriceVal) || limitPriceVal < 0)
      return;

    euroRisk.val(euroRiskCalc(amount, assetPrice, parseFloat(limitPriceVal)));

    if (!euroRiskVal || isNaN(euroRiskVal) || euroRiskVal < 0)
      return;

    riskPer.val(percRiskCalc(parseFloat(euroRiskVal), assetPrice, amount));

    if (!stopPerVal || isNaN(stopPerVal) || stopPerVal < 0)
      return;

    stopPrice.val(stopPriceCalc(assetPrice, parseFloat(stopPerVal), parseFloat(limitPriceVal)));

    updateFocus.stop = $(this);
  })

  stopPer.on('keyup mouseup', function() {
    var stopPerVal = $(this).val();
    var limitPriceVal = limitPrice.val();
    if (!stopPerVal || isNaN(stopPerVal) || stopPerVal < 0 ||
      !limitPriceVal || isNaN(limitPriceVal) || limitPriceVal <= 0)
      return;

    stopPrice.val(stopPriceCalc(getAssetPrice(), parseFloat(stopPerVal), parseFloat(limitPriceVal)));

    updateFocus.stop = $(this);
  });

  stopPrice.on('keyup mouseup', function() {
    var stopPriceVal = $(this).val();
    var limitPriceVal = limitPrice.val();
    if (!stopPriceVal || isNaN(stopPriceVal) || stopPriceVal < 0 ||
      !limitPriceVal || isNaN(limitPriceVal) || limitPriceVal <= 0)
      return;

    var assetPrice = getAssetPrice();
    stopPer.val(stopPerCalc(parseFloat(stopPriceVal), parseFloat(limitPriceVal)));

    updateFocus.stop = $(this);
  });
});

function stopLimitUpdate(obj) {
  var assetPrice = obj.close;
  $('.assetToValue', wallet).text(walletAsset.free * getAssetPrice() + " (locked: " + walletAsset.locked * getAssetPrice() + ")");

  if (updateFocus.amount == undefined || assetAmount.is(updateFocus.amount)) {
    var amountVal = assetAmount.val();
    if (!(!amountVal || isNaN(amountVal) || amountVal <= 0)) {
      euroAmount.val(euroAmountCalc(parseFloat(amountVal), assetPrice));
    }
  } else {
    var euroAmountVal = euroAmount.val();
    if (!(!euroAmountVal || isNaN(euroAmountVal) || euroAmountVal < 0)) {
      assetAmount.val(amountAssetCalc(parseFloat(euroAmountVal), assetPrice));
    }
  }

  var amountVal = assetAmount.val();

  if (updateFocus.risk == undefined || riskPer.is(updateFocus.risk)) {
    var riskPerVal = riskPer.val();
    if (!(!riskPerVal || isNaN(riskPerVal) || riskPerVal < 0) &&
      !(!amountVal || isNaN(amountVal) || amountVal <= 0)) {
      var limitP = limitPriceCalc(parseFloat(riskPerVal), assetPrice);
      limitPrice.val(limitP);
      euroRisk.val(euroRiskCalc(parseFloat(amountVal), assetPrice, limitP));
    }
  } else if (euroRisk.is(updateFocus.risk)) {
    var euroRiskVal = euroRisk.val();
    if (!(!euroRiskVal || isNaN(euroRiskVal) || euroRiskVal < 0)) {
      var percAsset = percRiskCalc(parseFloat(euroRiskVal), assetPrice, parseFloat(amountVal));
      riskPer.val(percAsset);
      limitPrice.val(limitPriceCalc(percAsset, assetPrice));
    }
  } else if (limitPrice.is(updateFocus.risk)) {
    var limitPriceVal = limitPrice.val();
    var euroRiskVal = euroRisk.val();
    if (!(!euroRiskVal || isNaN(euroRiskVal) || euroRiskVal < 0) &&
      !(!limitPriceVal || isNaN(limitPriceVal) || limitPriceVal <= 0)) {
      euroRisk.val(euroRiskCalc(parseFloat(amountVal), assetPrice, parseFloat(limitPriceVal)));
      riskPer.val(percRiskCalc(parseFloat(euroRiskVal), assetPrice, parseFloat(amountVal)));
    }
  }

  var limitPVal = limitPrice.val();

  if (updateFocus.stop == undefined || stopPer.is(updateFocus.stop)) {
    var stopPerVal = stopPer.val();
    if (!(!stopPerVal || isNaN(stopPerVal) || stopPerVal < 0) &&
      !(!limitPVal || isNaN(limitPVal) || limitPVal <= 0)) {
      stopPrice.val(stopPriceCalc(assetPrice, parseFloat(stopPerVal), parseFloat(limitPVal)));
    }
  } else {
    var stopPriceVal = stopPrice.val();
    if (!(!stopPriceVal || isNaN(stopPriceVal) || stopPriceVal < 0) &&
      !(!limitPVal || isNaN(limitPVal) || limitPVal < 0)) {
    stopPer.val(stopPerCalc(parseFloat(stopPriceVal), parseFloat(limitPVal)));
  }
}
}

function getAssetPrice() {
  return assetPrice;
}

function amountAssetCalc(euroAmount, assetPrice) {
  return euroAmount / assetPrice;
}

function euroAmountCalc(amount, assetPrice) {
  return amount * assetPrice;
}

function limitPriceCalc(riskPer, assetPrice) {
  return assetPrice - (riskPer * assetPrice) / 100;
}

function euroRiskCalc(amount, assetPrice, limitP) {
  return (amount * assetPrice) - (amount * limitP);
}

function stopPriceCalc(assetPrice, stopPer, limitP) {
  return limitP + ((stopPer * assetPrice) / 100);
}

function percRiskCalc(euroRisk, assetP, amount) {
  return (100 * euroRisk) / (assetP * amount);
}

function stopPerCalc(stopPerice, limitP) {
  return ((100 * stopPerice) / limitP) - 100;
}
