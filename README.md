# Instrucions

* Get a geojson file of the buildings. I used [https://data.humdata.org/dataset/hotosm_swe_buildings](https://data.humdata.org/dataset/hotosm_swe_buildings) and the file "hotosm_swe_buildings_polygons_geojson.zip" (3 309 367 buildings). Place the file in the folder "geojson".

* Create a `.env`file with the following env. variables set:

```
MONGOUSER=
MONGOPASS=
```

Update the variables in the file `insert.js`:

```js
const dbName = ""
const collectionName = ""
const filePath = "./geojson/<your_file>.geojson"
```

* Install packages: `npm install`
* Start db in background: `docker compose up -d mongodb `
* Insert data: `npm run insert`

### Index on geometry

* Update with the credentials used to start the container. Instructions are shown with user=root, password=pass. Make sure you start the container with the correct credentials.
* Pull and start cli container: `docker compose run mongodb mongosh -u root -p pass mongodb://mongodb/`. Look in docker-compose.yml. On MAC it is `mongo`, not `mongosh`. Perhaps it is fixed with newer versions. 
* `use <db>` (sweden)
* Index on geometry: `db.buildings.createIndex({ "geometry": "2dsphere" })`


### Insert crime locations

* The crime locations could live in a collection called `crimes`. If other, change the collection variable in the files in the src/ folder.
* Make sure the collection have the keys `longitude`, `latitude`, `year`.
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

### Run on mac to connect to dockercontainer
`docker exec -it mongo mongo -u root -p pass`

### Server

#### Password protect the server
Update the file `setupauth.js` and add a password:

```js
const hash = await bcrypt.hash("", 12); // add a password
```

Start the server with for example `pm2 start index.js` (require installation of the npm package pm2)

Open a browser on `localhost:1337` (change in index.js if you want another).
