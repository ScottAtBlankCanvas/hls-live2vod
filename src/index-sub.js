/* eslint-disable no-console */
const WalkSubPlaylist = require('./walk-sub-playlist');
const WriteData = require('./write-data');
const utils = require('./utils');

const startTime = Date.now();

let manifest = {};
manifest.duration = 0;
manifest.visited = [];


let settings = {};

const sleepThenWalkPlaylist = (ms) => {
  console.log(`Wait: ${ms} ms`);
  return new Promise((resolve) => {
    setTimeout(() => {

      WalkSubPlaylist(settings, manifest)
          .then(function(resources) {
            return WriteData(resources, 2);  // TODO: get rid of magic number
          });

      resolve(ms);
    }, ms);
  });
}


const doNextPromise = (count) => {
  let ms = 3000;
  if (count == 0) ms = 0;
  if (manifest && manifest.parsed && manifest.parsed.targetDuration)
    ms = 1000 * manifest.parsed.targetDuration;

  sleepThenWalkPlaylist(ms)
    .then(x => {
      //console.log(`Execute[${count}] dur:`+manifest.duration+' neededSeconds:'+settings.seconds);
      count++;

      if (manifest.duration < settings.seconds)
        doNextPromise(count)
    })
}

// Starts first promise, which will chain several others
const main = function(options) {
  settings = {
    basedir: options.output,
    uri: options.input,
    baseuri: options.baseuri,
    seconds: options.seconds
  };

  // console.log('settings:');
  // console.log(settings);

  return new Promise((resolve, reject) => {
    doNextPromise(0);
  })
};

module.exports = main;
