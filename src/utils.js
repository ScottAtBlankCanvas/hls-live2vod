/* eslint-disable no-console */
const m3u8 = require('m3u8-parser');
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

const onError = function(err, errUri, resources, res, rej) {
  // Avoid adding the top level uri to nested errors
  if (err.message.includes('|')) {
    rej(err);
  } else {
    rej(new Error(err.message + '|' + errUri));
  }
};


module.exports = {
  fsSanitize,
  urlBasename,
  joinURI,
  isAbsolute,
  onError
};
