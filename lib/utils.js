/* Dependencies */

const _ = require("underscore");
const net = require("net");
const crypto = require("crypto");
const grpc = require("grpc");

/* Global constants */


/* These are the minimum
 * and maximum values of a DRIVER_ID,
 * since each driver has a unique ID.
 * */
const MIN_DRIVER_ID = 0;
const MAX_DRIVER_ID = 10000;

/* The default update interval
 * for each location. (milliseconds) */
const DEFAULT_UPDATE_INTERVAL
 = 10000;

/* The default value for whethere a location
 * should continiously update */
const DEFAULT_SHOULD_UPDATE = false;

/* The maximum change in value (+ or -)
 * of latitude and longitude coordinates
 * when a location updates */
const MAX_MOVE_LAT = 2;
const MAX_MOVE_LONG = 2;

/**
 * Maximum and minimum possible lattitude and longitude
 * coordinate for an initial location.
 */
const MAX_INIT_LAT = 180;
const MAX_INIT_LONG = 180;

const MIN_INIT_LAT = -180;
const MIN_INIT_LONG = -180;


/* The 'central' lattitude and longitude values
 * where randomly generated locations will be 
 * centered around 
 * */
const AVG_INIT_LAT = 100;
const AVG_INIT_LONG = 100;

/* The maximum longitude and lattitude initial deviation 
* from AVG_LAT and AVG_LONG for randomly generated
* locations. 
*/
const MAX_DEV_LAT = 30;
const MAX_DEV_LONG = 30;


/* Functions */


/**
 *
 */
function isPort(port) {
  if ( _.isString(port) && !port.match(/^\d{6}$/)) {
    return false;
  }

  let p = parseInt( port );

  return _.isNumber(p) && (p >= 1) && (p <= 65536);
}

/**
 * Simulates location updates
 * (or initial locations) for the given 
 * range of driver_ids by writing directly to the
 * interactive readline interface.
 * @param {String} range 
 * @param {Interface} rl 
 */
function injectLocationUpdates( range, rl ) {
    rl.write( `range ${range}\r\n` );
}

/**
 *
 */
function isIPv4(host) {
  return net.isIPv4(host);
}
/**
 * Check if a number is a valid 
 * time interval (in milliseconds)
 * @param {int} time 
 */
function isInterval( time ) {
  let t = parseInt(time);

  return (t == time) 
    && ( Number.isInteger( t ) ) 
    && (t > 0 && Number.isFinite( t ) )
}

/**
 * Test if a given value is a valid driver id.
 * @param {Any} id
 */
function isId( id ) {


  if ( _.isNumber(id) ) {
    return (MIN_DRIVER_ID <= id) && (id <= MAX_DRIVER_ID);
  }

  else {
    return false;
  }

}

/**
 * Test if a given range of driver id's
 * is formatted correctly, in the format
 * <driver_id>:<driver_id>
 * @param {String} range 
 */
function isRange( range ) {

  if (!_.isString(range)) {
    return false;
  }

  const [lower, upper] = range.trim().split(":");

  var lower_int = parseInt( lower );
  var upper_int = parseInt( upper );

  if ( !isId( lower_int ) || !isId( upper_int ) ) {
    return false;
  }


  return (lower_int < upper_int);

}

/**
 *
 */
function isAddress(address) {
  if (!_.isString(address)) {
    return false;
  }

  const [host, port] = address.trim().split(":");

  return isPort(parseInt(port, 10)) && isIPv4(host);
}

/**
 * Tests if the given value is a valid
 * longitude coordinate.
 * @param {String | int } long
 */
function isCoordLong( long ) {

  long = long.toString();

  if ( long.match(/^\d{6}$/) ) {

    long = parseInt( ling );
    return (MIN_INIT_LONG <= long) && (long <= MAX_INIT_LONG);
  }
  else return false;
}

/**
 * Tests if the given value is a valid
 * longitude coordinate.
 * @param {String | int } long
 */
function isCoordLat( lat ) {


  lat = lat.toString();

  if ( lat.match(/^\d{6}$/) ) {
    lat = parseInt( lat );
    return (MIN_INIT_LAT <= lat) && (lat <= MAX_INIT_LAT);
  }
  
  else return false;
}


/**
 * Function: generateRandomLocation
 * Generate a random locations.
 * 
 * @param {String} range 
 */
function generateRandomLocation( opts = {} ) {

  let long = adjustCoordinatesInRange( getRandomLong(), MIN_INIT_LONG, MAX_INIT_LONG );
  let lat = adjustCoordinatesInRange( getRandomLat(), MIN_INIT_LAT, MAX_INIT_LAT );

  return new Location( lat, long, opts );

}


/**
 * Function: generateRandomLocations
 * Generate a random set of locations for given
 * range of driver_ids.
 * @param {String} range 
 */
function generateRandomLocations( range, opts = {} ) {

  let upper_id, lower_id;
  let locations = [];

  if ( isRange (range) ) {
    const [lower, upper] = range.trim().split(":");
    lower_id = parseInt( lower );
    upper_id = parseInt( upper );
  }

  else if ( isId (range) ) {
    lower_id = range
    upper_id = range + 1;
  }

  else {
    throw Error( `The given range: ${range} is not formatted correctly.` );
  }



  for ( ; lower_id < upper_id; lower_id++ ) {

    locations.push( { id: lower_id.toString(), location: generateRandomLocation( opts ) } );

  }

  return locations

}

