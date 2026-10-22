const sql = require('mssql');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((pool) => {
    console.log('Connected to MSSQL');
    return pool;
  })
  .catch((error) => {
    console.error('MSSQL connection failed:', error);
    // Don't terminate the process — allow the server to start so frontend and
    // non-database parts can be developed and tested locally. Route handlers
    // will receive the rejection when they await `poolPromise` and should
    // handle DB errors gracefully.
    return Promise.reject(error);
  });

module.exports = {
  sql,
  poolPromise,
};
