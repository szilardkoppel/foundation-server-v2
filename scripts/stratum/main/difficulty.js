/*
 *
 * Difficulty (Updated)
 *
 */

const events = require('events');

////////////////////////////////////////////////////////////////////////////////

// Main Difficulty Function
const Difficulty = function(config) {

  const _this = this;
  this.config = config;
  this.queue = [];

  // Difficulty Variables
  this.maxSize = _this.config.retargetTime / _this.config.targetTime * 4;
  this.minTime = _this.config.targetTime * (1 + _this.config.variance);
  this.maxTime = _this.config.targetTime * (1 - _this.config.variance);

  // Difficulty Saved Values
  this.lastRetargetTime = null;
  this.lastSavedTime = null;

  // Check Difficulty for Updates
  this.checkDifficulty = function(client) {

    // Calculate Average/Difference
    let output = null;
    const curAverage = _this.queue.reduce((a, b) => a + b, 0) / _this.queue.length;
    let curDifference = _this.config.targetTime / curAverage;

    // Shift Difficulty Down
    if (curAverage > _this.maxTime && client.difficulty > _this.config.minimum) {
      if (curDifference * client.difficulty < _this.config.minimum) {
        curDifference = _this.config.minimum / client.difficulty;
      }
      output = curDifference;

    // Shift Difficulty Up
    } else if (curAverage < _this.minTime && client.difficulty < _this.config.maximum) {
      if (curDifference * client.difficulty > _this.config.maximum) {
        curDifference = _this.config.maximum / client.difficulty;
      }
      output = curDifference;
    }

    // Return Updated Difference
    return output;
  };

  // Handle Individual Clients
  this.handleClient = function(client) {

    // Add Event Listener to Client Instance
    client.on('submit', () => _this.handleDifficulty(client));
  };

  // Handle Difficulty Updates
  this.handleDifficulty = function(client) {

    // Update Current Time/Values
    const curTime = (Date.now() / 1000) | 0;
    if (!_this.lastRetargetTime) {
      _this.lastRetargetTime = curTime - _this.config.retargetTime / 2;
      _this.lastSavedTime = curTime;
      return;
    }

    // Append New Value to Queue
    if (_this.queue.length >= _this.maxSize) _this.queue.shift();
    _this.queue.push(curTime - _this.lastSavedTime);
    _this.lastSavedTime = curTime;

    // Calculate Difference Between Desired vs. Average Time
    if (curTime - _this.lastRetargetTime < _this.config.retargetTime) return;
    const updatedDifficulty = this.checkDifficulty(client);

    // Difficulty Will Be Updated
    if (updatedDifficulty !== null) {
      _this.queue = [];
      const newDifference = parseFloat((client.difficulty * updatedDifficulty).toFixed(8));
      _this.emit('newDifficulty', client, newDifference);
    }

    // Update Retarget Time
    _this.lastRetargetTime = curTime;
  };
};

module.exports = Difficulty;
Difficulty.prototype.__proto__ = events.EventEmitter.prototype;
