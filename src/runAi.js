import * as turf from '@turf/turf'
import { generate } from './generateCoverageArea.js'
import { setupGridAndBuildings, move, getRandomPointFromGrid } from './reinforcement.js'

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
async function getRandomDirection() {
  let directions = ["up", "down", "left", "right"]

  return directions[Math.floor(Math.random() * directions.length)]
}

async function reinforcement(grid, crimes, crimeCoords, bbox, buildings, distance, gridDensity) {
  // score per crime location: count / distance
  // score per cam location: crime score / total crimes found
  // color the path in the output!
  await setupGridAndBuildings(grid, buildings)
  let currentPoint = await (await getRandomPointFromGrid()).geometry
  // console.log("BEFORE:", currentPoint)

  for (let i = 0; i < 10; i++) {
    let currentCam = await generate(buildings, bbox, [currentPoint], distance)
    currentCam = currentCam[0]

    let totalCount = 0
    let totalDistance = 0
    let crimeCount = 0
    currentCam.connectedCrimes = []

    for (const coord of crimeCoords) {
      let crimeAsPoint = turf.point([parseFloat(coord.split(",")[0]), parseFloat(coord.split(",")[1])])

      if (turf.booleanPointInPolygon(crimeAsPoint, currentCam.polygon)) {
        let distance = turf.distance(currentPoint, crimeAsPoint) * 1000
        currentCam.connectedCrimes.push({
          distance: distance,
          uniqueCount: crimes[coord].count,
          prescore: crimes[coord].count / distance
        })
       
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
    let dir = await getRandomDirection()
    console.log(dir)
    currentPoint = await move(currentPoint, dir, gridDensity)
    
    if (!currentPoint.success) {
      break
    } else {
      currentPoint = currentPoint.point.geometry
    } 
  }  
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
    // console.log(crimes)
    allPoints = []

    if (data.useReinforcement) {
      // let point = turf.point([parseFloat(data.start.split(",")[1]), parseFloat(data.start.split(",")[0])])
      await reinforcement(gridArea, crimes, crimeCoords, bbox, buildings, data.distance, data.gridDensity)
      console.log("Number of steps: " + allPoints.length)
      // for (const item of allPoints) {
      //   console.log(item)
      //   item.camInfo.score = 1
      //   for(const crime of item.camInfo.connectedCrimes) {
      //     console.log(crime)
      //     item.camInfo.score = (crime.prescore / item.camInfo.totalCount)
      //   }
      // }
    } else {
      turf.featureEach(gridArea, async function(current, index) {
        let point = current.geometry
        await bruteForce(point, crimes, crimeCoords, bbox, buildings, data.distance)
      })
    }

    return {gridArea: gridArea, allPoints: allPoints}
}

export { runAi }


// totalt brott inom CA
// vikta  antal brott / distance
// summera alla per position och dela med totalt antal brot fångade
