var browser = require('../airplay').createBrowser();

browser.on( 'deviceOn', function( device ) {
    console.log( 'device online: ' + device.id );

    var hls = require( '../airplay' ).createHLS();

    hls.start( 7001 );

    hls.open( '/Users/fankun/git/zfkun/iplay/video/1.mkv', function ( info ) {
        console.info( 'opened file:', info );

        device.play( hls.getURI(), 0, function ( res ) {
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
                                                            device.play( 'http://192.168.1.7:7001/', 0.5, function () {
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
            }, 2000);
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