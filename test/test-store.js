"use strict";
const session = require("express-session");
const HazelcastStore = require('../lib/hazelcast-store')(session);
const HazelcastClient = require('hazelcast-client').Client;

describe("hazelcast-store", function () {
  const assert = require("assert");

  const id = new Date().getTime();

  const testSession = {
    "cookie": {
      "path": "/",
      "httpOnly": true,
      "secure": true,
      "maxAge": 1000
    },
    "name": "sid"
  };

  const options = {
    ttl: 15*60*1000,
    debugPrefix: 'oc'
  };

  function createStore(options, done) {
    store = new HazelcastStore(options);
      assert(typeof store === "object");

      HazelcastClient
      .newHazelcastClient({
        network: {
          clusterMembers: ['127.0.0.1:5701']
        }
      })
      .then(function (hzInstance) {
        assert(typeof hzInstance === "object");
        store.setClient(hzInstance);
        console.log('store created!');
        done();
      });
  }

  let store;
  before("should prepare default empty store with new client", (done) => {
    createStore(options, done);
  });

  it("should test the default store", (done) => {
    assert(typeof store.client === "object");
    assert.strictEqual(store.ttl, options.ttl);
    assert.strictEqual(store.disableTTL, options.disableTTL);
    assert.strictEqual(store.mapName, 'Sessions');
    done();
  });

  it("should set a session", function (done) {
    store.set(id, testSession, function (error) {
      assert.strictEqual(error, null);
      done();
    });
  });

  it("should get an existing session", function (done) {
    store.get(id, function (error, session) {
      assert.strictEqual(error, null);
      assert.deepEqual(session, testSession);
      done();
    });
  });

  it("should get null for a non existing session", function (done) {
    store.get('xxx', function (error, session) {
      assert.strictEqual(error, null);
      assert.strictEqual(session, null);
      done();
    });
  });

  it("should destroy an existing session", function (done) {
    store.get(id, function (err, session) {
      assert.strictEqual(err, null);
      assert.deepEqual(session, testSession);

      store.destroy(id, function (erro) {
        assert.strictEqual(erro, null);

        store.get(id, function (error, session) {
          assert.strictEqual(error, null);
          assert.strictEqual(session, null);
          done();
        });
      });
    });
   });


  describe("test a short TTL", function () {

    it("should still exist with no timeout and a ttl of 1 second", (done) => {
      createStore({ttl: 1000}, () => {
        assert(typeof store.client === "object");
        assert.strictEqual(store.ttl, 1000);

        store.set(id, testSession, (err) => {
          assert.strictEqual(err, null);

          store.get(id, (error, session) => {
            assert.strictEqual(error, null);
            assert.deepEqual(session, testSession); // shoudl still exist
            done();
          });
        });
      });
    });

    it("should not exist after a 2 second timeout and a ttl of 1 second", (done) => {
      setTimeout(() => {
        store.get(id, (error, session) => {
          assert.strictEqual(error, null);
          assert.strictEqual(session, null); // session should be gone after
          done();
        });
      }, 2000);
    });

  });

    describe("test a short TTL with cookie ", function () {

        it("should still exist with 100 ms timeout and a maxage of 1 second", (done) => {
            createStore({ttl: null }, () => {
            assert(typeof store.client === "object");
            assert.strictEqual(store.ttl, null);

            store.set(id, testSession, (err) => {
                assert.strictEqual(err, null);

            setTimeout(() => {
            store.get(id, (error, session) => {
                assert.strictEqual(error, null);
            assert.deepEqual(session, testSession); // shoudl still exist
            done();
        });
        }, 100);
        });
        });
    });


        it("should not exist after a 2 second timeout and a maxage of 1 second", (done) => {
            setTimeout(() => {
            store.get(id, (error, session) => {
                assert.strictEqual(error, null);
            assert.strictEqual(session, null); // session should be gone after
            done();
        });
        }, 2000);
    });

    });
});