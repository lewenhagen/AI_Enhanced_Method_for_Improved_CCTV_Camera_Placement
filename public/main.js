const theForm = document.getElementById("theForm")
const okButton = document.getElementById("okButton")
const cancelButton = document.getElementById("cancelButton")



function closeModal() {
  baseLine.clearLayers()
  drawnItems.clearLayers()
  document.getElementById("myForm").style.display = "none"
}

function handleOutputPolyline(json) {
  if (json.status === "error") {
    alert("Something went wrong:", json.toString())
    drawnItems.clearLayers()
  } else {
    console.log("yay")

    for (const building of json.data.buildings) {
        // console.log(building.geometry.coordinates)
        drawnItems.addLayer(L.geoJSON(building))
    }

    for (const index in json.cameras.polys) {
      // console.log(building.geometry.coordinates)
      drawnItems.addLayer(L.geoJSON(json.cameras.polys[index].polygon, {style: {color:"green"}}))
      drawnItems.addLayer(L.geoJSON(json.cameras.polys[index].center).bindPopup("#: " + (parseInt(index)+1).toString() + "<br>m2: " + json.cameras.polys[index].area.toFixed(2).toString() + "<br>Percentage: " + json.cameras.polys[index].percentage.toFixed(2).toString()))
    }

   
    // Buffered Line polygon awesome shit
    // drawnItems.addLayer(L.geoJSON(json.data.boundingBox))
    
  }
}

function handleOutput(json) {
  if (json.status === "error") {
    alert("Something went wrong:", json.message)
    drawnItems.clearLayers()
  } else {

    /**
     * Buildings
     */
    for (const building of json.data.buildings) {
        // console.log(building.geometry.coordinates)
        drawnItems.addLayer(L.geoJSON(building))
    }

    /**
     * Coverage area
     */

    // for (const poly of json.coverage.polygons) {
    //     // console.log(building.geometry.coordinates)
    //     drawnItems.addLayer(L.geoJSON(poly, {style: {color:"green"}}))
    // }

    /**
     * Walker area
     */
    // drawnItems.addLayer(L.geoJSON(json.walker[0].polygon, {style: {color:"green"}}))
    // drawnItems.addLayer(L.geoJSON(json.walker[0].center))

    // drawnItems.addLayer(L.geoJSON(json.walker[1].polygon, {style: {color:"yellow"}}))
    // drawnItems.addLayer(L.geoJSON(json.walker[1].center))

    // drawnItems.addLayer(L.geoJSON(json.walker[2].polygon, {style: {color:"orange"}}))
    // drawnItems.addLayer(L.geoJSON(json.walker[2].center))
    for (const index in json.walker.polys) {
      // console.log(building.geometry.coordinates)
      drawnItems.addLayer(L.geoJSON(json.walker.polys[index].polygon, {style: {color:"green"}}))
      drawnItems.addLayer(L.geoJSON(json.walker.polys[index].center).bindPopup("#: " + (parseInt(index)+1).toString() + "<br>m2: " + json.walker.polys[index].area.toFixed(2).toString()))
    }

    /**
     * Voronoi diagrams
     */
    // for (const poly of json.grid.polys) {
    //     console.log(poly)
    //     drawnItems.addLayer(L.geoJSON(poly, {
    //       style: {
    //         color: 'black',
    //         weight: 1,
    //         // fillColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    //         // fillOpacity: 0.5
    //       }
    //     }).bindPopup(poly.properties.percentage.toString()))
    // }


    /**
     * Voronoi centroids (Center of kmeans clustering)
     */
    // for (const center of json.grid.centroids) {

    //     drawnItems.addLayer(L.geoJSON(center))
    // }
  }
}

function fixCoords(event) {
    let layer = event.layer

    // drawnItems.addLayer(layer)

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

async function startFetch(coords) {
  let response = await fetch('/walk', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          bbox: coords,
          nrOfCams: parseInt(document.getElementById("nrofcams").value),
          distance: parseFloat(document.getElementById("distance").value),
          overlap: parseFloat(document.getElementById("overlap").value)
      })
  })

  let json = await response.json()

  return json
}

async function startFetchPolyline(coords) {
  let response = await fetch('/polyline', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          polyline: coords,
          nrOfCams: parseInt(document.getElementById("nrofcams").value),
          distance: parseFloat(document.getElementById("distance").value),
          overlap: parseFloat(document.getElementById("overlap").value),
          focusLine: document.getElementById("focusLine").checked
      })
  })

  let json = await response.json()

  return json
}

const map = L.map('map', {
  center: L.latLng(55.56274294950438, 12.98059344291687),
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

let drawControl = new L.Control.Draw({
    edit: {
        featureGroup: drawnItems
    },
    draw: {
        polygon: true,
        polyline: true,
        rectangle: true,
        circle: false,
        marker: false
    }
})

map.addControl(drawControl)
L.control.polylineMeasure({
  // measureControlTitleOn: "Turn on measurement.",
  // measureControlTitleoff: "Turn off measurement."
}).addTo(map)


map.on("click", function(e) {
  console.log(e.latlng.lng, e.latlng.lat)
})



map.on('draw:created', async function (event) {
    // Add layer to map as baseline
    baseLine.addLayer(event.layer)
    
    document.getElementById("myForm").style.display = "block";
    
    if (event.layerType === "polyline") {
        let form = document.getElementById("theForm")
        let input = document.createElement("input")
        let label = document.createElement("label")

        label.innerHTML = "Focus on line coverage?"
        input.setAttribute("type", "checkbox")
        input.setAttribute("id", "focusLine")
        input.checked = false
  
        form.prepend(label)
        form.prepend(input)
        // form.innerHTML += 

        let latlngs = Array.from(new Set(event.layer.getLatLngs().map(JSON.stringify))).map(JSON.parse)
        let coords = latlngs.map(ll => [ll.lng, ll.lat])
        let json = {}

        okButton.addEventListener("click", async function() {
            drawnItems.clearLayers()
            json = await startFetchPolyline(coords)
    
            handleOutputPolyline(json)
        })


    } else if (event.layerType === "polygon" || event.layerType === "rectangle") {
        let coords = fixCoords(event)
        let json = {}

        okButton.addEventListener("click", async function() {
          drawnItems.clearLayers()
          json = await startFetch(coords)
  
          handleOutput(json)
      })
    }

    

    
    // let json = {}

    // okButton.addEventListener("click", async function() {
    //   drawnItems.clearLayers()
    //   json = await startFetch(coords)

    //   handleOutput(json)
    // })

    cancelButton.onclick = closeModal

    
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
