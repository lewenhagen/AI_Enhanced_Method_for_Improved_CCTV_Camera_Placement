// import fs from "fs";
// import path from "path";
// import csv from "csv-parser";
// import { MongoClient } from "mongodb";
// import { fileURLToPath } from "url";
// import 'dotenv/config'
// const uri = `mongodb://${process.env.MONGOUSER}:${process.env.MONGOPASS}@localhost:27017`


// const DB_NAME = "sweden";
// const COLLECTION = "crimes";

// const CSV_FOLDER = "./new_data"; 

// async function importCSVs() {
//   const client = new MongoClient(uri);

//   try {
//     await client.connect();
//     console.log("Connected to MongoDB");

//     const db = client.db(DB_NAME);
//     const collection = db.collection(COLLECTION);

//     const files = fs.readdirSync(CSV_FOLDER).filter(f => f.endsWith(".csv"));

//     for (const file of files) {
//       console.log(`Importing ${file}`);

//       const rows = [];

//       await new Promise((resolve, reject) => {
//         fs.createReadStream(path.join(CSV_FOLDER, file))
//           .pipe(csv())
//           .on("data", (data) => {
//             rows.push({
//               crime_code: Number(data.crime_code),
//               year: new Date(data.year),
//               latitude: Number(data.latitude),
//               longitude: Number(data.longitude),
//               area: Number(data.area),
//             });
//           })
//           .on("end", resolve)
//           .on("error", reject);
//       });

//       if (rows.length > 0) {
//         await collection.insertMany(rows);
//         console.log(`Inserted ${rows.length} records`);
//       }
//     }

//     console.log("All CSV files imported");
//   } catch (err) {
//     console.error(err);
//   } finally {
//     await client.close();
//   }
// }

// importCSVs();

import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { MongoClient } from "mongodb";
import 'dotenv/config';

const uri = `mongodb://${process.env.MONGOUSER}:${process.env.MONGOPASS}@localhost:27017`;

const DB_NAME = "sweden";
const COLLECTION = "crimes";

const CSV_FOLDER = "./new_data";

async function importCSVs() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    const files = fs.readdirSync(CSV_FOLDER).filter(f => f.endsWith(".csv"));

    for (const file of files) {
      console.log(`Importing ${file}`);

      const rows = [];

      await new Promise((resolve, reject) => {
        fs.createReadStream(path.join(CSV_FOLDER, file))
          .pipe(csv())
          .on("data", (data) => {
            // Map CSV columns to new MongoDB structure
            rows.push({
              id: null, // optional, can set auto-increment if needed
              crime_code: String(data.crime_code),
              latitude: String(data.latitude),
              longitude: String(data.longitude),
              street: null,           // CSV doesn’t have street info
              street_nr: null,
              postal_district: null,
              crimedate_start: data.year,  // map CSV year to crimedate_start
              crimetime_start: null,
              crimedate_end: data.year,
              crimetime_end: null,
              area: Number(data.area),
              location: {
                type: "Point",
                coordinates: [Number(data.longitude), Number(data.latitude)]
              }
            });
          })
          .on("end", resolve)
          .on("error", reject);
      });

      if (rows.length > 0) {
        await collection.insertMany(rows);
        console.log(`Inserted ${rows.length} records from ${file}`);
      }
    }

    console.log("All CSV files imported");
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

importCSVs();