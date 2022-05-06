/*
 *
 * Network (Updated)
 *
 */

const MockDate = require('mockdate');
const Network = require('../main/network');
const Template = require('../main/template');
const events = require('events');

const rpcData = {
  'capabilities': [
    'proposal'
  ],
  'version': 536870912,
  'rules': [],
  'vbavailable': {},
  'vbrequired': 0,
  'previousblockhash': '9719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e2',
  'transactions': [{
    'data': '0100000001cba672d0bfdbcc441d171ef0723a191bf050932c6f8adc8a05b0cac2d1eb022f010000006c493046022100a23472410d8fd7eabf5c739bdbee5b6151ff31e10d5cb2b52abeebd5e9c06977022100c2cdde5c632eaaa1029dff2640158aaf9aab73fa021ed4a48b52b33ba416351801210212ee0e9c79a72d88db7af3fed18ae2b7ca48eaed995d9293ae0f94967a70cdf6ffffffff02905f0100000000001976a91482db4e03886ee1225fefaac3ee4f6738eb50df9188ac00f8a093000000001976a914c94f5142dd7e35f5645735788d0fe1343baf146288ac00000000',
    'hash': '7c90a5087ac4d5b9361d47655812c89b4ad0dee6ecd5e08814d00ce7385aa317',
    'depends': [],
    'fee': 10000,
    'sigops': 2
  }],
  'coinbaseaux': {
    'flags': ''
  },
  'coinbasevalue': 5000000000,
  'longpollid': '9719aefb83ef6583bd4c808bbe7d49b629a60b375fc6e36bee039530bc7727e22',
  'target': '00000ffff0000000000000000000000000000000000000000000000000000000',
  'mintime': 1614044921,
  'mutable': [
    'time',
    'transactions',
    'prevblock'
  ],
  'noncerange': '00000000ffffffff',
  'sigoplimit': 20000,
  'sizelimit': 1000000,
  'curtime': 1614201893,
  'bits': '1e0ffff0',
  'height': 1,
  'default_witness_commitment': '6a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf9'
};

const config = {
  'banning': {
    'time': 600,
    'invalidPercent': 0.5,
    'checkThreshold': 5,
    'purgeInterval': 300
  },
  'ports': [{
    'port': 3001,
    'enabled': true,
    'difficulty': {
      'initial': 32,
      'minimum': 8,
      'maximum': 512,
      'targetTime': 15,
      'retargetTime': 90,
      'variance': 0.3
    }
  }],
  'settings': {
    'connectionTimeout': 600,
    'jobRebroadcastTimeout': 60,
  },
  'primary': {
    'address': 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    'coin': {
      'name': 'Bitcoin',
      'symbol': 'BTC',
      'asicboost': true,
      'getinfo': false,
      'segwit': true,
      'rewards': {},
      'algorithms': {
        'mining': 'sha256d',
        'block': 'sha256d',
        'coinbase': 'sha256d',
      },
      'mainnet': {
        'bech32': 'bc',
        'bip32': {
          'public': 0x0488b21e,
          'private': 0x0488ade4,
        },
        'peerMagic': 'f9beb4d9',
        'pubKeyHash': 0x00,
        'scriptHash': 0x05,
        'wif': 0x80,
        'coin': 'btc',
      },
      'testnet': {
        'bech32': 'tb',
        'bip32': {
          'public': 0x043587cf,
          'private': 0x04358394,
        },
        'peerMagic': '0b110907',
        'pubKeyHash': 0x6f,
        'scriptHash': 0xc4,
        'wif': 0xef,
        'coin': 'btc',
      }
    },
    'daemons': [{
      'host': '127.0.0.1',
      'port': 8332,
      'user': '',
      'password': ''
    }],
    'recipients': [{
      'address': '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
      'percentage': 0.05,
    }],
  },
};

const configMain = {
  'tls': {
    'rootCA': 'rootCA.crt',
    'serverKey': 'server.key',
    'serverCert': 'server.crt',
  },
};

const jobId = 1;
const extraNonce = Buffer.from('f000000ff111111f', 'hex');

