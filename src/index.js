/* eslint-disable no-console */
const WalkSubPlaylist = require('./walk-sub-playlist');
const WalkMainPlaylist = require('./walk-main-playlist');
const WriteData = require('./write-data');
const utils = require('./utils');
const path = require('path');

const main = function(options) {
  console.log('Gathering Manifest data...');
  const settings = {basedir: options.output, uri: options.input};

  return WalkMainPlaylist(settings)
    .then(function(manifest) {
      console.log('> WalkMainPlaylist.then');
      console.log('manifest:');
      console.log(manifest);
      console.log('settings:');
      console.log(settings);

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


      const playlists = manifest.parsed.playlists.concat(utils.mediaGroupPlaylists(manifest.parsed.mediaGroups));

console.log('playlists');
console.log(playlists);

      const subs = playlists.map(function(pl, z) {
        console.log('pl:');
        console.log(pl);
        if (!pl.uri) {
          return Promise.resolve();
        }
        return WalkSubPlaylist(
          {
            input: pl.uri,
            output: settings.basedir,  // undef
            baseuri: path.dirname(manifest.uri),
            seconds: options.seconds    // OK
          });
      });

      console.log('subs');
      console.log(subs);
      subs.forEach(function(prom) {
        console.log("(1) Playlists forEach prom:");
        console.log(prom);
      });

      Promise.allSettled(subs).then(function() {
        console.log('ALL subs then');

        resolve();
      }).catch(function(err) {
        onError(err, manifest.uri, resources, resolve, reject);
      });

      // return playlists;
      // resolve(playlists);
      // SUB Playlists
      // playlists.forEach(function(pl) {
      //   console.log("Playlists forEach pl:"+pl.uri);
      //
      //   if (!pl.uri) {
      //     console.log("Playlists map resolve bad uri");
      //     return;
      //   }
      //   // basedir: options.output,
      //   // uri: options.input,
      //   // baseuri: options.baseuri,
      //   // seconds: options.seconds
      //
      //   // basedir: options.output,
      //   // uri: options.input,
      //   // baseuri: options.baseuri,
      //   // seconds: options.seconds
      //
      //
      //   return WalkSubPlaylist(
      //     {
      //       input: pl.uri,
      //       output: settings.basedir,  // undef
      //       baseuri: path.dirname(manifest.uri),
      //       seconds: options.seconds    // OK
      //     });
      // });


console.log('-----------');
    // })
    // .then(function(playlists) {
    //   console.log('playlists:');
    //   console.log(playlists);
    //
    //   playlists.forEach(function(pl) {
    //     console.log('pl:');
    //     console.log(pl);
    //     return WalkSubPlaylist(
    //     {
    //       input: pl.uri,
    //       output: 'foo', // settings.basedir,  // undef
    //       baseuri: 'bar', //path.dirname(manifest.uri),
    //       seconds: 'foobar' // options.seconds    // OK
    //     });
    //   });

    });
};

module.exports = main;
module.exports.WalkSubPlaylist = WalkSubPlaylist;
module.exports.WalkMainPlaylist = WalkMainPlaylist;
