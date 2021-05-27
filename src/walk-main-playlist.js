/* eslint-disable no-console */
const request = require('requestretry');
const path = require('path');
const utils = require('./utils');
const hls_utils = require('./hls-utils');
const writeData = require('./write-data');
const walkSubPlaylist = require('./walk-sub-playlist');
const url = require('url');

const makeURLsRelative= function(str) {
  let body = "";

  var parts = str.split(/\r?\n/);
  for (var i = 0; i < parts.length; i++) {
    let line = parts[i];

    if (!line.startsWith('#EXT') && line.length > 0) {
      const parsed = url.parse(line);
      if (parsed.pathname && parsed.protocol) {
        body += utils.urlPathname(line) + '\n';
        continue;
      }
    }
    body += line + '\n';
  }

  return body;

}

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
      manifest.file = path.join(basedir, utils.urlPathname(uri));
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

      manifest.content = response.body;

      manifest.parsed = hls_utils.parseM3u8Manifest(manifest.content);
      manifest.parsed.segments = manifest.parsed.segments || [];
      manifest.parsed.playlists = manifest.parsed.playlists || [];
      manifest.parsed.mediaGroups = manifest.parsed.mediaGroups || {};


      // After we parsed, let change the content so absolute URLs become relative URls
      manifest.content = makeURLsRelative(manifest.content);

      resources.push(manifest);

      writeData([manifest], options);

      const playlists = manifest.parsed.playlists.concat(hls_utils.mediaGroupPlaylists(manifest.parsed.mediaGroups));


      const subs = playlists.map(function(playlist) {
          let opts = {
            uri: playlist.uri,
            basedir:  path.dirname(manifest.file),
            baseuri:  path.dirname(manifest.full_uri),
            seconds:  options.seconds,
            verbose:  options.verbose,
            concurrency: options.concurrency
          };

          // if uri has protocol and adress, tweak the options so uri is relative and baseuri is correct
          if (utils.isAbsolute(playlist.uri)) {
            opts.uri = utils.urlPathnameWithQuery(playlist.uri);
            const parsed = url.parse(playlist.uri);
            opts.baseuri = parsed.protocol+"//"+parsed.hostname+"/";   // TODO: make util fcn
          }
          return walkSubPlaylist(opts);
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
