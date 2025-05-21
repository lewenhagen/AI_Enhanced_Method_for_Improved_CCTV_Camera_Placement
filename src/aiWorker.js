// worker.js
import { workerData, parentPort } from "worker_threads"
import * as turf from '@turf/turf'

// import { getRandomPointFromGrid } from "./reinforcement.js"
import { generate } from "./generateCoverageArea.js"
// import { getRandomDirection, calculateScore } from "./aiWorkerFunctions.js";

const {
    gridMap,
    buildings,
    gridBuildings,
    bbox,
    distance,
    crimes,
    crimeCoords,
    gridDensity
} = workerData

let stepSizeMeters = -1
// let gridMap = new Map()
// let gridBuildings = {
//   type: "FeatureCollection",
//   features: []
// }

const directionBearings = {
  up: 0,
  upRight: 45,
  right: 90,
  downRight: 135,
  down: 180,
  downLeft: 225,
  left: 270,
  upLeft: 315
}

async function getRandomPointFromGrid() {
  const values = Array.from(gridMap.values())
  const randomIndex = Math.floor(Math.random() * values.length)
  return values[randomIndex]
}


function isPointInGrid(point) {
  const pointCoords = point.geometry.coordinates.map(c => c.toFixed(6)).join(',')
  return gridMap.has(pointCoords)
}

function isPointInBuilding(point) {
  return gridBuildings.features.some(building =>
    turf.booleanPointInPolygon(point, building)
  )
}


async function move(currentPoint, direction) {
  const bearing = directionBearings[direction]
  let candidate = currentPoint

  while (true) {
    const next = turf.destination(candidate, gridDensity, bearing, { units: 'meters' })
    const nextCoords = next.geometry.coordinates.map(c => c.toFixed(6)).join(',')

    if (isPointInBuilding(next)) {
      // console.log("In building, stepping over to the next point...")

      candidate = next
      continue
    }

    if (!isPointInGrid(next)) {
      return { success: false, message: "Outside the grid boundary or hit a building." }
    }

    // In grid
    if (gridMap.has(nextCoords)) {
      const currentPoint = gridMap.get(nextCoords)
      return {
        success: true,
        point: currentPoint,
        coords: currentPoint.geometry.coordinates,
        message: "Move ok"
      }
    }
  }
}


// async function setupBuildings(buildings) {
//   gridBuildings.features = buildings.map(function(building) {
//     return {
//       type: "Feature",
//       properties: {},
//       geometry: building.geometry
//     }
//   })
// }
// async function setupGridAndBuildings(grid, buildings, gridDensity) {
//   gridMap = new Map()
//   stepSizeMeters = gridDensity
//   await setupBuildings(buildings)

//   for (const point of grid.features) {
//     const key = point.geometry.coordinates.map(c => c.toFixed(6)).join(',')
//     gridMap.set(key, point)
//   }
//   // console.log(gridMap)
// }

async function calculateScore(currentCam, currentPoint, crimeCoords, crimes) {
  let totalCount = 0
  let totalDistance = 0
  let crimeCount = 0
  currentCam.connectedCrimes = []
  currentCam.score = 0
  for (const coord of crimeCoords) {
    let crimeAsPoint = turf.point([parseFloat(coord.split(",")[0]), parseFloat(coord.split(",")[1])])

    if (turf.booleanPointInPolygon(crimeAsPoint, currentCam.polygon)) {
      let distance = turf.distance(currentPoint, crimeAsPoint) * 1000

      currentCam.connectedCrimes.push({
        crimeInfo: crimes[coord],
        distance: distance,
        uniqueCount: crimes[coord].count,
        prescore: crimes[coord].count / distance
      })

      crimeCount++
      totalCount += crimes[coord].count // denna sist
      totalDistance += distance
    }
    // calculate score here!!
    // currentCam.score = 0
    let allPreScore = 0
    for (const crime of currentCam.connectedCrimes) {
      allPreScore += crime.prescore
    }

    currentCam.score = parseFloat((allPreScore / totalCount).toFixed(4)) || 0

  }

  return {
    "camInfo": currentCam,
    "totalCrimeCount": crimeCount,
    "totalCount": totalCount,
    "totalDistance": totalDistance
  }
}

async function getRandomDirection() {
  let directions = ["up", "down", "left", "right"]
  if (directions.length === 0) {
    directions = ["up", "down", "left", "right"]
  }
  const randomIndex = Math.floor(Math.random() * directions.length)
  const poppedDirection = directions.splice(randomIndex, 1)[0]

  return poppedDirection
}

async function takeStepInGridCalculateScore(dir, currentPoint) {

  let currentCam = await generate(buildings, bbox, [currentPoint], distance)
  currentCam = currentCam[0]
//   console.log(currentCam)
  let nextPoint = await move(currentPoint, dir)
  // console.log(nextPoint.success)
  if (!nextPoint.success) {
    return false
  }
  // let camCoverage = await generate(buildings, bbox, [nextPoint.point.geometry], distance)
  // camCoverage = camCoverage[0]

  let scoreObject = await calculateScore(currentCam, nextPoint.point.geometry, crimeCoords, crimes)

  return {point: nextPoint, score: scoreObject}
}

(async () => {
    let startPoint = (await getRandomPointFromGrid()).geometry;
    let lastPoint = startPoint;
    let allPoints = [];

    let startCam = await generate(buildings, bbox, [startPoint], distance);
    startCam = startCam[0];

    let lastScore = await calculateScore(startCam, startPoint, crimeCoords, crimes);
    allPoints.push(lastScore);

    let dir = await getRandomDirection();

    let i = 0;
    while (i < 100) {

        let stepObject = await takeStepInGridCalculateScore(dir, lastPoint);

        if (stepObject !== false) {
            if (stepObject.score.camInfo.score > lastScore.camInfo.score) {
                allPoints.push(stepObject.score);
                lastPoint = stepObject.point.point.geometry;
                lastScore = stepObject.score;
                // console.log("stepping")

            } else {
                dir = await getRandomDirection();
                // console.log("changing direction")
            }
        }

        i++;
    }
    // console.log(allPoints)
    parentPort.postMessage(allPoints)
})()
// parentPort.on('message', async ({ buildings, bbox, distance, crimes, crimeCoords }) => {
//   console.log(await getRandomPointFromGrid())
//   let startPoint = (await getRandomPointFromGrid()).geometry;
//   let lastPoint = startPoint;
//   let allPoints = [];

//   let startCam = await generate(buildings, bbox, [startPoint], distance);
//   startCam = startCam[0];

//   let lastScore = await calculateScore(startCam, startPoint, crimeCoords, crimes);
//   allPoints.push(lastScore);

//   let dir = await getRandomDirection();

//   let i = 0;
//   while (i < 100) {
//     let stepObject = await takeStepInGridCalculateScore(dir, lastPoint, buildings, bbox, distance);

//     if (stepObject !== false) {
//       if (stepObject.score.camInfo.score > lastScore.camInfo.score) {
//         allPoints.push(stepObject.score);
//         lastPoint = stepObject.point.point.geometry;
//         lastScore = stepObject.score;
//       } else {
//         dir = await getRandomDirection();
//       }
//     }

//     i++;
//   }

  // Send result back to main thread
//   parentPort.postMessage(allPoints);
// });
