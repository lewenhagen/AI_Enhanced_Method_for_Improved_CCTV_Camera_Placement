import * as turf from '@turf/turf'

async function createGrid(size, poly) {
  let result = []
  let temp = turf.polygon([poly])
  // Bounding box for the grid
  const polygon = turf.cleanCoords(temp)
  const bbox = turf.bbox(polygon)
  
  // Adjust grid cell size to control the number of sections
  const cellSize = size; // Change this to increase/decrease the number of areas

  // Generate square grid over the bounding box
  const grid = turf.squareGrid(bbox, cellSize/1000, {units: "kilometers"});
  grid.features.forEach(function(item) {
    console.log(turf.booleanValid(item))
  })
  // console.log(polygon)
  // Clip the grid cells to the polygon
  const clippedCells = grid.features
      .map(cell => turf.intersect(turf.featureCollection([cell, polygon]))) // Clip each cell
      .filter(Boolean); // Remove null values

  // Function to generate random colors
  function getRandomColor() {
      return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  }

  // Add clipped grid cells to the map
  // clippedCells.forEach(cell => {
  //     result.push(L.geoJSON(cell, {
  //         style: () => ({
  //             color: 'black',
  //             weight: 1,
  //             fillColor: getRandomColor(),
  //             fillOpacity: 0.5
  //         })
  //     }))
  // })

  return clippedCells
}

export { createGrid }
