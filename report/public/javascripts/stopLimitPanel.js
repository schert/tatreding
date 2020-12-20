$(document).ready(function() {
  var euroAmount = $('#euroAmount');
  var assetAmount = $('#assetAmount');
  var riskPer = $('#riskPer');
  var limitPrice = $('#limitPrice');
  var euroRisk =  $('#euroRisk');

  assetAmount.on('keyup mouseup', function() {
    var amount = parseFloat($(this).val());

    if(isNaN(amount) || amount <= 0)
      return;

    var euroAm = amount * getAssetPrice();
    euroAmount.val(euroAm);

    limitPrice.val(amount - ((riskPer.val() * amount) / 100));
  });

  euroAmount.on('keyup mouseup', function() {
    assetAmount.val(parseFloat($(this).val()) / getAssetPrice());
  });

  riskPer.on('keyup mouseup', function() {
    var amount = parseFloat(assetAmount.val());
    var limitP = amount - (($(this).val() * amount) / 100);
    limitPrice.val(limitP);

    var assetP = getAssetPrice();
    euroRisk.val((assetP - limitP) * getAssetPrice());
  });
});

function stopLimitUpdate() {

}

function getAssetPrice() {
  return assetPrice;
}
