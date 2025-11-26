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
    BIGN,
    MAXSTEPS,
    SILENT
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
  let temp = await generate(BUILDINGS, BBOX, [point], DISTANCE)
  temp = temp[0]

  let scoreObject = await scoreCalculation(BIGN, DISTANCE_WEIGHT, temp, point, CRIMES, CRIMECOORDS)
  startPositions.push(scoreObject)
}

startPositions.sort((a, b) => {
  return (
    b.camInfo.score - a.camInfo.score
  )
})

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

  return await scoreCalculation(BIGN, DISTANCE_WEIGHT, currentCam, currentPoint, CRIMES, CRIMECOORDS)
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
//     !SILENT && console.time(`Worker: ${workerId}`)
//     const start = performance.now()
//     let startPoint = (await getRandomPointFromGrid()).geometry
//     // let startPoint = topFromInititalRandom[Math.floor(Math.random() * topFromInititalRandom.length)].camInfo.center  //startPositions[0].camInfo.center
//     let lastPoint = startPoint
//     let simulationPoints = []

//     let startCam = await generate(BUILDINGS, BBOX, [startPoint], DISTANCE)
//     startCam = startCam[0]

//     let lastScore = await calculateScore(startCam, startPoint, CRIMECOORDS, CRIMES)

//     simulationPoints.push(lastScore)

//     let counter = 0;
//     const visitedPoints = new Set();

//     function pointKey(point) {
//       if (point.coordinates) {
//         const [x, y] = point.coordinates;
//         return `${x},${y}`;
//       }
//       return `${point.x},${point.y}`;
//     }

//     visitedPoints.add(pointKey(lastPoint));

//     while (counter < (MAXSTEPS-1)) {
//       const directions = [
//         "up", "down", "left", "right",
//         "upLeft", "downLeft", "upRight", "downRight"
//       ];

//       // Step 1: Check all directions
//       const stepResults = [];
//       for (const dir of directions) {
//         const step = await takeStepInGridCalculateScore(dir, lastPoint);
//         if (step !== false) {
//           const stepPos = step.point.point.geometry;
//           if (!visitedPoints.has(pointKey(stepPos))) {
//             stepResults.push(step);
//           }
//         }
//       }

//       // Stop if no valid moves
//       if (stepResults.length === 0) break;

//       // Step 2: Sort by score
//       stepResults.sort((a, b) => b.score.camInfo.score - a.score.camInfo.score);

//       const currentScore = lastScore.camInfo.score;
//       const currentDistance = lastScore.camInfo.totalDistance;

//       // Step 3: Pick the first improvement
//       const nextStep = stepResults.find(candidate => {
//         const nextScore = candidate.score.camInfo.score;
//         const nextDistance = candidate.score.camInfo.totalDistance;
//         return (
//           nextScore > currentScore ||
//           (nextScore === currentScore && nextDistance < currentDistance)
//         )
//       })

//       // Step 4: If no improvement, stop
//       if (!nextStep) break;

//       // Step 5: Move + add to simulation
//       //end = performance.now()
//       //elapsed = end - start
//       //nextStep.score.time = Number((elapsed/1000).toFixed(5))
//       simulationPoints.push(nextStep.score);

//       lastPoint = nextStep.point.point.geometry;
//       lastScore = nextStep.score;
//       visitedPoints.add(pointKey(lastPoint));

//       // Step 6: Go again
//       counter++;
//     }



//     const end = performance.now()
//     const elapsed = end - start
//     simulationPoints.push({
//       time: Number((elapsed/1000).toFixed(5)),
//       avgTime: 0
//     })

//     !SILENT && console.timeEnd(`Worker: ${workerId}`)
//     parentPort.postMessage(simulationPoints)



//     !SILENT && console.time(`Worker: ${workerId}`)
// const start = performance.now()

// let startPoint = (await getRandomPointFromGrid()).geometry
// let lastPoint = startPoint

