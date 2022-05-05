/*
 *
 * Daemon (Updated)
 *
 */

const MockDate = require('mockdate');
const Daemon = require('../main/daemon');
const nock = require('nock');

const config = {
  'settings': {
    'cacheInterval': 1000,
    'cacheRemovalInterval': 5000,
  }
};

const daemons = [{
  'host': '127.0.0.1',
  'port': '8332',
  'username': 'foundation',
  'password': 'foundation'
}];

const multiDaemons = [{
  'host': '127.0.0.1',
  'port': '8332',
  'username': 'foundation',
  'password': 'foundation'
}, {
  'host': '127.0.0.2',
  'port': '8332',
  'username': 'foundation',
  'password': 'foundation'
}];

nock.disableNetConnect();
nock.enableNetConnect('127.0.0.1');

////////////////////////////////////////////////////////////////////////////////

describe('Test daemon functionality', () => {

  let configCopy, daemonsCopy, multiDaemonsCopy;
  beforeEach(() => {
    configCopy = JSON.parse(JSON.stringify(config));
    daemonsCopy = JSON.parse(JSON.stringify(daemons));
    multiDaemonsCopy = JSON.parse(JSON.stringify(multiDaemons));
  });

  test('Test daemon initialization [1]', (done) => {
    nock('http://127.0.0.1:8332')
      .post('/', body => body.method === 'getpeerinfo')
      .reply(200, JSON.stringify({
        error: null,
        result: null,
        instance: 'nocktest',
      }));
    const daemon = new Daemon(configCopy, daemonsCopy);
    daemon.checkInstances((error, response) => {
      expect(error).toBe(false);
      expect(response).toBe(null);
      nock.cleanAll();
      done();
    });
  });

  test('Test daemon initialization [2]', (done) => {
    nock('http://127.0.0.1:8332')
      .post('/', body => body.method === 'getpeerinfo')
      .reply(200, JSON.stringify({
        error: null,
        result: null,
        instance: 'nocktest',
      }));
    nock('http://127.0.0.2:8332')
      .post('/', body => body.method === 'getpeerinfo')
      .reply(200, JSON.stringify({
        error: null,
        result: null,
        instance: 'nocktest',
      }));
    const multiDaemon = new Daemon(configCopy, multiDaemonsCopy);
    multiDaemon.checkInstances((error, response) => {
      expect(error).toBe(false);
      expect(response).toBe(null);
      nock.cleanAll();
      done();
    });
  });

  test('Test daemon initialization [3]', (done) => {
    nock('http://127.0.0.1:8332')
      .post('/', body => body.method === 'getpeerinfo')
      .reply(401, JSON.stringify({
        error: null,
        result: null,
        instance: 'nocktest',
      }));
    const daemon = new Daemon(configCopy, daemonsCopy);
    daemon.checkInstances((error, response) => {
      expect(error).toBe(true);
      expect(response).toBe('[{"error":true,"result":"Unauthorized RPC access. Invalid RPC username or password","instance":"127.0.0.1","data":"{\\"error\\":null,\\"result\\":null,\\"instance\\":\\"nocktest\\"}"}]');
      nock.cleanAll();
      done();
    });
  });

  test('Test daemon commands [1]', (done) => {
    MockDate.set(1634742080841);
    nock('http://127.0.0.1:8332')
      .post('/', body => body.method === 'getblocktemplate')
      .reply(200, JSON.stringify({
        error: null,
        result: null,
        instance: 'nocktest',
      }));
    const daemon = new Daemon(configCopy, daemonsCopy);
    const requests = [['getblocktemplate', []]];
    const expected = [{'data': '{"error":null,"result":null,"instance":"nocktest"}', 'error': false, 'instance': '127.0.0.1', 'result': null}];
    daemon.checkInstances(() => {
      daemon.sendCommands(requests, true, false, (response) => {
        const serialized = JSON.stringify(requests);
        const current = daemon.responses[serialized];
        expect(response).toStrictEqual(expected);
        expect(current.time).toBe(1634742080841);
        expect(current.result).toStrictEqual(expected);
        nock.cleanAll();
        done();
      });
    });
  });

  test('Test daemon commands [2]', (done) => {
    MockDate.set(1634742080841);
    nock('http://127.0.0.1:8332')
      .post('/', body => body.method === 'getblocktemplate')
      .reply(200, JSON.stringify({
        error: null,
        result: null,
        instance: 'nocktest',
      }));
    const daemon = new Daemon(configCopy, daemonsCopy);
    const requests = [['getblocktemplate', []]];
    const expected = [{'data': '{"error":null,"result":null,"instance":"nocktest"}', 'error': false, 'instance': '127.0.0.1', 'result': null}];
    daemon.checkInstances(() => {
      daemon.sendCommands(requests, true, false, (response) => {
        const serialized = JSON.stringify(requests);
        const current = daemon.responses[serialized];
        expect(response).toStrictEqual(expected);
        expect(current.time).toBe(1634742080841);
        expect(current.result).toStrictEqual(expected);
        MockDate.set(1634743080841);
        daemon.checkCache();
        expect(Object.keys(daemon.responses).length).toBe(0);
        nock.cleanAll();
        done();
      });
    });
  });

  test('Test daemon commands [3]', (done) => {
    MockDate.set(1634742080841);
    nock('http://127.0.0.1:8332')
      .post('/', body => body.method === 'getblocktemplate')
      .reply(200, JSON.stringify({
        error: null,
        result: null,
        instance: 'nocktest',
      }));
    const daemon = new Daemon(configCopy, daemonsCopy);
    const requests = [['getblocktemplate', []]];
    const expected = [{'data': '{"error":null,"result":null,"instance":"nocktest"}', 'error': false, 'instance': '127.0.0.1', 'result': null}];
    daemon.checkInstances(() => {
      daemon.sendCommands(requests, true, false, (response1) => {
        const serialized = JSON.stringify(requests);
        const current1 = daemon.responses[serialized];
        expect(response1).toStrictEqual(expected);
        expect(current1.time).toBe(1634742080841);
        expect(current1.result).toStrictEqual(expected);
        daemon.sendCommands(requests, true, false, (response2) => {
          const current2 = daemon.responses[serialized];
          expect(response2).toStrictEqual(expected);
          expect(current2.time).toBe(1634742080841);
          expect(current2.result).toStrictEqual(expected);
        });
        nock.cleanAll();
        done();
      });
    });
  });

  test('Test daemon commands [4]', (done) => {
    MockDate.set(1634742080841);
    nock('http://127.0.0.1:8332')
      .post('/', body => body.method === 'getblocktemplate')
      .reply(200, JSON.stringify({
        error: null,
        result: null,
        instance: 'nocktest',
      }));
    const daemon = new Daemon({ settings: {} }, daemonsCopy);
    const requests = [['getblocktemplate', []]];
    const expected = [{'data': '{"error":null,"result":null,"instance":"nocktest"}', 'error': false, 'instance': '127.0.0.1', 'result': null}];
    daemon.checkInstances(() => {
      daemon.sendCommands(requests, true, false, (response) => {
        const serialized = JSON.stringify(requests);
        const current = daemon.responses[serialized];
        expect(response).toStrictEqual(expected);
        expect(current.time).toBe(1634742080841);
        expect(current.result).toStrictEqual(expected);
        nock.cleanAll();
        done();
      });
    });
  });
});
