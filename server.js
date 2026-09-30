require('dotenv').config();
const app = require('./src/app');
const pool = require('./src/config/database');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Test the MySQL connection
    const connection = await pool.getConnection();
    console.log('✅ Database connection successful');
    connection.release();

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to the database:');
    console.error(error.message);
    process.exit(1);
  }
}

startServer();
