import * as turf from '@turf/turf'
import { generate } from './generateCoverageArea.js'

let gridMatrix = []
let currentCol = null
let currentRow = null


const directions = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
  upLeft: [-1, -1],
  upRight: [-1, 1],
  downLeft: [1, -1],
  downRight: [1, 1]
}

async function getRandomPointFromGrid() {
  const row = Math.floor(Math.random() * gridMatrix.length)
  const col = Math.floor(Math.random() * gridMatrix[row].length)
  currentCol = col
  currentRow = row
  return { point: gridMatrix[row][col], row: row, col: col }
}

async function move(dir) {
  const [dy, dx] = directions[dir] || [0, 0];
  const newRow = currentRow + dy;
  const newCol = currentCol + dx;

  // Check bounds
  if (
    newRow >= 0 &&
    newRow < gridMatrix.length &&
    newCol >= 0 &&
    newCol < gridMatrix[newRow].length &&
    gridMatrix[newRow][newCol] // Check if point exists (not masked/filtered)
  ) {
    currentRow = newRow
    currentCol = newCol
    return {
      success: true,
      point: gridMatrix[currentRow][currentCol],
      row: currentRow,
      col: currentCol
    }
  } else {
    return { success: false, message: "Out of bounds or invalid cell." }
  }
}



// async function convertGrid(grid) {
  

//   grid.features.forEach(point => {
//     const [lng, lat] = point.geometry.coordinates;
//     const key = `${lng.toFixed(6)},${lat.toFixed(6)}`
//     gridMatrix[row][col] = point
//   })
// }

async function convertGrid(grid, density) {
  const latTolerance = density / 111_000; // degrees per meter (approx)

  // Sort by latitude (descending), then longitude (ascending)
  const sorted = grid.slice().sort((a, b) => {
    const [lngA, latA] = a.geometry.coordinates;
    const [lngB, latB] = b.geometry.coordinates;

    if (Math.abs(latB - latA) > 1e-6) return latB - latA;
    return lngA - lngB;
  });

  // const gridMatrix = [];
  let currentRow = [];
  let previousLat = null;

  for (const point of sorted) {
    const [, lat] = point.geometry.coordinates;

    if (
      previousLat === null ||
      Math.abs(lat - previousLat) > latTolerance / 2
    ) {
      if (currentRow.length > 0) {
        gridMatrix.push(currentRow);
      }
      currentRow = [];
      previousLat = lat;
    }

    currentRow.push(point);
  }

  if (currentRow.length > 0) {
    gridMatrix.push(currentRow);
  }


  // return gridMatrix;
}

export { convertGrid, move, getRandomPointFromGrid }