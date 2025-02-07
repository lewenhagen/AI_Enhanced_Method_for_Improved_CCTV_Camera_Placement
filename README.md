# Commands

* Install packages: `npm install` 
* Start container: `docker compose run mongodb mongosh -u <user> -p <password> mongodb://mongodb/`. Look in docker-compose.yml.
* Insert data: `npm run insert`
* Start db in background: `docker compose up -d mongodb `
* Index on geometry: `db.buildings.createIndex({ "geometry": "2dsphere" })`


