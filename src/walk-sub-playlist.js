/* eslint-disable no-console */
const request = require('requestretry');
const path = require('path');

const utils = require('./utils');
const hlsGenerator = require('./hls-generator');

const WriteData = require('./write-data');

const startTime = Date.now();

let manifest = {};
manifest.duration = 0;
manifest.visited = [];


let settings = {};

const sleepThenWalkPlaylist = (ms) => {
  console.log(`Wait: ${ms} ms`);
  return new Promise((resolve) => {
    setTimeout(() => {

      walkSubPlaylist(settings, manifest)
          .then(function(resources) {
            return WriteData(resources, 2);  // TODO: get rid of magic number
          });

      resolve(ms);
    }, ms);
  });
}


const doNextPromise = (count) => {
  let ms = 3000;
  if (count == 0) ms = 0;
  if (manifest && manifest.parsed && manifest.parsed.targetDuration)
    ms = 1000 * manifest.parsed.targetDuration;

  sleepThenWalkPlaylist(ms)
    .then(x => {
      //console.log(`Execute[${count}] dur:`+manifest.duration+' neededSeconds:'+settings.seconds);
      count++;

      if (manifest.duration < settings.seconds)
        doNextPromise(count)
    })
}

// Starts first promise, which will chain several others
const main = function(options) {
  settings = {
    basedir: options.output,
    uri: options.input,
    baseuri: options.baseuri,
    seconds: options.seconds
  };

  console.log('settings:');
  console.log(settings);

  return new Promise((resolve, reject) => {
    doNextPromise(0);
  })
};





const walkSubPlaylist = function(options, manifest) {
  return new Promise(function(resolve, reject) {
    const {
      basedir,
      baseuri,
      uri,
      onError = function(err, errUri, resources, res, rej) {
        console.log(err);
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
      manifest.uri = utils.joinURI(baseuri, uri);
      //console.log('manifest.uri:'+manifest.uri);

      manifest.file = path.join(basedir, uri);
      //console.log('manifest.file:'+manifest.file);
    }

    let requestPromise = request({
      url: manifest.uri,
      timeout: requestTimeout,
      maxAttempts: requestRetryMaxAttempts,
      retryDelay: requestRetryDelay
    });

    requestPromise.then(function(response) {
      console.log('resp:'+response.statusCode);
      if (response.statusCode !== 200) {
        const manifestError = new Error(response.statusCode + '|' + manifest.uri);

        manifestError.reponse = {body: response.body, headers: response.headers};
        return onError(manifestError, manifest.uri, resources, resolve, reject);
      }
      // Only push manifest uris that get a non 200 and don't timeout

      // console.log('-------');
      // console.log(manifest.uri);
      // console.log(response.body);

      resources.push(manifest);

      manifest.content = response.body;
      manifest.parsed = utils.parseM3u8Manifest(manifest.content);
 console.log(manifest.content);

// console.log('parsed');
// console.log(manifest.parsed);

      manifest.parsed.segments = manifest.parsed.segments || [];

      // Now add segments to the manifest VOD
      if (!manifest.vod) {
        // first playlist, use this for the starting point for the VOD playlist
        manifest.vod = manifest.parsed;
        // And remove some items that do not apply to VOD
        delete manifest.vod.foobar;
        delete manifest.vod.serverControl;
        delete manifest.vod.partInf;
        delete manifest.vod.partTargetDuration;
        delete manifest.vod.renditionReports;
        delete manifest.vod.preloadSegment;

        // Its a VOD
        manifest.vod.endList = true;

        // remove parts
        manifest.parsed.segments.forEach(function(s) {
          // Modify the segment so it will be correct for VOD
          delete s.parts;
        });

      }
      else {
        // after first time, add new segments to the VOD playlist
        manifest.parsed.segments.forEach(function(s) {
          if (!s.uri || !s.map) {
            return;
          }
          // If already processed, skip it
          if (manifest.visited[s.uri]) {
  //            console.log('Already downloaded uri:'+s.uri);
            return;
          }

          // Modify the segment so it will be correct for VOD
          if (s.parts)
            delete s.parts;

//console.log('s: '+s.uri);
          manifest.vod.segments.push(s);
        });

      }
      // console.log('vod');
      // console.log(manifest.vod);

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

          s.fullUri = s.uri;
          if (!utils.isAbsolute(s.fullUri)) {
            s.fullUri = utils.joinURI(path.dirname(manifest.uri), s.fullUri);
          }

          if (typeof s.duration !== 'undefined')
            manifest.duration += s.duration;

          resources.push(s);
        });

        if (manifest.content) {
          manifest.content = hlsGenerator(manifest.vod);
        }


        resolve(resources);
    })
      .catch(function(err) {
        onError(err, manifest.uri, resources, resolve, reject);
      });
  })
  .catch(function(error) {
    console.log(error);
  })
};

//module.exports = walkSubPlaylist;
module.exports = main;
