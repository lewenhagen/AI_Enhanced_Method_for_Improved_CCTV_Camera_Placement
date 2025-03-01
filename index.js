import express from 'express'
import { getIntersectingBuildings } from './src/functions.js'
import { generate } from './src/generate.js'
// import { createGrid } from './src/createGrid.js'
import { polygonDivide } from './src/voronoi.js'
// import { bbox } from '@turf/turf'

import { walkAlongBuilding } from './src/walk.js'


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
      let walkerResult = await walkAlongBuilding(data, req.body.distance, req.body.nrOfCams)




      // console.log(walkerResult)
      // console.log(walkerResult.length)

      // console.log(walkerResult[0])
      // console.log(walkerResult[walkerResult.length-1])
      // console.log(walkerResult[2])
      // let grid = await polygonDivide(req.body.bbox, req.body.nrOfCams)
      // let coverage = await generate(data.buildings, req.body.bbox, grid.centroids, req.body.distance)

      // console.log(`
      //   Areas (m\u00B2)
      //   ----------------------
      //   Boundingbox:            ${data.boundingBoxArea.toFixed(2)}
      //   Voronoi:                ${grid.areas.toFixed(2)}
      //   Buildings:              ${data.buildingArea.toFixed(2)}
      //   BBox without buildings: ${(data.boundingBoxArea - data.buildingArea).toFixed(2)}
      //   Coverage (union):       ${coverage.area.toFixed(2)}

      //   Percentage (%)
      //   ----------------------
      //   Coverage:               ${((coverage.area/(data.boundingBoxArea - data.buildingArea))*100).toFixed(2)}
      //   `)

      // res.json({"status": "Ok", "data": data, "coverage": coverage, "grid": grid})
      res.json({"status": "Ok", "data": data, "walker": walkerResult})
    } catch(e) {
      res.json({"status": "error", "message": e})
    }
})



app.listen(port, () => {
    console.log(`Server up and running on port: ${port}`)
})
