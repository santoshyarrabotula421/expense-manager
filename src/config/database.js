const mysql = require('mysql2/promise');

let connection = null;

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'expense_manager',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const connectDB = async () => {
  try {
    // Create connection pool
    connection = mysql.createPool(dbConfig);
    
    // Test the connection
    await connection.execute('SELECT 1');
    
    console.log('Database connection established successfully');
    return connection;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
};

const getConnection = () => {
  if (!connection) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return connection;
};

const closeConnection = async () => {
  if (connection) {
    await connection.end();
    connection = null;
    console.log('Database connection closed');
  }
};

module.exports = {
  connectDB,
  getConnection,
  closeConnection
};