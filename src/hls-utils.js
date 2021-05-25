/* eslint-disable no-console */
const m3u8 = require('m3u8-parser');
//const request = require('requestretry');
const url = require('url');
const path = require('path');
const querystring = require('querystring');
const filenamify = require('filenamify');

const mediaGroupPlaylists = function(mediaGroups) {
  const playlists = [];

  ['AUDIO', 'VIDEO', 'CLOSED-CAPTIONS', 'SUBTITLES'].forEach(function(type) {
    const mediaGroupType = mediaGroups[type];

    if (mediaGroupType && !Object.keys(mediaGroupType).length) {
      return;
    }

    for (const group in mediaGroupType) {
      for (const item in mediaGroupType[group]) {
        const props = mediaGroupType[group][item];

        playlists.push(props);
      }
    }
  });
  return playlists;
};

const parseM3u8Manifest = function(content) {
  const parser = new m3u8.Parser();

  parser.push(content);
  parser.end();
  return parser.manifest;
};


module.exports = {
  mediaGroupPlaylists,
  parseM3u8Manifest
};
