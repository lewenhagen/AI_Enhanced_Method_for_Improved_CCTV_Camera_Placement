import * as turf from '@turf/turf'

async function createGrid(size, poly) {
  let temp = turf.polygon([poly])

  const polygon = turf.cleanCoords(temp)
  const bbox = turf.bbox(polygon)
  const cellSize = size
  const grid = turf.squareGrid(bbox, cellSize/1000, {units: "kilometers"})

  grid.features.forEach(function(item) {
    console.log(turf.booleanValid(item))
  })
  
  const clippedCells = grid.features
      .map(cell => turf.intersect(turf.featureCollection([cell, polygon])))
      .filter(Boolean)

  return clippedCells
}

export { createGrid }
