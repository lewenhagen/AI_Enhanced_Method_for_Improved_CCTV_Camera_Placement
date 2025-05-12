import * as turf from '@turf/turf'
import { generate } from './generateCoverageArea.js'

let allPoints = []
const bearings = [0, , 45, 90, 135, 180, 225, 270]

function createGridOvercaptureArea(centerLong, centerLat, buildings, distance) {
  const buildingsCollection = {
    type: "FeatureCollection",
    features: buildings.map(f => ({
      type: "Feature",
      geometry: f.geometry,
      properties: f.properties || {} // optional: keep properties
    }))
  };
  // Step 1: Create the circle (center, radius in kilometers)
  const center = [centerLong, centerLat]; // longitude, latitude
  const radius = (distance/1000); 
  const circle = turf.circle(center, radius, { steps: 64, units: 'kilometers' });

  // Step 2: Get bounding box of the circle
  const bbox = turf.bbox(circle);

  // Step 3: Create a point grid with 5 meter spacing
  const grid = turf.pointGrid(bbox, 5, { units: 'meters', mask: circle });
  const filteredPoints = turf.featureCollection(
    grid.features.filter(point =>
      !buildingsCollection.features.some(building =>
        turf.booleanPointInPolygon(point, building)
      )
    )
  );
  // Step 4: Filter points inside the circle
  return filteredPoints //turf.pointsWithinPolygon(grid, circle);

}
/**
 * Required for generate: buildings, boundingBox, pointsOnBoundary, distance
 */

let currentBest = {
  totalCount: null,
  totalDistance: null,
  totalCrimeCount: null,
  score: 0
}

async function stepAndCalculate(camPoint, crimes, crimeCoords, bbox, buildings) {
  let current = camPoint

  let currentCam = await generate(buildings, bbox, [current], 100)
  currentCam = currentCam[0]

  let totalCount = 0
  let totalDistance = 0
  let crimeCount = 0

  for (const coord of crimeCoords) {
      let crimeAsPoint = turf.point([parseFloat(coord.split(",")[0]), parseFloat(coord.split(",")[1])])
      
      if (turf.booleanPointInPolygon(crimeAsPoint, currentCam.polygon)) {
          let distance = turf.distance(current, crimeAsPoint) * 1000

          crimeCount++
          totalCount += crimes[coord].count
          totalDistance += distance
      }
  }

  allPoints.push( {
    "camInfo": currentCam,
    "totalCrimeCount": crimeCount,
    "totalCount": totalCount,
    "totalDistance": totalDistance
  })
}

async function runAi(data) {
    // console.log(data)
    let buildings = data.buildings
    let gridArea = createGridOvercaptureArea(parseFloat(data.start.split(",")[1]), parseFloat(data.start.split(",")[0]), buildings, 100)
    
    // let score = 0
    // let availableArea = data.areaWithoutBuildings
    
    let bbox = data.boundingBox
    let crimes = data.crimes
    let crimeCoords = Object.keys(data.crimes)
    // let current = turf.point([parseFloat(data.start.split(",")[1]), parseFloat(data.start.split(",")[0])])

    // let currentCam = await generate(buildings, bbox, [current], 100)
    // currentCam = currentCam[0]

    // let totalCount = 0
    // let totalDistance = 0
    // let crimeCount = 0

    // for (const coord of crimeCoords) {
    //     let crimeAsPoint = turf.point([parseFloat(coord.split(",")[0]), parseFloat(coord.split(",")[1])])
        
    //     if (turf.booleanPointInPolygon(crimeAsPoint, currentCam.polygon)) {
    //         let distance = turf.distance(current, crimeAsPoint) * 1000

    //         crimeCount++
    //         totalCount += crimes[coord].count
    //         totalDistance += distance
    //     }
    // }
    allPoints = []
    turf.featureEach(gridArea, async function(current, index) {
      let point = current.geometry
      await stepAndCalculate(point, crimes, crimeCoords, bbox, buildings)
      // console.log(result)
      // allPoints.push(result)
    })

    // Manage properties for score
    // currentCam.totalCount = totalCount
    // currentCam.totalDistance = totalDistance.toFixed(4)
    // currentCam.totalCrimeCount = crimeCount


    // return {gridArea: gridArea, currentCam: currentCam, bestCam: currentBest}
    return {gridArea: gridArea, allPoints: allPoints}
}

export { runAi }