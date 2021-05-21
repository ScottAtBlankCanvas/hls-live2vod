/* eslint-disable no-console */
const WalkSubPlaylist = require('./walk-sub-playlist');
const WriteData = require('./write-data');
const utils = require('./utils');

const startTime = Date.now();

let manifest = {};
manifest.duration = 0;
manifest.visited = [];

const loopPlaylist = (n, ms, settings) => {
  console.log(`Wait[${n}]: ${ms} ms`);
  return new Promise((resolve) => {
    setTimeout(() => {

      WalkSubPlaylist(settings, manifest)
          .then(function(resources) {
            //console.log('Downloading data...');
            return WriteData(resources, 8);  // TODO: get rid of magic number
          });

      resolve(ms);
    }, ms);
  });
}


const doNextPromise = (n, settings) => {
  let ms = 3000;
  if (n == 0) ms = 0;

  loopPlaylist(n, ms, settings)
    .then(x => {
      console.log(`Execute[${n}] dur:`+manifest.duration);
      n++;

      // TODO: stop when we get to required number of
      if (n < 3)
        doNextPromise(n, settings)
    })
}

// Starts first promise, which will chain several others
const main = function(options) {
  //console.log('Gathering Manifest data...');


  const settings = {
    basedir: options.output,
    uri: options.input,
    baseuri: options.baseuri
  };

  console.log('settings:'+settings);

  return new Promise((resolve, reject) => {
    console.log('Initial');
    doNextPromise(0, settings);
  })
};

module.exports = main;
