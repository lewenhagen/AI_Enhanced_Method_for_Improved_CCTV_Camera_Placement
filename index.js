import express from 'express'
import { getBuildings } from './src/functions.js'


const app = express()
const port = 1337

app.use(express.static("public"))
app.use(express.json())

app.get("/", (req, res) => {
    res.send("index.html")
});

app.post("/init", (req, res) => {
    getBuildings(req.body.key)
    res.json({"status": "FUCK YOU"})
});

app.listen(port, () => {
    console.log(`Server up and running on port: ${port}`)
})
