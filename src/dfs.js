import { Worker } from 'worker_threads'
import { createGridOvercaptureArea } from './helpers.js'
import { getIntersectingBuildingsAI } from './intersectingBuildings.js'
import { getCrimesInPolygon } from './getCrimesInPolygon.js'
import { getAllCrimesAvailable } from './getAllCrimesAvailable.js'
import { setupGridAndBuildings } from './reinforcement.js'
import { fixCrimes } from './helpers.js'
import { promises as fs } from 'fs'

let SILENT=false

let workerId = 0
let ALLPOINTS = []
let BBOX = []
let BUILDINGS = []
let CRIMES = []
let CRIMECOORDS = {}
let GRIDDENSITY = -1
let DISTANCE = -1
let gridBuildings = []
let gridMap = new Map()
let gridCounter = 0
let ACTIVATION_FUNCTION
let MAXSTEPS
let numberOfCrimesInRadius

function runWorker() {
  workerId++
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./dfsWorker.js', import.meta.url), {
      workerData: {
        gridMap,
        BUILDINGS,
        gridBuildings,
        BBOX,
        DISTANCE,
        CRIMES,
        CRIMECOORDS,
        GRIDDENSITY,
        workerId,
        ACTIVATION_FUNCTION,
        MAXSTEPS,
        SILENT,
        numberOfCrimesInRadius
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

function calculateAverage(results) {
  const totalStepTime = results.reduce((sum, s) => sum + (s[s.length-1].time || 0), 0);
  const average = totalStepTime / (results.length - 1)
  return average
}

function processSimulations(results) {
  results.sort((A, B) => {
    const lastA = A[A.length - 2];   // second last = final step
    const lastB = B[B.length - 2];

    const scoreA = lastA?.camInfo?.score ?? 0;
    const scoreB = lastB?.camInfo?.score ?? 0;

    // Highest score first
    if (scoreA !== scoreB) return scoreB - scoreA;

    const distA = lastA?.totalDistance ?? Infinity;
    const distB = lastB?.totalDistance ?? Infinity;

    // Lowest distance second
    return distA - distB;
  });

  return results;
}


async function dfs(grid, startingPos, numberOfCrimesInRadius) {
  let data = await setupGridAndBuildings(grid, BUILDINGS, GRIDDENSITY)

  gridMap = data.gridMap
  gridBuildings = data.gridBuildings

  let startingPositions

  if (startingPos !== "" && startingPos !== -1) {
    startingPositions = parseInt(startingPos)
  } else {
    startingPositions = parseInt(Math.round(gridMap.size / 100))
  }

  !SILENT && console.time("### Worker time")

  let results = await Promise.all(Array(startingPositions).fill().map(runWorker))
  //console.log(results)
  workerId = 0
  !SILENT && console.timeEnd("### Worker time")

  let sortedSimulations = []

  sortedSimulations = processSimulations(results)

  //console.log(sortedSimulations[0])

  if (!SILENT) {
    // console.log(results)
    for (const i in results) {
      let index = parseInt(i) + 1
      console.log(`Simulation ${index}: Score ${results[i][results[i].length-2].camInfo.score}, steps taken ${results[i].length-1}, Total distance: ${results[i][results[i].length-2].totalDistance}, Simulation time: ${results[i][results[i].length-1].time}`)
    }
  }


  !SILENT && console.log(`Best score: ${results[0][results[0].length-2].camInfo.score}, steps taken: ${results[0].length-1}, Time: ${results[0][results[0].length-1].time}`)

  ALLPOINTS = results
}

async function initDFS(center, distance, gridDensity, activationFunction, maxSteps, startingPos, year) {
    // console.log(center, distance, gridDensity, distanceWeight, maxSteps, startingPos)
    ALLPOINTS = []
    let data = {}

    !SILENT && console.time("### Get all intersecting buildings")
    data = await getIntersectingBuildingsAI(center, distance)
    !SILENT && console.timeEnd("### Get all intersecting buildings")

    !SILENT && console.time("### Get all crimes in r*2 bounding box")
    data.crimes = await getCrimesInPolygon(data.boundingBox, data.buildings, year)
    !SILENT && console.timeEnd("### Get all crimes in r*2 bounding box")

    !SILENT && console.time("### Create grid over capture area")
    let gridArea = await createGridOvercaptureArea(parseFloat(center.split(",")[1]), parseFloat(center.split(",")[0]), distance, gridDensity, data.buildings)
    !SILENT && console.timeEnd("### Create grid over capture area")

    // if (bigN == 1) {
    //   BIGN = await getAllCrimesAvailable()
    // } else {
    //   BIGN = data.crimes.length
    // }
    numberOfCrimesInRadius = data.crimes.length

    data.crimes = await fixCrimes(data.crimes)
    BUILDINGS = data.buildings
    BBOX = data.boundingBox
    CRIMES = data.crimes
    CRIMECOORDS = Object.keys(CRIMES)
    ALLPOINTS = []
    MAXSTEPS = maxSteps
    DISTANCE = distance
    ACTIVATION_FUNCTION = activationFunction
    GRIDDENSITY = gridDensity


    await dfs(gridArea, startingPos, numberOfCrimesInRadius)

    !SILENT && ALLPOINTS.forEach(arr => arr.pop());

    return {gridArea: gridArea, allPoints: ALLPOINTS, buildings: data.buildings, boundingBox: data.boundingBox, crimes: data.crimes}
}

if (import.meta.url === `file://${process.argv[1]}`) {
  SILENT=true

  let startLoc = process.argv[2]
  let dist = process.argv[3]
  let activationFunction = process.argv[4]
  let year = process.argv[5]

  let json = []

  const start = performance.now()

  let data = await initDFS(startLoc, dist, 5, activationFunction, 20, 10, year)

  let average = calculateAverage(data.allPoints)
  const end = performance.now()
  const elapsed = end - start

  const totalCount = Object.values(data.crimes)
    .reduce((sum, item) => sum + item.count, 0);

  const best = data.allPoints[0][data.allPoints[0].length-2]

  console.log(JSON.stringify(
    {
      "num_startpoints": 10,
      "exec_time": Number((elapsed/1000).toFixed(5)),
      "best_score": best.camInfo.score,
      "ind_time": data.allPoints[0][data.allPoints[0].length-1].time,
      "avg_time": Number((average).toFixed(5)),
      "steps": data.allPoints[0].length-1,
      "total_crimes": totalCount,
      "seen_crimes": best.totalCount,
      "unique_crime_coords": best.totalCrimeCount,
      "pai": best.pai,
      "area": best.camInfo.area,
      "total_distance": best.totalDistance,
      "activation_function": activationFunction
    }
  ))
}

export { initDFS }
