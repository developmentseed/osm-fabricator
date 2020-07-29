#/usr/bin/sh

# create database 
createdb --owner postgres fabricator_build 

# migrate
psql -d fabricator_build -f sql/0_init.sql
psql -d fabricator_build -f sql/1_countries.sql

# simulate
DATABASE_URL=postgres://postgres@localhost/fabricator_build node index

# dump only the data
pg_dump -a fabricator_build > sql/2_seed.sql

# drop database
dropdb fabricator_build
