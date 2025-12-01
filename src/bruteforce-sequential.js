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
  let startLoc = process.argv[2]
  let dist = process.argv[3]
  let distWeight = process.argv[4]
  let year = process.argv[5]

  SILENT=true
  let json = []

  const start = performance.now()
  
  let data = await initBruteforce(startLoc, dist, 5, distWeight, 1, year)
  
  const end = performance.now()
  const elapsed = end - start
  const totalCount = Object.values(data.crimes)
      .reduce((sum, item) => sum + item.count, 0);
  
    console.log(JSON.stringify(
      {
        "num_startpoints": data.gridArea.features.length,
        "exec_time": Math.round((elapsed/1000)*1000)/1000,
        "best_score": data.allPoints[0].camInfo.score,
        "ind_time": null,
        "avg_time": null,
        "steps": data.gridArea.features.length,
        "total_crimes": totalCount,
        "seen_crimes": data.allPoints[0].totalCount,
        "unique_crime_coords": data.allPoints[0].totalCrimeCount
      }
    )
  );
  
}

export { initBruteforce }
