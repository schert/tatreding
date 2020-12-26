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
var setStopButton = $('#setStopButton');
var totalAsset = $('#totalAsset');

$(document).ready(function() {
  $.each(assets, function(k, v) {
    if (v.asset == asset) {
      $('.assetValue', wallet).text(v.free + " (locked: " + v.locked + ")");
      walletAsset = v;
    }
  });

  totalAsset.on('click', function(event) {
    event.preventDefault()
    assetAmount.val(walletAsset.free);
    assetAmount.trigger('keyup');
  });

  assetAmount.on('keyup mouseup', function() {
    updateFocus.amount = $(this);

    var assetAmountVal = $(this).val();
    if (!assetAmountVal || isNaN(assetAmountVal) || assetAmountVal <= 0)
      return;

    var amount = parseFloat(assetAmountVal);
    var assetPrice = getAssetPrice();
    euroAmount.val(euroAmountCalc(amount, assetPrice));

    stopLimitUpdate({close : assetPrice});
  });

  euroAmount.on('keyup mouseup', function() {
    updateFocus.amount = $(this);

    var euroAmountVal = $(this).val();
    if (!euroAmountVal || isNaN(euroAmountVal) || euroAmountVal < 0)
      return;

    var assetPrice = getAssetPrice();
    var amount = amountAssetCalc(parseFloat(euroAmountVal), assetPrice);
    assetAmount.val(amount);

    stopLimitUpdate({close : assetPrice});
  });

  riskPer.on('keyup mouseup', function() {
    updateFocus.risk = $(this);

    var assetAmountVal = assetAmount.val();
    var riskPerVal = $(this).val();
    if (!assetAmountVal || isNaN(assetAmountVal) || assetAmountVal <= 0)
      return;

    var amount = parseFloat(assetAmountVal);
    var assetPrice = getAssetPrice();

    if (!riskPerVal || isNaN(riskPerVal) || riskPerVal < 0)
      return;

    var limitP = limitPriceCalc(parseFloat(riskPerVal), assetPrice);
    limitPrice.val(limitP);
    euroRisk.val(euroRiskCalc(amount, assetPrice, limitP));

    stopLimitUpdate({close : assetPrice});
  });

  euroRisk.on('keyup mouseup', function() {
    updateFocus.risk = $(this);

    var assetAmountVal = assetAmount.val();
    var euroRiskVal = $(this).val();

    if (!assetAmountVal || isNaN(assetAmountVal) || assetAmountVal <= 0)
      return;

    var amount = parseFloat(assetAmountVal);
    var assetPrice = getAssetPrice();

    if (!euroRiskVal || isNaN(euroRiskVal) || euroRiskVal < 0)
      return;

    var percAsset = percRiskCalc(parseFloat(euroRiskVal), assetPrice, amount);
    riskPer.val(percAsset);
    limitPrice.val(limitPriceCalc(percAsset, assetPrice));

    stopLimitUpdate({close : assetPrice});
  });

  limitPrice.on('keyup mouseup', function() {
    updateFocus.risk = $(this);

    var assetAmountVal = assetAmount.val();
    var euroRiskVal = euroRisk.val();
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

    stopLimitUpdate({close : assetPrice});
  })

  stopPer.on('keyup mouseup', function() {
    updateFocus.stop = $(this);

    var stopPerVal = $(this).val();
    var limitPriceVal = limitPrice.val();

    if (!stopPerVal || isNaN(stopPerVal) || stopPerVal < 0 ||
      !limitPriceVal || isNaN(limitPriceVal) || limitPriceVal <= 0)
      return;

    stopPrice.val(stopPriceCalc(getAssetPrice(), parseFloat(stopPerVal), parseFloat(limitPriceVal)));
  });

  stopPrice.on('keyup mouseup', function() {
    updateFocus.stop = $(this);

    var stopPriceVal = $(this).val();
    var limitPriceVal = limitPrice.val();

    if (!stopPriceVal || isNaN(stopPriceVal) || stopPriceVal < 0 ||
      !limitPriceVal || isNaN(limitPriceVal) || limitPriceVal <= 0)
      return;

    var assetPrice = getAssetPrice();
    stopPer.val(stopPerCalc(parseFloat(stopPriceVal), parseFloat(limitPriceVal)));
  });

  setStopButton.on('click', function() {
    var stopPriceVal = stopPrice.val();
    var assetAmountVal = assetAmount.val();
    var limitPriceVal = limitPrice.val();
    var euroRiskVal = euroRisk.val();
    var euroAmountVal = euroAmount.val();

    Swal.fire({
      title: 'Setup STOP PRICE LIMIT?',
      html: "<div class='row'><div class='col-6 text-right'>AMOUNT</div><div class='col-6 text-left'>" + assetAmountVal + " " + asset.toUpperCase() + " (" + euroAmountVal + " €)</div></div><div class='row'><div class='col-6 text-right'>STOP</div><div class='col-6 text-left'>" + stopPriceVal + " " + asset.toUpperCase() + "</div></div><div class='row'><div class='col-6 text-right'>LIMIT</div><div class='col-6 text-left'>" + limitPriceVal + " " + asset.toUpperCase() + "</div></div><div class='row'><div class='col-6 text-right'>RISK</div><div class='col-6 text-left'>" + euroRiskVal + " €</div></div>",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes!'
    }).then((result) => {
      if (result.isConfirmed) {
        apiCall(baseUrl + '/order', {
          symbol: (asset+assetTo).toUpperCase(),
          quantity: assetAmountVal,
          limitPrice: limitPriceVal,
          stopPrice: stopPriceVal
        }, function(data) {
          Swal.fire(
            'SETTED!',
            'STOP PRICE LIMIT SETTED',
            'success'
          )
        });
      }
    })
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
