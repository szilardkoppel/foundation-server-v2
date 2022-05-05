/*
 *
 * Client (Updated)
 *
 */

const Client = require('../main/client');
const events = require('events');

////////////////////////////////////////////////////////////////////////////////

function mockSocket() {
  const socket = new events.EventEmitter();
  socket.remoteAddress = '127.0.0.1',
  socket.destroy = () => {
    socket.emit('log', 'destroyed');
  };
  socket.setEncoding = () => {};
  socket.setKeepAlive = () => {};
  socket.write = (data) => {
    socket.emit('log', data);
  };
  return socket;
}

////////////////////////////////////////////////////////////////////////////////

describe('Test client functionality', () => {

  test('Test initialization of stratum client', () => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    expect(typeof client).toBe('object');
    expect(typeof client.handleAuthorize).toBe('function');
    expect(typeof client.handleSubmit).toBe('function');
  });

  test('Test client main setup', (done) => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.on('checkBan', () => done());
    client.setupClient();
  });

  test('Test client main events [1]', (done) => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.setupClient();
    client.on('socketDisconnect', () => done());
    client.socket.emit('close');
  });

  test('Test client main events [2]', (done) => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.setupClient();
    client.on('socketError', (error) => {
      expect(error).toBe('test');
      done();
    });
    client.socket.emit('error', 'test');
  });

  test('Test client main events [3]', (done) => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.setupClient();
    client.socket.on('log', () => done());
    client.socket.emit('data', '{"method":"mining.extranonce.subscribe"}\n');
  });

  test('Test client main events [4]', (done) => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.setupClient();
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('destroyed');
      done();
    });
    client.socket.emit('data', 'bad\n');
  });

  test('Test client main events [5]', (done) => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.setupClient();
    client.socket.on('log', () => done());
    client.socket.emit('data', '{"method":"mining.extranonce.subscribe"}\n{"method":"min');
  });

  test('Test client main events [6]', () => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.setupClient();
    client.socket.emit('data', '{"method":"mining.extrano');
  });

  test('Test client main events [7]', (done) => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.setupClient();
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('destroyed');
      done();
    });
    client.socket.emit('data', 'test'.repeat(10000));
  });

  test('Test client socket writing', (done) => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.socket.on('log', () => done());
    client.sendJson({ id: 'test' });
  });

  test('Test client label writing [1]', () => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    const label = client.sendLabel();
    expect(label).toBe('(unauthorized) [127.0.0.1]');
  });

  test('Test client label writing [2]', () => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.addrPrimary = 'test';
    const label = client.sendLabel();
    expect(label).toBe('test [127.0.0.1]');
  });

  test('Test client difficulty queueing [1]', () => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.enqueueDifficulty(8);
    expect(client.pendingDifficulty).toBe(8);
  });

  test('Test client difficulty queueing [2]', () => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.staticDifficulty = true;
    client.enqueueDifficulty(8);
    expect(client.pendingDifficulty).toBe(null);
  });

  test('Test client name validation [1]', () => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    expect(client.validateName('test')).toStrictEqual(['test', null]);
  });

  test('Test client name validation [2]', () => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    expect(client.validateName('')).toStrictEqual(['', null]);
  });

  test('Test client name validation [3]', () => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    expect(client.validateName('example!@#$%^&')).toStrictEqual(['example', null]);
  });

  test('Test client name validation [4]', () => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    expect(client.validateName('test,test')).toStrictEqual(['test', 'test']);
  });

  test('Test client flag validation [1]', () => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    expect(client.validatePassword('d=100')).toStrictEqual({ difficulty: 100 });
  });

  test('Test client flag validation [2]', () => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    expect(client.validatePassword('d=10.s0')).toStrictEqual({});
  });

  test('Test client flag validation [3]', () => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    expect(client.validatePassword('')).toStrictEqual({});
  });

  test('Test client message validation [1]', (done) => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('null\n[[["mining.set_difficulty",null],["mining.notify",null]],"extraNonce1","extraNonce2Size"]\nnull\n');
      done();
    });
    client.on('subscription', (params, callback) => callback(null, 'extraNonce1', 'extraNonce2Size'));
    client.validateMessages({ id: null, method: 'mining.subscribe' });
  });

  test('Test client message validation [2]', (done) => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('null\nnull\ntrue\n');
      done();
    });
    client.on('subscription', (params, callback) => callback(true, null, null));
    client.validateMessages({ id: null, method: 'mining.subscribe' });
  });

  test('Test client message validation [3]', (done) => {
    const socket = { socket: mockSocket(), algorithm: 'kawpow' };
    const client = new Client(socket);
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('null\n[null,"extraNonce1"]\nnull\n');
      done();
    });
    client.on('subscription', (params, callback) => callback(null, 'extraNonce1', 'extraNonce1'));
    client.validateMessages({ id: null, method: 'mining.subscribe' });
  });

  test('Test client message validation [4]', (done) => {
    const socket = { socket: mockSocket(), algorithm: 'kawpow' };
    const client = new Client(socket);
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('null\nnull\ntrue\n');
      done();
    });
    client.on('subscription', (params, callback) => callback(true, null, null));
    client.validateMessages({ id: null, method: 'mining.subscribe' });
  });

  test('Test client message validation [5]', (done) => {
    const output = { error: null, authorized: true, disconnect: false };
    const socket = { socket: mockSocket(), authorizeFn: (data, callback) => callback(output) };
    const client = new Client(socket);
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('null\ntrue\nnull\n');
      done();
    });
    client.validateMessages({ id: null, method: 'mining.authorize', params: ['username', 'password'] });
  });

  test('Test client message validation [6]', (done) => {
    const output = { error: null, authorized: false, disconnect: true };
    const socket = { socket: mockSocket(), authorizeFn: (data, callback) => callback(output) };
    const client = new Client(socket);
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('destroyed');
      done();
    });
    client.validateMessages({ id: null, method: 'mining.authorize', params: ['username', 'password'] });
  });

  test('Test client message validation [7]', (done) => {
    const output = { error: null, authorized: true, disconnect: false };
    const socket = { socket: mockSocket(), authorizeFn: (data, callback) => callback(output) };
    const client = new Client(socket);
    client.socket.on('log', (text) => {
      expect(client.pendingDifficulty).toBe(500);
      expect(client.staticDifficulty).toBe(true);
      expect(text).toStrictEqual('null\ntrue\nnull\n');
      done();
    });
    client.validateMessages({ id: null, method: 'mining.authorize', params: ['username', 'd=500'] });
  });

  test('Test client message validation [8]', (done) => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('null\n{"version-rolling":false}\nnull\n');
      done();
    });
    client.validateMessages({ id: null, method: 'mining.configure' });
    expect(client.asicboost).toBe(false);
    expect(client.versionMask).toBe('00000000');
  });

  test('Test client message validation [9]', (done) => {
    const socket = { socket: mockSocket(), asicboost: true };
    const client = new Client(socket);
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('null\n{"version-rolling":true,"version-rolling.mask":"1fffe000"}\nnull\n');
      done();
    });
    client.validateMessages({ id: null, method: 'mining.configure' });
    expect(client.asicboost).toBe(true);
    expect(client.versionMask).toBe('1fffe000');
  });

  test('Test client message validation [10]', () => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.validateMessages({ id: null, method: 'mining.multi_version', params: [1] });
    expect(client.asicboost).toBe(false);
    expect(client.versionMask).toBe('00000000');
  });

  test('Test client message validation [11]', () => {
    const socket = { socket: mockSocket(), asicboost: true };
    const client = new Client(socket);
    client.validateMessages({ id: null, method: 'mining.multi_version', params: [1] });
    expect(client.asicboost).toBe(false);
    expect(client.versionMask).toBe('00000000');
  });

  test('Test client message validation [12]', () => {
    const socket = { socket: mockSocket(), asicboost: true };
    const client = new Client(socket);
    client.validateMessages({ id: null, method: 'mining.multi_version', params: [4] });
    expect(client.asicboost).toBe(true);
    expect(client.versionMask).toBe('1fffe000');
  });

  test('Test client message validation [13]', (done) => {
    const socket = { socket: mockSocket(), banning: { checkThreshold: 500 }};
    const client = new Client(socket);
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('null\nnull\n[24,"unauthorized worker",null]\n');
      done();
    });
    client.validateMessages({ id: null, method: 'mining.submit', params: ['worker', 'password'] });
    expect(client.shares.invalid).toBe(1);
  });

  test('Test client message validation [14]', (done) => {
    const socket = { socket: mockSocket(), banning: { checkThreshold: 500 }};
    const client = new Client(socket);
    client.authorized = true;
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('null\nnull\n[25,"not subscribed",null]\n');
      done();
    });
    client.validateMessages({ id: null, method: 'mining.submit', params: ['worker', 'password'] });
    expect(client.shares.invalid).toBe(1);
  });

  test('Test client message validation [15]', (done) => {
    const socket = { socket: mockSocket(), banning: { checkThreshold: 500 }};
    const client = new Client(socket);
    client.authorized = true;
    client.extraNonce1 = 'test';
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('null\ntrue\nnull\n');
      done();
    });
    client.on('submit', (params, callback) => callback(null, true));
    client.validateMessages({ id: null, method: 'mining.submit', params: ['worker', 'password'] });
    expect(client.addrPrimary).toBe('worker');
    expect(client.shares.valid).toBe(1);
  });

  test('Test client message validation [16]', (done) => {
    const socket = { socket: mockSocket(), banning: { checkThreshold: 500 }};
    const client = new Client(socket);
    client.addrPrimary = 'worker';
    client.authorized = true;
    client.extraNonce1 = 'test';
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('null\ntrue\nnull\n');
      done();
    });
    client.on('submit', (params, callback) => callback(null, true));
    client.validateMessages({ id: null, method: 'mining.submit', params: ['worker', 'password'] });
    expect(client.shares.valid).toBe(1);
  });

  test('Test client message validation [17]', (done) => {
    const socket = { socket: mockSocket(), banning: { checkThreshold: 5 }};
    const client = new Client(socket);
    client.authorized = true;
    client.extraNonce1 = 'test';
    client.shares = { valid: 0, invalid: 20 };
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('destroyed');
      done();
    });
    client.on('submit', (params, callback) => callback(true, null));
    client.validateMessages({ id: null, method: 'mining.submit', params: ['worker', 'password'] });
  });

  test('Test client message validation [18]', (done) => {
    const socket = { socket: mockSocket(), banning: { checkThreshold: 5, invalidPercent: 50 }};
    const client = new Client(socket);
    client.authorized = true;
    client.extraNonce1 = 'test';
    client.shares = { valid: 20, invalid: 0 };
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('null\ntrue\nnull\n');
      done();
    });
    client.on('submit', (params, callback) => callback(null, true));
    client.validateMessages({ id: null, method: 'mining.submit', params: ['worker', 'password'] });
    expect(client.shares.valid).toBe(0);
  });

  test('Test client message validation [19]', (done) => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('null\n[]\n[20,"Not supported.",null]\n');
      done();
    });
    client.validateMessages({ id: null, method: 'mining.get_transactions' });
  });

  test('Test client message validation [20]', (done) => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('null\nfalse\n[20,"Not supported.",null]\n');
      done();
    });
    client.validateMessages({ id: null, method: 'mining.extranonce.subscribe' });
  });

  test('Test client message validation [21]', (done) => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.on('unknownStratumMethod', () => done());
    client.validateMessages({ id: null, method: 'mining.unknown' });
  });

  test('Test client difficulty updates [1]', (done) => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('null\n"mining.set_difficulty"\n[8]\n');
      done();
    });
    expect(client.broadcastDifficulty(0)).toBe(false);
    expect(client.broadcastDifficulty(8)).toBe(true);
  });

  test('Test client difficulty updates [2]', (done) => {
    const socket = { socket: mockSocket(), algorithm: 'kawpow' };
    const client = new Client(socket);
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('null\n"mining.set_target"\n["000000001fe00000000000000000000000000000000000000000000000000000"]\n');
      done();
    });
    expect(client.broadcastDifficulty(0)).toBe(false);
    expect(client.broadcastDifficulty(8)).toBe(true);
  });

  test('Test client job updates [1]', (done) => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('null\n"mining.notify"\n[0,0,0,0]\n');
      done();
    });
    client.broadcastMiningJob([0,0,0,0]);
  });

  test('Test client job updates [2]', (done) => {
    const socket = { socket: mockSocket(), connectionTimeout: 10 };
    const client = new Client(socket);
    client.activity = 0;
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('destroyed');
      done();
    });
    client.broadcastMiningJob([0,0,0,0]);
  });

  test('Test client job updates [3]', (done) => {
    const response = [];
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.pendingDifficulty = 8;
    client.socket.on('log', (text) => {
      response.push(text);
      if (response.length === 2) {
        expect(response[0]).toStrictEqual('null\n"mining.set_difficulty"\n[8]\n');
        expect(response[1]).toStrictEqual('null\n"mining.notify"\n[0,0,0,0]\n');
        done();
      }
    });
    client.broadcastMiningJob([0,0,0,0]);
  });

  test('Test client job updates [4]', (done) => {
    const socket = { socket: mockSocket() };
    const client = new Client(socket);
    client.pendingDifficulty = 0;
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('null\n"mining.notify"\n[0,0,0,0]\n');
      done();
    });
    client.broadcastMiningJob([0,0,0,0]);
  });

  test('Test client job updates [5]', (done) => {
    const socket = { socket: mockSocket(), algorithm: 'kawpow' };
    const client = new Client(socket);
    client.difficulty = 16;
    client.socket.on('log', (text) => {
      expect(text).toStrictEqual('null\n"mining.notify"\n[0,0,0,"000000000ff00000000000000000000000000000000000000000000000000000"]\n');
      done();
    });
    client.broadcastMiningJob([0,0,0,0]);
  });
});
