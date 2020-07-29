# osm fabricator 🎲
_An OSM simulator_

## build and run
1. Build the db
```sh
docker build -t osmfab .
```

2. Run the db
```sh
docker run -p 5432:5432 -d osmfab
```

3. Run the simulator
```
npm install
DATABASE_URL=postgres://postgres@localhost/postgres node index
```
