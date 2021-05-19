'use strict';

/*!
 * Hazelcast - Express Session Store
 * Copyright(c) 2016 Matt Savino <jackspaniel99@gmail.com>
 * MIT Licensed
 */

// TODO: leaving off touch() for now, since it doesn't look like express-sessions is ever even calling it: https://github.com/expressjs/session/blob/master/session/session.js
// Other possible methods to implement: clear, all, length
// Express session store implementation: https://github.com/expressjs/session#user-content-session-store-implementation

const dbg = require('debug');
const util = require('util');
const noop = function(){};
const oneDay = 86400000;
let debug;

function getTTL(store, sess) {
  var maxAge = sess.cookie.maxAge;
  return store.ttl || (typeof maxAge === 'number'
    ? Math.floor(maxAge)
    : oneDay);
}

/**
 * Return the `HazelcastStore` extending `express`'s session Store.
 *
 * @param {object} express session
 * @return {Function}
 * @api public
 */
module.exports = function (session) {

  var Store = session.Store;

  function HazelcastStore (options) {
    if (!(this instanceof HazelcastStore))
      throw new TypeError('Cannot call HazelcastStore constructor as a function');

    debug = dbg((options.debugPrefix || 'hs') + ':hazelcast-store');

    debug('init!');

    options = options || {};
    Store.call(this, options);
    this.prefix = options.prefix == null
      ? 'sess:'
      : options.prefix;

    delete options.prefix;

    // provide custom logger in options.logErrors if desired
    if (options.logErrors){
      if(typeof options.logErrors !== 'function'){
        options.logErrors = function (err) {
          console.error('Warning: hazelcast-store reported a client error: ' + err);
        };
      }
    }

    this.mapName = options.mapName || 'Sessions';
    this.ttl = options.ttl;
    this.disableTTL = options.disableTTL;
  }

  util.inherits(HazelcastStore, Store);

  /**
   * Sets the client after store creation since the HZ node client creation async
   * but the session store needs to be add in the beginning of the app.use chain
   *
   * @param {object} hazelcastClientInstance
   * @api public
   */
  HazelcastStore.prototype.setClient = function (hazelcastClientInstance) {
    this.client = hazelcastClientInstance;
    this.sessionsMap = this.client.getMap(this.mapName); // successfully creates map if it doesn't already exist
    debug("Hazelcast Client set!");
};

  /**
   * Attempt to fetch session by the given `sid`.
   *
   * @param {String} sid
   * @param {Function} fn
   * @api public
   */
  HazelcastStore.prototype.get = function (sid, fn) {
    if (!this.client)
      throw new Error('No client found! Call HazelcastStore.setClient(hzInstance)');

    var psid = this.prefix + sid;
    if (!fn) fn = noop;
    debug('GET "%s"', sid);

    this.sessionsMap.then(map => {
      map.get(psid).then(value => {
        debug("Item read. Value for key= " + JSON.stringify(psid) + ": " + JSON.stringify(value));
        fn(null, value);
      }).catch(error => {
        debug("Error getting item - " + JSON.stringify(error));
        fn(error);
      });
    });
  };

  /**
   * Commit the given `sess` object associated with the given `sid`.
   *
   * @param {String} sid
   * @param {Session} sess
   * @param {Function} fn
   * @api public
   */
  HazelcastStore.prototype.set = function (sid, sess, fn) {
    if (!this.client)
      throw new Error('No client found! Call HazelcastStore.setClient(hzInstance)');

    const psid = this.prefix + sid;
    if (!fn) fn = noop;

    let ttl;
    if (!this.disableTTL) {
      ttl = getTTL(this, sess);
      debug('SET "%s" %s ttl:%s', sid, sess, ttl);
    }
    else {
      debug('SET "%s" %s', sid, sess);
    }

    this.sessionsMap.then(map => {
      map.set(psid, sess,ttl).then(value => {
        debug("Item insert succeeded! key=" + JSON.stringify(psid) + " value=" + JSON.stringify(sess));
        debug("Previous value: " + JSON.stringify(value));
        fn(null, value);
      }).catch(error => {
        debug("Error getting item - " + JSON.stringify(error));
        fn(error);
      });
    });
  };

  /**
   * Destroy the session associated with the given `sid`.
   *
   * @param {String} sid
   * @api public
   */
  HazelcastStore.prototype.destroy = function (sid, fn) {
    if (!this.client)
      throw new Error('No client found! Call HazelcastStore.setClient(hzInstance)');

    const psid = this.prefix + sid;

    this.sessionsMap.then(map => {
      map.delete(psid).then(() => {
        debug("Item removed. sid:" + sid + ".");
        fn(null, sid);
      }).catch(error => {
        debug("Error setting item - " + JSON.stringify(error));
        fn(error);
      });
    });
  };

  return HazelcastStore;
};


