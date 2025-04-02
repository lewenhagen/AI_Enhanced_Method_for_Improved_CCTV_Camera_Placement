import express from 'express'
import { getIntersectingBuildings, getIntersectingBuildingsPolyline, getIntersectingBuildingsAI } from './src/functions.js'
import { generate } from './src/generate.js'
// import { createGrid } from './src/createGrid.js'
import { polygonDivide } from './src/voronoi.js'
// import { bbox } from '@turf/turf'

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
      let data = await getIntersectingBuildingsAI(req.body.center, req.body.distance)
      data.crimes = await getCrimesInPolygon(data.boundingBox, data.buildings)

      let crimes = {}
      for (const crime of data.crimes) {
        let location = `${crime.longitude},${crime.latitude}`
        
        if(crimes[location] !== undefined) {
            crimes[location].count++
            let temp = {
              count: 1
            }
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
      res.json({"status": "Ok", "data": data})
    } catch(e) {
      res.json({"status": "error", "message": e})
    }
})

app.post("/generare-area-without-buildings", async (req, res) => {
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
    await runAi(aiData)
    // areaWithoutBuildings 
    // aiData.center
    
    
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
