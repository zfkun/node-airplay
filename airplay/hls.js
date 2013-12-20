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

var IP_LOCAL = require( './ip' );




function HLSServer( options ) {
    events.EventEmitter.call( this );
    var ops = this.options = options || {};

    // 是否启用流模式(影响m3u8生成机制)
    // ops.streaming = !!ops.streaming;
    // TS文件缓存
    ops.cache = !!ops.cache;
    // TS分片时长(s)
    ops.duration = ops.duration || 20;
    // 编解码库目录
    ops.lib = path.normalize( ops.lib || ( __dirname + '/../dep' ) ) + '/';
    // TS分片输出目录
    ops.out = path.normalize( ops.out || ( __dirname + '/../out' ) ) + '/';
    if ( !fs.existsSync( ops.out ) ) {
        fs.mkdirSync( ops.out );
    }
}

util.inherits( HLSServer, events.EventEmitter );
exports.HLS = HLSServer;




HLSServer.prototype.start = function ( port ) {
    if ( !this.started ) {
        this.started = !0;

        this.baseURI = 'http://' + IP_LOCAL + ( port === 80 ? '' : ':' + port );

        this.server = http.createServer( this.httpHandler.bind( this ) );
        this.server.listen( port, IP_LOCAL );

        this.emit( 'start', { host: IP_LOCAL, port: port } );
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

HLSServer.prototype.getURI = function ( type, index ) {
    if ( type === 'playlist' ) {
        return '/stream/0.m3u8';
    }
    else if ( type === 'segment' ) {
        return '/stream/0/' + index + '.ts';
    }
    else {
        return this.baseURI;
    }
};

HLSServer.prototype.open = function ( fileFullPath, callback ) {
    var self = this;

    if ( this.openThread ) {
        this.openThread.kill();
    }

    this.file = fileFullPath;

    this.openThread = spawn(
        this.options.lib + 'ffprobe',
        this.command4FFProbe( this.file )
    );

    var output = '';
    this.openThread.stdout.on( 'data', function ( chunk ) {
        output += chunk;
    });
    this.openThread.stderr.on( 'data', function ( err ) {
        self.emit(
            'error',
            { type: 'open', err: err, file: fileFullPath }
        );
    });
    this.openThread.stdout.on( 'end', function () {
        var json;
        try {
            json = JSON.parse( output );
        } catch (e) {}

        if ( !json ) {
            self.emit(
                'error',
                { type: 'open', err: e.message, file: fileFullPath }
            );
        }
        else {
            self.videoInfo = json;
            self.emit( 'open', { file: fileFullPath, info: json } );
        }

        callback && callback( json );

        self.openThread = null;
    });

    return this;
};


HLSServer.prototype.segment = function ( index, req, res ) {
    var self = this;
    var outfile = this.options.out + index + '.ts';

    // skip if exists
    if ( fs.existsSync( outfile ) ) {
        fs.createReadStream( outfile ).pipe( res );
        return;
    }

    var f = spawn(
        this.options.lib + 'ffmpeg',
        this.command4FFMpeg( index, outfile )
    );

    var output = '';
    f.stdout.on( 'data', function ( chunk ) {
        output += chunk;
        self.emit( 'process', { index: index, file: outfile, out: chunk } );
    });
    f.stdout.on( 'error', function ( err ) {
        self.emit(
            'error',
            { type: 'segment', err: err, index: index, file: outfile }
        );
    });

    f.stdout.on( 'end', function () {
        self.emit( 'segment', { index: index, file: outfile, out: output } );
        fs.createReadStream( outfile ).pipe( res );
    });

};

HLSServer.prototype.command4FFProbe = function ( filePath ) {
    var opt = [
        '-v',
        'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
    ];

    return opt;
};

HLSServer.prototype.command4FFMpeg = function ( tsIndex, tsOutput ) {
    var opt = [
        '-y',
        '-i',
        this.file,
        '-t', this.options.duration,
        '-ss', this.options.duration * (tsIndex - 1),
    ];

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
    var ops = this.options;
    var header = {};
    var body = [];
    var uri = url.parse( request.url, true );

    this.emit( 'request', request );

    if ( uri.pathname === '/' ) {

        body.push( '#EXTM3U' );
        body.push( '#EXT-X-MEDIA:TYPE=VIDEO,GROUP-ID="low",LANGUAGE="en",NAME="main",DEFAULT=YES,AUTOSELECT=YES' );
        // body.push( '#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=300000,CODECS="mp4a.40.2,avc1.640028",AUDIO="audio"' );
        body.push( '#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=300000,AUDIO="audio"' );
        body.push( this.getURI( 'playlist' ) );
        body.push( '#EXT-X-ENDLIST' );
        body = body.join( '\n' );

        // header['Content-Type'] = 'application/vnd.apple.mpegurl';
        header[ 'Content-Length' ] = body.length;

        response.writeHead( 200, header );
        response.write( body );

        response.end();
    }
    else if ( uri.pathname === this.getURI( 'playlist' ) ) {
        var videoDuration = this.videoInfo.format.duration;
        var tsDuration = ops.duration;

        body.push( '#EXTM3U' );
        body.push( '#EXT-X-VERSION:3' );
        // body.push( '#EXT-X-PLAYLIST-TYPE:EVENT' );
        body.push( '#EXT-X-TARGETDURATION:' + (tsDuration + 0.5) );
        body.push( '#EXT-X-MEDIA-SEQUENCE:0' );
        body.push( '#EXT-X-TARGETDURATION:' + tsDuration );
        body.push( '#EXT-X-PLAYLIST-TYPE:VOD' );
        body.push( '#EXT-X-ALLOW-CACHE:' + ( ops.cache ? 'YES' : 'NO') );
        
        var tsSize = Math.ceil( parseFloat( videoDuration, 10) / tsDuration );
        // var lastDuration = tsSize % 10;
        for ( var i = 1; i < tsSize; i++) {
            // TODO 最后一个分片的时长不能保证正确
            body.push( '#EXTINF:' + (tsDuration + 0.5) + ',' );
            body.push( this.getURI( 'segment', i ) );
        }

        body.push( '#EXT-X-ENDLIST' );
        body = body.join( '\n' );

        // header['Connection'] = 'Keep-Alive';
        // header['Content-Type'] = 'application/vnd.apple.mpegurl';
        header['Content-Length'] = body.length;

        response.writeHead( 200, header );
        response.write( body );
        response.end();
    }
    else if ( /^\/stream\/0\//.test( uri.pathname ) ) {
        header['Content-Type'] = 'video/MP2T';
        response.writeHead( 200, header );

        var tsIndex = path.basename( uri.pathname, '.ts' ) | 0;
        this.segment( tsIndex, request, response );

        // fs.createReadStream( filePath ).pipe( response );
        // response.write( fs.readFileSync( filePath ) );
        // response.end();
    } else {
        response.writeHead( 404 );
        response.end();
    }

};

