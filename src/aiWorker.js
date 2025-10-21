// worker.js
import { workerData, parentPort } from "worker_threads"
import * as turf from '@turf/turf'

// import { getRandomPointFromGrid } from "./reinforcement.js"
import { generate } from "./generateCoverageArea.js"
import { scoreCalculation } from "./scoreCalculation.js"
// import { getRandomDirection, calculateScore } from "./aiWorkerFunctions.js";

let startPositions = []



// startPositions.sort()

const {
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

for (let i = 0; i < 100; i++) {
  let point = (await getRandomPointFromGrid()).geometry
  let temp = await generate(BUILDINGS, BBOX, [point], distance)
  temp = temp[0]

  let scoreObject = await scoreCalculation(bigN, DISTANCE_WEIGHT, temp, point, CRIMES, CRIMECOORDS)
  startPositions.push(scoreObject)
}

startPositions.sort((a, b) => {
  return (
    b.camInfo.score - a.camInfo.score
  )
})

let top20 = startPositions.slice(0, 10)
// console.log(top20)
// console.log(startPositions[0].camInfo)
// console.log(startPositions[startPositions.length-1].camInfo.score)

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
      return { success: false, message: "Inside building." }
      // candidate = next
      // continue
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

async function calculateScore(currentCam, currentPoint, CRIMECOORDS) {
  // let totalCount = 0
  // let totalDistance = 0
  // let crimeCount = 0
  // currentCam.connectedCrimes = []
  // currentCam.score = 0
  // // console.log(crimeCoords)
  // for (const coord of crimeCoords) {
  //   let crimeAsPoint = turf.point([parseFloat(coord.split(",")[0]), parseFloat(coord.split(",")[1])])

  //   // If the crime coordinate is inside the coverage area
  //   if (turf.booleanPointInPolygon(crimeAsPoint, currentCam.polygon)) {

  //     // Distance from the camera to the crime (m)
  //     let distance = turf.distance(currentPoint, crimeAsPoint) * 1000
  //     distance = distance < 1 ? 1 : distance
  //     // console.log(distance)

  //     /**
  //      * Adds the crime position to the cameras pool of "hits"
  //      * crimeInfo = info about a crime
  //      * distance = distance in meters
  //      * uniqueCount (crimes[coord].count) = amount of crimes at the same coordinate, i.e. 3000
  //      */
  //     currentCam.connectedCrimes.push({
  //       crimeInfo: crimes[coord],
  //       distance: distance,
  //       uniqueCount: crimes[coord].count,
  //       prescore: crimes[coord].count / Math.max(1, distance*0)
  //     })

  //     // Adds to the camera positions amount of crimes in coverage area
  //     crimeCount++

  //     /**
  //      * totalCount holds the crimes reported, i.e. 3000
  //      */
  //     totalCount += crimes[coord].count
  //     totalDistance += distance
  //   }

  //   let allPreScore = 0
  //   for (const crime of currentCam.connectedCrimes) {
  //     allPreScore += crime.prescore
  //   }
  //   // if ((allPreScore / totalCount) > 1) {
  //   //   console.log("allPreScore: " + allPreScore)
  //   //   console.log("totalCount: " + totalCount)
  //   //   console.log("divided: " + allPreScore / totalCount)
  //   // }

  //   currentCam.score = parseFloat((allPreScore / totalCount).toFixed(4)) || 0
  // }

  // return {
  //   "camInfo": currentCam,
  //   "totalCrimeCount": crimeCount,
  //   "totalCount": totalCount,
  //   "totalDistance": totalDistance
  // }
  return await scoreCalculation(bigN, DISTANCE_WEIGHT, currentCam, currentPoint, CRIMES, CRIMECOORDS)
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

  let currentCam = await generate(BUILDINGS, BBOX, [nextPoint.point.geometry], distance)
  currentCam = currentCam[0]
  let scoreObject = {}
  scoreObject = await calculateScore(currentCam, nextPoint.point.geometry, CRIMECOORDS, CRIMES)
    return {
      point: nextPoint,
      score: scoreObject
    }
  }

(async () => {
    console.time(`Worker: ${workerId}`)
    // let startPoint = (await getRandomPointFromGrid()).geometry
    let startPoint = top20[Math.floor(Math.random() * top20.length)].camInfo.center  //startPositions[0].camInfo.center
    let lastPoint = startPoint
    let simulationPoints = []

    let startCam = await generate(BUILDINGS, BBOX, [startPoint], distance)
    startCam = startCam[0]

    let lastScore = await calculateScore(startCam, startPoint, CRIMECOORDS, CRIMES)
    simulationPoints.push(lastScore)

    let dir = await getRandomDirection()

    // let i = 0;
    // while (true) {
    //   const directions = ["up", "down", "left", "right", "upLeft", "downLeft", "upRight", "downRight"]
    //   const stepResults = [];

    //   // Try all directions
    //   for (const dir of directions) {
    //     const stepObject = await takeStepInGridCalculateScore(dir, lastPoint);
    //     if (stepObject !== false) {
    //       stepResults.push(stepObject);
    //     }
    //   }

    //   if (stepResults.length === 0) {
    //     // No valid steps — stop or choose new start
    //     break;
    //   }

    //   // Sort by score (descending)
    //   stepResults.sort((a, b) => b.score.camInfo.score - a.score.camInfo.score);

    //   const bestScore = stepResults[0].score.camInfo.score;

    //   // Filter to only top scorers (in case of tie)
    //   const topSteps = stepResults.filter(
    //     s => s.score.camInfo.score === bestScore
    //   );

    //   // If multiple have same score, try all of them recursively / iteratively
    //   // For simplicity, we’ll just pick one at random among top scorers
    //   const nextStep =
    //     topSteps.length > 1
    //       ? topSteps[Math.floor(Math.random() * topSteps.length)]
    //       : topSteps[0];

    //   // If the best score improves, move there
    //   if (bestScore > lastScore.camInfo.score) {
    //     simulationPoints.push(nextStep.score);
    //     lastPoint = nextStep.point.point.geometry;
    //     lastScore = nextStep.score;
    //   } else {
    //     // Reached local maximum — no better move
    //     break;
    //   }

    //   i++;
    // }
    let i = 0;

    while (true) {
      // 1️⃣ Try all possible directions
      const directions = ["up", "down", "left", "right", "upLeft", "downLeft", "upRight", "downRight"]
      const stepResults = [];

      for (const dir of directions) {
        const stepObject = await takeStepInGridCalculateScore(dir, lastPoint);
        if (stepObject !== false) {
          stepResults.push(stepObject);
        }
      }

      if (stepResults.length === 0) break; // no valid moves

      // 2️⃣ Sort by score (descending)
      stepResults.sort((a, b) => b.score.camInfo.score - a.score.camInfo.score);

      // 3️⃣ Get the best score value
      const bestScoreValue = stepResults[0].score.camInfo.score;

      // 4️⃣ Filter all top scorers (in case of ties)
      const topSteps = stepResults.filter(
        s => s.score.camInfo.score === bestScoreValue
      );

      let foundBetter = false;

      // 5️⃣ Test *all* top-scoring directions
      for (const topStep of topSteps) {
        const nextResults = [];

        for (const dir of directions) {
          const nextStep = await takeStepInGridCalculateScore(dir, topStep.point.point.geometry);
          if (nextStep !== false) {
            nextResults.push(nextStep);
          }
        }

        // Find best score from those secondary moves
        const bestNext = nextResults.sort(
          (a, b) => b.score.camInfo.score - a.score.camInfo.score
        )[0];

        if (bestNext && bestNext.score.camInfo.score > lastScore.camInfo.score) {
          simulationPoints.push(bestNext.score);
          lastPoint = bestNext.point.point.geometry;
          lastScore = bestNext.score;
          foundBetter = true;
          break; // stop exploring after finding a better move
        }
      }

      // 6️⃣ If none of the top directions improved, stop
      if (!foundBetter) break;

      i++;
    }


    // while (i < 30) {
    //     // console.log(i)
    //     dir = await getRandomDirection()
    //     let stepObject = await takeStepInGridCalculateScore(dir, lastPoint)
    //     // console.log(stepObject)
    //     // If correct move
    //     if (stepObject !== false) {
    //         let temp = 0
    //         // If score is higher
    //         if (stepObject.score.camInfo.score > lastScore.camInfo.score) {
    //             simulationPoints.push(stepObject.score)
    //             lastPoint = stepObject.point.point.geometry
    //             lastScore = stepObject.score
    //             // i++;

    //         } else {
              
    //             dir = await getRandomDirection() 
    //         }
    //         i++;
    //     } else {
    //       // If outside or in building
    //     }  
    // }
    // console.log(simulationPoints)
    console.timeEnd(`Worker: ${workerId}`)
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
