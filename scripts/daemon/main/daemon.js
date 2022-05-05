/*
 *
 * Daemon (Updated)
 *
 */

const http = require('http');
const events = require('events');
const async = require('async');

////////////////////////////////////////////////////////////////////////////////

/**
 * The Daemon interface interacts with the coin Daemon by using the RPC interface.
 * in order to make it work it needs, as constructor, an array of objects containing
 * - 'host'    : hostname where the coin lives
 * - 'port'    : port where the coin accepts RPC connections
 * - 'user'    : username of the coin for the RPC interface
 * - 'password': password for the RPC interface of the coin
**/

// Main Daemon Function
const Daemon = function(daemons) {

  const _this = this;
  this.instances = daemons;
  this.instances.forEach((daemon, idx) => daemon.index = idx);

  // Check if All Daemons are Online
  this.checkOnline = function(callback) {
    _this.sendCommands([['getpeerinfo', []]], false, (results) => {
      const online = results.every((result) => !result.error);
      if (!online) _this.emit('connectionFailed', results);
      callback(online);
    });
  };

  // Check if All Daemons are Initialized
  this.checkInitialized = function(callback) {
    _this.checkOnline((online) => {
      if (online) _this.emit('online');
      callback(online);
    });
  };

  // Handle HTTP Response
  this.handleResponse = function(response, instance, data, callback) {

    // Unauthorized Access
    if ([401, 403].includes(response.statusCode)) {
      callback({
        error: true,
        result: 'Unauthorized RPC access. Invalid RPC username or password',
        instance: instance.host,
        data: data,
      });
    }

    // Parse and Return Data
    try {

      // Response Variables
      const output = [];
      const dataJson = JSON.parse(data);

      // Batch Command Passed
      if (Array.isArray(dataJson)) {
        dataJson.forEach((current) => {
          output.push({
            error: false,
            result: current.result,
            instance: instance.host,
            data: JSON.stringify(current),
          });
        });
        callback(output);

      // Single Command Passed
      } else {
        callback({
          error: false,
          result: dataJson.result,
          instance: instance.host,
          data: data,
        })
      }

    // Data is Malformed
    } catch(e) {
      callback({
        error: true,
        result: 'Could not parse RPC data from daemon response',
        instance: instance.host,
        data: data,
      });
    }
  };

  // Handle Sending HTTP Requests
  this.handleRequest = function(instance, data, callback) {

    // HTTP Options
    let responded = false;
    const options = {
      hostname: instance.host,
      port: instance.port,
      method: 'POST',
      timeout: 3000,
      headers: { 'Content-Length': data.length },
      auth: instance.username + ':' + instance.password,
    };

    // Build HTTP Request
    const req = http.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => _this.handleResponse(res, instance, data, (response) => {
        if (!responded) {
          responded = true;
          callback(response);
        }
      }));
    });

    // HTTP Error Handling
    /* istanbul ignore next */
    req.on('error', (e) => {
      if (!responded) {
        responded = true;
        callback({
          error: true,
          result: e.message,
          instance: instance.host,
          data: null,
        });
      }
    });

    // Send HTTP Request to Daemon
    req.end(data);
  };

  // Handle Sending RPC Commands
  this.sendCommands = function(requests, streaming, callback) {

    // No Commands Passed
    if (requests.length < 1) {
      callback({
        error: true,
        result: 'No commands passed to daemon',
        instance: null,
        data: null,
      });
      return;
    }

    // Build JSON Requests
    let requestsJson = [];
    requests.forEach((command, idx) => {
      requestsJson.push({
        method: command[0],
        params: command[1],
        id: Date.now() + Math.floor(Math.random() * 10) + idx
      });
    });

    // Response Variables
    let responded = false;
    const results = [];

    // Build Serialized Request
    if (requestsJson.length === 1) requestsJson = requestsJson[0];
    const serialized = JSON.stringify(requestsJson);

    // Send Requests to All Daemons Individually
    async.each(this.instances, (instance, eachCallback) => {
      _this.handleRequest(instance, serialized, (response) => {
        results.push(response);
        if (streaming && !responded && !response.error) {
          responded = true;
          callback(response);
        } else {
          eachCallback();
        }
      });

    // Handle Daemon Responses
    }, () => {
      if (streaming && !responded) callback(results[0]);
      else callback(results);
    });
  };
};

module.exports = Daemon;
Daemon.prototype.__proto__ = events.EventEmitter.prototype;
