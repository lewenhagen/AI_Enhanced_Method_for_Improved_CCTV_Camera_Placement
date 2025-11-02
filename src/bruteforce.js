import { generate } from './generateCoverageArea.js'
import { scoreCalculation } from './scoreCalculation.js'
import { createGridOvercaptureArea } from './helpers.js'
import { getIntersectingBuildingsAI } from './intersectingBuildings.js'
import { getCrimesInPolygon } from './getCrimesInPolygon.js'
import { getAllCrimesAvailable } from './getAllCrimesAvailable.js'
import { fixCrimes } from './helpers.js'

let SILENT = false

let allpoints = []
let data = {}

/**
 * @param {} camPoint
 * @param {*} buildings
 * @param {*} distance
 */
async function bruteForce(bigN, camPoint, distance, distanceWeight) {
  let currentCam = await generate(data.buildings, data.boundingBox, [camPoint], distance)
  currentCam = currentCam[0]

  let camObject = await scoreCalculation(bigN, distanceWeight, currentCam, camPoint, data.crimes, Object.keys(data.crimes))

  allpoints.push( camObject )
}



async function initBruteforce(center, distance, gridDensity, distanceWeight, bigN, year) {
  // console.log(center, distance, gridDensity, distanceWeight, bigN, year)
  allpoints = []
  data = {}

  !SILENT && console.time("### Get all intersecting buildings")
  data = await getIntersectingBuildingsAI(center, distance)
  !SILENT && console.timeEnd("### Get all intersecting buildings")

  !SILENT && console.time("### Get all crimes in r*2 bounding box")
  data.crimes = await getCrimesInPolygon(data.boundingBox, data.buildings, year)
  !SILENT && console.timeEnd("### Get all crimes in r*2 bounding box")

  !SILENT && console.time("### Create grid over capture area")
  let gridArea = await createGridOvercaptureArea(parseFloat(center.split(",")[1]), parseFloat(center.split(",")[0]), distance, gridDensity, data.buildings)
  !SILENT && console.timeEnd("### Create grid over capture area")

  if (bigN == 1) {
    bigN = await getAllCrimesAvailable()
  } else {
    bigN = data.crimes.length
  }
  
  data.crimes = await fixCrimes(data.crimes)
  
  data.distance = parseFloat(distance)
  data.gridDensity = parseFloat(gridDensity)

  await Promise.all(
    gridArea.features.map(async (current) => {
      let point = current.geometry
      await bruteForce(bigN, point, distance, distanceWeight)
    })
  )
  
  allpoints.sort((a, b) => {
    return (
      // b.totalCrimeCount - a.totalCrimeCount ||
      b.camInfo.score - a.camInfo.score ||
      a.totalDistance - b.totalDistance 
    )
  })

  console.log("Bruteforce best score: " + allpoints[0].camInfo.score)

  return {
    allPoints: allpoints,
    gridArea: gridArea,
    buildings: data.buildings,
    crimes: data.crimes,
    boundingBox: data.boundingBox
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  SILENT=true
  console.time("Brute force exec time")
  // center, distance, gridSize, dist_weight, bigN, year (YYYY or "all")
  await initBruteforce("55.5636, 12.9746", 100, 5, 0.2, 1, "2017")
  console.timeEnd("Brute force exec time")
}

export { initBruteforce }