$(document).ready(function() {
  var element = $('meta[name="active-menu"]').attr('content');
  $('#' + element).addClass('active');

  var selector = $("#symbol");

  $.each(assets, function(k, v) {
    selector.append('<option value="' +v.asset + '" '+(v.asset == pathname[1] ? "selected" : "")+'>' + v.asset.toUpperCase() + '</option>')
  });
  selector.on('change', function() {
    window.location.href = pathname[0] + '/' + $(this).val() + '/eur/' + pathname[3] + '/' + pathname[4];
  })
});
