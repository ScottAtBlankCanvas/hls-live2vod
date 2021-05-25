/* eslint-disable no-console */

// Takes a model created by m3u8-parser and returns an HLS playlist
// Also copies the structure and removes the members as they are processed/ignored.
// This allows printing out unhandled members
const hlsGenerator = function(input) {
  // We will make a copy so we can see what members have not been handled
  let manifest = JSON.parse(JSON.stringify(input));

  let s = '#EXTM3U\n';

  //
  // Headers
  //

  if (manifest.targetDuration)
    s += '#EXT-X-TARGETDURATION:' + manifest.targetDuration + '\n';
  if (manifest.version)
    s += '#EXT-X-VERSION:' + manifest.version + '\n';
  if (manifest.mediaSequence)
    s += '#EXT-X-MEDIA-SEQUENCE:' + manifest.mediaSequence + '\n';
  if (manifest.dateTimeString)
    s += '#EXT-X-PROGRAM-DATE-TIME:' + manifest.dateTimeString + '\n';
  delete manifest.targetDuration;
  delete manifest.version;
  delete manifest.mediaSequence;
  delete manifest.dateTimeString;
  delete manifest.dateTimeObject;


  //
  // Body
  //

  // map items are in segments in the model for some reason
  // They are the ones that do not have a .map attribute
  manifest.segments.forEach(function(seg) {
    if (seg.map || !seg.uri) {
      return;
    }
    s += '#EXT-X-MAP:URI="' + seg.uri + '"\n';
  });

  // All the segments (making sure to skip the MAP members handled above)
  manifest.segments.forEach(function(seg) {
    if (!seg.map || !seg.uri) {
      return;
    }
    s += '#EXTINF:' + seg.duration + '\n';
    s += seg.uri + '\n';
  });
  delete manifest.segments;


  //
  // Footers
  //

  if (manifest.endList)
    s += '#EXT-X-ENDLIST' + '\n';
  delete manifest.endList;


  //
  // Report unhanlded
  //

  // Not expected to handle.  Remove them so the warning is not triggered
  delete manifest.allowCache;
  delete manifest.discontinuityStarts;
  delete manifest.discontinuitySequence;
  delete manifest.playlistType;

  if (Object.keys(manifest).length > 0) {
    console.log('Unhandled in hls-generator:');
    console.log(manifest);
  }

  return s;
};


module.exports = hlsGenerator;
