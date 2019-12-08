const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 8080;

const CONFIG = path.resolve(__dirname, '..', 'config', 'lights.json');

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(express.static(path.resolve(__dirname, 'lights')));

const lights = require('./lights');

app.get('/lights', (req, res) => {
  res.json(JSON.parse(fs.readFileSync(CONFIG, {encoding: 'utf-8'})));
});


app.post('/lights', (req, res) => {
  const config = JSON.parse(req.body.save);
  console.log(config);
  fs.writeFileSync(CONFIG, JSON.stringify(config));
  lights.update(config);
  res.status(200).end();
});

app.get('/start', (req, res) => {
  console.log('start');
  lights.start();
  res.status(200).end();
});

app.get('/stop', (req, res) => {
  console.log('stop');
  lights.stop();
  res.status(200).end();
});

app.post('/preview', (req, res) => {
  console.log('preview');
  const config = JSON.parse(req.body.preview_action);
  console.log(config);
  lights.preview(config)
  res.status(200).end();
});

app.listen(port, () => { console.log(`Listening on ${port}`) });

async function main() {
  await lights.update(JSON.parse(fs.readFileSync(CONFIG, {encoding: 'utf-8'})));
  await lights.preview({
    action: 'trace',
    colors: ['white'],
    time: 0.1,
    tail: 5,
    reverse: false,
    speed: 4, 
  });
  lights.start();
}

main();
