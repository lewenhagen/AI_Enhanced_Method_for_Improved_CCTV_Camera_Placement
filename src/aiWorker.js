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
  const isDiagonal = direction.includes("upRight") ||
                   direction.includes("upLeft") ||
                   direction.includes("downRight") ||
                   direction.includes("downLeft")

  const stepDistance = isDiagonal ? gridDensity * Math.SQRT2 : gridDensity
  while (true) {
    const next = turf.destination(candidate, stepDistance, bearing, { units: 'meters' })
    const nextCoords = next.geometry.coordinates.map(c => c.toFixed(6)).join(',')

    if (isPointInBuilding(next)) {
      candidate = next
      continue
    }

    if (!isPointInGrid(next)) {
      return { success: false, message: "Outside the grid boundary." }
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
      // console.log(distance)

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
    if ((allPreScore / totalCount) > 1) {
      console.log("allPreScore: " + allPreScore)
      console.log("totalCount: " + totalCount)
      console.log("divided: " + allPreScore / totalCount)
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
  let directions = ["up", "down", "left", "right", "upLeft", "downLeft", "upRight", "downRight"]
  if (directions.length === 0) {
    directions = ["up", "down", "left", "right", "upLeft", "downLeft", "upRight", "downRight"]
  }
  const randomIndex = Math.floor(Math.random() * directions.length)
  const poppedDirection = directions.splice(randomIndex, 1)[0]
  // console.log(directions[randomIndex])
  return directions[Math.floor(Math.random() * directions.length)]//poppedDirection
}

async function takeStepInGridCalculateScore(dir, currentPoint) {

  // let currentCam = await generate(buildings, bbox, [currentPoint], distance)
  // currentCam = currentCam[0]

  let nextPoint = await move(currentPoint, dir)

  if (!nextPoint.success) {
    return false
  }

  let currentCam = await generate(buildings, bbox, [nextPoint.point.geometry], distance)
  currentCam = currentCam[0]
  let scoreObject = {}
  scoreObject = await calculateScore(currentCam, nextPoint.point.geometry, crimeCoords, crimes)
    return {
      point: nextPoint,
      score: scoreObject
    }
  }

(async () => {
    let startPoint = (await getRandomPointFromGrid()).geometry
    let lastPoint = startPoint
    let simulationPoints = []

    let startCam = await generate(buildings, bbox, [startPoint], distance)
    startCam = startCam[0]

    let lastScore = await calculateScore(startCam, startPoint, crimeCoords, crimes)
    simulationPoints.push(lastScore)

    let dir = await getRandomDirection()

    let i = 0;
    while (i < 100) {
        dir = await getRandomDirection()
        let stepObject = await takeStepInGridCalculateScore(dir, lastPoint)

        // If correct move
        if (stepObject !== false) {

            // If score is higher
            if (stepObject.score.camInfo.score > lastScore.camInfo.score) {
                simulationPoints.push(stepObject.score)
                lastPoint = stepObject.point.point.geometry
                lastScore = stepObject.score

            } else {
                // If score is lower
                // let oldDir = dir;
                dir = await getRandomDirection()
                // while (dir !== oldDir) {
                //   dir = await getRandomDirection()
                // }
            }
            i++;
        } else {
          // If outside or in building
        }

        // i++
    }
    // console.log(simulationPoints)
    parentPort.postMessage(simulationPoints)
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
