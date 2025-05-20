import * as turf from '@turf/turf'
import { Worker } from 'worker_threads'
import os from 'os'
import { generate } from './generateCoverageArea.js'
import { setupGridAndBuildings, move, getRandomPointFromGrid } from './reinforcement.js'

const THREAD_COUNT = os.cpus().length
let allPoints = []
let bbox = []
let buildings = []
let crimes = []
let crimeCoords = {}
let gridDensity = -1
let distance = -1
// const bearings = [0, , 45, 90, 135, 180, 225, 270]

/**
 * Create a worker.
 * @param {array} chunk The array to work on.
 * @returns {Promise} The resulting Promise.
 */
function createWorker(chunk, boundingBox) {
  return new Promise(function (resolve, reject) {
      const worker = new Worker(`./src/worker.js`, {
          workerData: {chunk, boundingBox}
      })
      worker.on("message", (data) => {
          worker.terminate()
          resolve(data)
      })
      worker.on("error", (msg) => {
          reject(`An error ocurred: ${msg}`)
      })
  })
}

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
  if (directions.length === 0) {
    directions = ["up", "down", "left", "right"]
  }
  const randomIndex = Math.floor(Math.random() * directions.length)
  const poppedDirection = directions.splice(randomIndex, 1)[0]

  return poppedDirection
}

async function takeStepInGridCalculateScore(dir, currentPoint) {
  let currentCam = await generate(buildings, bbox, [currentPoint], distance)
  currentCam = currentCam[0]
  let nextPoint = await move(currentPoint, dir)
  if (!nextPoint.success) {
    return false
  }
  // let camCoverage = await generate(buildings, bbox, [nextPoint.point.geometry], distance)
  // camCoverage = camCoverage[0]

  let scoreObject = await calculateScore(currentCam, nextPoint.point.geometry, crimeCoords, crimes)

  return {point: nextPoint, score: scoreObject}
}

async function calculateScore(currentCam, currentPoint) {
  let totalCount = 0
  let totalDistance = 0
  let crimeCount = 0
  currentCam.connectedCrimes = []
  currentCam.score = 0
  for (const coord of crimeCoords) {
    let crimeAsPoint = turf.point([parseFloat(coord.split(",")[0]), parseFloat(coord.split(",")[1])])

    if (turf.booleanPointInPolygon(crimeAsPoint, currentCam.polygon)) {
      let distance = turf.distance(currentPoint, crimeAsPoint) * 1000

      currentCam.connectedCrimes.push({
        crimeInfo: crimes[coord],
        distance: distance,
        uniqueCount: crimes[coord].count,
        prescore: crimes[coord].count / distance
      })

      crimeCount++
      totalCount += crimes[coord].count // denna sist
      totalDistance += distance
    }
    // calculate score here!!
    // currentCam.score = 0
    let allPreScore = 0
    for (const crime of currentCam.connectedCrimes) {
      allPreScore += crime.prescore
    }

    currentCam.score = parseFloat((allPreScore / totalCount).toFixed(4)) || 0
    
  }

  return {
    "camInfo": currentCam,
    "totalCrimeCount": crimeCount,
    "totalCount": totalCount,
    "totalDistance": totalDistance
  }
}

async function reinforcement(grid) {
  // score per crime location: count / distance
  // score per cam location: crime score / total crimes found
  // color the path in the output!
  // crimes = inputCrimes
  // crimeCoords = inputCrimeCoords
  // bbox = inputBbox
  // buildings = inputBuildings
  // distance = inputDistance
  // gridDensity = inputGridDensity
  let result = []

  await setupGridAndBuildings(grid, buildings, gridDensity)

  let startPoint = await (await getRandomPointFromGrid()).geometry
  let lastPoint = {}
  // let nextCam = {}
  let currentCam = {}
  let i = 0

  let startCam = await generate(buildings, bbox, [startPoint], distance)
  startCam = startCam[0]
  currentCam = startCam
  lastPoint = startPoint
  let lastScore = await calculateScore(startCam, startPoint)
  allPoints.push( lastScore )

  // console.log("start score: " + lastScore.camInfo.score)
  let dir = await getRandomDirection()
  while (i < 100) {
    // let dir = await getRandomDirection()
    let stepObject = await takeStepInGridCalculateScore(dir, lastPoint)
    
    if (stepObject !== false) {
      if (stepObject.score.camInfo.score > lastScore.camInfo.score) {
        // dir = await getRandomDirection()
        allPoints.push( stepObject.score )
        lastPoint = stepObject.point.point.geometry
        lastScore = stepObject.score
        
      } else {
        dir = await getRandomDirection()
      }
    } else {
      // console.log("Hitting building or outside")
      // console.log("Moving on")
    }
    
    i++
  }

  // for (const item of allPoints) {
  //   console.log("###########################")
  //   for (const c of item.camInfo.connectedCrimes) {
  //     console.log(`
  //       Distance: ${c.distance}
  //       Unique count: ${c.uniqueCount}
  //       Pre score: ${c.prescore}
  //       `)
  //   }
  //   console.log("###########################")
    
  // }
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
  let camObject = await calculateScore(currentCam, camPoint, crimeCoords, crimes)
  allPoints.push( camObject )
  // console.log(camObject)
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

  // allPoints.push( {
  //   "camInfo": currentCam,
  //   "totalCrimeCount": crimeCount,
  //   "totalCount": totalCount,
  //   "totalDistance": totalDistance
  // })
}

async function runAi(data) {
    // console.log(data)
    buildings = data.buildings
    let gridArea = createGridOvercaptureArea(parseFloat(data.start.split(",")[1]), parseFloat(data.start.split(",")[0]), buildings, data.distance, data.gridDensity)
    bbox = data.boundingBox
    crimes = data.crimes
    crimeCoords = Object.keys(data.crimes)
    distance = data.distance
    gridDensity = data.gridDensity
    // console.log(crimes)
    allPoints = []

    if (data.useReinforcement) {
      // let point = turf.point([parseFloat(data.start.split(",")[1]), parseFloat(data.start.split(",")[0])])
      await reinforcement(gridArea)
      console.log("Number of steps: " + allPoints.length)

    } else {
      let features = gridArea.features
      await Promise.all(
        features.map(async (current) => {
          let point = current.geometry;
          await bruteForce(point, crimes, crimeCoords, bbox, buildings, data.distance);
        })
      )

      // turf.featureEach(gridArea, async function(current, index) {
      //   let point = current.geometry
      //   // console.log(allPoints)
      //   let result = await bruteForce(point, crimes, crimeCoords, bbox, buildings, data.distance)
      //   allPoints.push(result)
      //   // console.log(allPoints)
      // })
    }
    // console.log(allPoints)
    return {gridArea: gridArea, allPoints: allPoints}
}

export { runAi }


// totalt brott inom CA
// vikta  antal brott / distance
// summera alla per position och dela med totalt antal brott fångade
