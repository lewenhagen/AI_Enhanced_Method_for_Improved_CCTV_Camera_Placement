import fs from 'fs';
import csv from 'csv-parser';
import { MongoClient } from 'mongodb';
import 'dotenv/config'
const uri = `mongodb://${process.env.MONGOUSER}:${process.env.MONGOPASS}@localhost:27017`
// ==== CONFIG ====
const csvFilePath = './crimedata2019-2023.csv'; // Path to your CSV file

const mongoDBName = 'sweden';
const mongoCollection = 'crimes';

// ==== MIGRATION FUNCTION ====
const migrateData = async () => {
  const client = new MongoClient(uri);

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


async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(mongoDBName);
  const collection = db.collection(mongoCollection);

  const docs = [];

  fs.createReadStream("./cola_zero.csv")
    .pipe(csv({
      separator: ";",
      mapHeaders: ({ header }) => header.replace(/['"]/g, "").trim()
    }))
    .on("data", (row) => {
      if (!row.crimedate_start) {
        return;
      }


      const latitude = parseFloat(row.latitude.replace(",", "."));
      const longitude = parseFloat(row.longitude.replace(",", "."));

      const doc = {
        latitude,
        longitude,
        crimedate_start: new Date(row.crimedate_start),

        location: {
          type: "Point",
          coordinates: [longitude, latitude]
        }
      };

      docs.push(doc);

      if (docs.length >= 1000) {
        collection.insertMany(docs);
        docs.length = 0;
      }

    })
    .on("end", async () => {

      if (docs.length > 0) {
        await collection.insertMany(docs);
      }

      console.log("Import finished");
      await client.close();
    });
}


// ==== RUN SCRIPT ====
//migrateData();
run()
