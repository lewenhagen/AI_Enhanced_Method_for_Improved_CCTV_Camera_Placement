import express from 'express'
import { getIntersectingBuildings } from './src/functions.js'


const app = express()
const port = 1337

app.use(express.static("public"))
app.use(express.json())

app.get("/", (req, res) => {
    res.send("index.html")
});

app.post("/init", async (req, res) => {
    let data = await getIntersectingBuildings(req.body.bbox)

    res.json({"status": "Ok", "data": data})
})

app.listen(port, () => {
    console.log(`Server up and running on port: ${port}`)
})
