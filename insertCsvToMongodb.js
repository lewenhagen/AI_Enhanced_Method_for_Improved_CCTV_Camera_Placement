import fs from 'fs';
import csv from 'csv-parser';
import { MongoClient } from 'mongodb';
import 'dotenv/config'
const uri = `mongodb://${process.env.MONGOUSER}:${process.env.MONGOPASS}@localhost:27017`
// ==== CONFIG ====
const csvFilePath = './Otrygga_platser_Trelleborg_2026.csv'; // Path to your CSV file

const mongoDBName = 'sweden';
const mongoCollection = 'places';

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


// async function run() {
//   const client = new MongoClient(uri);
//   await client.connect();
//   const db = client.db(mongoDBName);
//   const collection = db.collection(mongoCollection);

//   const docs = [];

//   fs.createReadStream("./cola_zero.csv")
//     .pipe(csv({
//       separator: ";",
//       mapHeaders: ({ header }) => header.replace(/['"]/g, "").trim()
//     }))
//     .on("data", (row) => {
//       if (!row.crimedate_start) {
//         return;
//       }


//       const latitude = parseFloat(row.latitude.replace(",", "."));
//       const longitude = parseFloat(row.longitude.replace(",", "."));

//       const doc = {
//         latitude,
//         longitude,
//         crimedate_start: new Date(row.crimedate_start),

//         location: {
//           type: "Point",
//           coordinates: [longitude, latitude]
//         }
//       };

//       docs.push(doc);

//       if (docs.length >= 1000) {
//         collection.insertMany(docs);
//         docs.length = 0;
//       }

//     })
//     .on("end", async () => {

//       if (docs.length > 0) {
//         await collection.insertMany(docs);
//       }

//       console.log("Import finished");
//       await client.close();
//     });
// }

// async function run() {
//   const client = new MongoClient(uri);
//   await client.connect();

//   const db = client.db(mongoDBName);
//   const collection = db.collection(mongoCollection);

//   const docs = [];

//   fs.createReadStream("./Otrygga_platser_Trelleborg_2026.csv")
//     .pipe(csv()) // default separator = ","
//     .on("data", (row) => {

//       // Parse values
//       const latitude = parseFloat(row.latitude);
//       const longitude = parseFloat(row.longitude);
//       const crime_code = row.crime_code.replace(/[\r\n]+/g, "").trim();
//       const year = Number(row.year);

//       // Basic validation
//       if (
//         isNaN(latitude) ||
//         isNaN(longitude) ||
//         !crime_code ||
//         isNaN(year)
//       ) {
//         return;
//       }

//       const doc = {
//         crime_code: crime_code,
//         year: year,

//         latitude,
//         longitude,

//         // optional: create a date (Jan 1 of that year)
//         crimedate_start: new Date(`${year}-01-01T00:00:00Z`),

//         location: {
//           type: "Point",
//           coordinates: [longitude, latitude]
//         }
//       };

//       docs.push(doc);

//       // Batch insert
//       if (docs.length >= 1000) {
//         collection.insertMany(docs);
//         docs.length = 0;
//       }
//     })
//     .on("end", async () => {

//       if (docs.length > 0) {
//         await collection.insertMany(docs);
//       }

//       console.log("Import finished");
//       await client.close();
//     });
// }

async function run() {
  const client = new MongoClient(uri);
  await client.connect();

  const db = client.db(mongoDBName);
  const collection = db.collection(mongoCollection);

  const docs = [];

  fs.createReadStream("./Otrygga_platser_Trelleborg_2026.csv")
    .pipe(csv())
    .on("data", (row) => {

      // Clean values as strings
      const crime_code = row.crime_code
        ?.replace(/[\r\n]+/g, "")
        .trim();

      const year = row.year?.toString().trim();

      const latitudeStr = row.latitude?.toString().trim();
      const longitudeStr = row.longitude?.toString().trim();

      // Parse ONLY for geo
      const latitude = parseFloat(latitudeStr);
      const longitude = parseFloat(longitudeStr);

      // Validation
      if (
        !crime_code ||
        !year ||
        isNaN(latitude) ||
        isNaN(longitude)
      ) {
        return;
      }

      const doc = {
        // ✅ store as strings
        crime_code: crime_code,
        year: year,
        latitude: latitudeStr,
        longitude: longitudeStr,

        // optional date (can also be string if you want)
        crimedate_start: `${year}-01-01`,

        // ❗ MUST stay numeric for geo queries
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
