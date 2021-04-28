var mysql = require('mysql');
var logger = require('../config/winston');
var mysqlConnection = {}

var connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'tatreding'
});

mysqlConnection.connect = function(callback) {

  if (connection.state === 'disconnected') {
    connection.connect(function(err) {
      if (err) {
        logger.error('error connecting: ' + err.stack);
        connection.end();
        throw err;
      }
      logger.info('connected as id ' + connection.threadId);
    });
  }
  callback();
}

mysqlConnection.executeQueries = function(queries, transact) {

  if (!Array.isArray(queries)) {
    queries = [queries];
  }

  return new Promise(async (resolve, reject) => {

    function rollbackAndFail(error) {
      try {
        connection.rollback((rollbackError) => {
          reject(error);
        });
      } catch (rolError) {
        reject(rolError);
      }
    }

    function executeEachQueries(queries) {
      var i = 0;
      var promises = [];
      for (const query of queries) {
        promises.push(new Promise((resolveP, rejectP) => {
          connection.query(query.sql, query.params ? query.params : null, function(err, result) {
            if (err !== null) {
              rejectP(err);
            } else {
              resolveP(result);
            }
          });
        }));
      };

      return promises;
    }

    function promiseQueries(queries) {
      Promise.all(executeEachQueries(queries)).then(values => {
        connection.commit(function(commitError) {
          if (commitError === null) {
            if(values.length == 1) {
              values = values[0];
            }
            resolve(values);
          } else {
            rollbackAndFail(commitError);
          }
        });
      }).catch(error => {
        rollbackAndFail(error)
      });
    }

    try {
      mysqlConnection.connect(() => {
        if (transact) {
          connection.beginTransaction(function(err) {
            if (err) {
              rollbackAndFail(err);
            } else {
              promiseQueries(queries)
            }
          });
        } else {
          promiseQueries(queries)
        }
      });
    } catch (error) {
      rollbackAndFail(error)
    }
  });
}

module.exports = mysqlConnection;
