/* eslint-disable no-console */
const walkSubPlaylist = require('./walk-sub-playlist');
const walkMainPlaylist = require('./walk-main-playlist');
const writeData = require('./write-data');
const utils = require('./utils');
const hls_utils = require('./hls-utils');
const path = require('path');

const hlsLiveToVOD = function(options) {

  const settings = {
    basedir: options.output,
    uri: options.input
  };

  return walkMainPlaylist(settings)
    .then(function(manifest) {

      // write the master playlist
      writeData([manifest], 2);  // TODO: get rid of magic number

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



      const playlists = manifest.parsed.playlists.concat(hls_utils.mediaGroupPlaylists(manifest.parsed.mediaGroups));

      const subs = playlists.map(function(pl, z) {
        if (!pl.uri) {
          return Promise.resolve();
        }
        return walkSubPlaylist(
          {
            input: pl.uri,
            output: settings.basedir,  // undef
            baseuri: path.dirname(manifest.full_uri),
            seconds: options.seconds    // OK
          });
      });

      Promise.all(subs).then(function() {
        console.log('ALL subs then');
        resolve();
      }).catch(function(err) {
        onError(err, manifest.full_uri, resources, resolve, reject);
      });

    });
};

module.exports = hlsLiveToVOD;
