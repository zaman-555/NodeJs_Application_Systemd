require('dotenv').config(); // Load environment variables
const http = require('http');
const mysql = require('mysql2/promise');

// Create server with environment variables
const hostname = process.env.HOST || '127.0.0.1';
const port = process.env.PORT || 3311;

// MySQL database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0
};

// Create a MySQL connection pool
const pool = mysql.createPool(dbConfig);

const server = http.createServer(async (req, res) => {
  try {
    // Health endpoint
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        dbStatus: await checkDbStatus()
      }));
      return;
    }

    // Users endpoint
    if (req.url === '/users' && req.method === 'GET') {
      const [rows] = await pool.query('SELECT * FROM users LIMIT 100');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rows));
      return;
    }

    // Default response
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Node App is Running');
  } catch (error) {
    console.error('Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
});

// Function to check database status
async function checkDbStatus() {
  try {
    const [result] = await pool.query('SELECT 1 as db_ok');
    return result[0].db_ok === 1 ? 'connected' : 'disconnected';
  } catch (err) {
    return 'disconnected';
  }
}

server.listen(port, hostname, () => {
  console.log(`Server is running at http://${hostname}:${port}/`);
  console.log(`Available endpoints:`);
  console.log(`- GET /health - Check server status`);
  console.log(`- GET /users - Get list of users`);
});

// Handle process termination
process.on('SIGTERM', () => {
  server.close(() => {
    pool.end();
    console.log('Server and database connections closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    pool.end();
    console.log('Server and database connections closed');
    process.exit(0);
  });
});