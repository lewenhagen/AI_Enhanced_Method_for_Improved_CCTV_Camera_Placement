import { MongoClient } from 'mongodb'
import 'dotenv/config'
import * as turf from '@turf/turf'

const uri = `mongodb://${process.env.MONGOUSER}:${process.env.MONGOPASS}@localhost:27017`
const dbName = "sweden"
const collectionName = "places"
const crimeMode = ""

// async function getCrimesInPolygon(
//   boundingBox,
//   buildings,
//   year = "all",
//   prefix = null
// ) {
//   const client = new MongoClient(uri);

//   try {
//     await client.connect();
//     const db = client.db(dbName);
//     const collection = db.collection(collectionName);

//     const query = {
//       location: {
//         $geoWithin: {
//           $geometry: {
//             type: "Polygon",
//             coordinates: boundingBox.geometry.coordinates
//           }
//         }
//       }
//     };

//     const andConditions = [];

//     if (prefix !== null) {
//       const areas = Array.isArray(prefix)
//         ? prefix.map(a => Number(a))
//         : [Number(prefix)];

//       andConditions.push({ area: { $in: areas } });
//     }

//     if (crimeMode === "violent") {
//       andConditions.push({
//         crime_code: { $regex: "^(03|93)" }
//       });
//     }

//     if (crimeMode === "narc") {
//       andConditions.push({
//         crime_code: { $in: ["5004", "5005", "5010", "5011"] }
//       });
//     }

//     if (year !== "all") {
//       const y = Number(year);
//       if (!Number.isInteger(y) || y < 1900 || y > 3000) {
//         throw new Error(`Invalid year: ${year}`);
//       }

//       const startISO = `${y}-01-01`;
//       const endISO = `${y + 1}-01-01`;

//       const startDate = new Date(`${startISO}T00:00:00Z`);
//       const endDate = new Date(`${endISO}T00:00:00Z`);

//       andConditions.push({
//         $or: [
//           { crimedate_start: { $gte: startISO, $lt: endISO } },
//           { crimedate_start: { $gte: startDate, $lt: endDate } }
//         ]
//       });
//     }

//     // ✅ Only add $and if needed
//     if (andConditions.length > 0) {
//       query.$and = andConditions;
//     }

//     // Fetch crimes
//     const crimesInPolygon = await collection.find(query).toArray();

//         // Filter out crimes inside buildings (Turf)
//     const filteredCrimes = crimesInPolygon.filter(crime => {
//       // ensure crime.location.coordinates exists and is valid
//       if (!crime.location || !Array.isArray(crime.location.coordinates)) return false
//       const crimePoint = turf.point(crime.location.coordinates)
//       return !buildings.some(building =>
//         turf.booleanPointInPolygon(crimePoint, building)
//       )
//     })

//     // console.log(`Remaining after filtering: ${filteredCrimes.length}`)
//     return filteredCrimes

//     // return crimesInPolygon;

//   } finally {
//     await client.close();
//   }
// }

// might work


async function getCrimesInPolygon(boundingBox, buildings, year = "all", prefix = null) {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Base query: crimes inside bounding box
    const query = {
      location: {
        $geoWithin: {
          $geometry: boundingBox.geometry
        }
      }
    };

    const andConditions = [];

    // Area filter
    if (prefix !== null) {
      const areas = Array.isArray(prefix)
        ? prefix.map(a => Number(a))
        : [Number(prefix)];
      andConditions.push({ area: { $in: areas } });
    }

    // Crime type filter
    if (crimeMode === "violent") {
      andConditions.push({ crime_code: { $regex: "^(03|93)" } });
    } else if (crimeMode === "narc") {
      andConditions.push({ crime_code: { $in: ["5004", "5005", "5010", "5011"] } });
    }

    // Year filter (string-based)
    if (year !== "all") {
      const y = Number(year);
      if (!Number.isInteger(y) || y < 1900 || y > 3000) {
        throw new Error(`Invalid year: ${year}`);
      }
      const startISO = `${y}-01-01`;
      const endISO = `${y + 1}-01-01`;
      andConditions.push({ crimedate_start: { $gte: startISO, $lt: endISO } });
    }

    // Exclude buildings directly in MongoDB
    const validBuildings = (buildings || []).filter(
      b => b.geometry?.type && b.geometry.coordinates?.length > 0
    );

    if (validBuildings.length > 0) {
      const buildingExclusions = validBuildings.map(building => ({
        location: { $not: { $geoWithin: { $geometry: building.geometry } } }
      }));
      andConditions.push({ $and: buildingExclusions });
    }

    // Add $and if we have any additional conditions
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    // Fetch crimes directly outside buildings
    const filteredCrimes = await collection.find(query).toArray();

    return filteredCrimes;

  } finally {
    await client.close();
  }
}



// async function getCrimesInPolygon(boundingBox, buildings, year = "all", prefix = null) {
//   const client = new MongoClient(uri)
//   try {
//     await client.connect()
//     const db = client.db(dbName)
//     const collection = db.collection(collectionName)

