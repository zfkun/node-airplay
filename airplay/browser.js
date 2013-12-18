/**
 * node-airplay
 * 
 * @file bojour server
 * @author zfkun(zfkun@msn.com)
 * @thanks https://github.com/benvanik/node-airplay/blob/master/lib/airplay/browser.js
 */

var util = require( 'util' );
var events = require( 'events' );
var mdns = require( 'mdns2' );

var Device = require( './device' ).Device;



var Browser = function( options ) {
    events.EventEmitter.call( this );
    this.init( options );
};

util.inherits( Browser, events.EventEmitter );

exports.Browser = Browser;




Browser.prototype.init = function ( options ) {
    var self = this;
    var nextDeviceId = 0;

    this.devices = {};

    this.browser = mdns.createBrowser( mdns.tcp( 'airplay' ), options );
    this.browser.on( 'serviceUp', function( info ) {
        var device = self.getDevice( info );
        if ( !device ) {
            device = new Device( nextDeviceId++, info );
            device.on( 'ready', function( d ) {
                self.emit( 'deviceOn', d );
            });
            device.on( 'close', function( d ) {
                delete self.devices[ d.id ];
                self.emit( 'deviceOff', d );
            });

            self.devices[ device.id ] = device;
        }
    });
    this.browser.on( 'serviceDown', function( info ) {
        var device = self.getDevice( info );
        if ( device ) {
            device.close();
        }
    });
};

Browser.prototype.start = function () {
    this.browser.start();
    this.emit( 'start' );
    return this;
};

Browser.prototype.stop = function() {
    this.browser.stop();
    this.emit( 'stop' );
    return this;
};

Browser.prototype.getDevice = function ( info ) {
    for ( var deviceId in this.devices ) {
        var device = this.devices[ deviceId ];
        if ( device.match( info ) ) {
            return device;
        }
    }
};

Browser.prototype.getDeviceById = function ( deviceId, skipCheck ) {
    var device = this.devices[ deviceId ];
    if ( device && ( skipCheck || device.isReady() ) ) {
        return device;
    }
};

Browser.prototype.getDevices = function ( skipCheck ) {
    var devices = [];
    for ( var deviceId in this.devices ) {
        var device = this.devices[ deviceId ];
        if ( skipCheck || device.isReady() ) {
            devices.push( device );
        }
    }
    return devices;
};
