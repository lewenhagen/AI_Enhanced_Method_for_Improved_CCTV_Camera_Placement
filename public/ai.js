const theForm = document.getElementById("theForm")
const okButton = document.getElementById("okButton")
const cancelButton = document.getElementById("cancelButton")
const loadAiBtn = document.getElementById("loadAiBtn")
const animate = document.getElementById("animate")
const theBestBtn = document.getElementById("getBest")
const simulations = document.getElementById("simulations")
let allCrimes = null

let bruteForceData = []
let myInterval = null
let isPaused = false

function getHeatmapColor(value) {
  if (value === undefined) {
    return "#000"
  } else {
    return chroma.scale(['red', 'yellow', '#006a02ff'])(value).hex();
  }
  
}

function scale (value) {
  return chroma.scale(["#ffffffff", "#525151ff", "#000"])(value).hex()
}


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

      const data = await response.json()
      bruteForceData = data
      // console.log(data.result.gridArea)

      L.geoJSON(data.result.gridArea, {
        pointToLayer: (feature, latlng) =>
          L.circleMarker(latlng, {
            radius: 2,
            // color: "black",
            // color: getHeatmapColor(feature.properties.opacityScore),
            // fillColor: getHeatmapColor(feature.properties.opacityScore),
            color: getHeatmapColor(feature.properties.opacityScore),
            fillColor: getHeatmapColor(feature.properties.opacityScore),
            fillOpacity: 1,
            opacity: 1,
            interactive: false
          })

      }).addTo(drawnAi)



      animate.disabled = false
      theBestBtn.disabled = false
      simulations.disabled = false
      simulations.max = bruteForceData.result.allPoints.length

  } catch (error) {
      console.error('Error fetching:', error);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Retry after 1 second
  }
  drawCrimes(allCrimes)
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
          parseFloat(crimes[crime].feature.coordinates[0]),
          parseFloat(crimes[crime].feature.coordinates[1])
        ]
      },
      properties: {
        // codes: `${Object.keys(crimes[crime].codes).toString()}}`,
        count: crimes[crime].count
      }
    }))
  }
  L.geoJSON(geojsonPoints, {
    pointToLayer: (feature, latlng) =>
      L.circleMarker(latlng, {
        radius: 2,
        color: "red",
        fillColor: "red",
        fillOpacity: 1,
        interactive: true
      }),
      onEachFeature: (feature, layer) => {
        const crimeCount = feature.properties.count;
        layer.on('click', () => console.log('clicked:', feature));
        // const codeCount = feature.properties.codes.split(",").length;
        layer.bindPopup(`Crimes: ${crimeCount}`);
        layer.bringToFront()
      }
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
map.addLayer(baseLine)
map.addLayer(drawnAi)

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


// map.on("click", function(e) {
//   console.log(e.latlng.lng, e.latlng.lat)
// })



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
    allCrimes = json.data.crimes
    // drawCrimes(json.data.crimes)

    await runAI()
})

animate.addEventListener("click", function(event) {
  let i = 0
  let max = null
  let simulation = parseInt(simulations.value) - 1
  myInterval = setInterval(function() {

    drawnItems.clearLayers()

    let pointData;
    if (!document.getElementById("reinforcement").checked) {
      pointData = bruteForceData.result.allPoints[i]
      max = bruteForceData.result.allPoints.length
    } else {
      pointData = bruteForceData.result.allPoints[simulation][i]
      max = bruteForceData.result.allPoints[simulation].length
    }
    // console.log("here:", pointData)
    let layer = L.geoJSON(pointData.camInfo.center).bindPopup(`
      Score: ${pointData.camInfo.score}<br>
      Area: ${pointData.camInfo.area.toFixed(2).toString()}<br>
      Total count: ${pointData.totalCount}<br>
      Total distance (m): ${pointData.totalDistance.toFixed(2)}<br>
      Unique crime coordinates: ${pointData.totalCrimeCount}<br>
      Coordinates (lat/lng): ${pointData.camInfo.center.coordinates[1].toFixed(4)}, ${pointData.camInfo.center.coordinates[0].toFixed(4)}<br>
      Point: ${i+1}/${max}`)

    drawnItems.addLayer(layer)
    drawnItems.bringToBack()
    layer.openPopup()
    drawnItems.addLayer(L.geoJSON(pointData.camInfo.polygon, {style: {color:"purple"}, interactive: false}))
    // drawnAi.bringToFront()
    if (i === max-1) {
      clearInterval(myInterval)
      // myInterval = null
      return
    }

    i++
  }, 1500)
})

theBestBtn.addEventListener("click", function(event) {
    let simulation = parseInt(simulations.value)-1
    let chosenSimulation = bruteForceData.result.allPoints[simulation]
    drawnItems.clearLayers()
    clearInterval(myInterval)
    myInterval = null
    let useThis = {}
    if (document.getElementById("reinforcement").checked) {
      useThis = chosenSimulation[chosenSimulation.length-1]
    } else {
      useThis = chosenSimulation
    }
    let layer = L.geoJSON(useThis.camInfo.center).bindPopup(`
      Score: ${useThis.camInfo.score}<br>
      Area: ${useThis.camInfo.area.toFixed(2).toString()}<br>
      Total count: ${useThis.totalCount}<br>
      Total distance (m): ${useThis.totalDistance.toFixed(2)}<br>
      Unique crime coordinates: ${useThis.totalCrimeCount}<br>
      Coordinates (lat/lng): ${useThis.camInfo.center.coordinates[1].toFixed(4)}, ${useThis.camInfo.center.coordinates[0].toFixed(4)}`)
    console.log(useThis)
    drawnItems.addLayer(layer)
    layer.openPopup()
    drawnItems.addLayer(L.geoJSON(useThis.camInfo.polygon, {style: {color:"purple"}}))
    drawnItems.bringToBack()

})
