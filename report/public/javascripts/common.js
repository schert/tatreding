$(document).ready(function() {
  $('[data-toggle="popover"]').popover();
  $('.asset').text(asset);
  $('.assetTo').text(assetTo);
  $('input.asset').attr('placeholder', asset.toUpperCase());
});

function realtimeUpdate(obj) {
  stopLimitUpdate(obj);
  assetPrice = obj.close;
}

function apiCall(url, params, success, ext) {
  var settings = {
    url: url,
    method: 'POST',
    data : params,
    success: success,
    error: function() {
      console.log('Si è verificato un errore');
    }
  };

  $.extend(true, settings, ext);
  $.ajax(settings);
}

// GLOBAL VARIABLE
var assetPrice = 0;
