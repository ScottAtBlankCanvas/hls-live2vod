/* eslint-disable no-console */
const Promise = require('bluebird');
const mkdirp = Promise.promisify(require('mkdirp'));
const request = require('requestretry');
const fs = Promise.promisifyAll(require('fs'));
//const AesDecrypter = require('aes-decrypter').Decrypter;
const path = require('path');

const writeFile = function(file, content) {
  return mkdirp(path.dirname(file)).then(function() {
    return fs.writeFileAsync(file, content);
  }).then(function() {
    console.log('Finished: ' + path.relative('.', file));
  });
};

const requestFile = function(uri) {
  const options = {
    uri,
    // 60 seconds timeout
    timeout: 60000,
    // treat all responses as a buffer
    encoding: null,
    // retry 1s after on failure
    retryDelay: 1000
  };

  return new Promise(function(resolve, reject) {
    request(options, function(err, response, body) {
      if (err) {
        return reject(err);
      }
      return resolve(body);
    });
  });
};

const toUint8Array = function(nodeBuffer) {
  return new Uint8Array(nodeBuffer.buffer, nodeBuffer.byteOffset, nodeBuffer.byteLength / Uint8Array.BYTES_PER_ELEMENT);
};


const WriteData = function(resources, concurrency) {
  const inProgress = [];
  const operations = [];

  resources.forEach(function(r) {
//    console.log(r.duration+":"+r.uri);

    if (r.content) {
      operations.push(function() {
        return writeFile(r.file, r.content);
      });
    } else if (r.fullUri && inProgress.indexOf(r.fullUri) === -1) {
      operations.push(function() {
        return requestFile(r.fullUri).then(function(content) {
          return writeFile(r.file, content);
        });
      });
      inProgress.push(r.fullUri);
    }
  });

  return Promise.map(operations, function(o) {
    return Promise.join(o());
  }, {concurrency}).all(function(o) {
    console.log('DONE!');
    return Promise.resolve();
  });
};

module.exports = WriteData;
