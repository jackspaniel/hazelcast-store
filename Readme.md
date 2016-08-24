[![npm](https://img.shields.io/npm/v/hazelcast-store.svg)](https://npmjs.com/package/hazelcast-store) [![Dependencies](https://img.shields.io/david/jackspaniel/hazelcast-store.svg)](https://david-dm.org/jackspaniel/hazelcast-store) ![Downloads](https://img.shields.io/npm/dm/hazelcast-store.svg)

### **hazelcast-store** is a Hazelcast session store backed by [hazelcast-client](https://github.com/hazelcast/hazelcast-nodejs-client).

**NOTE: This is a first pass, use at your own risk. I will be glad to accept pull requests to fix bugs or add new features.**

# Setup
```sh
npm install hazelcast-store express-session
```

### Create an instance of `HazelcastStore` and pass it to the express sessions API:
```js
const session = require('express-session');
const HazelcastStore = require('hazelcast-store')(session);

const hzStore = new HazelcastStore({ ttl: 15*60*1000, debugPrefix: 'oc' });
app.use(session({ store: hzStore, secret: 'argle bargle' }));
```

### Example implementation of `HazelcastClient` and setting the client instance on the `HazelcastStore`:
```js
const HazelcastClient = require('hazelcast-client').Client;
const HazelcastConfig = require('hazelcast-client').Config;

const clientConfig = new HazelcastConfig.ClientConfig();
clientConfig.networkConfig.addresses = [{host: '127.0.0.1', 5701}];

HazelcastClient.newHazelcastClient(clientConfig).then((hzInstance) => {  
  hazelcastStore.setClient(hzInstance);
});
```


# Options
A full initialized Hazelcast Client is required. This client is either passed directly using the `client` property, or it can be added after creating the HazelcastStore using the store.addClient() method (see example above). This method is probably the easiest because the code that creates an instance of the Hazelcast client is asynchronous, and express sessions needs to set early in the app.use() chain.

The following additional properties are optional:

-  `ttl` Hazelcast session TTL (expiration) in milli-seconds
-  `debugPrefix` prefix to use with debug module so this module's output can be seen with your app's debug output
-  `disableTTL` Disables setting TTL, keys will stay in Hazelcast until evicted by other means (overides `ttl`\)
-  `prefix` Key prefix defaulting to "sess:"
-  `logErrors` Whether or not to log client errors. (default: `false`\)
	-	If `true`, a default logging function (`console.error`) is provided.
	-	If a function, it is called anytime an error occurs (useful for custom logging)
	-	If `false`, no logging occurs.    

# TODO
1. Custom serialization
2. Possily implement touch() method. Is express-sessions even using it any more? [Doesn't seem like it](https://github.com/expressjs/session/blob/839959036c0f6add53166f4a4d73edfc126d5ab7/session/session.js)
3. Implement clear(), all() and length()
4. Handle hazelcast down/unreachable? (Most likely node will just throw an error)

# License
MIT
