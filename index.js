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
import { initRandomWalk } from './src/hillclimb.js'
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



app.post("/run-randomwalk", async (req, res) => {
  let response = {}

  // Time the execution
  console.time("### Hill climbing exec time")
  response = await initRandomWalk(
    req.body.center, req.body.distance,
    req.body.gridDensity, req.body.distanceWeight,
    req.body.bigN, req.body.maxSteps, req.body.startingPos, req.body.year)
  console.timeEnd("### Hill climbing exec time")

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

  response.allPoints = await normalizeScoreForBuildingWalkVisualization(response.allPoints)

  res.json(response)
})

app.listen(port, () => {
    console.log(`Server up and running on port: ${port}`)
})


// app.post("/generate-area-without-buildings", async (req, res) => {
//     let response = {}
//     response.status = "error"

//     aiData.areaWithoutBuildings = await getAreaWithoutBuildings(aiData)
//     if (aiData.areaWithoutBuildings !== null) {
//         response.status = "ok"
//         response.area = aiData.areaWithoutBuildings
//     }

//     res.json(response)
// })



// app.post("/load-data", async (req, res) => {
//     try {
//       console.time("### Get all intersecting buildings")
//       let data = await getIntersectingBuildingsAI(req.body.center, req.body.distance)
//       console.timeEnd("### Get all intersecting buildings")
//       console.time("### Get all crimes in r*2 bounding box")
//       // data.crimes = await getCrimesInPolygon(data.boundingBox, data.buildings)
//       if (req.body.scoreNorm == 1) {
//         data.bigN = await getAllCrimesAvailable()
//       } else if (req.body.scoreNorm == 2) {
//         data.bigN = data.crimes.length
//       }

//       console.timeEnd("### Get all crimes in r*2 bounding box")


//       data.crimes = await fixCrimes(data.crimes)
//       aiData = data
//       aiData.start = req.body.center
//       aiData.distance = parseFloat(req.body.distance)
//       aiData.gridDensity = parseFloat(req.body.gridDensity)
//       aiData.useRandomWalk = req.body.useRandomWalk
//       aiData.maxSteps = req.body.maxSteps
//       aiData.startingPos = req.body.startingPos
//       // aiData.prescoreWeight = req.body.prescoreWeight
//       // aiData.crimecountWeight = req.body.crimecountWeight
//       aiData.distanceWeight = req.body.distanceWeight
//       // console.log(req.body.prescoreWeight)
//       res.json({"status": "Ok", "data": data})
//     } catch(e) {
//       res.json({"status": "error", "message": e})
//     }
// })
