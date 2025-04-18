import * as turf from '@turf/turf'
import { Worker } from 'worker_threads'
import os from 'os'

const distance = 50
const circleSteps = 60
const THREAD_COUNT = os.cpus().length
let circleHolder = []
// let boundingBox = null
/**
 * Create a worker.
 * @param {array} chunk The array to work on.
 * @returns {Promise} The resulting Promise.
 */
function createWorker(chunk, boundingBox) {
  return new Promise(function (resolve, reject) {
      const worker = new Worker(`./src/worker.js`, {
          workerData: {chunk, boundingBox}
      })
      worker.on("message", (data) => {
          worker.terminate()
          resolve(data)
      })
      worker.on("error", (msg) => {
          reject(`An error ocurred: ${msg}`)
      })
  })
}

function getRandomPointsInPolygon(n, polygon) {
  let points = [];
  const bbox = turf.bbox(polygon); // Get bounding box of polygon

  while (points.length < n) {
    const randomPoint = turf.randomPoint(1, { bbox }).features[0];
    if (turf.booleanPointInPolygon(randomPoint, polygon)) {
      points.push(randomPoint);
    }
  }

  return turf.featureCollection(points);
}



/**
 * Main function.
 */
async function generate(buildings, boundingBox, nrOfCams, distance) {
  let workerPromises = []
  let result = []
  circleHolder = []

  let coordinates = turf.featureCollection(nrOfCams)
  //INTE DENNA let coordinates = turf.randomPoint(nrOfCams, {bbox: turf.bbox(turf.polygon([boundingBox]))})
  // let coordinates = getRandomPointsInPolygon(nrOfCams, turf.polygon([boundingBox]))


  turf.featureEach(coordinates, function(currentFeature, featureIndex) {
    let options = {units: 'kilometers', steps: circleSteps}
    let circle = turf.circle(currentFeature, distance/1000, options)
    const intersectingFeatures = []
    // const polygonBbox = turf.bbox(circle)

    // Search the tree with bounding box from circles
    // tree.search({
    //     minX: polygonBbox[0],
    //     minY: polygonBbox[1],
    //     maxX: polygonBbox[2],
    //     maxY: polygonBbox[3]
    // })
    buildings.forEach(item => {
        if (turf.booleanIntersects(item, circle)) {
            intersectingFeatures.push(turf.flatten(item).features[0])
        }
    });



    // Add each circle as Object to the array
    circleHolder.push({"center": currentFeature, "area": circle, "buildings": intersectingFeatures})
  })

  // for (const coord of coordinates) {
  //     let point = turf.point(coord)
  //     let options = {units: 'kilometers', steps: circleSteps}
  //     let circle = turf.circle(point, distance/1000, options)
  //     const intersectingFeatures = []
  //     // const polygonBbox = turf.bbox(circle)

  //     // Search the tree with bounding box from circles
  //     // tree.search({
  //     //     minX: polygonBbox[0],
  //     //     minY: polygonBbox[1],
  //     //     maxX: polygonBbox[2],
  //     //     maxY: polygonBbox[3]
  //     // })
  //     buildings.forEach(item => {
  //         if (turf.booleanIntersects(item, circle)) {
  //             intersectingFeatures.push(turf.flatten(item).features[0])
  //         }
  //     });



  //     // Add each circle as Object to the array
  //     circleHolder.push({"center": point, "area": circle, "buildings": intersectingFeatures})

  // }

  // Loop all circles and create chunks to send to worker
  for (let i = 0; i < circleHolder.length; i += THREAD_COUNT) {
      const chunk = circleHolder.slice(i, i + THREAD_COUNT)

      workerPromises.push(createWorker(chunk, boundingBox))
  }

  // Await all workers to finish
  result = (await Promise.all(workerPromises))
  workerPromises = null

  let polys = result[0].filter(function(item) {
    return item.geometry.type === "Polygon"
  })

  // console.log(polys)
  // console.log("here:", turf.area(turf.union(turf.featureCollection(polys))))
  // console.log(turf.intersect(turf.featureCollection(result)))
  let pArea = null

  if (polys.length < 2) {
    pArea = turf.area(turf.featureCollection(polys))
  } else {
    pArea = turf.area(turf.union(turf.featureCollection(polys)))
  }
  return {"polygons": result, "area": pArea}
  // Write the resulting GeoJSON to file
  // await fs.writeFile('./output/result.geojson', JSON.stringify(result), 'utf8')
}

export { generate }
// await main()
