/* eslint-disable no-console */
const m3u8 = require('m3u8-parser');
//const request = require('requestretry');
const url = require('url');
const path = require('path');
const querystring = require('querystring');
const filenamify = require('filenamify');

// replace invalid http/fs characters with valid representations
const fsSanitize = function(filepath) {
  return path.normalize(filepath)
    // split on \, \\, or /
    .split(/\\\\|\\|\//)
    // max filepath is 255 on OSX/linux, and 260 on windows, 255 is fine for both
    // replace invalid characters with nothing
    .map((p) => filenamify(querystring.unescape(p), {replacement: '', maxLength: 255}))
    // join on OS specific path seperator
    .join(path.sep);
};

const urlBasename = function(uri) {
  const parsed = url.parse(uri);
  const pathname = parsed.pathname || parsed.path.replace(parsed.query || '', '');
  const query = (parsed.query || '').split(/\\\\|\\|\//).join('');
  const basename = path.basename(pathname) + query;

  return fsSanitize(basename);
};

const joinURI = function(absolute, relative) {
  const abs = url.parse(absolute);
  const rel = url.parse(relative);

  abs.pathname = path.resolve(abs.pathname, rel.pathname);

  abs.query = rel.query;
  abs.hash = rel.hash;

  return url.format(abs);
};

const isAbsolute = function(uri) {
  const parsed = url.parse(uri);

  if (parsed.protocol) {
    return true;
  }
  return false;
};

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
  fsSanitize,
  urlBasename,
  joinURI,
  isAbsolute,
  mediaGroupPlaylists,
  parseM3u8Manifest
};
