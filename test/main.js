var util = require( 'util' );
var url = require( 'url' );

var browser = require('../airplay').createBrowser();

browser.on( 'deviceOn', function( device ) {
    console.log( 'device online: ' + device.id );


    var hls = require( '../airplay' ).createHLS();
    hls.on( 'start', function () {
        console.info( '[HLS] start: %s', hls.getURI() );
    });
    hls.on( 'stop', function () {
        console.info( '[HLS] stop: %s', hls.getURI() );
    });
    hls.on( 'request', function ( req ) {
        // var uri = url.parse( req.url, true );
        console.info( '[HLS] request: %s', req.url );
    });
    hls.on( 'process', function ( d ) {
        console.info( '[HLS] segment process: %s, %s, %s', d.index, d.file, d.out.toString() );
    });
    hls.on( 'segment', function ( d ) {
        console.info( '[HLS] segment created: %s, %s, %s', d.index, d.file, d.out );
    });
    hls.on( 'open', function ( d ) {
        console.info( '[HLS] opend: %s, %s', d.file, util.inspect( d.info ) );
    });
    hls.on( 'error', function ( err ) {
        console.info( '[HLS] segment error: ', util.inspect( err ) );
    });
    hls.start( 7002 );


    hls.open( '/Users/fankun/git/zfkun/iplay/video/1.mkv', function ( info ) {

        device.play( hls.getURI(), '0.000000', function ( res ) {
            console.info( '开始播放啦: ', res );

            setTimeout(function(){
                device.status( function ( info ) {
                    console.info( 'AppleTV 状态:', info ? info : '未播放' );
                    if ( info ) {
                        setTimeout(function () {
                            device.scrub( 500, function ( res ) {
                                console.info( '跳跃播放: ', res );

                                setTimeout(function () {
                                    // Change the playback rate
                                    // NOTE: only 0 and 1 seem to be supported for most media types
                                    var rate = 0; // 0 = pause, 1 = resume
                                    device.rate( rate, function( res ) {
                                        console.info( '暂停播放啦', res );

                                        setTimeout(function () {
                                            device.rate( 1, function ( res ) {
                                                console.info( '恢复播放啦:', res );

                                                setTimeout(function () {
                                                    device.stop( function ( res ) {
                                                        console.info( '停止播放啦:', res );

                                                        setTimeout(function() {
                                                            // device.reverse( function ( res ) {
                                                            device.play( hls.getURI(), 0.5, function () {
                                                                console.info( '重新播放啦:', res );

                                                                setTimeout(function(){
                                                                    device.status( function ( info ) {
                                                                        console.info( 'AppleTV 状态:', info ? info : '未播放' );
                                                                    });
                                                                }, 2000);

                                                            });
                                                        }, 3000);
                                                    });
                                                }, 3000);
                                            });

                                        }, 2000);
                                    });
                                }, 3000);
                            });
                        }, 2000);
                    }
                });
            }, 4000);
        });

    });

    // device.status( function ( info ) {
    //     console.info( 'AppleTV 状态:', info ? info : '未播放' );
    // });
});

browser.on( 'deviceOff', function( device ) {
  console.log( 'device offline: ' + device.id );
});

browser.start();

// setTimeout(
//     function(){
//         console.info( browser.getDevices( true ) );
//     },
//     2000
// );