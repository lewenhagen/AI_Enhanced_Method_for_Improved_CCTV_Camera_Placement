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

async function getIntersectingBuildingsPolyline(polyline, distance) {
  const client = await mongo.connect()
  const db = client.db("sweden")
  const collection = db.collection("buildings")
  let line = turf.lineString(polyline)
  let turfPoly = turf.buffer(line, distance/1000, {units: "kilometers"})

  // const turfPoly = turf.cleanCoords(turf.polygon([poly]))

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
      "line": line,
      "buildings": intersections
      // "boundingBoxArea": turf.area(turfPoly),
      // "buildingArea": turf.area(turf.featureCollection(intersections))
  }

  return returnData
}

async function getIntersectingBuildingsAI(center, distance) {
  const centerPoint = [parseFloat(center.split(",")[1]), parseFloat(center.split(",")[0])]
  const doubleDistance = parseFloat(distance)*2
  const client = await mongo.connect()
  const db = client.db("sweden")
  const collection = db.collection("buildings")
  const point = turf.point(centerPoint)
  const buffered = turf.buffer(point, doubleDistance, {units:'meters'})
  const bbox = turf.bbox(buffered)
  const polygon = turf.bboxPolygon(bbox)
  // const turfPoly = turf.cleanCoords(turf.polygon([poly]))

  const query = {
      geometry: {
          $geoIntersects: {
              $geometry: {
                  type: "Polygon",
                  coordinates: polygon.geometry.coordinates
              }
          }
      }
  }

  const result = await collection.find(query).toArray()

  // Remove coverage area outside main area
  const intersections = result.map(feature => turf.intersect(turf.featureCollection([feature, polygon])))
  // console.log(intersections.length)
  mongo.close()

  // console.log("buildings area:", turf.area(turf.featureCollection(intersections)))
  // console.log("boundingbox area:", turf.area(turfPoly))

  const returnData = {
      "boundingBox": polygon,
      "buildings": result,
      "boundingBoxArea": turf.area(polygon),
      "buildingArea": turf.area(turf.featureCollection(intersections))
  }

  return returnData
}

export { getIntersectingBuildings, getIntersectingBuildingsPolyline, getIntersectingBuildingsAI }