// let startCam = await generate(BUILDINGS, BBOX, [startPoint], DISTANCE)
// startCam = startCam[0]

// let startScore = await calculateScore(startCam, startPoint, CRIMECOORDS, CRIMES)

// let visited = new Set()
// let simulationPoints = []

// function key(point) {
//   return point.coordinates
//     ? `${point.coordinates[0]},${point.coordinates[1]}`
//     : `${point.x},${point.y}`
// }

// visited.add(key(startPoint))
// simulationPoints.push(startScore)

// // ---------------------------------------------
// //  HEURISTIC DFS
// // ---------------------------------------------

// async function dfs(point, score, depth) {
//   if (depth >= MAXSTEPS - 1) return

//   const directions = [
//     "up", "down", "left", "right",
//     "upLeft", "downLeft", "upRight", "downRight"
//   ]

//   // Step 1: evaluate all possible children
//   let candidates = []
//   for (const dir of directions) {
//     const step = await takeStepInGridCalculateScore(dir, point)
//     if (step !== false) {
//       const p = step.point.point.geometry
//       if (!visited.has(key(p))) {
//         candidates.push(step)
//       }
//     }
//   }

//   if (candidates.length === 0) return

//   // Step 2: sort by heuristic (best first)
//   candidates.sort((a, b) =>
//     b.score.camInfo.score - a.score.camInfo.score ||
//     a.score.camInfo.totalDistance - b.score.camInfo.totalDistance
//   )

//   // Step 3: DFS branch for each child (depth-first)
//   for (const child of candidates) {
//     const p = child.point.point.geometry
//     visited.add(key(p))
//     simulationPoints.push(child.score)

//     await dfs(p, child.score, depth + 1)

//     if (simulationPoints.length >= MAXSTEPS) break
//   }
// }

// // start DFS
// await dfs(startPoint, startScore, 0)

// // ---------------------------------------------
// // Finish + Return
// // ---------------------------------------------
// const end = performance.now()
// const elapsed = end - start

// simulationPoints.push({
//   time: Number((elapsed/1000).toFixed(5)),
//   avgTime: 0
// })

// !SILENT && console.timeEnd(`Worker: ${workerId}`)

// parentPort.postMessage(simulationPoints)
// !SILENT && console.time(`Worker: ${workerId}`)
// const start = performance.now();

// // starting point
// let startPoint = (await getRandomPointFromGrid()).geometry;
// // let startPoint = topFromInititalRandom[Math.floor(Math.random() * topFromInititalRandom.length)].camInfo.center;

// let simulationPoints = [];

// let startCam = await generate(BUILDINGS, BBOX, [startPoint], DISTANCE);
// startCam = startCam[0];

// let startScore = await calculateScore(startCam, startPoint, CRIMECOORDS, CRIMES);

// // Save initial state
// simulationPoints.push({
//     point: startPoint,
//     score: startScore,
//     direction: "start",
//     stepIndex: 0
// });

// const visited = new Set();
// const pointKey = p => `${p.coordinates[0]},${p.coordinates[1]}`;

// visited.add(pointKey(startPoint));

// // GLOBAL best
// let bestNode = {
//     point: startPoint,
//     score: startScore
// };

// // Available directions
// const directions = [
//     "up","down","left","right",
//     "upLeft","downLeft","upRight","downRight"
// ];

// // Depth-first search (with heuristic sorting)
// async function dfs(currentPoint, currentScore, depth) {
//     if (depth >= MAXSTEPS) return;

//     // Get all valid steps
//     let neighbors = [];

//     for (const dir of directions) {
//         const step = await takeStepInGridCalculateScore(dir, currentPoint);
//         if (!step) continue;

//         const nextPoint = step.point.point.geometry;
//         const key = pointKey(nextPoint);

//         if (visited.has(key)) continue;

//         neighbors.push({
//             direction: dir,
//             point: nextPoint,
//             score: step.score
//         });
//     }

