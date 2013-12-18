node-airplay
=================

node-airplay is a client library for Apple's AirPlay remote playback protocol.

**some code full reference [node-airplay](https://github.com/benvanik/node-airplay) **, thanks.


### Installation

From source:

	git clone https://github.com/zfkun/node-airplay.git
	npm link node-airplay

`node-airplay` depends on both [node-plist](https://github.com/TooTallNate/node-plist) and [node_mdns](https://github.com/agnat/node_mdns). ***Unfortunately `node_mdns` is woefully out of date and has required many tweaks to get working, resulting in a [fork](https://github.com/Wizcorp/node_mdns).***


### Quickstart

```js
// play remote video
var browser = require( 'airplay' ).createBrowser();
browser.on( 'deviceOn', function( device ) {
    device.play( 'http://remotehost/video.mp4', 0, function() {
        console.info( 'video playing...' );
    });
});
browser.start();
```

```JS
// play local video
var hls = require( 'airplay' ).createHLS();
hls.start( 7001 );
hls.open( '/Users/zfkun/videos/1.mkv', function( info ) {
    console.info( 'video opened: ', info );
});

var browser = require( 'airplay' ).createBrowser();
browser.on( 'deviceOn', function( device ) {
    device.play( hls.getURI(), 0, function() {
        console.info( 'video playing...' );
    });
});
browser.start();
```


### Help

+ [Unofficial AirPlay Protocol Specification](http://nto.github.io/AirPlay.html)
+ [HLS(HTTP Live Streaming)](http://tools.ietf.org/html/draft-pantos-http-live-streaming-12)
+ [ffmpeg build for ios](http://www.cocoachina.com/bbs/read.php?tid=142628&page=1)
+ [mdns User Guide](http://agnat.github.io/node_mdns/user_guide.html)


### API

    todo


### Todo

+ 多码率切换
+ 外挂字幕



