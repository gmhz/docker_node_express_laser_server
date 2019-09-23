FROM node:10

RUN apt-get update && apt-get install -f -y postgresql-client

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080
EXPOSE 3031