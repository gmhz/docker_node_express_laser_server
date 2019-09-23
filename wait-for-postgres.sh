#!/bin/sh

postgres_host=$1
postgres_port=$2

# wait for the postgres docker to be running
while ! pg_isready -h $postgres_host -p $postgres_port -q -U postgres; do
  echo "Waiting for Postgres"
  sleep 1
done

echo "Postgres is up"

node server.js