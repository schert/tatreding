$(document).ready(function() {
  $('[data-toggle="popover"]').popover();
  $('.asset').text(asset);
  $('input.asset').attr('placeholder', asset.toUpperCase());
});

function realtimeUpdate(obj) {
  stopLimitUpdate(obj);
  assetPrice = obj.close;
}

function apiCall(url, success, ext) {
  var settings = {
    url: url,
    method: 'GET',
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
