import { MongoClient } from 'mongodb'
import * as turf from '@turf/turf'

const uri = "mongodb://root:pass@localhost:27017"
const mongo = new MongoClient(uri)

async function getIntersectingBuildings(poly) {
    const client = await mongo.connect()
    const db = client.db("sweden")
    const collection = db.collection("buildings")
    const turfPoly = turf.cleanCoords(turf.polygon([poly]))

    const query = {
        geometry: {
            $geoIntersects: {
                $geometry: {
                    type: "Polygon",
                    coordinates: turfPoly.geometry.coordinates
                }
            }
        }
    }

    const result = await collection.find(query).toArray()

    // Remove coverage area outside main area
    const intersections = result.map(feature => turf.intersect(turf.featureCollection([feature, turfPoly])))
    // console.log(intersections.length)
    mongo.close()

    // console.log("buildings area:", turf.area(turf.featureCollection(intersections)))
    // console.log("boundingbox area:", turf.area(turfPoly))

    const returnData = {
        "boundingBox": turfPoly,
        "buildings": intersections,
        "boundingBoxArea": turf.area(turfPoly),
        "buildingArea": turf.area(turf.featureCollection(intersections))
    }

    return returnData
}

export { getIntersectingBuildings }
