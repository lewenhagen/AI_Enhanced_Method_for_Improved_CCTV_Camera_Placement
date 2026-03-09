import { MongoClient, ObjectId } from "mongodb";

const uri = 'mongodb://root:pass@localhost:27017'; // Change if needed

const dbName = "sweden";
const sourceCollectionName = "newCrimes";
const targetCollectionName = "crimes";

async function migrateData() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const source = db.collection(sourceCollectionName);
    const target = db.collection(targetCollectionName);

    // Fetch documents from the source
    const cursor = source.find({});
    let count = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();

      // Transform the document to match your target schema
      const transformed = {
        // Convert ID fields (string -> number)
        id: parseInt(doc.ID) || null,
        crime_code: doc.BROTTSKOD,
        latitude: doc.LATITUDE,
        longitude: doc.LONGITUDE,
        street: doc.GATA || "UNKNOWN", // in case source doesn’t have street
        street_nr: doc.GATUNR || "",   // optional
        postal_district: doc.KOMMUN,
        crimedate_start: doc.BROTTSDATUMTID_START?.split(" ")[0] || null,
        crimetime_start: doc.BROTTSDATUMTID_START?.split(" ")[1] || null,
        crimedate_end: doc.BROTTSDATUMTID_SLUT?.split(" ")[0] || null,
        crimetime_end: doc.BROTTSDATUMTID_SLUT?.split(" ")[1] || null,
        location: {
          type: "Point",
          coordinates: [
            parseFloat(doc.LONGITUDE),
            parseFloat(doc.LATITUDE)
          ]
        }
      };

      // Insert into target
      await target.insertOne(transformed);

      // Optionally delete from source to "move" instead of "copy"
      // await source.deleteOne({ _id: doc._id });

      count++;
    }

    console.log(`✅ Migration complete! ${count} documents moved.`);
  } catch (err) {
    console.error("❌ Error during migration:", err);
  } finally {
    await client.close();
  }
}

migrateData();


// db.crimes.deleteMany({
//   crimedate_start: { $regex: /^2019/ }
// });
