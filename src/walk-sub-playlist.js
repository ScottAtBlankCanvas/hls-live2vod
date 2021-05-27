/* eslint-disable no-console */
const request = require('requestretry');
const path = require('path');

const utils = require('./utils');
const hls_utils = require('./hls-utils');
const hls_generator = require('./hls-playlist-generator');

const writeData = require('./write-data');


// Starts first promise, which will chain several others
const walkSubPlaylist = function(options) {

  let manifest = {
    duration: 0,
    visited: []
  };

  return new Promise((resolve) => {
    doNextPromise(resolve, 0, manifest, options);
  })
};

const doNextPromise = (resolve, count, manifest, options) => {
  let ms = 3000;
  if (count == 0) ms = 0;
  if (manifest && manifest.parsed && manifest.parsed.targetDuration)
    ms = 1000 * manifest.parsed.targetDuration;

  sleepThenWalkPlaylist(ms, options, manifest)
    .then(function() {
      if (options.verbose)
        console.log(`Process playlist: [${manifest.uri}] seconds: ${manifest.duration.toFixed(1)}/${options.seconds.toFixed(1)}`);

      count++;

      if (manifest.duration < options.seconds)
        doNextPromise(resolve, count, manifest, options)
      else {
        resolve();
      }
    })
}


const sleepThenWalkPlaylist = (ms, options, manifest) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      internalWalkSubPlaylist(options, manifest)
      .then(function(resources) {
        return writeData(resources, options);
      });
      resolve();
    }, ms);
  });
}



const internalWalkSubPlaylist = function(options, manifest) {
  return new Promise(function(resolve, reject) {
    const {
      basedir,
      baseuri,
      uri,
    } = options;

    let resources = [];


      manifest.uri = uri;
      // manifest.full_uri = utils.joinURI(baseuri, uri);
      // manifest.file = path.join(basedir, uri);
    if (utils.isAbsolute(manifest.uri)) {
      manifest.full_uri = manifest.uri;
      manifest.uri = utils.urlPathname(manifest.full_uri);
      manifest.file = path.join(basedir, manifest.uri);
          //   const parsed = url.parse(playlist.uri);
      // opts.baseuri = parsed.protocol+"//"+parsed.hostname+"/";   // TODO: make util fcn
    } else {
      const rel_uri = manifest.uri;  // may have query params
      manifest.full_uri = utils.joinURI(baseuri, rel_uri);  // may have query params
      manifest.uri = utils.urlPathname(rel_uri);   // No query params
      manifest.file = path.join(basedir, manifest.uri);
    }


// console.log('opts:');
// console.log(options);
//     console.log('basedir:'+basedir);
//     console.log('manifest.uri:'+manifest.uri);
//     console.log('manifest.full_uri:'+manifest.full_uri);
//     console.log('manifest.file:'+manifest.file);


    let requestPromise = request({
      url: manifest.full_uri,
      timeout: options.requestTimeout,
      maxAttempts: options.requestRetryMaxAttempts,
      retryDelay: options.requestRetryDelay
    });

    requestPromise.then(function(response) {
//      console.log('resp:'+response.statusCode);
      if (response.statusCode !== 200) {
        const manifestError = new Error(response.statusCode + '|' + manifest.full_uri);

        manifestError.reponse = {body: response.body, headers: response.headers};
        return utils.onError(manifestError, manifest.full_uri, reject);
      }
      // Only push manifest uris that get a non 200 and don't timeout

      // console.log('-------');
      // console.log(manifest.uri);
      // console.log(response.body);


      manifest.content = response.body;
      manifest.parsed = hls_utils.parseM3u8Manifest(manifest.content);
      manifest.parsed.segments = manifest.parsed.segments || [];

      // Walk the segments and set .uri, .full_uri and file attribiutes based on whether
      // original uri is absolute or not
      manifest.parsed.segments.forEach(function(s) {
        if (!s.uri) {
          return;
        }

        if (utils.isAbsolute(s.uri)) {
          s.full_uri = s.uri;
          s.uri = utils.urlPathname(s.uri);
          //   const parsed = url.parse(playlist.uri);
          // opts.baseuri = parsed.protocol+"//"+parsed.hostname+"/";   // TODO: make util fcn
        } else {
          s.full_uri = utils.joinURI(path.dirname(manifest.full_uri), s.uri);
        }
        s.file = path.join(path.dirname(manifest.file), s.uri);
      });

      // Note: important for thi to be AFTER the uri adjustment above and BEFORE marking items as visited below
      updateVODManifest(manifest);


      // SEGMENTS: update duration and push if not already visted
      manifest.parsed.segments.forEach(function(s) {
        if (!s.uri) {
          return;
        }

        // If already processed, skip it
        if (manifest.visited[s.uri]) {
          return;
        }
        manifest.visited[s.uri] = true;

        //console.log(s.uri+' | '+s.full_uri+' | '+s.file);

        if (typeof s.duration !== 'undefined')
          manifest.duration += s.duration;

        resources.push(s);
      });


      // Update the manifest content to be the VOD equivalent and oush to write the file
      if (manifest.content) {
        manifest.content = hls_generator(manifest.vod);
      }
      resources.push(manifest);

      resolve(resources);
    }) // request promise
    .catch(function(err) {
      utils.onError(err, manifest.full_uri, reject);
    });

  })
  .catch(function(error) {
    utils.onError(error, manifest.full_uri, null);
  })
};

// Given the live manifest model, create or update an equivalent VOD manifest
const updateVODManifest = function(manifest) {

  // First time, use the live playlist as the starting point
  if (!manifest.vod) {
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
      // TODO: something is broken with LLHLS and MAPs
      if (!s.uri /*|| !s.map*/ || manifest.visited[s.uri]) {
        return;
      }

      // Remove parts if segment has them as not useful in vod
      if (s.parts)
        delete s.parts;

      manifest.vod.segments.push(s);
    });

  }
};


module.exports = walkSubPlaylist;
