import { generate } from './generateCoverageArea.js'
import { scoreCalculation } from './scoreCalculation.js'
import { createGridOvercaptureArea } from './helpers.js'
import { getIntersectingBuildingsAI } from './intersectingBuildings.js'
import { getCrimesInPolygon } from './getCrimesInPolygon.js'
import { getAllCrimesAvailable } from './getAllCrimesAvailable.js'
import { fixCrimes } from './helpers.js'
import { promises as fs } from 'fs'


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

  !SILENT && console.log("Bruteforce best score: " + allpoints[0].camInfo.score)

  return {
    allPoints: allpoints,
    gridArea: gridArea,
    buildings: data.buildings,
    crimes: data.crimes,
    boundingBox: data.boundingBox
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // console.log(process.argv[2])
  let startLoc = process.argv[2]
  let dist = process.argv[3]
  let distWeight = process.argv[4]
  let year = process.argv[5]

  SILENT=true
  let json = []

  const start = performance.now()
  // console.time("Random walk exec time")
  // center, distance, gridSize, dist_weight, bigN (0 or 1), year
  let data = await initBruteforce(startLoc, dist, 5, distWeight, 1, year)
  // console.timeEnd("Random walk exec time")
  const end = performance.now()
  const elapsed = end - start
  // console.log(`Bruteforce exec time: ${Math.round((elapsed/1000)*1000)/1000}, best score: ${data.allPoints[0].camInfo.score}, steps: ${data.gridArea.features.length}`)
  json.push({
    "nr": 1,
    "score": data.allPoints[0].camInfo.score,
    "distance": data.allPoints[0].camInfo.totalDistance,
    "steps": data.gridArea.features.length,
    "time": Math.round((elapsed/1000)*1000)/1000
  })

  // console.log(JSON.stringify({
  //   "bruteforce",
  //   "score": data.allPoints[0].camInfo.score,
  //   "distance": data.allPoints[0].camInfo.totalDistance,
  //   "steps": data.gridArea.features.length,
  //   "time": Math.round((elapsed/1000)*1000)/1000
  // }));
  // data.allPoints[0].camInfo.totalDistance,
  // console.log(data.allPoints[0].camInfo)
    console.log(
      ["Bruteforce",
      dist,
      data.gridArea.features.length,
      Math.round((elapsed/1000)*1000)/1000,
      data.allPoints[0].camInfo.score]
    );
  await fs.writeFile('bruteforce.json', JSON.stringify(json, null, 2), 'utf8')


  // console.time("Brute force exec time")
  // // center, distance, gridSize, dist_weight, bigN, year (YYYY or "all")
  // await initBruteforce("55.5636, 12.9746", 100, 5, 0.2, 1, "all")
  // console.timeEnd("Brute force exec time")



}

export { initBruteforce }
