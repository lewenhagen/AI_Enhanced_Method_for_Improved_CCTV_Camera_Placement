import * as turf from '@turf/turf'
import { Worker } from 'worker_threads'
import os from 'os'
import { fileURLToPath } from 'url'


import { generate } from './generateCoverageArea.js'
import { setupGridAndBuildings } from './reinforcement.js'
// import { setupGridAndBuildings } from './aiWorker.js'

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
// const bearings = [0, , 45, 90, 135, 180, 225, 270]



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

  return filteredPoints //turf.pointsWithinPolygon(grid, circle)

}
/**
 * Required for generate: buildings, boundingBox, pointsOnBoundary, distance
 */

// let currentBest = {
//   totalCount: null,
//   totalDistance: null,
//   totalCrimeCount: null,
//   score: 0
// }
// async function getRandomDirection() {
//   let directions = ["up", "down", "left", "right"]
//   if (directions.length === 0) {
//     directions = ["up", "down", "left", "right"]
//   }
//   const randomIndex = Math.floor(Math.random() * directions.length)
//   const poppedDirection = directions.splice(randomIndex, 1)[0]

//   return poppedDirection
// }

// async function takeStepInGridCalculateScore(dir, currentPoint) {
//   let currentCam = await generate(buildings, bbox, [currentPoint], distance)
//   currentCam = currentCam[0]
//   let nextPoint = await move(currentPoint, dir)
//   if (!nextPoint.success) {
//     return false
//   }
//   // let camCoverage = await generate(buildings, bbox, [nextPoint.point.geometry], distance)
//   // camCoverage = camCoverage[0]

//   let scoreObject = await calculateScore(currentCam, nextPoint.point.geometry, crimeCoords, crimes)

//   return {point: nextPoint, score: scoreObject}
// }

function runWorker() {
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
        gridDensity
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

async function calculateScore(currentCam, currentPoint) {
  let totalCount = 0
  let totalDistance = 0
  let crimeCount = 0
  currentCam.connectedCrimes = []
  currentCam.score = 0
  for (const coord of crimeCoords) {
    let crimeAsPoint = turf.point([parseFloat(coord.split(",")[0]), parseFloat(coord.split(",")[1])])

    if (turf.booleanPointInPolygon(crimeAsPoint, currentCam.polygon)) {
      let distance = turf.distance(currentPoint, crimeAsPoint) * 1000
      distance = distance < 1 ? 1 : distance
      currentCam.connectedCrimes.push({
        crimeInfo: crimes[coord],
        distance: distance,
        uniqueCount: crimes[coord].count,
        prescore: crimes[coord].count / distance
      })

      crimeCount++
      totalCount += crimes[coord].count
      totalDistance += distance
    }
    
    let allPreScore = 0
    for (const crime of currentCam.connectedCrimes) {
      allPreScore += crime.prescore
    }

    currentCam.score = parseFloat((allPreScore / totalCount).toFixed(4))

  }

  return {
    "camInfo": currentCam,
    "totalCrimeCount": crimeCount,
    "totalCount": totalCount,
    "totalDistance": totalDistance
  }
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
async function bruteForce(camPoint, crimes, crimeCoords, bbox, buildings, distance) {
  let current = camPoint
  let currentCam = await generate(buildings, bbox, [current], distance)
  currentCam = currentCam[0]
  let camObject = await calculateScore(currentCam, camPoint, crimeCoords, crimes)
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

    if (data.useReinforcement) {
      await reinforcement(gridArea)
      // console.log("Number of steps: " + THREAD_COUNT)

    } else {
      let features = gridArea.features
      await Promise.all(
        features.map(async (current) => {
          let point = current.geometry
          await bruteForce(point, crimes, crimeCoords, bbox, buildings, data.distance)
        })
      )
    }
  
    return {gridArea: gridArea, allPoints: allPoints}
}

export { runAi }


// totalt brott inom CA
// vikta  antal brott / distance
// summera alla per position och dela med totalt antal brott fångade
