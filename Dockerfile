FROM mdillon/postgis:latest

RUN mkdir -p /docker-entrypoint-initdb.d
RUN mkdir -p /init
ADD sql/*.sql /docker-entrypoint-initdb.d/
