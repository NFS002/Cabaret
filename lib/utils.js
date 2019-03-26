const _ = require("underscore");
const net = require("net");
const crypto = require("crypto");
const grpc = require("grpc");

/* Global constants */

/* The maximum range value of each node */
const MAX_RANGE = 10000

/**
 *
 */
function isPort(port) {
  return _.isNumber(port) && port >= 1 && port <= 65536;
}

/**
 *
 */
function isIPv4(host) {
  return net.isIPv4(host);
}

/* Test if a range value is formatted correctly */
function isRange( range ) {

  if (!_.isString(range)) {
    return false;
  }
  const [lower, upper] = range.trim().split(":")

  if ( ! lower.match(/^\d+(\.\d+)?$/) || !upper.match(/^\d+(\.\d+)?$/)) {
    return false;
  }

  var lower_int = parseInt( lower );
  var upper_int = parseInt( upper );


  return 0 <= lower_int < MAX_RANGE && 0 <= upper_int < MAX_RANGE

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

module.exports = {
  isPort,
  isIPv4,
  isAddress,
  isBetween,
  isStrictlyBetween,
  toSHA1,
  doRPC,
  isRange
};
