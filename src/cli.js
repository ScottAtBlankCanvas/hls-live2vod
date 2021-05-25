#!/usr/bin/env node
const path = require('path');
const yargs = require("yargs");

const walkMainPlaylist = require('./walk-main-playlist');

const args = yargs
 .usage("Usage: hls-live2vod [-o <output>] [-s <seconds>] [-v]  <url> ")
 .demandCommand(1)
 .option("o", { alias: "output", describe: "output location", default: "./", type: "string", demandOption: false })
 .option("s", { alias: "seconds", describe: "Seconds of live HLS to download URL", default: 120, type: "integer", demandOption: false })
 .option("v", { alias: "verbose", describe: "Verbose output", default: false, type: "boolean", demandOption: false })
 .argv;


// Make output path
const basedir = path.resolve(args.output);
const startTime = Date.now();
const options = {
  uri: args._[0],
  baseuri: args.baseuri,
  basedir: basedir,
  seconds: args.seconds,
  verbose: args.verbose,
  concurrency: 3,
  requestTimeout: 1000,
  requestRetryMaxAttempts: 3,
  requestRetryDelay: 1000
};

walkMainPlaylist(options).then(function() {
  const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('Operation completed successfully in', timeTaken, 'seconds.');

  process.exit(0);
}).catch(function(error) {
  console.error('ERROR', error);

  process.exit(1);
});
