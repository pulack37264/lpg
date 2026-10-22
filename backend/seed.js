const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });

const { poolPromise } = require('./db');

function missingEnvMessage() {
  console.error('Missing DB connection environment variables. Create a .env file in the backend folder with the following keys:');
  console.error('DB_SERVER, DB_USER, DB_PASSWORD, DB_DATABASE (see .env.example)');
  process.exit(1);
}

if (!process.env.DB_SERVER || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_DATABASE) {
  missingEnvMessage();
}

async function run() {
  try {
    const sqlScript = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
    const pool = await poolPromise;
    console.log('Executing database.sql...');
    await pool.request().batch(sqlScript);
    console.log('Database seeded successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

run();
