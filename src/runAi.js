import * as turf from '@turf/turf'
import { generate } from './generateCoverageArea.js'

let allPoints = []
// const bearings = [0, , 45, 90, 135, 180, 225, 270]

/**
 *
 * @param {number} centerLong
 * @param {number} centerLat
 * @param {Array} buildings
 * @param {number} distance
 * @param {number} gridDensity
 * @returns {FeatureCollection} The points inside capture area
 */
function createGridOvercaptureArea(centerLong, centerLat, buildings, distance, gridDensity) {
  const buildingsCollection = {
    type: "FeatureCollection",
    features: buildings.map(f => ({
      type: "Feature",
      geometry: f.geometry,
      properties: f.properties || {}
    }))
  }

  const center = [centerLong, centerLat]
  const radius = (distance/1000)
  const circle = turf.circle(center, radius, { steps: 64, units: 'kilometers' })
  const bbox = turf.bbox(circle)
  const grid = turf.pointGrid(bbox, gridDensity, { units: 'meters', mask: circle })
  const filteredPoints = turf.featureCollection(
    grid.features.filter(point =>
      !buildingsCollection.features.some(building =>
        turf.booleanPointInPolygon(point, building)
      )
    )
  )

  return filteredPoints //turf.pointsWithinPolygon(grid, circle)

}
/**
 * Required for generate: buildings, boundingBox, pointsOnBoundary, distance
 */

// let currentBest = {
//   totalCount: null,
//   totalDistance: null,
//   totalCrimeCount: null,
//   score: 0
// }


async function reinforcement(camPoint, crimes, crimeCoords, bbox, buildings, distance) {
  // score: 1st unique, 2nd totalNoCrimes, 3rd distance
  // color the path in the output!
  let currentBestPosition = {}
  // while() {

  // }
  let current = camPoint

  // Generate cam coverage based on current coordinates
  let currentCam = await generate(buildings, bbox, [current], distance)
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



/**
 * @param {} camPoint
 * @param {*} crimes
 * @param {*} crimeCoords
 * @param {*} bbox
 * @param {*} buildings
 * @param {*} distance
 */
async function bruteForce(camPoint, crimes, crimeCoords, bbox, buildings, distance) {
  let current = camPoint

  // Generate cam coverage based on current coordinates
  let currentCam = await generate(buildings, bbox, [current], distance)
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
    let gridArea = createGridOvercaptureArea(parseFloat(data.start.split(",")[1]), parseFloat(data.start.split(",")[0]), buildings, data.distance, data.gridDensity)
    let bbox = data.boundingBox
    let crimes = data.crimes
    let crimeCoords = Object.keys(data.crimes)

    allPoints = []

    if (data.useReinforcement) {
      let point = current.geometry
      await reinforcement(point, crimes, crimeCoords, bbox, buildings, data.distance)
    } else {
      turf.featureEach(gridArea, async function(current, index) {
        let point = current.geometry
        await bruteForce(point, crimes, crimeCoords, bbox, buildings, data.distance)
      })
    }


    return {gridArea: gridArea, allPoints: allPoints}
}

export { runAi }
