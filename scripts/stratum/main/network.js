/*
 *
 * Network (Updated)
 *
 */

const Client = require('./client');
const net = require('net');
const tls = require('tls');
const fs = require('fs');
const path = require('path');
const events = require('events');
const utils = require('./utils');

////////////////////////////////////////////////////////////////////////////////

// Main Network Function
const Network = function(config, configMain, authorizeFn) {

  const _this = this;
  this.config = config;
  this.configMain = configMain;

  // Network Variables
  this.bannedIPs = {};
  this.counter = utils.subscriptionCounter();
  this.stratumClients = {};
  this.stratumServers = {};
  this.broadcastTimeout = null;

  // Check Banned Clients for a Match
  this.checkBan = function(client) {
    if (client.socket.remoteAddress in _this.bannedIPs) {

      // Calculate Time Left on Ban
      const bannedTime = _this.bannedIPs[client.socket.remoteAddress];
      const bannedTimeAgo = Date.now() - bannedTime;
      const bannedTimeLeft = _this.config.banning.time * 1000 - bannedTimeAgo;

      // Kick or Forgive Client if Served Time
      if (bannedTimeLeft > 0) {
        client.socket.destroy();
        client.emit('kickedClient', bannedTimeLeft / 1000 | 0);
      } else {
        delete _this.bannedIPs[client.socket.remoteAddress];
        client.emit('forgaveClient');
      }
    }
  };

  // Handle Broadcasting New Jobs to Clients
  /* istanbul ignore next */
  this.broadcastMiningJobs = function(template, cleanJobs) {

    // Send New Jobs to Clients
    Object.keys(_this.stratumClients).forEach(clientId => {
      const client = _this.stratumClients[clientId];
      const parameters = template.handleParameters(client, cleanJobs);
      client.broadcastMiningJob(parameters);
    });

    // Handle Resetting Broadcast Timeout
    if (_this.broadcastTimeout) clearTimeout(_this.broadcastTimeout);
    _this.broadcastTimeout = setTimeout(() => {
      _this.emit('broadcastTimeout');
    }, _this.config.settings.jobRebroadcastTimeout * 1000);
  };

  // Manage New Client Connections
  this.handleClient = function (socket) {

    // Establish New Stratum Client
    socket.setKeepAlive(true);
    const subscriptionId = _this.counter.next();
    const client = new Client({
      algorithm: _this.config.primary.coin.algorithms.mining,
      asicboost: _this.config.primary.coin.asicboost,
      authorizeFn: authorizeFn,
      banning: _this.config.banning,
      connectionTimeout: _this.config.settings.connectionTimeout,
      socket: socket,
      subscriptionId: subscriptionId,
    });

    // Add New Client to Tracked Clients
    _this.stratumClients[subscriptionId] = client;
    _this.emit('clientConnected', client);

    // Manage Client Behaviors
    client.on('checkBan', () => _this.checkBan(client));
    client.on('triggerBan', () => {
      _this.bannedIPs[client.socket.remoteAddress] = Date.now();
      _this.emit('clientBanned', client);
    });
    client.on('socketDisconnect', () => {
      delete _this.stratumClients[subscriptionId];
      _this.emit('clientDisconnected', client);
    });

    // Handle Client Setup
    client.setupClient();
    return subscriptionId;
  };

  // Setup Stratum Network Functionality
  /* istanbul ignore next */
  this.setupNetwork = function() {

    // Interval to Clear Old Bans from BannedIPs
    setInterval(() => {
      Object.keys(_this.bannedIPs).forEach(ip => {
        const banTime = _this.bannedIPs[ip];
        if (Date.now() - banTime > _this.config.banning.time) {
          delete _this.bannedIPs[ip];
        }
      });
    }, 1000 * _this.config.banning.purgeInterval);

    // Filter Ports for Activity
    const stratumPorts = _this.config.ports.filter(port => port.enabled);

    // Start Individual Stratum Servers
    let serversStarted = 0;
    stratumPorts.forEach((port) => {
      const currentPort = port.port;

      // Define Stratum Options
      const options = {
        ...(port.tls && { key: fs.readFileSync(path.join('./certificates', _this.configMain.tls.key)) }),
        ...(port.tls && { cert: fs.readFileSync(path.join('./certificates', _this.configMain.tls.cert)) }),
        allowHalfOpen: false,
      };

      // Setup Stratum Server
      const callback = (socket) => _this.handleClient(socket);
      const server = (port.tls) ? tls.createServer(options, callback) : net.createServer(options, callback);

      // Setup Server to Listen on Port
      server.listen(parseInt(currentPort), () => {
        serversStarted += 1;
        if (serversStarted == stratumPorts.length) {
          _this.emit('started');
        }
      });

      // Add New Server to Tracked Server
      _this.stratumServers[currentPort] = server;
    });
  }();

  // Stop Stratum Network Functionality
  this.stopNetwork = function() {

    // Filter Ports for Activity
    const stratumPorts = _this.config.ports.filter(port => port.enabled);

    // Stop Individual Stratum Servers
    stratumPorts.forEach((port) => {
      const currentPort = port.port;
      const server = _this.stratumServers[currentPort];
      server.close();
    });

    // Emit Final Stopped Event
    _this.emit('stopped');
  };
};

module.exports = Network;
Network.prototype.__proto__ = events.EventEmitter.prototype;
