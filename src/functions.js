import { MongoClient } from 'mongodb'
import * as turf from '@turf/turf'

const uri = "mongodb://root:pass@localhost:27017"
const mongo = new MongoClient(uri)
const client = await mongo.connect()
const db = client.db("sweden")
const collection = db.collection("buildings")

async function getBuildings(poly) {
    console.log(poly)
    let newPoly = poly.map(function(tmp) {
        // console.log(tmp)
        return tmp.reverse()
    })
    console.log(newPoly)
    // let latlngs = poly.getLatLngs()[0];  // Get first ring (outer boundary)

    // // Convert Leaflet LatLng objects to GeoJSON-style coordinates (lon, lat)
    // let coords = latlngs.map(ll => [ll.lng, ll.lat]);

    // // Ensure the polygon is closed by repeating the first coordinate at the end
    // if (coords.length > 0 &&
    //     (coords[0][0] !== coords[coords.length - 1][0] ||
    //     coords[0][1] !== coords[coords.length - 1][1])) {
    //     coords.push(coords[0]);  // Close the ring
    // }
    // function convertLeafletToTurf(leafletPolygon) {
    //     let turfCoordinates = ;
    //     return turf.polygon(turfCoordinates);
    // }

    // let turfPolygon = convertLeafletToTurf(leafletPolygon);
    // console.log(turfPolygon);
    let turfPoly = turf.polygon([poly])
    // console.log(turfPoly)
    const query = {
    geometry: {
        $geoIntersects: {
            $geometry: {
                type: "Polygon",
                coordinates: [newPoly]
            }
        }
    }
    };

    const results = await collection.find(query).toArray();
    console.log(results)

    mongo.close()
}



export { getBuildings }
