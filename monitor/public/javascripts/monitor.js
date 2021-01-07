$(document).ready(function() {
  var message = $('#message');
  socket.on('statusMessage', function(dataObj) {
    message.text(dataObj.msg);
  });

  socket.on('errorMessage', function(dataObj) {
    Toast.fire({
      icon: 'error',
      title: dataObj.message
    })
  });
});
