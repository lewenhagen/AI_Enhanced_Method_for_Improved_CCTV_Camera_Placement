import { MongoClient } from 'mongodb'

const uri = "mongodb://root:pass@localhost:27017"
const dbName = "sweden"
const collectionName = "buildings"
const filePath = "./geojson/sweden_buildings.geojson"

import StreamJson from 'stream-json' // Import the default export
import StreamChain from 'stream-chain' // Import for chaining streams
import Filters from 'stream-json/filters/Pick.js'
import Streamers from 'stream-json/streamers/StreamArray.js'

const { chain } = StreamChain
const { parser } = StreamJson
const { pick } = Filters
const { streamArray } = Streamers



async function insertGeoJSON() {
  const client = new MongoClient(uri)
  const db = client.db(dbName)
  const collection = db.collection(collectionName)

  await db.collection('buildings').deleteMany({})

  try {
      // Await the client connection and ensure it completes before continuing
      await client.connect()
      console.log("Connected to MongoDB")

      

      // Create a streaming pipeline to process the GeoJSON file
      const pipeline = chain([
          fs.createReadStream(filePath), // Stream the GeoJSON file
          parser(),                   // Parse JSON
          pick({ filter: 'features' }), // Extract the 'features' array
          streamArray(),              // Stream array elements one at a time
      ])

      const buffer = []
      const BATCH_SIZE = 1000

      // Process each feature
      pipeline.on('data', async (data) => {
          buffer.push(data.value)

          if (buffer.length === BATCH_SIZE) {
              pipeline.pause() // Pause the pipeline while inserting
              try {
                  // console.log(`Inserting ${buffer.length} documents...`)
                  // Insert the batch of documents into MongoDB
                  await collection.insertMany(buffer)
                  console.log(`Inserted ${buffer.length} documents`)
                  buffer.length = 0 // Clear the buffer
              } catch (err) {
                  console.error("Error inserting batch:", err)
              }
              pipeline.resume() // Resume the pipeline
          }
      })

      pipeline.on('end', async () => {
          if (buffer.length > 0) {
              try {
                  // Insert remaining documents after the pipeline ends
                  await collection.insertMany(buffer)
                  console.log(`Inserted remaining ${buffer.length} documents`)
              } catch (err) {
                  console.error("Error inserting remaining documents:", err)
              }
          }
          console.log("Finished inserting GeoJSON data")
          await client.close()
      })

      pipeline.on('error', (err) => {
          console.error("Error processing GeoJSON file:", err)
      })
  } catch (err) {
      console.error("Database connection error:", err)
  } 
}

insertGeoJSON()