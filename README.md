# Instrucions

* Get a geojson file of the buildings. I used [https://data.humdata.org/dataset/hotosm_swe_buildings](https://data.humdata.org/dataset/hotosm_swe_buildings) and the file "hotosm_swe_buildings_polygons_geojson.zip" (3 309 367 buildings). Place the file in the folder "geojson".

* TBD: For now it is hardcoded sweden_buildings.geojson. Make it dynamic.


* Install packages: `npm install`
* Start db in background: `docker compose up -d mongodb `
* Insert data: `npm run insert`

### Index on geometry
* Pull and start cli container: `docker compose run mongodb mongosh -u root -p pass mongodb://mongodb/`. Look in docker-compose.yml. On MAC it is `mongo`, not `mongosh`.
* `use <db>` (sweden)
* Index on geometry: `db.buildings.createIndex({ "geometry": "2dsphere" })`


### Insert more data
* Install sqlite3: `npm install sqlite3`
* Migrate data from sqlite3 to mongodb by modifying and running `migrate.js`.
* Fix location:
```console
db.crimes.updateMany(
  {},
  [
    {
      $set: {
        location: {
          type: "Point",
          coordinates: [
            { $toDouble: "$longitude" },
            { $toDouble: "$latitude" }
          ]
        }
      }
    }
  ]
);
```
* Create index: `db.crimes.createIndex({ location: "2dsphere" });`

* Example on finding data:

```console
db.crimes.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [12.9992, 55.6061] }, // [longitude, latitude]
      $maxDistance: 5 // Distance in meters (5 km)
    }
  }
});
```
* Example with polygon:

```console
db.crimes.find({
  location: {
    $geoWithin: {
      $geometry: {
        type: "Polygon",
        coordinates: [[
          [12.979687303723193, 55.56351954259556], [12.982670213525155, 55.56338606675054], [12.982562914611442, 55.56272474791968],
          [12.979381501819033, 55.56284002448031], [12.979687303723193, 55.56351954259556]
        ]]
      }
    }
  }
});
```
