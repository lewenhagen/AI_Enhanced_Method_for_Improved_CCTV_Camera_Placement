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
let ALLPOINTS = []
let BBOX = []
let BUILDINGS = []
let CRIMES = []
let CRIMECOORDS = {}
let gridDensity = -1
let distance = -1
let gridBuildings = []
let gridMap = new Map()
let gridCounter = 0
let DISTANCE_WEIGHT
let bigN



/**
 *
 * @param {number} centerLong
 * @param {number} centerLat
 * @param {Array} buildings
 * @param {number} distance
 * @param {number} gridDensity
 * @returns {FeatureCollection} The points inside capture area
 */
function createGridOvercaptureArea(centerLong, centerLat, distance, gridDensity) {
  const buildingsCollection = {
    type: "FeatureCollection",
    features: BUILDINGS.map(f => ({
      type: "Feature",
      geometry: f.geometry,
      properties: f.properties || {}
    }))
  }

  const center = [centerLong, centerLat]
  const radius = (distance/1000)
  const circle = turf.circle(center, radius, { steps: 64, units: 'kilometers' })
  const circleBbox = turf.bbox(circle)
  const grid = turf.pointGrid(circleBbox, gridDensity, { units: 'meters', mask: circle })
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
        BUILDINGS,
        gridBuildings,
        BBOX,
        distance,
        CRIMES,
        CRIMECOORDS,
        gridDensity,
        workerId,
        DISTANCE_WEIGHT,
        bigN
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



async function randomWalk(grid) {
  let data = await setupGridAndBuildings(grid, BUILDINGS, gridDensity)

  gridMap = data.gridMap
  gridBuildings = data.gridBuildings
  
  console.time("### Worker time")
  
  let results = await Promise.all(Array(Math.floor(gridMap.size / 100)).fill().map(runWorker))
  console.timeEnd("### Worker time")


  // results.sort((a, b) => {
  //   const scoreA = a[a.length - 1]?.camInfo?.score ?? 0
  //   const scoreB = b[b.length - 1]?.camInfo?.score ?? 0
  //   return scoreB - scoreA
  // })

  results.sort((a, b) => {
    const lastA = a[a.length - 1];
    const lastB = b[b.length - 1];

    const scoreA = lastA?.camInfo?.score ?? 0;
    const scoreB = lastB?.camInfo?.score ?? 0;


    if (scoreB !== scoreA) return scoreB - scoreA;

    const distanceA = lastA?.totalDistance ?? Infinity;
    const distanceB = lastB?.totalDistance ?? Infinity;

    return distanceA - distanceB;
  });

  for (const i in results) {
    let index = parseInt(i) + 1
    console.log(`Simulation ${index}: Score ${results[i][results[i].length-1].camInfo.score}, steps taken ${results[i].length}, Total distance: ${results[i][results[i].length-1].totalDistance}`)
  }

  console.log("Best score after sort: " + results[0][results[0].length-1].camInfo.score)

 ALLPOINTS = results
}



/**
 * @param {} camPoint
 * @param {*} buildings
 * @param {*} distance
 */
async function bruteForce(bigN, camPoint, distance) {

  // let current = camPoint
  // camPoint.properties.id = gridCounter
  gridCounter++
  let currentCam = await generate(BUILDINGS, BBOX, [camPoint], distance)
  currentCam = currentCam[0]
  // let camObject = await calculateScore(bigN, currentCam, camPoint, crimeCoords, crimes)
  let camObject = await scoreCalculation(bigN, DISTANCE_WEIGHT, currentCam, camPoint, CRIMES, CRIMECOORDS)
 ALLPOINTS.push( camObject )
}

async function runAi(data) {
    BUILDINGS = data.buildings
    let gridArea = createGridOvercaptureArea(parseFloat(data.start.split(",")[1]), parseFloat(data.start.split(",")[0]), data.distance, data.gridDensity)
    BBOX = data.boundingBox
    CRIMES = data.crimes
    CRIMECOORDS = Object.keys(CRIMES)
    distance = data.distance
    gridDensity = data.gridDensity
    ALLPOINTS = []
    bigN = data.bigN
    // PRESCORE_WEIGHT = data.prescoreWeight
    // CRIMECOUNT_WEIGHT = data.crimecountWeight
    DISTANCE_WEIGHT = data.distanceWeight

    if (data.useReinforcement) {
      await randomWalk(gridArea)
      
    } else {
      // let features = gridArea.features
      await Promise.all(
        gridArea.features.map(async (current) => {
          let point = current.geometry
          await bruteForce(bigN, point, data.distance)
        })
      )
    }

    return {gridArea: gridArea, allPoints: ALLPOINTS}
}

export { runAi }


// totalt brott inom CA
// vikta  antal brott / distance
// summera alla per position och dela med totalt antal brott fångade
