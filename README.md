# hls-live2vod


A simple CLI tool to fetch a specified number of seconds of a live HLS manifest and its segments and save it all locally as a VOD HLS files



## Installation

``` bash
  $ [sudo] npm install hls-fetcher -g
```

### Command Line Usage

**Example**
```
hls-live2vod http://example.com/hls_manifest.m3u8
```

**Options**
```

  Usage: hls-live2vod -o <output> -s <seconds>  <url>

  Options:
  -o, --output   output location                                  [default: "./"]
  -s, --seconds  Seconds of live HLS to download URL              [default: 120]
```
**Typical workflow**

- Use the tool to download the live content as a VOD
- Copy this content to a webserver
- From an HLS player (or Safari browser), point to the top level m3u8 to playback

**Known Issues**

- This tool can also be used to downlaod VOD HLS conbtent.  However, currently the trimming to the number of seconds does not work.  It downloads the entire VOD.
- There are currenlt some issues with LLHLS streams
