/* eslint-disable no-console */
const WalkSubPlaylist = require('./walk-sub-playlist');
//const WalkMainPlaylist = require('./walk-main-playlist');
const WriteData = require('./write-data');
const utils = require('./utils');

const main = function(options) {
  console.log('Gathering Manifest data...');
  const settings = {
    basedir: options.output,
    uri: options.input,
    baseuri: options.baseuri
  };

console.log(settings);

  return WalkSubPlaylist(settings)
    .then(function(resources) {
      console.log('Downloading data...');
      return WriteData(resources, 8);
    });
};


module.exports = main;
module.exports.WalkSubPlaylist = WalkSubPlaylist;
//module.exports.WalkMainPlaylist = WalkMainPlaylist;
