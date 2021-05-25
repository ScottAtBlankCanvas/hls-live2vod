/* eslint-disable no-console */
const request = require('requestretry');
const path = require('path');

const utils = require('./utils');
const hls_utils = require('./hls-utils');
const hls_generator = require('./hls-generator');

const writeData = require('./write-data');


// Starts first promise, which will chain several others
const main = function(options) {

  let manifest = {
    duration: 0,
    visited: []
  };

  return new Promise((resolve, reject) => {
    doNextPromise(0, manifest, options);
  })
};

const doNextPromise = (count, manifest, options) => {

  let ms = 3000;
  if (count == 0) ms = 0;
  if (manifest && manifest.parsed && manifest.parsed.targetDuration)
    ms = 1000 * manifest.parsed.targetDuration;

  sleepThenWalkPlaylist(ms, options, manifest)
    .then(x => {
      if (options.verbose)
        console.log(`Process playlist: [${manifest.uri}] seconds: ${manifest.duration.toFixed(1)}/${options.seconds.toFixed(1)}`);

      count++;

      if (manifest.duration < options.seconds)
        doNextPromise(count, manifest, options)
    })
}


const sleepThenWalkPlaylist = (ms, options, manifest) => {
//  console.log(`Wait: ${ms} ms`);
  return new Promise((resolve) => {
    setTimeout(() => {
      walkSubPlaylist(options, manifest)
          .then(function(resources) {
            return writeData(resources, options);
          });

      resolve(ms);
    }, ms);
  });
}



const walkSubPlaylist = function(options, manifest) {
  return new Promise(function(resolve, reject) {
    const {
      basedir,
      baseuri,
      uri,
      onError = function(err, errUri, resources, res, rej) {
        // Avoid adding the top level uri to nested errors
        if (err.message.includes('|')) {
          rej(err);
        } else {
          rej(new Error(err.message + '|' + errUri));
        }
      },
      requestTimeout = 1500,
      requestRetryMaxAttempts = 5,
      requestRetryDelay = 5000
    } = options;

    // console.log('walkSubManifest baseuri:'+baseuri);
    // console.log('walkSubManifest uri:'+uri);

    let resources = [];


    if (uri) {
      manifest.uri = uri;
      manifest.full_uri = utils.joinURI(baseuri, uri);
      manifest.file = path.join(basedir, uri);
    }

    //console.log('manifest.uri:'+manifest.uri);
    //console.log('manifest.full_uri:'+manifest.full_uri);
    //console.log('manifest.file:'+manifest.file);


    let requestPromise = request({
      url: manifest.full_uri,
      timeout: requestTimeout,
      maxAttempts: requestRetryMaxAttempts,
      retryDelay: requestRetryDelay
    });

    requestPromise.then(function(response) {
//      console.log('resp:'+response.statusCode);
      if (response.statusCode !== 200) {
        const manifestError = new Error(response.statusCode + '|' + manifest.full_uri);

        manifestError.reponse = {body: response.body, headers: response.headers};
        return onError(manifestError, manifest.full_uri, resources, resolve, reject);
      }
      // Only push manifest uris that get a non 200 and don't timeout

      // console.log('-------');
      // console.log(manifest.uri);
      // console.log(response.body);

      resources.push(manifest);

      manifest.content = response.body;
      manifest.parsed = hls_utils.parseM3u8Manifest(manifest.content);
      manifest.parsed.segments = manifest.parsed.segments || [];

      manageVODManifest(manifest);

      // TODO: needed?
      const initSegments = [];
      manifest.parsed.segments.forEach(function(s) {
        if (s.map && s.map.uri && !initSegments.some((m) => s.map.uri === m.uri)) {
          manifest.parsed.segments.push(s.map);
          initSegments.push(s.map);
        }
      });

      // SEGMENTS
      manifest.parsed.segments.forEach(function(s, i) {
        if (!s.uri) {
          return;
        }
        // If already processed, skip it
        if (manifest.visited[s.uri]) {
//            console.log('Already downloaded uri:'+s.uri);
          return;
        }

        s.file = path.join(path.dirname(manifest.file), utils.urlBasename(s.uri));

        manifest.visited[s.uri] = manifest;

        s.full_uri = s.uri;
        if (!utils.isAbsolute(s.full_uri)) {
          s.full_uri = utils.joinURI(path.dirname(manifest.full_uri), s.full_uri);
        }

        if (typeof s.duration !== 'undefined')
          manifest.duration += s.duration;

        resources.push(s);
      });

      if (manifest.content) {
        manifest.content = hls_generator(manifest.vod);
      }

      resolve(resources);
    }) // request promise
    .catch(function(err) {
      onError(err, manifest.full_uri, resources, resolve, reject);
    });
  })
  .catch(function(error) {
    console.log(error);
  })
};

const manageVODManifest = function(manifest) {

  // Now add segments to the manifest VOD
  if (!manifest.vod) {
    // first playlist, use this for the starting point for the VOD playlist
    manifest.vod = manifest.parsed;

    // Remove some items that do not apply to VOD we are creating...
    // for example, LLHLS features
    delete manifest.vod.serverControl;
    delete manifest.vod.partInf;
    delete manifest.vod.partTargetDuration;
    delete manifest.vod.renditionReports;
    delete manifest.vod.preloadSegment;

    // Its a VOD
    manifest.vod.endList = true;

    // remove parts from segments
    manifest.parsed.segments.forEach(function(s) {
      // Modify the segment so it will be correct for VOD
      delete s.parts;
    });

  }
  else {
    // after first time, add new segments to the VOD playlist
    manifest.parsed.segments.forEach(function(s) {
      if (!s.uri || !s.map || manifest.visited[s.uri]) {
        return;
      }

      // Remove parts if segment has them as not useful in vod
      if (s.parts)
        delete s.parts;

      manifest.vod.segments.push(s);
    });

  }
};


//module.exports = walkSubPlaylist;
module.exports = main;
