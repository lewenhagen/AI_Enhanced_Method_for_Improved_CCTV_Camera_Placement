import { MongoClient } from 'mongodb'
import * as turf from '@turf/turf'

const uri = "mongodb://root:pass@localhost:27017"
const dbName = "sweden"
const collectionName = "crimes"



async function getCrimesInPolygon(boundingBox, buildings) {
  const client = new MongoClient(uri)
  const db = client.db(dbName)
  const collection = db.collection(collectionName)

  try {
      await client.connect()
      console.log("Connected to MongoDB")

      try {
          const crimesInPolygon = await collection.find({
            location: {
              $geoWithin: {
                $geometry: {
                  type: "Polygon",
                  coordinates: boundingBox.geometry.coordinates
                }
              }
            }
          }).toArray()

          console.log("Finished getting batch")
          
          await client.close()
          
          return crimesInPolygon.filter(crime => {
            const crimePoint = turf.point(crime.location.coordinates);
            
            return !buildings.some(building => 
              turf.booleanPointInPolygon(crimePoint, building)
            )
          })
          
      } catch (err) {
          console.error("Error fetching batch:", err)
      }
  } catch (err) {
      console.error("Database connection error:", err)
  }
}

export { getCrimesInPolygon }
