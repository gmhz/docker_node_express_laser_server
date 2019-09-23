'use strict';

const express = require('express');
const pg = require('pg');

// Constants
const WS_PORT = 3031;
const PORT = 8080;
const HOST = '0.0.0.0';

//Socket io
const server = require('http').createServer();
const io = require('socket.io')(server);
var bodyParser = require('body-parser')

const connetionStr = `postgres://user:pass@postgres:5432/fastdata`;
const pgClient = new pg.Client(connetionStr);
pgClient.connect();

const q = pgClient.query("CREATE TABLE IF NOT EXISTS \"mytable\" (id INT PRIMARY KEY, a varchar(50));");
pgClient.query(
	`CREATE OR REPLACE FUNCTION public.notify_testevent()
	RETURNS trigger
	LANGUAGE plpgsql
	AS $function$
	BEGIN
	PERFORM pg_notify('new_testevent', row_to_json(NEW)::text);
	return null;
	END;
	$function$`
	);


pgClient.query(`DROP TRIGGER IF EXISTS inserted_test_trigger on "mytable";`);
pgClient.query(`DROP TRIGGER IF EXISTS updated_test_trigger on "mytable";`);
pgClient.query("CREATE TRIGGER inserted_test_trigger AFTER INSERT ON mytable FOR EACH ROW EXECUTE PROCEDURE notify_testevent();");
pgClient.query("CREATE TRIGGER updated_test_trigger AFTER UPDATE ON mytable FOR EACH ROW EXECUTE PROCEDURE notify_testevent();");

const listener = pgClient.query("LISTEN new_testevent");

pgClient.on('notification', async(data) => {
	const payload = JSON.parse(data.payload);
	console.log(payload);
	io.emit("upd", payload.a)
});

io.on('connection', client => {
	console.log("connected: " + client.id);
	client.on('disconnect', () => {
		console.log("\ndisconnected: " + client.id);
	});
});
server.listen(WS_PORT);
console.log(`Listening websocket http://${HOST}:${WS_PORT}`);

// App
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.get('/', (req, res) => {
	var html='';
	html +="<body>";
	html += "<form action='/update'  method='post' name='form1'>";
	html += "NewValue:</p><input type= 'text' name='newvalue'><br/>";
	html += "<input type='submit' value='submit'>";
	html += "</form>";
	html += "</body>";
	res.send(html);
});

app.post('/update', function (req, res){
	console.log(req.body.newvalue);
	pgClient.query(`INSERT INTO mytable (id, a) VALUES (1, ${req.body.newvalue}) ON CONFLICT (id) DO UPDATE SET a = excluded.a;`);
	
	var html='';
	html +="<body>";
	html += "<p>Updated!</p>";
	html += "<a href=\"/\">Go Back</p>";
	html += "</body>";
	res.send(html);
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function intervalFunc() {
	var randVal = getRandomInt(1, 1000);
    pgClient.query(`INSERT INTO mytable (id, a) VALUES (1, ${randVal}) ON CONFLICT (id) DO UPDATE SET a = excluded.a;`);
}

setInterval(intervalFunc, 50);	
