import express from 'express'
import { getIntersectingBuildings, getIntersectingBuildingsPolyline, getIntersectingBuildingsAI } from './src/intersectingBuildings.js'
import { generate } from './src/generate.js'
// import { createGrid } from './src/createGrid.js'
import { polygonDivide } from './src/voronoi.js'
import { walkAlongBuilding, walkAlongBuildingPolyline } from './src/walk.js'
import { calculateLineCoverage } from './src/calculateLineCoverage.js'
import { getCrimesInPolygon } from './src/getCrimesInPolygon.js'
import { getAreaWithoutBuildings } from './src/getAreaWithoutBuildings.js'
import { runAi } from './src/runAi.js'


const app = express()
const port = 1337

let aiData = null

app.use(express.static("public"))
app.use(express.json())
app.set("view engine", "ejs")

app.get("/", (req, res) => {
    res.render("index.ejs")
})

app.get("/ai", (req, res) => {
  res.render("ai.ejs")
})



app.post("/init", async (req, res) => {

    try {
      let data = await getIntersectingBuildings(req.body.bbox)

      let grid = await polygonDivide(req.body.bbox, req.body.nrOfCams)
      let coverage = await generate(data.buildings, req.body.bbox, grid.centroids, req.body.distance)

      console.log(`
        Areas (m\u00B2)
        ----------------------
        Boundingbox:            ${data.boundingBoxArea.toFixed(2)}
        Voronoi:                ${grid.areas.toFixed(2)}
        Buildings:              ${data.buildingArea.toFixed(2)}
        BBox without buildings: ${(data.boundingBoxArea - data.buildingArea).toFixed(2)}
        Coverage (union):       ${coverage.area.toFixed(2)}

        Percentage (%)
        ----------------------
        Coverage:               ${((coverage.area/(data.boundingBoxArea - data.buildingArea))*100).toFixed(2)}
        `)

      res.json({"status": "Ok", "data": data, "coverage": coverage, "grid": grid})
    } catch(e) {
      res.json({"status": "error", "message": e.codeName})
    }
})

app.post("/getbuildings", async (req, res) => {
  try {
    let data = await getIntersectingBuildings(req.body.bbox)

    res.json({"status": "Ok", "data": data})
  } catch(e) {
    res.json({"status": "error", "message": e})
  }
})

app.post("/getcrimes", async (req, res) => {
  try {
    // console.log(req.body.bbox)
    let data = await getCrimesInPolygon(req.body.bbox)

    res.json({"status": "Ok", "data": data})
  } catch(e) {
    res.json({"status": "error", "message": e})
  }
})

