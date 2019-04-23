const express = require('express');
var Connection = require('tedious').Connection;
var Request = require('tedious').Request;
var database;

const app = express();

(function initDatabase() {
  let config = {
    authentication: {
      options: {
        userName: 'sean',
        password: 'Password123'
      },
      type: 'default'
    },
    server: 'lockdemo.database.windows.net',
    options: {
      database: 'lockdemo',
      encrypt: true
    }
  }
  database = new Connection(config);

  database.on('connect', err => {
    if (err) {
      console.log(err)
    } else {
      console.log('Database succesfully connected :)');
    }
  });
})();

function queryDatabase(sql) {
  var request = new Request(`${sql} for json path`, err => {
    if (err) {
      console.log(err);
    }
  });
  database.execSql(request);

  return new Promise((resolve, reject) => {

    request.on('row', columns => {
      resolve(JSON.parse(columns[0].value));
    });

    request.on('error', err => {
      reject(err);
    });
  });
}

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/', (req, res) => {
  queryDatabase('select * from test').then(rows => {
    res.send(rows);
  });
});

app.listen(3000, () => console.log('Listening at :3000'));
