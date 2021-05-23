/* eslint-disable no-console */
const request = require('requestretry');
const path = require('path');
const utils = require('./utils');


const walkMainPlaylist = function(options) {
  return new Promise(function(resolve, reject) {
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

    let resources = [];
    const manifest = {parent};
    manifest.duration = 0;

    if (uri) {
      manifest.uri = uri;
      if (!parent)
        manifest.file = path.join(basedir, utils.urlBasename(uri));
      else
      manifest.file = path.join(basedir, uri);

      console.log('XXX walkMainPlaylist 2 file:'+manifest.file);
      console.log('XXX walkMainPlaylist 2  uri:'+manifest.uri);
    }

    let existingManifest;

    visitedUrls[manifest.uri] = manifest;

    let requestPromise;

    // console.log('manifest.uri:'+manifest.uri);
    // console.log('requestTimeout:'+requestTimeout);
    // console.log('requestRetryMaxAttempts:'+requestRetryMaxAttempts);
    // console.log('requestRetryDelay:'+requestRetryDelay);


    requestPromise = request({
      url: manifest.uri,
      timeout: requestTimeout,
      maxAttempts: requestRetryMaxAttempts,
      retryDelay: requestRetryDelay
    });

    requestPromise.then(function(response) {
      console.log('> requestPromise.then resp:'+response.statusCode);
      if (response.statusCode !== 200) {
        const manifestError = new Error(response.statusCode + '|' + manifest.uri);

        manifestError.reponse = {body: response.body, headers: response.headers};
        return onError(manifestError, manifest.uri, resources, resolve, reject);
      }
      // Only push manifest uris that get a non 200 and don't timeout

      console.log('-------');
      console.log(manifest.uri);
      console.log(response.body);


      resources.push(manifest);

      manifest.content = response.body;


      manifest.parsed = utils.parseM3u8Manifest(manifest.content);

      manifest.parsed.segments = manifest.parsed.segments || [];
      manifest.parsed.playlists = manifest.parsed.playlists || [];
      manifest.parsed.mediaGroups = manifest.parsed.mediaGroups || {};

        return resolve(manifest);
    })
      .catch(function(err) {
        onError(err, manifest.uri, resources, resolve, reject);
      });
  });
};

module.exports = walkMainPlaylist;
