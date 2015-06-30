node-airplay
=================

[![NPM](https://nodei.co/npm/airplay2.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/airplay2/)

[![npm version](https://badge.fury.io/js/airplay2.svg)](http://badge.fury.io/js/airplay2)
[![Dependency Status](https://david-dm.org/zfkun/node-airplay.svg)](https://david-dm.org/zfkun/node-airplay)


node-airplay is a client library for Apple's AirPlay remote playback protocol.

***some code full reference [node-airplay](https://github.com/benvanik/node-airplay), thanks!***


## Installation

From npm:

	npm install airplay2

From bower:

    bower install airplay

From source:

	git clone https://github.com/zfkun/node-airplay.git
	npm link

## Dependencies

+ [node-plist](https://github.com/TooTallNate/node-plist)

	- had merge my fix, see my [pull-request](https://github.com/TooTallNate/node-plist/pull/42)


~~+ [node-plist](https://github.com/zfkun/node-plist)~~

~~- It's my fork, add `node-webkit` support~~

~~- If you are not in `node-webkit`, you can modify `package.json` like:~~
 		
~~"dependencies": {
      "plist": "~0.4.3",
      ...
}~~

 
+ [node_mdns](https://github.com/zfkun/node_mdns)

	- It's my fork, hack an error `no such record`
	- Unfortunately the original [`node_mdns`](https://github.com/agnat/node_mdns) is woefully out of date and has required many tweaks to get working
	
+ [ffmpeg](http://trac.ffmpeg.org/wiki/MacOSXCompilationGuide#Shortcut:CompileFFmpegthroughHomebrew)

	brew install ffmpeg

	


## Usage

``` javascript
// remote video
var browser = require('airplay2').createBrowser();
browser.on('deviceOn', function(device) {
    device.play('http://remotehost/video.mp4', 0, function() {
        console.info('video playing...');
    });
});
browser.start();
```

``` javascript
// local video (by HLS)
var hls = require('airplay2').createHLS();
hls.start(7001);
hls.open('/Users/zfkun/videos/1.mkv', function(info) {
    console.info('video opened: ', info);
});

var browser = require('airplay2').createBrowser();
browser.on('deviceOn', function(device) {
    device.play(hls.getURI(), 0, function() {
        console.info('video playing...');
    });
});
browser.start();
```


## Help

+ [Unofficial AirPlay Protocol Specification](http://nto.github.io/AirPlay.html)
+ [HLS(HTTP Live Streaming)](http://tools.ietf.org/html/draft-pantos-http-live-streaming-12)
+ [ffmpeg build for ios](http://www.cocoachina.com/bbs/read.php?tid=142628&page=1)
+ [ffmpeg build for MacOS](http://trac.ffmpeg.org/wiki/MacOSXCompilationGuide#Shortcut:CompileFFmpegthroughHomebrew)
+ [mdns User Guide](http://agnat.github.io/node_mdns/user_guide.html)



## API

+ [Browser](https://github.com/zfkun/node-airplay/wiki/Browser-API)
+ [Device](https://github.com/zfkun/node-airplay/wiki/Device-API)
+ [Client](https://github.com/zfkun/node-airplay/wiki/Client-API)
+ [HLS](https://github.com/zfkun/node-airplay/wiki/HLS-API)



## Todo

+ 多码率切换
+ 外挂字幕



