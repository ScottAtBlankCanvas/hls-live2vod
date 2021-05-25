/* eslint-disable no-console */
const walkSubPlaylist = require('./walk-sub-playlist');
const walkMainPlaylist = require('./walk-main-playlist');
const writeData = require('./write-data');
const utils = require('./utils');
const hls_utils = require('./hls-utils');
const path = require('path');

// TODO: rename this file hls-2-vod.js
const hlsLiveToVOD = function(options) {

  return walkMainPlaylist(options)
    .then(function(manifest) {

      // write the master playlist
      writeData([manifest], options);  // TODO: get rid of magic number

      const {
        basedir,
        uri,
        verbose = false,
        concurrency = 3,
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



      const playlists = manifest.parsed.playlists.concat(hls_utils.mediaGroupPlaylists(manifest.parsed.mediaGroups));

      const subs = playlists.map(function(pl, z) {
        if (!pl.uri) {
          return Promise.resolve();
        }
        return walkSubPlaylist(
          {
            uri: pl.uri,
            basedir: options.basedir,
            baseuri: path.dirname(manifest.full_uri),
            seconds: options.seconds,
            verbose: options.verbose,
            concurrency: options.concurrency
          });
      });

      Promise.all(subs).then(function() {
        // TODO: never gets here???
        console.log('ALL subs then');
        resolve();
      }).catch(function(err) {
        onError(err, manifest.full_uri, resources, resolve, reject);
      });

    });
};

module.exports = hlsLiveToVOD;
