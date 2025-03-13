import express from 'express'
import { getIntersectingBuildings, getIntersectingBuildingsPolyline } from './src/functions.js'
import { generate } from './src/generate.js'
// import { createGrid } from './src/createGrid.js'
import { polygonDivide } from './src/voronoi.js'
// import { bbox } from '@turf/turf'

import { walkAlongBuilding, walkAlongBuildingPolyline } from './src/walk.js'
import { calculateLineCoverage } from './src/calculateLineCoverage.js'


const app = express()
const port = 1337

app.use(express.static("public"))
app.use(express.json())

app.get("/", (req, res) => {
    res.send("index.html")
});



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
