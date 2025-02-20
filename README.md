# Instrucions

* Get a geojson file of the buildings. I used [https://data.humdata.org/dataset/hotosm_swe_buildings](https://data.humdata.org/dataset/hotosm_swe_buildings) and the file "hotosm_swe_buildings_polygons_geojson.zip" (3 309 367 buildings). Place the file in the folder "geojson".

* TBD: For now it is hardcoded sweden_buildings.geojson. Make it dynamic.


* Install packages: `npm install`
* Start db in background: `docker compose up -d mongodb `
* Insert data: `npm run insert`

### Index on geometry
* Pull and start cli container: `docker compose run mongodb mongosh -u <user> -p <password> mongodb://mongodb/`. Look in docker-compose.yml. On MAC it is `mogno`, not `mongosh`.
* `use <db>` (sweden)
* Index on geometry: `db.buildings.createIndex({ "geometry": "2dsphere" })`
