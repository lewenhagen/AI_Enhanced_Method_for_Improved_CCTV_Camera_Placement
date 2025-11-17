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
let DISTANCE_WEIGHT
let BIGN
let MAXSTEPS

function runWorker() {
  workerId++
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./aiWorker.js', import.meta.url), {
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
        DISTANCE_WEIGHT,
        BIGN,
        MAXSTEPS,
        SILENT
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



async function randomWalk(grid, startingPos) {
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
  workerId = 0
  !SILENT && console.timeEnd("### Worker time")

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
    !SILENT && console.log(`Simulation ${index}: Score ${results[i][results[i].length-1].camInfo.score}, steps taken ${results[i].length}, Total distance: ${results[i][results[i].length-1].totalDistance}`)
  }

  !SILENT && console.log(`Best score: ${results[0][results[0].length-1].camInfo.score}, steps taken: ${results[0].length}`)

  ALLPOINTS = results
}

async function initRandomWalk(center, distance, gridDensity, distanceWeight, bigN, maxSteps, startingPos, year) {
    // console.log(center, distance, gridDensity, distanceWeight, bigN, maxSteps, startingPos)
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

    if (bigN == 1) {
      BIGN = await getAllCrimesAvailable()
    } else {
      BIGN = data.crimes.length
    }

    data.crimes = await fixCrimes(data.crimes)
    BUILDINGS = data.buildings
    BBOX = data.boundingBox
    CRIMES = data.crimes
    CRIMECOORDS = Object.keys(CRIMES)
    ALLPOINTS = []
    MAXSTEPS = maxSteps
    DISTANCE = distance
    DISTANCE_WEIGHT = distanceWeight
    GRIDDENSITY = gridDensity


    await randomWalk(gridArea, startingPos)



    return {gridArea: gridArea, allPoints: ALLPOINTS, buildings: data.buildings, boundingBox: data.boundingBox, crimes: data.crimes}
}

if (import.meta.url === `file://${process.argv[1]}`) {
  SILENT=true

  let startLoc = process.argv[2]
  let dist = process.argv[3]
  let distWeight = process.argv[4]
  let year = process.argv[5]

  let json = []
  // for (let i = 0; i < 10; i++) {
    const start = performance.now()
    // console.time("Random walk exec time")
    // center, distance, gridSize, dist_weight, bigN (0 or 1), maxSteps, startingPositions (-1 for 1%), year
    let data = await initRandomWalk(startLoc, dist, 5, distWeight, 1, 20, 10, year)
    // console.timeEnd("Random walk exec time")
    const end = performance.now()
    const elapsed = end - start
    // console.log(`Random walk exec time: ${Math.round((elapsed/1000)*1000)/1000}, best score: ${data.allPoints[0][data.allPoints[0].length-1].camInfo.score}, steps: ${data.allPoints[0].length}`)
    // json.push({
    //   "nr": 1,
    //   "score": data.allPoints[0][data.allPoints[0].length-1].camInfo.score,
    //   "distance": data.allPoints[0][data.allPoints[0].length-1].camInfo.totalDistance,
    //   "steps": data.allPoints[0].length,
    //   "time": Math.round((elapsed/1000)*1000)/1000
    // })
    console.log(JSON.stringify(
      {
        "num_startpoints": 10,
        "exec_time": Math.round((elapsed/1000)*1000)/1000,
        "best_score": data.allPoints[0][data.allPoints[0].length-1].camInfo.score
      }
    ))


  // }
  // await fs.writeFile('randomwalk.json', JSON.stringify(json, null, 2), 'utf8')
}

export { initRandomWalk }