//     if (neighbors.length === 0) return;

//     // Sort by score DESCENDING (heuristic)
//     neighbors.sort((a, b) =>
//         b.score.camInfo.score - a.score.camInfo.score
//     );

//     // Explore each neighbor in sorted DFS order
//     for (const next of neighbors) {
//         const { point: nextPoint, score: nextScore, direction } = next;

//         // Mark visited
//         visited.add(pointKey(nextPoint));

//         // Save to path
//         simulationPoints.push(nextScore);

//         // Track global best
//         if (nextScore.camInfo.score > bestNode.score.camInfo.score) {
//             bestNode = {
//                 point: nextPoint,
//                 score: nextScore
//             };
//         }

//         // Continue DFS
//         await dfs(nextPoint, nextScore, depth + 1);

//         // DFS backtracking does NOT remove from visited
//         // because revisiting old points adds loops
//     }
// }

// // Start DFS
// await dfs(startPoint, startScore, 0);

// // End timing
// const end = performance.now();
// const elapsed = end - start;

// simulationPoints.push({
//     point: bestNode.point,
//     score: bestNode.score,
//     finalBest: true,
//     time: Number((elapsed / 1000).toFixed(5))
// });

// !SILENT && console.timeEnd(`Worker: ${workerId}`);
// parentPort.postMessage(simulationPoints);

  !SILENT && console.time(`Worker: ${workerId}`)
  const start = performance.now()

  // ---------------------------------------------
  // INITIAL SETUP
  // ---------------------------------------------
  let startPoint = (await getRandomPointFromGrid()).geometry
  let lastPoint = startPoint

  let startCam = await generate(BUILDINGS, BBOX, [startPoint], DISTANCE)
  startCam = startCam[0]

  let startScore = await calculateScore(startCam, startPoint, CRIMECOORDS, CRIMES)

  // Structures
  let visited = new Set()
  let simulationPoints = []

  function key(point) {
    return point.coordinates
      ? `${point.coordinates[0]},${point.coordinates[1]}`
      : `${point.x},${point.y}`
  }

  // Save starting point
  visited.add(key(startPoint))
  simulationPoints.push(startScore)


  // ---------------------------------------------
  //  HEURISTIC DFS (CORRECTED)
  // ---------------------------------------------

  async function dfs(point, score, depth) {
    if (depth >= MAXSTEPS - 1) return
    if (simulationPoints.length >= MAXSTEPS) return

    const directions = [
      "up","down","left","right",
      "upLeft","downLeft","upRight","downRight"
    ]

    // Step 1: evaluate children
    let candidates = []
    for (const dir of directions) {
      const step = await takeStepInGridCalculateScore(dir, point)
      if (!step || !step.score || !step.point) continue

      const p = step.point.point.geometry
      if (!visited.has(key(p))) {
        candidates.push(step)
      }
    }

    if (candidates.length === 0) return

    // Step 2: heuristic sort — highest score first
    candidates.sort((a, b) =>
      b.score.camInfo.score - a.score.camInfo.score ||
      a.score.camInfo.totalDistance - b.score.camInfo.totalDistance
    )

    // Step 3: DFS → deep first
    for (const child of candidates) {
      if (simulationPoints.length >= MAXSTEPS) break

      const p = child.point.point.geometry
      visited.add(key(p))

      // ⬅ SAME OBJECT STRUCTURE as the original algorithm
      simulationPoints.push(child.score)

      // Go deeper
      await dfs(p, child.score, depth + 1)
    }
  }


  // Run DFS
  await dfs(startPoint, startScore, 0)


  // ---------------------------------------------
  // END + RETURN
  // ---------------------------------------------
  const end = performance.now()
  const elapsed = end - start

  simulationPoints.push({
    time: Number((elapsed/1000).toFixed(5)),
    avgTime: 0
  })

  !SILENT && console.timeEnd(`Worker: ${workerId}`)
  parentPort.postMessage(simulationPoints)


})()
