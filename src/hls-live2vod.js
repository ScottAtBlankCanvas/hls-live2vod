/* eslint-disable no-console */
const walkSubPlaylist = require('./walk-sub-playlist');
const walkMainPlaylist = require('./walk-main-playlist');
const writeData = require('./write-data');
const utils = require('./utils');
const hls_utils = require('./hls-utils');
const path = require('path');

const hlsLiveToVOD = function(options) {

  return walkMainPlaylist(options)
    .then(function(manifest) {

      // write the master playlist
      writeData([manifest], options);

      const playlists = manifest.parsed.playlists.concat(hls_utils.mediaGroupPlaylists(manifest.parsed.mediaGroups));

      const subs = playlists.map(function(playlist) {
        if (!playlist.uri) {
          return Promise.resolve();
        }
        return walkSubPlaylist(
          {
            uri:      playlist.uri,
            basedir:  options.basedir,
            baseuri:  path.dirname(manifest.full_uri),
            seconds:  options.seconds,
            verbose:  options.verbose,
            concurrency: options.concurrency
          });
      });

      Promise.all(subs).then(function() {
        // TODO: never gets here???
        console.log('ALL subs then');
        //resolve();
      }).catch(function(err) {
        utils.onError(err, manifest.full_uri, null);
      });

    });
};

module.exports = hlsLiveToVOD;
