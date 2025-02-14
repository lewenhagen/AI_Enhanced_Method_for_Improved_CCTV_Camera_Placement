const map = L.map('map', {
  center: L.latLng(55.56334663061865, 12.975368499755861),
  zoom: 18,
})

// test()

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: `&copy;
  <a href="https://www.openstreetmap.org/copyright">
  OpenStreetMap</a> contributors`,
  maxZoom: 20,
  maxNativeZoom: 19
}).addTo(map)

document.getElementById('map').style.cursor = 'crosshair'

var drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Initialize the draw control and pass it options
    var drawControl = new L.Control.Draw({
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
    });

    map.addControl(drawControl);

    // Capture the created polygon and get its coordinates
    map.on('draw:created', async function (event) {
        var layer = event.layer;
        drawnItems.addLayer(layer);

        // Get coordinates of the drawn polygon
        var coordinates = layer.getLatLngs();
        let latlngs = layer.getLatLngs()[0];  // Get first ring (outer boundary)

        // Convert Leaflet LatLng objects to GeoJSON-style coordinates (lon, lat)
        let coords = latlngs.map(ll => [ll.lng, ll.lat]);

        // Ensure the polygon is closed by repeating the first coordinate at the end
        if (coords.length > 0 &&
            (coords[0][0] !== coords[coords.length - 1][0] ||
            coords[0][1] !== coords[coords.length - 1][1])) {
            coords.push(coords[0]);  // Close the ring
        }



        let response = await fetch('/init', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: coords
            })
        })
        let json = await response.json()
        console.log(json.status)
        console.log("Polygon Coordinates:", coords);
    });
// let editableLayers = new L.FeatureGroup();
// map.addLayer(editableLayers);

// let drawPluginOptions = {
//   position: 'topright',
//   draw: {
//     polygon: {
//       allowIntersection: false, // Restricts shapes to simple polygons
//       drawError: {
//         color: '#e1e100', // Color the shape will turn when intersects
//         message: '<strong>Oh snap!<strong> you can\'t draw that!' // Message that will show when intersect
//       },
//       shapeOptions: {
//         color: '#97009c'
//       }
//     },
//     // disable toolbar item by setting it to false
//     polyline: false,
//     circle: false, // Turns off this drawing tool
//     rectangle: false,
//     marker: false,
//     },
//   edit: {
//     featureGroup: editableLayers, //REQUIRED!!
//     remove: false
//   }
// };

// Initialise the draw control and pass it the FeatureGroup of editable layers
// let drawControl = new L.Control.Draw(drawPluginOptions);
// map.addControl(drawControl);

// map.on(L.Draw.Event.CREATED, function (e) {
//     let type = e.layerType,
//             layer = e.layer;

//     if (type === 'polygon') {
//         // layer.bindPopup('A popup!');
//         console.log(e.getLatLng())
//     }

//     editableLayers.addLayer(layer);
// });
