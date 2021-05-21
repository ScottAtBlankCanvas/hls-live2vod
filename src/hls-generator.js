/* eslint-disable no-console */

// Takes a model created by m3u8-parser and returns an HLS playlist
const hlsGenerator = function(input) {
  // We will make a copy so we can see what members have not been handled

  let manifest = JSON.parse(JSON.stringify(input));

  //console.log(manifest);
  let s = '#EXTM3U\n';

  // Headers
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

  // Body
  // map items are in segments.  They are the ones that do not have a .map attribute
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

  // Footers
  if (manifest.endList)
    s += '#EXT-X-ENDLIST' + '\n';
  delete manifest.endList;


  // Not expected to handle.  Remove them


//    #EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,CAN-SKIP-UNTIL=24,PART-HOLD-BACK=3.012
//    #EXT-X-PART-INF:PART-TARGET=1.004000



  // console.log('hlsGen');
  // console.log(manifest);
  console.log('Unhandled in hls-generator:');
  console.log(manifest);

  return s;
};



module.exports = hlsGenerator;
