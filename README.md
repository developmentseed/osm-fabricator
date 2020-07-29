# osm fabricator 🎲
_An OSM simulator_

## build and run
1. Build the docker image. This is just a [PostGIS](https://postgis.net/) database in Docker.
```sh
docker build -t osmfab .
```

2. Run the db.
```sh
docker run -p 5432:5432 -d osmfab
```

3. Run the simulator. This creates the db, and populates the db with simulated data from OSM. The 
schema is the same as [OSMesa](https://github.com/azavea/osmesa).
```
nvm use
yarn
DATABASE_URL=postgres://postgres@localhost/postgres node index
```
