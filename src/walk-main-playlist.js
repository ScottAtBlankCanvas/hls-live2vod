/* eslint-disable no-console */
const request = require('requestretry');
const path = require('path');
const utils = require('./utils');
const hls_utils = require('./hls-utils');

const walkMainPlaylist = function(options) {
  return new Promise(function(resolve, reject) {
    const {
      basedir,
      uri,
      parent = false,
      requestTimeout = 1500,
      requestRetryMaxAttempts = 5,
      requestRetryDelay = 5000
    } = options;

    let resources = [];
    const manifest = {parent};
    manifest.duration = 0;

    if (uri) {
      manifest.uri = uri;
      manifest.full_uri = uri;
      if (!parent)
        manifest.file = path.join(basedir, utils.urlBasename(uri));
      else
      manifest.file = path.join(basedir, uri);

      // console.log('XXX walkMainPlaylist 2 file:'+manifest.file);
      // console.log('XXX walkMainPlaylist 2  uri:'+manifest.uri);
      // console.log('XXX walkMainPlaylist 2  full_uri:'+manifest.full_uri);
    }

    let requestPromise = request({
      url: manifest.uri,
      timeout: requestTimeout,
      maxAttempts: requestRetryMaxAttempts,
      retryDelay: requestRetryDelay
    });

    requestPromise.then(function(response) {
//      console.log('> requestPromise.then resp:'+response.statusCode);
      if (response.statusCode !== 200) {
        const manifestError = new Error(response.statusCode + '|' + manifest.uri);

        manifestError.reponse = {body: response.body, headers: response.headers};
        return utils.onError(manifestError, manifest.uri, resources, resolve, reject);
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

      return resolve(manifest);
    })
    .catch(function(err) {
      utils.onError(err, manifest.uri, reject);
    });
  });
};

module.exports = walkMainPlaylist;
