/* eslint-disable no-console */
const request = require('requestretry');
const path = require('path');

const utils = require('./utils');



const walkSubPlaylist = function(options) {
  return new Promise(function(resolve, reject) {
    const {
      basedir,
      baseuri,
      uri,
      manifestIndex = 0,
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

    const manifest = {};
    manifest.duration = 0;

    if (uri) {
      manifest.uri = utils.joinURI(baseuri, uri);
      console.log('manifest.uri:'+manifest.uri);

      manifest.file = path.join(basedir, uri);
      console.log('manifest.file:'+manifest.file);
    }

//    visitedUrls[manifest.uri] = manifest;

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

      console.log('-------');
      console.log(manifest.uri);
      console.log(response.body);

      resources.push(manifest);

      manifest.content = response.body;
      manifest.parsed = utils.parseM3u8Manifest(manifest.content);

      manifest.parsed.segments = manifest.parsed.segments || [];

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
          // put segments in manifest-name/segment-name.ts
//          console.log('XXX manifest.file:'+manifest.file);
//          console.log('XXX  uri:'+s.uri);

          s.file = path.join(path.dirname(manifest.file), utils.urlBasename(s.uri));
//          console.log('XXX :'+s);
console.log('sub file:'+s.file);
console.log('sub  uri:'+s.uri);

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
