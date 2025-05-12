const theForm = document.getElementById("theForm")
const okButton = document.getElementById("okButton")
const cancelButton = document.getElementById("cancelButton")
const loadAiBtn = document.getElementById("loadAiBtn")
const animate = document.getElementById("animate")
const theBestBtn = document.getElementById("getBest")
let bruteForceData = []
let myInterval = null
let isPaused = false

function setPopupContent(currentCrime) {

  let popup = `
  Id: ${currentCrime.id}<br>
  Crimecode: ${currentCrime.crime_code}<br>
  Date: ${currentCrime.crimedate_start}<br>
  Time: ${currentCrime.crimetime_start}<br>
  Coords: ${currentCrime.latitude}, ${currentCrime.longitude}<br>`;

  if (currentCrime.street !== null) {
      popup += `Address: ${currentCrime.street}`
  } else {
      popup += `Adress: No street added.`;
  }

  if (currentCrime.street_nr !== null) {
      popup += ` ${currentCrime.street_nr}`
  }

  return popup;
}


async function runAI() {
  let isDone = false;
  const headers = { 'Content-Type': 'application/json' }

  /**
   * Generate area to move AI around in
   * Area without buildings
   */
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

    /**
     * Start AI in center
     * Run and log "points"
     */

//   while (!isDone) {
      try {
          const response = await fetch('/run-ai', {
              method: 'POST',
              headers: headers,
              body: JSON.stringify({ center: document.getElementById("center").value })
          });

          const data = await response.json();
          bruteForceData = data
          // drawnAi.addLayer(L.geoJSON(data.result.currentCam.polygon, {style: {color:"purple"}}))
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

          // console.log(data.result.allPoints[0])
          // let i = 0
          // let myInterval = setInterval(function() {
          //   if (i === data.result.allPoints) {
          //     clearInterval(myInterval)
          //   }
          //   drawnItems.clearLayers()
          //   let layer = L.geoJSON(data.result.allPoints[i].camInfo.center).bindPopup(`
          //     Area: ${data.result.allPoints[i].camInfo.area.toFixed(2).toString()}<br>
          //     Total count: ${data.result.allPoints[i].totalCount}<br>
          //     Total distance (m): ${data.result.allPoints[i].totalDistance.toFixed(2)}<br>
          //     Unique crime coordinates: ${data.result.allPoints[i].totalCrimeCount}`)
            
          //   drawnItems.addLayer(layer)
          //   layer.openPopup()
          //   drawnItems.addLayer(L.geoJSON(data.result.allPoints[i].camInfo.polygon, {style: {color:"purple"}}))
            
          //   i++
          // }, 2000)
          // drawnAi.addLayer(L.geoJSON(data.result.allPoints[0].camInfo.center).bindPopup(`
          //     Area: ${data.result.allPoints[0].camInfo.area.toFixed(2).toString()}<br>
          //     Total count: ${data.result.allPoints[0].totalCount}<br>
          //     Total distance (m): ${data.result.allPoints[0].totalDistance}<br>
          //     Crime coordinates: ${data.result.allPoints[0].totalCrimeCount}`))
          // drawnAi.addLayer(L.geoJSON(data.result.allPoints[0].camInfo.polygon, {style: {color:"purple"}}))



          // if (data.result.bestCam !== null) {
          //   drawnAi.addLayer(L.geoJSON(data.result.bestCam.polygon, {style: {color:"purple"}}))
          //   drawnAi.addLayer(L.geoJSON(data.result.bestCam.center, {
          //   pointToLayer: (feature, latlng) => {
          //     return L.circleMarker(latlng, {
          //       radius: 6,
          //       color: feature.properties.color || "black", 
          //       fillColor: feature.properties.color || "purple",
          //       fillOpacity: 1
          //     }).bindPopup(feature.properties.name);
          //   }
          // }).bindPopup(`
          //     Area: ${data.result.bestCam.area.toFixed(2).toString()}<br>
          //     Total count: ${data.result.bestCam.totalCount}<br>
          //     Total distance (m): ${data.result.bestCam.totalDistance}<br>
          //     Crime coordinates: ${data.result.bestCam.totalCrimeCount}`))
          // }




        //   L.geoJSON(data.area, {color: "#FF0000"}).addTo(map)

        //   if (data.status === 'done') {
        //       isDone = true;
        //       console.log('Process completed.');
        //   } else {
        //     //   console.log(data.current)
        //       L.geoJSON(data.current, {color: "#FF0000"}).addTo(map)
            
        //     //   isDone = true
        //       await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
        //   }

      } catch (error) {
          console.error('Error fetching:', error);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Retry after 1 second
      }
//   }
}



