const gpio = require('rpi-gpio').promise;
const leds = require('rpi-ws2801');

const PIXELS = 125;

let run_leds = false;
try { 
  run_leds = leds.connect(PIXELS); 
  if (run_leds === undefined) run_leds = true;
}
catch(e) {
  console.log(e);
}

let gpio_up = false;
if (run_leds) gpio.setup(15, gpio.DIR_OUT).then(() => { gpio_up = true; });
else console.log('Not running LEDs');

let config = {
  state: 0,
  start: 7,
  end: 22,
  actions: [{ 
    action: 'solid',
    speed: 0,
    time: 1,
    reverse: 0,
    colors:['white'],
    brightness: 0.5,
  }],
};

let updated_config = new Date();

let should_run = false;
let running = false;

async function waitGPIO() {
  while (run_leds && !gpio_up) await new Promise(c => setTimeout(c, 100));
}

async function quit() {
  await stop();
  console.log('Exiting');
  if (run_leds)  {
    await waitGPIO();
    gpio.write(15, false);
  }
  process.exit();
}

function update(new_config) {
  config = new_config;
  updated_config = new Date();
}

async function start() {
  console.log('Starting');

  should_run = true;
  running = true;

  if (run_leds) {
    await waitGPIO();
    gpio.write(15, true); 
  }

  await alight();
  await dim();

  console.log('Running');

  try {
    let run_config = JSON.parse(JSON.stringify(config));
    let read_config = new Date(0);

    while(should_run) {
      if (read_config < updated_config) {
        console.log('Reading updated config');
        run_config = JSON.parse(JSON.stringify(config));
        read_config = new Date();
        console.log(JSON.stringify(run_config));
      }

      if (!should_run) break;

      const now = (new Date()).getHours();
      if (now < run_config.start || now >= run_config.end) {
        await new Promise(c => setTimeout(c, 1000));
        continue;
      }

      for(const action of run_config.actions) {
        await run(action);
        if (!should_run) break;
      }

      if (now < run_config.start || now >= run_config.end) await dim();
    }
  }
  catch (e) {
    console.error('Stopping on error', e);
  }

  await dim();
  running = false;
  console.log('Done Running');
}

async function stop() {
  console.log('Stopping');

  should_run = false;
  while(running) await (new Promise(c => setTimeout(c, 100)));
  console.log('Stopped');
  off();
}

async function preview(action) {
  console.log(`Previewing ${action.action}`);
  const restart = should_run;
  await stop();
  should_run = true;
  await run(action);
  should_run = false;
  if (restart) await start();
}

async function run(action) {
  console.log(`Running ${action.action}`);
  const now = new Date();
  const end = action.time ? new Date(now.getTime() + action.time * 60000) : null;
  while (!end || end > new Date()) {
    if (!should_run) return;
    await actions[action.action](action); //new Promise(c => setTimeout(c, 1000));
  }
}

colors = {
  white: [130, 130, 130],
  black: [0,0,0],
  red: [255,0,0],
  green: [0,255,0],
  blue: [0,0,255],
  orange: [255, 110, 0],
  yellow: [190, 150, 10],
  violet: [150, 0, 160],
}

function color_step(c0, c1, pct) {
  if (typeof c0 === 'string') c0 = colors[c0];
  if (typeof c1 === 'string') c1 = colors[c1];

  return [
    Math.round(c0[0] - (c0[0] - c1[0]) * pct),
    Math.round(c0[1] - (c0[1] - c1[1]) * pct),
    Math.round(c0[2] - (c0[2] - c1[2]) * pct),
  ]
}

const range = (start, end) => Array.from({length: Math.abs(end-start)}, (_, i) => end > start ? start + i : start - i);

async function off() {
  leds.fill(0,0,0);
}

async function dim() {
  console.log('Dimming');
  const channels = run_leds ? leds.getChannelCount() : PIXELS * 3;
  for (const b of range(50, -1)) {
    for (const j of range(0, channels)) {
      if (run_leds) leds.setChannelPower(j, b/100);
    }
    if (run_leds) leds.update();
    else console.log(`setChannelPower ${b}`);
    await new Promise(c => setTimeout(c, 10));
  }
}

async function alight() {
  console.log('Lighting');
  const channels = run_leds ? leds.getChannelCount() : PIXELS * 3;
  for (const b of range(0, 50)) {
    for (const j of range(0, channels)) {
      if (run_leds) leds.setChannelPower(j, b/100);
    }
    if (run_leds) leds.update();
    await new Promise(c => setTimeout(c, 10));
  }
}

async function rainbow(action) {
  const transitions = Math.ceil(PIXELS/(action.colors.length - 1));
  const rainbow_colors = [];
  for (let i = 0; i < action.colors.length; i++) {
    for (let j = 0; j < transitions; j++) {
      const color = color_step(action.colors[i], action.colors[(i + 1) % action.colors.length], j / transitions)
      rainbow_colors.push(color);
    }
  }

  if (action.reverse) rainbow_colors.reverse();

  for (let i = 0; i < PIXELS; i++) {
    for (let j = 0; j < PIXELS; j++) {
      if (run_leds) leds.setColor(j, rainbow_colors[(j + i) % PIXELS])
      if (!should_run) return;
    }
    if (run_leds) leds.update();
    if (!should_run) return;
    const speed = action.speed ? 0.1/action.speed * 1000 : 100;
    await new Promise(c => setTimeout(c, speed));
  }

  if (!run_leds) console.log(`setColors ${rainbow_colors}`);
}

