/*
 *
 * Daemon (Updated)
 *
 */

const Interface = require('./interface');
const events = require('events');

////////////////////////////////////////////////////////////////////////////////

// Main Daemon Function
const Daemon = function(config, daemons) {

  const _this = this;
  this.config = config;
  this.daemons = daemons;

  // Daemon Variables
  this.responses = {};
  this.interface = null;

  // Clear Response Cache
  this.checkCache = function() {
    const cacheTime = Date.now() - (_this.config.settings.cacheRemovalInterval || 5000);
    Object.keys(_this.responses).forEach((key) => {
      if (_this.responses[key].time < cacheTime) delete _this.responses[key];
    });
  };

  // Handle Setting Up Daemon Instances
  this.checkInstances = function(callback) {
    _this.interface = new Interface(daemons);
    _this.interface.once('online', () => callback(false, null));
    _this.interface.on('failed', (errors) => callback(true, JSON.stringify(errors)));
    _this.interface.checkInitialized(() => {});
  };

  // Handle Sending RPC Commands
  this.sendCommands = function(requests, cacheable, streaming, callback) {

    // Cache Variables
    const cacheTime = Date.now() - (_this.config.settings.cacheInterval || 1000);
    const serialized = JSON.stringify(requests);

    // Response Cached <= 1s ago
    if (cacheable && (serialized in _this.responses) && (this.responses[serialized].time >= cacheTime)) {
      callback(this.responses[serialized].result);
      _this.checkCache();
      return;
    }

    // Response Too Old, Not Cached, or Uncacheable
    _this.interface.sendCommands(requests, streaming, (result) => {
      _this.responses[serialized] = { time: Date.now(), result: result };
      callback(result);
      _this.checkCache();
    });
  };
};

module.exports = Daemon;
Daemon.prototype.__proto__ = events.EventEmitter.prototype;
