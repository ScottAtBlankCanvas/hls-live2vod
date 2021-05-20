/* eslint-disable no-console */
const request = require('requestretry');
const path = require('path');

const utils = require('./utils');

/*
const collectPlaylists = function(parsed) {
  return []
    .concat(parsed.playlists || [])
    .concat(utils.mediaGroupPlaylists(parsed.mediaGroups || {}) || [])
    .reduce(function(acc, p) {
      acc.push(p);

      if (p.playlists) {
        acc = acc.concat(collectPlaylists(p));
      }
      return acc;
    }, []);
};
*/


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

    console.log('walkMainPlaylist uri:'+uri);

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
      console.log('XXX walkMainPlaylist 2 file:'+manifest.file+" ["+basedir+":"+uri+']');
    }

    let existingManifest;

/*
    // if we are not the master playlist
    if (parent) {
//      console.log('XXX 3b file:'+manifest.file);
//      console.log('XXX 3b  uri:'+manifest.uri);

      // get the real uri of this playlist
      if (!isAbsolute(manifest.uri)) {
        manifest.uri = joinURI(path.dirname(parent.uri), manifest.uri);
      }
      existingManifest = visitedUrls[manifest.uri];

      const file = existingManifest && existingManifest.file || manifest.file;
      const relativePath = path.relative(path.dirname(parent.file), file);

//      console.log('XXX 3c file:'+manifest.file);
//      console.log('XXX 3c  uri:'+manifest.uri);

      // replace original uri in file with new file path
      parent.content = Buffer.from(parent.content.toString().replace(uri, relativePath));
    }

    if (existingManifest) {
      console.error(`[WARN] Trying to visit the same uri again; skipping to avoid getting stuck in a cycle: ${manifest.uri}`);
      return resolve(resources);
    }
    */
    visitedUrls[manifest.uri] = manifest;

    let requestPromise;

    console.log('manifest.uri:'+manifest.uri);
    console.log('requestTimeout:'+requestTimeout);
    console.log('requestRetryMaxAttempts:'+requestRetryMaxAttempts);
    console.log('requestRetryDelay:'+requestRetryDelay);


    requestPromise = request({
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
/*
if (manifest.uri.includes('audio'))  {
  console.log(manifest.parsed);
console.log(manifest.file);
console.log(manifest.uri);
}
*/

      manifest.parsed.segments = manifest.parsed.segments || [];
      manifest.parsed.playlists = manifest.parsed.playlists || [];
      manifest.parsed.mediaGroups = manifest.parsed.mediaGroups || {};


/*
      const initSegments = [];

      manifest.parsed.segments.forEach(function(s) {
        if (s.map && s.map.uri && !initSegments.some((m) => s.map.uri === m.uri)) {
          manifest.parsed.segments.push(s.map);
          initSegments.push(s.map);
        }
      });

      const playlists = manifest.parsed.playlists.concat(mediaGroupPlaylists(manifest.parsed.mediaGroups));


        // SEGMENTS
        manifest.parsed.segments.forEach(function(s, i) {
          if (!s.uri) {
            return;
          }
          // put segments in manifest-name/segment-name.ts
          s.file = path.join(path.dirname(manifest.file), urlBasename(s.uri));
console.log('XXX file:'+s.file);
console.log('XXX  uri:'+s.uri);

console.log('XXX file:'+s.file+" ["+manifest.file+":"+s.uri+']');
          if (!isAbsolute(s.uri)) {
            s.uri = joinURI(path.dirname(manifest.uri), s.uri);
          }
          if (manifest.content) {
            manifest.content = Buffer.from(manifest.content.toString().replace(
              s.uri,
              path.relative(path.dirname(manifest.file), s.file)
            ));
          }
//          console.log('segs');
//  console.log(s);

          if (typeof s.duration !== 'undefined')
            manifest.duration += s.duration;

          console.log("  DUR: "+manifest.uri+"  : "+manifest.duration);

          resources.push(s);
        });

        // SUB Playlists
        const subs = playlists.map(function(p, z) {
          if (!p.uri) {
            return Promise.resolve(resources);
          }
          return walkPlaylist({
            basedir,
            uri: p.uri,
            parent: manifest,
            manifestIndex: z,
            onError,
            visitedUrls,
            requestTimeout,
            requestRetryMaxAttempts,
            requestRetryDelay
          });
        });

        Promise.all(subs).then(function(r) {
          const flatten = [].concat.apply([], r);

          resources = resources.concat(flatten);
          resolve(resources);
        }).catch(function(err) {
          onError(err, manifest.uri, resources, resolve, reject);
        });
        */
        return resolve(manifest);
    })
      .catch(function(err) {
        onError(err, manifest.uri, resources, resolve, reject);
      });
  });
};

module.exports = walkMainPlaylist;
