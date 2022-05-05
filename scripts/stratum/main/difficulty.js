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
    const curAverage = _this.queue.reduce((a, b) => a + b, 0) / _this.queue.length;
    let curDifference = _this.config.targetTime / curAverage;
    _this.lastRetargetTime = curTime;

    // Shift Difficulty Down
    if (curAverage > _this.maxTime && client.difficulty > _this.config.minimum) {
      if (curDifference * client.difficulty < _this.config.minimum) {
        curDifference = _this.config.minimum / client.difficulty;
      }

    // Shift Difficulty Up
    } else if (curAverage < _this.minTime && client.difficulty < _this.config.maximum) {
      if (curDifference * client.difficulty > _this.config.maximum) {
        curDifference = _this.config.maximum / client.difficulty;
      }

    // No Difficulty Update Required
    } else {
      return;
    }

    // Send New Difficulty to Client
    _this.queue = [];
    const newDifference = parseFloat((client.difficulty * curDifference).toFixed(8));
    _this.emit('newDifficulty', client, newDifference);
  }

  // Handle Individual Clients
  this.handleClient = function(client) {
    client.on('submit', () => _this.handleDifficulty(client));
  };
}

module.exports = Difficulty;
Difficulty.prototype.__proto__ = events.EventEmitter.prototype;
