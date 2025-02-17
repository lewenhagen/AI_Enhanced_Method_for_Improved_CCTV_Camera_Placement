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


/**
 * Main function.
 */
async function generate(buildings, boundingBox, coordinates=[[12.981017231941225, 55.56310394585858], [12.98041105270386, 55.562797554207854], [12.98214912414551, 55.56312366405128]]) {
  let workerPromises = []
  let result = []
  circleHolder = []

  for (const coord of coordinates) {
      let point = turf.point(coord)
      let options = {units: 'kilometers', steps: circleSteps}
      let circle = turf.circle(point, distance/1000, options)
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
      circleHolder.push({"center": point, "area": circle, "buildings": intersectingFeatures})
  
  }
  
  // Loop all circles and create chunks to send to worker
  for (let i = 0; i < circleHolder.length; i += THREAD_COUNT) {
      const chunk = circleHolder.slice(i, i + THREAD_COUNT)

      workerPromises.push(createWorker(chunk, boundingBox))
  }

  // Await all workers to finish
  result = (await Promise.all(workerPromises))
  workerPromises = null
  return result
  // Write the resulting GeoJSON to file
  // await fs.writeFile('./output/result.geojson', JSON.stringify(result), 'utf8')
}

export { generate }
// await main()