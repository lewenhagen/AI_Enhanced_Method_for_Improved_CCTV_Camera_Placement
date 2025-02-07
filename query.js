import { MongoClient } from 'mongodb'
const uri = "mongodb://root:pass@localhost:27017"
// const db = "sweden"
// const collection = "buildings"

const mongo = new MongoClient(uri)

const client = await mongo.connect()
const db = client.db("sweden")
const collection = db.collection("buildings")

const query = {
  geometry: {
      $geoIntersects: {
          $geometry: {
              type: "LineString",
              coordinates: [
                // [longitude, latitude]
                [59.3283833853323, 18.06589075230359].reverse(), 
                [59.32552601535085, 18.075171866586828].reverse()
              ]
          }
      }
  }
};

const results = await collection.find(query).toArray();
console.log(results)

mongo.close()