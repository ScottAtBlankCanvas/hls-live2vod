/* eslint-disable no-console */
const WalkSubManifest = require('./walk-sub-playlist');
const WalkMainPlaylist = require('./walk-main-playlist');
const WriteData = require('./write-data');
const utils = require('./utils');

const main = function(options) {
  console.log('Gathering Manifest data...');
  const settings = {basedir: options.output, uri: options.input};

  return WalkMainPlaylist(settings)
    .then(function(manifest) {
      console.log('options:');
      console.log(options);
      console.log('settings:');
      console.log(settings);

      const {
        basedir,
        uri,
        parent = false,
        manifestIndex = 0,
        onError = function(err, errUri, resources, res, rej) {
          // Avoid adding the top level uri to nested errors
          if (err.message.includes('|')) {
            rej(err);
          } else {
            rej(new Error(err.message + '|' + errUri));
          }
        },
        visitedUrls = [],
        requestTimeout = 1500,
        requestRetryMaxAttempts = 5,
        requestRetryDelay = 5000
      } = options;

      console.log('manifest:');
      console.log(manifest);

      console.log('options:');
      console.log(options);

      const playlists = manifest.parsed.playlists.concat(utils.mediaGroupPlaylists(manifest.parsed.mediaGroups));

      // SUB Playlists
      const subs = playlists.map(function(p, z) {
        if (!p.uri) {
          return Promise.resolve(resources);
        }
        return WalkSubManifest(manifest,
          {
            basedir: settings.basedir,
            uri: p.uri,
            parent: manifest,
            manifestIndex: z,
            onError,
            visitedUrls,
            requestTimeout,
            requestRetryMaxAttempts,
            requestRetryDelay
          });
      });
    }).then(function(resources) {
      console.log('resources:');
      console.log(resources);

          console.log('Downloading data...');
          return WriteData(resources, 8);
    });
};

module.exports = main;
module.exports.WalkSubManifest = WalkSubManifest;
module.exports.WalkMainPlaylist = WalkMainPlaylist;
