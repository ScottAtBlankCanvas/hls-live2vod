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
