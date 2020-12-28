$(document).ready(function() {
  var element = $('meta[name="active-menu"]').attr('content');
  $('#' + element).addClass('active');

  var selector = $("#symbol");

  $.each(assets, function(k, v) {
    if(v.free > 0 || v.locked > 0) {
      selector.append('<option value="' +v.asset + '" '+(v.asset == pathname[1] ? "selected" : "")+' '+ ((v.asset == 'eur' || v.asset == 'twt') ? "disabled" : "") +'>' + v.asset.toUpperCase() + '</option>');
    }
  });
  selector.on('change', function() {
    window.location.href = pathname[0] + '/' + $(this).val() + '/eur/' + (pathname[3] ? pathname[3] : 1) + '/' + (pathname[4] ? pathname[4] : '1m');
  });

  var urlTimeout
  $('#time').on('change', function() {
    clearTimeout(urlTimeout);
    var that = $(this);
    urlTimeout = setTimeout(function() {
      window.location.href = pathname[0] + '/' + pathname[1] + '/eur/' + that.val() + '/' + (pathname[4] ? pathname[4] : '1m');
    },1000);
  }).val(pathname[3] ? pathname[3] : 1);

  $('#timeing').on('change', function() {
    window.location.href = pathname[0] + '/' + pathname[1] + '/eur/' + (pathname[3] ? pathname[3] : 1) + '/' + $(this).val();
  }).val(pathname[4] ? pathname[4] : '1m');
});
