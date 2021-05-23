#!/usr/bin/env node
const path = require('path');
const yargs = require("yargs");
const start = require('./index');
//const start = require('./walk-sub-playlist');

const args = yargs
 .usage("Usage: -u <url> -o <output> -s <seconds>")
 .option("u", { alias: "url", describe: "URL of HLS main manifest", type: "string", demandOption: true })
 .option("o", { alias: "output", describe: "output location (Default ./)", default: "./", type: "string", demandOption: false })
 .option("s", { alias: "seconds", describe: "Seconds of live HLS to download URL (Default: 120)", default: 120, type: "integer", demandOption: false })
 .argv;

console.log(`hls-live2vod -u ${args.url} -o ${args.output} -s ${args.seconds}`);

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
  console.log('TODO: should not get here until everything processed!!');
  const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('Operation completed successfully in', timeTaken, 'seconds.');
//  process.exit(0);  // TODO: was causing this to not run downlaoding.  somehow finish sub playlists before resolv ing main
}).catch(function(error) {
  console.error('ERROR', error);
  process.exit(1);
});