/**
 * Adjust a given coordinate
 * to be within the range specified
 * by the maximum and minmum values.
 * @param {int} current 
 * @param {int} min 
 * @param {int} max 
 */

function adjustCoordinatesInRange( current, min, max ) {

  if ( current < min ) {
    current = min;
  }

  else if ( current > max ) {
    current = max;
  }

  return current;
}

/**
 * Function: getRandomLat
 * Generate a random lattitude
 * coordinate +- DEV_LAT degrees away
 * from AVG_LAT.
 */
function getRandomLat() {

  let movement = Math.floor( Math.random() * MAX_DEV_LAT );
  let initial = Math.round( AVG_INIT_LAT )
  return initial + movement;

}


/**
 * Function: getRandomLong
 * Generate a random longittude
 * coordinate +- DEV_LAT degrees away
 * from AVG_LAT.
 */
function getRandomLong() {
  
  let movement = Math.floor( Math.random() * MAX_DEV_LONG );
  let initial = Math.round( AVG_INIT_LONG );
  return initial + movement;

}

/**
 *
 */
function isBetween(lower, element, upper) {
  // lower is less than upper
  if (lower.compare(upper) < 0) {
    // lower less than element AND element less than upper
    return lower.compare(element) < 0 && element.compare(upper) < 0;
  }

  // lower is greater than or equal to upper
  // lower less than element OR element less than upper
  return lower.compare(element) < 0 || element.compare(upper) < 0;
}

/**
 *
 */
function isStrictlyBetween(lower, element, upper) {
  // lower is less than upper
  if (lower.compare(upper) < 0) {
    // lower less than element AND element less than upper
    return lower.compare(element) < 0 && element.compare(upper) < 0;
  }

  // lower is greater than upper
  if (lower.compare(upper) > 0) {
    // lower less than element OR element less than upper
    return lower.compare(element) < 0 || element.compare(upper) < 0;
  }

  // lower is equal to upper
  return false;
}

/**
 *
 */
function toSHA1(value) {
  return crypto
    .createHash("sha1")
    .update(value)
    .digest();
}

/**
 *
 */
const doRPC = GRPC =>
  function curriedDoRPC(host, method, request = {}) {
    if (!isAddress(host)) {
      throw new Error('"host" argument must be compact IP-address:port');
    }

    const client = new GRPC(host, grpc.credentials.createInsecure());

    return new Promise((resolve, reject) => {
      client[method](request, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
        client.close();
      });
    });
  };

  /**
   * Called continously to update a locations lattitude coordinate.
   * @param {int} init_lat: initial lattitude coordinate.
   * @return {int} the updated coordinate
   */
  const UPDATE_LAT_FUNC = function( init_lat ) {
    let sign = Math.round( Math.random() ) * 2 - 1;
    let movement = Math.round( Math.random() * MAX_MOVE_LAT );
    return adjustCoordinatesInRange( init_lat + (movement * sign), MIN_INIT_LAT, MAX_INIT_LAT );
  }
  
  /**
   * Called continously to update a locations longitude coordinate.
   * @param {int} init_lat: initial longitude coordinate.
   * @return {int} the updated coordinate
   */
  const UPDATE_LONG_FUNC = function( init_long ) {
    let sign = Math.round( Math.random() ) * 2 - 1;
    let movement = Math.round( Math.random() * MAX_MOVE_LONG );
    return adjustCoordinatesInRange( init_long + (movement * sign), MIN_INIT_LONG, MAX_INIT_LONG );
  }



  /* Classes */

  /* A class representing a geo location */
  class Location {

    constructor( lat, long, opts = {}, state = {} ) {

      this.opts = _.defaults(opts, {
        shouldUpdate: DEFAULT_SHOULD_UPDATE,
        updateInterval: DEFAULT_UPDATE_INTERVAL,
        updateLat: UPDATE_LAT_FUNC,
        updateLong: UPDATE_LONG_FUNC
      })
      
      this.long = long;
      this.lat = lat;
      this.state = state;

      if ( this.opts.shouldUpdate ) {

        setInterval( () => {
          this.lat = this.opts.updateLat( this.lat );
          this.long = this.opts.updateLong( this.long );
        },
        this.opts.updateInterval )
      }

    }

    /*  
     * A json representation of the class, which 
     * allows [de]serialisation to and from JSON to an ES6 class.
     * The JSON representation is only used when a message is 'in transit'
     * Values can only update when in its ES6 form.
     * */
    toJSON() {

      return {
        lat: this.lat,
        long: this.long,
        state: this.state,

        opts: {
          shouldUpdate: this.opts.shouldUpdate,
          updateInterval: this.opts.updateInterval,
          updateLat: this.opts.updateLat,
          updateLong: this.opts.updateLong,
        }
      }
    }
  }

module.exports = {
  
  isPort,
  isIPv4,
  isId,
  isAddress,
  isBetween,
  isRange,
  isStrictlyBetween,
  toSHA1,
  doRPC,
  generateRandomLocation,
  generateRandomLocations,
  injectLocationUpdates,
  isInterval,
  Location
};
