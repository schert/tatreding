$(document).ready(function() {});

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer)
    toast.addEventListener('mouseleave', Swal.resumeTimer)
  }
});

$(document).ajaxError(function( event, jqxhr, settings, thrownError ) {
  Toast.fire({
    icon: 'error',
    title: jqxhr.responseJSON.msg
  })
});

function apiCall(url, params, success, ext) {
  var settings = {
    url: url,
    method: 'POST',
    data: params,
    success: success,
    error: function() {
      console.log('Si è verificato un errore');
    }
  };

  $.extend(true, settings, ext);
  $.ajax(settings);
}
