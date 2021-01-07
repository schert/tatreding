var appRoot = require('app-root-path');
const winston = require('winston');

module.exports = (client) => {

  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    // defaultMeta: {
    //   service: 'user-service'
    // },
    transports: [
      //
      // - Write all logs with level `error` and below to `error.log`
      // - Write all logs with level `info` and below to `combined.log`
      //
      new winston.transports.File({
        filename: `${appRoot}/logs/error.log`,
        level: 'error'
      }),
      new winston.transports.File({
        filename: `${appRoot}/logs/app.log`,
      }),
      new (require('./popupTransport'))({
        clientSocket: client,
        level : 'error'
      })
    ],
  });

  //
  // If we're not in production then log to the `console` with the format:
  // `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
  //
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.simple(),
      colorize: true,
      level: 'debug'
    }));
  }

  // create a stream object with a 'write' function that will be used by `morgan`
  logger.stream = {
    write: function(message, encoding) {
      // use the 'info' log level so the output will be picked up by both transports (file and console)
      logger.info(message);
    },
  };

  return logger;
}
