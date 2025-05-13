const theForm = document.getElementById("theForm")
const okButton = document.getElementById("okButton")
const cancelButton = document.getElementById("cancelButton")
const loadAiBtn = document.getElementById("loadAiBtn")
const animate = document.getElementById("animate")
const theBestBtn = document.getElementById("getBest")

let bruteForceData = []
let myInterval = null
let isPaused = false



async function drawBoundingBoxWithoutBuildings() {
  const headers = { 'Content-Type': 'application/json' }

  try {
    const response = await fetch('/generate-area-without-buildings', {
        method: 'POST',
        headers: headers
    });

    const data = await response.json()

    L.geoJSON(data.area, {color: "green"}).addTo(drawnAi)

    } catch (error) {
        console.error('Error fetching:', error);
    }
}

async function runAI() {
  const headers = { 'Content-Type': 'application/json' }

  try {
      const response = await fetch('/run-ai', {
          method: 'POST',
          headers: headers,
          // body: JSON.stringify({ })
      });

      const data = await response.json();
      bruteForceData = data
      
      L.geoJSON(data.result.gridArea, {
        pointToLayer: (feature, latlng) =>
          L.circleMarker(latlng, {
            radius: 0.05,
            color: 'black',
            fillOpacity: 1
          })
      }).addTo(drawnAi)

      animate.disabled = false
      theBestBtn.disabled = false

  } catch (error) {
      console.error('Error fetching:', error);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Retry after 1 second
  }

}



function drawBoundingBox(box) {
    drawnAi.addLayer(L.geoJSON(box).setStyle({"opacity": 0.9, "width": "2px", "color":"#000", "fill": false}))
}

function drawBuildings(buildings) {
  for (const building of buildings) {
      drawnAi.addLayer(L.geoJSON(building))
  }
}

function drawCrimes(crimes) {
  const keys = Object.keys(crimes)
  const geojsonPoints = {
    type: "FeatureCollection",
    features: keys.map(crime => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [
          parseFloat(crimes[crime].feature.coordinates[0]),  // Convert to number
          parseFloat(crimes[crime].feature.coordinates[1])    // Convert to number
        ]
      },
      properties: {
        codes: `${Object.keys(crimes[crime].codes).toString()}}`, 
        count: crimes[crime].count
      }
    }))
  }
  L.geoJSON(geojsonPoints, {
    pointToLayer: (feature, latlng) => 
      L.circleMarker(latlng, {
        radius: 5,             // Adjust size
        color: "red",          // Border color
        fillColor: "red",      // Fill color
        fillOpacity: 1         // Solid fill
      }).bindPopup(`Crimes: ${feature.properties.count} Codes: ${feature.properties.codes.split(",").length})`)
  }).addTo(drawnAi)
 
}

const map = L.map('map', {
  center: L.latLng(55.5636, 12.9746),
  zoom: 18,
})

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: `&copy
  <a href="https://www.openstreetmap.org/copyright">
  OpenStreetMap</a> contributors`,
  maxZoom: 20,
  maxNativeZoom: 19
}).addTo(map)

document.getElementById('map').style.cursor = 'crosshair'

let baseLine = new L.FeatureGroup()
let drawnItems = new L.FeatureGroup()
let drawnAi = new L.FeatureGroup()

map.addLayer(drawnItems)
map.addLayer(drawnAi)
map.addLayer(baseLine)

// let drawControl = new L.Control.Draw({
//     edit: {
//         featureGroup: drawnItems
//     },
//     draw: {
//         polygon: true,
//         polyline: true,
//         rectangle: true,
//         circle: false,
//         marker: false
//     }
// })

// map.addControl(drawControl)
L.control.polylineMeasure({
}).addTo(map)


map.on("click", function(e) {
  console.log(e.latlng.lng, e.latlng.lat)
})



loadAiBtn.addEventListener("click", async function(event) {
    drawnAi.clearLayers()
    drawnItems.clearLayers()
    clearInterval(myInterval)

    animate.disabled = true
    theBestBtn.disabled = true

    let center = document.getElementById("center").value
    let distance = parseInt(document.getElementById("distance").value)
    let gridDensity = parseInt(document.getElementById("gridDensity").value)
    let useReinforcement = document.getElementById("reinforcement").checked

    let response = await fetch('/load-ai-data', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          center: center,
          distance: distance,
          gridDensity: gridDensity,
          useReinforcement: useReinforcement
      })
    })

    let json = await response.json() 
    
    drawBoundingBox(json.data.boundingBox)
    drawBoundingBoxWithoutBuildings()
    drawBuildings(json.data.buildings)
    drawCrimes(json.data.crimes)

    await runAI()
})

animate.addEventListener("click", function(event) {
  let i = 0
  
  myInterval = setInterval(function() {
    if (i === bruteForceData.length) {
      clearInterval(myInterval)
    }
    drawnItems.clearLayers()
    let layer = L.geoJSON(bruteForceData.result.allPoints[i].camInfo.center).bindPopup(`
      Area: ${bruteForceData.result.allPoints[i].camInfo.area.toFixed(2).toString()}<br>
      Total count: ${bruteForceData.result.allPoints[i].totalCount}<br>
      Total distance (m): ${bruteForceData.result.allPoints[i].totalDistance.toFixed(2)}<br>
      Unique crime coordinates: ${bruteForceData.result.allPoints[i].totalCrimeCount}`)
    
    drawnItems.addLayer(layer)
    layer.openPopup()
    drawnItems.addLayer(L.geoJSON(bruteForceData.result.allPoints[i].camInfo.polygon, {style: {color:"purple"}}))
    
    i++
  }, 2000)
})

theBestBtn.addEventListener("click", function(event) {
    drawnItems.clearLayers()
    let layer = L.geoJSON(bruteForceData.result.allPoints[0].camInfo.center).bindPopup(`
      Area: ${bruteForceData.result.allPoints[0].camInfo.area.toFixed(2).toString()}<br>
      Total count: ${bruteForceData.result.allPoints[0].totalCount}<br>
      Total distance (m): ${bruteForceData.result.allPoints[0].totalDistance.toFixed(2)}<br>
      Unique crime coordinates: ${bruteForceData.result.allPoints[0].totalCrimeCount}`)
    
    drawnItems.addLayer(layer)
    layer.openPopup()
    drawnItems.addLayer(L.geoJSON(bruteForceData.result.allPoints[0].camInfo.polygon, {style: {color:"purple"}}))
    

})