////////////////////////////////////////////////////////////////////////////////

function mockSocket() {
  const socket = new events.EventEmitter();
  socket.remoteAddress = '127.0.0.1',
  socket.destroy = () => {};
  socket.setEncoding = () => {};
  socket.setKeepAlive = () => {};
  socket.write = (data) => {
    socket.emit('log', data);
  };
  return socket;
}

function mockClient() {
  const socket = mockSocket();
  const client = new events.EventEmitter();
  client.previousDifficulty = 0;
  client.difficulty = 1,
  client.extraNonce1 = 0,
  client.socket = socket;
  client.socket.localPort = 3001;
  client.getLabel = () => {
    return 'client [example]';
  };
  client.sendDifficulty = () => {};
  client.sendMiningJob = () => {};
  return client;
}

////////////////////////////////////////////////////////////////////////////////

describe('Test network functionality', () => {

  let configCopy, configMainCopy, rpcDataCopy;
  beforeEach(() => {
    configCopy = JSON.parse(JSON.stringify(config));
    configMainCopy = JSON.parse(JSON.stringify(configMain));
    rpcDataCopy = JSON.parse(JSON.stringify(rpcData));
  });

  test('Test initialization of stratum network', (done) => {
    const network = new Network(configCopy, configMainCopy, () => {});
    expect(typeof network).toBe('object');
    network.on('stopped', () => done());
    network.stopNetwork();
  });

  test('Test network banning capabilities [1]', (done) => {
    const network = new Network(configCopy, configMainCopy, () => {});
    const client = mockClient();
    client.on('kickedClient', timeLeft => {
      network.on('stopped', () => done());
      expect(timeLeft >= 0).toBeTruthy();
      network.stopNetwork();
    });
    network.bannedIPs[client.socket.remoteAddress] = Date.now();
    network.checkBan(client);
  });

  test('Test network banning capabilities [2]', (done) => {
    configCopy.banning.time = -1;
    const network = new Network(configCopy, configMainCopy, () => {});
    const client = mockClient();
    client.on('forgaveClient', () => {
      network.on('stopped', () => done());
      network.stopNetwork();
    });
    network.bannedIPs[client.socket.remoteAddress] = Date.now();
    network.checkBan(client);
  });

  test('Test network job broadcasting', (done) => {
    configCopy.settings.connectionTimeout = -1;
    const network = new Network(configCopy, configMainCopy, () => {});
    const template = new Template(configCopy, rpcDataCopy, jobId.toString(16), extraNonce, null);
    const socket = mockSocket();
    network.handleClient(socket);
    const client = network.stratumClients['deadbeefcafebabe0100000000000000'];
    client.on('socketTimeout', (timeout) => {
      network.on('stopped', () => done());
      expect(timeout).toBe('The last submitted share was 0 seconds ago');
      network.stopNetwork();
    });
    network.broadcastMiningJobs(template, true);
  });

  test('Test network client behavior [1]', (done) => {
    MockDate.set(1634742080841);
    const network = new Network(configCopy, configMainCopy, () => {});
    const socket = mockSocket();
    network.handleClient(socket);
    const client = network.stratumClients['deadbeefcafebabe0100000000000000'];
    network.on('clientBanned', () => {
      network.on('stopped', () => done());
      expect(Object.keys(network.bannedIPs).length).toBe(1);
      expect(network.bannedIPs['127.0.0.1']).toBe(1634742080841);
      network.stopNetwork();
    });
    client.emit('triggerBan');
  });

  test('Test network client behavior [1]', (done) => {
    MockDate.set(1634742080841);
    const network = new Network(configCopy, configMainCopy, () => {});
    const socket = mockSocket();
    network.handleClient(socket);
    const client = network.stratumClients['deadbeefcafebabe0100000000000000'];
    network.on('clientDisconnected', () => {
      network.on('stopped', () => done());
      expect(Object.keys(network.stratumClients).length).toBe(0);
      network.stopNetwork();
    });
    expect(Object.keys(network.stratumClients).length).toBe(1);
    client.emit('socketDisconnect');
  });
});
