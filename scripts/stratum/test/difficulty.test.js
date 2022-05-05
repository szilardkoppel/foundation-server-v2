/*
 *
 * Difficulty (Updated)
 *
 */

const MockDate = require('mockdate');
const Difficulty = require('../main/difficulty');
const events = require('events');

// Bad Settings
const config = {
  'minimum': 8,
  'maximum': 512,
  'targetTime': 15,
  'retargetTime': 90,
  'variance': 0.3,
};

////////////////////////////////////////////////////////////////////////////////

describe('Test difficulty functionality', () => {

  let client;
  beforeEach(() => {
    client = new events.EventEmitter();
    client.difficulty = 32;
  });

  let configCopy;
  beforeEach(() => {
    configCopy = JSON.parse(JSON.stringify(config));
  });

  test('Test client difficulty initialization [1]', () => {
    const difficulty = new Difficulty(configCopy);
    difficulty.handleClient(client);
    expect(client._eventsCount).toBe(1);
    expect(Object.keys(client._events)[0]).toBe('submit');
  });

  test('Test client difficulty initialization [2]', (done) => {
    MockDate.set(1634742080841);
    const difficulty = new Difficulty(configCopy);
    difficulty.lastRetargetTime = 1634741500;
    difficulty.lastSavedTime = 1634741505;
    difficulty.handleClient(client);
    difficulty.on('newDifficulty', (client, current) => {
      expect(current).toBe(8);
      expect(difficulty.queue.length).toBe(0);
      done()
    });
    client.emit('submit');
  });

  test('Test client difficulty management [1]', () => {
    MockDate.set(1634742080841);
    const difficulty = new Difficulty(configCopy);
    difficulty.handleDifficulty(client);
    expect(difficulty.lastRetargetTime).toBe(1634742035);
    expect(difficulty.lastSavedTime).toBe(1634742080);
  });

  test('Test client difficulty management [2]', () => {
    MockDate.set(1634742080841);
    const difficulty = new Difficulty(configCopy);
    difficulty.lastRetargetTime = 1634742070;
    difficulty.lastSavedTime = 1634742075;
    difficulty.handleDifficulty(client);
    expect(difficulty.lastRetargetTime).toBe(1634742070);
    expect(difficulty.lastSavedTime).toBe(1634742080);
  });

  test('Test client difficulty management [3]', () => {
    MockDate.set(1634742080841);
    const difficulty = new Difficulty(configCopy);
    difficulty.lastRetargetTime = 1634742070;
    difficulty.lastSavedTime = 1634742075;
    difficulty.queue = new Array(24).fill(0);
    difficulty.handleDifficulty(client);
    expect(difficulty.lastRetargetTime).toBe(1634742070);
    expect(difficulty.lastSavedTime).toBe(1634742080);
    expect(difficulty.queue.length).toBe(24);
    expect(difficulty.queue.slice(-1)[0]).toBe(5);
  });

  test('Test client difficulty management [4]', (done) => {
    MockDate.set(1634742080841);
    const difficulty = new Difficulty(configCopy);
    difficulty.lastRetargetTime = 1634741500;
    difficulty.lastSavedTime = 1634741505;
    difficulty.on('newDifficulty', (client, current) => {
      expect(current).toBe(8);
      expect(difficulty.queue.length).toBe(0);
      done()
    });
    difficulty.handleDifficulty(client);
  });

  test('Test client difficulty management [5]', (done) => {
    MockDate.set(1634742080841);
    const difficulty = new Difficulty(configCopy);
    difficulty.lastRetargetTime = 1634741500;
    difficulty.lastSavedTime = 1634742000;
    difficulty.queue = new Array(24).fill(0);
    difficulty.on('newDifficulty', (client, current) => {
      expect(current).toBe(144);
      expect(difficulty.queue.length).toBe(0);
      done()
    });
    difficulty.handleDifficulty(client);
  });

  test('Test client difficulty management [6]', (done) => {
    MockDate.set(1634742080841);
    const difficulty = new Difficulty(configCopy);
    client.difficulty = 510;
    difficulty.lastRetargetTime = 1634741500;
    difficulty.lastSavedTime = 1634741505;
    difficulty.on('newDifficulty', (client, current) => {
      expect(current).toBe(13.30434783);
      expect(difficulty.queue.length).toBe(0);
      done()
    });
    difficulty.handleDifficulty(client);
  });

  test('Test client difficulty management [7]', (done) => {
    MockDate.set(1634742080841);
    const difficulty = new Difficulty(configCopy);
    client.difficulty = 510;
    difficulty.lastRetargetTime = 1634741500;
    difficulty.lastSavedTime = 1634742000;
    difficulty.queue = new Array(24).fill(0);
    difficulty.on('newDifficulty', (client, current) => {
      expect(current).toBe(512);
      expect(difficulty.queue.length).toBe(0);
      done()
    });
    difficulty.handleDifficulty(client);
  });

  test('Test client difficulty management [8]', () => {
    MockDate.set(1634742080841);
    const difficulty = new Difficulty(configCopy);
    client.difficulty = 8;
    difficulty.lastRetargetTime = 1634741900;
    difficulty.lastSavedTime = 1634741980;
    difficulty.handleDifficulty(client);
    expect(difficulty.lastRetargetTime).toBe(1634742080);
    expect(difficulty.lastSavedTime).toBe(1634742080);
  });

  test('Test client difficulty management [9]', () => {
    MockDate.set(1634742080841);
    const difficulty = new Difficulty(configCopy);
    client.difficulty = 512;
    difficulty.lastRetargetTime = 1634741900;
    difficulty.lastSavedTime = 1634741980;
    difficulty.queue = new Array(24).fill(0);
    difficulty.handleDifficulty(client);
    expect(difficulty.lastRetargetTime).toBe(1634742080);
    expect(difficulty.lastSavedTime).toBe(1634742080);
  });
});
