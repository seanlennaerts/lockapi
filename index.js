const express = require('express');
var Connection = require('tedious').Connection;
var Request = require('tedious').Request;

var database;

const route = express();

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

function query(sql) {
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

function updateQuery(sql) {
  var request = new Request(sql, err => {
    if (err) {
      console.log(err);
    }
  });
  database.execSql(request);

  return new Promise((resolve, reject) => {
    request.on('requestCompleted', () => {
      resolve(true);
    })

    request.on('error', err => {
      reject(false);
    })
  })
}

function getAll(table) {
  return query(`select * from ${table}`);
}

route.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

route.get('/', (req, res) => {
  query('select * from home')
    .then(rows => res.send(rows));
});

route.get('/lock-status', (req, res) => {
  console.log(`checking lock status with sn ${req.query.sn}`);
  query(`select locked from lock where sn = '${req.query.sn}'`)
    .then(rows => res.send(rows[0].locked));
});

route.get('/all', (req, res) => {
  getAll(req.query.table)
    .then(rows => res.send(rows));
});

route.post('/unlock', (req, res) => {
  const { uid, sn, pin } = req.query;
  let date = new Date();
  let dateString = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
  query(`select pin, locked
         from users
         join access on users.uid = access.user_id
         join lock on lock.sn = access.lock_id
         where users.uid = ${uid}
         and sn = '${sn}'
         and '${dateString}' >= access.start_date
         and '${dateString}' <= access.end_date`)
    .then(rows => {
      if (rows.length > 0 && JSON.parse(rows[0].pin) === parseInt(pin)) {
        updateQuery(`update lock set locked = 0 where sn = '${sn}'`)
        .then(result => {
          if (!result) {
            console.log('something went wrong with unlocking');
          }
          res.send(true);
        })
      } else {
        res.send(false);
      }
    });

});

route.post('/lock', (req, res) => {
  console.log('attempting to lock lock');
  updateQuery(`update lock set locked = 1 where sn = '${req.query.sn}'`)
  .then(result => {
    if (!result) {
      console.log('something went wrong');
    } else {
      res.send(true);
    }
  }) 
});

route.get('/locks', (req, res) => {
  query(`select *
         from lock
         where home_id = ${req.query.id}`)
    .then(rows => res.send(rows));
})

route.listen(4000, () => console.log('Listening at :4000'));
