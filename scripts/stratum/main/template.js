/*
 *
 * Template (Updated)
 *
 */

const Algorithms = require('./algorithms');
const Merkle = require('./merkle');
const Transactions = require('./transactions');
const bignum = require('bignum');
const sha3 = require('sha3');
const utils = require('./utils');

////////////////////////////////////////////////////////////////////////////////

// Main Template Function
const Template = function(config, rpcData, jobId, placeholder, auxMerkle) {

  const _this = this;
  this.config = config;
  this.rpcData = rpcData;
  this.submissions = [];
  this.jobId = jobId;

  const algorithm = _this.config.primary.coin.algorithms.mining;
  this.target = _this.rpcData.target ? bignum(_this.rpcData.target, 16) : utils.bignumFromBitsHex(_this.rpcData.bits);
  this.difficulty = parseFloat((Algorithms[algorithm].diff / _this.target.toNumber()).toFixed(9));

  // Check if Configuration Supported
  if (rpcData.coinbase_payload && _this.config.auxiliary && _this.config.auxiliary.enabled) {
    throw new Error('Merged mining is not supported with coins that pass an extra coinbase payload.');
  }

  // Template Variables
  this.merkle = new Merkle(utils.convertHashToBuffer(_this.rpcData.transactions));
  this.generation = new Transactions().default(_this.config, _this.rpcData, placeholder, auxMerkle);
  this.previousblockhash = utils.reverseByteOrder(Buffer.from(_this.rpcData.previousblockhash, 'hex')).toString('hex');
  this.transactions = Buffer.concat(_this.rpcData.transactions.map((tx) => Buffer.from(tx.data, 'hex')));

  // Serialize Block Headers
  this.handleHeader = function(merkleRoot, nTime, nonce, version) {
    let header = Buffer.alloc(80);
    let position = 0;
    switch (algorithm) {

    // Kawpow/Firopow Block Header
    case 'kawpow':
    case 'firopow':
      header.write(utils.packUInt32BE(this.rpcData.height).toString('hex'), position, 4, 'hex');
      header.write(this.rpcData.bits, position += 4, 4, 'hex');
      header.write(nTime, position += 4, 4, 'hex');
      header.write(utils.reverseBuffer(merkleRoot).toString('hex'), position += 4, 32, 'hex');
      header.write(this.rpcData.previousblockhash, position += 32, 32, 'hex');
      header.writeUInt32BE(version, position + 32, 4);
      break;

    // Default Block Header
    default:
      header.write(nonce, position, 4, 'hex');
      header.write(_this.rpcData.bits, position += 4, 4, 'hex');
      header.write(nTime, position += 4, 4, 'hex');
      header.write(utils.reverseBuffer(merkleRoot).toString('hex'), position += 4, 32, 'hex');
      header.write(_this.rpcData.previousblockhash, position += 32, 32, 'hex');
      header.writeUInt32BE(version, position + 32);
      break;
    }

    header = utils.reverseBuffer(header);
    return header;
  };

  // Determine Coinbase Hash Function
  this.hashCoinbase = function() {
    const algorithm = _this.config.primary.coin.algorithms.coinbase;
    const hashDigest = Algorithms[algorithm].hash(_this.config.primary.coin);
    return function () {
      return hashDigest.apply(this, arguments);
    };
  }();

  // Serialize Block Coinbase
  this.handleCoinbase = function(extraNonce1, extraNonce2) {
    let buffer;
    switch (algorithm) {

    // Kawpow/Firopow Block Header
    case 'kawpow':
    case 'firopow':
      buffer = Buffer.concat([
        _this.generation[0],
        extraNonce1,
        _this.generation[1]
      ]);
      break;

    default:
      buffer = Buffer.concat([
        _this.generation[0],
        extraNonce1,
        extraNonce2,
        _this.generation[1]
      ]);
      break;
    }

    return buffer;
  };

  // Determine Block Hash Function
  this.hashBlocks = function() {
    const algorithm = _this.config.primary.coin.algorithms.block;
    const hashDigest = Algorithms[algorithm].hash(_this.config.primary.coin);
    return function () {
      return utils.reverseBuffer(hashDigest.apply(this, arguments));
    };
  }();

  // Serialize Entire Block
  this.handleBlocks = function(header, coinbase, nonce, mixHash) {
    let buffer, votes;

    // Handle Block Voting
    if (!_this.rpcData.votes) votes = Buffer.from([]);
    else {
      const mapping = _this.rpcData.votes.map((vt) => Buffer.from(vt, 'hex'));
      votes = Buffer.concat(
        [utils.varIntBuffer(_this.rpcData.votes.length)].concat(mapping));
    }

    // Serialize Block Structure
    switch (algorithm) {

    // Kawpow/Firopow Block Structure
    case 'kawpow':
    case 'firopow':
      buffer = Buffer.concat([
        header,
        nonce,
        utils.reverseBuffer(mixHash),
        utils.varIntBuffer(_this.rpcData.transactions.length + 1),
        coinbase,
        _this.transactions,
      ]);
      break;

    // Default Block Structure
    default:
      buffer = Buffer.concat([
        header,
        utils.varIntBuffer(_this.rpcData.transactions.length + 1),
        coinbase,
        _this.transactions,
        votes,
        Buffer.from(_this.config.primary.coin.hybrid ? [0] : [])
      ]);
      break;
    }

    return buffer;
  };

  // Check Previous Submissions for Duplicates
  this.handleSubmissions = function(header) {
    const submission = header.join('').toLowerCase();
    if (_this.submissions.indexOf(submission) === -1) {
      _this.submissions.push(submission);
      return true;
    }
    return false;
  };

  // Generate Job Parameters for Clients
  this.handleParameters = function(client, cleanJobs) {

    // Establish Parameter Variables
    let adjPow, epochLength, extraNonce1Buffer;
    let coinbaseBuffer, coinbaseHash, merkleRoot;
    let version, nTime, target, header, headerBuffer;
    let sha3Hash, seedHashBuffer;

    // Process Job Parameters
    switch (algorithm) {

    // Kawpow/Firopow Parameters
    case 'kawpow':
    case 'firopow':

      // Check if Client has ExtraNonce Set
      if (!client.extraNonce1) {
        client.extraNonce1 = utils.extraNonceCounter(2).next();
      }

      adjPow = Algorithms[algorithm].diff / _this.difficulty;
      adjPow = '0'.repeat(64 - adjPow.toString(16).length) + adjPow.toString(16);
      epochLength = Math.floor(this.rpcData.height / Algorithms[algorithm].epochLength);
      extraNonce1Buffer = Buffer.from(client.extraNonce1, 'hex');

      // Generate Coinbase Buffer
      coinbaseBuffer = _this.handleCoinbase(extraNonce1Buffer);
      coinbaseHash = _this.hashCoinbase(coinbaseBuffer);
      merkleRoot = _this.merkle.withFirst(coinbaseHash);

      // Generate Block Header Hash
      version = _this.rpcData.version;
      nTime = utils.packUInt32BE(_this.rpcData.curtime).toString('hex');
      target = adjPow.substr(0, 64);
      header = _this.handleHeader(merkleRoot, nTime, 0, version);
      headerBuffer = utils.reverseBuffer(utils.sha256d(header));

      // Generate Seed Hash Buffer
      sha3Hash = new sha3.SHA3Hash(256);
      seedHashBuffer = Buffer.alloc(32);
      for (let i = 0; i < epochLength; i++) {
        sha3Hash = new sha3.SHA3Hash(256);
        sha3Hash.update(seedHashBuffer);
        seedHashBuffer = sha3Hash.digest();
      }

      // Generate Job Parameters
      return [
        _this.jobId,
        headerBuffer.toString('hex'),
        seedHashBuffer.toString('hex'),
        target,
        cleanJobs,
        _this.rpcData.height,
        _this.rpcData.bits
      ];

    // Default Parameters
    default:
      return [
        _this.jobId,
        _this.previousblockhash,
        _this.generation[0].toString('hex'),
        _this.generation[1].toString('hex'),
        _this.merkle.steps.map((step) => step.toString('hex')),
        utils.packInt32BE(_this.rpcData.version).toString('hex'),
        _this.rpcData.bits,
        utils.packUInt32BE(_this.rpcData.curtime).toString('hex'),
        cleanJobs
      ];
    }
  };
};

module.exports = Template;
