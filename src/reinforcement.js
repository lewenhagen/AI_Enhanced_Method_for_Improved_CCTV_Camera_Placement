import * as turf from '@turf/turf'
import { generate } from './generateCoverageArea.js'

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
  const pointCoords = point.geometry.coordinates.map(c => c.toFixed(6)).join(',');
  return gridMap.has(pointCoords);
}

function isPointInBuilding(point) {

  return gridBuildings.features.some(building =>
    turf.booleanPointInPolygon(point, building)
  );
}


async function move(currentPoint, direction, stepSizeMeters) {
  const bearing = directionBearings[direction];
  let candidate = currentPoint; // Start from current position

  while (true) {
    // Step once from the current candidate in the given bearing
    const next = turf.destination(candidate, stepSizeMeters, bearing, { units: 'meters' });

    // Get the coordinates of the next point and format them
    const nextCoords = next.geometry.coordinates.map(c => c.toFixed(6)).join(',');

    // Check if the next point is outside the grid


    // Check if the next point is inside a building
    if (isPointInBuilding(next)) {
      console.log("In building, stepping over to the next point...");

      // Continue stepping in the same direction without changing direction
      candidate = next;  // Update the candidate to the next point
      continue;  // Skip the rest of the loop and try the next step
    }

    if (!isPointInGrid(next)) {
      return { success: false, message: "Outside the grid boundary or hit a building." };
    }

    // If the point is valid and within the grid and not in a building, return it
    if (gridMap.has(nextCoords)) {
      const currentPoint = gridMap.get(nextCoords);
      return {
        success: true,
        point: currentPoint,
        coords: currentPoint.geometry.coordinates,
        message: "Move ok"
      };
    }

    // console.log("Point in buldings")
    // candidate = next
  }
}


// async function move(currentPoint, direction, stepSizeMeters) {
//   const bearing = directionBearings[direction];
//   const dest = turf.destination(currentPoint, stepSizeMeters, bearing, {
//     units: 'meters'
//   });

//   const destCoords = dest.geometry.coordinates.map(c => c.toFixed(6)).join(',');

//   if (gridMap.has(destCoords)) {
//     currentPoint = gridMap.get(destCoords);
//     return { success: true, point: currentPoint };
//   } else {
//     return { success: false, message: 'Blocked or outside grid' };
//   }
// }



// async function convertGrid(grid) {


//   grid.features.forEach(point => {
//     const [lng, lat] = point.geometry.coordinates;
//     const key = `${lng.toFixed(6)},${lat.toFixed(6)}`
//     gridMatrix[row][col] = point
//   })
// }
async function setupBuildings(buildings) {
  gridBuildings.features = buildings.map(function(building) {
    return {
      type: "Feature",
      properties: {},
      geometry: building.geometry
    }
  })
}
async function setupGridAndBuildings(grid, buildings) {
  gridMap = new Map()
  await setupBuildings(buildings)
  // gridBuildings.features = []

  // console.log()
  for (const point of grid.features) {
    const key = point.geometry.coordinates.map(c => c.toFixed(6)).join(',');
    gridMap.set(key, point);
  }
}

export { setupGridAndBuildings, move, getRandomPointFromGrid }