app.post("/load-ai-data", async (req, res) => {
    try {
      console.time("### Get all intersectiong buildings")
      let data = await getIntersectingBuildingsAI(req.body.center, req.body.distance)
      console.timeEnd("### Get all intersectiong buildings")
      console.time("### Get all crimes in r*2 bounding box")
      data.crimes = await getCrimesInPolygon(data.boundingBox, data.buildings)
      console.timeEnd("### Get all crimes in r*2 bounding box")

      let crimes = {}
      for (const crime of data.crimes) {
        let location = `${crime.longitude},${crime.latitude}`

        if(crimes[location] !== undefined) {
            crimes[location].count++
            // let temp = {
            //   count: 1
            // }
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
      aiData.prescoreWeight = req.body.prescoreWeight
      aiData.crimecountWeight = req.body.crimecountWeight
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

    // for (const index in response.result.allPoints) {
    //   console.log(`Simulation ${index+1} steps: ${response.result.allPoints[index].length}`)
    // }

    // if (aiData.useReinforcement) {
    //   let max = []
    // }

    if (!aiData.useReinforcement) {
      // score = calculated score
      // totalCount = Total crimes
      // totalCrimeCount = total unique crime coordinates
      response.result.allPoints.sort((a, b) => {
        return (
          // b.totalCrimeCount - a.totalCrimeCount ||
          b.camInfo.score - a.camInfo.score
          // b.totalCount - a.totalCount
          // b.camInfo.score - a.camInfo.score ||
          // b.totalCount - a.totalCount ||
          // b.totalCrimeCount - a.totalCrimeCount || // Sort first on unique crime coordinates
          //            // Sort second on total crime occurances
          // a.totalDistance - b.totalDistance        // Sort last on the distance
        )
      })
      // const allPoints = response.result.allPoints
      // const features = response.result.gridArea.features

      // const scores = allPoints.map(p => p.camInfo.score)
      // // const scores = allPoints.map(p => p.totalCrimeCount)


      // const max = Math.max(...scores)
      // // const min = Math.min(...scores)

      // // Normalize the scores
      // // const normalized = scores.map(v => (v - min) / (max - min))
      // // const normalized = scores.map(v => Math.log(v + 1) / Math.log(max + 1))
      // const normalized = scores.map(v => Math.pow(Math.log(v + 1) / Math.log(max + 1), 0.5))
      // // Create a key from coordinates
      // const coordKey = coords => coords.join(',')

      // const scoreMap = new Map()
      // allPoints.forEach((point, i) => {
      //   const key = coordKey(point.camInfo.center.coordinates)
      //   // console.log(normalized[i])
      //   scoreMap.set(key, normalized[i])
      // })

      // features.forEach(feature => {
      //   const key = coordKey(feature.geometry.coordinates)
      //   const normScore = scoreMap.get(key)
      //   // console.log(normScore)
      //   feature.properties.opacityScore = normScore ?? 0
      // })
      // // console.log(features)
      // response.result.gridArea.features = features
      // const scores = response.result.allPoints.map(obj => obj.camInfo.score)
      // const max = Math.max(...scores)
      // const min = Math.min(...scores)

      // const normalized = scores.map(v => (v - min) / (max - min))

      // for (const index in response.result.gridArea.features) {
      //   console.log(response.result.gridArea.features[index].geometry.coordinates)
      //   console.log(response.result.allPoints[index].camInfo.center.coordinates)
      //   response.result.gridArea.features[index].properties.opacityScore = normalized[index]
      // }
      const allPoints = response.result.allPoints
      const features = response.result.gridArea.features
      // for (const item of allPoints) {
      //   console.log(item)
      // }
      let scores = []

      scores = allPoints.map(p => p.camInfo.score)

      // const scores = allPoints.map(p => p.totalCrimeCount)


      const max = Math.max(...scores)
      // const min = Math.min(...scores)

      // Normalize the scores
      // const normalized = scores.map(v => (v - min) / (max - min))
      // const normalized = scores.map(v => Math.log(v + 1) / Math.log(max + 1))
      const normalized = scores.map(v => Math.pow(Math.log(v + 1) / Math.log(max + 1), 0.5))
      // Create a key from coordinates
      const coordKey = coords => coords.join(',')

      const scoreMap = new Map()

      allPoints.forEach((point, i) => {
        const key = coordKey(point.camInfo.center.coordinates)
        // console.log(normalized[i])
        scoreMap.set(key, normalized[i])
      })


      features.forEach(feature => {
        const key = coordKey(feature.geometry.coordinates)
        const normScore = scoreMap.get(key)
        // console.log(normScore)
        feature.properties.opacityScore = normScore ?? 0
      })
      // console.log(features)
      response.result.gridArea.features = features

      console.log("Bruteforce best score: " + response.result.allPoints[0].camInfo.score)
    }




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

app.post("/walk", async (req, res) => {

    try {
      let data = await getIntersectingBuildings(req.body.bbox)
      let walkerResult = await walkAlongBuilding(data, req.body.distance, req.body.nrOfCams, req.body.overlap)
      let coverageAreaPercent = walkerResult.totalArea / (data.boundingBoxArea - data.buildingArea)

      console.log(`
        --------------------------------
        Amount of cameras:      ${walkerResult.polys.length}/${req.body.nrOfCams}
        --------------------------------
        Areas (m\u00B2)
        --------------------------------
        Boundingbox:            ${data.boundingBoxArea.toFixed(2)}
        Buildings:              ${data.buildingArea.toFixed(2)}
        BBox without buildings: ${(data.boundingBoxArea - data.buildingArea).toFixed(2)}
        Coverage (union):       ${walkerResult.totalArea.toFixed(2)}

        Percentage (%)
        --------------------------------
        Coverage:               ${(coverageAreaPercent*100).toFixed(2)}
        --------------------------------
        `)

      res.json({"status": "Ok", "data": data, "walker": walkerResult})
    } catch(e) {
      res.json({"status": "error", "message": e})
    }
})

app.post("/polyline", async (req, res) => {
  // try {
    // let polyline = req.body.polyline
    let data = await getIntersectingBuildingsPolyline(req.body.polyline, req.body.distance)
    let cameras = await walkAlongBuildingPolyline(data, req.body.distance, req.body.nrOfCams, req.body.overlap, req.body.focusLine)
    // await calculateLineCoverage(data.line, cameras.polys)
    // let walkerResult = await walkAlongBuilding(data, req.body.distance, req.body.nrOfCams, req.body.overlap)
    // let coverageAreaPercent = walkerResult.totalArea / (data.boundingBoxArea - data.buildingArea)
    // console.log("covered: ", cameras.lineCovered)
    // console.log(`
    //   --------------------------------
    //   Amount of cameras:      ${walkerResult.polys.length}/${req.body.nrOfCams}
    //   --------------------------------
    //   Areas (m\u00B2)
    //   --------------------------------
    //   Boundingbox:            ${data.boundingBoxArea.toFixed(2)}
    //   Buildings:              ${data.buildingArea.toFixed(2)}
    //   BBox without buildings: ${(data.boundingBoxArea - data.buildingArea).toFixed(2)}
    //   Coverage (union):       ${walkerResult.totalArea.toFixed(2)}

    //   Percentage (%)
    //   --------------------------------
    //   Coverage:               ${(coverageAreaPercent*100).toFixed(2)}
    //   --------------------------------
    //   `)

    res.json({"status": "Ok", "data": data, "cameras": cameras})
  // } catch(e) {
    // res.json({"status": "error", "message": e})
  // }
})



app.listen(port, () => {
    console.log(`Server up and running on port: ${port}`)
})
