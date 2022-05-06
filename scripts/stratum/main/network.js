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

}

module.exports = Network;
Network.prototype.__proto__ = events.EventEmitter.prototype;
