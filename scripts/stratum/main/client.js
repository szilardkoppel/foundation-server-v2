/*
 *
 * Client (Updated)
 *
 */

const Algorithms = require('./algorithms');
const events = require('events');

////////////////////////////////////////////////////////////////////////////////

// Main Client Function
const Client = function(config) {

  const _this = this;
  this.config = config;
  this.socket = _this.config.socket;

  // Client Variables
  this.activity = Date.now();
  this.authorized = false;
  this.difficulty = 0;
  this.messages = '';
  this.shares = { valid: 0, invalid: 0 };

  // Difficulty Variables
  this.pendingDifficulty = null;
  this.staticDifficulty = false;

  // Send JSON Messages
  this.sendJson = function(messages) {
    let response = '';
    Object.keys(messages).forEach(arg => {
      response += JSON.stringify(messages[arg]) + '\n';
    });
    _this.socket.write(response);
  };

  // Get Label of Stratum Client
  this.sendLabel = function() {
    const worker = _this.addrPrimary || '(unauthorized)';
    const address = _this.socket.remoteAddress;
    return `${ worker } [${ address }]`;
  };

  // Push Updated Difficulty to Queue
  this.enqueueDifficulty = function(difficulty) {
    if (!_this.staticDifficulty) {
      _this.pendingDifficulty = difficulty;
      _this.emit('difficultyQueued', difficulty);
    }
  };

  // Validate Client Name
  this.validateName = function(name) {
    if (name.length >= 1) {
      name = name.toString().replace(/[^a-zA-Z0-9.,]+/g, '');
    }
    const addresses = name.split(',');
    if (addresses.length > 1) {
      return [addresses[0], addresses[1]];
    } else {
      return [addresses[0], null];
    }
  };

  // Validate Client Password
  this.validatePassword = function(password) {
    if (password.length >= 1) {
      password = password.toString().replace(/[^a-zA-Z0-9.,=]+/g, '');
    }
    const values = password.split(',');
    const flags = {};
    values.forEach((value) => {
      if (/^d=[+-]?(\d*\.)?\d+$/.test(value)) {
        flags.difficulty = parseFloat(value.split('=')[1]);
      }
    });
    return flags;
  };

  // Validate Sent Messages
  this.validateMessages = function(message) {
    switch (message.method) {

    // Supported Stratum Messages
    case 'mining.subscribe':
      _this.handleSubscribe(message);
      break;
    case 'mining.authorize':
      _this.handleAuthorize(message);
      break;
    case 'mining.configure':
      _this.handleConfigure(message);
      break;
    case 'mining.multi_version':
      _this.handleMultiVersion(message);
      break;
    case 'mining.submit':
      _this.activity = Date.now();
      _this.handleSubmit(message);
      break;

      // Unsupported Stratum Messages
    case 'mining.get_transactions':
      _this.sendJson({
        id: message.id,
        result: [],
        error: [20, 'Not supported.', null]
      });
      break;
    case 'mining.extranonce.subscribe':
      _this.sendJson({
        id: message.id,
        result: false,
        error: [20, 'Not supported.', null]
      });
      break;
    default:
      _this.emit('unknownStratumMethod', message);
      break;
    }
  };

  // Validate Socket Data
  this.validateData = function(data) {

    // Client is Flooding Server
    const buffer = _this.messages + data;
    if (Buffer.byteLength(buffer, 'utf8') > 10240) {
      _this.emit('socketFlooded');
      _this.socket.destroy();
      return;
    }

    // Handle Individual Messages
    if (buffer.indexOf('\n') !== -1) {
      const messages = buffer.split('\n');
      const incomplete = buffer.slice(-1) === '\n' ? '' : messages.pop();
      messages.forEach((message) => {
        if (message === '') return;
        try {
          _this.validateMessages(JSON.parse(message));
        } catch(e) {
          _this.emit('malformedMessage', e);
          _this.socket.destroy();
          return;
        }
      });
      _this.messages = incomplete;
    }
  };

  // Check for Banning Users
  this.considerBan = function(shareValid) {

    // Keep Track of Valid/Invalid Shares
    if (shareValid === true) _this.shares.valid += 1;
    else _this.shares.invalid += 1;

    // Check if Tracked Shares Exceeds Ban Threshold
    const totalShares = _this.shares.valid + _this.shares.invalid;
    if (totalShares >= _this.config.banning.checkThreshold) {
      if ((_this.shares.invalid / totalShares) < _this.config.banning.invalidPercent) {
        this.shares = { valid: 0, invalid: 0 };
      } else {
        _this.socket.destroy();
        _this.emit('triggerBan');
        return true;
      }
    }

    // No Ban Necessary
    return false;
  };

  // Manage Stratum Subscription
  this.handleSubscribe = function(message) {
    switch (_this.config.algorithm) {

    // Kawpow/Firopow Subscription
    case 'kawpow':
    case 'firopow':
      _this.emit('subscription', {}, (error, extraNonce1) => {
        if (error) {
          _this.sendJson({
            id: message.id,
            result: null,
            error: error
          });
          return;
        }
        _this.extraNonce1 = extraNonce1;
        _this.sendJson({
          id: message.id,
          result: [null, extraNonce1],
          error: null
        });
      });
      break;

    // Default Subscription
    default:
      _this.emit('subscription', {}, (error, extraNonce1, extraNonce2Size) => {
        if (error) {
          _this.sendJson({
            id: message.id,
            result: null,
            error: error
          });
          return;
        }
        _this.extraNonce1 = extraNonce1;
        _this.sendJson({
          id: message.id,
          result: [[
            ['mining.set_difficulty', _this.config.subscriptionId],
            ['mining.notify', _this.config.subscriptionId]],
          extraNonce1,
          extraNonce2Size
          ],
          error: null
        });
      });
      break;
    }
  };

  // Manage Stratum Authorization
  this.handleAuthorize = function(message) {

    // Handle Client Authentication
    const clientAddrs = _this.validateName(message.params[0]);
    const clientFlags = _this.validatePassword(message.params[1]);

    // Set Initial Variables
    _this.addrPrimary = clientAddrs[0];
    _this.addrAuxiliary = clientAddrs[1];
    _this.clientPassword = message.params[1];

    // Check for Difficulty Flag
    if (clientFlags.difficulty) {
      _this.enqueueDifficulty(clientFlags.difficulty);
      _this.staticDifficulty = true;
    }

    // Structure Client Data
    const clientData = {
      ip: _this.socket.remoteAddress,
      port: _this.socket.localPort,
      addrPrimary: _this.addrPrimary,
      addrAuxiliary: _this.addrAuxiliary,
      password: _this.clientPassword,
    };

    // Check to Authorize Client
    _this.config.authorizeFn(clientData, (result) => {
      _this.authorized = (!result.error && result.authorized);
      if (result.disconnect) {
        _this.socket.destroy();
        return;
      }
      _this.sendJson({
        id: message.id,
        result: _this.authorized,
        error: result.error
      });
    });
  };

  // Manage Stratum Configuration
  this.handleConfigure = function(message) {

    // No AsicBoost Support
    if (!_this.config.asicboost) {
      _this.sendJson({
        id: message.id,
        result: {
          'version-rolling': false
        },
        error: null
      });
      _this.asicboost = false;
      _this.versionMask = '00000000';

    // AsicBoost is Supported
    } else {
      _this.sendJson({
        id: message.id,
        result: {
          'version-rolling': true,
          'version-rolling.mask': '1fffe000'
        },
        error: null
      });
      _this.asicboost = true;
      _this.versionMask = '1fffe000';
    }
  };

  // Manage Stratum Multi-Versions
  this.handleMultiVersion = function(message) {

    // No AsicBoost Support
    if (!_this.config.asicboost) {
      _this.asicboost = false;
      _this.versionMask = '00000000';

    // AsicBoost is Supported
    } else {
      const mVersion = parseInt(message.params[0]);
      if (mVersion > 1) {
        _this.asicboost = true;
        _this.versionMask = '1fffe000';
      } else {
        _this.asicboost = false;
        _this.versionMask = '00000000';
      }
    }
  };

  // Manage Stratum Submission
  this.handleSubmit = function(message) {

    // Check that Address is Set
    if (!_this.addrPrimary) {
      const workerData = _this.validateName(message.params[0]);
      _this.addrPrimary = workerData[0];
      _this.addrAuxiliary = workerData[1];
    }

    // Check that Client is Authorized
    if (!_this.authorized) {
      _this.sendJson({
        id: message.id,
        result: null,
        error: [24, 'unauthorized worker', null]
      });
      _this.considerBan(false);
      return;
    }

    // Check that Client is Subscribed
    if (!_this.extraNonce1) {
      _this.sendJson({
        id: message.id,
        result: null,
        error: [25, 'not subscribed', null]
      });
      _this.considerBan(false);
      return;
    }

    // Submit Share to Pool Server
    message.params[0] = _this.validateName(message.params[0]);
    _this.emit('submit', message, (error, result) => {
      if (!_this.considerBan(result)) {
        _this.sendJson({
          id: message.id,
          result: result,
          error: error
        });
      }
    });
  };

  // Broadcast Difficulty to Stratum Client
  this.broadcastDifficulty = function(difficulty) {

    // Handle Previous Difficulty
    if (difficulty === _this.difficulty) return false;
    _this.previousDifficulty = _this.difficulty;
    _this.difficulty = difficulty;

    // Process Algorithm Difficulty
    let adjPow;
    switch (_this.config.algorithm) {

    // Kawpow/Firopow Difficulty
    case 'kawpow':
    case 'firopow':
      adjPow = Algorithms[_this.config.algorithm].diff / _this.difficulty;
      adjPow = '0'.repeat(64 - adjPow.toString(16).length) + adjPow.toString(16);
      _this.sendJson({
        id: null,
        method: 'mining.set_target',
        params: [adjPow.substr(0, 64)],
      });
      break;

    // Default Difficulty
    default:
      _this.sendJson({
        id: null,
        method: 'mining.set_difficulty',
        params: [difficulty],
      });
      break;
    }

    // Difficulty Changed
    return true;
  };

  // Broadcast Mining Job to Stratum Client
  this.broadcastMiningJob = function(parameters) {

    // Check Processed Shares
    const activityAgo = Date.now() - _this.activity;
    if (activityAgo > _this.config.connectionTimeout * 1000) {
      const message = `The last submitted share was ${ activityAgo / 1000 | 0 } seconds ago`;
      _this.emit('socketTimeout', message);
      _this.socket.destroy();
      return;
    }

    // Update Client Difficulty
    if (_this.pendingDifficulty != null) {
      const result = _this.broadcastDifficulty(_this.pendingDifficulty);
      if (result) _this.emit('difficultyChanged', _this.difficulty);
      _this.pendingDifficulty = null;
    }

    // Process Job Broadcasting
    let adjPow;
    switch (_this.config.algorithm) {

    // Kawpow/Firopow Broadcasting
    case 'kawpow':
    case 'firopow':
      adjPow = Algorithms[_this.config.algorithm].diff / _this.difficulty;
      adjPow = '0'.repeat(64 - adjPow.toString(16).length) + adjPow.toString(16);
      parameters[3] = adjPow.substr(0, 64);
      _this.sendJson({
        id: null,
        method: 'mining.notify',
        params: parameters
      });
      break;

    // Default Broadcasting
    default:
      _this.sendJson({
        id: null,
        method: 'mining.notify',
        params: parameters
      });
      break;
    }
  };

  // Establish Stratum Connection
  this.setupClient = function() {

    // Setup Main Socket Connection
    _this.socket.setEncoding('utf8');
    _this.emit('checkBan');

    // Process Socket Events
    _this.socket.on('data', (data) => _this.validateData(data));
    _this.socket.on('error', (error) => _this.emit('socketError', error));
    _this.socket.on('close', () => _this.emit('socketDisconnect'));
  };
};

module.exports = Client;
Client.prototype.__proto__ = events.EventEmitter.prototype;