//     // Base geo query
//     const query = {
//       location: {
//         $geoWithin: {
//           $geometry: {
//             type: "Polygon",
//             coordinates: boundingBox.geometry.coordinates
//           }
//         }
//       }
//     }

//     // Add area filter if prefix is provided
//     if (prefix !== null) {
//       query.area = prefix;
//     }
//     // Add year filter if requested
//     if (year !== "all") {
//       const y = Number(year)
//       if (!Number.isInteger(y) || y < 1900 || y > 3000) {
//         throw new Error(`Invalid year: ${year}`)
//       }

//       // string bounds (ISO YYYY-MM-DD lexicographic ordering works)
//       const startISO = `${y}-01-01`
//       const endISO = `${y + 1}-01-01`

//       // date bounds (for fields stored as Date)
//       const startDate = new Date(`${startISO}T00:00:00Z`)
//       const endDate = new Date(`${endISO}T00:00:00Z`)

//       // Try to match either string-stored dates OR Date objects
//       query.$or = [
//         { crimedate_start: { $gte: startISO, $lt: endISO } },    // for "YYYY-MM-DD" strings
//         { crimedate_start: { $gte: startDate, $lt: endDate } }   // for Date objects
//       ]
//     }

//     // Run the query
//     const crimesInPolygon = await collection.find(query).toArray()
//     // console.log(`Found ${crimesInPolygon.length} crimes in polygon (before building filter)`)

//     // Filter out crimes inside buildings (Turf)
//     const filteredCrimes = crimesInPolygon.filter(crime => {
//       // ensure crime.location.coordinates exists and is valid
//       if (!crime.location || !Array.isArray(crime.location.coordinates)) return false
//       const crimePoint = turf.point(crime.location.coordinates)
//       return !buildings.some(building =>
//         turf.booleanPointInPolygon(crimePoint, building)
//       )
//     })

//     // console.log(`Remaining after filtering: ${filteredCrimes.length}`)
//     return filteredCrimes

//   } catch (err) {
//     console.error("Error in getCrimesInPolygon:", err)
//     return []
//   } finally {
//     await client.close()
//   }
// }



// FUNKAR INTE

// async function getCrimesInPolygon(boundingBox, buildings, year = "all", prefix = null) {
//   const client = new MongoClient(uri);

//   try {
//     await client.connect();
//     const db = client.db(dbName);
//     const collection = db.collection(collectionName);

//     // Base geo query (location within polygon)
//     const query = {
//       location: {
//         $geoWithin: {
//           $geometry: {
//             type: "Polygon",
//             coordinates: boundingBox.geometry.coordinates
//           }
//         }
//       }
//     };

//     query.$and = query.$and || [];

//     // Add area filter if prefix is provided
//     if (prefix !== null) {
//       const areas = Array.isArray(prefix)
//         ? prefix.map(a => Number(a))   // convert to number
//         : [Number(prefix)];

//       query.area = { $in: areas };
//     }

//     // crime filter
//     if (crimeMode === "startswith") {
//       query.$and.push({
//         crime_code: { $regex: "^(03|93)" }
//       });
//     }

//     if (crimeMode === "inlist") {
//       query.$and.push({
//         crime_code: { $in: [5004, 5005, 5010, 5011] }
//       });
//     }



//     // Add year filter if requested
//     if (year !== "all") {
//       const y = Number(year);
//       if (!Number.isInteger(y) || y < 1900 || y > 3000) {
//         throw new Error(`Invalid year: ${year}`);
//       }

//       const startISO = `${y}-01-01`;
//       const endISO = `${y + 1}-01-01`;

//       const startDate = new Date(`${startISO}T00:00:00Z`);
//       const endDate = new Date(`${endISO}T00:00:00Z`);

//       const yearFilter = [
//         { crimedate_start: { $gte: startISO, $lt: endISO } },   // for string dates
//         { crimedate_start: { $gte: startDate, $lt: endDate } }  // for Date objects
//       ];

//       // Ensure the geo + area filters remain

//       query.$and.push({ $or: yearFilter });
//     }

//     // Fetch crimes
//     const crimesInPolygon = await collection.find(query).toArray();

//     // Preprocess buildings into turf polygons (if not already)
//     const buildingPolygons = buildings.map(b => turf.polygon(b.geometry.coordinates));

//     // Filter crimes outside buildings
//     const filteredCrimes = crimesInPolygon.filter(crime => {
//       if (!crime.location || !Array.isArray(crime.location.coordinates)) return false;
//       const crimePoint = turf.point(crime.location.coordinates);
//       return !buildingPolygons.some(building =>
//         turf.booleanPointInPolygon(crimePoint, building)
//       );
//     });

//     return filteredCrimes;

//   } catch (err) {
//     console.error("Error in getCrimesInPolygon:", err);
//     return [];
//   } finally {
//     await client.close();
//   }
// }




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
