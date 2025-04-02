const theForm = document.getElementById("theForm")
const okButton = document.getElementById("okButton")
const cancelButton = document.getElementById("cancelButton")
const loadAiBtn = document.getElementById("loadAiBtn")

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
    const response = await fetch('/generare-area-without-buildings', {
        method: 'POST',
        headers: headers
    });

    const data = await response.json()

    L.geoJSON(data.area, {color: "#00FF00"}).addTo(map)

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
              // body: JSON.stringify({ key: 'value' }) // Modify this as needed
          });

          const data = await response.json();
          console.log('Response:', data);
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
    drawnItems.addLayer(L.geoJSON(box).setStyle({"opacity": 0.9, "width": "2px", "color":"#000", "fill": false}))
}

function drawBuildings(buildings) {
  for (const building of buildings) {
      drawnItems.addLayer(L.geoJSON(building))
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
  }).addTo(map);
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

map.addLayer(drawnItems)
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
    let center = document.getElementById("center").value
    let distance = parseInt(document.getElementById("distance").value)

    let response = await fetch('/load-ai-data', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          center: center,
          distance: distance
      })
    })

    let json = await response.json() 
    console.log(json.data.crimes)
    drawBoundingBox(json.data.boundingBox)
    drawBuildings(json.data.buildings)
    drawCrimes(json.data.crimes)

    await runAI()
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
