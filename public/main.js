const map = L.map('map', {
  center: L.latLng(55.56334663061865, 12.975368499755861),
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

let drawnItems = new L.FeatureGroup()

map.addLayer(drawnItems)

let drawControl = new L.Control.Draw({
    edit: {
        featureGroup: drawnItems
    },
    draw: {
        polygon: true,
        polyline: false,
        rectangle: false,
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
    let nrOfCams = parseInt(prompt("How many cameras?"))
    let distance = parseFloat(prompt("Distance?"))
    
    let layer = event.layer

    drawnItems.addLayer(layer)

    let latlngs = layer.getLatLngs()[0] 

    // Convert Leaflet LatLng objects to GeoJSON-style coordinates (lon, lat)
    let coords = latlngs.map(ll => [ll.lng, ll.lat])

    // Ensure the polygon is closed by repeating the first coordinate at the end
    if (coords.length > 0 &&
        (coords[0][0] !== coords[coords.length - 1][0] ||
        coords[0][1] !== coords[coords.length - 1][1])) {
        coords.push(coords[0])  // Close the ring
    }



    let response = await fetch('/init', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            bbox: coords,
            nrOfCams: nrOfCams,
            distance: distance
        })
    })

    let json = await response.json()
    
    if (json.status === "error") {
      alert(json.message)
      drawnItems.clearLayers()
    } else {
      // console.log(json.cam)

      for (const building of json.data.buildings) {
          // console.log(building.geometry.coordinates)
          drawnItems.addLayer(L.geoJSON(building))
      }

      for (const cam of json.cam) {
          // console.log(building.geometry.coordinates)
          drawnItems.addLayer(L.geoJSON(cam, {style: {color:"green"}}))
      }
      console.log(json.grid)
      for (const grid of json.grid) {
          console.log(grid)
          // L.geoJSON(grid, {
          //       style: () => ({
          //           color: 'black',
          //           weight: 1,
          //           fillColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
          //           fillOpacity: 0.5
          //       })
          //   })
        
          drawnItems.addLayer(L.geoJSON(grid, {
            style: {
              color: 'black',
              weight: 1,
              fillColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
              fillOpacity: 0.5
            }
          }))
      }
    }
    

    
    // console.log("Polygon Coordinates:", coords)
})
