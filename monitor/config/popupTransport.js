const Transport = require('winston-transport');

module.exports = class PopupTransport extends Transport {

  constructor(opts) {
    super(opts);
    this.client = opts.clientSocket;
    this.level = opts.level;
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);

      if(this.client && info.level == this.level)
        this.client.emit('errorMessage', info);
    });

    // Perform the writing to the remote service
    callback();
  }
};
