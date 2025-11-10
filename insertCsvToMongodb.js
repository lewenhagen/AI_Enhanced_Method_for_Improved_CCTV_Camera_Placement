import fs from 'fs';
import csv from 'csv-parser';
import { MongoClient } from 'mongodb';

// ==== CONFIG ====
const csvFilePath = './crimedata2019-2023.csv'; // Path to your CSV file
const mongoURI = 'mongodb://root:pass@localhost:27017'; // Change if needed
const mongoDBName = 'sweden';
const mongoCollection = 'newCrimes';

// ==== MIGRATION FUNCTION ====
const migrateData = async () => {
  const client = new MongoClient(mongoURI);

  try {
    // 1️⃣ Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(mongoDBName);
    const collection = db.collection(mongoCollection);

    // 2️⃣ Read CSV data
    const records = [];
    console.log('📖 Reading CSV file...');

    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => records.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`📦 Loaded ${records.length} records from CSV`);

    // 3️⃣ Insert into MongoDB
    if (records.length > 0) {
      const result = await collection.insertMany(records);
      console.log(`🚀 Inserted ${result.insertedCount} records into MongoDB collection "${mongoCollection}"`);
    } else {
      console.log('⚠️ No data found in CSV');
    }
  } catch (err) {
    console.error('❌ Migration Error:', err);
  } finally {
    // 4️⃣ Close MongoDB connection
    await client.close();
    console.log('🔒 MongoDB connection closed');
  }
};

// ==== RUN SCRIPT ====
migrateData();
