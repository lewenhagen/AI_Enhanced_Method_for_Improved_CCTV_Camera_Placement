import { MongoClient } from 'mongodb'
import * as turf from '@turf/turf'

const uri = "mongodb://root:pass@localhost:27017"
const dbName = "sweden"
const collectionName = "crimes"


async function getCrimesInPolygon(boundingBox, buildings, year = "all") {
  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db(dbName)
    const collection = db.collection(collectionName)

    // Base geo query
    const query = {
      location: {
        $geoWithin: {
          $geometry: {
            type: "Polygon",
            coordinates: boundingBox.geometry.coordinates
          }
        }
      }
    }

    // Add year filter if requested
    if (year !== "all") {
      const y = Number(year)
      if (!Number.isInteger(y) || y < 1900 || y > 3000) {
        throw new Error(`Invalid year: ${year}`)
      }

      // string bounds (ISO YYYY-MM-DD lexicographic ordering works)
      const startISO = `${y}-01-01`
      const endISO = `${y + 1}-01-01`

      // date bounds (for fields stored as Date)
      const startDate = new Date(`${startISO}T00:00:00Z`)
      const endDate = new Date(`${endISO}T00:00:00Z`)

      // Try to match either string-stored dates OR Date objects
      query.$or = [
        { crimedate_start: { $gte: startISO, $lt: endISO } },    // for "YYYY-MM-DD" strings
        { crimedate_start: { $gte: startDate, $lt: endDate } }   // for Date objects
      ]
    }

    // Run the query
    const crimesInPolygon = await collection.find(query).toArray()
    // console.log(`Found ${crimesInPolygon.length} crimes in polygon (before building filter)`)

    // Filter out crimes inside buildings (Turf)
    const filteredCrimes = crimesInPolygon.filter(crime => {
      // ensure crime.location.coordinates exists and is valid
      if (!crime.location || !Array.isArray(crime.location.coordinates)) return false
      const crimePoint = turf.point(crime.location.coordinates)
      return !buildings.some(building =>
        turf.booleanPointInPolygon(crimePoint, building)
      )
    })

    // console.log(`Remaining after filtering: ${filteredCrimes.length}`)
    return filteredCrimes

  } catch (err) {
    console.error("Error in getCrimesInPolygon:", err)
    return []
  } finally {
    await client.close()
  }
}

// async function getCrimesInPolygon(boundingBox, buildings, year="all") {
//   const client = new MongoClient(uri)
//   const db = client.db(dbName)
//   const collection = db.collection(collectionName)

//   try {
//       await client.connect()
//       // console.log("Connected to database")

//       try {
//           const crimesInPolygon = await collection.find({
//             location: {
//               $geoWithin: {
//                 $geometry: {
//                   type: "Polygon",
//                   coordinates: boundingBox.geometry.coordinates
//                 }
//               }
//             },
//             crimedate_start: {  }
//           }).toArray()

//           console.log(crimesInPolygon)
          
//           await client.close()
          
//           return crimesInPolygon.filter(crime => {
//             const crimePoint = turf.point(crime.location.coordinates);
            
//             return !buildings.some(building => 
//               turf.booleanPointInPolygon(crimePoint, building)
//             )
//           })
          
//       } catch (err) {
//           console.error("Error fetching batch:", err)
//       }
//   } catch (err) {
//       console.error("Database connection error:", err)
//   }
// }

export { getCrimesInPolygon }
