import express from 'express'
import { getIntersectingBuildings } from './src/functions.js'
import { generate } from './src/generate.js'


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
      let cam = await generate(data.buildings, req.body.bbox)
      res.json({"status": "Ok", "data": data, "cam": cam})
    // } catch(e) {
      // res.json({"status": "error", "message": e.codeName})
    // }
    

    
})

app.listen(port, () => {
    console.log(`Server up and running on port: ${port}`)
})
