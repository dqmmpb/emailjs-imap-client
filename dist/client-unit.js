"use strict";

var _client = _interopRequireWildcard(require("./client"));

var _emailjsImapHandler = require("emailjs-imap-handler");

var _common = require("./common");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

/* eslint-disable no-unused-expressions */
describe('browserbox unit tests', () => {
  var br;
  beforeEach(() => {
    const auth = {
      user: 'baldrian',
      pass: 'sleeper.de'
    };
    br = new _client.default('somehost', 1234, {
      auth,
      logLevel: _common.LOG_LEVEL_NONE
    });
    br.client.socket = {
      send: () => {},
      upgradeToSecure: () => {}
    };
  });
  describe('#_onIdle', () => {
    it('should call enterIdle', () => {
      sinon.stub(br, 'enterIdle');
      br._authenticated = true;
      br._enteredIdle = false;

      br._onIdle();

      expect(br.enterIdle.callCount).to.equal(1);
    });
    it('should not call enterIdle', () => {
      sinon.stub(br, 'enterIdle');
      br._enteredIdle = true;

      br._onIdle();

      expect(br.enterIdle.callCount).to.equal(0);
    });
  });
  describe('#connect', () => {
    beforeEach(() => {
      sinon.stub(br.client, 'connect');
      sinon.stub(br.client, 'close');
      sinon.stub(br, 'updateCapability');
      sinon.stub(br, 'upgradeConnection');
      sinon.stub(br, 'updateId');
      sinon.stub(br, 'login');
      sinon.stub(br, 'compressConnection');
    });
    it('should connect', () => {
      br.client.connect.returns(Promise.resolve());
      br.updateCapability.returns(Promise.resolve());
      br.upgradeConnection.returns(Promise.resolve());
      br.updateId.returns(Promise.resolve());
      br.login.returns(Promise.resolve());
      br.compressConnection.returns(Promise.resolve());
      setTimeout(() => br.client.onready(), 0);
      return br.connect().then(() => {
        expect(br.client.connect.calledOnce).to.be.true;
        expect(br.updateCapability.calledOnce).to.be.true;
        expect(br.upgradeConnection.calledOnce).to.be.true;
        expect(br.updateId.calledOnce).to.be.true;
        expect(br.login.calledOnce).to.be.true;
        expect(br.compressConnection.calledOnce).to.be.true;
      });
    });
    it('should fail to login', done => {
      br.client.connect.returns(Promise.resolve());
      br.updateCapability.returns(Promise.resolve());
      br.upgradeConnection.returns(Promise.resolve());
      br.updateId.returns(Promise.resolve());
      br.login.throws(new Error());
      setTimeout(() => br.client.onready(), 0);
      br.connect().catch(err => {
        expect(err).to.exist;
        expect(br.client.connect.calledOnce).to.be.true;
        expect(br.client.close.calledOnce).to.be.true;
        expect(br.updateCapability.calledOnce).to.be.true;
        expect(br.upgradeConnection.calledOnce).to.be.true;
        expect(br.updateId.calledOnce).to.be.true;
        expect(br.login.calledOnce).to.be.true;
        expect(br.compressConnection.called).to.be.false;
        done();
      });
    });
    it('should timeout', done => {
      br.client.connect.returns(Promise.resolve());
      br.timeoutConnection = 1;
      br.connect().catch(err => {
        expect(err).to.exist;
        expect(br.client.connect.calledOnce).to.be.true;
        expect(br.client.close.calledOnce).to.be.true;
        expect(br.updateCapability.called).to.be.false;
        expect(br.upgradeConnection.called).to.be.false;
        expect(br.updateId.called).to.be.false;
        expect(br.login.called).to.be.false;
        expect(br.compressConnection.called).to.be.false;
        done();
      });
    });
  });
  describe('#close', () => {
    it('should force-close', () => {
      sinon.stub(br.client, 'close').returns(Promise.resolve());
      return br.close().then(() => {
        expect(br._state).to.equal(_client.STATE_LOGOUT);
        expect(br.client.close.calledOnce).to.be.true;
      });
    });
  });
  describe('#exec', () => {
    beforeEach(() => {
      sinon.stub(br, 'breakIdle');
    });
    it('should send string command', () => {
      sinon.stub(br.client, 'enqueueCommand').returns(Promise.resolve({}));
      return br.exec('TEST').then(res => {
        expect(res).to.deep.equal({});
        expect(br.client.enqueueCommand.args[0][0]).to.equal('TEST');
      });
    });
    it('should update capability from response', () => {
      sinon.stub(br.client, 'enqueueCommand').returns(Promise.resolve({
        capability: ['A', 'B']
      }));
      return br.exec('TEST').then(res => {
        expect(res).to.deep.equal({
          capability: ['A', 'B']
        });
        expect(br._capability).to.deep.equal(['A', 'B']);
      });
    });
  });
  describe('#enterIdle', () => {
    it('should periodically send NOOP if IDLE not supported', done => {
      sinon.stub(br, 'exec').callsFake(command => {
        expect(command).to.equal('NOOP');
        done();
      });
      br._capability = [];
      br.timeoutNoop = 1;
      br.enterIdle();
    });
    it('should break IDLE after timeout', done => {
      sinon.stub(br.client, 'enqueueCommand');
      sinon.stub(br.client.socket, 'send').callsFake(payload => {
        expect(br.client.enqueueCommand.args[0][0].command).to.equal('IDLE');
        expect([].slice.call(new Uint8Array(payload))).to.deep.equal([0x44, 0x4f, 0x4e, 0x45, 0x0d, 0x0a]);
        done();
      });
      br._capability = ['IDLE'];
      br.timeoutIdle = 1;
      br.enterIdle();
    });
  });
  describe('#breakIdle', () => {
    it('should send DONE to socket', () => {
      sinon.stub(br.client.socket, 'send');
      br._enteredIdle = 'IDLE';
      br.breakIdle();
      expect([].slice.call(new Uint8Array(br.client.socket.send.args[0][0]))).to.deep.equal([0x44, 0x4f, 0x4e, 0x45, 0x0d, 0x0a]);
    });
  });
  describe('#upgradeConnection', () => {
    it('should do nothing if already secured', () => {
      br.client.secureMode = true;
      br._capability = ['starttls'];
      return br.upgradeConnection();
    });
    it('should do nothing if STARTTLS not available', () => {
      br.client.secureMode = false;
      br._capability = [];
      return br.upgradeConnection();
    });
    it('should run STARTTLS', () => {
      sinon.stub(br.client, 'upgrade');
      sinon.stub(br, 'exec').withArgs('STARTTLS').returns(Promise.resolve());
      sinon.stub(br, 'updateCapability').returns(Promise.resolve());
      br._capability = ['STARTTLS'];
      return br.upgradeConnection().then(() => {
        expect(br.client.upgrade.callCount).to.equal(1);
        expect(br._capability.length).to.equal(0);
      });
    });
  });
  describe('#updateCapability', () => {
    beforeEach(() => {
      sinon.stub(br, 'exec');
    });
    it('should do nothing if capability is set', () => {
      br._capability = ['abc'];
      return br.updateCapability();
    });
    it('should run CAPABILITY if capability not set', () => {
      br.exec.returns(Promise.resolve());
      br._capability = [];
      return br.updateCapability().then(() => {
        expect(br.exec.args[0][0]).to.equal('CAPABILITY');
      });
    });
    it('should force run CAPABILITY', () => {
      br.exec.returns(Promise.resolve());
      br._capability = ['abc'];
      return br.updateCapability(true).then(() => {
        expect(br.exec.args[0][0]).to.equal('CAPABILITY');
      });
    });
    it('should do nothing if connection is not yet upgraded', () => {
      br._capability = [];
      br.client.secureMode = false;
      br._requireTLS = true;
      br.updateCapability();
    });
  });
  describe('#listNamespaces', () => {
    beforeEach(() => {
      sinon.stub(br, 'exec');
    });
    it('should run NAMESPACE if supported', () => {
      br.exec.returns(Promise.resolve({
        payload: {
          NAMESPACE: [{
            attributes: [[[{
              type: 'STRING',
              value: 'INBOX.'
            }, {
              type: 'STRING',
              value: '.'
            }]], null, null]
          }]
        }
      }));
      br._capability = ['NAMESPACE'];
      return br.listNamespaces().then(namespaces => {
        expect(namespaces).to.deep.equal({
          personal: [{
            prefix: 'INBOX.',
            delimiter: '.'
          }],
          users: false,
          shared: false
        });
        expect(br.exec.args[0][0]).to.equal('NAMESPACE');
        expect(br.exec.args[0][1]).to.equal('NAMESPACE');
      });
    });
    it('should do nothing if not supported', () => {
      br._capability = [];
      return br.listNamespaces().then(namespaces => {
        expect(namespaces).to.be.false;
        expect(br.exec.callCount).to.equal(0);
      });
    });
  });
  describe('#compressConnection', () => {
    beforeEach(() => {
      sinon.stub(br, 'exec');
      sinon.stub(br.client, 'enableCompression');
    });
    it('should run COMPRESS=DEFLATE if supported', () => {
      br.exec.withArgs({
        command: 'COMPRESS',
        attributes: [{
          type: 'ATOM',
          value: 'DEFLATE'
        }]
      }).returns(Promise.resolve({}));
      br._enableCompression = true;
      br._capability = ['COMPRESS=DEFLATE'];
      return br.compressConnection().then(() => {
        expect(br.exec.callCount).to.equal(1);
        expect(br.client.enableCompression.callCount).to.equal(1);
      });
    });
    it('should do nothing if not supported', () => {
      br._capability = [];
      return br.compressConnection().then(() => {
        expect(br.exec.callCount).to.equal(0);
      });
    });
    it('should do nothing if not enabled', () => {
      br._enableCompression = false;
      br._capability = ['COMPRESS=DEFLATE'];
      return br.compressConnection().then(() => {
        expect(br.exec.callCount).to.equal(0);
      });
    });
  });
  describe('#login', () => {
    it('should call LOGIN', () => {
      sinon.stub(br, 'exec').returns(Promise.resolve({}));
      sinon.stub(br, 'updateCapability').returns(Promise.resolve(true));
      return br.login({
        user: 'u1',
        pass: 'p1'
      }).then(() => {
        expect(br.exec.callCount).to.equal(1);
        expect(br.exec.args[0][0]).to.deep.equal({
          command: 'login',
          attributes: [{
            type: 'STRING',
            value: 'u1'
          }, {
            type: 'STRING',
            value: 'p1',
            sensitive: true
          }]
        });
      });
    });
    it('should call XOAUTH2', () => {
      sinon.stub(br, 'exec').returns(Promise.resolve({}));
      sinon.stub(br, 'updateCapability').returns(Promise.resolve(true));
      br._capability = ['AUTH=XOAUTH2'];
      br.login({
        user: 'u1',
        xoauth2: 'abc'
      }).then(() => {
        expect(br.exec.callCount).to.equal(1);
        expect(br.exec.args[0][0]).to.deep.equal({
          command: 'AUTHENTICATE',
          attributes: [{
            type: 'ATOM',
            value: 'XOAUTH2'
          }, {
            type: 'ATOM',
            value: 'dXNlcj11MQFhdXRoPUJlYXJlciBhYmMBAQ==',
            sensitive: true
          }]
        });
      });
    });
  });
  describe('#updateId', () => {
    beforeEach(() => {
      sinon.stub(br, 'exec');
    });
    it('should not nothing if not supported', () => {
      br._capability = [];
      return br.updateId({
        a: 'b',
        c: 'd'
      }).then(() => {
        expect(br.serverId).to.be.false;
      });
    });
    it('should send NIL', () => {
      br.exec.withArgs({
        command: 'ID',
        attributes: [null]
      }).returns(Promise.resolve({
        payload: {
          ID: [{
            attributes: [null]
          }]
        }
      }));
      br._capability = ['ID'];
      return br.updateId(null).then(() => {
        expect(br.serverId).to.deep.equal({});
      });
    });
    it('should exhange ID values', () => {
      br.exec.withArgs({
        command: 'ID',
        attributes: [['ckey1', 'cval1', 'ckey2', 'cval2']]
      }).returns(Promise.resolve({
        payload: {
          ID: [{
            attributes: [[{
              value: 'skey1'
            }, {
              value: 'sval1'
            }, {
              value: 'skey2'
            }, {
              value: 'sval2'
            }]]
          }]
        }
      }));
      br._capability = ['ID'];
      return br.updateId({
        ckey1: 'cval1',
        ckey2: 'cval2'
      }).then(() => {
        expect(br.serverId).to.deep.equal({
          skey1: 'sval1',
          skey2: 'sval2'
        });
      });
    });
  });
  describe('#listMailboxes', () => {
    beforeEach(() => {
      sinon.stub(br, 'exec');
    });
    it('should call LIST and LSUB in sequence', () => {
      br.exec.withArgs({
        command: 'LIST',
        attributes: ['', '*']
      }).returns(Promise.resolve({
        payload: {
          LIST: [false]
        }
      }));
      br.exec.withArgs({
        command: 'LSUB',
        attributes: ['', '*']
      }).returns(Promise.resolve({
        payload: {
          LSUB: [false]
        }
      }));
      return br.listMailboxes().then(tree => {
        expect(tree).to.exist;
      });
    });
    it('should not die on NIL separators', () => {
      br.exec.withArgs({
        command: 'LIST',
        attributes: ['', '*']
      }).returns(Promise.resolve({
        payload: {
          LIST: [(0, _emailjsImapHandler.parser)((0, _common.toTypedArray)('* LIST (\\NoInferiors) NIL "INBOX"'))]
        }
      }));
      br.exec.withArgs({
        command: 'LSUB',
        attributes: ['', '*']
      }).returns(Promise.resolve({
        payload: {
          LSUB: [(0, _emailjsImapHandler.parser)((0, _common.toTypedArray)('* LSUB (\\NoInferiors) NIL "INBOX"'))]
        }
      }));
      return br.listMailboxes().then(tree => {
        expect(tree).to.exist;
      });
    });
  });
  describe('#createMailbox', () => {
    beforeEach(() => {
      sinon.stub(br, 'exec');
    });
    it('should call CREATE with a string payload', () => {
      // The spec allows unquoted ATOM-style syntax too, but for
      // simplicity we always generate a string even if it could be
      // expressed as an atom.
      br.exec.withArgs({
        command: 'CREATE',
        attributes: ['mailboxname']
      }).returns(Promise.resolve());
      return br.createMailbox('mailboxname').then(() => {
        expect(br.exec.callCount).to.equal(1);
      });
    });
    it('should call mutf7 encode the argument', () => {
      // From RFC 3501
      br.exec.withArgs({
        command: 'CREATE',
        attributes: ['~peter/mail/&U,BTFw-/&ZeVnLIqe-']
      }).returns(Promise.resolve());
      return br.createMailbox('~peter/mail/\u53f0\u5317/\u65e5\u672c\u8a9e').then(() => {
        expect(br.exec.callCount).to.equal(1);
      });
    });
    it('should treat an ALREADYEXISTS response as success', () => {
      var fakeErr = {
        code: 'ALREADYEXISTS'
      };
      br.exec.withArgs({
        command: 'CREATE',
        attributes: ['mailboxname']
      }).returns(Promise.reject(fakeErr));
      return br.createMailbox('mailboxname').then(() => {
        expect(br.exec.callCount).to.equal(1);
      });
    });
  });
  describe('#deleteMailbox', () => {
    beforeEach(() => {
      sinon.stub(br, 'exec');
    });
    it('should call DELETE with a string payload', () => {
      br.exec.withArgs({
        command: 'DELETE',
        attributes: ['mailboxname']
      }).returns(Promise.resolve());
      return br.deleteMailbox('mailboxname').then(() => {
        expect(br.exec.callCount).to.equal(1);
      });
    });
    it('should call mutf7 encode the argument', () => {
      // From RFC 3501
      br.exec.withArgs({
        command: 'DELETE',
        attributes: ['~peter/mail/&U,BTFw-/&ZeVnLIqe-']
      }).returns(Promise.resolve());
      return br.deleteMailbox('~peter/mail/\u53f0\u5317/\u65e5\u672c\u8a9e').then(() => {
        expect(br.exec.callCount).to.equal(1);
      });
    });
  });
  describe.skip('#listMessages', () => {
    beforeEach(() => {
      sinon.stub(br, 'exec');
      sinon.stub(br, '_buildFETCHCommand');
      sinon.stub(br, '_parseFETCH');
    });
    it('should call FETCH', () => {
      br.exec.returns(Promise.resolve('abc'));

      br._buildFETCHCommand.withArgs(['1:2', ['uid', 'flags'], {
        byUid: true
      }]).returns({});

      return br.listMessages('INBOX', '1:2', ['uid', 'flags'], {
        byUid: true
      }).then(() => {
        expect(br._buildFETCHCommand.callCount).to.equal(1);
        expect(br._parseFETCH.withArgs('abc').callCount).to.equal(1);
      });
    });
  });
  describe.skip('#search', () => {
    beforeEach(() => {
      sinon.stub(br, 'exec');
      sinon.stub(br, '_buildSEARCHCommand');
      sinon.stub(br, '_parseSEARCH');
    });
    it('should call SEARCH', () => {
      br.exec.returns(Promise.resolve('abc'));

      br._buildSEARCHCommand.withArgs({
        uid: 1
      }, {
        byUid: true
      }).returns({});

      return br.search('INBOX', {
        uid: 1
      }, {
        byUid: true
      }).then(() => {
        expect(br._buildSEARCHCommand.callCount).to.equal(1);
        expect(br.exec.callCount).to.equal(1);
        expect(br._parseSEARCH.withArgs('abc').callCount).to.equal(1);
      });
    });
  });
  describe('#upload', () => {
    beforeEach(() => {
      sinon.stub(br, 'exec');
    });
    it('should call APPEND with custom flag', () => {
      br.exec.returns(Promise.resolve());
      return br.upload('mailbox', 'this is a message', {
        flags: ['\\$MyFlag']
      }).then(() => {
        expect(br.exec.callCount).to.equal(1);
      });
    });
    it('should call APPEND w/o flags', () => {
      br.exec.returns(Promise.resolve());
      return br.upload('mailbox', 'this is a message').then(() => {
        expect(br.exec.callCount).to.equal(1);
      });
    });
  });
  describe.skip('#setFlags', () => {
    beforeEach(() => {
      sinon.stub(br, 'exec');
      sinon.stub(br, '_buildSTORECommand');
      sinon.stub(br, '_parseFETCH');
    });
    it('should call STORE', () => {
      br.exec.returns(Promise.resolve('abc'));

      br._buildSTORECommand.withArgs('1:2', 'FLAGS', ['\\Seen', '$MyFlag'], {
        byUid: true
      }).returns({});

      return br.setFlags('INBOX', '1:2', ['\\Seen', '$MyFlag'], {
        byUid: true
      }).then(() => {
        expect(br.exec.callCount).to.equal(1);
        expect(br._parseFETCH.withArgs('abc').callCount).to.equal(1);
      });
    });
  });
  describe.skip('#store', () => {
    beforeEach(() => {
      sinon.stub(br, 'exec');
      sinon.stub(br, '_buildSTORECommand');
      sinon.stub(br, '_parseFETCH');
    });
    it('should call STORE', () => {
      br.exec.returns(Promise.resolve('abc'));

      br._buildSTORECommand.withArgs('1:2', '+X-GM-LABELS', ['\\Sent', '\\Junk'], {
        byUid: true
      }).returns({});

      return br.store('INBOX', '1:2', '+X-GM-LABELS', ['\\Sent', '\\Junk'], {
        byUid: true
      }).then(() => {
        expect(br._buildSTORECommand.callCount).to.equal(1);
        expect(br.exec.callCount).to.equal(1);
        expect(br._parseFETCH.withArgs('abc').callCount).to.equal(1);
      });
    });
  });
  describe('#deleteMessages', () => {
    beforeEach(() => {
      sinon.stub(br, 'setFlags');
      sinon.stub(br, 'exec');
    });
    it('should call UID EXPUNGE', () => {
      br.exec.withArgs({
        command: 'UID EXPUNGE',
        attributes: [{
          type: 'sequence',
          value: '1:2'
        }]
      }).returns(Promise.resolve('abc'));
      br.setFlags.withArgs('INBOX', '1:2', {
        add: '\\Deleted'
      }).returns(Promise.resolve());
      br._capability = ['UIDPLUS'];
      return br.deleteMessages('INBOX', '1:2', {
        byUid: true
      }).then(() => {
        expect(br.exec.callCount).to.equal(1);
      });
    });
    it('should call EXPUNGE', () => {
      br.exec.withArgs('EXPUNGE').returns(Promise.resolve('abc'));
      br.setFlags.withArgs('INBOX', '1:2', {
        add: '\\Deleted'
      }).returns(Promise.resolve());
      br._capability = [];
      return br.deleteMessages('INBOX', '1:2', {
        byUid: true
      }).then(() => {
        expect(br.exec.callCount).to.equal(1);
      });
    });
  });
  describe('#copyMessages', () => {
    beforeEach(() => {
      sinon.stub(br, 'exec');
    });
    it('should call COPY', () => {
      br.exec.withArgs({
        command: 'UID COPY',
        attributes: [{
          type: 'sequence',
          value: '1:2'
        }, {
          type: 'atom',
          value: '[Gmail]/Trash'
        }]
      }).returns(Promise.resolve({
        humanReadable: 'abc'
      }));
      return br.copyMessages('INBOX', '1:2', '[Gmail]/Trash', {
        byUid: true
      }).then(response => {
        expect(response).to.equal('abc');
        expect(br.exec.callCount).to.equal(1);
      });
    });
  });
  describe('#moveMessages', () => {
    beforeEach(() => {
      sinon.stub(br, 'exec');
      sinon.stub(br, 'copyMessages');
      sinon.stub(br, 'deleteMessages');
    });
    it('should call MOVE if supported', () => {
      br.exec.withArgs({
        command: 'UID MOVE',
        attributes: [{
          type: 'sequence',
          value: '1:2'
        }, {
          type: 'atom',
          value: '[Gmail]/Trash'
        }]
      }, ['OK']).returns(Promise.resolve('abc'));
      br._capability = ['MOVE'];
      return br.moveMessages('INBOX', '1:2', '[Gmail]/Trash', {
        byUid: true
      }).then(() => {
        expect(br.exec.callCount).to.equal(1);
      });
    });
    it('should fallback to copy+expunge', () => {
      br.copyMessages.withArgs('INBOX', '1:2', '[Gmail]/Trash', {
        byUid: true
      }).returns(Promise.resolve());
      br.deleteMessages.withArgs('1:2', {
        byUid: true
      }).returns(Promise.resolve());
      br._capability = [];
      return br.moveMessages('INBOX', '1:2', '[Gmail]/Trash', {
        byUid: true
      }).then(() => {
        expect(br.deleteMessages.callCount).to.equal(1);
      });
    });
  });
  describe('#_shouldSelectMailbox', () => {
    it('should return true when ctx is undefined', () => {
      expect(br._shouldSelectMailbox('path')).to.be.true;
    });
    it('should return true when a different path is queued', () => {
      sinon.stub(br.client, 'getPreviouslyQueued').returns({
        request: {
          command: 'SELECT',
          attributes: [{
            type: 'STRING',
            value: 'queued path'
          }]
        }
      });
      expect(br._shouldSelectMailbox('path', {})).to.be.true;
    });
    it('should return false when the same path is queued', () => {
      sinon.stub(br.client, 'getPreviouslyQueued').returns({
        request: {
          command: 'SELECT',
          attributes: [{
            type: 'STRING',
            value: 'queued path'
          }]
        }
      });
      expect(br._shouldSelectMailbox('queued path', {})).to.be.false;
    });
  });
  describe('#selectMailbox', () => {
    const path = '[Gmail]/Trash';
    beforeEach(() => {
      sinon.stub(br, 'exec');
    });
    it('should run SELECT', () => {
      br.exec.withArgs({
        command: 'SELECT',
        attributes: [{
          type: 'STRING',
          value: path
        }]
      }).returns(Promise.resolve({
        code: 'READ-WRITE'
      }));
      return br.selectMailbox(path).then(() => {
        expect(br.exec.callCount).to.equal(1);
        expect(br._state).to.equal(_client.STATE_SELECTED);
      });
    });
    it('should run SELECT with CONDSTORE', () => {
      br.exec.withArgs({
        command: 'SELECT',
        attributes: [{
          type: 'STRING',
          value: path
        }, [{
          type: 'ATOM',
          value: 'CONDSTORE'
        }]]
      }).returns(Promise.resolve({
        code: 'READ-WRITE'
      }));
      br._capability = ['CONDSTORE'];
      return br.selectMailbox(path, {
        condstore: true
      }).then(() => {
        expect(br.exec.callCount).to.equal(1);
        expect(br._state).to.equal(_client.STATE_SELECTED);
      });
    });
    describe('should emit onselectmailbox before selectMailbox is resolved', () => {
      beforeEach(() => {
        br.exec.returns(Promise.resolve({
          code: 'READ-WRITE'
        }));
      });
      it('when it returns a promise', () => {
        var promiseResolved = false;

        br.onselectmailbox = () => new Promise(resolve => {
          resolve();
          promiseResolved = true;
        });

        var onselectmailboxSpy = sinon.spy(br, 'onselectmailbox');
        return br.selectMailbox(path).then(() => {
          expect(onselectmailboxSpy.withArgs(path).callCount).to.equal(1);
          expect(promiseResolved).to.equal(true);
        });
      });
      it('when it does not return a promise', () => {
        br.onselectmailbox = () => {};

        var onselectmailboxSpy = sinon.spy(br, 'onselectmailbox');
        return br.selectMailbox(path).then(() => {
          expect(onselectmailboxSpy.withArgs(path).callCount).to.equal(1);
        });
      });
    });
    it('should emit onclosemailbox', () => {
      let called = false;
      br.exec.returns(Promise.resolve('abc')).returns(Promise.resolve({
        code: 'READ-WRITE'
      }));

      br.onclosemailbox = path => {
        expect(path).to.equal('yyy');
        called = true;
      };

      br._selectedMailbox = 'yyy';
      return br.selectMailbox(path).then(() => {
        expect(called).to.be.true;
      });
    });
  });
  describe('#hasCapability', () => {
    it('should detect existing capability', () => {
      br._capability = ['ZZZ'];
      expect(br.hasCapability('zzz')).to.be.true;
    });
    it('should detect non existing capability', () => {
      br._capability = ['ZZZ'];
      expect(br.hasCapability('ooo')).to.be.false;
      expect(br.hasCapability()).to.be.false;
    });
  });
  describe('#_untaggedOkHandler', () => {
    it('should update capability if present', () => {
      br._untaggedOkHandler({
        capability: ['abc']
      }, () => {});

      expect(br._capability).to.deep.equal(['abc']);
    });
  });
  describe('#_untaggedCapabilityHandler', () => {
    it('should update capability', () => {
      br._untaggedCapabilityHandler({
        attributes: [{
          value: 'abc'
        }]
      }, () => {});

      expect(br._capability).to.deep.equal(['ABC']);
    });
  });
  describe('#_untaggedExistsHandler', () => {
    it('should emit onupdate', () => {
      br.onupdate = sinon.stub();
      br._selectedMailbox = 'FOO';

      br._untaggedExistsHandler({
        nr: 123
      }, () => {});

      expect(br.onupdate.withArgs('FOO', 'exists', 123).callCount).to.equal(1);
    });
  });
  describe('#_untaggedExpungeHandler', () => {
    it('should emit onupdate', () => {
      br.onupdate = sinon.stub();
      br._selectedMailbox = 'FOO';

      br._untaggedExpungeHandler({
        nr: 123
      }, () => {});

      expect(br.onupdate.withArgs('FOO', 'expunge', 123).callCount).to.equal(1);
    });
  });
  describe.skip('#_untaggedFetchHandler', () => {
    it('should emit onupdate', () => {
      br.onupdate = sinon.stub();
      sinon.stub(br, '_parseFETCH').returns('abc');
      br._selectedMailbox = 'FOO';

      br._untaggedFetchHandler({
        nr: 123
      }, () => {});

      expect(br.onupdate.withArgs('FOO', 'fetch', 'abc').callCount).to.equal(1);
      expect(br._parseFETCH.args[0][0]).to.deep.equal({
        payload: {
          FETCH: [{
            nr: 123
          }]
        }
      });
    });
  });
  describe('#_changeState', () => {
    it('should set the state value', () => {
      br._changeState(12345);

      expect(br._state).to.equal(12345);
    });
    it('should emit onclosemailbox if mailbox was closed', () => {
      br.onclosemailbox = sinon.stub();
      br._state = _client.STATE_SELECTED;
      br._selectedMailbox = 'aaa';

      br._changeState(12345);

      expect(br._selectedMailbox).to.be.false;
      expect(br.onclosemailbox.withArgs('aaa').callCount).to.equal(1);
    });
  });
  describe('#_ensurePath', () => {
    it('should create the path if not present', () => {
      var tree = {
        children: []
      };
      expect(br._ensurePath(tree, 'hello/world', '/')).to.deep.equal({
        name: 'world',
        delimiter: '/',
        path: 'hello/world',
        children: []
      });
      expect(tree).to.deep.equal({
        children: [{
          name: 'hello',
          delimiter: '/',
          path: 'hello',
          children: [{
            name: 'world',
            delimiter: '/',
            path: 'hello/world',
            children: []
          }]
        }]
      });
    });
    it('should return existing path if possible', () => {
      var tree = {
        children: [{
          name: 'hello',
          delimiter: '/',
          path: 'hello',
          children: [{
            name: 'world',
            delimiter: '/',
            path: 'hello/world',
            children: [],
            abc: 123
          }]
        }]
      };
      expect(br._ensurePath(tree, 'hello/world', '/')).to.deep.equal({
        name: 'world',
        delimiter: '/',
        path: 'hello/world',
        children: [],
        abc: 123
      });
    });
    it('should handle case insensitive Inbox', () => {
      var tree = {
        children: []
      };
      expect(br._ensurePath(tree, 'Inbox/world', '/')).to.deep.equal({
        name: 'world',
        delimiter: '/',
        path: 'Inbox/world',
        children: []
      });
      expect(br._ensurePath(tree, 'INBOX/worlds', '/')).to.deep.equal({
        name: 'worlds',
        delimiter: '/',
        path: 'INBOX/worlds',
        children: []
      });
      expect(tree).to.deep.equal({
        children: [{
          name: 'Inbox',
          delimiter: '/',
          path: 'Inbox',
          children: [{
            name: 'world',
            delimiter: '/',
            path: 'Inbox/world',
            children: []
          }, {
            name: 'worlds',
            delimiter: '/',
            path: 'INBOX/worlds',
            children: []
          }]
        }]
      });
    });
  });
  describe('untagged updates', () => {
    it('should receive information about untagged exists', done => {
      br.client._connectionReady = true;
      br._selectedMailbox = 'FOO';

      br.onupdate = (path, type, value) => {
        expect(path).to.equal('FOO');
        expect(type).to.equal('exists');
        expect(value).to.equal(123);
        done();
      };

      br.client._onData({
        /* * 123 EXISTS\r\n */
        data: new Uint8Array([42, 32, 49, 50, 51, 32, 69, 88, 73, 83, 84, 83, 13, 10]).buffer
      });
    });
    it('should receive information about untagged expunge', done => {
      br.client._connectionReady = true;
      br._selectedMailbox = 'FOO';

      br.onupdate = (path, type, value) => {
        expect(path).to.equal('FOO');
        expect(type).to.equal('expunge');
        expect(value).to.equal(456);
        done();
      };

      br.client._onData({
        /* * 456 EXPUNGE\r\n */
        data: new Uint8Array([42, 32, 52, 53, 54, 32, 69, 88, 80, 85, 78, 71, 69, 13, 10]).buffer
      });
    });
    it('should receive information about untagged fetch', done => {
      br.client._connectionReady = true;
      br._selectedMailbox = 'FOO';

      br.onupdate = (path, type, value) => {
        expect(path).to.equal('FOO');
        expect(type).to.equal('fetch');
        expect(value).to.deep.equal({
          '#': 123,
          'flags': ['\\Seen'],
          'modseq': '4'
        });
        done();
      };

      br.client._onData({
        /* * 123 FETCH (FLAGS (\\Seen) MODSEQ (4))\r\n */
        data: new Uint8Array([42, 32, 49, 50, 51, 32, 70, 69, 84, 67, 72, 32, 40, 70, 76, 65, 71, 83, 32, 40, 92, 83, 101, 101, 110, 41, 32, 77, 79, 68, 83, 69, 81, 32, 40, 52, 41, 41, 13, 10]).buffer
      });
    });
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jbGllbnQtdW5pdC5qcyJdLCJuYW1lcyI6WyJkZXNjcmliZSIsImJyIiwiYmVmb3JlRWFjaCIsImF1dGgiLCJ1c2VyIiwicGFzcyIsIkltYXBDbGllbnQiLCJsb2dMZXZlbCIsImNsaWVudCIsInNvY2tldCIsInNlbmQiLCJ1cGdyYWRlVG9TZWN1cmUiLCJpdCIsInNpbm9uIiwic3R1YiIsIl9hdXRoZW50aWNhdGVkIiwiX2VudGVyZWRJZGxlIiwiX29uSWRsZSIsImV4cGVjdCIsImVudGVySWRsZSIsImNhbGxDb3VudCIsInRvIiwiZXF1YWwiLCJjb25uZWN0IiwicmV0dXJucyIsIlByb21pc2UiLCJyZXNvbHZlIiwidXBkYXRlQ2FwYWJpbGl0eSIsInVwZ3JhZGVDb25uZWN0aW9uIiwidXBkYXRlSWQiLCJsb2dpbiIsImNvbXByZXNzQ29ubmVjdGlvbiIsInNldFRpbWVvdXQiLCJvbnJlYWR5IiwidGhlbiIsImNhbGxlZE9uY2UiLCJiZSIsInRydWUiLCJkb25lIiwidGhyb3dzIiwiRXJyb3IiLCJjYXRjaCIsImVyciIsImV4aXN0IiwiY2xvc2UiLCJjYWxsZWQiLCJmYWxzZSIsInRpbWVvdXRDb25uZWN0aW9uIiwiX3N0YXRlIiwiU1RBVEVfTE9HT1VUIiwiZXhlYyIsInJlcyIsImRlZXAiLCJlbnF1ZXVlQ29tbWFuZCIsImFyZ3MiLCJjYXBhYmlsaXR5IiwiX2NhcGFiaWxpdHkiLCJjYWxsc0Zha2UiLCJjb21tYW5kIiwidGltZW91dE5vb3AiLCJwYXlsb2FkIiwic2xpY2UiLCJjYWxsIiwiVWludDhBcnJheSIsInRpbWVvdXRJZGxlIiwiYnJlYWtJZGxlIiwic2VjdXJlTW9kZSIsIndpdGhBcmdzIiwidXBncmFkZSIsImxlbmd0aCIsIl9yZXF1aXJlVExTIiwiTkFNRVNQQUNFIiwiYXR0cmlidXRlcyIsInR5cGUiLCJ2YWx1ZSIsImxpc3ROYW1lc3BhY2VzIiwibmFtZXNwYWNlcyIsInBlcnNvbmFsIiwicHJlZml4IiwiZGVsaW1pdGVyIiwidXNlcnMiLCJzaGFyZWQiLCJfZW5hYmxlQ29tcHJlc3Npb24iLCJlbmFibGVDb21wcmVzc2lvbiIsInNlbnNpdGl2ZSIsInhvYXV0aDIiLCJhIiwiYyIsInNlcnZlcklkIiwiSUQiLCJja2V5MSIsImNrZXkyIiwic2tleTEiLCJza2V5MiIsIkxJU1QiLCJMU1VCIiwibGlzdE1haWxib3hlcyIsInRyZWUiLCJjcmVhdGVNYWlsYm94IiwiZmFrZUVyciIsImNvZGUiLCJyZWplY3QiLCJkZWxldGVNYWlsYm94Iiwic2tpcCIsIl9idWlsZEZFVENIQ29tbWFuZCIsImJ5VWlkIiwibGlzdE1lc3NhZ2VzIiwiX3BhcnNlRkVUQ0giLCJfYnVpbGRTRUFSQ0hDb21tYW5kIiwidWlkIiwic2VhcmNoIiwiX3BhcnNlU0VBUkNIIiwidXBsb2FkIiwiZmxhZ3MiLCJfYnVpbGRTVE9SRUNvbW1hbmQiLCJzZXRGbGFncyIsInN0b3JlIiwiYWRkIiwiZGVsZXRlTWVzc2FnZXMiLCJodW1hblJlYWRhYmxlIiwiY29weU1lc3NhZ2VzIiwicmVzcG9uc2UiLCJtb3ZlTWVzc2FnZXMiLCJfc2hvdWxkU2VsZWN0TWFpbGJveCIsInJlcXVlc3QiLCJwYXRoIiwic2VsZWN0TWFpbGJveCIsIlNUQVRFX1NFTEVDVEVEIiwiY29uZHN0b3JlIiwicHJvbWlzZVJlc29sdmVkIiwib25zZWxlY3RtYWlsYm94Iiwib25zZWxlY3RtYWlsYm94U3B5Iiwic3B5Iiwib25jbG9zZW1haWxib3giLCJfc2VsZWN0ZWRNYWlsYm94IiwiaGFzQ2FwYWJpbGl0eSIsIl91bnRhZ2dlZE9rSGFuZGxlciIsIl91bnRhZ2dlZENhcGFiaWxpdHlIYW5kbGVyIiwib251cGRhdGUiLCJfdW50YWdnZWRFeGlzdHNIYW5kbGVyIiwibnIiLCJfdW50YWdnZWRFeHB1bmdlSGFuZGxlciIsIl91bnRhZ2dlZEZldGNoSGFuZGxlciIsIkZFVENIIiwiX2NoYW5nZVN0YXRlIiwiY2hpbGRyZW4iLCJfZW5zdXJlUGF0aCIsIm5hbWUiLCJhYmMiLCJfY29ubmVjdGlvblJlYWR5IiwiX29uRGF0YSIsImRhdGEiLCJidWZmZXIiXSwibWFwcGluZ3MiOiI7O0FBRUE7O0FBQ0E7O0FBQ0E7Ozs7QUFKQTtBQVNBQSxRQUFRLENBQUMsdUJBQUQsRUFBMEIsTUFBTTtBQUN0QyxNQUFJQyxFQUFKO0FBRUFDLEVBQUFBLFVBQVUsQ0FBQyxNQUFNO0FBQ2YsVUFBTUMsSUFBSSxHQUFHO0FBQUVDLE1BQUFBLElBQUksRUFBRSxVQUFSO0FBQW9CQyxNQUFBQSxJQUFJLEVBQUU7QUFBMUIsS0FBYjtBQUNBSixJQUFBQSxFQUFFLEdBQUcsSUFBSUssZUFBSixDQUFlLFVBQWYsRUFBMkIsSUFBM0IsRUFBaUM7QUFBRUgsTUFBQUEsSUFBRjtBQUFRSSxNQUFBQSxRQUFRLEVBQVJBO0FBQVIsS0FBakMsQ0FBTDtBQUNBTixJQUFBQSxFQUFFLENBQUNPLE1BQUgsQ0FBVUMsTUFBVixHQUFtQjtBQUNqQkMsTUFBQUEsSUFBSSxFQUFFLE1BQU0sQ0FBRyxDQURFO0FBRWpCQyxNQUFBQSxlQUFlLEVBQUUsTUFBTSxDQUFHO0FBRlQsS0FBbkI7QUFJRCxHQVBTLENBQVY7QUFTQVgsRUFBQUEsUUFBUSxDQUFDLFVBQUQsRUFBYSxNQUFNO0FBQ3pCWSxJQUFBQSxFQUFFLENBQUMsdUJBQUQsRUFBMEIsTUFBTTtBQUNoQ0MsTUFBQUEsS0FBSyxDQUFDQyxJQUFOLENBQVdiLEVBQVgsRUFBZSxXQUFmO0FBRUFBLE1BQUFBLEVBQUUsQ0FBQ2MsY0FBSCxHQUFvQixJQUFwQjtBQUNBZCxNQUFBQSxFQUFFLENBQUNlLFlBQUgsR0FBa0IsS0FBbEI7O0FBQ0FmLE1BQUFBLEVBQUUsQ0FBQ2dCLE9BQUg7O0FBRUFDLE1BQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQ2tCLFNBQUgsQ0FBYUMsU0FBZCxDQUFOLENBQStCQyxFQUEvQixDQUFrQ0MsS0FBbEMsQ0FBd0MsQ0FBeEM7QUFDRCxLQVJDLENBQUY7QUFVQVYsSUFBQUEsRUFBRSxDQUFDLDJCQUFELEVBQThCLE1BQU07QUFDcENDLE1BQUFBLEtBQUssQ0FBQ0MsSUFBTixDQUFXYixFQUFYLEVBQWUsV0FBZjtBQUVBQSxNQUFBQSxFQUFFLENBQUNlLFlBQUgsR0FBa0IsSUFBbEI7O0FBQ0FmLE1BQUFBLEVBQUUsQ0FBQ2dCLE9BQUg7O0FBRUFDLE1BQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQ2tCLFNBQUgsQ0FBYUMsU0FBZCxDQUFOLENBQStCQyxFQUEvQixDQUFrQ0MsS0FBbEMsQ0FBd0MsQ0FBeEM7QUFDRCxLQVBDLENBQUY7QUFRRCxHQW5CTyxDQUFSO0FBcUJBdEIsRUFBQUEsUUFBUSxDQUFDLFVBQUQsRUFBYSxNQUFNO0FBQ3pCRSxJQUFBQSxVQUFVLENBQUMsTUFBTTtBQUNmVyxNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBRSxDQUFDTyxNQUFkLEVBQXNCLFNBQXRCO0FBQ0FLLE1BQUFBLEtBQUssQ0FBQ0MsSUFBTixDQUFXYixFQUFFLENBQUNPLE1BQWQsRUFBc0IsT0FBdEI7QUFDQUssTUFBQUEsS0FBSyxDQUFDQyxJQUFOLENBQVdiLEVBQVgsRUFBZSxrQkFBZjtBQUNBWSxNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBWCxFQUFlLG1CQUFmO0FBQ0FZLE1BQUFBLEtBQUssQ0FBQ0MsSUFBTixDQUFXYixFQUFYLEVBQWUsVUFBZjtBQUNBWSxNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBWCxFQUFlLE9BQWY7QUFDQVksTUFBQUEsS0FBSyxDQUFDQyxJQUFOLENBQVdiLEVBQVgsRUFBZSxvQkFBZjtBQUNELEtBUlMsQ0FBVjtBQVVBVyxJQUFBQSxFQUFFLENBQUMsZ0JBQUQsRUFBbUIsTUFBTTtBQUN6QlgsTUFBQUEsRUFBRSxDQUFDTyxNQUFILENBQVVlLE9BQVYsQ0FBa0JDLE9BQWxCLENBQTBCQyxPQUFPLENBQUNDLE9BQVIsRUFBMUI7QUFDQXpCLE1BQUFBLEVBQUUsQ0FBQzBCLGdCQUFILENBQW9CSCxPQUFwQixDQUE0QkMsT0FBTyxDQUFDQyxPQUFSLEVBQTVCO0FBQ0F6QixNQUFBQSxFQUFFLENBQUMyQixpQkFBSCxDQUFxQkosT0FBckIsQ0FBNkJDLE9BQU8sQ0FBQ0MsT0FBUixFQUE3QjtBQUNBekIsTUFBQUEsRUFBRSxDQUFDNEIsUUFBSCxDQUFZTCxPQUFaLENBQW9CQyxPQUFPLENBQUNDLE9BQVIsRUFBcEI7QUFDQXpCLE1BQUFBLEVBQUUsQ0FBQzZCLEtBQUgsQ0FBU04sT0FBVCxDQUFpQkMsT0FBTyxDQUFDQyxPQUFSLEVBQWpCO0FBQ0F6QixNQUFBQSxFQUFFLENBQUM4QixrQkFBSCxDQUFzQlAsT0FBdEIsQ0FBOEJDLE9BQU8sQ0FBQ0MsT0FBUixFQUE5QjtBQUVBTSxNQUFBQSxVQUFVLENBQUMsTUFBTS9CLEVBQUUsQ0FBQ08sTUFBSCxDQUFVeUIsT0FBVixFQUFQLEVBQTRCLENBQTVCLENBQVY7QUFDQSxhQUFPaEMsRUFBRSxDQUFDc0IsT0FBSCxHQUFhVyxJQUFiLENBQWtCLE1BQU07QUFDN0JoQixRQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUNPLE1BQUgsQ0FBVWUsT0FBVixDQUFrQlksVUFBbkIsQ0FBTixDQUFxQ2QsRUFBckMsQ0FBd0NlLEVBQXhDLENBQTJDQyxJQUEzQztBQUNBbkIsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDMEIsZ0JBQUgsQ0FBb0JRLFVBQXJCLENBQU4sQ0FBdUNkLEVBQXZDLENBQTBDZSxFQUExQyxDQUE2Q0MsSUFBN0M7QUFDQW5CLFFBQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQzJCLGlCQUFILENBQXFCTyxVQUF0QixDQUFOLENBQXdDZCxFQUF4QyxDQUEyQ2UsRUFBM0MsQ0FBOENDLElBQTlDO0FBQ0FuQixRQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUM0QixRQUFILENBQVlNLFVBQWIsQ0FBTixDQUErQmQsRUFBL0IsQ0FBa0NlLEVBQWxDLENBQXFDQyxJQUFyQztBQUNBbkIsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDNkIsS0FBSCxDQUFTSyxVQUFWLENBQU4sQ0FBNEJkLEVBQTVCLENBQStCZSxFQUEvQixDQUFrQ0MsSUFBbEM7QUFDQW5CLFFBQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQzhCLGtCQUFILENBQXNCSSxVQUF2QixDQUFOLENBQXlDZCxFQUF6QyxDQUE0Q2UsRUFBNUMsQ0FBK0NDLElBQS9DO0FBQ0QsT0FQTSxDQUFQO0FBUUQsS0FqQkMsQ0FBRjtBQW1CQXpCLElBQUFBLEVBQUUsQ0FBQyxzQkFBRCxFQUEwQjBCLElBQUQsSUFBVTtBQUNuQ3JDLE1BQUFBLEVBQUUsQ0FBQ08sTUFBSCxDQUFVZSxPQUFWLENBQWtCQyxPQUFsQixDQUEwQkMsT0FBTyxDQUFDQyxPQUFSLEVBQTFCO0FBQ0F6QixNQUFBQSxFQUFFLENBQUMwQixnQkFBSCxDQUFvQkgsT0FBcEIsQ0FBNEJDLE9BQU8sQ0FBQ0MsT0FBUixFQUE1QjtBQUNBekIsTUFBQUEsRUFBRSxDQUFDMkIsaUJBQUgsQ0FBcUJKLE9BQXJCLENBQTZCQyxPQUFPLENBQUNDLE9BQVIsRUFBN0I7QUFDQXpCLE1BQUFBLEVBQUUsQ0FBQzRCLFFBQUgsQ0FBWUwsT0FBWixDQUFvQkMsT0FBTyxDQUFDQyxPQUFSLEVBQXBCO0FBQ0F6QixNQUFBQSxFQUFFLENBQUM2QixLQUFILENBQVNTLE1BQVQsQ0FBZ0IsSUFBSUMsS0FBSixFQUFoQjtBQUVBUixNQUFBQSxVQUFVLENBQUMsTUFBTS9CLEVBQUUsQ0FBQ08sTUFBSCxDQUFVeUIsT0FBVixFQUFQLEVBQTRCLENBQTVCLENBQVY7QUFDQWhDLE1BQUFBLEVBQUUsQ0FBQ3NCLE9BQUgsR0FBYWtCLEtBQWIsQ0FBb0JDLEdBQUQsSUFBUztBQUMxQnhCLFFBQUFBLE1BQU0sQ0FBQ3dCLEdBQUQsQ0FBTixDQUFZckIsRUFBWixDQUFlc0IsS0FBZjtBQUVBekIsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDTyxNQUFILENBQVVlLE9BQVYsQ0FBa0JZLFVBQW5CLENBQU4sQ0FBcUNkLEVBQXJDLENBQXdDZSxFQUF4QyxDQUEyQ0MsSUFBM0M7QUFDQW5CLFFBQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQ08sTUFBSCxDQUFVb0MsS0FBVixDQUFnQlQsVUFBakIsQ0FBTixDQUFtQ2QsRUFBbkMsQ0FBc0NlLEVBQXRDLENBQXlDQyxJQUF6QztBQUNBbkIsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDMEIsZ0JBQUgsQ0FBb0JRLFVBQXJCLENBQU4sQ0FBdUNkLEVBQXZDLENBQTBDZSxFQUExQyxDQUE2Q0MsSUFBN0M7QUFDQW5CLFFBQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQzJCLGlCQUFILENBQXFCTyxVQUF0QixDQUFOLENBQXdDZCxFQUF4QyxDQUEyQ2UsRUFBM0MsQ0FBOENDLElBQTlDO0FBQ0FuQixRQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUM0QixRQUFILENBQVlNLFVBQWIsQ0FBTixDQUErQmQsRUFBL0IsQ0FBa0NlLEVBQWxDLENBQXFDQyxJQUFyQztBQUNBbkIsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDNkIsS0FBSCxDQUFTSyxVQUFWLENBQU4sQ0FBNEJkLEVBQTVCLENBQStCZSxFQUEvQixDQUFrQ0MsSUFBbEM7QUFFQW5CLFFBQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQzhCLGtCQUFILENBQXNCYyxNQUF2QixDQUFOLENBQXFDeEIsRUFBckMsQ0FBd0NlLEVBQXhDLENBQTJDVSxLQUEzQztBQUVBUixRQUFBQSxJQUFJO0FBQ0wsT0FiRDtBQWNELEtBdEJDLENBQUY7QUF3QkExQixJQUFBQSxFQUFFLENBQUMsZ0JBQUQsRUFBb0IwQixJQUFELElBQVU7QUFDN0JyQyxNQUFBQSxFQUFFLENBQUNPLE1BQUgsQ0FBVWUsT0FBVixDQUFrQkMsT0FBbEIsQ0FBMEJDLE9BQU8sQ0FBQ0MsT0FBUixFQUExQjtBQUNBekIsTUFBQUEsRUFBRSxDQUFDOEMsaUJBQUgsR0FBdUIsQ0FBdkI7QUFFQTlDLE1BQUFBLEVBQUUsQ0FBQ3NCLE9BQUgsR0FBYWtCLEtBQWIsQ0FBb0JDLEdBQUQsSUFBUztBQUMxQnhCLFFBQUFBLE1BQU0sQ0FBQ3dCLEdBQUQsQ0FBTixDQUFZckIsRUFBWixDQUFlc0IsS0FBZjtBQUVBekIsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDTyxNQUFILENBQVVlLE9BQVYsQ0FBa0JZLFVBQW5CLENBQU4sQ0FBcUNkLEVBQXJDLENBQXdDZSxFQUF4QyxDQUEyQ0MsSUFBM0M7QUFDQW5CLFFBQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQ08sTUFBSCxDQUFVb0MsS0FBVixDQUFnQlQsVUFBakIsQ0FBTixDQUFtQ2QsRUFBbkMsQ0FBc0NlLEVBQXRDLENBQXlDQyxJQUF6QztBQUVBbkIsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDMEIsZ0JBQUgsQ0FBb0JrQixNQUFyQixDQUFOLENBQW1DeEIsRUFBbkMsQ0FBc0NlLEVBQXRDLENBQXlDVSxLQUF6QztBQUNBNUIsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDMkIsaUJBQUgsQ0FBcUJpQixNQUF0QixDQUFOLENBQW9DeEIsRUFBcEMsQ0FBdUNlLEVBQXZDLENBQTBDVSxLQUExQztBQUNBNUIsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDNEIsUUFBSCxDQUFZZ0IsTUFBYixDQUFOLENBQTJCeEIsRUFBM0IsQ0FBOEJlLEVBQTlCLENBQWlDVSxLQUFqQztBQUNBNUIsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDNkIsS0FBSCxDQUFTZSxNQUFWLENBQU4sQ0FBd0J4QixFQUF4QixDQUEyQmUsRUFBM0IsQ0FBOEJVLEtBQTlCO0FBQ0E1QixRQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUM4QixrQkFBSCxDQUFzQmMsTUFBdkIsQ0FBTixDQUFxQ3hCLEVBQXJDLENBQXdDZSxFQUF4QyxDQUEyQ1UsS0FBM0M7QUFFQVIsUUFBQUEsSUFBSTtBQUNMLE9BYkQ7QUFjRCxLQWxCQyxDQUFGO0FBbUJELEdBekVPLENBQVI7QUEyRUF0QyxFQUFBQSxRQUFRLENBQUMsUUFBRCxFQUFXLE1BQU07QUFDdkJZLElBQUFBLEVBQUUsQ0FBQyxvQkFBRCxFQUF1QixNQUFNO0FBQzdCQyxNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBRSxDQUFDTyxNQUFkLEVBQXNCLE9BQXRCLEVBQStCZ0IsT0FBL0IsQ0FBdUNDLE9BQU8sQ0FBQ0MsT0FBUixFQUF2QztBQUVBLGFBQU96QixFQUFFLENBQUMyQyxLQUFILEdBQVdWLElBQVgsQ0FBZ0IsTUFBTTtBQUMzQmhCLFFBQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQytDLE1BQUosQ0FBTixDQUFrQjNCLEVBQWxCLENBQXFCQyxLQUFyQixDQUEyQjJCLG9CQUEzQjtBQUNBL0IsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDTyxNQUFILENBQVVvQyxLQUFWLENBQWdCVCxVQUFqQixDQUFOLENBQW1DZCxFQUFuQyxDQUFzQ2UsRUFBdEMsQ0FBeUNDLElBQXpDO0FBQ0QsT0FITSxDQUFQO0FBSUQsS0FQQyxDQUFGO0FBUUQsR0FUTyxDQUFSO0FBV0FyQyxFQUFBQSxRQUFRLENBQUMsT0FBRCxFQUFVLE1BQU07QUFDdEJFLElBQUFBLFVBQVUsQ0FBQyxNQUFNO0FBQ2ZXLE1BQUFBLEtBQUssQ0FBQ0MsSUFBTixDQUFXYixFQUFYLEVBQWUsV0FBZjtBQUNELEtBRlMsQ0FBVjtBQUlBVyxJQUFBQSxFQUFFLENBQUMsNEJBQUQsRUFBK0IsTUFBTTtBQUNyQ0MsTUFBQUEsS0FBSyxDQUFDQyxJQUFOLENBQVdiLEVBQUUsQ0FBQ08sTUFBZCxFQUFzQixnQkFBdEIsRUFBd0NnQixPQUF4QyxDQUFnREMsT0FBTyxDQUFDQyxPQUFSLENBQWdCLEVBQWhCLENBQWhEO0FBQ0EsYUFBT3pCLEVBQUUsQ0FBQ2lELElBQUgsQ0FBUSxNQUFSLEVBQWdCaEIsSUFBaEIsQ0FBc0JpQixHQUFELElBQVM7QUFDbkNqQyxRQUFBQSxNQUFNLENBQUNpQyxHQUFELENBQU4sQ0FBWTlCLEVBQVosQ0FBZStCLElBQWYsQ0FBb0I5QixLQUFwQixDQUEwQixFQUExQjtBQUNBSixRQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUNPLE1BQUgsQ0FBVTZDLGNBQVYsQ0FBeUJDLElBQXpCLENBQThCLENBQTlCLEVBQWlDLENBQWpDLENBQUQsQ0FBTixDQUE0Q2pDLEVBQTVDLENBQStDQyxLQUEvQyxDQUFxRCxNQUFyRDtBQUNELE9BSE0sQ0FBUDtBQUlELEtBTkMsQ0FBRjtBQVFBVixJQUFBQSxFQUFFLENBQUMsd0NBQUQsRUFBMkMsTUFBTTtBQUNqREMsTUFBQUEsS0FBSyxDQUFDQyxJQUFOLENBQVdiLEVBQUUsQ0FBQ08sTUFBZCxFQUFzQixnQkFBdEIsRUFBd0NnQixPQUF4QyxDQUFnREMsT0FBTyxDQUFDQyxPQUFSLENBQWdCO0FBQzlENkIsUUFBQUEsVUFBVSxFQUFFLENBQUMsR0FBRCxFQUFNLEdBQU47QUFEa0QsT0FBaEIsQ0FBaEQ7QUFHQSxhQUFPdEQsRUFBRSxDQUFDaUQsSUFBSCxDQUFRLE1BQVIsRUFBZ0JoQixJQUFoQixDQUFzQmlCLEdBQUQsSUFBUztBQUNuQ2pDLFFBQUFBLE1BQU0sQ0FBQ2lDLEdBQUQsQ0FBTixDQUFZOUIsRUFBWixDQUFlK0IsSUFBZixDQUFvQjlCLEtBQXBCLENBQTBCO0FBQ3hCaUMsVUFBQUEsVUFBVSxFQUFFLENBQUMsR0FBRCxFQUFNLEdBQU47QUFEWSxTQUExQjtBQUdBckMsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDdUQsV0FBSixDQUFOLENBQXVCbkMsRUFBdkIsQ0FBMEIrQixJQUExQixDQUErQjlCLEtBQS9CLENBQXFDLENBQUMsR0FBRCxFQUFNLEdBQU4sQ0FBckM7QUFDRCxPQUxNLENBQVA7QUFNRCxLQVZDLENBQUY7QUFXRCxHQXhCTyxDQUFSO0FBMEJBdEIsRUFBQUEsUUFBUSxDQUFDLFlBQUQsRUFBZSxNQUFNO0FBQzNCWSxJQUFBQSxFQUFFLENBQUMscURBQUQsRUFBeUQwQixJQUFELElBQVU7QUFDbEV6QixNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBWCxFQUFlLE1BQWYsRUFBdUJ3RCxTQUF2QixDQUFrQ0MsT0FBRCxJQUFhO0FBQzVDeEMsUUFBQUEsTUFBTSxDQUFDd0MsT0FBRCxDQUFOLENBQWdCckMsRUFBaEIsQ0FBbUJDLEtBQW5CLENBQXlCLE1BQXpCO0FBRUFnQixRQUFBQSxJQUFJO0FBQ0wsT0FKRDtBQU1BckMsTUFBQUEsRUFBRSxDQUFDdUQsV0FBSCxHQUFpQixFQUFqQjtBQUNBdkQsTUFBQUEsRUFBRSxDQUFDMEQsV0FBSCxHQUFpQixDQUFqQjtBQUNBMUQsTUFBQUEsRUFBRSxDQUFDa0IsU0FBSDtBQUNELEtBVkMsQ0FBRjtBQVlBUCxJQUFBQSxFQUFFLENBQUMsaUNBQUQsRUFBcUMwQixJQUFELElBQVU7QUFDOUN6QixNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBRSxDQUFDTyxNQUFkLEVBQXNCLGdCQUF0QjtBQUNBSyxNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBRSxDQUFDTyxNQUFILENBQVVDLE1BQXJCLEVBQTZCLE1BQTdCLEVBQXFDZ0QsU0FBckMsQ0FBZ0RHLE9BQUQsSUFBYTtBQUMxRDFDLFFBQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQ08sTUFBSCxDQUFVNkMsY0FBVixDQUF5QkMsSUFBekIsQ0FBOEIsQ0FBOUIsRUFBaUMsQ0FBakMsRUFBb0NJLE9BQXJDLENBQU4sQ0FBb0RyQyxFQUFwRCxDQUF1REMsS0FBdkQsQ0FBNkQsTUFBN0Q7QUFDQUosUUFBQUEsTUFBTSxDQUFDLEdBQUcyQyxLQUFILENBQVNDLElBQVQsQ0FBYyxJQUFJQyxVQUFKLENBQWVILE9BQWYsQ0FBZCxDQUFELENBQU4sQ0FBK0N2QyxFQUEvQyxDQUFrRCtCLElBQWxELENBQXVEOUIsS0FBdkQsQ0FBNkQsQ0FBQyxJQUFELEVBQU8sSUFBUCxFQUFhLElBQWIsRUFBbUIsSUFBbkIsRUFBeUIsSUFBekIsRUFBK0IsSUFBL0IsQ0FBN0Q7QUFFQWdCLFFBQUFBLElBQUk7QUFDTCxPQUxEO0FBT0FyQyxNQUFBQSxFQUFFLENBQUN1RCxXQUFILEdBQWlCLENBQUMsTUFBRCxDQUFqQjtBQUNBdkQsTUFBQUEsRUFBRSxDQUFDK0QsV0FBSCxHQUFpQixDQUFqQjtBQUNBL0QsTUFBQUEsRUFBRSxDQUFDa0IsU0FBSDtBQUNELEtBWkMsQ0FBRjtBQWFELEdBMUJPLENBQVI7QUE0QkFuQixFQUFBQSxRQUFRLENBQUMsWUFBRCxFQUFlLE1BQU07QUFDM0JZLElBQUFBLEVBQUUsQ0FBQyw0QkFBRCxFQUErQixNQUFNO0FBQ3JDQyxNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBRSxDQUFDTyxNQUFILENBQVVDLE1BQXJCLEVBQTZCLE1BQTdCO0FBRUFSLE1BQUFBLEVBQUUsQ0FBQ2UsWUFBSCxHQUFrQixNQUFsQjtBQUNBZixNQUFBQSxFQUFFLENBQUNnRSxTQUFIO0FBQ0EvQyxNQUFBQSxNQUFNLENBQUMsR0FBRzJDLEtBQUgsQ0FBU0MsSUFBVCxDQUFjLElBQUlDLFVBQUosQ0FBZTlELEVBQUUsQ0FBQ08sTUFBSCxDQUFVQyxNQUFWLENBQWlCQyxJQUFqQixDQUFzQjRDLElBQXRCLENBQTJCLENBQTNCLEVBQThCLENBQTlCLENBQWYsQ0FBZCxDQUFELENBQU4sQ0FBd0VqQyxFQUF4RSxDQUEyRStCLElBQTNFLENBQWdGOUIsS0FBaEYsQ0FBc0YsQ0FBQyxJQUFELEVBQU8sSUFBUCxFQUFhLElBQWIsRUFBbUIsSUFBbkIsRUFBeUIsSUFBekIsRUFBK0IsSUFBL0IsQ0FBdEY7QUFDRCxLQU5DLENBQUY7QUFPRCxHQVJPLENBQVI7QUFVQXRCLEVBQUFBLFFBQVEsQ0FBQyxvQkFBRCxFQUF1QixNQUFNO0FBQ25DWSxJQUFBQSxFQUFFLENBQUMsc0NBQUQsRUFBeUMsTUFBTTtBQUMvQ1gsTUFBQUEsRUFBRSxDQUFDTyxNQUFILENBQVUwRCxVQUFWLEdBQXVCLElBQXZCO0FBQ0FqRSxNQUFBQSxFQUFFLENBQUN1RCxXQUFILEdBQWlCLENBQUMsVUFBRCxDQUFqQjtBQUNBLGFBQU92RCxFQUFFLENBQUMyQixpQkFBSCxFQUFQO0FBQ0QsS0FKQyxDQUFGO0FBTUFoQixJQUFBQSxFQUFFLENBQUMsNkNBQUQsRUFBZ0QsTUFBTTtBQUN0RFgsTUFBQUEsRUFBRSxDQUFDTyxNQUFILENBQVUwRCxVQUFWLEdBQXVCLEtBQXZCO0FBQ0FqRSxNQUFBQSxFQUFFLENBQUN1RCxXQUFILEdBQWlCLEVBQWpCO0FBQ0EsYUFBT3ZELEVBQUUsQ0FBQzJCLGlCQUFILEVBQVA7QUFDRCxLQUpDLENBQUY7QUFNQWhCLElBQUFBLEVBQUUsQ0FBQyxxQkFBRCxFQUF3QixNQUFNO0FBQzlCQyxNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBRSxDQUFDTyxNQUFkLEVBQXNCLFNBQXRCO0FBQ0FLLE1BQUFBLEtBQUssQ0FBQ0MsSUFBTixDQUFXYixFQUFYLEVBQWUsTUFBZixFQUF1QmtFLFFBQXZCLENBQWdDLFVBQWhDLEVBQTRDM0MsT0FBNUMsQ0FBb0RDLE9BQU8sQ0FBQ0MsT0FBUixFQUFwRDtBQUNBYixNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBWCxFQUFlLGtCQUFmLEVBQW1DdUIsT0FBbkMsQ0FBMkNDLE9BQU8sQ0FBQ0MsT0FBUixFQUEzQztBQUVBekIsTUFBQUEsRUFBRSxDQUFDdUQsV0FBSCxHQUFpQixDQUFDLFVBQUQsQ0FBakI7QUFFQSxhQUFPdkQsRUFBRSxDQUFDMkIsaUJBQUgsR0FBdUJNLElBQXZCLENBQTRCLE1BQU07QUFDdkNoQixRQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUNPLE1BQUgsQ0FBVTRELE9BQVYsQ0FBa0JoRCxTQUFuQixDQUFOLENBQW9DQyxFQUFwQyxDQUF1Q0MsS0FBdkMsQ0FBNkMsQ0FBN0M7QUFDQUosUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDdUQsV0FBSCxDQUFlYSxNQUFoQixDQUFOLENBQThCaEQsRUFBOUIsQ0FBaUNDLEtBQWpDLENBQXVDLENBQXZDO0FBQ0QsT0FITSxDQUFQO0FBSUQsS0FYQyxDQUFGO0FBWUQsR0F6Qk8sQ0FBUjtBQTJCQXRCLEVBQUFBLFFBQVEsQ0FBQyxtQkFBRCxFQUFzQixNQUFNO0FBQ2xDRSxJQUFBQSxVQUFVLENBQUMsTUFBTTtBQUNmVyxNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBWCxFQUFlLE1BQWY7QUFDRCxLQUZTLENBQVY7QUFJQVcsSUFBQUEsRUFBRSxDQUFDLHdDQUFELEVBQTJDLE1BQU07QUFDakRYLE1BQUFBLEVBQUUsQ0FBQ3VELFdBQUgsR0FBaUIsQ0FBQyxLQUFELENBQWpCO0FBQ0EsYUFBT3ZELEVBQUUsQ0FBQzBCLGdCQUFILEVBQVA7QUFDRCxLQUhDLENBQUY7QUFLQWYsSUFBQUEsRUFBRSxDQUFDLDZDQUFELEVBQWdELE1BQU07QUFDdERYLE1BQUFBLEVBQUUsQ0FBQ2lELElBQUgsQ0FBUTFCLE9BQVIsQ0FBZ0JDLE9BQU8sQ0FBQ0MsT0FBUixFQUFoQjtBQUVBekIsTUFBQUEsRUFBRSxDQUFDdUQsV0FBSCxHQUFpQixFQUFqQjtBQUVBLGFBQU92RCxFQUFFLENBQUMwQixnQkFBSCxHQUFzQk8sSUFBdEIsQ0FBMkIsTUFBTTtBQUN0Q2hCLFFBQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQ2lELElBQUgsQ0FBUUksSUFBUixDQUFhLENBQWIsRUFBZ0IsQ0FBaEIsQ0FBRCxDQUFOLENBQTJCakMsRUFBM0IsQ0FBOEJDLEtBQTlCLENBQW9DLFlBQXBDO0FBQ0QsT0FGTSxDQUFQO0FBR0QsS0FSQyxDQUFGO0FBVUFWLElBQUFBLEVBQUUsQ0FBQyw2QkFBRCxFQUFnQyxNQUFNO0FBQ3RDWCxNQUFBQSxFQUFFLENBQUNpRCxJQUFILENBQVExQixPQUFSLENBQWdCQyxPQUFPLENBQUNDLE9BQVIsRUFBaEI7QUFDQXpCLE1BQUFBLEVBQUUsQ0FBQ3VELFdBQUgsR0FBaUIsQ0FBQyxLQUFELENBQWpCO0FBRUEsYUFBT3ZELEVBQUUsQ0FBQzBCLGdCQUFILENBQW9CLElBQXBCLEVBQTBCTyxJQUExQixDQUErQixNQUFNO0FBQzFDaEIsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDaUQsSUFBSCxDQUFRSSxJQUFSLENBQWEsQ0FBYixFQUFnQixDQUFoQixDQUFELENBQU4sQ0FBMkJqQyxFQUEzQixDQUE4QkMsS0FBOUIsQ0FBb0MsWUFBcEM7QUFDRCxPQUZNLENBQVA7QUFHRCxLQVBDLENBQUY7QUFTQVYsSUFBQUEsRUFBRSxDQUFDLHFEQUFELEVBQXdELE1BQU07QUFDOURYLE1BQUFBLEVBQUUsQ0FBQ3VELFdBQUgsR0FBaUIsRUFBakI7QUFDQXZELE1BQUFBLEVBQUUsQ0FBQ08sTUFBSCxDQUFVMEQsVUFBVixHQUF1QixLQUF2QjtBQUNBakUsTUFBQUEsRUFBRSxDQUFDcUUsV0FBSCxHQUFpQixJQUFqQjtBQUVBckUsTUFBQUEsRUFBRSxDQUFDMEIsZ0JBQUg7QUFDRCxLQU5DLENBQUY7QUFPRCxHQXBDTyxDQUFSO0FBc0NBM0IsRUFBQUEsUUFBUSxDQUFDLGlCQUFELEVBQW9CLE1BQU07QUFDaENFLElBQUFBLFVBQVUsQ0FBQyxNQUFNO0FBQ2ZXLE1BQUFBLEtBQUssQ0FBQ0MsSUFBTixDQUFXYixFQUFYLEVBQWUsTUFBZjtBQUNELEtBRlMsQ0FBVjtBQUlBVyxJQUFBQSxFQUFFLENBQUMsbUNBQUQsRUFBc0MsTUFBTTtBQUM1Q1gsTUFBQUEsRUFBRSxDQUFDaUQsSUFBSCxDQUFRMUIsT0FBUixDQUFnQkMsT0FBTyxDQUFDQyxPQUFSLENBQWdCO0FBQzlCa0MsUUFBQUEsT0FBTyxFQUFFO0FBQ1BXLFVBQUFBLFNBQVMsRUFBRSxDQUFDO0FBQ1ZDLFlBQUFBLFVBQVUsRUFBRSxDQUNWLENBQ0UsQ0FBQztBQUNDQyxjQUFBQSxJQUFJLEVBQUUsUUFEUDtBQUVDQyxjQUFBQSxLQUFLLEVBQUU7QUFGUixhQUFELEVBR0c7QUFDREQsY0FBQUEsSUFBSSxFQUFFLFFBREw7QUFFREMsY0FBQUEsS0FBSyxFQUFFO0FBRk4sYUFISCxDQURGLENBRFUsRUFTUCxJQVRPLEVBU0QsSUFUQztBQURGLFdBQUQ7QUFESjtBQURxQixPQUFoQixDQUFoQjtBQWlCQXpFLE1BQUFBLEVBQUUsQ0FBQ3VELFdBQUgsR0FBaUIsQ0FBQyxXQUFELENBQWpCO0FBRUEsYUFBT3ZELEVBQUUsQ0FBQzBFLGNBQUgsR0FBb0J6QyxJQUFwQixDQUEwQjBDLFVBQUQsSUFBZ0I7QUFDOUMxRCxRQUFBQSxNQUFNLENBQUMwRCxVQUFELENBQU4sQ0FBbUJ2RCxFQUFuQixDQUFzQitCLElBQXRCLENBQTJCOUIsS0FBM0IsQ0FBaUM7QUFDL0J1RCxVQUFBQSxRQUFRLEVBQUUsQ0FBQztBQUNUQyxZQUFBQSxNQUFNLEVBQUUsUUFEQztBQUVUQyxZQUFBQSxTQUFTLEVBQUU7QUFGRixXQUFELENBRHFCO0FBSy9CQyxVQUFBQSxLQUFLLEVBQUUsS0FMd0I7QUFNL0JDLFVBQUFBLE1BQU0sRUFBRTtBQU51QixTQUFqQztBQVFBL0QsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDaUQsSUFBSCxDQUFRSSxJQUFSLENBQWEsQ0FBYixFQUFnQixDQUFoQixDQUFELENBQU4sQ0FBMkJqQyxFQUEzQixDQUE4QkMsS0FBOUIsQ0FBb0MsV0FBcEM7QUFDQUosUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDaUQsSUFBSCxDQUFRSSxJQUFSLENBQWEsQ0FBYixFQUFnQixDQUFoQixDQUFELENBQU4sQ0FBMkJqQyxFQUEzQixDQUE4QkMsS0FBOUIsQ0FBb0MsV0FBcEM7QUFDRCxPQVhNLENBQVA7QUFZRCxLQWhDQyxDQUFGO0FBa0NBVixJQUFBQSxFQUFFLENBQUMsb0NBQUQsRUFBdUMsTUFBTTtBQUM3Q1gsTUFBQUEsRUFBRSxDQUFDdUQsV0FBSCxHQUFpQixFQUFqQjtBQUNBLGFBQU92RCxFQUFFLENBQUMwRSxjQUFILEdBQW9CekMsSUFBcEIsQ0FBMEIwQyxVQUFELElBQWdCO0FBQzlDMUQsUUFBQUEsTUFBTSxDQUFDMEQsVUFBRCxDQUFOLENBQW1CdkQsRUFBbkIsQ0FBc0JlLEVBQXRCLENBQXlCVSxLQUF6QjtBQUNBNUIsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDaUQsSUFBSCxDQUFROUIsU0FBVCxDQUFOLENBQTBCQyxFQUExQixDQUE2QkMsS0FBN0IsQ0FBbUMsQ0FBbkM7QUFDRCxPQUhNLENBQVA7QUFJRCxLQU5DLENBQUY7QUFPRCxHQTlDTyxDQUFSO0FBZ0RBdEIsRUFBQUEsUUFBUSxDQUFDLHFCQUFELEVBQXdCLE1BQU07QUFDcENFLElBQUFBLFVBQVUsQ0FBQyxNQUFNO0FBQ2ZXLE1BQUFBLEtBQUssQ0FBQ0MsSUFBTixDQUFXYixFQUFYLEVBQWUsTUFBZjtBQUNBWSxNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBRSxDQUFDTyxNQUFkLEVBQXNCLG1CQUF0QjtBQUNELEtBSFMsQ0FBVjtBQUtBSSxJQUFBQSxFQUFFLENBQUMsMENBQUQsRUFBNkMsTUFBTTtBQUNuRFgsTUFBQUEsRUFBRSxDQUFDaUQsSUFBSCxDQUFRaUIsUUFBUixDQUFpQjtBQUNmVCxRQUFBQSxPQUFPLEVBQUUsVUFETTtBQUVmYyxRQUFBQSxVQUFVLEVBQUUsQ0FBQztBQUNYQyxVQUFBQSxJQUFJLEVBQUUsTUFESztBQUVYQyxVQUFBQSxLQUFLLEVBQUU7QUFGSSxTQUFEO0FBRkcsT0FBakIsRUFNR2xELE9BTkgsQ0FNV0MsT0FBTyxDQUFDQyxPQUFSLENBQWdCLEVBQWhCLENBTlg7QUFRQXpCLE1BQUFBLEVBQUUsQ0FBQ2lGLGtCQUFILEdBQXdCLElBQXhCO0FBQ0FqRixNQUFBQSxFQUFFLENBQUN1RCxXQUFILEdBQWlCLENBQUMsa0JBQUQsQ0FBakI7QUFDQSxhQUFPdkQsRUFBRSxDQUFDOEIsa0JBQUgsR0FBd0JHLElBQXhCLENBQTZCLE1BQU07QUFDeENoQixRQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUNpRCxJQUFILENBQVE5QixTQUFULENBQU4sQ0FBMEJDLEVBQTFCLENBQTZCQyxLQUE3QixDQUFtQyxDQUFuQztBQUNBSixRQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUNPLE1BQUgsQ0FBVTJFLGlCQUFWLENBQTRCL0QsU0FBN0IsQ0FBTixDQUE4Q0MsRUFBOUMsQ0FBaURDLEtBQWpELENBQXVELENBQXZEO0FBQ0QsT0FITSxDQUFQO0FBSUQsS0FmQyxDQUFGO0FBaUJBVixJQUFBQSxFQUFFLENBQUMsb0NBQUQsRUFBdUMsTUFBTTtBQUM3Q1gsTUFBQUEsRUFBRSxDQUFDdUQsV0FBSCxHQUFpQixFQUFqQjtBQUVBLGFBQU92RCxFQUFFLENBQUM4QixrQkFBSCxHQUF3QkcsSUFBeEIsQ0FBNkIsTUFBTTtBQUN4Q2hCLFFBQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQ2lELElBQUgsQ0FBUTlCLFNBQVQsQ0FBTixDQUEwQkMsRUFBMUIsQ0FBNkJDLEtBQTdCLENBQW1DLENBQW5DO0FBQ0QsT0FGTSxDQUFQO0FBR0QsS0FOQyxDQUFGO0FBUUFWLElBQUFBLEVBQUUsQ0FBQyxrQ0FBRCxFQUFxQyxNQUFNO0FBQzNDWCxNQUFBQSxFQUFFLENBQUNpRixrQkFBSCxHQUF3QixLQUF4QjtBQUNBakYsTUFBQUEsRUFBRSxDQUFDdUQsV0FBSCxHQUFpQixDQUFDLGtCQUFELENBQWpCO0FBRUEsYUFBT3ZELEVBQUUsQ0FBQzhCLGtCQUFILEdBQXdCRyxJQUF4QixDQUE2QixNQUFNO0FBQ3hDaEIsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDaUQsSUFBSCxDQUFROUIsU0FBVCxDQUFOLENBQTBCQyxFQUExQixDQUE2QkMsS0FBN0IsQ0FBbUMsQ0FBbkM7QUFDRCxPQUZNLENBQVA7QUFHRCxLQVBDLENBQUY7QUFRRCxHQXZDTyxDQUFSO0FBeUNBdEIsRUFBQUEsUUFBUSxDQUFDLFFBQUQsRUFBVyxNQUFNO0FBQ3ZCWSxJQUFBQSxFQUFFLENBQUMsbUJBQUQsRUFBc0IsTUFBTTtBQUM1QkMsTUFBQUEsS0FBSyxDQUFDQyxJQUFOLENBQVdiLEVBQVgsRUFBZSxNQUFmLEVBQXVCdUIsT0FBdkIsQ0FBK0JDLE9BQU8sQ0FBQ0MsT0FBUixDQUFnQixFQUFoQixDQUEvQjtBQUNBYixNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBWCxFQUFlLGtCQUFmLEVBQW1DdUIsT0FBbkMsQ0FBMkNDLE9BQU8sQ0FBQ0MsT0FBUixDQUFnQixJQUFoQixDQUEzQztBQUVBLGFBQU96QixFQUFFLENBQUM2QixLQUFILENBQVM7QUFDZDFCLFFBQUFBLElBQUksRUFBRSxJQURRO0FBRWRDLFFBQUFBLElBQUksRUFBRTtBQUZRLE9BQVQsRUFHSjZCLElBSEksQ0FHQyxNQUFNO0FBQ1poQixRQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUNpRCxJQUFILENBQVE5QixTQUFULENBQU4sQ0FBMEJDLEVBQTFCLENBQTZCQyxLQUE3QixDQUFtQyxDQUFuQztBQUNBSixRQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUNpRCxJQUFILENBQVFJLElBQVIsQ0FBYSxDQUFiLEVBQWdCLENBQWhCLENBQUQsQ0FBTixDQUEyQmpDLEVBQTNCLENBQThCK0IsSUFBOUIsQ0FBbUM5QixLQUFuQyxDQUF5QztBQUN2Q29DLFVBQUFBLE9BQU8sRUFBRSxPQUQ4QjtBQUV2Q2MsVUFBQUEsVUFBVSxFQUFFLENBQUM7QUFDWEMsWUFBQUEsSUFBSSxFQUFFLFFBREs7QUFFWEMsWUFBQUEsS0FBSyxFQUFFO0FBRkksV0FBRCxFQUdUO0FBQ0RELFlBQUFBLElBQUksRUFBRSxRQURMO0FBRURDLFlBQUFBLEtBQUssRUFBRSxJQUZOO0FBR0RVLFlBQUFBLFNBQVMsRUFBRTtBQUhWLFdBSFM7QUFGMkIsU0FBekM7QUFXRCxPQWhCTSxDQUFQO0FBaUJELEtBckJDLENBQUY7QUF1QkF4RSxJQUFBQSxFQUFFLENBQUMscUJBQUQsRUFBd0IsTUFBTTtBQUM5QkMsTUFBQUEsS0FBSyxDQUFDQyxJQUFOLENBQVdiLEVBQVgsRUFBZSxNQUFmLEVBQXVCdUIsT0FBdkIsQ0FBK0JDLE9BQU8sQ0FBQ0MsT0FBUixDQUFnQixFQUFoQixDQUEvQjtBQUNBYixNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBWCxFQUFlLGtCQUFmLEVBQW1DdUIsT0FBbkMsQ0FBMkNDLE9BQU8sQ0FBQ0MsT0FBUixDQUFnQixJQUFoQixDQUEzQztBQUVBekIsTUFBQUEsRUFBRSxDQUFDdUQsV0FBSCxHQUFpQixDQUFDLGNBQUQsQ0FBakI7QUFDQXZELE1BQUFBLEVBQUUsQ0FBQzZCLEtBQUgsQ0FBUztBQUNQMUIsUUFBQUEsSUFBSSxFQUFFLElBREM7QUFFUGlGLFFBQUFBLE9BQU8sRUFBRTtBQUZGLE9BQVQsRUFHR25ELElBSEgsQ0FHUSxNQUFNO0FBQ1poQixRQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUNpRCxJQUFILENBQVE5QixTQUFULENBQU4sQ0FBMEJDLEVBQTFCLENBQTZCQyxLQUE3QixDQUFtQyxDQUFuQztBQUNBSixRQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUNpRCxJQUFILENBQVFJLElBQVIsQ0FBYSxDQUFiLEVBQWdCLENBQWhCLENBQUQsQ0FBTixDQUEyQmpDLEVBQTNCLENBQThCK0IsSUFBOUIsQ0FBbUM5QixLQUFuQyxDQUF5QztBQUN2Q29DLFVBQUFBLE9BQU8sRUFBRSxjQUQ4QjtBQUV2Q2MsVUFBQUEsVUFBVSxFQUFFLENBQUM7QUFDWEMsWUFBQUEsSUFBSSxFQUFFLE1BREs7QUFFWEMsWUFBQUEsS0FBSyxFQUFFO0FBRkksV0FBRCxFQUdUO0FBQ0RELFlBQUFBLElBQUksRUFBRSxNQURMO0FBRURDLFlBQUFBLEtBQUssRUFBRSxzQ0FGTjtBQUdEVSxZQUFBQSxTQUFTLEVBQUU7QUFIVixXQUhTO0FBRjJCLFNBQXpDO0FBV0QsT0FoQkQ7QUFpQkQsS0F0QkMsQ0FBRjtBQXVCRCxHQS9DTyxDQUFSO0FBaURBcEYsRUFBQUEsUUFBUSxDQUFDLFdBQUQsRUFBYyxNQUFNO0FBQzFCRSxJQUFBQSxVQUFVLENBQUMsTUFBTTtBQUNmVyxNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBWCxFQUFlLE1BQWY7QUFDRCxLQUZTLENBQVY7QUFJQVcsSUFBQUEsRUFBRSxDQUFDLHFDQUFELEVBQXdDLE1BQU07QUFDOUNYLE1BQUFBLEVBQUUsQ0FBQ3VELFdBQUgsR0FBaUIsRUFBakI7QUFFQSxhQUFPdkQsRUFBRSxDQUFDNEIsUUFBSCxDQUFZO0FBQ2pCeUQsUUFBQUEsQ0FBQyxFQUFFLEdBRGM7QUFFakJDLFFBQUFBLENBQUMsRUFBRTtBQUZjLE9BQVosRUFHSnJELElBSEksQ0FHQyxNQUFNO0FBQ1poQixRQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUN1RixRQUFKLENBQU4sQ0FBb0JuRSxFQUFwQixDQUF1QmUsRUFBdkIsQ0FBMEJVLEtBQTFCO0FBQ0QsT0FMTSxDQUFQO0FBTUQsS0FUQyxDQUFGO0FBV0FsQyxJQUFBQSxFQUFFLENBQUMsaUJBQUQsRUFBb0IsTUFBTTtBQUMxQlgsTUFBQUEsRUFBRSxDQUFDaUQsSUFBSCxDQUFRaUIsUUFBUixDQUFpQjtBQUNmVCxRQUFBQSxPQUFPLEVBQUUsSUFETTtBQUVmYyxRQUFBQSxVQUFVLEVBQUUsQ0FDVixJQURVO0FBRkcsT0FBakIsRUFLR2hELE9BTEgsQ0FLV0MsT0FBTyxDQUFDQyxPQUFSLENBQWdCO0FBQ3pCa0MsUUFBQUEsT0FBTyxFQUFFO0FBQ1A2QixVQUFBQSxFQUFFLEVBQUUsQ0FBQztBQUNIakIsWUFBQUEsVUFBVSxFQUFFLENBQ1YsSUFEVTtBQURULFdBQUQ7QUFERztBQURnQixPQUFoQixDQUxYO0FBY0F2RSxNQUFBQSxFQUFFLENBQUN1RCxXQUFILEdBQWlCLENBQUMsSUFBRCxDQUFqQjtBQUVBLGFBQU92RCxFQUFFLENBQUM0QixRQUFILENBQVksSUFBWixFQUFrQkssSUFBbEIsQ0FBdUIsTUFBTTtBQUNsQ2hCLFFBQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQ3VGLFFBQUosQ0FBTixDQUFvQm5FLEVBQXBCLENBQXVCK0IsSUFBdkIsQ0FBNEI5QixLQUE1QixDQUFrQyxFQUFsQztBQUNELE9BRk0sQ0FBUDtBQUdELEtBcEJDLENBQUY7QUFzQkFWLElBQUFBLEVBQUUsQ0FBQywwQkFBRCxFQUE2QixNQUFNO0FBQ25DWCxNQUFBQSxFQUFFLENBQUNpRCxJQUFILENBQVFpQixRQUFSLENBQWlCO0FBQ2ZULFFBQUFBLE9BQU8sRUFBRSxJQURNO0FBRWZjLFFBQUFBLFVBQVUsRUFBRSxDQUNWLENBQUMsT0FBRCxFQUFVLE9BQVYsRUFBbUIsT0FBbkIsRUFBNEIsT0FBNUIsQ0FEVTtBQUZHLE9BQWpCLEVBS0doRCxPQUxILENBS1dDLE9BQU8sQ0FBQ0MsT0FBUixDQUFnQjtBQUN6QmtDLFFBQUFBLE9BQU8sRUFBRTtBQUNQNkIsVUFBQUEsRUFBRSxFQUFFLENBQUM7QUFDSGpCLFlBQUFBLFVBQVUsRUFBRSxDQUNWLENBQUM7QUFDQ0UsY0FBQUEsS0FBSyxFQUFFO0FBRFIsYUFBRCxFQUVHO0FBQ0RBLGNBQUFBLEtBQUssRUFBRTtBQUROLGFBRkgsRUFJRztBQUNEQSxjQUFBQSxLQUFLLEVBQUU7QUFETixhQUpILEVBTUc7QUFDREEsY0FBQUEsS0FBSyxFQUFFO0FBRE4sYUFOSCxDQURVO0FBRFQsV0FBRDtBQURHO0FBRGdCLE9BQWhCLENBTFg7QUFzQkF6RSxNQUFBQSxFQUFFLENBQUN1RCxXQUFILEdBQWlCLENBQUMsSUFBRCxDQUFqQjtBQUVBLGFBQU92RCxFQUFFLENBQUM0QixRQUFILENBQVk7QUFDakI2RCxRQUFBQSxLQUFLLEVBQUUsT0FEVTtBQUVqQkMsUUFBQUEsS0FBSyxFQUFFO0FBRlUsT0FBWixFQUdKekQsSUFISSxDQUdDLE1BQU07QUFDWmhCLFFBQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQ3VGLFFBQUosQ0FBTixDQUFvQm5FLEVBQXBCLENBQXVCK0IsSUFBdkIsQ0FBNEI5QixLQUE1QixDQUFrQztBQUNoQ3NFLFVBQUFBLEtBQUssRUFBRSxPQUR5QjtBQUVoQ0MsVUFBQUEsS0FBSyxFQUFFO0FBRnlCLFNBQWxDO0FBSUQsT0FSTSxDQUFQO0FBU0QsS0FsQ0MsQ0FBRjtBQW1DRCxHQXpFTyxDQUFSO0FBMkVBN0YsRUFBQUEsUUFBUSxDQUFDLGdCQUFELEVBQW1CLE1BQU07QUFDL0JFLElBQUFBLFVBQVUsQ0FBQyxNQUFNO0FBQ2ZXLE1BQUFBLEtBQUssQ0FBQ0MsSUFBTixDQUFXYixFQUFYLEVBQWUsTUFBZjtBQUNELEtBRlMsQ0FBVjtBQUlBVyxJQUFBQSxFQUFFLENBQUMsdUNBQUQsRUFBMEMsTUFBTTtBQUNoRFgsTUFBQUEsRUFBRSxDQUFDaUQsSUFBSCxDQUFRaUIsUUFBUixDQUFpQjtBQUNmVCxRQUFBQSxPQUFPLEVBQUUsTUFETTtBQUVmYyxRQUFBQSxVQUFVLEVBQUUsQ0FBQyxFQUFELEVBQUssR0FBTDtBQUZHLE9BQWpCLEVBR0doRCxPQUhILENBR1dDLE9BQU8sQ0FBQ0MsT0FBUixDQUFnQjtBQUN6QmtDLFFBQUFBLE9BQU8sRUFBRTtBQUNQa0MsVUFBQUEsSUFBSSxFQUFFLENBQUMsS0FBRDtBQURDO0FBRGdCLE9BQWhCLENBSFg7QUFTQTdGLE1BQUFBLEVBQUUsQ0FBQ2lELElBQUgsQ0FBUWlCLFFBQVIsQ0FBaUI7QUFDZlQsUUFBQUEsT0FBTyxFQUFFLE1BRE07QUFFZmMsUUFBQUEsVUFBVSxFQUFFLENBQUMsRUFBRCxFQUFLLEdBQUw7QUFGRyxPQUFqQixFQUdHaEQsT0FISCxDQUdXQyxPQUFPLENBQUNDLE9BQVIsQ0FBZ0I7QUFDekJrQyxRQUFBQSxPQUFPLEVBQUU7QUFDUG1DLFVBQUFBLElBQUksRUFBRSxDQUFDLEtBQUQ7QUFEQztBQURnQixPQUFoQixDQUhYO0FBU0EsYUFBTzlGLEVBQUUsQ0FBQytGLGFBQUgsR0FBbUI5RCxJQUFuQixDQUF5QitELElBQUQsSUFBVTtBQUN2Qy9FLFFBQUFBLE1BQU0sQ0FBQytFLElBQUQsQ0FBTixDQUFhNUUsRUFBYixDQUFnQnNCLEtBQWhCO0FBQ0QsT0FGTSxDQUFQO0FBR0QsS0F0QkMsQ0FBRjtBQXdCQS9CLElBQUFBLEVBQUUsQ0FBQyxrQ0FBRCxFQUFxQyxNQUFNO0FBQzNDWCxNQUFBQSxFQUFFLENBQUNpRCxJQUFILENBQVFpQixRQUFSLENBQWlCO0FBQ2ZULFFBQUFBLE9BQU8sRUFBRSxNQURNO0FBRWZjLFFBQUFBLFVBQVUsRUFBRSxDQUFDLEVBQUQsRUFBSyxHQUFMO0FBRkcsT0FBakIsRUFHR2hELE9BSEgsQ0FHV0MsT0FBTyxDQUFDQyxPQUFSLENBQWdCO0FBQ3pCa0MsUUFBQUEsT0FBTyxFQUFFO0FBQ1BrQyxVQUFBQSxJQUFJLEVBQUUsQ0FDSixnQ0FBTywwQkFBYSxvQ0FBYixDQUFQLENBREk7QUFEQztBQURnQixPQUFoQixDQUhYO0FBV0E3RixNQUFBQSxFQUFFLENBQUNpRCxJQUFILENBQVFpQixRQUFSLENBQWlCO0FBQ2ZULFFBQUFBLE9BQU8sRUFBRSxNQURNO0FBRWZjLFFBQUFBLFVBQVUsRUFBRSxDQUFDLEVBQUQsRUFBSyxHQUFMO0FBRkcsT0FBakIsRUFHR2hELE9BSEgsQ0FHV0MsT0FBTyxDQUFDQyxPQUFSLENBQWdCO0FBQ3pCa0MsUUFBQUEsT0FBTyxFQUFFO0FBQ1BtQyxVQUFBQSxJQUFJLEVBQUUsQ0FDSixnQ0FBTywwQkFBYSxvQ0FBYixDQUFQLENBREk7QUFEQztBQURnQixPQUFoQixDQUhYO0FBV0EsYUFBTzlGLEVBQUUsQ0FBQytGLGFBQUgsR0FBbUI5RCxJQUFuQixDQUF5QitELElBQUQsSUFBVTtBQUN2Qy9FLFFBQUFBLE1BQU0sQ0FBQytFLElBQUQsQ0FBTixDQUFhNUUsRUFBYixDQUFnQnNCLEtBQWhCO0FBQ0QsT0FGTSxDQUFQO0FBR0QsS0ExQkMsQ0FBRjtBQTJCRCxHQXhETyxDQUFSO0FBMERBM0MsRUFBQUEsUUFBUSxDQUFDLGdCQUFELEVBQW1CLE1BQU07QUFDL0JFLElBQUFBLFVBQVUsQ0FBQyxNQUFNO0FBQ2ZXLE1BQUFBLEtBQUssQ0FBQ0MsSUFBTixDQUFXYixFQUFYLEVBQWUsTUFBZjtBQUNELEtBRlMsQ0FBVjtBQUlBVyxJQUFBQSxFQUFFLENBQUMsMENBQUQsRUFBNkMsTUFBTTtBQUNuRDtBQUNBO0FBQ0E7QUFDQVgsTUFBQUEsRUFBRSxDQUFDaUQsSUFBSCxDQUFRaUIsUUFBUixDQUFpQjtBQUNmVCxRQUFBQSxPQUFPLEVBQUUsUUFETTtBQUVmYyxRQUFBQSxVQUFVLEVBQUUsQ0FBQyxhQUFEO0FBRkcsT0FBakIsRUFHR2hELE9BSEgsQ0FHV0MsT0FBTyxDQUFDQyxPQUFSLEVBSFg7QUFLQSxhQUFPekIsRUFBRSxDQUFDaUcsYUFBSCxDQUFpQixhQUFqQixFQUFnQ2hFLElBQWhDLENBQXFDLE1BQU07QUFDaERoQixRQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUNpRCxJQUFILENBQVE5QixTQUFULENBQU4sQ0FBMEJDLEVBQTFCLENBQTZCQyxLQUE3QixDQUFtQyxDQUFuQztBQUNELE9BRk0sQ0FBUDtBQUdELEtBWkMsQ0FBRjtBQWNBVixJQUFBQSxFQUFFLENBQUMsdUNBQUQsRUFBMEMsTUFBTTtBQUNoRDtBQUNBWCxNQUFBQSxFQUFFLENBQUNpRCxJQUFILENBQVFpQixRQUFSLENBQWlCO0FBQ2ZULFFBQUFBLE9BQU8sRUFBRSxRQURNO0FBRWZjLFFBQUFBLFVBQVUsRUFBRSxDQUFDLGlDQUFEO0FBRkcsT0FBakIsRUFHR2hELE9BSEgsQ0FHV0MsT0FBTyxDQUFDQyxPQUFSLEVBSFg7QUFLQSxhQUFPekIsRUFBRSxDQUFDaUcsYUFBSCxDQUFpQiw2Q0FBakIsRUFBZ0VoRSxJQUFoRSxDQUFxRSxNQUFNO0FBQ2hGaEIsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDaUQsSUFBSCxDQUFROUIsU0FBVCxDQUFOLENBQTBCQyxFQUExQixDQUE2QkMsS0FBN0IsQ0FBbUMsQ0FBbkM7QUFDRCxPQUZNLENBQVA7QUFHRCxLQVZDLENBQUY7QUFZQVYsSUFBQUEsRUFBRSxDQUFDLG1EQUFELEVBQXNELE1BQU07QUFDNUQsVUFBSXVGLE9BQU8sR0FBRztBQUNaQyxRQUFBQSxJQUFJLEVBQUU7QUFETSxPQUFkO0FBR0FuRyxNQUFBQSxFQUFFLENBQUNpRCxJQUFILENBQVFpQixRQUFSLENBQWlCO0FBQ2ZULFFBQUFBLE9BQU8sRUFBRSxRQURNO0FBRWZjLFFBQUFBLFVBQVUsRUFBRSxDQUFDLGFBQUQ7QUFGRyxPQUFqQixFQUdHaEQsT0FISCxDQUdXQyxPQUFPLENBQUM0RSxNQUFSLENBQWVGLE9BQWYsQ0FIWDtBQUtBLGFBQU9sRyxFQUFFLENBQUNpRyxhQUFILENBQWlCLGFBQWpCLEVBQWdDaEUsSUFBaEMsQ0FBcUMsTUFBTTtBQUNoRGhCLFFBQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQ2lELElBQUgsQ0FBUTlCLFNBQVQsQ0FBTixDQUEwQkMsRUFBMUIsQ0FBNkJDLEtBQTdCLENBQW1DLENBQW5DO0FBQ0QsT0FGTSxDQUFQO0FBR0QsS0FaQyxDQUFGO0FBYUQsR0E1Q08sQ0FBUjtBQThDQXRCLEVBQUFBLFFBQVEsQ0FBQyxnQkFBRCxFQUFtQixNQUFNO0FBQy9CRSxJQUFBQSxVQUFVLENBQUMsTUFBTTtBQUNmVyxNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBWCxFQUFlLE1BQWY7QUFDRCxLQUZTLENBQVY7QUFJQVcsSUFBQUEsRUFBRSxDQUFDLDBDQUFELEVBQTZDLE1BQU07QUFDbkRYLE1BQUFBLEVBQUUsQ0FBQ2lELElBQUgsQ0FBUWlCLFFBQVIsQ0FBaUI7QUFDZlQsUUFBQUEsT0FBTyxFQUFFLFFBRE07QUFFZmMsUUFBQUEsVUFBVSxFQUFFLENBQUMsYUFBRDtBQUZHLE9BQWpCLEVBR0doRCxPQUhILENBR1dDLE9BQU8sQ0FBQ0MsT0FBUixFQUhYO0FBS0EsYUFBT3pCLEVBQUUsQ0FBQ3FHLGFBQUgsQ0FBaUIsYUFBakIsRUFBZ0NwRSxJQUFoQyxDQUFxQyxNQUFNO0FBQ2hEaEIsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDaUQsSUFBSCxDQUFROUIsU0FBVCxDQUFOLENBQTBCQyxFQUExQixDQUE2QkMsS0FBN0IsQ0FBbUMsQ0FBbkM7QUFDRCxPQUZNLENBQVA7QUFHRCxLQVRDLENBQUY7QUFXQVYsSUFBQUEsRUFBRSxDQUFDLHVDQUFELEVBQTBDLE1BQU07QUFDaEQ7QUFDQVgsTUFBQUEsRUFBRSxDQUFDaUQsSUFBSCxDQUFRaUIsUUFBUixDQUFpQjtBQUNmVCxRQUFBQSxPQUFPLEVBQUUsUUFETTtBQUVmYyxRQUFBQSxVQUFVLEVBQUUsQ0FBQyxpQ0FBRDtBQUZHLE9BQWpCLEVBR0doRCxPQUhILENBR1dDLE9BQU8sQ0FBQ0MsT0FBUixFQUhYO0FBS0EsYUFBT3pCLEVBQUUsQ0FBQ3FHLGFBQUgsQ0FBaUIsNkNBQWpCLEVBQWdFcEUsSUFBaEUsQ0FBcUUsTUFBTTtBQUNoRmhCLFFBQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQ2lELElBQUgsQ0FBUTlCLFNBQVQsQ0FBTixDQUEwQkMsRUFBMUIsQ0FBNkJDLEtBQTdCLENBQW1DLENBQW5DO0FBQ0QsT0FGTSxDQUFQO0FBR0QsS0FWQyxDQUFGO0FBV0QsR0EzQk8sQ0FBUjtBQTZCQXRCLEVBQUFBLFFBQVEsQ0FBQ3VHLElBQVQsQ0FBYyxlQUFkLEVBQStCLE1BQU07QUFDbkNyRyxJQUFBQSxVQUFVLENBQUMsTUFBTTtBQUNmVyxNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBWCxFQUFlLE1BQWY7QUFDQVksTUFBQUEsS0FBSyxDQUFDQyxJQUFOLENBQVdiLEVBQVgsRUFBZSxvQkFBZjtBQUNBWSxNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBWCxFQUFlLGFBQWY7QUFDRCxLQUpTLENBQVY7QUFNQVcsSUFBQUEsRUFBRSxDQUFDLG1CQUFELEVBQXNCLE1BQU07QUFDNUJYLE1BQUFBLEVBQUUsQ0FBQ2lELElBQUgsQ0FBUTFCLE9BQVIsQ0FBZ0JDLE9BQU8sQ0FBQ0MsT0FBUixDQUFnQixLQUFoQixDQUFoQjs7QUFDQXpCLE1BQUFBLEVBQUUsQ0FBQ3VHLGtCQUFILENBQXNCckMsUUFBdEIsQ0FBK0IsQ0FBQyxLQUFELEVBQVEsQ0FBQyxLQUFELEVBQVEsT0FBUixDQUFSLEVBQTBCO0FBQ3ZEc0MsUUFBQUEsS0FBSyxFQUFFO0FBRGdELE9BQTFCLENBQS9CLEVBRUlqRixPQUZKLENBRVksRUFGWjs7QUFJQSxhQUFPdkIsRUFBRSxDQUFDeUcsWUFBSCxDQUFnQixPQUFoQixFQUF5QixLQUF6QixFQUFnQyxDQUFDLEtBQUQsRUFBUSxPQUFSLENBQWhDLEVBQWtEO0FBQ3ZERCxRQUFBQSxLQUFLLEVBQUU7QUFEZ0QsT0FBbEQsRUFFSnZFLElBRkksQ0FFQyxNQUFNO0FBQ1poQixRQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUN1RyxrQkFBSCxDQUFzQnBGLFNBQXZCLENBQU4sQ0FBd0NDLEVBQXhDLENBQTJDQyxLQUEzQyxDQUFpRCxDQUFqRDtBQUNBSixRQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUMwRyxXQUFILENBQWV4QyxRQUFmLENBQXdCLEtBQXhCLEVBQStCL0MsU0FBaEMsQ0FBTixDQUFpREMsRUFBakQsQ0FBb0RDLEtBQXBELENBQTBELENBQTFEO0FBQ0QsT0FMTSxDQUFQO0FBTUQsS0FaQyxDQUFGO0FBYUQsR0FwQkQ7QUFzQkF0QixFQUFBQSxRQUFRLENBQUN1RyxJQUFULENBQWMsU0FBZCxFQUF5QixNQUFNO0FBQzdCckcsSUFBQUEsVUFBVSxDQUFDLE1BQU07QUFDZlcsTUFBQUEsS0FBSyxDQUFDQyxJQUFOLENBQVdiLEVBQVgsRUFBZSxNQUFmO0FBQ0FZLE1BQUFBLEtBQUssQ0FBQ0MsSUFBTixDQUFXYixFQUFYLEVBQWUscUJBQWY7QUFDQVksTUFBQUEsS0FBSyxDQUFDQyxJQUFOLENBQVdiLEVBQVgsRUFBZSxjQUFmO0FBQ0QsS0FKUyxDQUFWO0FBTUFXLElBQUFBLEVBQUUsQ0FBQyxvQkFBRCxFQUF1QixNQUFNO0FBQzdCWCxNQUFBQSxFQUFFLENBQUNpRCxJQUFILENBQVExQixPQUFSLENBQWdCQyxPQUFPLENBQUNDLE9BQVIsQ0FBZ0IsS0FBaEIsQ0FBaEI7O0FBQ0F6QixNQUFBQSxFQUFFLENBQUMyRyxtQkFBSCxDQUF1QnpDLFFBQXZCLENBQWdDO0FBQzlCMEMsUUFBQUEsR0FBRyxFQUFFO0FBRHlCLE9BQWhDLEVBRUc7QUFDREosUUFBQUEsS0FBSyxFQUFFO0FBRE4sT0FGSCxFQUlHakYsT0FKSCxDQUlXLEVBSlg7O0FBTUEsYUFBT3ZCLEVBQUUsQ0FBQzZHLE1BQUgsQ0FBVSxPQUFWLEVBQW1CO0FBQ3hCRCxRQUFBQSxHQUFHLEVBQUU7QUFEbUIsT0FBbkIsRUFFSjtBQUNESixRQUFBQSxLQUFLLEVBQUU7QUFETixPQUZJLEVBSUp2RSxJQUpJLENBSUMsTUFBTTtBQUNaaEIsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDMkcsbUJBQUgsQ0FBdUJ4RixTQUF4QixDQUFOLENBQXlDQyxFQUF6QyxDQUE0Q0MsS0FBNUMsQ0FBa0QsQ0FBbEQ7QUFDQUosUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDaUQsSUFBSCxDQUFROUIsU0FBVCxDQUFOLENBQTBCQyxFQUExQixDQUE2QkMsS0FBN0IsQ0FBbUMsQ0FBbkM7QUFDQUosUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDOEcsWUFBSCxDQUFnQjVDLFFBQWhCLENBQXlCLEtBQXpCLEVBQWdDL0MsU0FBakMsQ0FBTixDQUFrREMsRUFBbEQsQ0FBcURDLEtBQXJELENBQTJELENBQTNEO0FBQ0QsT0FSTSxDQUFQO0FBU0QsS0FqQkMsQ0FBRjtBQWtCRCxHQXpCRDtBQTJCQXRCLEVBQUFBLFFBQVEsQ0FBQyxTQUFELEVBQVksTUFBTTtBQUN4QkUsSUFBQUEsVUFBVSxDQUFDLE1BQU07QUFDZlcsTUFBQUEsS0FBSyxDQUFDQyxJQUFOLENBQVdiLEVBQVgsRUFBZSxNQUFmO0FBQ0QsS0FGUyxDQUFWO0FBSUFXLElBQUFBLEVBQUUsQ0FBQyxxQ0FBRCxFQUF3QyxNQUFNO0FBQzlDWCxNQUFBQSxFQUFFLENBQUNpRCxJQUFILENBQVExQixPQUFSLENBQWdCQyxPQUFPLENBQUNDLE9BQVIsRUFBaEI7QUFFQSxhQUFPekIsRUFBRSxDQUFDK0csTUFBSCxDQUFVLFNBQVYsRUFBcUIsbUJBQXJCLEVBQTBDO0FBQy9DQyxRQUFBQSxLQUFLLEVBQUUsQ0FBQyxXQUFEO0FBRHdDLE9BQTFDLEVBRUovRSxJQUZJLENBRUMsTUFBTTtBQUNaaEIsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDaUQsSUFBSCxDQUFROUIsU0FBVCxDQUFOLENBQTBCQyxFQUExQixDQUE2QkMsS0FBN0IsQ0FBbUMsQ0FBbkM7QUFDRCxPQUpNLENBQVA7QUFLRCxLQVJDLENBQUY7QUFVQVYsSUFBQUEsRUFBRSxDQUFDLDhCQUFELEVBQWlDLE1BQU07QUFDdkNYLE1BQUFBLEVBQUUsQ0FBQ2lELElBQUgsQ0FBUTFCLE9BQVIsQ0FBZ0JDLE9BQU8sQ0FBQ0MsT0FBUixFQUFoQjtBQUVBLGFBQU96QixFQUFFLENBQUMrRyxNQUFILENBQVUsU0FBVixFQUFxQixtQkFBckIsRUFBMEM5RSxJQUExQyxDQUErQyxNQUFNO0FBQzFEaEIsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDaUQsSUFBSCxDQUFROUIsU0FBVCxDQUFOLENBQTBCQyxFQUExQixDQUE2QkMsS0FBN0IsQ0FBbUMsQ0FBbkM7QUFDRCxPQUZNLENBQVA7QUFHRCxLQU5DLENBQUY7QUFPRCxHQXRCTyxDQUFSO0FBd0JBdEIsRUFBQUEsUUFBUSxDQUFDdUcsSUFBVCxDQUFjLFdBQWQsRUFBMkIsTUFBTTtBQUMvQnJHLElBQUFBLFVBQVUsQ0FBQyxNQUFNO0FBQ2ZXLE1BQUFBLEtBQUssQ0FBQ0MsSUFBTixDQUFXYixFQUFYLEVBQWUsTUFBZjtBQUNBWSxNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBWCxFQUFlLG9CQUFmO0FBQ0FZLE1BQUFBLEtBQUssQ0FBQ0MsSUFBTixDQUFXYixFQUFYLEVBQWUsYUFBZjtBQUNELEtBSlMsQ0FBVjtBQU1BVyxJQUFBQSxFQUFFLENBQUMsbUJBQUQsRUFBc0IsTUFBTTtBQUM1QlgsTUFBQUEsRUFBRSxDQUFDaUQsSUFBSCxDQUFRMUIsT0FBUixDQUFnQkMsT0FBTyxDQUFDQyxPQUFSLENBQWdCLEtBQWhCLENBQWhCOztBQUNBekIsTUFBQUEsRUFBRSxDQUFDaUgsa0JBQUgsQ0FBc0IvQyxRQUF0QixDQUErQixLQUEvQixFQUFzQyxPQUF0QyxFQUErQyxDQUFDLFFBQUQsRUFBVyxTQUFYLENBQS9DLEVBQXNFO0FBQ3BFc0MsUUFBQUEsS0FBSyxFQUFFO0FBRDZELE9BQXRFLEVBRUdqRixPQUZILENBRVcsRUFGWDs7QUFJQSxhQUFPdkIsRUFBRSxDQUFDa0gsUUFBSCxDQUFZLE9BQVosRUFBcUIsS0FBckIsRUFBNEIsQ0FBQyxRQUFELEVBQVcsU0FBWCxDQUE1QixFQUFtRDtBQUN4RFYsUUFBQUEsS0FBSyxFQUFFO0FBRGlELE9BQW5ELEVBRUp2RSxJQUZJLENBRUMsTUFBTTtBQUNaaEIsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDaUQsSUFBSCxDQUFROUIsU0FBVCxDQUFOLENBQTBCQyxFQUExQixDQUE2QkMsS0FBN0IsQ0FBbUMsQ0FBbkM7QUFDQUosUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDMEcsV0FBSCxDQUFleEMsUUFBZixDQUF3QixLQUF4QixFQUErQi9DLFNBQWhDLENBQU4sQ0FBaURDLEVBQWpELENBQW9EQyxLQUFwRCxDQUEwRCxDQUExRDtBQUNELE9BTE0sQ0FBUDtBQU1ELEtBWkMsQ0FBRjtBQWFELEdBcEJEO0FBc0JBdEIsRUFBQUEsUUFBUSxDQUFDdUcsSUFBVCxDQUFjLFFBQWQsRUFBd0IsTUFBTTtBQUM1QnJHLElBQUFBLFVBQVUsQ0FBQyxNQUFNO0FBQ2ZXLE1BQUFBLEtBQUssQ0FBQ0MsSUFBTixDQUFXYixFQUFYLEVBQWUsTUFBZjtBQUNBWSxNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBWCxFQUFlLG9CQUFmO0FBQ0FZLE1BQUFBLEtBQUssQ0FBQ0MsSUFBTixDQUFXYixFQUFYLEVBQWUsYUFBZjtBQUNELEtBSlMsQ0FBVjtBQU1BVyxJQUFBQSxFQUFFLENBQUMsbUJBQUQsRUFBc0IsTUFBTTtBQUM1QlgsTUFBQUEsRUFBRSxDQUFDaUQsSUFBSCxDQUFRMUIsT0FBUixDQUFnQkMsT0FBTyxDQUFDQyxPQUFSLENBQWdCLEtBQWhCLENBQWhCOztBQUNBekIsTUFBQUEsRUFBRSxDQUFDaUgsa0JBQUgsQ0FBc0IvQyxRQUF0QixDQUErQixLQUEvQixFQUFzQyxjQUF0QyxFQUFzRCxDQUFDLFFBQUQsRUFBVyxRQUFYLENBQXRELEVBQTRFO0FBQzFFc0MsUUFBQUEsS0FBSyxFQUFFO0FBRG1FLE9BQTVFLEVBRUdqRixPQUZILENBRVcsRUFGWDs7QUFJQSxhQUFPdkIsRUFBRSxDQUFDbUgsS0FBSCxDQUFTLE9BQVQsRUFBa0IsS0FBbEIsRUFBeUIsY0FBekIsRUFBeUMsQ0FBQyxRQUFELEVBQVcsUUFBWCxDQUF6QyxFQUErRDtBQUNwRVgsUUFBQUEsS0FBSyxFQUFFO0FBRDZELE9BQS9ELEVBRUp2RSxJQUZJLENBRUMsTUFBTTtBQUNaaEIsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDaUgsa0JBQUgsQ0FBc0I5RixTQUF2QixDQUFOLENBQXdDQyxFQUF4QyxDQUEyQ0MsS0FBM0MsQ0FBaUQsQ0FBakQ7QUFDQUosUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDaUQsSUFBSCxDQUFROUIsU0FBVCxDQUFOLENBQTBCQyxFQUExQixDQUE2QkMsS0FBN0IsQ0FBbUMsQ0FBbkM7QUFDQUosUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDMEcsV0FBSCxDQUFleEMsUUFBZixDQUF3QixLQUF4QixFQUErQi9DLFNBQWhDLENBQU4sQ0FBaURDLEVBQWpELENBQW9EQyxLQUFwRCxDQUEwRCxDQUExRDtBQUNELE9BTk0sQ0FBUDtBQU9ELEtBYkMsQ0FBRjtBQWNELEdBckJEO0FBdUJBdEIsRUFBQUEsUUFBUSxDQUFDLGlCQUFELEVBQW9CLE1BQU07QUFDaENFLElBQUFBLFVBQVUsQ0FBQyxNQUFNO0FBQ2ZXLE1BQUFBLEtBQUssQ0FBQ0MsSUFBTixDQUFXYixFQUFYLEVBQWUsVUFBZjtBQUNBWSxNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBWCxFQUFlLE1BQWY7QUFDRCxLQUhTLENBQVY7QUFLQVcsSUFBQUEsRUFBRSxDQUFDLHlCQUFELEVBQTRCLE1BQU07QUFDbENYLE1BQUFBLEVBQUUsQ0FBQ2lELElBQUgsQ0FBUWlCLFFBQVIsQ0FBaUI7QUFDZlQsUUFBQUEsT0FBTyxFQUFFLGFBRE07QUFFZmMsUUFBQUEsVUFBVSxFQUFFLENBQUM7QUFDWEMsVUFBQUEsSUFBSSxFQUFFLFVBREs7QUFFWEMsVUFBQUEsS0FBSyxFQUFFO0FBRkksU0FBRDtBQUZHLE9BQWpCLEVBTUdsRCxPQU5ILENBTVdDLE9BQU8sQ0FBQ0MsT0FBUixDQUFnQixLQUFoQixDQU5YO0FBT0F6QixNQUFBQSxFQUFFLENBQUNrSCxRQUFILENBQVloRCxRQUFaLENBQXFCLE9BQXJCLEVBQThCLEtBQTlCLEVBQXFDO0FBQ25Da0QsUUFBQUEsR0FBRyxFQUFFO0FBRDhCLE9BQXJDLEVBRUc3RixPQUZILENBRVdDLE9BQU8sQ0FBQ0MsT0FBUixFQUZYO0FBSUF6QixNQUFBQSxFQUFFLENBQUN1RCxXQUFILEdBQWlCLENBQUMsU0FBRCxDQUFqQjtBQUNBLGFBQU92RCxFQUFFLENBQUNxSCxjQUFILENBQWtCLE9BQWxCLEVBQTJCLEtBQTNCLEVBQWtDO0FBQ3ZDYixRQUFBQSxLQUFLLEVBQUU7QUFEZ0MsT0FBbEMsRUFFSnZFLElBRkksQ0FFQyxNQUFNO0FBQ1poQixRQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUNpRCxJQUFILENBQVE5QixTQUFULENBQU4sQ0FBMEJDLEVBQTFCLENBQTZCQyxLQUE3QixDQUFtQyxDQUFuQztBQUNELE9BSk0sQ0FBUDtBQUtELEtBbEJDLENBQUY7QUFvQkFWLElBQUFBLEVBQUUsQ0FBQyxxQkFBRCxFQUF3QixNQUFNO0FBQzlCWCxNQUFBQSxFQUFFLENBQUNpRCxJQUFILENBQVFpQixRQUFSLENBQWlCLFNBQWpCLEVBQTRCM0MsT0FBNUIsQ0FBb0NDLE9BQU8sQ0FBQ0MsT0FBUixDQUFnQixLQUFoQixDQUFwQztBQUNBekIsTUFBQUEsRUFBRSxDQUFDa0gsUUFBSCxDQUFZaEQsUUFBWixDQUFxQixPQUFyQixFQUE4QixLQUE5QixFQUFxQztBQUNuQ2tELFFBQUFBLEdBQUcsRUFBRTtBQUQ4QixPQUFyQyxFQUVHN0YsT0FGSCxDQUVXQyxPQUFPLENBQUNDLE9BQVIsRUFGWDtBQUlBekIsTUFBQUEsRUFBRSxDQUFDdUQsV0FBSCxHQUFpQixFQUFqQjtBQUNBLGFBQU92RCxFQUFFLENBQUNxSCxjQUFILENBQWtCLE9BQWxCLEVBQTJCLEtBQTNCLEVBQWtDO0FBQ3ZDYixRQUFBQSxLQUFLLEVBQUU7QUFEZ0MsT0FBbEMsRUFFSnZFLElBRkksQ0FFQyxNQUFNO0FBQ1poQixRQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUNpRCxJQUFILENBQVE5QixTQUFULENBQU4sQ0FBMEJDLEVBQTFCLENBQTZCQyxLQUE3QixDQUFtQyxDQUFuQztBQUNELE9BSk0sQ0FBUDtBQUtELEtBWkMsQ0FBRjtBQWFELEdBdkNPLENBQVI7QUF5Q0F0QixFQUFBQSxRQUFRLENBQUMsZUFBRCxFQUFrQixNQUFNO0FBQzlCRSxJQUFBQSxVQUFVLENBQUMsTUFBTTtBQUNmVyxNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBWCxFQUFlLE1BQWY7QUFDRCxLQUZTLENBQVY7QUFJQVcsSUFBQUEsRUFBRSxDQUFDLGtCQUFELEVBQXFCLE1BQU07QUFDM0JYLE1BQUFBLEVBQUUsQ0FBQ2lELElBQUgsQ0FBUWlCLFFBQVIsQ0FBaUI7QUFDZlQsUUFBQUEsT0FBTyxFQUFFLFVBRE07QUFFZmMsUUFBQUEsVUFBVSxFQUFFLENBQUM7QUFDWEMsVUFBQUEsSUFBSSxFQUFFLFVBREs7QUFFWEMsVUFBQUEsS0FBSyxFQUFFO0FBRkksU0FBRCxFQUdUO0FBQ0RELFVBQUFBLElBQUksRUFBRSxNQURMO0FBRURDLFVBQUFBLEtBQUssRUFBRTtBQUZOLFNBSFM7QUFGRyxPQUFqQixFQVNHbEQsT0FUSCxDQVNXQyxPQUFPLENBQUNDLE9BQVIsQ0FBZ0I7QUFDekI2RixRQUFBQSxhQUFhLEVBQUU7QUFEVSxPQUFoQixDQVRYO0FBYUEsYUFBT3RILEVBQUUsQ0FBQ3VILFlBQUgsQ0FBZ0IsT0FBaEIsRUFBeUIsS0FBekIsRUFBZ0MsZUFBaEMsRUFBaUQ7QUFDdERmLFFBQUFBLEtBQUssRUFBRTtBQUQrQyxPQUFqRCxFQUVKdkUsSUFGSSxDQUVFdUYsUUFBRCxJQUFjO0FBQ3BCdkcsUUFBQUEsTUFBTSxDQUFDdUcsUUFBRCxDQUFOLENBQWlCcEcsRUFBakIsQ0FBb0JDLEtBQXBCLENBQTBCLEtBQTFCO0FBQ0FKLFFBQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQ2lELElBQUgsQ0FBUTlCLFNBQVQsQ0FBTixDQUEwQkMsRUFBMUIsQ0FBNkJDLEtBQTdCLENBQW1DLENBQW5DO0FBQ0QsT0FMTSxDQUFQO0FBTUQsS0FwQkMsQ0FBRjtBQXFCRCxHQTFCTyxDQUFSO0FBNEJBdEIsRUFBQUEsUUFBUSxDQUFDLGVBQUQsRUFBa0IsTUFBTTtBQUM5QkUsSUFBQUEsVUFBVSxDQUFDLE1BQU07QUFDZlcsTUFBQUEsS0FBSyxDQUFDQyxJQUFOLENBQVdiLEVBQVgsRUFBZSxNQUFmO0FBQ0FZLE1BQUFBLEtBQUssQ0FBQ0MsSUFBTixDQUFXYixFQUFYLEVBQWUsY0FBZjtBQUNBWSxNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBWCxFQUFlLGdCQUFmO0FBQ0QsS0FKUyxDQUFWO0FBTUFXLElBQUFBLEVBQUUsQ0FBQywrQkFBRCxFQUFrQyxNQUFNO0FBQ3hDWCxNQUFBQSxFQUFFLENBQUNpRCxJQUFILENBQVFpQixRQUFSLENBQWlCO0FBQ2ZULFFBQUFBLE9BQU8sRUFBRSxVQURNO0FBRWZjLFFBQUFBLFVBQVUsRUFBRSxDQUFDO0FBQ1hDLFVBQUFBLElBQUksRUFBRSxVQURLO0FBRVhDLFVBQUFBLEtBQUssRUFBRTtBQUZJLFNBQUQsRUFHVDtBQUNERCxVQUFBQSxJQUFJLEVBQUUsTUFETDtBQUVEQyxVQUFBQSxLQUFLLEVBQUU7QUFGTixTQUhTO0FBRkcsT0FBakIsRUFTRyxDQUFDLElBQUQsQ0FUSCxFQVNXbEQsT0FUWCxDQVNtQkMsT0FBTyxDQUFDQyxPQUFSLENBQWdCLEtBQWhCLENBVG5CO0FBV0F6QixNQUFBQSxFQUFFLENBQUN1RCxXQUFILEdBQWlCLENBQUMsTUFBRCxDQUFqQjtBQUNBLGFBQU92RCxFQUFFLENBQUN5SCxZQUFILENBQWdCLE9BQWhCLEVBQXlCLEtBQXpCLEVBQWdDLGVBQWhDLEVBQWlEO0FBQ3REakIsUUFBQUEsS0FBSyxFQUFFO0FBRCtDLE9BQWpELEVBRUp2RSxJQUZJLENBRUMsTUFBTTtBQUNaaEIsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDaUQsSUFBSCxDQUFROUIsU0FBVCxDQUFOLENBQTBCQyxFQUExQixDQUE2QkMsS0FBN0IsQ0FBbUMsQ0FBbkM7QUFDRCxPQUpNLENBQVA7QUFLRCxLQWxCQyxDQUFGO0FBb0JBVixJQUFBQSxFQUFFLENBQUMsaUNBQUQsRUFBb0MsTUFBTTtBQUMxQ1gsTUFBQUEsRUFBRSxDQUFDdUgsWUFBSCxDQUFnQnJELFFBQWhCLENBQXlCLE9BQXpCLEVBQWtDLEtBQWxDLEVBQXlDLGVBQXpDLEVBQTBEO0FBQ3hEc0MsUUFBQUEsS0FBSyxFQUFFO0FBRGlELE9BQTFELEVBRUdqRixPQUZILENBRVdDLE9BQU8sQ0FBQ0MsT0FBUixFQUZYO0FBR0F6QixNQUFBQSxFQUFFLENBQUNxSCxjQUFILENBQWtCbkQsUUFBbEIsQ0FBMkIsS0FBM0IsRUFBa0M7QUFDaENzQyxRQUFBQSxLQUFLLEVBQUU7QUFEeUIsT0FBbEMsRUFFR2pGLE9BRkgsQ0FFV0MsT0FBTyxDQUFDQyxPQUFSLEVBRlg7QUFJQXpCLE1BQUFBLEVBQUUsQ0FBQ3VELFdBQUgsR0FBaUIsRUFBakI7QUFDQSxhQUFPdkQsRUFBRSxDQUFDeUgsWUFBSCxDQUFnQixPQUFoQixFQUF5QixLQUF6QixFQUFnQyxlQUFoQyxFQUFpRDtBQUN0RGpCLFFBQUFBLEtBQUssRUFBRTtBQUQrQyxPQUFqRCxFQUVKdkUsSUFGSSxDQUVDLE1BQU07QUFDWmhCLFFBQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQ3FILGNBQUgsQ0FBa0JsRyxTQUFuQixDQUFOLENBQW9DQyxFQUFwQyxDQUF1Q0MsS0FBdkMsQ0FBNkMsQ0FBN0M7QUFDRCxPQUpNLENBQVA7QUFLRCxLQWRDLENBQUY7QUFlRCxHQTFDTyxDQUFSO0FBNENBdEIsRUFBQUEsUUFBUSxDQUFDLHVCQUFELEVBQTBCLE1BQU07QUFDdENZLElBQUFBLEVBQUUsQ0FBQywwQ0FBRCxFQUE2QyxNQUFNO0FBQ25ETSxNQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUMwSCxvQkFBSCxDQUF3QixNQUF4QixDQUFELENBQU4sQ0FBd0N0RyxFQUF4QyxDQUEyQ2UsRUFBM0MsQ0FBOENDLElBQTlDO0FBQ0QsS0FGQyxDQUFGO0FBSUF6QixJQUFBQSxFQUFFLENBQUMsb0RBQUQsRUFBdUQsTUFBTTtBQUM3REMsTUFBQUEsS0FBSyxDQUFDQyxJQUFOLENBQVdiLEVBQUUsQ0FBQ08sTUFBZCxFQUFzQixxQkFBdEIsRUFBNkNnQixPQUE3QyxDQUFxRDtBQUNuRG9HLFFBQUFBLE9BQU8sRUFBRTtBQUNQbEUsVUFBQUEsT0FBTyxFQUFFLFFBREY7QUFFUGMsVUFBQUEsVUFBVSxFQUFFLENBQUM7QUFDWEMsWUFBQUEsSUFBSSxFQUFFLFFBREs7QUFFWEMsWUFBQUEsS0FBSyxFQUFFO0FBRkksV0FBRDtBQUZMO0FBRDBDLE9BQXJEO0FBVUF4RCxNQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUMwSCxvQkFBSCxDQUF3QixNQUF4QixFQUFnQyxFQUFoQyxDQUFELENBQU4sQ0FBNEN0RyxFQUE1QyxDQUErQ2UsRUFBL0MsQ0FBa0RDLElBQWxEO0FBQ0QsS0FaQyxDQUFGO0FBY0F6QixJQUFBQSxFQUFFLENBQUMsa0RBQUQsRUFBcUQsTUFBTTtBQUMzREMsTUFBQUEsS0FBSyxDQUFDQyxJQUFOLENBQVdiLEVBQUUsQ0FBQ08sTUFBZCxFQUFzQixxQkFBdEIsRUFBNkNnQixPQUE3QyxDQUFxRDtBQUNuRG9HLFFBQUFBLE9BQU8sRUFBRTtBQUNQbEUsVUFBQUEsT0FBTyxFQUFFLFFBREY7QUFFUGMsVUFBQUEsVUFBVSxFQUFFLENBQUM7QUFDWEMsWUFBQUEsSUFBSSxFQUFFLFFBREs7QUFFWEMsWUFBQUEsS0FBSyxFQUFFO0FBRkksV0FBRDtBQUZMO0FBRDBDLE9BQXJEO0FBVUF4RCxNQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUMwSCxvQkFBSCxDQUF3QixhQUF4QixFQUF1QyxFQUF2QyxDQUFELENBQU4sQ0FBbUR0RyxFQUFuRCxDQUFzRGUsRUFBdEQsQ0FBeURVLEtBQXpEO0FBQ0QsS0FaQyxDQUFGO0FBYUQsR0FoQ08sQ0FBUjtBQWtDQTlDLEVBQUFBLFFBQVEsQ0FBQyxnQkFBRCxFQUFtQixNQUFNO0FBQy9CLFVBQU02SCxJQUFJLEdBQUcsZUFBYjtBQUNBM0gsSUFBQUEsVUFBVSxDQUFDLE1BQU07QUFDZlcsTUFBQUEsS0FBSyxDQUFDQyxJQUFOLENBQVdiLEVBQVgsRUFBZSxNQUFmO0FBQ0QsS0FGUyxDQUFWO0FBSUFXLElBQUFBLEVBQUUsQ0FBQyxtQkFBRCxFQUFzQixNQUFNO0FBQzVCWCxNQUFBQSxFQUFFLENBQUNpRCxJQUFILENBQVFpQixRQUFSLENBQWlCO0FBQ2ZULFFBQUFBLE9BQU8sRUFBRSxRQURNO0FBRWZjLFFBQUFBLFVBQVUsRUFBRSxDQUFDO0FBQ1hDLFVBQUFBLElBQUksRUFBRSxRQURLO0FBRVhDLFVBQUFBLEtBQUssRUFBRW1EO0FBRkksU0FBRDtBQUZHLE9BQWpCLEVBTUdyRyxPQU5ILENBTVdDLE9BQU8sQ0FBQ0MsT0FBUixDQUFnQjtBQUN6QjBFLFFBQUFBLElBQUksRUFBRTtBQURtQixPQUFoQixDQU5YO0FBVUEsYUFBT25HLEVBQUUsQ0FBQzZILGFBQUgsQ0FBaUJELElBQWpCLEVBQXVCM0YsSUFBdkIsQ0FBNEIsTUFBTTtBQUN2Q2hCLFFBQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQ2lELElBQUgsQ0FBUTlCLFNBQVQsQ0FBTixDQUEwQkMsRUFBMUIsQ0FBNkJDLEtBQTdCLENBQW1DLENBQW5DO0FBQ0FKLFFBQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQytDLE1BQUosQ0FBTixDQUFrQjNCLEVBQWxCLENBQXFCQyxLQUFyQixDQUEyQnlHLHNCQUEzQjtBQUNELE9BSE0sQ0FBUDtBQUlELEtBZkMsQ0FBRjtBQWlCQW5ILElBQUFBLEVBQUUsQ0FBQyxrQ0FBRCxFQUFxQyxNQUFNO0FBQzNDWCxNQUFBQSxFQUFFLENBQUNpRCxJQUFILENBQVFpQixRQUFSLENBQWlCO0FBQ2ZULFFBQUFBLE9BQU8sRUFBRSxRQURNO0FBRWZjLFFBQUFBLFVBQVUsRUFBRSxDQUFDO0FBQ1hDLFVBQUFBLElBQUksRUFBRSxRQURLO0FBRVhDLFVBQUFBLEtBQUssRUFBRW1EO0FBRkksU0FBRCxFQUlaLENBQUM7QUFDQ3BELFVBQUFBLElBQUksRUFBRSxNQURQO0FBRUNDLFVBQUFBLEtBQUssRUFBRTtBQUZSLFNBQUQsQ0FKWTtBQUZHLE9BQWpCLEVBV0dsRCxPQVhILENBV1dDLE9BQU8sQ0FBQ0MsT0FBUixDQUFnQjtBQUN6QjBFLFFBQUFBLElBQUksRUFBRTtBQURtQixPQUFoQixDQVhYO0FBZUFuRyxNQUFBQSxFQUFFLENBQUN1RCxXQUFILEdBQWlCLENBQUMsV0FBRCxDQUFqQjtBQUNBLGFBQU92RCxFQUFFLENBQUM2SCxhQUFILENBQWlCRCxJQUFqQixFQUF1QjtBQUM1QkcsUUFBQUEsU0FBUyxFQUFFO0FBRGlCLE9BQXZCLEVBRUo5RixJQUZJLENBRUMsTUFBTTtBQUNaaEIsUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDaUQsSUFBSCxDQUFROUIsU0FBVCxDQUFOLENBQTBCQyxFQUExQixDQUE2QkMsS0FBN0IsQ0FBbUMsQ0FBbkM7QUFDQUosUUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDK0MsTUFBSixDQUFOLENBQWtCM0IsRUFBbEIsQ0FBcUJDLEtBQXJCLENBQTJCeUcsc0JBQTNCO0FBQ0QsT0FMTSxDQUFQO0FBTUQsS0F2QkMsQ0FBRjtBQXlCQS9ILElBQUFBLFFBQVEsQ0FBQyw4REFBRCxFQUFpRSxNQUFNO0FBQzdFRSxNQUFBQSxVQUFVLENBQUMsTUFBTTtBQUNmRCxRQUFBQSxFQUFFLENBQUNpRCxJQUFILENBQVExQixPQUFSLENBQWdCQyxPQUFPLENBQUNDLE9BQVIsQ0FBZ0I7QUFDOUIwRSxVQUFBQSxJQUFJLEVBQUU7QUFEd0IsU0FBaEIsQ0FBaEI7QUFHRCxPQUpTLENBQVY7QUFNQXhGLE1BQUFBLEVBQUUsQ0FBQywyQkFBRCxFQUE4QixNQUFNO0FBQ3BDLFlBQUlxSCxlQUFlLEdBQUcsS0FBdEI7O0FBQ0FoSSxRQUFBQSxFQUFFLENBQUNpSSxlQUFILEdBQXFCLE1BQU0sSUFBSXpHLE9BQUosQ0FBYUMsT0FBRCxJQUFhO0FBQ2xEQSxVQUFBQSxPQUFPO0FBQ1B1RyxVQUFBQSxlQUFlLEdBQUcsSUFBbEI7QUFDRCxTQUgwQixDQUEzQjs7QUFJQSxZQUFJRSxrQkFBa0IsR0FBR3RILEtBQUssQ0FBQ3VILEdBQU4sQ0FBVW5JLEVBQVYsRUFBYyxpQkFBZCxDQUF6QjtBQUNBLGVBQU9BLEVBQUUsQ0FBQzZILGFBQUgsQ0FBaUJELElBQWpCLEVBQXVCM0YsSUFBdkIsQ0FBNEIsTUFBTTtBQUN2Q2hCLFVBQUFBLE1BQU0sQ0FBQ2lILGtCQUFrQixDQUFDaEUsUUFBbkIsQ0FBNEIwRCxJQUE1QixFQUFrQ3pHLFNBQW5DLENBQU4sQ0FBb0RDLEVBQXBELENBQXVEQyxLQUF2RCxDQUE2RCxDQUE3RDtBQUNBSixVQUFBQSxNQUFNLENBQUMrRyxlQUFELENBQU4sQ0FBd0I1RyxFQUF4QixDQUEyQkMsS0FBM0IsQ0FBaUMsSUFBakM7QUFDRCxTQUhNLENBQVA7QUFJRCxPQVhDLENBQUY7QUFhQVYsTUFBQUEsRUFBRSxDQUFDLG1DQUFELEVBQXNDLE1BQU07QUFDNUNYLFFBQUFBLEVBQUUsQ0FBQ2lJLGVBQUgsR0FBcUIsTUFBTSxDQUFHLENBQTlCOztBQUNBLFlBQUlDLGtCQUFrQixHQUFHdEgsS0FBSyxDQUFDdUgsR0FBTixDQUFVbkksRUFBVixFQUFjLGlCQUFkLENBQXpCO0FBQ0EsZUFBT0EsRUFBRSxDQUFDNkgsYUFBSCxDQUFpQkQsSUFBakIsRUFBdUIzRixJQUF2QixDQUE0QixNQUFNO0FBQ3ZDaEIsVUFBQUEsTUFBTSxDQUFDaUgsa0JBQWtCLENBQUNoRSxRQUFuQixDQUE0QjBELElBQTVCLEVBQWtDekcsU0FBbkMsQ0FBTixDQUFvREMsRUFBcEQsQ0FBdURDLEtBQXZELENBQTZELENBQTdEO0FBQ0QsU0FGTSxDQUFQO0FBR0QsT0FOQyxDQUFGO0FBT0QsS0EzQk8sQ0FBUjtBQTZCQVYsSUFBQUEsRUFBRSxDQUFDLDRCQUFELEVBQStCLE1BQU07QUFDckMsVUFBSWlDLE1BQU0sR0FBRyxLQUFiO0FBQ0E1QyxNQUFBQSxFQUFFLENBQUNpRCxJQUFILENBQVExQixPQUFSLENBQWdCQyxPQUFPLENBQUNDLE9BQVIsQ0FBZ0IsS0FBaEIsQ0FBaEIsRUFBd0NGLE9BQXhDLENBQWdEQyxPQUFPLENBQUNDLE9BQVIsQ0FBZ0I7QUFDOUQwRSxRQUFBQSxJQUFJLEVBQUU7QUFEd0QsT0FBaEIsQ0FBaEQ7O0FBSUFuRyxNQUFBQSxFQUFFLENBQUNvSSxjQUFILEdBQXFCUixJQUFELElBQVU7QUFDNUIzRyxRQUFBQSxNQUFNLENBQUMyRyxJQUFELENBQU4sQ0FBYXhHLEVBQWIsQ0FBZ0JDLEtBQWhCLENBQXNCLEtBQXRCO0FBQ0F1QixRQUFBQSxNQUFNLEdBQUcsSUFBVDtBQUNELE9BSEQ7O0FBS0E1QyxNQUFBQSxFQUFFLENBQUNxSSxnQkFBSCxHQUFzQixLQUF0QjtBQUNBLGFBQU9ySSxFQUFFLENBQUM2SCxhQUFILENBQWlCRCxJQUFqQixFQUF1QjNGLElBQXZCLENBQTRCLE1BQU07QUFDdkNoQixRQUFBQSxNQUFNLENBQUMyQixNQUFELENBQU4sQ0FBZXhCLEVBQWYsQ0FBa0JlLEVBQWxCLENBQXFCQyxJQUFyQjtBQUNELE9BRk0sQ0FBUDtBQUdELEtBZkMsQ0FBRjtBQWdCRCxHQTdGTyxDQUFSO0FBK0ZBckMsRUFBQUEsUUFBUSxDQUFDLGdCQUFELEVBQW1CLE1BQU07QUFDL0JZLElBQUFBLEVBQUUsQ0FBQyxtQ0FBRCxFQUFzQyxNQUFNO0FBQzVDWCxNQUFBQSxFQUFFLENBQUN1RCxXQUFILEdBQWlCLENBQUMsS0FBRCxDQUFqQjtBQUNBdEMsTUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDc0ksYUFBSCxDQUFpQixLQUFqQixDQUFELENBQU4sQ0FBZ0NsSCxFQUFoQyxDQUFtQ2UsRUFBbkMsQ0FBc0NDLElBQXRDO0FBQ0QsS0FIQyxDQUFGO0FBS0F6QixJQUFBQSxFQUFFLENBQUMsdUNBQUQsRUFBMEMsTUFBTTtBQUNoRFgsTUFBQUEsRUFBRSxDQUFDdUQsV0FBSCxHQUFpQixDQUFDLEtBQUQsQ0FBakI7QUFDQXRDLE1BQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQ3NJLGFBQUgsQ0FBaUIsS0FBakIsQ0FBRCxDQUFOLENBQWdDbEgsRUFBaEMsQ0FBbUNlLEVBQW5DLENBQXNDVSxLQUF0QztBQUNBNUIsTUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDc0ksYUFBSCxFQUFELENBQU4sQ0FBMkJsSCxFQUEzQixDQUE4QmUsRUFBOUIsQ0FBaUNVLEtBQWpDO0FBQ0QsS0FKQyxDQUFGO0FBS0QsR0FYTyxDQUFSO0FBYUE5QyxFQUFBQSxRQUFRLENBQUMscUJBQUQsRUFBd0IsTUFBTTtBQUNwQ1ksSUFBQUEsRUFBRSxDQUFDLHFDQUFELEVBQXdDLE1BQU07QUFDOUNYLE1BQUFBLEVBQUUsQ0FBQ3VJLGtCQUFILENBQXNCO0FBQ3BCakYsUUFBQUEsVUFBVSxFQUFFLENBQUMsS0FBRDtBQURRLE9BQXRCLEVBRUcsTUFBTSxDQUFHLENBRlo7O0FBR0FyQyxNQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUN1RCxXQUFKLENBQU4sQ0FBdUJuQyxFQUF2QixDQUEwQitCLElBQTFCLENBQStCOUIsS0FBL0IsQ0FBcUMsQ0FBQyxLQUFELENBQXJDO0FBQ0QsS0FMQyxDQUFGO0FBTUQsR0FQTyxDQUFSO0FBU0F0QixFQUFBQSxRQUFRLENBQUMsNkJBQUQsRUFBZ0MsTUFBTTtBQUM1Q1ksSUFBQUEsRUFBRSxDQUFDLDBCQUFELEVBQTZCLE1BQU07QUFDbkNYLE1BQUFBLEVBQUUsQ0FBQ3dJLDBCQUFILENBQThCO0FBQzVCakUsUUFBQUEsVUFBVSxFQUFFLENBQUM7QUFDWEUsVUFBQUEsS0FBSyxFQUFFO0FBREksU0FBRDtBQURnQixPQUE5QixFQUlHLE1BQU0sQ0FBRyxDQUpaOztBQUtBeEQsTUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDdUQsV0FBSixDQUFOLENBQXVCbkMsRUFBdkIsQ0FBMEIrQixJQUExQixDQUErQjlCLEtBQS9CLENBQXFDLENBQUMsS0FBRCxDQUFyQztBQUNELEtBUEMsQ0FBRjtBQVFELEdBVE8sQ0FBUjtBQVdBdEIsRUFBQUEsUUFBUSxDQUFDLHlCQUFELEVBQTRCLE1BQU07QUFDeENZLElBQUFBLEVBQUUsQ0FBQyxzQkFBRCxFQUF5QixNQUFNO0FBQy9CWCxNQUFBQSxFQUFFLENBQUN5SSxRQUFILEdBQWM3SCxLQUFLLENBQUNDLElBQU4sRUFBZDtBQUNBYixNQUFBQSxFQUFFLENBQUNxSSxnQkFBSCxHQUFzQixLQUF0Qjs7QUFFQXJJLE1BQUFBLEVBQUUsQ0FBQzBJLHNCQUFILENBQTBCO0FBQ3hCQyxRQUFBQSxFQUFFLEVBQUU7QUFEb0IsT0FBMUIsRUFFRyxNQUFNLENBQUcsQ0FGWjs7QUFHQTFILE1BQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQ3lJLFFBQUgsQ0FBWXZFLFFBQVosQ0FBcUIsS0FBckIsRUFBNEIsUUFBNUIsRUFBc0MsR0FBdEMsRUFBMkMvQyxTQUE1QyxDQUFOLENBQTZEQyxFQUE3RCxDQUFnRUMsS0FBaEUsQ0FBc0UsQ0FBdEU7QUFDRCxLQVJDLENBQUY7QUFTRCxHQVZPLENBQVI7QUFZQXRCLEVBQUFBLFFBQVEsQ0FBQywwQkFBRCxFQUE2QixNQUFNO0FBQ3pDWSxJQUFBQSxFQUFFLENBQUMsc0JBQUQsRUFBeUIsTUFBTTtBQUMvQlgsTUFBQUEsRUFBRSxDQUFDeUksUUFBSCxHQUFjN0gsS0FBSyxDQUFDQyxJQUFOLEVBQWQ7QUFDQWIsTUFBQUEsRUFBRSxDQUFDcUksZ0JBQUgsR0FBc0IsS0FBdEI7O0FBRUFySSxNQUFBQSxFQUFFLENBQUM0SSx1QkFBSCxDQUEyQjtBQUN6QkQsUUFBQUEsRUFBRSxFQUFFO0FBRHFCLE9BQTNCLEVBRUcsTUFBTSxDQUFHLENBRlo7O0FBR0ExSCxNQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUN5SSxRQUFILENBQVl2RSxRQUFaLENBQXFCLEtBQXJCLEVBQTRCLFNBQTVCLEVBQXVDLEdBQXZDLEVBQTRDL0MsU0FBN0MsQ0FBTixDQUE4REMsRUFBOUQsQ0FBaUVDLEtBQWpFLENBQXVFLENBQXZFO0FBQ0QsS0FSQyxDQUFGO0FBU0QsR0FWTyxDQUFSO0FBWUF0QixFQUFBQSxRQUFRLENBQUN1RyxJQUFULENBQWMsd0JBQWQsRUFBd0MsTUFBTTtBQUM1QzNGLElBQUFBLEVBQUUsQ0FBQyxzQkFBRCxFQUF5QixNQUFNO0FBQy9CWCxNQUFBQSxFQUFFLENBQUN5SSxRQUFILEdBQWM3SCxLQUFLLENBQUNDLElBQU4sRUFBZDtBQUNBRCxNQUFBQSxLQUFLLENBQUNDLElBQU4sQ0FBV2IsRUFBWCxFQUFlLGFBQWYsRUFBOEJ1QixPQUE5QixDQUFzQyxLQUF0QztBQUNBdkIsTUFBQUEsRUFBRSxDQUFDcUksZ0JBQUgsR0FBc0IsS0FBdEI7O0FBRUFySSxNQUFBQSxFQUFFLENBQUM2SSxxQkFBSCxDQUF5QjtBQUN2QkYsUUFBQUEsRUFBRSxFQUFFO0FBRG1CLE9BQXpCLEVBRUcsTUFBTSxDQUFHLENBRlo7O0FBR0ExSCxNQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUN5SSxRQUFILENBQVl2RSxRQUFaLENBQXFCLEtBQXJCLEVBQTRCLE9BQTVCLEVBQXFDLEtBQXJDLEVBQTRDL0MsU0FBN0MsQ0FBTixDQUE4REMsRUFBOUQsQ0FBaUVDLEtBQWpFLENBQXVFLENBQXZFO0FBQ0FKLE1BQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQzBHLFdBQUgsQ0FBZXJELElBQWYsQ0FBb0IsQ0FBcEIsRUFBdUIsQ0FBdkIsQ0FBRCxDQUFOLENBQWtDakMsRUFBbEMsQ0FBcUMrQixJQUFyQyxDQUEwQzlCLEtBQTFDLENBQWdEO0FBQzlDc0MsUUFBQUEsT0FBTyxFQUFFO0FBQ1BtRixVQUFBQSxLQUFLLEVBQUUsQ0FBQztBQUNOSCxZQUFBQSxFQUFFLEVBQUU7QUFERSxXQUFEO0FBREE7QUFEcUMsT0FBaEQ7QUFPRCxLQWhCQyxDQUFGO0FBaUJELEdBbEJEO0FBb0JBNUksRUFBQUEsUUFBUSxDQUFDLGVBQUQsRUFBa0IsTUFBTTtBQUM5QlksSUFBQUEsRUFBRSxDQUFDLDRCQUFELEVBQStCLE1BQU07QUFDckNYLE1BQUFBLEVBQUUsQ0FBQytJLFlBQUgsQ0FBZ0IsS0FBaEI7O0FBRUE5SCxNQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUMrQyxNQUFKLENBQU4sQ0FBa0IzQixFQUFsQixDQUFxQkMsS0FBckIsQ0FBMkIsS0FBM0I7QUFDRCxLQUpDLENBQUY7QUFNQVYsSUFBQUEsRUFBRSxDQUFDLGtEQUFELEVBQXFELE1BQU07QUFDM0RYLE1BQUFBLEVBQUUsQ0FBQ29JLGNBQUgsR0FBb0J4SCxLQUFLLENBQUNDLElBQU4sRUFBcEI7QUFDQWIsTUFBQUEsRUFBRSxDQUFDK0MsTUFBSCxHQUFZK0Usc0JBQVo7QUFDQTlILE1BQUFBLEVBQUUsQ0FBQ3FJLGdCQUFILEdBQXNCLEtBQXRCOztBQUVBckksTUFBQUEsRUFBRSxDQUFDK0ksWUFBSCxDQUFnQixLQUFoQjs7QUFFQTlILE1BQUFBLE1BQU0sQ0FBQ2pCLEVBQUUsQ0FBQ3FJLGdCQUFKLENBQU4sQ0FBNEJqSCxFQUE1QixDQUErQmUsRUFBL0IsQ0FBa0NVLEtBQWxDO0FBQ0E1QixNQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUNvSSxjQUFILENBQWtCbEUsUUFBbEIsQ0FBMkIsS0FBM0IsRUFBa0MvQyxTQUFuQyxDQUFOLENBQW9EQyxFQUFwRCxDQUF1REMsS0FBdkQsQ0FBNkQsQ0FBN0Q7QUFDRCxLQVRDLENBQUY7QUFVRCxHQWpCTyxDQUFSO0FBbUJBdEIsRUFBQUEsUUFBUSxDQUFDLGNBQUQsRUFBaUIsTUFBTTtBQUM3QlksSUFBQUEsRUFBRSxDQUFDLHVDQUFELEVBQTBDLE1BQU07QUFDaEQsVUFBSXFGLElBQUksR0FBRztBQUNUZ0QsUUFBQUEsUUFBUSxFQUFFO0FBREQsT0FBWDtBQUdBL0gsTUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDaUosV0FBSCxDQUFlakQsSUFBZixFQUFxQixhQUFyQixFQUFvQyxHQUFwQyxDQUFELENBQU4sQ0FBaUQ1RSxFQUFqRCxDQUFvRCtCLElBQXBELENBQXlEOUIsS0FBekQsQ0FBK0Q7QUFDN0Q2SCxRQUFBQSxJQUFJLEVBQUUsT0FEdUQ7QUFFN0RwRSxRQUFBQSxTQUFTLEVBQUUsR0FGa0Q7QUFHN0Q4QyxRQUFBQSxJQUFJLEVBQUUsYUFIdUQ7QUFJN0RvQixRQUFBQSxRQUFRLEVBQUU7QUFKbUQsT0FBL0Q7QUFNQS9ILE1BQUFBLE1BQU0sQ0FBQytFLElBQUQsQ0FBTixDQUFhNUUsRUFBYixDQUFnQitCLElBQWhCLENBQXFCOUIsS0FBckIsQ0FBMkI7QUFDekIySCxRQUFBQSxRQUFRLEVBQUUsQ0FBQztBQUNURSxVQUFBQSxJQUFJLEVBQUUsT0FERztBQUVUcEUsVUFBQUEsU0FBUyxFQUFFLEdBRkY7QUFHVDhDLFVBQUFBLElBQUksRUFBRSxPQUhHO0FBSVRvQixVQUFBQSxRQUFRLEVBQUUsQ0FBQztBQUNURSxZQUFBQSxJQUFJLEVBQUUsT0FERztBQUVUcEUsWUFBQUEsU0FBUyxFQUFFLEdBRkY7QUFHVDhDLFlBQUFBLElBQUksRUFBRSxhQUhHO0FBSVRvQixZQUFBQSxRQUFRLEVBQUU7QUFKRCxXQUFEO0FBSkQsU0FBRDtBQURlLE9BQTNCO0FBYUQsS0F2QkMsQ0FBRjtBQXlCQXJJLElBQUFBLEVBQUUsQ0FBQyx5Q0FBRCxFQUE0QyxNQUFNO0FBQ2xELFVBQUlxRixJQUFJLEdBQUc7QUFDVGdELFFBQUFBLFFBQVEsRUFBRSxDQUFDO0FBQ1RFLFVBQUFBLElBQUksRUFBRSxPQURHO0FBRVRwRSxVQUFBQSxTQUFTLEVBQUUsR0FGRjtBQUdUOEMsVUFBQUEsSUFBSSxFQUFFLE9BSEc7QUFJVG9CLFVBQUFBLFFBQVEsRUFBRSxDQUFDO0FBQ1RFLFlBQUFBLElBQUksRUFBRSxPQURHO0FBRVRwRSxZQUFBQSxTQUFTLEVBQUUsR0FGRjtBQUdUOEMsWUFBQUEsSUFBSSxFQUFFLGFBSEc7QUFJVG9CLFlBQUFBLFFBQVEsRUFBRSxFQUpEO0FBS1RHLFlBQUFBLEdBQUcsRUFBRTtBQUxJLFdBQUQ7QUFKRCxTQUFEO0FBREQsT0FBWDtBQWNBbEksTUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDaUosV0FBSCxDQUFlakQsSUFBZixFQUFxQixhQUFyQixFQUFvQyxHQUFwQyxDQUFELENBQU4sQ0FBaUQ1RSxFQUFqRCxDQUFvRCtCLElBQXBELENBQXlEOUIsS0FBekQsQ0FBK0Q7QUFDN0Q2SCxRQUFBQSxJQUFJLEVBQUUsT0FEdUQ7QUFFN0RwRSxRQUFBQSxTQUFTLEVBQUUsR0FGa0Q7QUFHN0Q4QyxRQUFBQSxJQUFJLEVBQUUsYUFIdUQ7QUFJN0RvQixRQUFBQSxRQUFRLEVBQUUsRUFKbUQ7QUFLN0RHLFFBQUFBLEdBQUcsRUFBRTtBQUx3RCxPQUEvRDtBQU9ELEtBdEJDLENBQUY7QUF3QkF4SSxJQUFBQSxFQUFFLENBQUMsc0NBQUQsRUFBeUMsTUFBTTtBQUMvQyxVQUFJcUYsSUFBSSxHQUFHO0FBQ1RnRCxRQUFBQSxRQUFRLEVBQUU7QUFERCxPQUFYO0FBR0EvSCxNQUFBQSxNQUFNLENBQUNqQixFQUFFLENBQUNpSixXQUFILENBQWVqRCxJQUFmLEVBQXFCLGFBQXJCLEVBQW9DLEdBQXBDLENBQUQsQ0FBTixDQUFpRDVFLEVBQWpELENBQW9EK0IsSUFBcEQsQ0FBeUQ5QixLQUF6RCxDQUErRDtBQUM3RDZILFFBQUFBLElBQUksRUFBRSxPQUR1RDtBQUU3RHBFLFFBQUFBLFNBQVMsRUFBRSxHQUZrRDtBQUc3RDhDLFFBQUFBLElBQUksRUFBRSxhQUh1RDtBQUk3RG9CLFFBQUFBLFFBQVEsRUFBRTtBQUptRCxPQUEvRDtBQU1BL0gsTUFBQUEsTUFBTSxDQUFDakIsRUFBRSxDQUFDaUosV0FBSCxDQUFlakQsSUFBZixFQUFxQixjQUFyQixFQUFxQyxHQUFyQyxDQUFELENBQU4sQ0FBa0Q1RSxFQUFsRCxDQUFxRCtCLElBQXJELENBQTBEOUIsS0FBMUQsQ0FBZ0U7QUFDOUQ2SCxRQUFBQSxJQUFJLEVBQUUsUUFEd0Q7QUFFOURwRSxRQUFBQSxTQUFTLEVBQUUsR0FGbUQ7QUFHOUQ4QyxRQUFBQSxJQUFJLEVBQUUsY0FId0Q7QUFJOURvQixRQUFBQSxRQUFRLEVBQUU7QUFKb0QsT0FBaEU7QUFPQS9ILE1BQUFBLE1BQU0sQ0FBQytFLElBQUQsQ0FBTixDQUFhNUUsRUFBYixDQUFnQitCLElBQWhCLENBQXFCOUIsS0FBckIsQ0FBMkI7QUFDekIySCxRQUFBQSxRQUFRLEVBQUUsQ0FBQztBQUNURSxVQUFBQSxJQUFJLEVBQUUsT0FERztBQUVUcEUsVUFBQUEsU0FBUyxFQUFFLEdBRkY7QUFHVDhDLFVBQUFBLElBQUksRUFBRSxPQUhHO0FBSVRvQixVQUFBQSxRQUFRLEVBQUUsQ0FBQztBQUNURSxZQUFBQSxJQUFJLEVBQUUsT0FERztBQUVUcEUsWUFBQUEsU0FBUyxFQUFFLEdBRkY7QUFHVDhDLFlBQUFBLElBQUksRUFBRSxhQUhHO0FBSVRvQixZQUFBQSxRQUFRLEVBQUU7QUFKRCxXQUFELEVBS1A7QUFDREUsWUFBQUEsSUFBSSxFQUFFLFFBREw7QUFFRHBFLFlBQUFBLFNBQVMsRUFBRSxHQUZWO0FBR0Q4QyxZQUFBQSxJQUFJLEVBQUUsY0FITDtBQUlEb0IsWUFBQUEsUUFBUSxFQUFFO0FBSlQsV0FMTztBQUpELFNBQUQ7QUFEZSxPQUEzQjtBQWtCRCxLQW5DQyxDQUFGO0FBb0NELEdBdEZPLENBQVI7QUF3RkFqSixFQUFBQSxRQUFRLENBQUMsa0JBQUQsRUFBcUIsTUFBTTtBQUNqQ1ksSUFBQUEsRUFBRSxDQUFDLGtEQUFELEVBQXNEMEIsSUFBRCxJQUFVO0FBQy9EckMsTUFBQUEsRUFBRSxDQUFDTyxNQUFILENBQVU2SSxnQkFBVixHQUE2QixJQUE3QjtBQUNBcEosTUFBQUEsRUFBRSxDQUFDcUksZ0JBQUgsR0FBc0IsS0FBdEI7O0FBQ0FySSxNQUFBQSxFQUFFLENBQUN5SSxRQUFILEdBQWMsQ0FBQ2IsSUFBRCxFQUFPcEQsSUFBUCxFQUFhQyxLQUFiLEtBQXVCO0FBQ25DeEQsUUFBQUEsTUFBTSxDQUFDMkcsSUFBRCxDQUFOLENBQWF4RyxFQUFiLENBQWdCQyxLQUFoQixDQUFzQixLQUF0QjtBQUNBSixRQUFBQSxNQUFNLENBQUN1RCxJQUFELENBQU4sQ0FBYXBELEVBQWIsQ0FBZ0JDLEtBQWhCLENBQXNCLFFBQXRCO0FBQ0FKLFFBQUFBLE1BQU0sQ0FBQ3dELEtBQUQsQ0FBTixDQUFjckQsRUFBZCxDQUFpQkMsS0FBakIsQ0FBdUIsR0FBdkI7QUFDQWdCLFFBQUFBLElBQUk7QUFDTCxPQUxEOztBQU1BckMsTUFBQUEsRUFBRSxDQUFDTyxNQUFILENBQVU4SSxPQUFWLENBQWtCO0FBQ2hCO0FBQ0FDLFFBQUFBLElBQUksRUFBRSxJQUFJeEYsVUFBSixDQUFlLENBQUMsRUFBRCxFQUFLLEVBQUwsRUFBUyxFQUFULEVBQWEsRUFBYixFQUFpQixFQUFqQixFQUFxQixFQUFyQixFQUF5QixFQUF6QixFQUE2QixFQUE3QixFQUFpQyxFQUFqQyxFQUFxQyxFQUFyQyxFQUF5QyxFQUF6QyxFQUE2QyxFQUE3QyxFQUFpRCxFQUFqRCxFQUFxRCxFQUFyRCxDQUFmLEVBQXlFeUY7QUFGL0QsT0FBbEI7QUFJRCxLQWJDLENBQUY7QUFlQTVJLElBQUFBLEVBQUUsQ0FBQyxtREFBRCxFQUF1RDBCLElBQUQsSUFBVTtBQUNoRXJDLE1BQUFBLEVBQUUsQ0FBQ08sTUFBSCxDQUFVNkksZ0JBQVYsR0FBNkIsSUFBN0I7QUFDQXBKLE1BQUFBLEVBQUUsQ0FBQ3FJLGdCQUFILEdBQXNCLEtBQXRCOztBQUNBckksTUFBQUEsRUFBRSxDQUFDeUksUUFBSCxHQUFjLENBQUNiLElBQUQsRUFBT3BELElBQVAsRUFBYUMsS0FBYixLQUF1QjtBQUNuQ3hELFFBQUFBLE1BQU0sQ0FBQzJHLElBQUQsQ0FBTixDQUFheEcsRUFBYixDQUFnQkMsS0FBaEIsQ0FBc0IsS0FBdEI7QUFDQUosUUFBQUEsTUFBTSxDQUFDdUQsSUFBRCxDQUFOLENBQWFwRCxFQUFiLENBQWdCQyxLQUFoQixDQUFzQixTQUF0QjtBQUNBSixRQUFBQSxNQUFNLENBQUN3RCxLQUFELENBQU4sQ0FBY3JELEVBQWQsQ0FBaUJDLEtBQWpCLENBQXVCLEdBQXZCO0FBQ0FnQixRQUFBQSxJQUFJO0FBQ0wsT0FMRDs7QUFNQXJDLE1BQUFBLEVBQUUsQ0FBQ08sTUFBSCxDQUFVOEksT0FBVixDQUFrQjtBQUNoQjtBQUNBQyxRQUFBQSxJQUFJLEVBQUUsSUFBSXhGLFVBQUosQ0FBZSxDQUFDLEVBQUQsRUFBSyxFQUFMLEVBQVMsRUFBVCxFQUFhLEVBQWIsRUFBaUIsRUFBakIsRUFBcUIsRUFBckIsRUFBeUIsRUFBekIsRUFBNkIsRUFBN0IsRUFBaUMsRUFBakMsRUFBcUMsRUFBckMsRUFBeUMsRUFBekMsRUFBNkMsRUFBN0MsRUFBaUQsRUFBakQsRUFBcUQsRUFBckQsRUFBeUQsRUFBekQsQ0FBZixFQUE2RXlGO0FBRm5FLE9BQWxCO0FBSUQsS0FiQyxDQUFGO0FBZUE1SSxJQUFBQSxFQUFFLENBQUMsaURBQUQsRUFBcUQwQixJQUFELElBQVU7QUFDOURyQyxNQUFBQSxFQUFFLENBQUNPLE1BQUgsQ0FBVTZJLGdCQUFWLEdBQTZCLElBQTdCO0FBQ0FwSixNQUFBQSxFQUFFLENBQUNxSSxnQkFBSCxHQUFzQixLQUF0Qjs7QUFDQXJJLE1BQUFBLEVBQUUsQ0FBQ3lJLFFBQUgsR0FBYyxDQUFDYixJQUFELEVBQU9wRCxJQUFQLEVBQWFDLEtBQWIsS0FBdUI7QUFDbkN4RCxRQUFBQSxNQUFNLENBQUMyRyxJQUFELENBQU4sQ0FBYXhHLEVBQWIsQ0FBZ0JDLEtBQWhCLENBQXNCLEtBQXRCO0FBQ0FKLFFBQUFBLE1BQU0sQ0FBQ3VELElBQUQsQ0FBTixDQUFhcEQsRUFBYixDQUFnQkMsS0FBaEIsQ0FBc0IsT0FBdEI7QUFDQUosUUFBQUEsTUFBTSxDQUFDd0QsS0FBRCxDQUFOLENBQWNyRCxFQUFkLENBQWlCK0IsSUFBakIsQ0FBc0I5QixLQUF0QixDQUE0QjtBQUMxQixlQUFLLEdBRHFCO0FBRTFCLG1CQUFTLENBQUMsUUFBRCxDQUZpQjtBQUcxQixvQkFBVTtBQUhnQixTQUE1QjtBQUtBZ0IsUUFBQUEsSUFBSTtBQUNMLE9BVEQ7O0FBVUFyQyxNQUFBQSxFQUFFLENBQUNPLE1BQUgsQ0FBVThJLE9BQVYsQ0FBa0I7QUFDaEI7QUFDQUMsUUFBQUEsSUFBSSxFQUFFLElBQUl4RixVQUFKLENBQWUsQ0FBQyxFQUFELEVBQUssRUFBTCxFQUFTLEVBQVQsRUFBYSxFQUFiLEVBQWlCLEVBQWpCLEVBQXFCLEVBQXJCLEVBQXlCLEVBQXpCLEVBQTZCLEVBQTdCLEVBQWlDLEVBQWpDLEVBQXFDLEVBQXJDLEVBQXlDLEVBQXpDLEVBQTZDLEVBQTdDLEVBQWlELEVBQWpELEVBQXFELEVBQXJELEVBQXlELEVBQXpELEVBQTZELEVBQTdELEVBQWlFLEVBQWpFLEVBQXFFLEVBQXJFLEVBQXlFLEVBQXpFLEVBQTZFLEVBQTdFLEVBQWlGLEVBQWpGLEVBQXFGLEVBQXJGLEVBQXlGLEdBQXpGLEVBQThGLEdBQTlGLEVBQW1HLEdBQW5HLEVBQXdHLEVBQXhHLEVBQTRHLEVBQTVHLEVBQWdILEVBQWhILEVBQW9ILEVBQXBILEVBQXdILEVBQXhILEVBQTRILEVBQTVILEVBQWdJLEVBQWhJLEVBQW9JLEVBQXBJLEVBQXdJLEVBQXhJLEVBQTRJLEVBQTVJLEVBQWdKLEVBQWhKLEVBQW9KLEVBQXBKLEVBQXdKLEVBQXhKLEVBQTRKLEVBQTVKLEVBQWdLLEVBQWhLLENBQWYsRUFBb0x5RjtBQUYxSyxPQUFsQjtBQUlELEtBakJDLENBQUY7QUFrQkQsR0FqRE8sQ0FBUjtBQWtERCxDQXBxQ08sQ0FBUiIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG5vLXVudXNlZC1leHByZXNzaW9ucyAqL1xuXG5pbXBvcnQgSW1hcENsaWVudCwgeyBTVEFURV9TRUxFQ1RFRCwgU1RBVEVfTE9HT1VUIH0gZnJvbSAnLi9jbGllbnQnXG5pbXBvcnQgeyBwYXJzZXIgfSBmcm9tICdlbWFpbGpzLWltYXAtaGFuZGxlcidcbmltcG9ydCB7XG4gIHRvVHlwZWRBcnJheSxcbiAgTE9HX0xFVkVMX05PTkUgYXMgbG9nTGV2ZWxcbn0gZnJvbSAnLi9jb21tb24nXG5cbmRlc2NyaWJlKCdicm93c2VyYm94IHVuaXQgdGVzdHMnLCAoKSA9PiB7XG4gIHZhciBiclxuXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgIGNvbnN0IGF1dGggPSB7IHVzZXI6ICdiYWxkcmlhbicsIHBhc3M6ICdzbGVlcGVyLmRlJyB9XG4gICAgYnIgPSBuZXcgSW1hcENsaWVudCgnc29tZWhvc3QnLCAxMjM0LCB7IGF1dGgsIGxvZ0xldmVsIH0pXG4gICAgYnIuY2xpZW50LnNvY2tldCA9IHtcbiAgICAgIHNlbmQ6ICgpID0+IHsgfSxcbiAgICAgIHVwZ3JhZGVUb1NlY3VyZTogKCkgPT4geyB9XG4gICAgfVxuICB9KVxuXG4gIGRlc2NyaWJlKCcjX29uSWRsZScsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGNhbGwgZW50ZXJJZGxlJywgKCkgPT4ge1xuICAgICAgc2lub24uc3R1YihiciwgJ2VudGVySWRsZScpXG5cbiAgICAgIGJyLl9hdXRoZW50aWNhdGVkID0gdHJ1ZVxuICAgICAgYnIuX2VudGVyZWRJZGxlID0gZmFsc2VcbiAgICAgIGJyLl9vbklkbGUoKVxuXG4gICAgICBleHBlY3QoYnIuZW50ZXJJZGxlLmNhbGxDb3VudCkudG8uZXF1YWwoMSlcbiAgICB9KVxuXG4gICAgaXQoJ3Nob3VsZCBub3QgY2FsbCBlbnRlcklkbGUnLCAoKSA9PiB7XG4gICAgICBzaW5vbi5zdHViKGJyLCAnZW50ZXJJZGxlJylcblxuICAgICAgYnIuX2VudGVyZWRJZGxlID0gdHJ1ZVxuICAgICAgYnIuX29uSWRsZSgpXG5cbiAgICAgIGV4cGVjdChici5lbnRlcklkbGUuY2FsbENvdW50KS50by5lcXVhbCgwKVxuICAgIH0pXG4gIH0pXG5cbiAgZGVzY3JpYmUoJyNjb25uZWN0JywgKCkgPT4ge1xuICAgIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgICAgc2lub24uc3R1Yihici5jbGllbnQsICdjb25uZWN0JylcbiAgICAgIHNpbm9uLnN0dWIoYnIuY2xpZW50LCAnY2xvc2UnKVxuICAgICAgc2lub24uc3R1YihiciwgJ3VwZGF0ZUNhcGFiaWxpdHknKVxuICAgICAgc2lub24uc3R1YihiciwgJ3VwZ3JhZGVDb25uZWN0aW9uJylcbiAgICAgIHNpbm9uLnN0dWIoYnIsICd1cGRhdGVJZCcpXG4gICAgICBzaW5vbi5zdHViKGJyLCAnbG9naW4nKVxuICAgICAgc2lub24uc3R1YihiciwgJ2NvbXByZXNzQ29ubmVjdGlvbicpXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgY29ubmVjdCcsICgpID0+IHtcbiAgICAgIGJyLmNsaWVudC5jb25uZWN0LnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKCkpXG4gICAgICBici51cGRhdGVDYXBhYmlsaXR5LnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKCkpXG4gICAgICBici51cGdyYWRlQ29ubmVjdGlvbi5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSgpKVxuICAgICAgYnIudXBkYXRlSWQucmV0dXJucyhQcm9taXNlLnJlc29sdmUoKSlcbiAgICAgIGJyLmxvZ2luLnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKCkpXG4gICAgICBici5jb21wcmVzc0Nvbm5lY3Rpb24ucmV0dXJucyhQcm9taXNlLnJlc29sdmUoKSlcblxuICAgICAgc2V0VGltZW91dCgoKSA9PiBici5jbGllbnQub25yZWFkeSgpLCAwKVxuICAgICAgcmV0dXJuIGJyLmNvbm5lY3QoKS50aGVuKCgpID0+IHtcbiAgICAgICAgZXhwZWN0KGJyLmNsaWVudC5jb25uZWN0LmNhbGxlZE9uY2UpLnRvLmJlLnRydWVcbiAgICAgICAgZXhwZWN0KGJyLnVwZGF0ZUNhcGFiaWxpdHkuY2FsbGVkT25jZSkudG8uYmUudHJ1ZVxuICAgICAgICBleHBlY3QoYnIudXBncmFkZUNvbm5lY3Rpb24uY2FsbGVkT25jZSkudG8uYmUudHJ1ZVxuICAgICAgICBleHBlY3QoYnIudXBkYXRlSWQuY2FsbGVkT25jZSkudG8uYmUudHJ1ZVxuICAgICAgICBleHBlY3QoYnIubG9naW4uY2FsbGVkT25jZSkudG8uYmUudHJ1ZVxuICAgICAgICBleHBlY3QoYnIuY29tcHJlc3NDb25uZWN0aW9uLmNhbGxlZE9uY2UpLnRvLmJlLnRydWVcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgZmFpbCB0byBsb2dpbicsIChkb25lKSA9PiB7XG4gICAgICBici5jbGllbnQuY29ubmVjdC5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSgpKVxuICAgICAgYnIudXBkYXRlQ2FwYWJpbGl0eS5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSgpKVxuICAgICAgYnIudXBncmFkZUNvbm5lY3Rpb24ucmV0dXJucyhQcm9taXNlLnJlc29sdmUoKSlcbiAgICAgIGJyLnVwZGF0ZUlkLnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKCkpXG4gICAgICBici5sb2dpbi50aHJvd3MobmV3IEVycm9yKCkpXG5cbiAgICAgIHNldFRpbWVvdXQoKCkgPT4gYnIuY2xpZW50Lm9ucmVhZHkoKSwgMClcbiAgICAgIGJyLmNvbm5lY3QoKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIGV4cGVjdChlcnIpLnRvLmV4aXN0XG5cbiAgICAgICAgZXhwZWN0KGJyLmNsaWVudC5jb25uZWN0LmNhbGxlZE9uY2UpLnRvLmJlLnRydWVcbiAgICAgICAgZXhwZWN0KGJyLmNsaWVudC5jbG9zZS5jYWxsZWRPbmNlKS50by5iZS50cnVlXG4gICAgICAgIGV4cGVjdChici51cGRhdGVDYXBhYmlsaXR5LmNhbGxlZE9uY2UpLnRvLmJlLnRydWVcbiAgICAgICAgZXhwZWN0KGJyLnVwZ3JhZGVDb25uZWN0aW9uLmNhbGxlZE9uY2UpLnRvLmJlLnRydWVcbiAgICAgICAgZXhwZWN0KGJyLnVwZGF0ZUlkLmNhbGxlZE9uY2UpLnRvLmJlLnRydWVcbiAgICAgICAgZXhwZWN0KGJyLmxvZ2luLmNhbGxlZE9uY2UpLnRvLmJlLnRydWVcblxuICAgICAgICBleHBlY3QoYnIuY29tcHJlc3NDb25uZWN0aW9uLmNhbGxlZCkudG8uYmUuZmFsc2VcblxuICAgICAgICBkb25lKClcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgdGltZW91dCcsIChkb25lKSA9PiB7XG4gICAgICBici5jbGllbnQuY29ubmVjdC5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSgpKVxuICAgICAgYnIudGltZW91dENvbm5lY3Rpb24gPSAxXG5cbiAgICAgIGJyLmNvbm5lY3QoKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIGV4cGVjdChlcnIpLnRvLmV4aXN0XG5cbiAgICAgICAgZXhwZWN0KGJyLmNsaWVudC5jb25uZWN0LmNhbGxlZE9uY2UpLnRvLmJlLnRydWVcbiAgICAgICAgZXhwZWN0KGJyLmNsaWVudC5jbG9zZS5jYWxsZWRPbmNlKS50by5iZS50cnVlXG5cbiAgICAgICAgZXhwZWN0KGJyLnVwZGF0ZUNhcGFiaWxpdHkuY2FsbGVkKS50by5iZS5mYWxzZVxuICAgICAgICBleHBlY3QoYnIudXBncmFkZUNvbm5lY3Rpb24uY2FsbGVkKS50by5iZS5mYWxzZVxuICAgICAgICBleHBlY3QoYnIudXBkYXRlSWQuY2FsbGVkKS50by5iZS5mYWxzZVxuICAgICAgICBleHBlY3QoYnIubG9naW4uY2FsbGVkKS50by5iZS5mYWxzZVxuICAgICAgICBleHBlY3QoYnIuY29tcHJlc3NDb25uZWN0aW9uLmNhbGxlZCkudG8uYmUuZmFsc2VcblxuICAgICAgICBkb25lKClcbiAgICAgIH0pXG4gICAgfSlcbiAgfSlcblxuICBkZXNjcmliZSgnI2Nsb3NlJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgZm9yY2UtY2xvc2UnLCAoKSA9PiB7XG4gICAgICBzaW5vbi5zdHViKGJyLmNsaWVudCwgJ2Nsb3NlJykucmV0dXJucyhQcm9taXNlLnJlc29sdmUoKSlcblxuICAgICAgcmV0dXJuIGJyLmNsb3NlKCkudGhlbigoKSA9PiB7XG4gICAgICAgIGV4cGVjdChici5fc3RhdGUpLnRvLmVxdWFsKFNUQVRFX0xPR09VVClcbiAgICAgICAgZXhwZWN0KGJyLmNsaWVudC5jbG9zZS5jYWxsZWRPbmNlKS50by5iZS50cnVlXG4gICAgICB9KVxuICAgIH0pXG4gIH0pXG5cbiAgZGVzY3JpYmUoJyNleGVjJywgKCkgPT4ge1xuICAgIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgICAgc2lub24uc3R1YihiciwgJ2JyZWFrSWRsZScpXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgc2VuZCBzdHJpbmcgY29tbWFuZCcsICgpID0+IHtcbiAgICAgIHNpbm9uLnN0dWIoYnIuY2xpZW50LCAnZW5xdWV1ZUNvbW1hbmQnKS5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSh7fSkpXG4gICAgICByZXR1cm4gYnIuZXhlYygnVEVTVCcpLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICBleHBlY3QocmVzKS50by5kZWVwLmVxdWFsKHt9KVxuICAgICAgICBleHBlY3QoYnIuY2xpZW50LmVucXVldWVDb21tYW5kLmFyZ3NbMF1bMF0pLnRvLmVxdWFsKCdURVNUJylcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgdXBkYXRlIGNhcGFiaWxpdHkgZnJvbSByZXNwb25zZScsICgpID0+IHtcbiAgICAgIHNpbm9uLnN0dWIoYnIuY2xpZW50LCAnZW5xdWV1ZUNvbW1hbmQnKS5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSh7XG4gICAgICAgIGNhcGFiaWxpdHk6IFsnQScsICdCJ11cbiAgICAgIH0pKVxuICAgICAgcmV0dXJuIGJyLmV4ZWMoJ1RFU1QnKS50aGVuKChyZXMpID0+IHtcbiAgICAgICAgZXhwZWN0KHJlcykudG8uZGVlcC5lcXVhbCh7XG4gICAgICAgICAgY2FwYWJpbGl0eTogWydBJywgJ0InXVxuICAgICAgICB9KVxuICAgICAgICBleHBlY3QoYnIuX2NhcGFiaWxpdHkpLnRvLmRlZXAuZXF1YWwoWydBJywgJ0InXSlcbiAgICAgIH0pXG4gICAgfSlcbiAgfSlcblxuICBkZXNjcmliZSgnI2VudGVySWRsZScsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHBlcmlvZGljYWxseSBzZW5kIE5PT1AgaWYgSURMRSBub3Qgc3VwcG9ydGVkJywgKGRvbmUpID0+IHtcbiAgICAgIHNpbm9uLnN0dWIoYnIsICdleGVjJykuY2FsbHNGYWtlKChjb21tYW5kKSA9PiB7XG4gICAgICAgIGV4cGVjdChjb21tYW5kKS50by5lcXVhbCgnTk9PUCcpXG5cbiAgICAgICAgZG9uZSgpXG4gICAgICB9KVxuXG4gICAgICBici5fY2FwYWJpbGl0eSA9IFtdXG4gICAgICBici50aW1lb3V0Tm9vcCA9IDFcbiAgICAgIGJyLmVudGVySWRsZSgpXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgYnJlYWsgSURMRSBhZnRlciB0aW1lb3V0JywgKGRvbmUpID0+IHtcbiAgICAgIHNpbm9uLnN0dWIoYnIuY2xpZW50LCAnZW5xdWV1ZUNvbW1hbmQnKVxuICAgICAgc2lub24uc3R1Yihici5jbGllbnQuc29ja2V0LCAnc2VuZCcpLmNhbGxzRmFrZSgocGF5bG9hZCkgPT4ge1xuICAgICAgICBleHBlY3QoYnIuY2xpZW50LmVucXVldWVDb21tYW5kLmFyZ3NbMF1bMF0uY29tbWFuZCkudG8uZXF1YWwoJ0lETEUnKVxuICAgICAgICBleHBlY3QoW10uc2xpY2UuY2FsbChuZXcgVWludDhBcnJheShwYXlsb2FkKSkpLnRvLmRlZXAuZXF1YWwoWzB4NDQsIDB4NGYsIDB4NGUsIDB4NDUsIDB4MGQsIDB4MGFdKVxuXG4gICAgICAgIGRvbmUoKVxuICAgICAgfSlcblxuICAgICAgYnIuX2NhcGFiaWxpdHkgPSBbJ0lETEUnXVxuICAgICAgYnIudGltZW91dElkbGUgPSAxXG4gICAgICBici5lbnRlcklkbGUoKVxuICAgIH0pXG4gIH0pXG5cbiAgZGVzY3JpYmUoJyNicmVha0lkbGUnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBzZW5kIERPTkUgdG8gc29ja2V0JywgKCkgPT4ge1xuICAgICAgc2lub24uc3R1Yihici5jbGllbnQuc29ja2V0LCAnc2VuZCcpXG5cbiAgICAgIGJyLl9lbnRlcmVkSWRsZSA9ICdJRExFJ1xuICAgICAgYnIuYnJlYWtJZGxlKClcbiAgICAgIGV4cGVjdChbXS5zbGljZS5jYWxsKG5ldyBVaW50OEFycmF5KGJyLmNsaWVudC5zb2NrZXQuc2VuZC5hcmdzWzBdWzBdKSkpLnRvLmRlZXAuZXF1YWwoWzB4NDQsIDB4NGYsIDB4NGUsIDB4NDUsIDB4MGQsIDB4MGFdKVxuICAgIH0pXG4gIH0pXG5cbiAgZGVzY3JpYmUoJyN1cGdyYWRlQ29ubmVjdGlvbicsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGRvIG5vdGhpbmcgaWYgYWxyZWFkeSBzZWN1cmVkJywgKCkgPT4ge1xuICAgICAgYnIuY2xpZW50LnNlY3VyZU1vZGUgPSB0cnVlXG4gICAgICBici5fY2FwYWJpbGl0eSA9IFsnc3RhcnR0bHMnXVxuICAgICAgcmV0dXJuIGJyLnVwZ3JhZGVDb25uZWN0aW9uKClcbiAgICB9KVxuXG4gICAgaXQoJ3Nob3VsZCBkbyBub3RoaW5nIGlmIFNUQVJUVExTIG5vdCBhdmFpbGFibGUnLCAoKSA9PiB7XG4gICAgICBici5jbGllbnQuc2VjdXJlTW9kZSA9IGZhbHNlXG4gICAgICBici5fY2FwYWJpbGl0eSA9IFtdXG4gICAgICByZXR1cm4gYnIudXBncmFkZUNvbm5lY3Rpb24oKVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIHJ1biBTVEFSVFRMUycsICgpID0+IHtcbiAgICAgIHNpbm9uLnN0dWIoYnIuY2xpZW50LCAndXBncmFkZScpXG4gICAgICBzaW5vbi5zdHViKGJyLCAnZXhlYycpLndpdGhBcmdzKCdTVEFSVFRMUycpLnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKCkpXG4gICAgICBzaW5vbi5zdHViKGJyLCAndXBkYXRlQ2FwYWJpbGl0eScpLnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKCkpXG5cbiAgICAgIGJyLl9jYXBhYmlsaXR5ID0gWydTVEFSVFRMUyddXG5cbiAgICAgIHJldHVybiBici51cGdyYWRlQ29ubmVjdGlvbigpLnRoZW4oKCkgPT4ge1xuICAgICAgICBleHBlY3QoYnIuY2xpZW50LnVwZ3JhZGUuY2FsbENvdW50KS50by5lcXVhbCgxKVxuICAgICAgICBleHBlY3QoYnIuX2NhcGFiaWxpdHkubGVuZ3RoKS50by5lcXVhbCgwKVxuICAgICAgfSlcbiAgICB9KVxuICB9KVxuXG4gIGRlc2NyaWJlKCcjdXBkYXRlQ2FwYWJpbGl0eScsICgpID0+IHtcbiAgICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICAgIHNpbm9uLnN0dWIoYnIsICdleGVjJylcbiAgICB9KVxuXG4gICAgaXQoJ3Nob3VsZCBkbyBub3RoaW5nIGlmIGNhcGFiaWxpdHkgaXMgc2V0JywgKCkgPT4ge1xuICAgICAgYnIuX2NhcGFiaWxpdHkgPSBbJ2FiYyddXG4gICAgICByZXR1cm4gYnIudXBkYXRlQ2FwYWJpbGl0eSgpXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgcnVuIENBUEFCSUxJVFkgaWYgY2FwYWJpbGl0eSBub3Qgc2V0JywgKCkgPT4ge1xuICAgICAgYnIuZXhlYy5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSgpKVxuXG4gICAgICBici5fY2FwYWJpbGl0eSA9IFtdXG5cbiAgICAgIHJldHVybiBici51cGRhdGVDYXBhYmlsaXR5KCkudGhlbigoKSA9PiB7XG4gICAgICAgIGV4cGVjdChici5leGVjLmFyZ3NbMF1bMF0pLnRvLmVxdWFsKCdDQVBBQklMSVRZJylcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgZm9yY2UgcnVuIENBUEFCSUxJVFknLCAoKSA9PiB7XG4gICAgICBici5leGVjLnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKCkpXG4gICAgICBici5fY2FwYWJpbGl0eSA9IFsnYWJjJ11cblxuICAgICAgcmV0dXJuIGJyLnVwZGF0ZUNhcGFiaWxpdHkodHJ1ZSkudGhlbigoKSA9PiB7XG4gICAgICAgIGV4cGVjdChici5leGVjLmFyZ3NbMF1bMF0pLnRvLmVxdWFsKCdDQVBBQklMSVRZJylcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgZG8gbm90aGluZyBpZiBjb25uZWN0aW9uIGlzIG5vdCB5ZXQgdXBncmFkZWQnLCAoKSA9PiB7XG4gICAgICBici5fY2FwYWJpbGl0eSA9IFtdXG4gICAgICBici5jbGllbnQuc2VjdXJlTW9kZSA9IGZhbHNlXG4gICAgICBici5fcmVxdWlyZVRMUyA9IHRydWVcblxuICAgICAgYnIudXBkYXRlQ2FwYWJpbGl0eSgpXG4gICAgfSlcbiAgfSlcblxuICBkZXNjcmliZSgnI2xpc3ROYW1lc3BhY2VzJywgKCkgPT4ge1xuICAgIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgICAgc2lub24uc3R1YihiciwgJ2V4ZWMnKVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIHJ1biBOQU1FU1BBQ0UgaWYgc3VwcG9ydGVkJywgKCkgPT4ge1xuICAgICAgYnIuZXhlYy5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSh7XG4gICAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgICBOQU1FU1BBQ0U6IFt7XG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiBbXG4gICAgICAgICAgICAgIFtcbiAgICAgICAgICAgICAgICBbe1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ1NUUklORycsXG4gICAgICAgICAgICAgICAgICB2YWx1ZTogJ0lOQk9YLidcbiAgICAgICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnU1RSSU5HJyxcbiAgICAgICAgICAgICAgICAgIHZhbHVlOiAnLidcbiAgICAgICAgICAgICAgICB9XVxuICAgICAgICAgICAgICBdLCBudWxsLCBudWxsXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfV1cbiAgICAgICAgfVxuICAgICAgfSkpXG4gICAgICBici5fY2FwYWJpbGl0eSA9IFsnTkFNRVNQQUNFJ11cblxuICAgICAgcmV0dXJuIGJyLmxpc3ROYW1lc3BhY2VzKCkudGhlbigobmFtZXNwYWNlcykgPT4ge1xuICAgICAgICBleHBlY3QobmFtZXNwYWNlcykudG8uZGVlcC5lcXVhbCh7XG4gICAgICAgICAgcGVyc29uYWw6IFt7XG4gICAgICAgICAgICBwcmVmaXg6ICdJTkJPWC4nLFxuICAgICAgICAgICAgZGVsaW1pdGVyOiAnLidcbiAgICAgICAgICB9XSxcbiAgICAgICAgICB1c2VyczogZmFsc2UsXG4gICAgICAgICAgc2hhcmVkOiBmYWxzZVxuICAgICAgICB9KVxuICAgICAgICBleHBlY3QoYnIuZXhlYy5hcmdzWzBdWzBdKS50by5lcXVhbCgnTkFNRVNQQUNFJylcbiAgICAgICAgZXhwZWN0KGJyLmV4ZWMuYXJnc1swXVsxXSkudG8uZXF1YWwoJ05BTUVTUEFDRScpXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIGRvIG5vdGhpbmcgaWYgbm90IHN1cHBvcnRlZCcsICgpID0+IHtcbiAgICAgIGJyLl9jYXBhYmlsaXR5ID0gW11cbiAgICAgIHJldHVybiBici5saXN0TmFtZXNwYWNlcygpLnRoZW4oKG5hbWVzcGFjZXMpID0+IHtcbiAgICAgICAgZXhwZWN0KG5hbWVzcGFjZXMpLnRvLmJlLmZhbHNlXG4gICAgICAgIGV4cGVjdChici5leGVjLmNhbGxDb3VudCkudG8uZXF1YWwoMClcbiAgICAgIH0pXG4gICAgfSlcbiAgfSlcblxuICBkZXNjcmliZSgnI2NvbXByZXNzQ29ubmVjdGlvbicsICgpID0+IHtcbiAgICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICAgIHNpbm9uLnN0dWIoYnIsICdleGVjJylcbiAgICAgIHNpbm9uLnN0dWIoYnIuY2xpZW50LCAnZW5hYmxlQ29tcHJlc3Npb24nKVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIHJ1biBDT01QUkVTUz1ERUZMQVRFIGlmIHN1cHBvcnRlZCcsICgpID0+IHtcbiAgICAgIGJyLmV4ZWMud2l0aEFyZ3Moe1xuICAgICAgICBjb21tYW5kOiAnQ09NUFJFU1MnLFxuICAgICAgICBhdHRyaWJ1dGVzOiBbe1xuICAgICAgICAgIHR5cGU6ICdBVE9NJyxcbiAgICAgICAgICB2YWx1ZTogJ0RFRkxBVEUnXG4gICAgICAgIH1dXG4gICAgICB9KS5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSh7fSkpXG5cbiAgICAgIGJyLl9lbmFibGVDb21wcmVzc2lvbiA9IHRydWVcbiAgICAgIGJyLl9jYXBhYmlsaXR5ID0gWydDT01QUkVTUz1ERUZMQVRFJ11cbiAgICAgIHJldHVybiBici5jb21wcmVzc0Nvbm5lY3Rpb24oKS50aGVuKCgpID0+IHtcbiAgICAgICAgZXhwZWN0KGJyLmV4ZWMuY2FsbENvdW50KS50by5lcXVhbCgxKVxuICAgICAgICBleHBlY3QoYnIuY2xpZW50LmVuYWJsZUNvbXByZXNzaW9uLmNhbGxDb3VudCkudG8uZXF1YWwoMSlcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgZG8gbm90aGluZyBpZiBub3Qgc3VwcG9ydGVkJywgKCkgPT4ge1xuICAgICAgYnIuX2NhcGFiaWxpdHkgPSBbXVxuXG4gICAgICByZXR1cm4gYnIuY29tcHJlc3NDb25uZWN0aW9uKCkudGhlbigoKSA9PiB7XG4gICAgICAgIGV4cGVjdChici5leGVjLmNhbGxDb3VudCkudG8uZXF1YWwoMClcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgZG8gbm90aGluZyBpZiBub3QgZW5hYmxlZCcsICgpID0+IHtcbiAgICAgIGJyLl9lbmFibGVDb21wcmVzc2lvbiA9IGZhbHNlXG4gICAgICBici5fY2FwYWJpbGl0eSA9IFsnQ09NUFJFU1M9REVGTEFURSddXG5cbiAgICAgIHJldHVybiBici5jb21wcmVzc0Nvbm5lY3Rpb24oKS50aGVuKCgpID0+IHtcbiAgICAgICAgZXhwZWN0KGJyLmV4ZWMuY2FsbENvdW50KS50by5lcXVhbCgwKVxuICAgICAgfSlcbiAgICB9KVxuICB9KVxuXG4gIGRlc2NyaWJlKCcjbG9naW4nLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBjYWxsIExPR0lOJywgKCkgPT4ge1xuICAgICAgc2lub24uc3R1YihiciwgJ2V4ZWMnKS5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSh7fSkpXG4gICAgICBzaW5vbi5zdHViKGJyLCAndXBkYXRlQ2FwYWJpbGl0eScpLnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKHRydWUpKVxuXG4gICAgICByZXR1cm4gYnIubG9naW4oe1xuICAgICAgICB1c2VyOiAndTEnLFxuICAgICAgICBwYXNzOiAncDEnXG4gICAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgZXhwZWN0KGJyLmV4ZWMuY2FsbENvdW50KS50by5lcXVhbCgxKVxuICAgICAgICBleHBlY3QoYnIuZXhlYy5hcmdzWzBdWzBdKS50by5kZWVwLmVxdWFsKHtcbiAgICAgICAgICBjb21tYW5kOiAnbG9naW4nLFxuICAgICAgICAgIGF0dHJpYnV0ZXM6IFt7XG4gICAgICAgICAgICB0eXBlOiAnU1RSSU5HJyxcbiAgICAgICAgICAgIHZhbHVlOiAndTEnXG4gICAgICAgICAgfSwge1xuICAgICAgICAgICAgdHlwZTogJ1NUUklORycsXG4gICAgICAgICAgICB2YWx1ZTogJ3AxJyxcbiAgICAgICAgICAgIHNlbnNpdGl2ZTogdHJ1ZVxuICAgICAgICAgIH1dXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIGNhbGwgWE9BVVRIMicsICgpID0+IHtcbiAgICAgIHNpbm9uLnN0dWIoYnIsICdleGVjJykucmV0dXJucyhQcm9taXNlLnJlc29sdmUoe30pKVxuICAgICAgc2lub24uc3R1YihiciwgJ3VwZGF0ZUNhcGFiaWxpdHknKS5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSh0cnVlKSlcblxuICAgICAgYnIuX2NhcGFiaWxpdHkgPSBbJ0FVVEg9WE9BVVRIMiddXG4gICAgICBici5sb2dpbih7XG4gICAgICAgIHVzZXI6ICd1MScsXG4gICAgICAgIHhvYXV0aDI6ICdhYmMnXG4gICAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgZXhwZWN0KGJyLmV4ZWMuY2FsbENvdW50KS50by5lcXVhbCgxKVxuICAgICAgICBleHBlY3QoYnIuZXhlYy5hcmdzWzBdWzBdKS50by5kZWVwLmVxdWFsKHtcbiAgICAgICAgICBjb21tYW5kOiAnQVVUSEVOVElDQVRFJyxcbiAgICAgICAgICBhdHRyaWJ1dGVzOiBbe1xuICAgICAgICAgICAgdHlwZTogJ0FUT00nLFxuICAgICAgICAgICAgdmFsdWU6ICdYT0FVVEgyJ1xuICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgIHR5cGU6ICdBVE9NJyxcbiAgICAgICAgICAgIHZhbHVlOiAnZFhObGNqMTFNUUZoZFhSb1BVSmxZWEpsY2lCaFltTUJBUT09JyxcbiAgICAgICAgICAgIHNlbnNpdGl2ZTogdHJ1ZVxuICAgICAgICAgIH1dXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pXG4gIH0pXG5cbiAgZGVzY3JpYmUoJyN1cGRhdGVJZCcsICgpID0+IHtcbiAgICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICAgIHNpbm9uLnN0dWIoYnIsICdleGVjJylcbiAgICB9KVxuXG4gICAgaXQoJ3Nob3VsZCBub3Qgbm90aGluZyBpZiBub3Qgc3VwcG9ydGVkJywgKCkgPT4ge1xuICAgICAgYnIuX2NhcGFiaWxpdHkgPSBbXVxuXG4gICAgICByZXR1cm4gYnIudXBkYXRlSWQoe1xuICAgICAgICBhOiAnYicsXG4gICAgICAgIGM6ICdkJ1xuICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgIGV4cGVjdChici5zZXJ2ZXJJZCkudG8uYmUuZmFsc2VcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgc2VuZCBOSUwnLCAoKSA9PiB7XG4gICAgICBici5leGVjLndpdGhBcmdzKHtcbiAgICAgICAgY29tbWFuZDogJ0lEJyxcbiAgICAgICAgYXR0cmlidXRlczogW1xuICAgICAgICAgIG51bGxcbiAgICAgICAgXVxuICAgICAgfSkucmV0dXJucyhQcm9taXNlLnJlc29sdmUoe1xuICAgICAgICBwYXlsb2FkOiB7XG4gICAgICAgICAgSUQ6IFt7XG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiBbXG4gICAgICAgICAgICAgIG51bGxcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XVxuICAgICAgICB9XG4gICAgICB9KSlcbiAgICAgIGJyLl9jYXBhYmlsaXR5ID0gWydJRCddXG5cbiAgICAgIHJldHVybiBici51cGRhdGVJZChudWxsKS50aGVuKCgpID0+IHtcbiAgICAgICAgZXhwZWN0KGJyLnNlcnZlcklkKS50by5kZWVwLmVxdWFsKHt9KVxuICAgICAgfSlcbiAgICB9KVxuXG4gICAgaXQoJ3Nob3VsZCBleGhhbmdlIElEIHZhbHVlcycsICgpID0+IHtcbiAgICAgIGJyLmV4ZWMud2l0aEFyZ3Moe1xuICAgICAgICBjb21tYW5kOiAnSUQnLFxuICAgICAgICBhdHRyaWJ1dGVzOiBbXG4gICAgICAgICAgWydja2V5MScsICdjdmFsMScsICdja2V5MicsICdjdmFsMiddXG4gICAgICAgIF1cbiAgICAgIH0pLnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKHtcbiAgICAgICAgcGF5bG9hZDoge1xuICAgICAgICAgIElEOiBbe1xuICAgICAgICAgICAgYXR0cmlidXRlczogW1xuICAgICAgICAgICAgICBbe1xuICAgICAgICAgICAgICAgIHZhbHVlOiAnc2tleTEnXG4gICAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogJ3N2YWwxJ1xuICAgICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgdmFsdWU6ICdza2V5MidcbiAgICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIHZhbHVlOiAnc3ZhbDInXG4gICAgICAgICAgICAgIH1dXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfV1cbiAgICAgICAgfVxuICAgICAgfSkpXG4gICAgICBici5fY2FwYWJpbGl0eSA9IFsnSUQnXVxuXG4gICAgICByZXR1cm4gYnIudXBkYXRlSWQoe1xuICAgICAgICBja2V5MTogJ2N2YWwxJyxcbiAgICAgICAgY2tleTI6ICdjdmFsMidcbiAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICBleHBlY3QoYnIuc2VydmVySWQpLnRvLmRlZXAuZXF1YWwoe1xuICAgICAgICAgIHNrZXkxOiAnc3ZhbDEnLFxuICAgICAgICAgIHNrZXkyOiAnc3ZhbDInXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pXG4gIH0pXG5cbiAgZGVzY3JpYmUoJyNsaXN0TWFpbGJveGVzJywgKCkgPT4ge1xuICAgIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgICAgc2lub24uc3R1YihiciwgJ2V4ZWMnKVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIGNhbGwgTElTVCBhbmQgTFNVQiBpbiBzZXF1ZW5jZScsICgpID0+IHtcbiAgICAgIGJyLmV4ZWMud2l0aEFyZ3Moe1xuICAgICAgICBjb21tYW5kOiAnTElTVCcsXG4gICAgICAgIGF0dHJpYnV0ZXM6IFsnJywgJyonXVxuICAgICAgfSkucmV0dXJucyhQcm9taXNlLnJlc29sdmUoe1xuICAgICAgICBwYXlsb2FkOiB7XG4gICAgICAgICAgTElTVDogW2ZhbHNlXVxuICAgICAgICB9XG4gICAgICB9KSlcblxuICAgICAgYnIuZXhlYy53aXRoQXJncyh7XG4gICAgICAgIGNvbW1hbmQ6ICdMU1VCJyxcbiAgICAgICAgYXR0cmlidXRlczogWycnLCAnKiddXG4gICAgICB9KS5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSh7XG4gICAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgICBMU1VCOiBbZmFsc2VdXG4gICAgICAgIH1cbiAgICAgIH0pKVxuXG4gICAgICByZXR1cm4gYnIubGlzdE1haWxib3hlcygpLnRoZW4oKHRyZWUpID0+IHtcbiAgICAgICAgZXhwZWN0KHRyZWUpLnRvLmV4aXN0XG4gICAgICB9KVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIG5vdCBkaWUgb24gTklMIHNlcGFyYXRvcnMnLCAoKSA9PiB7XG4gICAgICBici5leGVjLndpdGhBcmdzKHtcbiAgICAgICAgY29tbWFuZDogJ0xJU1QnLFxuICAgICAgICBhdHRyaWJ1dGVzOiBbJycsICcqJ11cbiAgICAgIH0pLnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKHtcbiAgICAgICAgcGF5bG9hZDoge1xuICAgICAgICAgIExJU1Q6IFtcbiAgICAgICAgICAgIHBhcnNlcih0b1R5cGVkQXJyYXkoJyogTElTVCAoXFxcXE5vSW5mZXJpb3JzKSBOSUwgXCJJTkJPWFwiJykpXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICB9KSlcblxuICAgICAgYnIuZXhlYy53aXRoQXJncyh7XG4gICAgICAgIGNvbW1hbmQ6ICdMU1VCJyxcbiAgICAgICAgYXR0cmlidXRlczogWycnLCAnKiddXG4gICAgICB9KS5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSh7XG4gICAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgICBMU1VCOiBbXG4gICAgICAgICAgICBwYXJzZXIodG9UeXBlZEFycmF5KCcqIExTVUIgKFxcXFxOb0luZmVyaW9ycykgTklMIFwiSU5CT1hcIicpKVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgfSkpXG5cbiAgICAgIHJldHVybiBici5saXN0TWFpbGJveGVzKCkudGhlbigodHJlZSkgPT4ge1xuICAgICAgICBleHBlY3QodHJlZSkudG8uZXhpc3RcbiAgICAgIH0pXG4gICAgfSlcbiAgfSlcblxuICBkZXNjcmliZSgnI2NyZWF0ZU1haWxib3gnLCAoKSA9PiB7XG4gICAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgICBzaW5vbi5zdHViKGJyLCAnZXhlYycpXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgY2FsbCBDUkVBVEUgd2l0aCBhIHN0cmluZyBwYXlsb2FkJywgKCkgPT4ge1xuICAgICAgLy8gVGhlIHNwZWMgYWxsb3dzIHVucXVvdGVkIEFUT00tc3R5bGUgc3ludGF4IHRvbywgYnV0IGZvclxuICAgICAgLy8gc2ltcGxpY2l0eSB3ZSBhbHdheXMgZ2VuZXJhdGUgYSBzdHJpbmcgZXZlbiBpZiBpdCBjb3VsZCBiZVxuICAgICAgLy8gZXhwcmVzc2VkIGFzIGFuIGF0b20uXG4gICAgICBici5leGVjLndpdGhBcmdzKHtcbiAgICAgICAgY29tbWFuZDogJ0NSRUFURScsXG4gICAgICAgIGF0dHJpYnV0ZXM6IFsnbWFpbGJveG5hbWUnXVxuICAgICAgfSkucmV0dXJucyhQcm9taXNlLnJlc29sdmUoKSlcblxuICAgICAgcmV0dXJuIGJyLmNyZWF0ZU1haWxib3goJ21haWxib3huYW1lJykudGhlbigoKSA9PiB7XG4gICAgICAgIGV4cGVjdChici5leGVjLmNhbGxDb3VudCkudG8uZXF1YWwoMSlcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgY2FsbCBtdXRmNyBlbmNvZGUgdGhlIGFyZ3VtZW50JywgKCkgPT4ge1xuICAgICAgLy8gRnJvbSBSRkMgMzUwMVxuICAgICAgYnIuZXhlYy53aXRoQXJncyh7XG4gICAgICAgIGNvbW1hbmQ6ICdDUkVBVEUnLFxuICAgICAgICBhdHRyaWJ1dGVzOiBbJ35wZXRlci9tYWlsLyZVLEJURnctLyZaZVZuTElxZS0nXVxuICAgICAgfSkucmV0dXJucyhQcm9taXNlLnJlc29sdmUoKSlcblxuICAgICAgcmV0dXJuIGJyLmNyZWF0ZU1haWxib3goJ35wZXRlci9tYWlsL1xcdTUzZjBcXHU1MzE3L1xcdTY1ZTVcXHU2NzJjXFx1OGE5ZScpLnRoZW4oKCkgPT4ge1xuICAgICAgICBleHBlY3QoYnIuZXhlYy5jYWxsQ291bnQpLnRvLmVxdWFsKDEpXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIHRyZWF0IGFuIEFMUkVBRFlFWElTVFMgcmVzcG9uc2UgYXMgc3VjY2VzcycsICgpID0+IHtcbiAgICAgIHZhciBmYWtlRXJyID0ge1xuICAgICAgICBjb2RlOiAnQUxSRUFEWUVYSVNUUydcbiAgICAgIH1cbiAgICAgIGJyLmV4ZWMud2l0aEFyZ3Moe1xuICAgICAgICBjb21tYW5kOiAnQ1JFQVRFJyxcbiAgICAgICAgYXR0cmlidXRlczogWydtYWlsYm94bmFtZSddXG4gICAgICB9KS5yZXR1cm5zKFByb21pc2UucmVqZWN0KGZha2VFcnIpKVxuXG4gICAgICByZXR1cm4gYnIuY3JlYXRlTWFpbGJveCgnbWFpbGJveG5hbWUnKS50aGVuKCgpID0+IHtcbiAgICAgICAgZXhwZWN0KGJyLmV4ZWMuY2FsbENvdW50KS50by5lcXVhbCgxKVxuICAgICAgfSlcbiAgICB9KVxuICB9KVxuXG4gIGRlc2NyaWJlKCcjZGVsZXRlTWFpbGJveCcsICgpID0+IHtcbiAgICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICAgIHNpbm9uLnN0dWIoYnIsICdleGVjJylcbiAgICB9KVxuXG4gICAgaXQoJ3Nob3VsZCBjYWxsIERFTEVURSB3aXRoIGEgc3RyaW5nIHBheWxvYWQnLCAoKSA9PiB7XG4gICAgICBici5leGVjLndpdGhBcmdzKHtcbiAgICAgICAgY29tbWFuZDogJ0RFTEVURScsXG4gICAgICAgIGF0dHJpYnV0ZXM6IFsnbWFpbGJveG5hbWUnXVxuICAgICAgfSkucmV0dXJucyhQcm9taXNlLnJlc29sdmUoKSlcblxuICAgICAgcmV0dXJuIGJyLmRlbGV0ZU1haWxib3goJ21haWxib3huYW1lJykudGhlbigoKSA9PiB7XG4gICAgICAgIGV4cGVjdChici5leGVjLmNhbGxDb3VudCkudG8uZXF1YWwoMSlcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgY2FsbCBtdXRmNyBlbmNvZGUgdGhlIGFyZ3VtZW50JywgKCkgPT4ge1xuICAgICAgLy8gRnJvbSBSRkMgMzUwMVxuICAgICAgYnIuZXhlYy53aXRoQXJncyh7XG4gICAgICAgIGNvbW1hbmQ6ICdERUxFVEUnLFxuICAgICAgICBhdHRyaWJ1dGVzOiBbJ35wZXRlci9tYWlsLyZVLEJURnctLyZaZVZuTElxZS0nXVxuICAgICAgfSkucmV0dXJucyhQcm9taXNlLnJlc29sdmUoKSlcblxuICAgICAgcmV0dXJuIGJyLmRlbGV0ZU1haWxib3goJ35wZXRlci9tYWlsL1xcdTUzZjBcXHU1MzE3L1xcdTY1ZTVcXHU2NzJjXFx1OGE5ZScpLnRoZW4oKCkgPT4ge1xuICAgICAgICBleHBlY3QoYnIuZXhlYy5jYWxsQ291bnQpLnRvLmVxdWFsKDEpXG4gICAgICB9KVxuICAgIH0pXG4gIH0pXG5cbiAgZGVzY3JpYmUuc2tpcCgnI2xpc3RNZXNzYWdlcycsICgpID0+IHtcbiAgICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICAgIHNpbm9uLnN0dWIoYnIsICdleGVjJylcbiAgICAgIHNpbm9uLnN0dWIoYnIsICdfYnVpbGRGRVRDSENvbW1hbmQnKVxuICAgICAgc2lub24uc3R1YihiciwgJ19wYXJzZUZFVENIJylcbiAgICB9KVxuXG4gICAgaXQoJ3Nob3VsZCBjYWxsIEZFVENIJywgKCkgPT4ge1xuICAgICAgYnIuZXhlYy5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSgnYWJjJykpXG4gICAgICBici5fYnVpbGRGRVRDSENvbW1hbmQud2l0aEFyZ3MoWycxOjInLCBbJ3VpZCcsICdmbGFncyddLCB7XG4gICAgICAgIGJ5VWlkOiB0cnVlXG4gICAgICB9XSkucmV0dXJucyh7fSlcblxuICAgICAgcmV0dXJuIGJyLmxpc3RNZXNzYWdlcygnSU5CT1gnLCAnMToyJywgWyd1aWQnLCAnZmxhZ3MnXSwge1xuICAgICAgICBieVVpZDogdHJ1ZVxuICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgIGV4cGVjdChici5fYnVpbGRGRVRDSENvbW1hbmQuY2FsbENvdW50KS50by5lcXVhbCgxKVxuICAgICAgICBleHBlY3QoYnIuX3BhcnNlRkVUQ0gud2l0aEFyZ3MoJ2FiYycpLmNhbGxDb3VudCkudG8uZXF1YWwoMSlcbiAgICAgIH0pXG4gICAgfSlcbiAgfSlcblxuICBkZXNjcmliZS5za2lwKCcjc2VhcmNoJywgKCkgPT4ge1xuICAgIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgICAgc2lub24uc3R1YihiciwgJ2V4ZWMnKVxuICAgICAgc2lub24uc3R1YihiciwgJ19idWlsZFNFQVJDSENvbW1hbmQnKVxuICAgICAgc2lub24uc3R1YihiciwgJ19wYXJzZVNFQVJDSCcpXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgY2FsbCBTRUFSQ0gnLCAoKSA9PiB7XG4gICAgICBici5leGVjLnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKCdhYmMnKSlcbiAgICAgIGJyLl9idWlsZFNFQVJDSENvbW1hbmQud2l0aEFyZ3Moe1xuICAgICAgICB1aWQ6IDFcbiAgICAgIH0sIHtcbiAgICAgICAgYnlVaWQ6IHRydWVcbiAgICAgIH0pLnJldHVybnMoe30pXG5cbiAgICAgIHJldHVybiBici5zZWFyY2goJ0lOQk9YJywge1xuICAgICAgICB1aWQ6IDFcbiAgICAgIH0sIHtcbiAgICAgICAgYnlVaWQ6IHRydWVcbiAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICBleHBlY3QoYnIuX2J1aWxkU0VBUkNIQ29tbWFuZC5jYWxsQ291bnQpLnRvLmVxdWFsKDEpXG4gICAgICAgIGV4cGVjdChici5leGVjLmNhbGxDb3VudCkudG8uZXF1YWwoMSlcbiAgICAgICAgZXhwZWN0KGJyLl9wYXJzZVNFQVJDSC53aXRoQXJncygnYWJjJykuY2FsbENvdW50KS50by5lcXVhbCgxKVxuICAgICAgfSlcbiAgICB9KVxuICB9KVxuXG4gIGRlc2NyaWJlKCcjdXBsb2FkJywgKCkgPT4ge1xuICAgIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgICAgc2lub24uc3R1YihiciwgJ2V4ZWMnKVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIGNhbGwgQVBQRU5EIHdpdGggY3VzdG9tIGZsYWcnLCAoKSA9PiB7XG4gICAgICBici5leGVjLnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKCkpXG5cbiAgICAgIHJldHVybiBici51cGxvYWQoJ21haWxib3gnLCAndGhpcyBpcyBhIG1lc3NhZ2UnLCB7XG4gICAgICAgIGZsYWdzOiBbJ1xcXFwkTXlGbGFnJ11cbiAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICBleHBlY3QoYnIuZXhlYy5jYWxsQ291bnQpLnRvLmVxdWFsKDEpXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIGNhbGwgQVBQRU5EIHcvbyBmbGFncycsICgpID0+IHtcbiAgICAgIGJyLmV4ZWMucmV0dXJucyhQcm9taXNlLnJlc29sdmUoKSlcblxuICAgICAgcmV0dXJuIGJyLnVwbG9hZCgnbWFpbGJveCcsICd0aGlzIGlzIGEgbWVzc2FnZScpLnRoZW4oKCkgPT4ge1xuICAgICAgICBleHBlY3QoYnIuZXhlYy5jYWxsQ291bnQpLnRvLmVxdWFsKDEpXG4gICAgICB9KVxuICAgIH0pXG4gIH0pXG5cbiAgZGVzY3JpYmUuc2tpcCgnI3NldEZsYWdzJywgKCkgPT4ge1xuICAgIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgICAgc2lub24uc3R1YihiciwgJ2V4ZWMnKVxuICAgICAgc2lub24uc3R1YihiciwgJ19idWlsZFNUT1JFQ29tbWFuZCcpXG4gICAgICBzaW5vbi5zdHViKGJyLCAnX3BhcnNlRkVUQ0gnKVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIGNhbGwgU1RPUkUnLCAoKSA9PiB7XG4gICAgICBici5leGVjLnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKCdhYmMnKSlcbiAgICAgIGJyLl9idWlsZFNUT1JFQ29tbWFuZC53aXRoQXJncygnMToyJywgJ0ZMQUdTJywgWydcXFxcU2VlbicsICckTXlGbGFnJ10sIHtcbiAgICAgICAgYnlVaWQ6IHRydWVcbiAgICAgIH0pLnJldHVybnMoe30pXG5cbiAgICAgIHJldHVybiBici5zZXRGbGFncygnSU5CT1gnLCAnMToyJywgWydcXFxcU2VlbicsICckTXlGbGFnJ10sIHtcbiAgICAgICAgYnlVaWQ6IHRydWVcbiAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICBleHBlY3QoYnIuZXhlYy5jYWxsQ291bnQpLnRvLmVxdWFsKDEpXG4gICAgICAgIGV4cGVjdChici5fcGFyc2VGRVRDSC53aXRoQXJncygnYWJjJykuY2FsbENvdW50KS50by5lcXVhbCgxKVxuICAgICAgfSlcbiAgICB9KVxuICB9KVxuXG4gIGRlc2NyaWJlLnNraXAoJyNzdG9yZScsICgpID0+IHtcbiAgICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICAgIHNpbm9uLnN0dWIoYnIsICdleGVjJylcbiAgICAgIHNpbm9uLnN0dWIoYnIsICdfYnVpbGRTVE9SRUNvbW1hbmQnKVxuICAgICAgc2lub24uc3R1YihiciwgJ19wYXJzZUZFVENIJylcbiAgICB9KVxuXG4gICAgaXQoJ3Nob3VsZCBjYWxsIFNUT1JFJywgKCkgPT4ge1xuICAgICAgYnIuZXhlYy5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSgnYWJjJykpXG4gICAgICBici5fYnVpbGRTVE9SRUNvbW1hbmQud2l0aEFyZ3MoJzE6MicsICcrWC1HTS1MQUJFTFMnLCBbJ1xcXFxTZW50JywgJ1xcXFxKdW5rJ10sIHtcbiAgICAgICAgYnlVaWQ6IHRydWVcbiAgICAgIH0pLnJldHVybnMoe30pXG5cbiAgICAgIHJldHVybiBici5zdG9yZSgnSU5CT1gnLCAnMToyJywgJytYLUdNLUxBQkVMUycsIFsnXFxcXFNlbnQnLCAnXFxcXEp1bmsnXSwge1xuICAgICAgICBieVVpZDogdHJ1ZVxuICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgIGV4cGVjdChici5fYnVpbGRTVE9SRUNvbW1hbmQuY2FsbENvdW50KS50by5lcXVhbCgxKVxuICAgICAgICBleHBlY3QoYnIuZXhlYy5jYWxsQ291bnQpLnRvLmVxdWFsKDEpXG4gICAgICAgIGV4cGVjdChici5fcGFyc2VGRVRDSC53aXRoQXJncygnYWJjJykuY2FsbENvdW50KS50by5lcXVhbCgxKVxuICAgICAgfSlcbiAgICB9KVxuICB9KVxuXG4gIGRlc2NyaWJlKCcjZGVsZXRlTWVzc2FnZXMnLCAoKSA9PiB7XG4gICAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgICBzaW5vbi5zdHViKGJyLCAnc2V0RmxhZ3MnKVxuICAgICAgc2lub24uc3R1YihiciwgJ2V4ZWMnKVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIGNhbGwgVUlEIEVYUFVOR0UnLCAoKSA9PiB7XG4gICAgICBici5leGVjLndpdGhBcmdzKHtcbiAgICAgICAgY29tbWFuZDogJ1VJRCBFWFBVTkdFJyxcbiAgICAgICAgYXR0cmlidXRlczogW3tcbiAgICAgICAgICB0eXBlOiAnc2VxdWVuY2UnLFxuICAgICAgICAgIHZhbHVlOiAnMToyJ1xuICAgICAgICB9XVxuICAgICAgfSkucmV0dXJucyhQcm9taXNlLnJlc29sdmUoJ2FiYycpKVxuICAgICAgYnIuc2V0RmxhZ3Mud2l0aEFyZ3MoJ0lOQk9YJywgJzE6MicsIHtcbiAgICAgICAgYWRkOiAnXFxcXERlbGV0ZWQnXG4gICAgICB9KS5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSgpKVxuXG4gICAgICBici5fY2FwYWJpbGl0eSA9IFsnVUlEUExVUyddXG4gICAgICByZXR1cm4gYnIuZGVsZXRlTWVzc2FnZXMoJ0lOQk9YJywgJzE6MicsIHtcbiAgICAgICAgYnlVaWQ6IHRydWVcbiAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICBleHBlY3QoYnIuZXhlYy5jYWxsQ291bnQpLnRvLmVxdWFsKDEpXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIGNhbGwgRVhQVU5HRScsICgpID0+IHtcbiAgICAgIGJyLmV4ZWMud2l0aEFyZ3MoJ0VYUFVOR0UnKS5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSgnYWJjJykpXG4gICAgICBici5zZXRGbGFncy53aXRoQXJncygnSU5CT1gnLCAnMToyJywge1xuICAgICAgICBhZGQ6ICdcXFxcRGVsZXRlZCdcbiAgICAgIH0pLnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKCkpXG5cbiAgICAgIGJyLl9jYXBhYmlsaXR5ID0gW11cbiAgICAgIHJldHVybiBici5kZWxldGVNZXNzYWdlcygnSU5CT1gnLCAnMToyJywge1xuICAgICAgICBieVVpZDogdHJ1ZVxuICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgIGV4cGVjdChici5leGVjLmNhbGxDb3VudCkudG8uZXF1YWwoMSlcbiAgICAgIH0pXG4gICAgfSlcbiAgfSlcblxuICBkZXNjcmliZSgnI2NvcHlNZXNzYWdlcycsICgpID0+IHtcbiAgICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICAgIHNpbm9uLnN0dWIoYnIsICdleGVjJylcbiAgICB9KVxuXG4gICAgaXQoJ3Nob3VsZCBjYWxsIENPUFknLCAoKSA9PiB7XG4gICAgICBici5leGVjLndpdGhBcmdzKHtcbiAgICAgICAgY29tbWFuZDogJ1VJRCBDT1BZJyxcbiAgICAgICAgYXR0cmlidXRlczogW3tcbiAgICAgICAgICB0eXBlOiAnc2VxdWVuY2UnLFxuICAgICAgICAgIHZhbHVlOiAnMToyJ1xuICAgICAgICB9LCB7XG4gICAgICAgICAgdHlwZTogJ2F0b20nLFxuICAgICAgICAgIHZhbHVlOiAnW0dtYWlsXS9UcmFzaCdcbiAgICAgICAgfV1cbiAgICAgIH0pLnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKHtcbiAgICAgICAgaHVtYW5SZWFkYWJsZTogJ2FiYydcbiAgICAgIH0pKVxuXG4gICAgICByZXR1cm4gYnIuY29weU1lc3NhZ2VzKCdJTkJPWCcsICcxOjInLCAnW0dtYWlsXS9UcmFzaCcsIHtcbiAgICAgICAgYnlVaWQ6IHRydWVcbiAgICAgIH0pLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGV4cGVjdChyZXNwb25zZSkudG8uZXF1YWwoJ2FiYycpXG4gICAgICAgIGV4cGVjdChici5leGVjLmNhbGxDb3VudCkudG8uZXF1YWwoMSlcbiAgICAgIH0pXG4gICAgfSlcbiAgfSlcblxuICBkZXNjcmliZSgnI21vdmVNZXNzYWdlcycsICgpID0+IHtcbiAgICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICAgIHNpbm9uLnN0dWIoYnIsICdleGVjJylcbiAgICAgIHNpbm9uLnN0dWIoYnIsICdjb3B5TWVzc2FnZXMnKVxuICAgICAgc2lub24uc3R1YihiciwgJ2RlbGV0ZU1lc3NhZ2VzJylcbiAgICB9KVxuXG4gICAgaXQoJ3Nob3VsZCBjYWxsIE1PVkUgaWYgc3VwcG9ydGVkJywgKCkgPT4ge1xuICAgICAgYnIuZXhlYy53aXRoQXJncyh7XG4gICAgICAgIGNvbW1hbmQ6ICdVSUQgTU9WRScsXG4gICAgICAgIGF0dHJpYnV0ZXM6IFt7XG4gICAgICAgICAgdHlwZTogJ3NlcXVlbmNlJyxcbiAgICAgICAgICB2YWx1ZTogJzE6MidcbiAgICAgICAgfSwge1xuICAgICAgICAgIHR5cGU6ICdhdG9tJyxcbiAgICAgICAgICB2YWx1ZTogJ1tHbWFpbF0vVHJhc2gnXG4gICAgICAgIH1dXG4gICAgICB9LCBbJ09LJ10pLnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKCdhYmMnKSlcblxuICAgICAgYnIuX2NhcGFiaWxpdHkgPSBbJ01PVkUnXVxuICAgICAgcmV0dXJuIGJyLm1vdmVNZXNzYWdlcygnSU5CT1gnLCAnMToyJywgJ1tHbWFpbF0vVHJhc2gnLCB7XG4gICAgICAgIGJ5VWlkOiB0cnVlXG4gICAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgZXhwZWN0KGJyLmV4ZWMuY2FsbENvdW50KS50by5lcXVhbCgxKVxuICAgICAgfSlcbiAgICB9KVxuXG4gICAgaXQoJ3Nob3VsZCBmYWxsYmFjayB0byBjb3B5K2V4cHVuZ2UnLCAoKSA9PiB7XG4gICAgICBici5jb3B5TWVzc2FnZXMud2l0aEFyZ3MoJ0lOQk9YJywgJzE6MicsICdbR21haWxdL1RyYXNoJywge1xuICAgICAgICBieVVpZDogdHJ1ZVxuICAgICAgfSkucmV0dXJucyhQcm9taXNlLnJlc29sdmUoKSlcbiAgICAgIGJyLmRlbGV0ZU1lc3NhZ2VzLndpdGhBcmdzKCcxOjInLCB7XG4gICAgICAgIGJ5VWlkOiB0cnVlXG4gICAgICB9KS5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSgpKVxuXG4gICAgICBici5fY2FwYWJpbGl0eSA9IFtdXG4gICAgICByZXR1cm4gYnIubW92ZU1lc3NhZ2VzKCdJTkJPWCcsICcxOjInLCAnW0dtYWlsXS9UcmFzaCcsIHtcbiAgICAgICAgYnlVaWQ6IHRydWVcbiAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICBleHBlY3QoYnIuZGVsZXRlTWVzc2FnZXMuY2FsbENvdW50KS50by5lcXVhbCgxKVxuICAgICAgfSlcbiAgICB9KVxuICB9KVxuXG4gIGRlc2NyaWJlKCcjX3Nob3VsZFNlbGVjdE1haWxib3gnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gdHJ1ZSB3aGVuIGN0eCBpcyB1bmRlZmluZWQnLCAoKSA9PiB7XG4gICAgICBleHBlY3QoYnIuX3Nob3VsZFNlbGVjdE1haWxib3goJ3BhdGgnKSkudG8uYmUudHJ1ZVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIHJldHVybiB0cnVlIHdoZW4gYSBkaWZmZXJlbnQgcGF0aCBpcyBxdWV1ZWQnLCAoKSA9PiB7XG4gICAgICBzaW5vbi5zdHViKGJyLmNsaWVudCwgJ2dldFByZXZpb3VzbHlRdWV1ZWQnKS5yZXR1cm5zKHtcbiAgICAgICAgcmVxdWVzdDoge1xuICAgICAgICAgIGNvbW1hbmQ6ICdTRUxFQ1QnLFxuICAgICAgICAgIGF0dHJpYnV0ZXM6IFt7XG4gICAgICAgICAgICB0eXBlOiAnU1RSSU5HJyxcbiAgICAgICAgICAgIHZhbHVlOiAncXVldWVkIHBhdGgnXG4gICAgICAgICAgfV1cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgZXhwZWN0KGJyLl9zaG91bGRTZWxlY3RNYWlsYm94KCdwYXRoJywge30pKS50by5iZS50cnVlXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGZhbHNlIHdoZW4gdGhlIHNhbWUgcGF0aCBpcyBxdWV1ZWQnLCAoKSA9PiB7XG4gICAgICBzaW5vbi5zdHViKGJyLmNsaWVudCwgJ2dldFByZXZpb3VzbHlRdWV1ZWQnKS5yZXR1cm5zKHtcbiAgICAgICAgcmVxdWVzdDoge1xuICAgICAgICAgIGNvbW1hbmQ6ICdTRUxFQ1QnLFxuICAgICAgICAgIGF0dHJpYnV0ZXM6IFt7XG4gICAgICAgICAgICB0eXBlOiAnU1RSSU5HJyxcbiAgICAgICAgICAgIHZhbHVlOiAncXVldWVkIHBhdGgnXG4gICAgICAgICAgfV1cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgZXhwZWN0KGJyLl9zaG91bGRTZWxlY3RNYWlsYm94KCdxdWV1ZWQgcGF0aCcsIHt9KSkudG8uYmUuZmFsc2VcbiAgICB9KVxuICB9KVxuXG4gIGRlc2NyaWJlKCcjc2VsZWN0TWFpbGJveCcsICgpID0+IHtcbiAgICBjb25zdCBwYXRoID0gJ1tHbWFpbF0vVHJhc2gnXG4gICAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgICBzaW5vbi5zdHViKGJyLCAnZXhlYycpXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgcnVuIFNFTEVDVCcsICgpID0+IHtcbiAgICAgIGJyLmV4ZWMud2l0aEFyZ3Moe1xuICAgICAgICBjb21tYW5kOiAnU0VMRUNUJyxcbiAgICAgICAgYXR0cmlidXRlczogW3tcbiAgICAgICAgICB0eXBlOiAnU1RSSU5HJyxcbiAgICAgICAgICB2YWx1ZTogcGF0aFxuICAgICAgICB9XVxuICAgICAgfSkucmV0dXJucyhQcm9taXNlLnJlc29sdmUoe1xuICAgICAgICBjb2RlOiAnUkVBRC1XUklURSdcbiAgICAgIH0pKVxuXG4gICAgICByZXR1cm4gYnIuc2VsZWN0TWFpbGJveChwYXRoKS50aGVuKCgpID0+IHtcbiAgICAgICAgZXhwZWN0KGJyLmV4ZWMuY2FsbENvdW50KS50by5lcXVhbCgxKVxuICAgICAgICBleHBlY3QoYnIuX3N0YXRlKS50by5lcXVhbChTVEFURV9TRUxFQ1RFRClcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgcnVuIFNFTEVDVCB3aXRoIENPTkRTVE9SRScsICgpID0+IHtcbiAgICAgIGJyLmV4ZWMud2l0aEFyZ3Moe1xuICAgICAgICBjb21tYW5kOiAnU0VMRUNUJyxcbiAgICAgICAgYXR0cmlidXRlczogW3tcbiAgICAgICAgICB0eXBlOiAnU1RSSU5HJyxcbiAgICAgICAgICB2YWx1ZTogcGF0aFxuICAgICAgICB9LFxuICAgICAgICBbe1xuICAgICAgICAgIHR5cGU6ICdBVE9NJyxcbiAgICAgICAgICB2YWx1ZTogJ0NPTkRTVE9SRSdcbiAgICAgICAgfV1cbiAgICAgICAgXVxuICAgICAgfSkucmV0dXJucyhQcm9taXNlLnJlc29sdmUoe1xuICAgICAgICBjb2RlOiAnUkVBRC1XUklURSdcbiAgICAgIH0pKVxuXG4gICAgICBici5fY2FwYWJpbGl0eSA9IFsnQ09ORFNUT1JFJ11cbiAgICAgIHJldHVybiBici5zZWxlY3RNYWlsYm94KHBhdGgsIHtcbiAgICAgICAgY29uZHN0b3JlOiB0cnVlXG4gICAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgZXhwZWN0KGJyLmV4ZWMuY2FsbENvdW50KS50by5lcXVhbCgxKVxuICAgICAgICBleHBlY3QoYnIuX3N0YXRlKS50by5lcXVhbChTVEFURV9TRUxFQ1RFRClcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIGRlc2NyaWJlKCdzaG91bGQgZW1pdCBvbnNlbGVjdG1haWxib3ggYmVmb3JlIHNlbGVjdE1haWxib3ggaXMgcmVzb2x2ZWQnLCAoKSA9PiB7XG4gICAgICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICAgICAgYnIuZXhlYy5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSh7XG4gICAgICAgICAgY29kZTogJ1JFQUQtV1JJVEUnXG4gICAgICAgIH0pKVxuICAgICAgfSlcblxuICAgICAgaXQoJ3doZW4gaXQgcmV0dXJucyBhIHByb21pc2UnLCAoKSA9PiB7XG4gICAgICAgIHZhciBwcm9taXNlUmVzb2x2ZWQgPSBmYWxzZVxuICAgICAgICBici5vbnNlbGVjdG1haWxib3ggPSAoKSA9PiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgIHJlc29sdmUoKVxuICAgICAgICAgIHByb21pc2VSZXNvbHZlZCA9IHRydWVcbiAgICAgICAgfSlcbiAgICAgICAgdmFyIG9uc2VsZWN0bWFpbGJveFNweSA9IHNpbm9uLnNweShiciwgJ29uc2VsZWN0bWFpbGJveCcpXG4gICAgICAgIHJldHVybiBici5zZWxlY3RNYWlsYm94KHBhdGgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGV4cGVjdChvbnNlbGVjdG1haWxib3hTcHkud2l0aEFyZ3MocGF0aCkuY2FsbENvdW50KS50by5lcXVhbCgxKVxuICAgICAgICAgIGV4cGVjdChwcm9taXNlUmVzb2x2ZWQpLnRvLmVxdWFsKHRydWUpXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgICBpdCgnd2hlbiBpdCBkb2VzIG5vdCByZXR1cm4gYSBwcm9taXNlJywgKCkgPT4ge1xuICAgICAgICBici5vbnNlbGVjdG1haWxib3ggPSAoKSA9PiB7IH1cbiAgICAgICAgdmFyIG9uc2VsZWN0bWFpbGJveFNweSA9IHNpbm9uLnNweShiciwgJ29uc2VsZWN0bWFpbGJveCcpXG4gICAgICAgIHJldHVybiBici5zZWxlY3RNYWlsYm94KHBhdGgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGV4cGVjdChvbnNlbGVjdG1haWxib3hTcHkud2l0aEFyZ3MocGF0aCkuY2FsbENvdW50KS50by5lcXVhbCgxKVxuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9KVxuXG4gICAgaXQoJ3Nob3VsZCBlbWl0IG9uY2xvc2VtYWlsYm94JywgKCkgPT4ge1xuICAgICAgbGV0IGNhbGxlZCA9IGZhbHNlXG4gICAgICBici5leGVjLnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKCdhYmMnKSkucmV0dXJucyhQcm9taXNlLnJlc29sdmUoe1xuICAgICAgICBjb2RlOiAnUkVBRC1XUklURSdcbiAgICAgIH0pKVxuXG4gICAgICBici5vbmNsb3NlbWFpbGJveCA9IChwYXRoKSA9PiB7XG4gICAgICAgIGV4cGVjdChwYXRoKS50by5lcXVhbCgneXl5JylcbiAgICAgICAgY2FsbGVkID0gdHJ1ZVxuICAgICAgfVxuXG4gICAgICBici5fc2VsZWN0ZWRNYWlsYm94ID0gJ3l5eSdcbiAgICAgIHJldHVybiBici5zZWxlY3RNYWlsYm94KHBhdGgpLnRoZW4oKCkgPT4ge1xuICAgICAgICBleHBlY3QoY2FsbGVkKS50by5iZS50cnVlXG4gICAgICB9KVxuICAgIH0pXG4gIH0pXG5cbiAgZGVzY3JpYmUoJyNoYXNDYXBhYmlsaXR5JywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgZGV0ZWN0IGV4aXN0aW5nIGNhcGFiaWxpdHknLCAoKSA9PiB7XG4gICAgICBici5fY2FwYWJpbGl0eSA9IFsnWlpaJ11cbiAgICAgIGV4cGVjdChici5oYXNDYXBhYmlsaXR5KCd6enonKSkudG8uYmUudHJ1ZVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIGRldGVjdCBub24gZXhpc3RpbmcgY2FwYWJpbGl0eScsICgpID0+IHtcbiAgICAgIGJyLl9jYXBhYmlsaXR5ID0gWydaWlonXVxuICAgICAgZXhwZWN0KGJyLmhhc0NhcGFiaWxpdHkoJ29vbycpKS50by5iZS5mYWxzZVxuICAgICAgZXhwZWN0KGJyLmhhc0NhcGFiaWxpdHkoKSkudG8uYmUuZmFsc2VcbiAgICB9KVxuICB9KVxuXG4gIGRlc2NyaWJlKCcjX3VudGFnZ2VkT2tIYW5kbGVyJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgdXBkYXRlIGNhcGFiaWxpdHkgaWYgcHJlc2VudCcsICgpID0+IHtcbiAgICAgIGJyLl91bnRhZ2dlZE9rSGFuZGxlcih7XG4gICAgICAgIGNhcGFiaWxpdHk6IFsnYWJjJ11cbiAgICAgIH0sICgpID0+IHsgfSlcbiAgICAgIGV4cGVjdChici5fY2FwYWJpbGl0eSkudG8uZGVlcC5lcXVhbChbJ2FiYyddKVxuICAgIH0pXG4gIH0pXG5cbiAgZGVzY3JpYmUoJyNfdW50YWdnZWRDYXBhYmlsaXR5SGFuZGxlcicsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHVwZGF0ZSBjYXBhYmlsaXR5JywgKCkgPT4ge1xuICAgICAgYnIuX3VudGFnZ2VkQ2FwYWJpbGl0eUhhbmRsZXIoe1xuICAgICAgICBhdHRyaWJ1dGVzOiBbe1xuICAgICAgICAgIHZhbHVlOiAnYWJjJ1xuICAgICAgICB9XVxuICAgICAgfSwgKCkgPT4geyB9KVxuICAgICAgZXhwZWN0KGJyLl9jYXBhYmlsaXR5KS50by5kZWVwLmVxdWFsKFsnQUJDJ10pXG4gICAgfSlcbiAgfSlcblxuICBkZXNjcmliZSgnI191bnRhZ2dlZEV4aXN0c0hhbmRsZXInLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBlbWl0IG9udXBkYXRlJywgKCkgPT4ge1xuICAgICAgYnIub251cGRhdGUgPSBzaW5vbi5zdHViKClcbiAgICAgIGJyLl9zZWxlY3RlZE1haWxib3ggPSAnRk9PJ1xuXG4gICAgICBici5fdW50YWdnZWRFeGlzdHNIYW5kbGVyKHtcbiAgICAgICAgbnI6IDEyM1xuICAgICAgfSwgKCkgPT4geyB9KVxuICAgICAgZXhwZWN0KGJyLm9udXBkYXRlLndpdGhBcmdzKCdGT08nLCAnZXhpc3RzJywgMTIzKS5jYWxsQ291bnQpLnRvLmVxdWFsKDEpXG4gICAgfSlcbiAgfSlcblxuICBkZXNjcmliZSgnI191bnRhZ2dlZEV4cHVuZ2VIYW5kbGVyJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgZW1pdCBvbnVwZGF0ZScsICgpID0+IHtcbiAgICAgIGJyLm9udXBkYXRlID0gc2lub24uc3R1YigpXG4gICAgICBici5fc2VsZWN0ZWRNYWlsYm94ID0gJ0ZPTydcblxuICAgICAgYnIuX3VudGFnZ2VkRXhwdW5nZUhhbmRsZXIoe1xuICAgICAgICBucjogMTIzXG4gICAgICB9LCAoKSA9PiB7IH0pXG4gICAgICBleHBlY3QoYnIub251cGRhdGUud2l0aEFyZ3MoJ0ZPTycsICdleHB1bmdlJywgMTIzKS5jYWxsQ291bnQpLnRvLmVxdWFsKDEpXG4gICAgfSlcbiAgfSlcblxuICBkZXNjcmliZS5za2lwKCcjX3VudGFnZ2VkRmV0Y2hIYW5kbGVyJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgZW1pdCBvbnVwZGF0ZScsICgpID0+IHtcbiAgICAgIGJyLm9udXBkYXRlID0gc2lub24uc3R1YigpXG4gICAgICBzaW5vbi5zdHViKGJyLCAnX3BhcnNlRkVUQ0gnKS5yZXR1cm5zKCdhYmMnKVxuICAgICAgYnIuX3NlbGVjdGVkTWFpbGJveCA9ICdGT08nXG5cbiAgICAgIGJyLl91bnRhZ2dlZEZldGNoSGFuZGxlcih7XG4gICAgICAgIG5yOiAxMjNcbiAgICAgIH0sICgpID0+IHsgfSlcbiAgICAgIGV4cGVjdChici5vbnVwZGF0ZS53aXRoQXJncygnRk9PJywgJ2ZldGNoJywgJ2FiYycpLmNhbGxDb3VudCkudG8uZXF1YWwoMSlcbiAgICAgIGV4cGVjdChici5fcGFyc2VGRVRDSC5hcmdzWzBdWzBdKS50by5kZWVwLmVxdWFsKHtcbiAgICAgICAgcGF5bG9hZDoge1xuICAgICAgICAgIEZFVENIOiBbe1xuICAgICAgICAgICAgbnI6IDEyM1xuICAgICAgICAgIH1dXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSlcbiAgfSlcblxuICBkZXNjcmliZSgnI19jaGFuZ2VTdGF0ZScsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHNldCB0aGUgc3RhdGUgdmFsdWUnLCAoKSA9PiB7XG4gICAgICBici5fY2hhbmdlU3RhdGUoMTIzNDUpXG5cbiAgICAgIGV4cGVjdChici5fc3RhdGUpLnRvLmVxdWFsKDEyMzQ1KVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIGVtaXQgb25jbG9zZW1haWxib3ggaWYgbWFpbGJveCB3YXMgY2xvc2VkJywgKCkgPT4ge1xuICAgICAgYnIub25jbG9zZW1haWxib3ggPSBzaW5vbi5zdHViKClcbiAgICAgIGJyLl9zdGF0ZSA9IFNUQVRFX1NFTEVDVEVEXG4gICAgICBici5fc2VsZWN0ZWRNYWlsYm94ID0gJ2FhYSdcblxuICAgICAgYnIuX2NoYW5nZVN0YXRlKDEyMzQ1KVxuXG4gICAgICBleHBlY3QoYnIuX3NlbGVjdGVkTWFpbGJveCkudG8uYmUuZmFsc2VcbiAgICAgIGV4cGVjdChici5vbmNsb3NlbWFpbGJveC53aXRoQXJncygnYWFhJykuY2FsbENvdW50KS50by5lcXVhbCgxKVxuICAgIH0pXG4gIH0pXG5cbiAgZGVzY3JpYmUoJyNfZW5zdXJlUGF0aCcsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGNyZWF0ZSB0aGUgcGF0aCBpZiBub3QgcHJlc2VudCcsICgpID0+IHtcbiAgICAgIHZhciB0cmVlID0ge1xuICAgICAgICBjaGlsZHJlbjogW11cbiAgICAgIH1cbiAgICAgIGV4cGVjdChici5fZW5zdXJlUGF0aCh0cmVlLCAnaGVsbG8vd29ybGQnLCAnLycpKS50by5kZWVwLmVxdWFsKHtcbiAgICAgICAgbmFtZTogJ3dvcmxkJyxcbiAgICAgICAgZGVsaW1pdGVyOiAnLycsXG4gICAgICAgIHBhdGg6ICdoZWxsby93b3JsZCcsXG4gICAgICAgIGNoaWxkcmVuOiBbXVxuICAgICAgfSlcbiAgICAgIGV4cGVjdCh0cmVlKS50by5kZWVwLmVxdWFsKHtcbiAgICAgICAgY2hpbGRyZW46IFt7XG4gICAgICAgICAgbmFtZTogJ2hlbGxvJyxcbiAgICAgICAgICBkZWxpbWl0ZXI6ICcvJyxcbiAgICAgICAgICBwYXRoOiAnaGVsbG8nLFxuICAgICAgICAgIGNoaWxkcmVuOiBbe1xuICAgICAgICAgICAgbmFtZTogJ3dvcmxkJyxcbiAgICAgICAgICAgIGRlbGltaXRlcjogJy8nLFxuICAgICAgICAgICAgcGF0aDogJ2hlbGxvL3dvcmxkJyxcbiAgICAgICAgICAgIGNoaWxkcmVuOiBbXVxuICAgICAgICAgIH1dXG4gICAgICAgIH1dXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIHJldHVybiBleGlzdGluZyBwYXRoIGlmIHBvc3NpYmxlJywgKCkgPT4ge1xuICAgICAgdmFyIHRyZWUgPSB7XG4gICAgICAgIGNoaWxkcmVuOiBbe1xuICAgICAgICAgIG5hbWU6ICdoZWxsbycsXG4gICAgICAgICAgZGVsaW1pdGVyOiAnLycsXG4gICAgICAgICAgcGF0aDogJ2hlbGxvJyxcbiAgICAgICAgICBjaGlsZHJlbjogW3tcbiAgICAgICAgICAgIG5hbWU6ICd3b3JsZCcsXG4gICAgICAgICAgICBkZWxpbWl0ZXI6ICcvJyxcbiAgICAgICAgICAgIHBhdGg6ICdoZWxsby93b3JsZCcsXG4gICAgICAgICAgICBjaGlsZHJlbjogW10sXG4gICAgICAgICAgICBhYmM6IDEyM1xuICAgICAgICAgIH1dXG4gICAgICAgIH1dXG4gICAgICB9XG4gICAgICBleHBlY3QoYnIuX2Vuc3VyZVBhdGgodHJlZSwgJ2hlbGxvL3dvcmxkJywgJy8nKSkudG8uZGVlcC5lcXVhbCh7XG4gICAgICAgIG5hbWU6ICd3b3JsZCcsXG4gICAgICAgIGRlbGltaXRlcjogJy8nLFxuICAgICAgICBwYXRoOiAnaGVsbG8vd29ybGQnLFxuICAgICAgICBjaGlsZHJlbjogW10sXG4gICAgICAgIGFiYzogMTIzXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBjYXNlIGluc2Vuc2l0aXZlIEluYm94JywgKCkgPT4ge1xuICAgICAgdmFyIHRyZWUgPSB7XG4gICAgICAgIGNoaWxkcmVuOiBbXVxuICAgICAgfVxuICAgICAgZXhwZWN0KGJyLl9lbnN1cmVQYXRoKHRyZWUsICdJbmJveC93b3JsZCcsICcvJykpLnRvLmRlZXAuZXF1YWwoe1xuICAgICAgICBuYW1lOiAnd29ybGQnLFxuICAgICAgICBkZWxpbWl0ZXI6ICcvJyxcbiAgICAgICAgcGF0aDogJ0luYm94L3dvcmxkJyxcbiAgICAgICAgY2hpbGRyZW46IFtdXG4gICAgICB9KVxuICAgICAgZXhwZWN0KGJyLl9lbnN1cmVQYXRoKHRyZWUsICdJTkJPWC93b3JsZHMnLCAnLycpKS50by5kZWVwLmVxdWFsKHtcbiAgICAgICAgbmFtZTogJ3dvcmxkcycsXG4gICAgICAgIGRlbGltaXRlcjogJy8nLFxuICAgICAgICBwYXRoOiAnSU5CT1gvd29ybGRzJyxcbiAgICAgICAgY2hpbGRyZW46IFtdXG4gICAgICB9KVxuXG4gICAgICBleHBlY3QodHJlZSkudG8uZGVlcC5lcXVhbCh7XG4gICAgICAgIGNoaWxkcmVuOiBbe1xuICAgICAgICAgIG5hbWU6ICdJbmJveCcsXG4gICAgICAgICAgZGVsaW1pdGVyOiAnLycsXG4gICAgICAgICAgcGF0aDogJ0luYm94JyxcbiAgICAgICAgICBjaGlsZHJlbjogW3tcbiAgICAgICAgICAgIG5hbWU6ICd3b3JsZCcsXG4gICAgICAgICAgICBkZWxpbWl0ZXI6ICcvJyxcbiAgICAgICAgICAgIHBhdGg6ICdJbmJveC93b3JsZCcsXG4gICAgICAgICAgICBjaGlsZHJlbjogW11cbiAgICAgICAgICB9LCB7XG4gICAgICAgICAgICBuYW1lOiAnd29ybGRzJyxcbiAgICAgICAgICAgIGRlbGltaXRlcjogJy8nLFxuICAgICAgICAgICAgcGF0aDogJ0lOQk9YL3dvcmxkcycsXG4gICAgICAgICAgICBjaGlsZHJlbjogW11cbiAgICAgICAgICB9XVxuICAgICAgICB9XVxuICAgICAgfSlcbiAgICB9KVxuICB9KVxuXG4gIGRlc2NyaWJlKCd1bnRhZ2dlZCB1cGRhdGVzJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgcmVjZWl2ZSBpbmZvcm1hdGlvbiBhYm91dCB1bnRhZ2dlZCBleGlzdHMnLCAoZG9uZSkgPT4ge1xuICAgICAgYnIuY2xpZW50Ll9jb25uZWN0aW9uUmVhZHkgPSB0cnVlXG4gICAgICBici5fc2VsZWN0ZWRNYWlsYm94ID0gJ0ZPTydcbiAgICAgIGJyLm9udXBkYXRlID0gKHBhdGgsIHR5cGUsIHZhbHVlKSA9PiB7XG4gICAgICAgIGV4cGVjdChwYXRoKS50by5lcXVhbCgnRk9PJylcbiAgICAgICAgZXhwZWN0KHR5cGUpLnRvLmVxdWFsKCdleGlzdHMnKVxuICAgICAgICBleHBlY3QodmFsdWUpLnRvLmVxdWFsKDEyMylcbiAgICAgICAgZG9uZSgpXG4gICAgICB9XG4gICAgICBici5jbGllbnQuX29uRGF0YSh7XG4gICAgICAgIC8qICogMTIzIEVYSVNUU1xcclxcbiAqL1xuICAgICAgICBkYXRhOiBuZXcgVWludDhBcnJheShbNDIsIDMyLCA0OSwgNTAsIDUxLCAzMiwgNjksIDg4LCA3MywgODMsIDg0LCA4MywgMTMsIDEwXSkuYnVmZmVyXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIHJlY2VpdmUgaW5mb3JtYXRpb24gYWJvdXQgdW50YWdnZWQgZXhwdW5nZScsIChkb25lKSA9PiB7XG4gICAgICBici5jbGllbnQuX2Nvbm5lY3Rpb25SZWFkeSA9IHRydWVcbiAgICAgIGJyLl9zZWxlY3RlZE1haWxib3ggPSAnRk9PJ1xuICAgICAgYnIub251cGRhdGUgPSAocGF0aCwgdHlwZSwgdmFsdWUpID0+IHtcbiAgICAgICAgZXhwZWN0KHBhdGgpLnRvLmVxdWFsKCdGT08nKVxuICAgICAgICBleHBlY3QodHlwZSkudG8uZXF1YWwoJ2V4cHVuZ2UnKVxuICAgICAgICBleHBlY3QodmFsdWUpLnRvLmVxdWFsKDQ1NilcbiAgICAgICAgZG9uZSgpXG4gICAgICB9XG4gICAgICBici5jbGllbnQuX29uRGF0YSh7XG4gICAgICAgIC8qICogNDU2IEVYUFVOR0VcXHJcXG4gKi9cbiAgICAgICAgZGF0YTogbmV3IFVpbnQ4QXJyYXkoWzQyLCAzMiwgNTIsIDUzLCA1NCwgMzIsIDY5LCA4OCwgODAsIDg1LCA3OCwgNzEsIDY5LCAxMywgMTBdKS5idWZmZXJcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgcmVjZWl2ZSBpbmZvcm1hdGlvbiBhYm91dCB1bnRhZ2dlZCBmZXRjaCcsIChkb25lKSA9PiB7XG4gICAgICBici5jbGllbnQuX2Nvbm5lY3Rpb25SZWFkeSA9IHRydWVcbiAgICAgIGJyLl9zZWxlY3RlZE1haWxib3ggPSAnRk9PJ1xuICAgICAgYnIub251cGRhdGUgPSAocGF0aCwgdHlwZSwgdmFsdWUpID0+IHtcbiAgICAgICAgZXhwZWN0KHBhdGgpLnRvLmVxdWFsKCdGT08nKVxuICAgICAgICBleHBlY3QodHlwZSkudG8uZXF1YWwoJ2ZldGNoJylcbiAgICAgICAgZXhwZWN0KHZhbHVlKS50by5kZWVwLmVxdWFsKHtcbiAgICAgICAgICAnIyc6IDEyMyxcbiAgICAgICAgICAnZmxhZ3MnOiBbJ1xcXFxTZWVuJ10sXG4gICAgICAgICAgJ21vZHNlcSc6ICc0J1xuICAgICAgICB9KVxuICAgICAgICBkb25lKClcbiAgICAgIH1cbiAgICAgIGJyLmNsaWVudC5fb25EYXRhKHtcbiAgICAgICAgLyogKiAxMjMgRkVUQ0ggKEZMQUdTIChcXFxcU2VlbikgTU9EU0VRICg0KSlcXHJcXG4gKi9cbiAgICAgICAgZGF0YTogbmV3IFVpbnQ4QXJyYXkoWzQyLCAzMiwgNDksIDUwLCA1MSwgMzIsIDcwLCA2OSwgODQsIDY3LCA3MiwgMzIsIDQwLCA3MCwgNzYsIDY1LCA3MSwgODMsIDMyLCA0MCwgOTIsIDgzLCAxMDEsIDEwMSwgMTEwLCA0MSwgMzIsIDc3LCA3OSwgNjgsIDgzLCA2OSwgODEsIDMyLCA0MCwgNTIsIDQxLCA0MSwgMTMsIDEwXSkuYnVmZmVyXG4gICAgICB9KVxuICAgIH0pXG4gIH0pXG59KVxuIl19