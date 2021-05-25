/* eslint-disable no-console */
const request = require('requestretry');
const path = require('path');
const utils = require('./utils');
const hls_utils = require('./hls-utils');
const writeData = require('./write-data');
const walkSubPlaylist = require('./walk-sub-playlist');

const walkMainPlaylist = function(options) {
  return new Promise(function(resolve, reject) {
    const {
      basedir,
      uri
    } = options;

    let resources = [];
    const manifest = {
      duration: 0
    };

    if (uri) {
      manifest.uri = uri;
      manifest.full_uri = uri;
      manifest.file = path.join(basedir, utils.urlBasename(uri));
    }

    let requestPromise = request({
      url: manifest.uri,
      timeout: options.requestTimeout,
      maxAttempts: options.requestRetryMaxAttempts,
      retryDelay: options.requestRetryDelay
    });

    requestPromise.then(function(response) {
//      console.log('> requestPromise.then resp:'+response.statusCode);
      if (response.statusCode !== 200) {
        const manifestError = new Error(response.statusCode + '|' + manifest.uri);

        manifestError.reponse = {body: response.body, headers: response.headers};
        return utils.onError(manifestError, manifest.uri, reject);
      }
      // Only push manifest uris that get a non 200 and don't timeout

      // console.log(`Main playlist: ${manifest.uri}`);
      // console.log(response.body);

      manifest.content = response.body;

      manifest.parsed = hls_utils.parseM3u8Manifest(manifest.content);
      manifest.parsed.segments = manifest.parsed.segments || [];
      manifest.parsed.playlists = manifest.parsed.playlists || [];
      manifest.parsed.mediaGroups = manifest.parsed.mediaGroups || {};

      resources.push(manifest);

      writeData([manifest], options);

      const playlists = manifest.parsed.playlists.concat(hls_utils.mediaGroupPlaylists(manifest.parsed.mediaGroups));

      const subs = playlists.map(function(playlist) {
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
        resolve();
      }).catch(function(err) {
        utils.onError(err, manifest.full_uri, null);
      });
    })
    .catch(function(err) {
      utils.onError(err, manifest.uri, reject);
    });
  });
};

module.exports = walkMainPlaylist;
