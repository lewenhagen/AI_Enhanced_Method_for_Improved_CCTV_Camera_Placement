import express from 'express'
import { getIntersectingBuildings } from './src/functions.js'
import { generate } from './src/generate.js'
import { createGrid } from './src/createGrid.js'
import { polygonDivide } from './src/createSubAreas.js'
import { bbox } from '@turf/turf'


const app = express()
const port = 1337

app.use(express.static("public"))
app.use(express.json())

app.get("/", (req, res) => {
    res.send("index.html")
});

app.post("/init", async (req, res) => {
    // try {
      let data = await getIntersectingBuildings(req.body.bbox)
      let grid = await polygonDivide(req.body.bbox, req.body.nrOfCams)
      let coverage = await generate(data.buildings, req.body.bbox, grid.centroids, req.body.distance)

      console.log("Boundingbox Area:", data.boundingBoxArea)
      console.log("Building Area:", data.buildingArea)
      console.log("Coverage Area:", coverage.area)
      console.log("Parts Areas:", grid.areas)
      console.log("Area without buildings:", data.boundingBoxArea - data.buildingArea)
      console.log("Coverage %:", coverage.area/(data.boundingBoxArea - data.buildingArea))
      // let cam = await generate(data.buildings, req.body.bbox, req.body.nrOfCams, req.body.distance)
      // let grid = await createGrid(req.body.distance, req.body.bbox)


      res.json({"status": "Ok", "data": data, "coverage": coverage, "grid": grid})
    // } catch(e) {
      // res.json({"status": "error", "message": e.codeName})
    // }



})

app.listen(port, () => {
    console.log(`Server up and running on port: ${port}`)
})
