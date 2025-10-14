import express from 'express'
import { getIntersectingBuildingsAI } from './src/intersectingBuildings.js'
import { getCrimesInPolygon } from './src/getCrimesInPolygon.js'
import { getAllCrimesAvailable } from './src/getAllCrimesAvailable.js'
import { getAreaWithoutBuildings } from './src/getAreaWithoutBuildings.js'
import { runAi } from './src/runAi.js'
import { normalizeScoreForVisualization } from './src/scoreCalculation.js'

const app = express()
const port = 1337

let aiData = null

app.use(express.static("public"))
app.use(express.json())
app.set("view engine", "ejs")

app.get("/", (req, res) => {
    res.render("index.ejs")
})



app.post("/load-ai-data", async (req, res) => {
    try {
      console.time("### Get all intersectiong buildings")
      let data = await getIntersectingBuildingsAI(req.body.center, req.body.distance)
      console.timeEnd("### Get all intersectiong buildings")
      console.time("### Get all crimes in r*2 bounding box")
      data.crimes = await getCrimesInPolygon(data.boundingBox, data.buildings)
      data.bigN = await getAllCrimesAvailable()
      console.timeEnd("### Get all crimes in r*2 bounding box")
  
      /**
       * Fixes the crimes for the rest of the calculations
       */
      let crimes = {}
      for (const crime of data.crimes) {
        let location = `${crime.longitude},${crime.latitude}`

        if(crimes[location] !== undefined) {
            crimes[location].count++

            if (crimes[location].codes[crime.crime_code] !== undefined) {

              crimes[location].codes[crime.crime_code].count++
            } else {
              crimes[location].codes[crime.crime_code] = {count: 1}
            }
        } else {
          crimes[location] = {
              count: 1,
              codes: {},
              feature: crime.location
          }
          crimes[location].codes.count = 1
        }
      }
      data.crimes = crimes
      aiData = data
      aiData.start = req.body.center
      aiData.distance = parseFloat(req.body.distance)
      aiData.gridDensity = parseFloat(req.body.gridDensity)
      aiData.useReinforcement = req.body.useReinforcement
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

app.post("/run-ai", async (req, res) => {
    let response = {}

    /**
     * aiData contains:
     * Crimes
     * Start coordinates
     * Distance
     * Grid density
    **/

    // Time the execution
    console.time("### Generate grid calculations")
    response.result = await runAi(aiData)
    console.timeEnd("### Generate grid calculations")

    console.log(`Grid size: ${response.result.gridArea.features.length} points`)

    if (!aiData.useReinforcement) {
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
      // let scores = []

      // scores = allPoints.map(p => p.camInfo.score)

      // const max = Math.max(...scores)

      // // Normalize the scores
      // const normalized = scores.map(v => Math.pow(Math.log(v + 1) / Math.log(max + 1), 0.5))
      // console.log(`Normalized max score: ${normalized}`)
      // // A keyholder function from coordinates
      // const coordKey = coords => coords.join(',')

      // const scoreMap = new Map()

      // allPoints.forEach((point, i) => {
      //   const key = coordKey(point.camInfo.center.coordinates)

      //   scoreMap.set(key, normalized[i])
      // })

      // /**
      //  * For each feature in grid, set opacityscore to use clientside
      //  */
      // features.forEach(feature => {
      //   const key = coordKey(feature.geometry.coordinates)
      //   const normScore = scoreMap.get(key)

      //   feature.properties.opacityScore = normScore ?? 0
      // })

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
