import { MongoClient } from 'mongodb'
import * as turf from '@turf/turf'

const uri = "mongodb://root:pass@localhost:27017"
const dbName = "sweden"
const collectionName = "crimes"



async function getTotalArea() {
  const client = new MongoClient(uri)
  const db = client.db(dbName)
  const collection = db.collection(collectionName)

  try {
    await client.connect()
    // console.log("Connected to database")

    try {
      const docs = await collection.find({}, {
        projection: { _id: 0, location: 1 }
      }).toArray();

      // 2️⃣ Convert MongoDB documents → Turf points
      const points = turf.featureCollection(
        docs.map(doc =>
          turf.point(doc.location.coordinates) // already [lon, lat]
        )
      );

      // 3️⃣ Compute convex hull (outer boundary)
      const hull = turf.convex(points);

      if (!hull) {
        console.log("Not enough points for a hull");
        return;
      }

      // 4️⃣ Get area in square meters
      const areaSqM = turf.area(hull);

      // 5️⃣ Optional: convert to square km
      // const areaSqKm = areaSqM / 1_000_000;

      // console.log("Hull area (m²):", areaSqM);
      // console.log("Hull area (km²):", areaSqKm);

      return areaSqM;

    } catch (err) {
      console.error("Error fetching batch:", err)
    }
  } catch (err) {
    console.error("Database connection error:", err)
  }
}
console.log(await getTotalArea())
export { getTotalArea }