async function  solid(action) {
  const [r,g,b] = color_step(action.colors[0], 'black', 1 - action.brightness)
  if (run_leds) leds.fill(r,g,b);
  else console.log(`fill ${r} ${g} ${b}`);
  const end = new Date(new Date().getTime() + (action.time ? action.time : 1) * 60000);
  while (end > new Date()) {
    if (!should_run) return;
    await new Promise(c => setTimeout(c, 1000));
  }
}

async function runTrace(tail, direction, color, speed) {
  if (typeof color === 'string') color = colors[color];
  const order = range(0, PIXELS);
  if (direction) order.reverse();

  const [a,b,c] = color;
  const max = Math.max(a,b,c);
  const stride = Math.round(max / tail)
  const bias = max * (1 - Math.log(stride)/Math.log(max)) / 2;

  for (const i of order) {
    let pos = Math.max(0, i - tail)
    if (direction) pos = Math.min(PIXELS, i + tail);

    if (run_leds) leds.setColor(i, color);
    else console.log(`setColor ${i} ${color}`);

    let otail = range(pos, i);
    if (direction) otail = range(i, pos);
    else otail.reverse(); 

    let step = 0
    for (const j of otail) {
      let [r, g, b] = color;
      r = Math.round(Math.max(0, r - bias - step * stride));
      g = Math.round(Math.max(0, g - bias - step * stride));
      b = Math.round(Math.max(0, b - bias - step * stride));
      if (run_leds) leds.setColor(j, [r,g,b]);
      else if (r || g || b) console.log(`setColor ${j} ${r} ${g} ${b}`);
      step++;
    }

    if (run_leds) leds.update();
    else console.log('Update');
    if (!should_run) return;
    const run_speed = speed ? 0.1/speed * 1000 : 100;
    await new Promise(c => setTimeout(c, run_speed));
  }
}

async function trace(action) {
  await runTrace(action.tail, action.reverse,  action.colors[0], action.speed);
  if (!should_run) return;
  await runTrace(action.tail, !action.reverse,  action.colors[0], action.speed);
}

async function blink(action) {
  const blink_colors = action.colors.map(c => colors[c]).concat(range(0, action.alternate).map(x => colors['black']));
  if (action.reverse) blink_colors.reverse();

  for (const i of range(0, PIXELS)) {
    if (run_leds) leds.setColor(i, blink_colors[i % blink_colors.length]);
    else console.log(`setColor ${i} ${blink_colors[i % blink_colors.length]}`);
  }
  if (run_leds) leds.update();
  else console.log('Update');

  let wait_ms = 1000/(action.speed ? action.speed : 1);
  for (let wait = 0; wait < wait_ms; wait += 100) {
    if (!should_run) return;
    await new Promise(c => setTimeout(c, wait_ms));
  }

  await dim();

  wait_ms = 500/(action.speed ? action.speed : 1);
  for (let wait = 0; wait < wait_ms; wait += 100) {
    if (!should_run) return;
    await new Promise(c => setTimeout(c, wait_ms));
  }
}

async function alternate(action) {
  const alt_colors = action.colors.map(c => colors[c]);
  if (action.reverse) alt_colors.reverse();

  for (const i of range(0, PIXELS)) {
    if (run_leds) leds.setColor(i, alt_colors[i % alt_colors.length]);
    else console.log(`setColor ${i} ${alt_colors[i % alt_colors.length]}`);
  }
  if (run_leds) leds.update();
  else console.log('Update');

  let wait_ms = 5000/(action.speed ? action.speed : 1);
  for (let wait = 0; wait < wait_ms; wait += 100) {
    if (!should_run) return;
    await new Promise(c => setTimeout(c, wait_ms));
  }
}

async function cycle(action) {
  const cycle_colors = action.colors.map(c => color_step(c, 'black', 1 - action.brightness))
  if (action.reverse) cycle_colors.reverse();

  const speed = action.speed ? 0.2/action.speed * 1000 : 1000;
  const transition = 100;

  for (const i of range(0, cycle_colors.length - 1)) {
    for (const j of range(0, transition)) {
      const [r,g,b] = color_step(cycle_colors[i], cycle_colors[i + 1], j/transition);
      if (run_leds) leds.fill(r,g,b);
      else console.log(`fill ${r} ${g} ${b}`);

      if (!should_run) return;
      await new Promise(c => setTimeout(c, speed));
    }
  }

  cycle_colors.reverse();
  for (const i of range(0, cycle_colors.length - 1)) {
    for (const j of range(0, transition)) {
      const [r,g,b] = color_step(cycle_colors[i], cycle_colors[i + 1], j/transition);
      if (run_leds) leds.fill(r,g,b);
      else console.log(`fill ${r} ${g} ${b}`);

      if (!should_run) return;
      await new Promise(c => setTimeout(c, speed));
    }
  }

}

actions = {
  rainbow,
  solid,
  trace,
  blink,
  alternate,
  cycle,
}

process.on('exit', quit);
process.on('SIGINT', quit);
process.on('SIGUSR1', quit);
process.on('SIGUSR2', quit);
process.on('uncaughException', quit);

module.exports = {
  update,
  start,
  stop,
  preview,
  quit,
}

