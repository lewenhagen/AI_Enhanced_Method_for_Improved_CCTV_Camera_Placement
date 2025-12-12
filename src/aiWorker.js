// worker.js
import { workerData, parentPort } from "worker_threads"
import * as turf from '@turf/turf'

// import { getRandomPointFromGrid } from "./reinforcement.js"
import { generate } from "./generateCoverageArea.js"
import { scoreCalculation } from "./scoreCalculation.js"
// import { getRandomDirection, calculateScore } from "./aiWorkerFunctions.js";
import { performance } from 'node:perf_hooks';

let startPositions = []



// startPositions.sort()

const {
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
    MAXSTEPS,
    SILENT,
    numberOfCrimesInRadius
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

// for (let i = 0; i < 100; i++) {
//   let point = (await getRandomPointFromGrid()).geometry
//   let temp = await generate(BUILDINGS, BBOX, [point], DISTANCE)
//   temp = temp[0]

//   let scoreObject = await scoreCalculation(DISTANCE_WEIGHT, temp, point, CRIMES, CRIMECOORDS, numberOfCrimesInRadius)
//   startPositions.push(scoreObject)
// }

// startPositions.sort((a, b) => {
//   return (
//     b.camInfo.score - a.camInfo.score
//   )
// })

let topFromInititalRandom = startPositions.slice(0, 10)
// console.log(topFromInititalRandom)
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

  const stepDistance = isDiagonal ? GRIDDENSITY * Math.SQRT2 : GRIDDENSITY
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
// async function setupGridAndBuildings(grid, buildings, GRIDDENSITY) {
//   gridMap = new Map()
//   stepSizeMeters = GRIDDENSITY
//   await setupBuildings(buildings)

//   for (const point of grid.features) {
//     const key = point.geometry.coordinates.map(c => c.toFixed(6)).join(',')
//     gridMap.set(key, point)
//   }
//   // console.log(gridMap)
// }

async function calculateScore(currentCam, currentPoint, CRIMECOORDS) {

  return await scoreCalculation(DISTANCE_WEIGHT, currentCam, currentPoint, CRIMES, CRIMECOORDS, numberOfCrimesInRadius)
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



  let nextPoint = await move(currentPoint, dir)

  if (!nextPoint.success) {
    return false
  }

  let currentCam = await generate(BUILDINGS, BBOX, [nextPoint.point.geometry], DISTANCE)
  currentCam = currentCam[0]
  let scoreObject = await calculateScore(currentCam, nextPoint.point.geometry, CRIMECOORDS, CRIMES)

  return {
    point: nextPoint,
    score: scoreObject
  }
}

(async () => {
    !SILENT && console.time(`Worker: ${workerId}`)
    const start = performance.now()
    let startPoint = (await getRandomPointFromGrid()).geometry
    // let startPoint = topFromInititalRandom[Math.floor(Math.random() * topFromInititalRandom.length)].camInfo.center  //startPositions[0].camInfo.center
    let lastPoint = startPoint
    let simulationPoints = []

    let startCam = await generate(BUILDINGS, BBOX, [startPoint], DISTANCE)
    startCam = startCam[0]

    let lastScore = await calculateScore(startCam, startPoint, CRIMECOORDS, CRIMES)

    simulationPoints.push(lastScore)

    // let dir = await getRandomDirection()

    // let maxSteps = 10
    // let counter = 0

    // while (counter < maxSteps) {
    //   const directions = ["up", "down", "left", "right", "upLeft", "downLeft", "upRight", "downRight"];
    //   const stepResults = [];

    //   // Try all directions
    //   for (const dir of directions) {
    //     const stepObject = await takeStepInGridCalculateScore(dir, lastPoint);
    //     if (stepObject !== false) {
    //       stepResults.push(stepObject);
    //     }
    //   }

    //   if (stepResults.length === 0) break;

    //   // Sort by score (descending)
    //   stepResults.sort((a, b) => b.score.camInfo.score - a.score.camInfo.score);

    //   // Get the best score value
    //   const bestScoreValue = stepResults[0].score.camInfo.score;

    //   // Filter all top scorers (in case of ties)
    //   const topSteps = stepResults.filter(
    //     item => item.score.camInfo.score === bestScoreValue
    //   );

    //   let foundBetter = false;

    //   // Test all top-scoring directions
    //   for (const topStep of topSteps) {
    //     const nextResults = [];

    //     for (const dir of directions) {
    //       const nextStep = await takeStepInGridCalculateScore(dir, topStep.point.point.geometry);
    //       if (nextStep !== false) {
    //         nextResults.push(nextStep);
    //       }
    //     }

    //     // Find the best next step (highest score first)
    //     const bestNext = nextResults.sort(
    //       (a, b) => b.score.camInfo.score - a.score.camInfo.score
    //     )[0];

    //     if (bestNext) {
    //       const nextScore = bestNext.score.camInfo.score;
    //       const nextDistance = bestNext.score.camInfo.totalDistance;
    //       const currentScore = lastScore.camInfo.score;
    //       const currentDistance = lastScore.camInfo.totalDistance;

    //       // Move if score improves OR (score same & distance shorter)
    //       if (nextScore > currentScore ||
    //           (nextScore === currentScore && nextDistance < currentDistance)) {
    //         simulationPoints.push(bestNext.score);
    //         lastPoint = bestNext.point.point.geometry;
    //         lastScore = bestNext.score;
    //         foundBetter = true;
    //         break; // stop after finding a better (or equally good but closer) move
    //       }
    //     }
    //   }

    //   // If none of the top directions improved, stop
    //   if (!foundBetter) break;
    // }

    let counter = 0;
    const visitedPoints = new Set();

    function pointKey(point) {
      if (point.coordinates) {
        const [x, y] = point.coordinates;
        return `${x},${y}`;
      }
      return `${point.x},${point.y}`;
    }

    visitedPoints.add(pointKey(lastPoint));

    while (counter < (MAXSTEPS-1)) {
      const directions = [
        "up", "down", "left", "right",
        "upLeft", "downLeft", "upRight", "downRight"
      ];

      // Step 1: Check all directions in parallel
      const stepResults = [];

      const stepPromises = directions.map(dir =>
        takeStepInGridCalculateScore(dir, lastPoint)
      )

      const candidates = await Promise.all(stepPromises)
      for (const step of candidates) {
        if (!step || !step.score || !step.point) continue
          const p = step.point.point.geometry
          if (!visitedPoints.has(pointKey(p))) {
            stepResults.push(step)
          }
      }
      // for (const dir of directions) {
      //   const step = await takeStepInGridCalculateScore(dir, lastPoint);
      //   if (step !== false) {
      //     const stepPos = step.point.point.geometry;
      //     if (!visitedPoints.has(pointKey(stepPos))) {
      //       stepResults.push(step);
      //     }
      //   }
      // }

      // Stop if no valid moves
      if (stepResults.length === 0) break;

      // Step 2: Sort by score
      stepResults.sort((a, b) => b.score.camInfo.score - a.score.camInfo.score);

      const currentScore = lastScore.camInfo.score;
      const currentDistance = lastScore.camInfo.totalDistance;

      // Step 3: Pick the first improvement
      const nextStep = stepResults.find(candidate => {
        const nextScore = candidate.score.camInfo.score;
        const nextDistance = candidate.score.camInfo.totalDistance;
        return (
          nextScore > currentScore ||
          (nextScore === currentScore && nextDistance < currentDistance)
        )
      })

      // Step 4: If no improvement, stop
      if (!nextStep) break;

      // Step 5: Move + add to simulation
      //end = performance.now()
      //elapsed = end - start
      //nextStep.score.time = Number((elapsed/1000).toFixed(5))
      simulationPoints.push(nextStep.score);

      lastPoint = nextStep.point.point.geometry;
      lastScore = nextStep.score;
      visitedPoints.add(pointKey(lastPoint));

      // Step 6: Go again
      counter++;
    }


    // // Step 3: Find the first better (or equal & closer) step
    //   let nextStep = stepResults.find(candidate => {
    //     const nextScore = candidate.score.camInfo.score;
    //     const nextDistance = candidate.score.camInfo.totalDistance;
    //     return (
    //       nextScore > currentScore ||
    //       (nextScore === currentScore && nextDistance < currentDistance)
    //     );
    //   });

    //   // Step 4: Handle case where no improvement or zero distance
    //   if (!nextStep || nextStep.score.camInfo.totalDistance === 0) {
    //     // Try moving randomly if possible
    //     const unvisited = [];

    //     for (const dir of directions) {
    //       const tryStep = await takeStepInGridCalculateScore(dir, lastPoint);
    //       if (tryStep !== false) {
    //         const pos = tryStep.point.point.geometry;
    //         if (!visitedPoints.has(pointKey(pos))) {
    //           unvisited.push(tryStep);
    //         }
    //       }
    //     }

    //     if (unvisited.length > 0) {
    //       // Pick a random unvisited direction
    //       const randomIndex = Math.floor(Math.random() * unvisited.length);
    //       nextStep = unvisited[randomIndex];
    //     } else {
    //       // No unvisited directions left — stop
    //       break;
    //     }
    //   }


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
    const end = performance.now()
    const elapsed = end - start
    simulationPoints.push({
      time: Number((elapsed/1000).toFixed(5)),
      avgTime: 0
    })

    !SILENT && console.timeEnd(`Worker: ${workerId}`)
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
