import sqlite3 from 'sqlite3';
import { MongoClient } from 'mongodb';

// SQLite3 Database
const sqliteDB = new sqlite3.Database('./db/crime_data.sqlite');

// MongoDB Connection
const mongoURI = 'mongodb://root:pass@localhost:27017'; // Change if using remote MongoDB
const mongoDBName = 'sweden'; // Change to your MongoDB database
const mongoCollection = 'crimes'; // Target collection


const migrateData = async () => {
  try {
    // Connect to MongoDB
    const client = new MongoClient(mongoURI);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(mongoDBName);
    const collection = db.collection(mongoCollection);

    // Read data from SQLite3
    sqliteDB.all('SELECT * FROM crime', async (err, rows) => {
      if (err) {
        console.error('❌ Error fetching data from SQLite:', err);
        return;
      }

      console.log(`📦 Found ${rows.length} records in SQLite`);

      // Insert into MongoDB
      if (rows.length > 0) {
        const result = await collection.insertMany(rows);
        console.log(`🚀 Inserted ${result.insertedCount} records into MongoDB`);
      } else {
        console.log('⚠️ No data found to migrate');
      }

      // Close connections
      sqliteDB.close();
      await client.close();
    });
  } catch (error) {
    console.error('❌ Migration Error:', error);
  }
};

// Run Migration
migrateData();
