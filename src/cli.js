#!/usr/bin/env node
const path = require('path');
const yargs = require("yargs");
const start = require('./index');
//const start = require('./walk-sub-playlist');

const args = yargs
 .usage("Usage: -u <url> [-bu <baseuri>]-o <output> -s <seconds>")
 .option("u", { alias: "url", describe: "URL of HLS manifest", type: "string", demandOption: true })
 .option("b", { alias: "baseuri", describe: "Base URL of HLS manifest", type: "string", demandOption: false })
 .option("o", { alias: "output", describe: "output location (Default ./)", default: "./", type: "string", demandOption: false })
 .option("s", { alias: "seconds", describe: "Seconds of live HLS to download URL (Default: 300)", default: 300, type: "integer", demandOption: false })
 .argv;


console.log(args);

const cmd = `hls-live2vod -u ${args.url} -b ${args.baseuri} -o ${args.output} -s ${args.seconds}`;
console.log(cmd);

// Make output path
const output = path.resolve(args.output);
const startTime = Date.now();
const options = {
  input: args.url,
  baseuri: args.baseuri,
  output,
  seconds: args.seconds
};

start(options).then(function() {
  console.log('start.then');
  const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('Operation completed successfully in', timeTaken, 'seconds.');
//  process.exit(0);  // TODO: was causing this to not run downlaoding.  somehow finish sub playlists before resolv ing main
}).catch(function(error) {
  console.error('ERROR', error);
  process.exit(1);
});
