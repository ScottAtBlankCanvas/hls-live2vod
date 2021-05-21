/* eslint-disable no-console */
const request = require('requestretry');
const path = require('path');

const utils = require('./utils');



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
 //console.log(manifest.content);

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
      console.log('vod');
      console.log(manifest.vod);

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

          // put segments in manifest-name/segment-name.ts
//          console.log('XXX manifest.file:'+manifest.file);
//          console.log('XXX  uri:'+s.uri);

          s.file = path.join(path.dirname(manifest.file), utils.urlBasename(s.uri));
//          console.log('XXX :'+s);

// console.log('sub file:'+s.file);
// console.log('sub  uri:'+s.uri);
console.log('['+manifest.uri+'] VISITED: '+s.uri);

          manifest.visited[s.uri] = manifest;

//console.log('XXX file:'+s.file+" ["+manifest.file+":"+s.uri+']');
          if (!utils.isAbsolute(s.uri)) {
            s.uri = utils.joinURI(path.dirname(manifest.uri), s.uri);
          }
          if (manifest.content) {
            manifest.content = Buffer.from(manifest.content.toString().replace(
              s.uri,
              path.relative(path.dirname(manifest.file), s.file)
            ));
          }

          // TODO: add up duration when we download the segment??
          if (typeof s.duration !== 'undefined')
            manifest.duration += s.duration;
          //console.log("  DUR: "+manifest.uri+"  : "+manifest.duration);

          resources.push(s);
        });

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

module.exports = walkSubPlaylist;
