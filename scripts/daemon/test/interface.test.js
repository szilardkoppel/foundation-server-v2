/*
 *
 * Interface (Updated)
 *
 */

const nock = require('nock');
const Interface = require('../main/interface');

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
const daemon = new Interface(daemons);
const multiDaemon = new Interface(multiDaemons);

////////////////////////////////////////////////////////////////////////////////

describe('Test interface functionality', () => {

  test('Test interface initialization [1]', (done) => {
    nock('http://127.0.0.1:8332')
      .post('/', body => body.method === 'getpeerinfo')
      .reply(200, JSON.stringify({
        error: null,
        result: null,
        instance: 'nocktest',
      }));
    daemon.checkInitialized((response) => {
      expect(response).toBe(true);
      nock.cleanAll();
      done();
    });
  });

  test('Test interface initialization [2]', (done) => {
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
    multiDaemon.checkInitialized((response) => {
      expect(response).toBe(true);
      nock.cleanAll();
      done();
    });
  });

  test('Test interface initialization [3]', (done) => {
    daemon.on('failed', () => done());
    daemon.checkInitialized((response) => {
      expect(response).toBe(false);
    });
  });

  test('Test interface commands [1]', (done) => {
    nock('http://127.0.0.1:8332')
      .post('/', body => body.method === 'getblocktemplate')
      .reply(200, JSON.stringify({
        error: null,
        result: null,
        instance: 'nocktest',
      }));
    const requests = [['getblocktemplate', []]];
    const expected = [{'data': '{"error":null,"result":null,"instance":"nocktest"}', 'error': false, 'instance': '127.0.0.1', 'result': null}];
    daemon.sendCommands(requests, false, (response) => {
      expect(response).toStrictEqual(expected);
      nock.cleanAll();
      done();
    });
  });

  test('Test interface commands [2]', (done) => {
    nock('http://127.0.0.1:8332')
      .post('/', body => body.method === 'getblocktemplate')
      .reply(401, JSON.stringify({
        error: true,
        result: null,
        instance: 'nocktest',
      }));
    const requests = [['getblocktemplate', []]];
    const expected = [{'data': '{"error":true,"result":null,"instance":"nocktest"}', 'error': true, 'instance': '127.0.0.1', 'result': 'Unauthorized RPC access. Invalid RPC username or password'}];
    daemon.sendCommands(requests, false, (response) => {
      expect(response).toStrictEqual(expected);
      nock.cleanAll();
      done();
    });
  });

  test('Test interface commands [3]', (done) => {
    nock('http://127.0.0.1:8332')
      .post('/').reply(200, JSON.stringify([
        { id: 'nocktest', error: null, result: null },
        { id: 'nocktest', error: null, result: null },
      ]));
    const requests = [['getblocktemplate', []], ['getpeerinfo', []]];
    const expected = [[{'error': false, 'result': null, 'instance': '127.0.0.1', 'data': '{"id":"nocktest","error":null,"result":null}'},{'error': false, 'result': null, 'instance': '127.0.0.1', 'data': '{"id":"nocktest","error":null,"result":null}'}]];
    daemon.sendCommands(requests, false, (response) => {
      expect(response).toStrictEqual(expected);
      nock.cleanAll();
      done();
    });
  });

  test('Test interface commands [4]', (done) => {
    nock('http://127.0.0.1:8332')
      .post('/').reply(200, JSON.stringify([
        { id: 'nocktest', error: null, result: null },
        { id: 'nocktest', error: null, result: null },
      ]));
    nock('http://127.0.0.2:8332')
      .post('/').reply(200, JSON.stringify([
        { id: 'nocktest', error: null, result: null },
        { id: 'nocktest', error: null, result: null },
      ]));
    const requests = [['getblocktemplate', []], ['getpeerinfo', []]];
    const expected = [
      [{'error': false, 'result': null, 'instance': '127.0.0.1', 'data': '{"id":"nocktest","error":null,"result":null}'},{'error': false, 'result': null, 'instance': '127.0.0.1', 'data': '{"id":"nocktest","error":null,"result":null}'}],
      [{'error': false, 'result': null, 'instance': '127.0.0.2', 'data': '{"id":"nocktest","error":null,"result":null}'},{'error': false, 'result': null, 'instance': '127.0.0.2', 'data': '{"id":"nocktest","error":null,"result":null}'}]];
    multiDaemon.sendCommands(requests, false, (response) => {
      expect(response).toStrictEqual(expected);
      nock.cleanAll();
      done();
    });
  });

  test('Test interface commands [5]', (done) => {
    nock('http://127.0.0.1:8332')
      .post('/').reply(200, JSON.stringify([
        { id: 'nocktest', error: null, result: null },
        { id: 'nocktest', error: null, result: null },
      ]));
    const requests = [['getblocktemplate', []], ['getpeerinfo', []]];
    const expected = [{'error': false, 'result': null, 'instance': '127.0.0.1', 'data': '{"id":"nocktest","error":null,"result":null}'},{'error': false, 'result': null, 'instance': '127.0.0.1', 'data': '{"id":"nocktest","error":null,"result":null}'}];
    daemon.sendCommands(requests, true, (response) => {
      expect(response).toStrictEqual(expected);
      nock.cleanAll();
      done();
    });
  });

  test('Test interface commands [6]', (done) => {
    nock('http://127.0.0.1:8332')
      .post('/').reply(200, JSON.stringify([
        { id: 'nocktest', error: null, result: null },
        { id: 'nocktest', error: null, result: null },
      ]));
    const requests = [['getblocktemplate', []], ['getpeerinfo', []]];
    const expected = [{'error': false, 'result': null, 'instance': '127.0.0.1', 'data': '{"id":"nocktest","error":null,"result":null}'},{'error': false, 'result': null, 'instance': '127.0.0.1', 'data': '{"id":"nocktest","error":null,"result":null}'}];
    multiDaemon.sendCommands(requests, true, (response) => {
      expect(response).toStrictEqual(expected);
      nock.cleanAll();
      done();
    });
  });

  test('Test interface commands [7]', (done) => {
    const expected = {'data': null, 'error': true, 'instance': null, 'result': 'No commands passed to daemon'};
    daemon.sendCommands([], false, (response) => {
      expect(response).toStrictEqual(expected);
      nock.cleanAll();
      done();
    });
  });

  test('Test interface commands [8]', (done) => {
    nock('http://127.0.0.1:8332')
      .post('/', body => body.method === 'getblocktemplate')
      .reply(200, null);
    const requests = [['getblocktemplate', []]];
    const expected = [{'data': 'null', 'error': true, 'instance': '127.0.0.1', 'result': 'Could not parse RPC data from daemon response' }];
    daemon.sendCommands(requests, false, (response) => {
      expect(response).toStrictEqual(expected);
      nock.cleanAll();
      done();
    });
  });

  test('Test interface commands [9]', (done) => {
    nock('http://127.0.0.1:8332')
      .post('/', body => body.method === 'getblocktemplate')
      .reply(200, 'blajahahge');
    const requests = [['getblocktemplate', []]];
    const expected = [{'data': 'blajahahge', 'error': true, 'instance': '127.0.0.1', 'result': 'Could not parse RPC data from daemon response' }];
    daemon.sendCommands(requests, false, (response) => {
      expect(response).toStrictEqual(expected);
      nock.cleanAll();
      done();
    });
  });

  test('Test interface commands [10]', (done) => {
    const requests = [['getblocktemplate', []]];
    const expected = {'data': null, 'error': true, 'instance': '127.0.0.1', 'result': 'connect ECONNREFUSED 127.0.0.1:8332'};
    daemon.sendCommands(requests, true, (response) => {
      expect(response).toStrictEqual(expected);
      nock.cleanAll();
      done();
    });
  });
});
