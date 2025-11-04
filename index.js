import express from 'express'
import os from 'os'
import { getIntersectingBuildingsAI } from './src/intersectingBuildings.js'
import { getCrimesInPolygon } from './src/getCrimesInPolygon.js'
import { getAllCrimesAvailable } from './src/getAllCrimesAvailable.js'
import { getAreaWithoutBuildings } from './src/getAreaWithoutBuildings.js'
import { runAi } from './src/runAi.js'
import { normalizeScoreForVisualization, normalizeScoreForBuildingWalkVisualization } from './src/scoreCalculation.js'
import { fixCrimes } from './src/helpers.js'
import { initBruteforce } from './src/bruteforce.js'
import { initRandomWalk } from './src/randomwalk.js'
import { initBuildingwalk } from './src/buildingwalk.js'

const app = express()
const port = 1337
const cpus = os.cpus().length
let aiData = null

app.use(express.static("public"))
app.use(express.json())
app.set("view engine", "ejs")

app.get("/", (req, res) => {
    res.render("index.ejs", {cpus: cpus})
})



app.post("/load-data", async (req, res) => {
    try {
      console.time("### Get all intersecting buildings")
      let data = await getIntersectingBuildingsAI(req.body.center, req.body.distance)
      console.timeEnd("### Get all intersecting buildings")
      console.time("### Get all crimes in r*2 bounding box")
      // data.crimes = await getCrimesInPolygon(data.boundingBox, data.buildings)
      if (req.body.scoreNorm == 1) {
        data.bigN = await getAllCrimesAvailable()
      } else if (req.body.scoreNorm == 2) {
        data.bigN = data.crimes.length
      }

      console.timeEnd("### Get all crimes in r*2 bounding box")


      data.crimes = await fixCrimes(data.crimes)
      aiData = data
      aiData.start = req.body.center
      aiData.distance = parseFloat(req.body.distance)
      aiData.gridDensity = parseFloat(req.body.gridDensity)
      aiData.useRandomWalk = req.body.useRandomWalk
      aiData.maxSteps = req.body.maxSteps
      aiData.startingPos = req.body.startingPos
      // aiData.prescoreWeight = req.body.prescoreWeight
      // aiData.crimecountWeight = req.body.crimecountWeight
      aiData.distanceWeight = req.body.distanceWeight
      // console.log(req.body.prescoreWeight)
      res.json({"status": "Ok", "data": data})
    } catch(e) {
      res.json({"status": "error", "message": e})
    }
})

app.post("/generate-area-without-buildings", async (req, res) => {
    let response = {}
    response.status = "error"

    aiData.areaWithoutBuildings = await getAreaWithoutBuildings(aiData)
    if (aiData.areaWithoutBuildings !== null) {
        response.status = "ok"
        response.area = aiData.areaWithoutBuildings
    }

    res.json(response)
})

app.post("/run-randomwalk", async (req, res) => {
  let response = {}

  // Time the execution
  console.time("### Random walk exec time")
  response = await initRandomWalk(
    req.body.center, req.body.distance,
    req.body.gridDensity, req.body.distanceWeight,
    req.body.bigN, req.body.maxSteps, req.body.startingPos, req.body.year)
  console.timeEnd("### Random walk exec time")

  console.log(`Grid size: ${response.gridArea.features.length} points`)

  res.json(response)
})

app.post("/run-bruteforce", async (req, res) => {

  let response = {}

  console.time("### Bruteforce exec time")
  response = await initBruteforce(req.body.center, req.body.distance, req.body.gridDensity, req.body.distanceWeight, req.body.bigN, req.body.year)
  console.timeEnd("### Bruteforce exec time")
  console.log(`Grid size: ${response.gridArea.features.length} points`)

  const features = response.gridArea.features

  /**
   * Set the new features to the response
   */
  response.gridArea.features = await normalizeScoreForVisualization(response.allPoints, features)

  res.json(response)
})


app.post("/run-buildingwalk", async (req, res) => {

  let response = {}

  console.time("### Building walk exec time")
  response = await initBuildingwalk(req.body.center, req.body.distance, req.body.gridDensity, req.body.distanceWeight, req.body.bigN, req.body.year, req.body.steps)
  console.timeEnd("### Building walk exec time")
  // console.log(`Grid size: ${response.gridArea.features.length} points`)

  // const features = response.gridArea.features

  // /**
  //  * Set the new features to the response
  //  */
  // response.gridArea.features = await normalizeScoreForVisualization(response.allPoints, features)
  response.allPoints = await normalizeScoreForBuildingWalkVisualization(response.allPoints)
  // console.log(response.allPoints[0])
  res.json(response)
})


app.post("/run-ai", async (req, res) => {
    let response = {}

    // Time the execution
    console.time("### Generate grid calculations")
    response.result = await runAi(aiData)
    console.timeEnd("### Generate grid calculations")

    console.log(`Grid size: ${response.result.gridArea.features.length} points`)

    if (!aiData.useRandomWalk) {
      // score = calculated score
      // totalCount = Total crimes
      // totalCrimeCount = total unique crime coordinates
      response.result.allPoints.sort((a, b) => {
        return (
          // b.totalCrimeCount - a.totalCrimeCount ||
          b.camInfo.score - a.camInfo.score ||
          // b.totalCount - a.totalCount
          // b.camInfo.score - a.camInfo.score ||
          // b.totalCount - a.totalCount ||
          // b.totalCrimeCount - a.totalCrimeCount || // Sort first on unique crime coordinates
          //            // Sort second on total crime occurances
          a.totalDistance - b.totalDistance        // Sort last on the distance
        )
      })

      const allPoints = response.result.allPoints
      const features = response.result.gridArea.features

      /**
       * Set the new features to the response
       */
      // response.result.gridArea.features = features
      response.result.gridArea.features = await normalizeScoreForVisualization(allPoints, features)

      console.log("Bruteforce best score: " + response.result.allPoints[0].camInfo.score)
    }
    // else {
    //   for (const points of response.result.allPoints) {
    //     // console.log(response.result)
    //     const features = response.result.gridArea.features
    //     response.result.gridArea.features = await normalizeScoreForVisualization(points, features)
    //   }
    // }

    // console.log(response.result.gridArea.features[0].properties.opacityScore)

    // console.log(`
    //   Current:
    //   Total count: ${response.result.currentCam.totalCount}
    //   Total distance: ${response.result.currentCam.totalDistance}
    //   Total crime coordinate count: ${response.result.currentCam.totalCrimeCount}
    //   -----------------------------------------------------
    //   Best:
    //   Total count: ${response.result.bestCam.totalCount}
    //   Total distance: ${response.result.bestCam.totalDistance}
    //   Total crime coordinate count: ${response.result.bestCam.totalCrimeCount}
    // `)
    // console.log(response.result.gridArea)
    // console.log(response.result.gridArea.features) // array
    res.json(response)
})




app.listen(port, () => {
    console.log(`Server up and running on port: ${port}`)
})
