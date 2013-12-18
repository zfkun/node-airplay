/**
 * node-airplay
 * 
 * @file HTTP Live Streaming
 * @author zfkun(zfkun@msn.com)
 */

var fs = require( 'fs' );
var url = require( 'url' );
var path = require( 'path' );
var http = require( 'http' );
var util = require( 'util' );
var events = require( 'events' );
var spawn = require( 'child_process' ).spawn;

var localIP = require( './ip' );




function HLSServer( options ) {
    events.EventEmitter.call( this );
    options = options || {};

    // TS分片时长(s)
    this.tsDuration = options.tsDuration || 20;
    // 编解码库目录
    this.libDir = path.resolve( options.libDir || ( __dirname + '/../dep' ) );
    // TS分片输出目录
    this.outDir = path.resolve( options.outDir || ( __dirname + '/../video' ) );
    if ( !fs.existsSync( this.outDir ) ) {
        fs.mkdirSync( this.outDir );
    }
}

util.inherits( HLSServer, events.EventEmitter );
exports.HLS = HLSServer;




HLSServer.prototype.start = function ( port ) {
    if ( !this.started ) {
        this.started = !0;

        this.baseURI = 'http://' + localIP + ( port === 80 ? '' : ':' + port );

        this.server = http.createServer( this.httpHandler.bind( this ) );
        this.server.listen( port, localIP );

        this.emit( 'start' );
    }

    return this;
};

HLSServer.prototype.stop = function() {
    if ( this.started && this.server ) {
        this.server.close();
        this.emit( 'stop' );
    }

    this.started = !1;

    return this;
};

HLSServer.prototype.getURI = function ( serviceType ) {
    if ( serviceType === 'list' ) {
        return this.baseURI + '/stream/';
    }
    else if ( serviceType === 'item' ) {
        return this.baseURI + '/stream/%s/';
    }
    else {
        return this.baseURI;
    }
};

HLSServer.prototype.open = function ( fileFullPath, callback ) {
    var me = this;

    if ( this.openChild ) {
        this.openChild.kill();
    }

    this.file = fileFullPath;

    this.openChild = spawn(
        this.libDir + '/ffprobe',
        [
            '-v',
            'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            this.file
        ]
    );

    var output = '';
    this.openChild.stdout.on( 'data', function ( chunk ) {
        output += chunk;
    });
    // this.openChild.stderr.on( 'data', function ( error ) {
    //     console.log( 'error:', error );
    // });
    this.openChild.stdout.on( 'end', function () {
        var json;
        try {
            json = JSON.parse( output );
        } catch (e) {}
        
        // console.info( '[ffprobe]: ', json );

        if ( json ) {
            me.videoInfo = json;
            me.emit( 'open', json );
            callback && callback( json );
        }
        else {
            me.emit( 'error: %s', fileFullPath );
        }
    });

    return this;
};


HLSServer.prototype.getTS = function ( index, req, res ) {

    var outfile = this.outDir + '/' + index + '.ts';

    // 跳过已转换的
    if ( fs.existsSync( outfile ) ) {
        fs.createReadStream( outfile ).pipe( res );
        return;
    }

    var f = spawn(
        this.libDir + '/ffmpeg',
        this.command4FFMpeg( index, outfile )
    );

    var output = '';
    f.stdout.on( 'data', function ( chunk ) {
        output += chunk;
        console.log( '[ffmpeg]#%s:', index );
        // console.log( chunk.toString() );
    });
    f.stdout.on( 'error', function ( error ) {
        console.log( '[ffmpeg]#%s error:', index, error );
    });

    f.stdout.on( 'end', function () {
        console.info( '[ffmpeg]#%s: ', index, output );
        fs.createReadStream( outfile ).pipe( res );
    });

};

