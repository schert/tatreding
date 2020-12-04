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
