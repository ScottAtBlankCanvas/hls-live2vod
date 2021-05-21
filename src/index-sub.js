/* eslint-disable no-console */
const WalkSubPlaylist = require('./walk-sub-playlist');
const WriteData = require('./write-data');
const utils = require('./utils');

const startTime = Date.now();

const loopPlaylist = (n, ms, settings) => {
  console.log(`Wait[${n}]: ${ms} ms`);
  return new Promise((resolve) => {
    setTimeout(() => {

      WalkSubPlaylist(settings)
          .then(function(resources) {
            //console.log('Downloading data...');
            return WriteData(resources, 8);
          });

      resolve(ms);
    }, ms);
  });
}

// TODO: First time, no delay
// TODO: pass in manifest so we can capture all the data (like duration?)

const doNextPromise = (n, settings) => {
  loopPlaylist(n, 2000, settings)
    .then(x => {
      console.log(`Execute[${n}]`);
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
