import * as turf from '@turf/turf'
import { generate } from './generateCoverageArea.js'

let stepSizeMeters = -1
let gridMap = new Map()
let gridBuildings = {
  type: "FeatureCollection",
  features: []
}

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
    const next = turf.destination(candidate, stepSizeMeters, bearing, { units: 'meters' })
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


async function setupBuildings(buildings) {
  gridBuildings.features = buildings.map(function(building) {
    return {
      type: "Feature",
      properties: {},
      geometry: building.geometry
    }
  })
}
async function setupGridAndBuildings(grid, buildings, gridDensity) {
  gridMap = new Map()
  stepSizeMeters = gridDensity
  await setupBuildings(buildings)

  for (const point of grid.features) {
    const key = point.geometry.coordinates.map(c => c.toFixed(6)).join(',')
    gridMap.set(key, point)
  }
  // console.log(gridMap)
}

export { setupGridAndBuildings, move, getRandomPointFromGrid }
