# hls-live2vod

A CLI tool to fetch a specified number of seconds of a live HLS manifest and its segments and save it all locally as a VOD HLS files.

## Caveats

This has been tested with a limited set of HLS live URLs that I needed to use

Has been tested with at least one HLS stream from:
- Wowza
- Mux
- Bitmovin
- Akamai

There are also no unit tests.  I have great intentions of providing these but, you know, time.


## Installation

- Download the code

``` bash
  $ cd hls-live2vod
  $ [sudo] npm install hls-live2vod -g
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

### Typical Usage

- Use the tool to download the live content as a VOD
- Copy this content to a web server
- From an HLS player (or Safari browser), point to the top level .m3u8 to play back

### Known Issues

- This tool can also be used to download VOD HLS content.  However, currently it downloads the entire VOD, regardless of the requested number of seconds
- There are currently some issues with LLHLS streams
