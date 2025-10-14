import * as turf from '@turf/turf'
import { Worker } from 'worker_threads'
import os from 'os'
import { fileURLToPath } from 'url'


import { generate } from './generateCoverageArea.js'
import { setupGridAndBuildings } from './reinforcement.js'
import { scoreCalculation } from './scoreCalculation.js'
// import { setupGridAndBuildings } from './aiWorker.js'

let workerId = 0
const THREAD_COUNT = os.cpus().length
let allPoints = []
let bbox = []
let buildings = []
let crimes = []
let crimeCoords = {}
let gridDensity = -1
let distance = -1
let gridBuildings = []
let gridMap = new Map()
let gridCounter = 0
let DISTANCE_WEIGHT



/**
 *
 * @param {number} centerLong
 * @param {number} centerLat
 * @param {Array} buildings
 * @param {number} distance
 * @param {number} gridDensity
 * @returns {FeatureCollection} The points inside capture area
 */
function createGridOvercaptureArea(centerLong, centerLat, buildings, distance, gridDensity) {
  const buildingsCollection = {
    type: "FeatureCollection",
    features: buildings.map(f => ({
      type: "Feature",
      geometry: f.geometry,
      properties: f.properties || {}
    }))
  }

  const center = [centerLong, centerLat]
  const radius = (distance/1000)
  const circle = turf.circle(center, radius, { steps: 64, units: 'kilometers' })
  const bbox = turf.bbox(circle)
  const grid = turf.pointGrid(bbox, gridDensity, { units: 'meters', mask: circle })
  const filteredPoints = turf.featureCollection(
    grid.features.filter(point =>
      !buildingsCollection.features.some(building =>
        turf.booleanPointInPolygon(point, building)
      )
    )
  )

  return filteredPoints

}


function runWorker() {
  workerId++
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./aiWorker.js', import.meta.url), {
      workerData: {
        gridMap,
        buildings,
        gridBuildings,
        bbox,
        distance,
        crimes,
        crimeCoords,
        gridDensity,
        workerId,
        DISTANCE_WEIGHT
      }
    })

    worker.on('message', (result) => {
      resolve(result)
    })

    worker.on('error', reject)
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker exited with code ${code}`))
      }
    })
  })
}

/**
 * This calculates score for Brute force.
 * @param {*} currentCam
 * @param {*} currentPoint
 * @returns
 */
async function calculateScore(bigN, currentCam, currentPoint) {

  return await scoreCalculation(bigN, DISTANCE_WEIGHT, currentCam, currentPoint, crimes, crimeCoords)
}

async function reinforcement(grid) {

  let data = await setupGridAndBuildings(grid, buildings, gridDensity)
  gridMap = data.gridMap
  gridBuildings = data.gridBuildings

  console.time("### Worker time")
  let results = await Promise.all(Array(THREAD_COUNT).fill().map(runWorker))
  console.timeEnd("### Worker time")



  results.sort((a, b) => {
    const scoreA = a[a.length - 1]?.camInfo?.score ?? 0
    const scoreB = b[b.length - 1]?.camInfo?.score ?? 0
    return scoreB - scoreA
  })
  for (const i in results) {
    let index = parseInt(i) + 1
    console.log(`Simulation ${index}: Score ${results[i][results[i].length-1].camInfo.score}, steps taken ${results[i].length}`)
  }
  console.log("Best score after sort: " + results[0][results[0].length-1].camInfo.score)

  allPoints = results
}



/**
 * @param {} camPoint
 * @param {*} crimes
 * @param {*} crimeCoords
 * @param {*} bbox
 * @param {*} buildings
 * @param {*} distance
 */
async function bruteForce(bigN, camPoint, crimes, crimeCoords, bbox, buildings, distance) {

  // let current = camPoint
  // camPoint.properties.id = gridCounter
  gridCounter++
  let currentCam = await generate(buildings, bbox, [camPoint], distance)
  currentCam = currentCam[0]
  // let camObject = await calculateScore(bigN, currentCam, camPoint, crimeCoords, crimes)
  let camObject = await scoreCalculation(bigN, DISTANCE_WEIGHT, currentCam, camPoint, crimes, crimeCoords)
  allPoints.push( camObject )
}

async function runAi(data) {
    buildings = data.buildings
    let gridArea = createGridOvercaptureArea(parseFloat(data.start.split(",")[1]), parseFloat(data.start.split(",")[0]), buildings, data.distance, data.gridDensity)
    bbox = data.boundingBox
    crimes = data.crimes
    crimeCoords = Object.keys(data.crimes)
    distance = data.distance
    gridDensity = data.gridDensity
    allPoints = []
    // PRESCORE_WEIGHT = data.prescoreWeight
    // CRIMECOUNT_WEIGHT = data.crimecountWeight
    DISTANCE_WEIGHT = data.distanceWeight

    if (data.useReinforcement) {
      await reinforcement(gridArea)
      // console.log("Number of steps: " + THREAD_COUNT)

    } else {
      let features = gridArea.features
      await Promise.all(
        features.map(async (current) => {
          let point = current.geometry
          await bruteForce(data.bigN, point, crimes, crimeCoords, bbox, buildings, data.distance)
        })
      )
    }

    return {gridArea: gridArea, allPoints: allPoints}
}

export { runAi }


// totalt brott inom CA
// vikta  antal brott / distance
// summera alla per position och dela med totalt antal brott fångade
