// worker.js
import { workerData, parentPort } from "worker_threads"
import * as turf from '@turf/turf'
import fs from "fs";
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



// for (let i = 0; i < 100; i++) {
//   let point = (await getRandomPointFromGrid()).geometry
//   let temp = await generate(BUILDINGS, BBOX, [point], DISTANCE)
//   temp = temp[0]

//   let scoreObject = await scoreCalculation(BIGN, DISTANCE_WEIGHT, temp, point, CRIMES, CRIMECOORDS)
//   startPositions.push(scoreObject)
// }

// startPositions.sort((a, b) => {
//   return (
//     b.camInfo.score - a.camInfo.score
//   )
// })

// let topFromInititalRandom = startPositions.slice(0, 10)
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

async function calculateScore(currentCam, currentPoint, CRIMECOORDS) {

  return await scoreCalculation(DISTANCE_WEIGHT, currentCam, currentPoint, CRIMES, CRIMECOORDS)
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
    dir,
    point: nextPoint,
    score: scoreObject
  }
}


(async () => {
  !SILENT && console.time(`Worker: ${workerId}`)
  const start = performance.now()

  // ---------------------------------------------
  // INITIAL SETUP
  // ---------------------------------------------
  let startPoint = (await getRandomPointFromGrid()).geometry
  // let lastPoint = startPoint

  let startCam = await generate(BUILDINGS, BBOX, [startPoint], DISTANCE)
  startCam = startCam[0]

  let startScore = await calculateScore(startCam, startPoint, CRIMECOORDS, CRIMES)

  // Structures
  let visited = new Set()
  let simulationPoints = []

  // Track BEST SCORE globally
  let bestScore = startScore

  function key(point) {
    return point.coordinates
      ? `${point.coordinates[0]},${point.coordinates[1]}`
      : `${point.x},${point.y}`
  }

  // Save starting point
  visited.add(key(startPoint))
  simulationPoints.push(startScore)


  async function dfs(point, depth) {

    // Stop conditions
    if (depth >= MAXSTEPS - 1) return
    if (simulationPoints.length >= MAXSTEPS-1) return

    const directions = [
      "up","down","left","right",
      "upLeft","downLeft","upRight","downRight"
    ]

    // Evaluate neighbors in parallel
    const stepPromises = directions.map(dir =>
      takeStepInGridCalculateScore(dir, point)
    )

    const stepResults = await Promise.all(stepPromises)

    let candidates = []

    // For each neighbor, add to visited if not there
    for (const step of stepResults) {
      if (!step || !step.score || !step.point) continue
      const p = step.point.point.geometry
      if (!visited.has(key(p))) {
        candidates.push(step)
      }
    }

    if (candidates.length === 0) return

    // Heuristic sort: high score, then short distance
    candidates.sort((a, b) =>
      b.score.camInfo.score - a.score.camInfo.score ||
      a.score.camInfo.totalDistance - b.score.camInfo.totalDistance
    )

    // DFS on sorted children
    for (const child of candidates) {
      if (simulationPoints.length >= MAXSTEPS) break

      const p = child.point.point.geometry
      visited.add(key(p))

      // Save score (same object structure)
      simulationPoints.push(child.score)

      // Track best score globally
      if (child.score.camInfo.score > bestScore.camInfo.score) {
        bestScore = child.score
      }

      await dfs(p, depth + 1)
    }
  }

  await dfs(startPoint, 0)


  // Add the best score found when everythong is done
  simulationPoints.push(bestScore)

  const end = performance.now()
  const elapsed = end - start

  simulationPoints.push({
    time: Number((elapsed/1000).toFixed(5)),
    avgTime: 0
  })

  !SILENT && console.timeEnd(`Worker: ${workerId}`)
  parentPort.postMessage(simulationPoints)





})()
