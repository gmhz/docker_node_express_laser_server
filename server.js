'use strict';

const express = require('express');
const pg = require('pg');

// Constants
const WS_PORT = 3031;
const PORT = 8080;
const HOST = '0.0.0.0';

const TABLE_NAME = "locations";
const EVENT_NAME = "new_testevent";
const NEW_LOCATION = "new_location";

//Socket io
const server = require('http').createServer();
const io = require('socket.io')(server);
var bodyParser = require('body-parser')

const connetionStr = `postgres://user:pass@postgres:5432/fastdata`;
const pgClient = new pg.Client(connetionStr);
pgClient.connect();

const q = pgClient.query(
	`CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
		id serial PRIMARY KEY, 
		username VARCHAR(50) UNIQUE,
		lat decimal (16,6),
		lng decimal (16,6),
		speed SMALLINT DEFAULT 0,
		bearing SMALLINT DEFAULT 0,
		updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);`
);

pgClient.query(
	`CREATE OR REPLACE FUNCTION public.notify_testevent()
	RETURNS trigger
	LANGUAGE plpgsql
	AS $function$
	BEGIN
	NEW.updated_at = NOW();
	PERFORM pg_notify('${EVENT_NAME}', row_to_json(NEW)::text);
	return null;
	END;
	$function$`
	);


pgClient.query(`DROP TRIGGER IF EXISTS inserted_test_trigger on "${TABLE_NAME}";`);
pgClient.query(`DROP TRIGGER IF EXISTS updated_test_trigger on "${TABLE_NAME}";`);
pgClient.query(`CREATE TRIGGER inserted_test_trigger AFTER INSERT ON ${TABLE_NAME} FOR EACH ROW EXECUTE PROCEDURE notify_testevent();`);
pgClient.query(`CREATE TRIGGER updated_test_trigger AFTER UPDATE ON ${TABLE_NAME} FOR EACH ROW EXECUTE PROCEDURE notify_testevent();`);

const listener = pgClient.query(`LISTEN ${EVENT_NAME}`);

pgClient.on('notification', async(data) => {
	const payload = JSON.parse(data.payload);
	console.log(payload);
	io.emit(NEW_LOCATION, payload)
});

io.on('connection', client => {
	console.log("connected: " + client.id);
	client.on('disconnect', () => {
		console.log("\ndisconnected: " + client.id);
	});
});
server.listen(WS_PORT);
console.log(`Listening websocket http://${HOST}:${WS_PORT}`);


function getRandomDouble(doubleNum) {
	let randomedValue = (Math.random() * (0.120 - 0.00002) + 0.00002).toFixed(5)
    return (parseFloat(doubleNum) + parseFloat(randomedValue)).toFixed(5);
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function intervalFunc() {
	var lat = getRandomDouble(42.873770);
	var lng = getRandomDouble(74.570383);
	var speed = getRandomInt(10, 50);
	var bearing = getRandomInt(0, 360);
    pgClient.query(`
    	INSERT INTO ${TABLE_NAME} 
    	(username, lat, lng, speed, bearing) VALUES 
    	('demo_user', ${lat}, ${lng}, ${speed}, ${bearing}) 
    	ON CONFLICT (username) DO UPDATE SET lat = excluded.lat, lng = excluded.lng, speed = excluded.speed, bearing = excluded.bearing;
    	`);
}

setInterval(intervalFunc, 1500);	