function closeModal() {
  baseLine.clearLayers()
  drawnItems.clearLayers()
  document.getElementById("myForm").style.display = "none"
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
  }).addTo(drawnAi);
//   let options = {
//     radius: 8,
//     fillColor: "#ff7800",
//     color: "#000",
//     weight: 1,
//     opacity: 1,
//     fillOpacity: 0.8
//   }

//   for (const crime of crimes) {
//     let crimeMarker = {
//       "type": "point",
//       "properties": {
//           "amenity": "Crime",
//           "popupContent": `Code: ${crime.crime_code}
// Street: ${crime.street} ${crime.street_nr}`
//       },
//       "geometry": crime.location
//     }

//     drawnItems.addLayer(L.geoJSON(crimeMarker))
//   }
 
}

function fixCoords(event) {
    let layer = event.layer
    let latlngs = layer.getLatLngs()[0]

    // Convert Leaflet LatLng objects to GeoJSON-style coordinates (lon, lat)
    let coords = latlngs.map(ll => [ll.lng, ll.lat])

    // Ensure the polygon is closed by repeating the first coordinate at the end
    if (coords.length > 0 &&
        (coords[0][0] !== coords[coords.length - 1][0] ||
        coords[0][1] !== coords[coords.length - 1][1])) {
        coords.push(coords[0])  // Close the ring
    }

    return coords

}

async function getBuildings(coords) {
  let response = await fetch('/getbuildings', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          bbox: coords
      })
  })

  let json = await response.json()

  return json
}

async function getCrimes(coords) {
  let response = await fetch('/getcrimes', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          bbox: coords
      })
  })

  let json = await response.json()

  return json
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



map.on('draw:created', async function (event) {
    // Add layer to map as baseline
    baseLine.addLayer(event.layer)
    
    document.getElementById("myForm").style.display = "block";
    
    if (event.layerType === "polygon" || event.layerType === "rectangle") {
        let coords = fixCoords(event)
        let buildings = {}
        let crimes = {}
        drawnItems.clearLayers()
        buildings = await getBuildings(coords)
        crimes = await getCrimes(coords)

        drawBuildings(buildings)
        drawCrimes(crimes)
    }
    cancelButton.onclick = closeModal
})

loadAiBtn.addEventListener("click", async function(event) {
    drawnAi.clearLayers()
    drawnItems.clearLayers()
    clearInterval(myInterval)
    let center = document.getElementById("center").value
    let distance = parseInt(document.getElementById("distance").value)
    let gridDensity = parseInt(document.getElementById("gridDensity").value)

    let response = await fetch('/load-ai-data', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          center: center,
          distance: distance,
          gridDensity: gridDensity
      })
    })

    let json = await response.json() 
    // console.log(json.data.crimes)
    drawBoundingBox(json.data.boundingBox)
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
// klipp ut areor,
// bort med byggnader,
// ranka storlek,
// hitta mitten
// hitta närmaste hus


// för varje voronoi
// hitta center utan byggnader,



// SISTA varianten
// 1. sortera på area storlek
// 2. ta bort alla som nuddar den största
// 3. ta näst största -||-




