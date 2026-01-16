import { MongoClient } from 'mongodb'
import 'dotenv/config'
import * as turf from '@turf/turf'

const uri = `mongodb://${process.env.MONGOUSER}:${process.env.MONGOPASS}@localhost:27017`
const dbName = "sweden"
const collectionName = "crimes"



async function getAllCrimesAvailable() {
  const client = new MongoClient(uri)
  const db = client.db(dbName)
  const collection = db.collection(collectionName)

  try {
      await client.connect()
      // console.log("Connected to database")

      try {
          const bigN = await collection.countDocuments()

          // console.log(`Nr of crimes in dataset (N): ${bigN}`)
          
          await client.close()
          
          return bigN
          
      } catch (err) {
          console.error("Error fetching batch:", err)
      }
  } catch (err) {
      console.error("Database connection error:", err)
  }
}

export { getAllCrimesAvailable }
