const theForm = document.getElementById("theForm")
const okButton = document.getElementById("okButton")
const cancelButton = document.getElementById("cancelButton")



function closeModal() {
  baseLine.clearLayers()
  drawnItems.clearLayers()
  document.getElementById("myForm").style.display = "none"
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
    for (const index in json.walker) {
      // console.log(building.geometry.coordinates)
      drawnItems.addLayer(L.geoJSON(json.walker[index].polygon, {style: {color:"green"}}))
      drawnItems.addLayer(L.geoJSON(json.walker[index].center).bindPopup((parseInt(index)+1).toString()))
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
        polyline: false,
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
    baseLine.addLayer(event.layer)
    document.getElementById("myForm").style.display = "block";

    let coords = fixCoords(event)
    let json = {}

    okButton.addEventListener("click", async function() {
      drawnItems.clearLayers()
      json = await startFetch(coords)

      handleOutput(json)
    })

    cancelButton.onclick = closeModal

    // let nrOfCams = parseInt(prompt("How many cameras?"))
    // let distance = parseFloat(prompt("Distance?"))




    // let response = await fetch('/init', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({
    //         bbox: coords,
    //         nrOfCams: nrOfCams,
    //         distance: distance
    //     })
    // })

    // let json = await response.json()

    // if (json.status === "error") {
    //   alert(json.message)
    //   drawnItems.clearLayers()
    // } else {

    //   /**
    //    * Buildings
    //    */
    //   for (const building of json.data.buildings) {
    //       // console.log(building.geometry.coordinates)
    //       drawnItems.addLayer(L.geoJSON(building))
    //   }

    //   /**
    //    * Coverage area
    //    */

    //   // for (const poly of json.coverage.polygons) {
    //   //     // console.log(building.geometry.coordinates)
    //   //     drawnItems.addLayer(L.geoJSON(poly, {style: {color:"green"}}))
    //   // }

    //   /**
    //    * Voronoi diagrams
    //    */
    //   for (const poly of json.grid.polys) {
    //       console.log(poly)
    //       drawnItems.addLayer(L.geoJSON(poly, {
    //         style: {
    //           color: 'black',
    //           weight: 1,
    //           // fillColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    //           // fillOpacity: 0.5
    //         }
    //       }).bindPopup(poly.properties.percentage.toString()))
    //   }


    //   /**
    //    * Voronoi centroids (Center of kmeans clustering)
    //    */
    //   // for (const center of json.grid.centroids) {

    //   //     drawnItems.addLayer(L.geoJSON(center))
    //   // }
    // }



    // console.log("Polygon Coordinates:", coords)
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