HLSServer.prototype.command4FFMpeg = function ( tsIndex, tsOutput ) {
    var opt = [
        '-y',
        '-i',
        this.file,
        '-t', this.tsDuration,
        '-ss', this.tsDuration * (tsIndex - 1),
    ];

    // TODO
    var isH264 = this.videoInfo.streams.some(function ( s ) {
        return s.codec_name === 'h264';
    });

    // h264 && aac
    if ( isH264 ) {
        opt = opt.concat([
            '-c:v', 'copy',
            '-c:a', 'copy',
            // '-g', 100,
            // '-vcodec', 'copy',
            // '-acodec', 'copy',
            '-vbsf', 'h264_mp4toannexb'
        ]);
    }
    else {
        opt = opt.concat([
            '-c:v', 'linx264',
            '-c:a', 'aac',
            // '-g', 100,
            // '-vcodec', 'copy',
            // '-acodec', 'copy',
            '-b', '500k',
            '-ac', '2',
            '-ar', '44100',
            '-ab', '32k'
        ]);
    }

    opt.push( tsOutput );

    return opt;
};

HLSServer.prototype.httpHandler = function ( request, response ) {
    var uri = url.parse( request.url, true );
    var header = {
        // 'X-Apple-Device-ID': '0xdc2b61a0ce79',
        // 'X-Apple-Session-ID': '1bd6ceeb-fffd-456c-a09c-996053a7a08c'
    };
    var body = [];
    var videoDuration = this.videoInfo.format.duration;
    var tsDuration = this.tsDuration;

    console.info( '[HLS]: ', uri.pathname );//, request.headers );

    if ( uri.pathname === '/' ) {

        body.push('#EXTM3U');
        body.push('#EXT-X-MEDIA:TYPE=VIDEO,GROUP-ID="low",LANGUAGE="en",NAME="main",DEFAULT=YES,AUTOSELECT=YES');
        // body.push('#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=300000,CODECS="mp4a.40.2,avc1.640028",AUDIO="audio"');
        body.push('#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=300000,AUDIO="audio"');
        body.push('/stream/1.m3u8');
        body.push('#EXT-X-ENDLIST');
        body = body.join('\n');

        // header['Content-Type'] = 'application/vnd.apple.mpegurl';
        header['Content-Length'] = body.length;

        response.writeHead( 200, header );
        response.write( body );

        response.end();
    }
    else if ( uri.pathname === '/stream/1.m3u8') {
        body.push('#EXTM3U');
        body.push('#EXT-X-VERSION:3');
        // body.push('#EXT-X-MEDIA-SEQUENCE:0');
        body.push('#EXT-X-TARGETDURATION:' + tsDuration);
        body.push('#EXT-X-PLAYLIST-TYPE:VOD');
        // body.push('#EXT-X-ALLOW-CACHE:YES');
        
        var tsSize = Math.ceil( parseFloat( videoDuration, 10) / tsDuration );
        // var lastDuration = tsSize % 10;
        for ( var i = 1; i < tsSize; i++) {
            // TODO 最后一个分片的时长不能保证正确
            body.push('#EXTINF:' + tsDuration + ',');
            body.push('/stream/1/' + i + '.ts');
        }

        body.push('#EXT-X-ENDLIST');
        body = body.join('\n');

        // header['Connection'] = 'Keep-Alive';
        // header['Content-Type'] = 'application/vnd.apple.mpegurl';
        header['Content-Length'] = body.length;

        response.writeHead( 200, header );
        response.write( body );
        response.end();
    }
    else if ( /^\/stream\/1\//.test( uri.pathname ) ) {
        // header['Connection'] = 'Keep-Alive';
        header['Content-Type'] = 'video/MP2T';
        response.writeHead( 200, header );
        
        var tsIndex = path.basename( uri.pathname, '.ts' ) | 0;
        this.getTS( tsIndex, request, response );

        // fs.createReadStream( filePath ).pipe( response );
        // response.write( fs.readFileSync( filePath ) );
        // response.end();
    } else {
        response.writeHead( 404 );
        response.end();
    }

};

