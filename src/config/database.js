const { Pool } = require('pg');
const logger = require('./logger');

// Create PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
  logger.info('Database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err.message });
  process.exit(-1);
});

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Database query error', { 
      text, 
      error: error.message,
      stack: error.stack 
    });
    throw error;
  }
};

// Helper function to get a client from the pool (for transactions)
const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);

  // Set a timeout for the transaction
  const timeout = setTimeout(() => {
    logger.error('Client checkout timeout');
    client.release();
  }, 5000);

  // Override release to clear the timeout
  client.release = () => {
    clearTimeout(timeout);
    client.release = release;
    return release();
  };

  return client;
};

// Test database connection function
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW()');
    logger.info('Database connection test successful', { 
      timestamp: result.rows[0].now 
    });
    return true;
  } catch (error) {
    logger.error('Database connection test failed', { 
      error: error.message 
    });
    return false;
  }
};

module.exports = {
  query,
  getClient,
  pool,
  testConnection,
};