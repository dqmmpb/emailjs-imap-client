"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.DEFAULT_CLIENT_ID = exports.STATE_LOGOUT = exports.STATE_SELECTED = exports.STATE_AUTHENTICATED = exports.STATE_NOT_AUTHENTICATED = exports.STATE_CONNECTING = exports.TIMEOUT_IDLE = exports.TIMEOUT_NOOP = exports.TIMEOUT_CONNECTION = void 0;

var _ramda = require("ramda");

var _emailjsUtf = require("emailjs-utf7");

var _commandParser = require("./command-parser");

var _commandBuilder = require("./command-builder");

var _logger = _interopRequireDefault(require("./logger"));

var _imap = _interopRequireDefault(require("./imap"));

var _common = require("./common");

var _specialUse = require("./special-use");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const TIMEOUT_CONNECTION = 90 * 1000; // Milliseconds to wait for the IMAP greeting from the server

exports.TIMEOUT_CONNECTION = TIMEOUT_CONNECTION;
const TIMEOUT_NOOP = 60 * 1000; // Milliseconds between NOOP commands while idling

exports.TIMEOUT_NOOP = TIMEOUT_NOOP;
const TIMEOUT_IDLE = 60 * 1000; // Milliseconds until IDLE command is cancelled

exports.TIMEOUT_IDLE = TIMEOUT_IDLE;
const STATE_CONNECTING = 1;
exports.STATE_CONNECTING = STATE_CONNECTING;
const STATE_NOT_AUTHENTICATED = 2;
exports.STATE_NOT_AUTHENTICATED = STATE_NOT_AUTHENTICATED;
const STATE_AUTHENTICATED = 3;
exports.STATE_AUTHENTICATED = STATE_AUTHENTICATED;
const STATE_SELECTED = 4;
exports.STATE_SELECTED = STATE_SELECTED;
const STATE_LOGOUT = 5;
exports.STATE_LOGOUT = STATE_LOGOUT;
const DEFAULT_CLIENT_ID = {
  name: 'emailjs-imap-client'
  /**
   * emailjs IMAP client
   *
   * @constructor
   *
   * @param {String} [host='localhost'] Hostname to conenct to
   * @param {Number} [port=143] Port number to connect to
   * @param {Object} [options] Optional options object
   */

};
exports.DEFAULT_CLIENT_ID = DEFAULT_CLIENT_ID;

class Client {
  constructor(host, port, options = {}) {
    this.timeoutConnection = TIMEOUT_CONNECTION;
    this.timeoutNoop = TIMEOUT_NOOP;
    this.timeoutIdle = TIMEOUT_IDLE;
    this.serverId = false; // RFC 2971 Server ID as key value pairs
    // Event placeholders

    this.oncert = null;
    this.onupdate = null;
    this.onselectmailbox = null;
    this.onclosemailbox = null;
    this._host = host;
    this._clientId = (0, _ramda.propOr)(DEFAULT_CLIENT_ID, 'id', options);
    this._state = false; // Current state

    this._authenticated = false; // Is the connection authenticated

    this._capability = []; // List of extensions the server supports

    this._selectedMailbox = false; // Selected mailbox

    this._enteredIdle = false;
    this._idleTimeout = false;
    this._enableCompression = !!options.enableCompression;
    this._auth = options.auth;
    this._requireTLS = !!options.requireTLS;
    this._ignoreTLS = !!options.ignoreTLS;
    this.client = new _imap.default(host, port, options); // IMAP client object
    // Event Handlers

    this.client.onerror = this._onError.bind(this);

    this.client.oncert = cert => this.oncert && this.oncert(cert); // allows certificate handling for platforms w/o native tls support


    this.client.onidle = () => this._onIdle(); // start idling
    // Default handlers for untagged responses


    this.client.setHandler('capability', response => this._untaggedCapabilityHandler(response)); // capability updates

    this.client.setHandler('ok', response => this._untaggedOkHandler(response)); // notifications

    this.client.setHandler('exists', response => this._untaggedExistsHandler(response)); // message count has changed

    this.client.setHandler('expunge', response => this._untaggedExpungeHandler(response)); // message has been deleted

    this.client.setHandler('fetch', response => this._untaggedFetchHandler(response)); // message has been updated (eg. flag change)
    // Activate logging

    this.createLogger();
    this.logLevel = (0, _ramda.propOr)(_common.LOG_LEVEL_ALL, 'logLevel', options);
  }
  /**
   * Called if the lower-level ImapClient has encountered an unrecoverable
   * error during operation. Cleans up and propagates the error upwards.
   */


  _onError(err) {
    // make sure no idle timeout is pending anymore
    clearTimeout(this._idleTimeout); // propagate the error upwards

    this.onerror && this.onerror(err);
  } //
  //
  // PUBLIC API
  //
  //

  /**
   * Initiate connection to the IMAP server
   *
   * @returns {Promise} Promise when login procedure is complete
   */


  connect() {
    var _this = this;

    return _asyncToGenerator(function* () {
      try {
        yield _this._openConnection();

        _this._changeState(STATE_NOT_AUTHENTICATED);

        yield _this.updateCapability();
        yield _this.upgradeConnection();

        try {
          yield _this.updateId(_this._clientId);
        } catch (err) {
          _this.logger.warn('Failed to update server id!', err.message);
        }

        yield _this.login(_this._auth);
        yield _this.compressConnection();

        _this.logger.debug('Connection established, ready to roll!');

        _this.client.onerror = _this._onError.bind(_this);
      } catch (err) {
        _this.logger.error('Could not connect to server', err);

        try {
          yield _this.close(err); // we don't really care whether this works or not
        } catch (cErr) {
          throw cErr;
        }

        throw err;
      }
    })();
  }

  _openConnection() {
    return new Promise((resolve, reject) => {
      let connectionTimeout = setTimeout(() => reject(new Error('Timeout connecting to server')), this.timeoutConnection);
      this.logger.debug('Connecting to', this.client.host, ':', this.client.port);

      this._changeState(STATE_CONNECTING);

      this.client.connect().then(() => {
        this.logger.debug('Socket opened, waiting for greeting from the server...');

        this.client.onready = () => {
          clearTimeout(connectionTimeout);
          resolve();
        };

        this.client.onerror = err => {
          clearTimeout(connectionTimeout);
          reject(err);
        };
      }).catch(reject);
    });
  }
  /**
   * Logout
   *
   * Send LOGOUT, to which the server responds by closing the connection.
   * Use is discouraged if network status is unclear! If networks status is
   * unclear, please use #close instead!
   *
   * LOGOUT details:
   *   https://tools.ietf.org/html/rfc3501#section-6.1.3
   *
   * @returns {Promise} Resolves when server has closed the connection
   */


  logout() {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      _this2._changeState(STATE_LOGOUT);

      _this2.logger.debug('Logging out...');

      yield _this2.client.logout();
      clearTimeout(_this2._idleTimeout);
    })();
  }
  /**
   * Force-closes the current connection by closing the TCP socket.
   *
   * @returns {Promise} Resolves when socket is closed
   */


  close(err) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      _this3._changeState(STATE_LOGOUT);

      clearTimeout(_this3._idleTimeout);

      _this3.logger.debug('Closing connection...');

      yield _this3.client.close(err);
      clearTimeout(_this3._idleTimeout);
    })();
  }
  /**
   * Runs ID command, parses ID response, sets this.serverId
   *
   * ID details:
   *   http://tools.ietf.org/html/rfc2971
   *
   * @param {Object} id ID as JSON object. See http://tools.ietf.org/html/rfc2971#section-3.3 for possible values
   * @returns {Promise} Resolves when response has been parsed
   */


  updateId(id) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      if (_this4._capability.indexOf('ID') < 0) return;

      _this4.logger.debug('Updating id...');

      const command = 'ID';
      const attributes = id ? [(0, _ramda.flatten)(Object.entries(id))] : [null];
      const response = yield _this4.exec({
        command,
        attributes
      }, 'ID');
      const list = (0, _ramda.flatten)((0, _ramda.pathOr)([], ['payload', 'ID', '0', 'attributes', '0'], response).map(Object.values));
      const keys = list.filter((_, i) => i % 2 === 0);
      const values = list.filter((_, i) => i % 2 === 1);
      _this4.serverId = (0, _ramda.fromPairs)((0, _ramda.zip)(keys, values));

      _this4.logger.debug('Server id updated!', _this4.serverId);
    })();
  }

  _shouldSelectMailbox(path, ctx) {
    if (!ctx) {
      return true;
    }

    const previousSelect = this.client.getPreviouslyQueued(['SELECT', 'EXAMINE'], ctx);

    if (previousSelect && previousSelect.request.attributes) {
      const pathAttribute = previousSelect.request.attributes.find(attribute => attribute.type === 'STRING');

      if (pathAttribute) {
        return pathAttribute.value !== path;
      }
    }

    return this._selectedMailbox !== path;
  }
  /**
   * Runs SELECT or EXAMINE to open a mailbox
   *
   * SELECT details:
   *   http://tools.ietf.org/html/rfc3501#section-6.3.1
   * EXAMINE details:
   *   http://tools.ietf.org/html/rfc3501#section-6.3.2
   *
   * @param {String} path Full path to mailbox
   * @param {Object} [options] Options object
   * @returns {Promise} Promise with information about the selected mailbox
   */


  selectMailbox(path, options = {}) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      let query = {
        command: options.readOnly ? 'EXAMINE' : 'SELECT',
        attributes: [{
          type: 'STRING',
          value: path
        }]
      };

      if (options.condstore && _this5._capability.indexOf('CONDSTORE') >= 0) {
        query.attributes.push([{
          type: 'ATOM',
          value: 'CONDSTORE'
        }]);
      }

      _this5.logger.debug('Opening', path, '...');

      const response = yield _this5.exec(query, ['EXISTS', 'FLAGS', 'OK'], {
        ctx: options.ctx
      });
      let mailboxInfo = (0, _commandParser.parseSELECT)(response);

      _this5._changeState(STATE_SELECTED);

      if (_this5._selectedMailbox !== path && _this5.onclosemailbox) {
        yield _this5.onclosemailbox(_this5._selectedMailbox);
      }

      _this5._selectedMailbox = path;

      if (_this5.onselectmailbox) {
        yield _this5.onselectmailbox(path, mailboxInfo);
      }

      return mailboxInfo;
    })();
  }
  /**
   * Runs NAMESPACE command
   *
   * NAMESPACE details:
   *   https://tools.ietf.org/html/rfc2342
   *
   * @returns {Promise} Promise with namespace object
   */


  listNamespaces() {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      if (_this6._capability.indexOf('NAMESPACE') < 0) return false;

      _this6.logger.debug('Listing namespaces...');

      const response = yield _this6.exec('NAMESPACE', 'NAMESPACE');
      return (0, _commandParser.parseNAMESPACE)(response);
    })();
  }
  /**
   * Runs LIST and LSUB commands. Retrieves a tree of available mailboxes
   *
   * LIST details:
   *   http://tools.ietf.org/html/rfc3501#section-6.3.8
   * LSUB details:
   *   http://tools.ietf.org/html/rfc3501#section-6.3.9
   *
   * @returns {Promise} Promise with list of mailboxes
   */


  listMailboxes() {
    var _this7 = this;

    return _asyncToGenerator(function* () {
      const tree = {
        root: true,
        children: []
      };

      _this7.logger.debug('Listing mailboxes...');

      const listResponse = yield _this7.exec({
        command: 'LIST',
        attributes: ['', '*']
      }, 'LIST');
      const list = (0, _ramda.pathOr)([], ['payload', 'LIST'], listResponse);
      list.forEach(item => {
        const attr = (0, _ramda.propOr)([], 'attributes', item);
        if (attr.length < 3) return;
        const path = (0, _ramda.pathOr)('', ['2', 'value'], attr);
        const delim = (0, _ramda.pathOr)('/', ['1', 'value'], attr);

        const branch = _this7._ensurePath(tree, path, delim);

        branch.flags = (0, _ramda.propOr)([], '0', attr).map(({
          value
        }) => value || '');
        branch.listed = true;
        (0, _specialUse.checkSpecialUse)(branch);
      });
      const lsubResponse = yield _this7.exec({
        command: 'LSUB',
        attributes: ['', '*']
      }, 'LSUB');
      const lsub = (0, _ramda.pathOr)([], ['payload', 'LSUB'], lsubResponse);
      lsub.forEach(item => {
        const attr = (0, _ramda.propOr)([], 'attributes', item);
        if (attr.length < 3) return;
        const path = (0, _ramda.pathOr)('', ['2', 'value'], attr);
        const delim = (0, _ramda.pathOr)('/', ['1', 'value'], attr);

        const branch = _this7._ensurePath(tree, path, delim);

        (0, _ramda.propOr)([], '0', attr).map((flag = '') => {
          branch.flags = (0, _ramda.union)(branch.flags, [flag]);
        });
        branch.subscribed = true;
      });
      return tree;
    })();
  }
  /**
   * Create a mailbox with the given path.
   *
   * CREATE details:
   *   http://tools.ietf.org/html/rfc3501#section-6.3.3
   *
   * @param {String} path
   *     The path of the mailbox you would like to create.  This method will
   *     handle utf7 encoding for you.
   * @returns {Promise}
   *     Promise resolves if mailbox was created.
   *     In the event the server says NO [ALREADYEXISTS], we treat that as success.
   */


  createMailbox(path) {
    var _this8 = this;

    return _asyncToGenerator(function* () {
      _this8.logger.debug('Creating mailbox', path, '...');

      try {
        yield _this8.exec({
          command: 'CREATE',
          attributes: [(0, _emailjsUtf.imapEncode)(path)]
        });
      } catch (err) {
        if (err && err.code === 'ALREADYEXISTS') {
          return;
        }

        throw err;
      }
    })();
  }
  /**
   * Delete a mailbox with the given path.
   *
   * DELETE details:
   *   https://tools.ietf.org/html/rfc3501#section-6.3.4
   *
   * @param {String} path
   *     The path of the mailbox you would like to delete.  This method will
   *     handle utf7 encoding for you.
   * @returns {Promise}
   *     Promise resolves if mailbox was deleted.
   */


  deleteMailbox(path) {
    this.logger.debug('Deleting mailbox', path, '...');
    return this.exec({
      command: 'DELETE',
      attributes: [(0, _emailjsUtf.imapEncode)(path)]
    });
  }
  /**
   * Runs FETCH command
   *
   * FETCH details:
   *   http://tools.ietf.org/html/rfc3501#section-6.4.5
   * CHANGEDSINCE details:
   *   https://tools.ietf.org/html/rfc4551#section-3.3
   *
   * @param {String} path The path for the mailbox which should be selected for the command. Selects mailbox if necessary
   * @param {String} sequence Sequence set, eg 1:* for all messages
   * @param {Object} [items] Message data item names or macro
   * @param {Object} [options] Query modifiers
   * @returns {Promise} Promise with the fetched message info
   */


  listMessages(path, sequence, items = [{
    fast: true
  }], options = {}) {
    var _this9 = this;

    return _asyncToGenerator(function* () {
      _this9.logger.debug('Fetching messages', sequence, 'from', path, '...');

      const command = (0, _commandBuilder.buildFETCHCommand)(sequence, items, options);
      const response = yield _this9.exec(command, 'FETCH', {
        precheck: ctx => _this9._shouldSelectMailbox(path, ctx) ? _this9.selectMailbox(path, {
          ctx
        }) : Promise.resolve()
      });
      return (0, _commandParser.parseFETCH)(response);
    })();
  }
  /**
   * Runs SEARCH command
   *
   * SEARCH details:
   *   http://tools.ietf.org/html/rfc3501#section-6.4.4
   *
   * @param {String} path The path for the mailbox which should be selected for the command. Selects mailbox if necessary
   * @param {Object} query Search terms
   * @param {Object} [options] Query modifiers
   * @returns {Promise} Promise with the array of matching seq. or uid numbers
   */


  search(path, query, options = {}) {
    var _this10 = this;

    return _asyncToGenerator(function* () {
      _this10.logger.debug('Searching in', path, '...');

      const command = (0, _commandBuilder.buildSEARCHCommand)(query, options);
      const response = yield _this10.exec(command, 'SEARCH', {
        precheck: ctx => _this10._shouldSelectMailbox(path, ctx) ? _this10.selectMailbox(path, {
          ctx
        }) : Promise.resolve()
      });
      return (0, _commandParser.parseSEARCH)(response);
    })();
  }
  /**
   * Runs STORE command
   *
   * STORE details:
   *   http://tools.ietf.org/html/rfc3501#section-6.4.6
   *
   * @param {String} path The path for the mailbox which should be selected for the command. Selects mailbox if necessary
   * @param {String} sequence Message selector which the flag change is applied to
   * @param {Array} flags
   * @param {Object} [options] Query modifiers
   * @returns {Promise} Promise with the array of matching seq. or uid numbers
   */


  setFlags(path, sequence, flags, options) {
    let key = '';
    let list = [];

    if (Array.isArray(flags) || typeof flags !== 'object') {
      list = [].concat(flags || []);
      key = '';
    } else if (flags.add) {
      list = [].concat(flags.add || []);
      key = '+';
    } else if (flags.set) {
      key = '';
      list = [].concat(flags.set || []);
    } else if (flags.remove) {
      key = '-';
      list = [].concat(flags.remove || []);
    }

    this.logger.debug('Setting flags on', sequence, 'in', path, '...');
    return this.store(path, sequence, key + 'FLAGS', list, options);
  }
  /**
   * Runs STORE command
   *
   * STORE details:
   *   http://tools.ietf.org/html/rfc3501#section-6.4.6
   *
   * @param {String} path The path for the mailbox which should be selected for the command. Selects mailbox if necessary
   * @param {String} sequence Message selector which the flag change is applied to
   * @param {String} action STORE method to call, eg "+FLAGS"
   * @param {Array} flags
   * @param {Object} [options] Query modifiers
   * @returns {Promise} Promise with the array of matching seq. or uid numbers
   */


  store(path, sequence, action, flags, options = {}) {
    var _this11 = this;

    return _asyncToGenerator(function* () {
      const command = (0, _commandBuilder.buildSTORECommand)(sequence, action, flags, options);
      const response = yield _this11.exec(command, 'FETCH', {
        precheck: ctx => _this11._shouldSelectMailbox(path, ctx) ? _this11.selectMailbox(path, {
          ctx
        }) : Promise.resolve()
      });
      return (0, _commandParser.parseFETCH)(response);
    })();
  }
  /**
   * Runs APPEND command
   *
   * APPEND details:
   *   http://tools.ietf.org/html/rfc3501#section-6.3.11
   *
   * @param {String} destination The mailbox where to append the message
   * @param {String} message The message to append
   * @param {Array} options.flags Any flags you want to set on the uploaded message. Defaults to [\Seen]. (optional)
   * @returns {Promise} Promise with the array of matching seq. or uid numbers
   */


  upload(destination, message, options = {}) {
    let flags = (0, _ramda.propOr)(['\\Seen'], 'flags', options).map(value => ({
      type: 'atom',
      value
    }));
    let command = {
      command: 'APPEND',
      attributes: [{
        type: 'atom',
        value: destination
      }, flags, {
        type: 'literal',
        value: message
      }]
    };
    this.logger.debug('Uploading message to', destination, '...');
    return this.exec(command);
  }
  /**
   * Deletes messages from a selected mailbox
   *
   * EXPUNGE details:
   *   http://tools.ietf.org/html/rfc3501#section-6.4.3
   * UID EXPUNGE details:
   *   https://tools.ietf.org/html/rfc4315#section-2.1
   *
   * If possible (byUid:true and UIDPLUS extension supported), uses UID EXPUNGE
   * command to delete a range of messages, otherwise falls back to EXPUNGE.
   *
   * NB! This method might be destructive - if EXPUNGE is used, then any messages
   * with \Deleted flag set are deleted
   *
   * @param {String} path The path for the mailbox which should be selected for the command. Selects mailbox if necessary
   * @param {String} sequence Message range to be deleted
   * @param {Object} [options] Query modifiers
   * @returns {Promise} Promise
   */


  deleteMessages(path, sequence, options = {}) {
    var _this12 = this;

    return _asyncToGenerator(function* () {
      // add \Deleted flag to the messages and run EXPUNGE or UID EXPUNGE
      _this12.logger.debug('Deleting messages', sequence, 'in', path, '...');

      const useUidPlus = options.byUid && _this12._capability.indexOf('UIDPLUS') >= 0;
      const uidExpungeCommand = {
        command: 'UID EXPUNGE',
        attributes: [{
          type: 'sequence',
          value: sequence
        }]
      };
      yield _this12.setFlags(path, sequence, {
        add: '\\Deleted'
      }, options);
      const cmd = useUidPlus ? uidExpungeCommand : 'EXPUNGE';
      return _this12.exec(cmd, null, {
        precheck: ctx => _this12._shouldSelectMailbox(path, ctx) ? _this12.selectMailbox(path, {
          ctx
        }) : Promise.resolve()
      });
    })();
  }
  /**
   * Copies a range of messages from the active mailbox to the destination mailbox.
   * Silent method (unless an error occurs), by default returns no information.
   *
   * COPY details:
   *   http://tools.ietf.org/html/rfc3501#section-6.4.7
   *
   * @param {String} path The path for the mailbox which should be selected for the command. Selects mailbox if necessary
   * @param {String} sequence Message range to be copied
   * @param {String} destination Destination mailbox path
   * @param {Object} [options] Query modifiers
   * @param {Boolean} [options.byUid] If true, uses UID COPY instead of COPY
   * @returns {Promise} Promise
   */


  copyMessages(path, sequence, destination, options = {}) {
    var _this13 = this;

    return _asyncToGenerator(function* () {
      _this13.logger.debug('Copying messages', sequence, 'from', path, 'to', destination, '...');

      const {
        humanReadable
      } = yield _this13.exec({
        command: options.byUid ? 'UID COPY' : 'COPY',
        attributes: [{
          type: 'sequence',
          value: sequence
        }, {
          type: 'atom',
          value: destination
        }]
      }, null, {
        precheck: ctx => _this13._shouldSelectMailbox(path, ctx) ? _this13.selectMailbox(path, {
          ctx
        }) : Promise.resolve()
      });
      return humanReadable || 'COPY completed';
    })();
  }
  /**
   * Moves a range of messages from the active mailbox to the destination mailbox.
   * Prefers the MOVE extension but if not available, falls back to
   * COPY + EXPUNGE
   *
   * MOVE details:
   *   http://tools.ietf.org/html/rfc6851
   *
   * @param {String} path The path for the mailbox which should be selected for the command. Selects mailbox if necessary
   * @param {String} sequence Message range to be moved
   * @param {String} destination Destination mailbox path
   * @param {Object} [options] Query modifiers
   * @returns {Promise} Promise
   */


  moveMessages(path, sequence, destination, options = {}) {
    var _this14 = this;

    return _asyncToGenerator(function* () {
      _this14.logger.debug('Moving messages', sequence, 'from', path, 'to', destination, '...');

      if (_this14._capability.indexOf('MOVE') === -1) {
        // Fallback to COPY + EXPUNGE
        yield _this14.copyMessages(path, sequence, destination, options);
        return _this14.deleteMessages(path, sequence, options);
      } // If possible, use MOVE


      return _this14.exec({
        command: options.byUid ? 'UID MOVE' : 'MOVE',
        attributes: [{
          type: 'sequence',
          value: sequence
        }, {
          type: 'atom',
          value: destination
        }]
      }, ['OK'], {
        precheck: ctx => _this14._shouldSelectMailbox(path, ctx) ? _this14.selectMailbox(path, {
          ctx
        }) : Promise.resolve()
      });
    })();
  }
  /**
   * Runs COMPRESS command
   *
   * COMPRESS details:
   *   https://tools.ietf.org/html/rfc4978
   */


  compressConnection() {
    var _this15 = this;

    return _asyncToGenerator(function* () {
      if (!_this15._enableCompression || _this15._capability.indexOf('COMPRESS=DEFLATE') < 0 || _this15.client.compressed) {
        return false;
      }

      _this15.logger.debug('Enabling compression...');

      yield _this15.exec({
        command: 'COMPRESS',
        attributes: [{
          type: 'ATOM',
          value: 'DEFLATE'
        }]
      });

      _this15.client.enableCompression();

      _this15.logger.debug('Compression enabled, all data sent and received is deflated!');
    })();
  }
  /**
   * Runs LOGIN or AUTHENTICATE XOAUTH2 command
   *
   * LOGIN details:
   *   http://tools.ietf.org/html/rfc3501#section-6.2.3
   * XOAUTH2 details:
   *   https://developers.google.com/gmail/xoauth2_protocol#imap_protocol_exchange
   *
   * @param {String} auth.user
   * @param {String} auth.pass
   * @param {String} auth.xoauth2
   */


  login(auth) {
    var _this16 = this;

    return _asyncToGenerator(function* () {
      let command;
      let options = {};

      if (!auth) {
        throw new Error('Authentication information not provided');
      }

      if (_this16._capability.indexOf('AUTH=XOAUTH2') >= 0 && auth && auth.xoauth2) {
        command = {
          command: 'AUTHENTICATE',
          attributes: [{
            type: 'ATOM',
            value: 'XOAUTH2'
          }, {
            type: 'ATOM',
            value: (0, _commandBuilder.buildXOAuth2Token)(auth.user, auth.xoauth2),
            sensitive: true
          }]
        };
        options.errorResponseExpectsEmptyLine = true; // + tagged error response expects an empty line in return
      } else {
        command = {
          command: 'login',
          attributes: [{
            type: 'STRING',
            value: auth.user || ''
          }, {
            type: 'STRING',
            value: auth.pass || '',
            sensitive: true
          }]
        };
      }

      _this16.logger.debug('Logging in...');

      const response = yield _this16.exec(command, 'capability', options);
      /*
       * update post-auth capabilites
       * capability list shouldn't contain auth related stuff anymore
       * but some new extensions might have popped up that do not
       * make much sense in the non-auth state
       */

      if (response.capability && response.capability.length) {
        // capabilites were listed with the OK [CAPABILITY ...] response
        _this16._capability = response.capability;
      } else if (response.payload && response.payload.CAPABILITY && response.payload.CAPABILITY.length) {
        // capabilites were listed with * CAPABILITY ... response
        _this16._capability = response.payload.CAPABILITY.pop().attributes.map((capa = '') => capa.value.toUpperCase().trim());
      } else {
        // capabilities were not automatically listed, reload
        yield _this16.updateCapability(true);
      }

      _this16._changeState(STATE_AUTHENTICATED);

      _this16._authenticated = true;

      _this16.logger.debug('Login successful, post-auth capabilites updated!', _this16._capability);
    })();
  }
  /**
   * Run an IMAP command.
   *
   * @param {Object} request Structured request object
   * @param {Array} acceptUntagged a list of untagged responses that will be included in 'payload' property
   */


  exec(request, acceptUntagged, options) {
    var _this17 = this;

    return _asyncToGenerator(function* () {
      _this17.breakIdle();

      const response = yield _this17.client.enqueueCommand(request, acceptUntagged, options);

      if (response && response.capability) {
        _this17._capability = response.capability;
      }

      return response;
    })();
  }
  /**
   * The connection is idling. Sends a NOOP or IDLE command
   *
   * IDLE details:
   *   https://tools.ietf.org/html/rfc2177
   */


  enterIdle() {
    if (this._enteredIdle) {
      return;
    }

    this._enteredIdle = this._capability.indexOf('IDLE') >= 0 ? 'IDLE' : 'NOOP';
    this.logger.debug('Entering idle with ' + this._enteredIdle);

    if (this._enteredIdle === 'NOOP') {
      this._idleTimeout = setTimeout(() => {
        this.logger.debug('Sending NOOP');
        this.exec('NOOP');
      }, this.timeoutNoop);
    } else if (this._enteredIdle === 'IDLE') {
      this.client.enqueueCommand({
        command: 'IDLE'
      });
      this._idleTimeout = setTimeout(() => {
        this.client.send('DONE\r\n');
        this._enteredIdle = false;
        this.logger.debug('Idle terminated');
      }, this.timeoutIdle);
    }
  }
  /**
   * Stops actions related idling, if IDLE is supported, sends DONE to stop it
   */


  breakIdle() {
    if (!this._enteredIdle) {
      return;
    }

    clearTimeout(this._idleTimeout);

    if (this._enteredIdle === 'IDLE') {
      this.client.send('DONE\r\n');
      this.logger.debug('Idle terminated');
    }

    this._enteredIdle = false;
  }
  /**
   * Runs STARTTLS command if needed
   *
   * STARTTLS details:
   *   http://tools.ietf.org/html/rfc3501#section-6.2.1
   *
   * @param {Boolean} [forced] By default the command is not run if capability is already listed. Set to true to skip this validation
   */


  upgradeConnection() {
    var _this18 = this;

    return _asyncToGenerator(function* () {
      // skip request, if already secured
      if (_this18.client.secureMode) {
        return false;
      } // skip if STARTTLS not available or starttls support disabled


      if ((_this18._capability.indexOf('STARTTLS') < 0 || _this18._ignoreTLS) && !_this18._requireTLS) {
        return false;
      }

      _this18.logger.debug('Encrypting connection...');

      yield _this18.exec('STARTTLS');
      _this18._capability = [];

      _this18.client.upgrade();

      return _this18.updateCapability();
    })();
  }
  /**
   * Runs CAPABILITY command
   *
   * CAPABILITY details:
   *   http://tools.ietf.org/html/rfc3501#section-6.1.1
   *
   * Doesn't register untagged CAPABILITY handler as this is already
   * handled by global handler
   *
   * @param {Boolean} [forced] By default the command is not run if capability is already listed. Set to true to skip this validation
   */


  updateCapability(forced) {
    var _this19 = this;

    return _asyncToGenerator(function* () {
      // skip request, if not forced update and capabilities are already loaded
      if (!forced && _this19._capability.length) {
        return;
      } // If STARTTLS is required then skip capability listing as we are going to try
      // STARTTLS anyway and we re-check capabilities after connection is secured


      if (!_this19.client.secureMode && _this19._requireTLS) {
        return;
      }

      _this19.logger.debug('Updating capability...');

      return _this19.exec('CAPABILITY');
    })();
  }

  hasCapability(capa = '') {
    return this._capability.indexOf(capa.toUpperCase().trim()) >= 0;
  } // Default handlers for untagged responses

  /**
   * Checks if an untagged OK includes [CAPABILITY] tag and updates capability object
   *
   * @param {Object} response Parsed server response
   * @param {Function} next Until called, server responses are not processed
   */


  _untaggedOkHandler(response) {
    if (response && response.capability) {
      this._capability = response.capability;
    }
  }
  /**
   * Updates capability object
   *
   * @param {Object} response Parsed server response
   * @param {Function} next Until called, server responses are not processed
   */


  _untaggedCapabilityHandler(response) {
    this._capability = (0, _ramda.pipe)((0, _ramda.propOr)([], 'attributes'), (0, _ramda.map)(({
      value
    }) => (value || '').toUpperCase().trim()))(response);
  }
  /**
   * Updates existing message count
   *
   * @param {Object} response Parsed server response
   * @param {Function} next Until called, server responses are not processed
   */


  _untaggedExistsHandler(response) {
    if (response && response.hasOwnProperty('nr')) {
      this.onupdate && this.onupdate(this._selectedMailbox, 'exists', response.nr);
    }
  }
  /**
   * Indicates a message has been deleted
   *
   * @param {Object} response Parsed server response
   * @param {Function} next Until called, server responses are not processed
   */


  _untaggedExpungeHandler(response) {
    if (response && response.hasOwnProperty('nr')) {
      this.onupdate && this.onupdate(this._selectedMailbox, 'expunge', response.nr);
    }
  }
  /**
   * Indicates that flags have been updated for a message
   *
   * @param {Object} response Parsed server response
   * @param {Function} next Until called, server responses are not processed
   */


  _untaggedFetchHandler(response) {
    this.onupdate && this.onupdate(this._selectedMailbox, 'fetch', [].concat((0, _commandParser.parseFETCH)({
      payload: {
        FETCH: [response]
      }
    }) || []).shift());
  } // Private helpers

  /**
   * Indicates that the connection started idling. Initiates a cycle
   * of NOOPs or IDLEs to receive notifications about updates in the server
   */


  _onIdle() {
    if (!this._authenticated || this._enteredIdle) {
      // No need to IDLE when not logged in or already idling
      return;
    }

    this.logger.debug('Client started idling');
    this.enterIdle();
  }
  /**
   * Updates the IMAP state value for the current connection
   *
   * @param {Number} newState The state you want to change to
   */


  _changeState(newState) {
    if (newState === this._state) {
      return;
    }

    this.logger.debug('Entering state: ' + newState); // if a mailbox was opened, emit onclosemailbox and clear selectedMailbox value

    if (this._state === STATE_SELECTED && this._selectedMailbox) {
      this.onclosemailbox && this.onclosemailbox(this._selectedMailbox);
      this._selectedMailbox = false;
    }

    this._state = newState;
  }
  /**
   * Ensures a path exists in the Mailbox tree
   *
   * @param {Object} tree Mailbox tree
   * @param {String} path
   * @param {String} delimiter
   * @return {Object} branch for used path
   */


  _ensurePath(tree, path, delimiter) {
    const names = path.split(delimiter);
    let branch = tree;

    for (let i = 0; i < names.length; i++) {
      let found = false;

      for (let j = 0; j < branch.children.length; j++) {
        if (this._compareMailboxNames(branch.children[j].name, (0, _emailjsUtf.imapDecode)(names[i]))) {
          branch = branch.children[j];
          found = true;
          break;
        }
      }

      if (!found) {
        branch.children.push({
          name: (0, _emailjsUtf.imapDecode)(names[i]),
          delimiter: delimiter,
          path: names.slice(0, i + 1).join(delimiter),
          children: []
        });
        branch = branch.children[branch.children.length - 1];
      }
    }

    return branch;
  }
  /**
   * Compares two mailbox names. Case insensitive in case of INBOX, otherwise case sensitive
   *
   * @param {String} a Mailbox name
   * @param {String} b Mailbox name
   * @returns {Boolean} True if the folder names match
   */


  _compareMailboxNames(a, b) {
    return (a.toUpperCase() === 'INBOX' ? 'INBOX' : a) === (b.toUpperCase() === 'INBOX' ? 'INBOX' : b);
  }

  createLogger(creator = _logger.default) {
    const logger = creator((this._auth || {}).user || '', this._host);
    this.logger = this.client.logger = {
      debug: (...msgs) => {
        if (_common.LOG_LEVEL_DEBUG >= this.logLevel) {
          logger.debug(msgs);
        }
      },
      info: (...msgs) => {
        if (_common.LOG_LEVEL_INFO >= this.logLevel) {
          logger.info(msgs);
        }
      },
      warn: (...msgs) => {
        if (_common.LOG_LEVEL_WARN >= this.logLevel) {
          logger.warn(msgs);
        }
      },
      error: (...msgs) => {
        if (_common.LOG_LEVEL_ERROR >= this.logLevel) {
          logger.error(msgs);
        }
      }
    };
  }

}

exports.default = Client;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jbGllbnQuanMiXSwibmFtZXMiOlsiVElNRU9VVF9DT05ORUNUSU9OIiwiVElNRU9VVF9OT09QIiwiVElNRU9VVF9JRExFIiwiU1RBVEVfQ09OTkVDVElORyIsIlNUQVRFX05PVF9BVVRIRU5USUNBVEVEIiwiU1RBVEVfQVVUSEVOVElDQVRFRCIsIlNUQVRFX1NFTEVDVEVEIiwiU1RBVEVfTE9HT1VUIiwiREVGQVVMVF9DTElFTlRfSUQiLCJuYW1lIiwiQ2xpZW50IiwiY29uc3RydWN0b3IiLCJob3N0IiwicG9ydCIsIm9wdGlvbnMiLCJ0aW1lb3V0Q29ubmVjdGlvbiIsInRpbWVvdXROb29wIiwidGltZW91dElkbGUiLCJzZXJ2ZXJJZCIsIm9uY2VydCIsIm9udXBkYXRlIiwib25zZWxlY3RtYWlsYm94Iiwib25jbG9zZW1haWxib3giLCJfaG9zdCIsIl9jbGllbnRJZCIsIl9zdGF0ZSIsIl9hdXRoZW50aWNhdGVkIiwiX2NhcGFiaWxpdHkiLCJfc2VsZWN0ZWRNYWlsYm94IiwiX2VudGVyZWRJZGxlIiwiX2lkbGVUaW1lb3V0IiwiX2VuYWJsZUNvbXByZXNzaW9uIiwiZW5hYmxlQ29tcHJlc3Npb24iLCJfYXV0aCIsImF1dGgiLCJfcmVxdWlyZVRMUyIsInJlcXVpcmVUTFMiLCJfaWdub3JlVExTIiwiaWdub3JlVExTIiwiY2xpZW50IiwiSW1hcENsaWVudCIsIm9uZXJyb3IiLCJfb25FcnJvciIsImJpbmQiLCJjZXJ0Iiwib25pZGxlIiwiX29uSWRsZSIsInNldEhhbmRsZXIiLCJyZXNwb25zZSIsIl91bnRhZ2dlZENhcGFiaWxpdHlIYW5kbGVyIiwiX3VudGFnZ2VkT2tIYW5kbGVyIiwiX3VudGFnZ2VkRXhpc3RzSGFuZGxlciIsIl91bnRhZ2dlZEV4cHVuZ2VIYW5kbGVyIiwiX3VudGFnZ2VkRmV0Y2hIYW5kbGVyIiwiY3JlYXRlTG9nZ2VyIiwibG9nTGV2ZWwiLCJMT0dfTEVWRUxfQUxMIiwiZXJyIiwiY2xlYXJUaW1lb3V0IiwiY29ubmVjdCIsIl9vcGVuQ29ubmVjdGlvbiIsIl9jaGFuZ2VTdGF0ZSIsInVwZGF0ZUNhcGFiaWxpdHkiLCJ1cGdyYWRlQ29ubmVjdGlvbiIsInVwZGF0ZUlkIiwibG9nZ2VyIiwid2FybiIsIm1lc3NhZ2UiLCJsb2dpbiIsImNvbXByZXNzQ29ubmVjdGlvbiIsImRlYnVnIiwiZXJyb3IiLCJjbG9zZSIsImNFcnIiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImNvbm5lY3Rpb25UaW1lb3V0Iiwic2V0VGltZW91dCIsIkVycm9yIiwidGhlbiIsIm9ucmVhZHkiLCJjYXRjaCIsImxvZ291dCIsImlkIiwiaW5kZXhPZiIsImNvbW1hbmQiLCJhdHRyaWJ1dGVzIiwiT2JqZWN0IiwiZW50cmllcyIsImV4ZWMiLCJsaXN0IiwibWFwIiwidmFsdWVzIiwia2V5cyIsImZpbHRlciIsIl8iLCJpIiwiX3Nob3VsZFNlbGVjdE1haWxib3giLCJwYXRoIiwiY3R4IiwicHJldmlvdXNTZWxlY3QiLCJnZXRQcmV2aW91c2x5UXVldWVkIiwicmVxdWVzdCIsInBhdGhBdHRyaWJ1dGUiLCJmaW5kIiwiYXR0cmlidXRlIiwidHlwZSIsInZhbHVlIiwic2VsZWN0TWFpbGJveCIsInF1ZXJ5IiwicmVhZE9ubHkiLCJjb25kc3RvcmUiLCJwdXNoIiwibWFpbGJveEluZm8iLCJsaXN0TmFtZXNwYWNlcyIsImxpc3RNYWlsYm94ZXMiLCJ0cmVlIiwicm9vdCIsImNoaWxkcmVuIiwibGlzdFJlc3BvbnNlIiwiZm9yRWFjaCIsIml0ZW0iLCJhdHRyIiwibGVuZ3RoIiwiZGVsaW0iLCJicmFuY2giLCJfZW5zdXJlUGF0aCIsImZsYWdzIiwibGlzdGVkIiwibHN1YlJlc3BvbnNlIiwibHN1YiIsImZsYWciLCJzdWJzY3JpYmVkIiwiY3JlYXRlTWFpbGJveCIsImNvZGUiLCJkZWxldGVNYWlsYm94IiwibGlzdE1lc3NhZ2VzIiwic2VxdWVuY2UiLCJpdGVtcyIsImZhc3QiLCJwcmVjaGVjayIsInNlYXJjaCIsInNldEZsYWdzIiwia2V5IiwiQXJyYXkiLCJpc0FycmF5IiwiY29uY2F0IiwiYWRkIiwic2V0IiwicmVtb3ZlIiwic3RvcmUiLCJhY3Rpb24iLCJ1cGxvYWQiLCJkZXN0aW5hdGlvbiIsImRlbGV0ZU1lc3NhZ2VzIiwidXNlVWlkUGx1cyIsImJ5VWlkIiwidWlkRXhwdW5nZUNvbW1hbmQiLCJjbWQiLCJjb3B5TWVzc2FnZXMiLCJodW1hblJlYWRhYmxlIiwibW92ZU1lc3NhZ2VzIiwiY29tcHJlc3NlZCIsInhvYXV0aDIiLCJ1c2VyIiwic2Vuc2l0aXZlIiwiZXJyb3JSZXNwb25zZUV4cGVjdHNFbXB0eUxpbmUiLCJwYXNzIiwiY2FwYWJpbGl0eSIsInBheWxvYWQiLCJDQVBBQklMSVRZIiwicG9wIiwiY2FwYSIsInRvVXBwZXJDYXNlIiwidHJpbSIsImFjY2VwdFVudGFnZ2VkIiwiYnJlYWtJZGxlIiwiZW5xdWV1ZUNvbW1hbmQiLCJlbnRlcklkbGUiLCJzZW5kIiwic2VjdXJlTW9kZSIsInVwZ3JhZGUiLCJmb3JjZWQiLCJoYXNDYXBhYmlsaXR5IiwiaGFzT3duUHJvcGVydHkiLCJuciIsIkZFVENIIiwic2hpZnQiLCJuZXdTdGF0ZSIsImRlbGltaXRlciIsIm5hbWVzIiwic3BsaXQiLCJmb3VuZCIsImoiLCJfY29tcGFyZU1haWxib3hOYW1lcyIsInNsaWNlIiwiam9pbiIsImEiLCJiIiwiY3JlYXRvciIsImNyZWF0ZURlZmF1bHRMb2dnZXIiLCJtc2dzIiwiTE9HX0xFVkVMX0RFQlVHIiwiaW5mbyIsIkxPR19MRVZFTF9JTkZPIiwiTE9HX0xFVkVMX1dBUk4iLCJMT0dfTEVWRUxfRVJST1IiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7QUFDQTs7QUFDQTs7QUFNQTs7QUFPQTs7QUFDQTs7QUFDQTs7QUFRQTs7Ozs7Ozs7QUFJTyxNQUFNQSxrQkFBa0IsR0FBRyxLQUFLLElBQWhDLEMsQ0FBcUM7OztBQUNyQyxNQUFNQyxZQUFZLEdBQUcsS0FBSyxJQUExQixDLENBQStCOzs7QUFDL0IsTUFBTUMsWUFBWSxHQUFHLEtBQUssSUFBMUIsQyxDQUErQjs7O0FBRS9CLE1BQU1DLGdCQUFnQixHQUFHLENBQXpCOztBQUNBLE1BQU1DLHVCQUF1QixHQUFHLENBQWhDOztBQUNBLE1BQU1DLG1CQUFtQixHQUFHLENBQTVCOztBQUNBLE1BQU1DLGNBQWMsR0FBRyxDQUF2Qjs7QUFDQSxNQUFNQyxZQUFZLEdBQUcsQ0FBckI7O0FBRUEsTUFBTUMsaUJBQWlCLEdBQUc7QUFDL0JDLEVBQUFBLElBQUksRUFBRTtBQUdSOzs7Ozs7Ozs7O0FBSmlDLENBQTFCOzs7QUFhUSxNQUFNQyxNQUFOLENBQWE7QUFDMUJDLEVBQUFBLFdBQVcsQ0FBRUMsSUFBRixFQUFRQyxJQUFSLEVBQWNDLE9BQU8sR0FBRyxFQUF4QixFQUE0QjtBQUNyQyxTQUFLQyxpQkFBTCxHQUF5QmYsa0JBQXpCO0FBQ0EsU0FBS2dCLFdBQUwsR0FBbUJmLFlBQW5CO0FBQ0EsU0FBS2dCLFdBQUwsR0FBbUJmLFlBQW5CO0FBRUEsU0FBS2dCLFFBQUwsR0FBZ0IsS0FBaEIsQ0FMcUMsQ0FLZjtBQUV0Qjs7QUFDQSxTQUFLQyxNQUFMLEdBQWMsSUFBZDtBQUNBLFNBQUtDLFFBQUwsR0FBZ0IsSUFBaEI7QUFDQSxTQUFLQyxlQUFMLEdBQXVCLElBQXZCO0FBQ0EsU0FBS0MsY0FBTCxHQUFzQixJQUF0QjtBQUVBLFNBQUtDLEtBQUwsR0FBYVgsSUFBYjtBQUNBLFNBQUtZLFNBQUwsR0FBaUIsbUJBQU9oQixpQkFBUCxFQUEwQixJQUExQixFQUFnQ00sT0FBaEMsQ0FBakI7QUFDQSxTQUFLVyxNQUFMLEdBQWMsS0FBZCxDQWZxQyxDQWVqQjs7QUFDcEIsU0FBS0MsY0FBTCxHQUFzQixLQUF0QixDQWhCcUMsQ0FnQlQ7O0FBQzVCLFNBQUtDLFdBQUwsR0FBbUIsRUFBbkIsQ0FqQnFDLENBaUJmOztBQUN0QixTQUFLQyxnQkFBTCxHQUF3QixLQUF4QixDQWxCcUMsQ0FrQlA7O0FBQzlCLFNBQUtDLFlBQUwsR0FBb0IsS0FBcEI7QUFDQSxTQUFLQyxZQUFMLEdBQW9CLEtBQXBCO0FBQ0EsU0FBS0Msa0JBQUwsR0FBMEIsQ0FBQyxDQUFDakIsT0FBTyxDQUFDa0IsaUJBQXBDO0FBQ0EsU0FBS0MsS0FBTCxHQUFhbkIsT0FBTyxDQUFDb0IsSUFBckI7QUFDQSxTQUFLQyxXQUFMLEdBQW1CLENBQUMsQ0FBQ3JCLE9BQU8sQ0FBQ3NCLFVBQTdCO0FBQ0EsU0FBS0MsVUFBTCxHQUFrQixDQUFDLENBQUN2QixPQUFPLENBQUN3QixTQUE1QjtBQUVBLFNBQUtDLE1BQUwsR0FBYyxJQUFJQyxhQUFKLENBQWU1QixJQUFmLEVBQXFCQyxJQUFyQixFQUEyQkMsT0FBM0IsQ0FBZCxDQTFCcUMsQ0EwQmE7QUFFbEQ7O0FBQ0EsU0FBS3lCLE1BQUwsQ0FBWUUsT0FBWixHQUFzQixLQUFLQyxRQUFMLENBQWNDLElBQWQsQ0FBbUIsSUFBbkIsQ0FBdEI7O0FBQ0EsU0FBS0osTUFBTCxDQUFZcEIsTUFBWixHQUFzQnlCLElBQUQsSUFBVyxLQUFLekIsTUFBTCxJQUFlLEtBQUtBLE1BQUwsQ0FBWXlCLElBQVosQ0FBL0MsQ0E5QnFDLENBOEI2Qjs7O0FBQ2xFLFNBQUtMLE1BQUwsQ0FBWU0sTUFBWixHQUFxQixNQUFNLEtBQUtDLE9BQUwsRUFBM0IsQ0EvQnFDLENBK0JLO0FBRTFDOzs7QUFDQSxTQUFLUCxNQUFMLENBQVlRLFVBQVosQ0FBdUIsWUFBdkIsRUFBc0NDLFFBQUQsSUFBYyxLQUFLQywwQkFBTCxDQUFnQ0QsUUFBaEMsQ0FBbkQsRUFsQ3FDLENBa0N5RDs7QUFDOUYsU0FBS1QsTUFBTCxDQUFZUSxVQUFaLENBQXVCLElBQXZCLEVBQThCQyxRQUFELElBQWMsS0FBS0Usa0JBQUwsQ0FBd0JGLFFBQXhCLENBQTNDLEVBbkNxQyxDQW1DeUM7O0FBQzlFLFNBQUtULE1BQUwsQ0FBWVEsVUFBWixDQUF1QixRQUF2QixFQUFrQ0MsUUFBRCxJQUFjLEtBQUtHLHNCQUFMLENBQTRCSCxRQUE1QixDQUEvQyxFQXBDcUMsQ0FvQ2lEOztBQUN0RixTQUFLVCxNQUFMLENBQVlRLFVBQVosQ0FBdUIsU0FBdkIsRUFBbUNDLFFBQUQsSUFBYyxLQUFLSSx1QkFBTCxDQUE2QkosUUFBN0IsQ0FBaEQsRUFyQ3FDLENBcUNtRDs7QUFDeEYsU0FBS1QsTUFBTCxDQUFZUSxVQUFaLENBQXVCLE9BQXZCLEVBQWlDQyxRQUFELElBQWMsS0FBS0sscUJBQUwsQ0FBMkJMLFFBQTNCLENBQTlDLEVBdENxQyxDQXNDK0M7QUFFcEY7O0FBQ0EsU0FBS00sWUFBTDtBQUNBLFNBQUtDLFFBQUwsR0FBZ0IsbUJBQU9DLHFCQUFQLEVBQXNCLFVBQXRCLEVBQWtDMUMsT0FBbEMsQ0FBaEI7QUFDRDtBQUVEOzs7Ozs7QUFJQTRCLEVBQUFBLFFBQVEsQ0FBRWUsR0FBRixFQUFPO0FBQ2I7QUFDQUMsSUFBQUEsWUFBWSxDQUFDLEtBQUs1QixZQUFOLENBQVosQ0FGYSxDQUliOztBQUNBLFNBQUtXLE9BQUwsSUFBZ0IsS0FBS0EsT0FBTCxDQUFhZ0IsR0FBYixDQUFoQjtBQUNELEdBeER5QixDQTBEMUI7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7Ozs7OztBQUtNRSxFQUFBQSxPQUFOLEdBQWlCO0FBQUE7O0FBQUE7QUFDZixVQUFJO0FBQ0YsY0FBTSxLQUFJLENBQUNDLGVBQUwsRUFBTjs7QUFDQSxRQUFBLEtBQUksQ0FBQ0MsWUFBTCxDQUFrQnpELHVCQUFsQjs7QUFDQSxjQUFNLEtBQUksQ0FBQzBELGdCQUFMLEVBQU47QUFDQSxjQUFNLEtBQUksQ0FBQ0MsaUJBQUwsRUFBTjs7QUFDQSxZQUFJO0FBQ0YsZ0JBQU0sS0FBSSxDQUFDQyxRQUFMLENBQWMsS0FBSSxDQUFDeEMsU0FBbkIsQ0FBTjtBQUNELFNBRkQsQ0FFRSxPQUFPaUMsR0FBUCxFQUFZO0FBQ1osVUFBQSxLQUFJLENBQUNRLE1BQUwsQ0FBWUMsSUFBWixDQUFpQiw2QkFBakIsRUFBZ0RULEdBQUcsQ0FBQ1UsT0FBcEQ7QUFDRDs7QUFFRCxjQUFNLEtBQUksQ0FBQ0MsS0FBTCxDQUFXLEtBQUksQ0FBQ25DLEtBQWhCLENBQU47QUFDQSxjQUFNLEtBQUksQ0FBQ29DLGtCQUFMLEVBQU47O0FBQ0EsUUFBQSxLQUFJLENBQUNKLE1BQUwsQ0FBWUssS0FBWixDQUFrQix3Q0FBbEI7O0FBQ0EsUUFBQSxLQUFJLENBQUMvQixNQUFMLENBQVlFLE9BQVosR0FBc0IsS0FBSSxDQUFDQyxRQUFMLENBQWNDLElBQWQsQ0FBbUIsS0FBbkIsQ0FBdEI7QUFDRCxPQWZELENBZUUsT0FBT2MsR0FBUCxFQUFZO0FBQ1osUUFBQSxLQUFJLENBQUNRLE1BQUwsQ0FBWU0sS0FBWixDQUFrQiw2QkFBbEIsRUFBaURkLEdBQWpEOztBQUNBLFlBQUk7QUFDRixnQkFBTSxLQUFJLENBQUNlLEtBQUwsQ0FBV2YsR0FBWCxDQUFOLENBREUsQ0FDb0I7QUFDdkIsU0FGRCxDQUVFLE9BQU9nQixJQUFQLEVBQWE7QUFDYixnQkFBTUEsSUFBTjtBQUNEOztBQUNELGNBQU1oQixHQUFOO0FBQ0Q7QUF4QmM7QUF5QmhCOztBQUVERyxFQUFBQSxlQUFlLEdBQUk7QUFDakIsV0FBTyxJQUFJYyxPQUFKLENBQVksQ0FBQ0MsT0FBRCxFQUFVQyxNQUFWLEtBQXFCO0FBQ3RDLFVBQUlDLGlCQUFpQixHQUFHQyxVQUFVLENBQUMsTUFBTUYsTUFBTSxDQUFDLElBQUlHLEtBQUosQ0FBVSw4QkFBVixDQUFELENBQWIsRUFBMEQsS0FBS2hFLGlCQUEvRCxDQUFsQztBQUNBLFdBQUtrRCxNQUFMLENBQVlLLEtBQVosQ0FBa0IsZUFBbEIsRUFBbUMsS0FBSy9CLE1BQUwsQ0FBWTNCLElBQS9DLEVBQXFELEdBQXJELEVBQTBELEtBQUsyQixNQUFMLENBQVkxQixJQUF0RTs7QUFDQSxXQUFLZ0QsWUFBTCxDQUFrQjFELGdCQUFsQjs7QUFDQSxXQUFLb0MsTUFBTCxDQUFZb0IsT0FBWixHQUFzQnFCLElBQXRCLENBQTJCLE1BQU07QUFDL0IsYUFBS2YsTUFBTCxDQUFZSyxLQUFaLENBQWtCLHdEQUFsQjs7QUFFQSxhQUFLL0IsTUFBTCxDQUFZMEMsT0FBWixHQUFzQixNQUFNO0FBQzFCdkIsVUFBQUEsWUFBWSxDQUFDbUIsaUJBQUQsQ0FBWjtBQUNBRixVQUFBQSxPQUFPO0FBQ1IsU0FIRDs7QUFLQSxhQUFLcEMsTUFBTCxDQUFZRSxPQUFaLEdBQXVCZ0IsR0FBRCxJQUFTO0FBQzdCQyxVQUFBQSxZQUFZLENBQUNtQixpQkFBRCxDQUFaO0FBQ0FELFVBQUFBLE1BQU0sQ0FBQ25CLEdBQUQsQ0FBTjtBQUNELFNBSEQ7QUFJRCxPQVpELEVBWUd5QixLQVpILENBWVNOLE1BWlQ7QUFhRCxLQWpCTSxDQUFQO0FBa0JEO0FBRUQ7Ozs7Ozs7Ozs7Ozs7O0FBWU1PLEVBQUFBLE1BQU4sR0FBZ0I7QUFBQTs7QUFBQTtBQUNkLE1BQUEsTUFBSSxDQUFDdEIsWUFBTCxDQUFrQnRELFlBQWxCOztBQUNBLE1BQUEsTUFBSSxDQUFDMEQsTUFBTCxDQUFZSyxLQUFaLENBQWtCLGdCQUFsQjs7QUFDQSxZQUFNLE1BQUksQ0FBQy9CLE1BQUwsQ0FBWTRDLE1BQVosRUFBTjtBQUNBekIsTUFBQUEsWUFBWSxDQUFDLE1BQUksQ0FBQzVCLFlBQU4sQ0FBWjtBQUpjO0FBS2Y7QUFFRDs7Ozs7OztBQUtNMEMsRUFBQUEsS0FBTixDQUFhZixHQUFiLEVBQWtCO0FBQUE7O0FBQUE7QUFDaEIsTUFBQSxNQUFJLENBQUNJLFlBQUwsQ0FBa0J0RCxZQUFsQjs7QUFDQW1ELE1BQUFBLFlBQVksQ0FBQyxNQUFJLENBQUM1QixZQUFOLENBQVo7O0FBQ0EsTUFBQSxNQUFJLENBQUNtQyxNQUFMLENBQVlLLEtBQVosQ0FBa0IsdUJBQWxCOztBQUNBLFlBQU0sTUFBSSxDQUFDL0IsTUFBTCxDQUFZaUMsS0FBWixDQUFrQmYsR0FBbEIsQ0FBTjtBQUNBQyxNQUFBQSxZQUFZLENBQUMsTUFBSSxDQUFDNUIsWUFBTixDQUFaO0FBTGdCO0FBTWpCO0FBRUQ7Ozs7Ozs7Ozs7O0FBU01rQyxFQUFBQSxRQUFOLENBQWdCb0IsRUFBaEIsRUFBb0I7QUFBQTs7QUFBQTtBQUNsQixVQUFJLE1BQUksQ0FBQ3pELFdBQUwsQ0FBaUIwRCxPQUFqQixDQUF5QixJQUF6QixJQUFpQyxDQUFyQyxFQUF3Qzs7QUFFeEMsTUFBQSxNQUFJLENBQUNwQixNQUFMLENBQVlLLEtBQVosQ0FBa0IsZ0JBQWxCOztBQUVBLFlBQU1nQixPQUFPLEdBQUcsSUFBaEI7QUFDQSxZQUFNQyxVQUFVLEdBQUdILEVBQUUsR0FBRyxDQUFFLG9CQUFRSSxNQUFNLENBQUNDLE9BQVAsQ0FBZUwsRUFBZixDQUFSLENBQUYsQ0FBSCxHQUFxQyxDQUFFLElBQUYsQ0FBMUQ7QUFDQSxZQUFNcEMsUUFBUSxTQUFTLE1BQUksQ0FBQzBDLElBQUwsQ0FBVTtBQUFFSixRQUFBQSxPQUFGO0FBQVdDLFFBQUFBO0FBQVgsT0FBVixFQUFtQyxJQUFuQyxDQUF2QjtBQUNBLFlBQU1JLElBQUksR0FBRyxvQkFBUSxtQkFBTyxFQUFQLEVBQVcsQ0FBQyxTQUFELEVBQVksSUFBWixFQUFrQixHQUFsQixFQUF1QixZQUF2QixFQUFxQyxHQUFyQyxDQUFYLEVBQXNEM0MsUUFBdEQsRUFBZ0U0QyxHQUFoRSxDQUFvRUosTUFBTSxDQUFDSyxNQUEzRSxDQUFSLENBQWI7QUFDQSxZQUFNQyxJQUFJLEdBQUdILElBQUksQ0FBQ0ksTUFBTCxDQUFZLENBQUNDLENBQUQsRUFBSUMsQ0FBSixLQUFVQSxDQUFDLEdBQUcsQ0FBSixLQUFVLENBQWhDLENBQWI7QUFDQSxZQUFNSixNQUFNLEdBQUdGLElBQUksQ0FBQ0ksTUFBTCxDQUFZLENBQUNDLENBQUQsRUFBSUMsQ0FBSixLQUFVQSxDQUFDLEdBQUcsQ0FBSixLQUFVLENBQWhDLENBQWY7QUFDQSxNQUFBLE1BQUksQ0FBQy9FLFFBQUwsR0FBZ0Isc0JBQVUsZ0JBQUk0RSxJQUFKLEVBQVVELE1BQVYsQ0FBVixDQUFoQjs7QUFDQSxNQUFBLE1BQUksQ0FBQzVCLE1BQUwsQ0FBWUssS0FBWixDQUFrQixvQkFBbEIsRUFBd0MsTUFBSSxDQUFDcEQsUUFBN0M7QUFaa0I7QUFhbkI7O0FBRURnRixFQUFBQSxvQkFBb0IsQ0FBRUMsSUFBRixFQUFRQyxHQUFSLEVBQWE7QUFDL0IsUUFBSSxDQUFDQSxHQUFMLEVBQVU7QUFDUixhQUFPLElBQVA7QUFDRDs7QUFFRCxVQUFNQyxjQUFjLEdBQUcsS0FBSzlELE1BQUwsQ0FBWStELG1CQUFaLENBQWdDLENBQUMsUUFBRCxFQUFXLFNBQVgsQ0FBaEMsRUFBdURGLEdBQXZELENBQXZCOztBQUNBLFFBQUlDLGNBQWMsSUFBSUEsY0FBYyxDQUFDRSxPQUFmLENBQXVCaEIsVUFBN0MsRUFBeUQ7QUFDdkQsWUFBTWlCLGFBQWEsR0FBR0gsY0FBYyxDQUFDRSxPQUFmLENBQXVCaEIsVUFBdkIsQ0FBa0NrQixJQUFsQyxDQUF3Q0MsU0FBRCxJQUFlQSxTQUFTLENBQUNDLElBQVYsS0FBbUIsUUFBekUsQ0FBdEI7O0FBQ0EsVUFBSUgsYUFBSixFQUFtQjtBQUNqQixlQUFPQSxhQUFhLENBQUNJLEtBQWQsS0FBd0JULElBQS9CO0FBQ0Q7QUFDRjs7QUFFRCxXQUFPLEtBQUt2RSxnQkFBTCxLQUEwQnVFLElBQWpDO0FBQ0Q7QUFFRDs7Ozs7Ozs7Ozs7Ozs7QUFZTVUsRUFBQUEsYUFBTixDQUFxQlYsSUFBckIsRUFBMkJyRixPQUFPLEdBQUcsRUFBckMsRUFBeUM7QUFBQTs7QUFBQTtBQUN2QyxVQUFJZ0csS0FBSyxHQUFHO0FBQ1Z4QixRQUFBQSxPQUFPLEVBQUV4RSxPQUFPLENBQUNpRyxRQUFSLEdBQW1CLFNBQW5CLEdBQStCLFFBRDlCO0FBRVZ4QixRQUFBQSxVQUFVLEVBQUUsQ0FBQztBQUFFb0IsVUFBQUEsSUFBSSxFQUFFLFFBQVI7QUFBa0JDLFVBQUFBLEtBQUssRUFBRVQ7QUFBekIsU0FBRDtBQUZGLE9BQVo7O0FBS0EsVUFBSXJGLE9BQU8sQ0FBQ2tHLFNBQVIsSUFBcUIsTUFBSSxDQUFDckYsV0FBTCxDQUFpQjBELE9BQWpCLENBQXlCLFdBQXpCLEtBQXlDLENBQWxFLEVBQXFFO0FBQ25FeUIsUUFBQUEsS0FBSyxDQUFDdkIsVUFBTixDQUFpQjBCLElBQWpCLENBQXNCLENBQUM7QUFBRU4sVUFBQUEsSUFBSSxFQUFFLE1BQVI7QUFBZ0JDLFVBQUFBLEtBQUssRUFBRTtBQUF2QixTQUFELENBQXRCO0FBQ0Q7O0FBRUQsTUFBQSxNQUFJLENBQUMzQyxNQUFMLENBQVlLLEtBQVosQ0FBa0IsU0FBbEIsRUFBNkI2QixJQUE3QixFQUFtQyxLQUFuQzs7QUFDQSxZQUFNbkQsUUFBUSxTQUFTLE1BQUksQ0FBQzBDLElBQUwsQ0FBVW9CLEtBQVYsRUFBaUIsQ0FBQyxRQUFELEVBQVcsT0FBWCxFQUFvQixJQUFwQixDQUFqQixFQUE0QztBQUFFVixRQUFBQSxHQUFHLEVBQUV0RixPQUFPLENBQUNzRjtBQUFmLE9BQTVDLENBQXZCO0FBQ0EsVUFBSWMsV0FBVyxHQUFHLGdDQUFZbEUsUUFBWixDQUFsQjs7QUFFQSxNQUFBLE1BQUksQ0FBQ2EsWUFBTCxDQUFrQnZELGNBQWxCOztBQUVBLFVBQUksTUFBSSxDQUFDc0IsZ0JBQUwsS0FBMEJ1RSxJQUExQixJQUFrQyxNQUFJLENBQUM3RSxjQUEzQyxFQUEyRDtBQUN6RCxjQUFNLE1BQUksQ0FBQ0EsY0FBTCxDQUFvQixNQUFJLENBQUNNLGdCQUF6QixDQUFOO0FBQ0Q7O0FBQ0QsTUFBQSxNQUFJLENBQUNBLGdCQUFMLEdBQXdCdUUsSUFBeEI7O0FBQ0EsVUFBSSxNQUFJLENBQUM5RSxlQUFULEVBQTBCO0FBQ3hCLGNBQU0sTUFBSSxDQUFDQSxlQUFMLENBQXFCOEUsSUFBckIsRUFBMkJlLFdBQTNCLENBQU47QUFDRDs7QUFFRCxhQUFPQSxXQUFQO0FBeEJ1QztBQXlCeEM7QUFFRDs7Ozs7Ozs7OztBQVFNQyxFQUFBQSxjQUFOLEdBQXdCO0FBQUE7O0FBQUE7QUFDdEIsVUFBSSxNQUFJLENBQUN4RixXQUFMLENBQWlCMEQsT0FBakIsQ0FBeUIsV0FBekIsSUFBd0MsQ0FBNUMsRUFBK0MsT0FBTyxLQUFQOztBQUUvQyxNQUFBLE1BQUksQ0FBQ3BCLE1BQUwsQ0FBWUssS0FBWixDQUFrQix1QkFBbEI7O0FBQ0EsWUFBTXRCLFFBQVEsU0FBUyxNQUFJLENBQUMwQyxJQUFMLENBQVUsV0FBVixFQUF1QixXQUF2QixDQUF2QjtBQUNBLGFBQU8sbUNBQWUxQyxRQUFmLENBQVA7QUFMc0I7QUFNdkI7QUFFRDs7Ozs7Ozs7Ozs7O0FBVU1vRSxFQUFBQSxhQUFOLEdBQXVCO0FBQUE7O0FBQUE7QUFDckIsWUFBTUMsSUFBSSxHQUFHO0FBQUVDLFFBQUFBLElBQUksRUFBRSxJQUFSO0FBQWNDLFFBQUFBLFFBQVEsRUFBRTtBQUF4QixPQUFiOztBQUVBLE1BQUEsTUFBSSxDQUFDdEQsTUFBTCxDQUFZSyxLQUFaLENBQWtCLHNCQUFsQjs7QUFDQSxZQUFNa0QsWUFBWSxTQUFTLE1BQUksQ0FBQzlCLElBQUwsQ0FBVTtBQUFFSixRQUFBQSxPQUFPLEVBQUUsTUFBWDtBQUFtQkMsUUFBQUEsVUFBVSxFQUFFLENBQUMsRUFBRCxFQUFLLEdBQUw7QUFBL0IsT0FBVixFQUFzRCxNQUF0RCxDQUEzQjtBQUNBLFlBQU1JLElBQUksR0FBRyxtQkFBTyxFQUFQLEVBQVcsQ0FBQyxTQUFELEVBQVksTUFBWixDQUFYLEVBQWdDNkIsWUFBaEMsQ0FBYjtBQUNBN0IsTUFBQUEsSUFBSSxDQUFDOEIsT0FBTCxDQUFhQyxJQUFJLElBQUk7QUFDbkIsY0FBTUMsSUFBSSxHQUFHLG1CQUFPLEVBQVAsRUFBVyxZQUFYLEVBQXlCRCxJQUF6QixDQUFiO0FBQ0EsWUFBSUMsSUFBSSxDQUFDQyxNQUFMLEdBQWMsQ0FBbEIsRUFBcUI7QUFFckIsY0FBTXpCLElBQUksR0FBRyxtQkFBTyxFQUFQLEVBQVcsQ0FBQyxHQUFELEVBQU0sT0FBTixDQUFYLEVBQTJCd0IsSUFBM0IsQ0FBYjtBQUNBLGNBQU1FLEtBQUssR0FBRyxtQkFBTyxHQUFQLEVBQVksQ0FBQyxHQUFELEVBQU0sT0FBTixDQUFaLEVBQTRCRixJQUE1QixDQUFkOztBQUNBLGNBQU1HLE1BQU0sR0FBRyxNQUFJLENBQUNDLFdBQUwsQ0FBaUJWLElBQWpCLEVBQXVCbEIsSUFBdkIsRUFBNkIwQixLQUE3QixDQUFmOztBQUNBQyxRQUFBQSxNQUFNLENBQUNFLEtBQVAsR0FBZSxtQkFBTyxFQUFQLEVBQVcsR0FBWCxFQUFnQkwsSUFBaEIsRUFBc0IvQixHQUF0QixDQUEwQixDQUFDO0FBQUVnQixVQUFBQTtBQUFGLFNBQUQsS0FBZUEsS0FBSyxJQUFJLEVBQWxELENBQWY7QUFDQWtCLFFBQUFBLE1BQU0sQ0FBQ0csTUFBUCxHQUFnQixJQUFoQjtBQUNBLHlDQUFnQkgsTUFBaEI7QUFDRCxPQVZEO0FBWUEsWUFBTUksWUFBWSxTQUFTLE1BQUksQ0FBQ3hDLElBQUwsQ0FBVTtBQUFFSixRQUFBQSxPQUFPLEVBQUUsTUFBWDtBQUFtQkMsUUFBQUEsVUFBVSxFQUFFLENBQUMsRUFBRCxFQUFLLEdBQUw7QUFBL0IsT0FBVixFQUFzRCxNQUF0RCxDQUEzQjtBQUNBLFlBQU00QyxJQUFJLEdBQUcsbUJBQU8sRUFBUCxFQUFXLENBQUMsU0FBRCxFQUFZLE1BQVosQ0FBWCxFQUFnQ0QsWUFBaEMsQ0FBYjtBQUNBQyxNQUFBQSxJQUFJLENBQUNWLE9BQUwsQ0FBY0MsSUFBRCxJQUFVO0FBQ3JCLGNBQU1DLElBQUksR0FBRyxtQkFBTyxFQUFQLEVBQVcsWUFBWCxFQUF5QkQsSUFBekIsQ0FBYjtBQUNBLFlBQUlDLElBQUksQ0FBQ0MsTUFBTCxHQUFjLENBQWxCLEVBQXFCO0FBRXJCLGNBQU16QixJQUFJLEdBQUcsbUJBQU8sRUFBUCxFQUFXLENBQUMsR0FBRCxFQUFNLE9BQU4sQ0FBWCxFQUEyQndCLElBQTNCLENBQWI7QUFDQSxjQUFNRSxLQUFLLEdBQUcsbUJBQU8sR0FBUCxFQUFZLENBQUMsR0FBRCxFQUFNLE9BQU4sQ0FBWixFQUE0QkYsSUFBNUIsQ0FBZDs7QUFDQSxjQUFNRyxNQUFNLEdBQUcsTUFBSSxDQUFDQyxXQUFMLENBQWlCVixJQUFqQixFQUF1QmxCLElBQXZCLEVBQTZCMEIsS0FBN0IsQ0FBZjs7QUFDQSwyQkFBTyxFQUFQLEVBQVcsR0FBWCxFQUFnQkYsSUFBaEIsRUFBc0IvQixHQUF0QixDQUEwQixDQUFDd0MsSUFBSSxHQUFHLEVBQVIsS0FBZTtBQUFFTixVQUFBQSxNQUFNLENBQUNFLEtBQVAsR0FBZSxrQkFBTUYsTUFBTSxDQUFDRSxLQUFiLEVBQW9CLENBQUNJLElBQUQsQ0FBcEIsQ0FBZjtBQUE0QyxTQUF2RjtBQUNBTixRQUFBQSxNQUFNLENBQUNPLFVBQVAsR0FBb0IsSUFBcEI7QUFDRCxPQVREO0FBV0EsYUFBT2hCLElBQVA7QUEvQnFCO0FBZ0N0QjtBQUVEOzs7Ozs7Ozs7Ozs7Ozs7QUFhTWlCLEVBQUFBLGFBQU4sQ0FBcUJuQyxJQUFyQixFQUEyQjtBQUFBOztBQUFBO0FBQ3pCLE1BQUEsTUFBSSxDQUFDbEMsTUFBTCxDQUFZSyxLQUFaLENBQWtCLGtCQUFsQixFQUFzQzZCLElBQXRDLEVBQTRDLEtBQTVDOztBQUNBLFVBQUk7QUFDRixjQUFNLE1BQUksQ0FBQ1QsSUFBTCxDQUFVO0FBQUVKLFVBQUFBLE9BQU8sRUFBRSxRQUFYO0FBQXFCQyxVQUFBQSxVQUFVLEVBQUUsQ0FBQyw0QkFBV1ksSUFBWCxDQUFEO0FBQWpDLFNBQVYsQ0FBTjtBQUNELE9BRkQsQ0FFRSxPQUFPMUMsR0FBUCxFQUFZO0FBQ1osWUFBSUEsR0FBRyxJQUFJQSxHQUFHLENBQUM4RSxJQUFKLEtBQWEsZUFBeEIsRUFBeUM7QUFDdkM7QUFDRDs7QUFDRCxjQUFNOUUsR0FBTjtBQUNEO0FBVHdCO0FBVTFCO0FBRUQ7Ozs7Ozs7Ozs7Ozs7O0FBWUErRSxFQUFBQSxhQUFhLENBQUVyQyxJQUFGLEVBQVE7QUFDbkIsU0FBS2xDLE1BQUwsQ0FBWUssS0FBWixDQUFrQixrQkFBbEIsRUFBc0M2QixJQUF0QyxFQUE0QyxLQUE1QztBQUNBLFdBQU8sS0FBS1QsSUFBTCxDQUFVO0FBQUVKLE1BQUFBLE9BQU8sRUFBRSxRQUFYO0FBQXFCQyxNQUFBQSxVQUFVLEVBQUUsQ0FBQyw0QkFBV1ksSUFBWCxDQUFEO0FBQWpDLEtBQVYsQ0FBUDtBQUNEO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7QUFjTXNDLEVBQUFBLFlBQU4sQ0FBb0J0QyxJQUFwQixFQUEwQnVDLFFBQTFCLEVBQW9DQyxLQUFLLEdBQUcsQ0FBQztBQUFFQyxJQUFBQSxJQUFJLEVBQUU7QUFBUixHQUFELENBQTVDLEVBQThEOUgsT0FBTyxHQUFHLEVBQXhFLEVBQTRFO0FBQUE7O0FBQUE7QUFDMUUsTUFBQSxNQUFJLENBQUNtRCxNQUFMLENBQVlLLEtBQVosQ0FBa0IsbUJBQWxCLEVBQXVDb0UsUUFBdkMsRUFBaUQsTUFBakQsRUFBeUR2QyxJQUF6RCxFQUErRCxLQUEvRDs7QUFDQSxZQUFNYixPQUFPLEdBQUcsdUNBQWtCb0QsUUFBbEIsRUFBNEJDLEtBQTVCLEVBQW1DN0gsT0FBbkMsQ0FBaEI7QUFDQSxZQUFNa0MsUUFBUSxTQUFTLE1BQUksQ0FBQzBDLElBQUwsQ0FBVUosT0FBVixFQUFtQixPQUFuQixFQUE0QjtBQUNqRHVELFFBQUFBLFFBQVEsRUFBR3pDLEdBQUQsSUFBUyxNQUFJLENBQUNGLG9CQUFMLENBQTBCQyxJQUExQixFQUFnQ0MsR0FBaEMsSUFBdUMsTUFBSSxDQUFDUyxhQUFMLENBQW1CVixJQUFuQixFQUF5QjtBQUFFQyxVQUFBQTtBQUFGLFNBQXpCLENBQXZDLEdBQTJFMUIsT0FBTyxDQUFDQyxPQUFSO0FBRDdDLE9BQTVCLENBQXZCO0FBR0EsYUFBTywrQkFBVzNCLFFBQVgsQ0FBUDtBQU4wRTtBQU8zRTtBQUVEOzs7Ozs7Ozs7Ozs7O0FBV004RixFQUFBQSxNQUFOLENBQWMzQyxJQUFkLEVBQW9CVyxLQUFwQixFQUEyQmhHLE9BQU8sR0FBRyxFQUFyQyxFQUF5QztBQUFBOztBQUFBO0FBQ3ZDLE1BQUEsT0FBSSxDQUFDbUQsTUFBTCxDQUFZSyxLQUFaLENBQWtCLGNBQWxCLEVBQWtDNkIsSUFBbEMsRUFBd0MsS0FBeEM7O0FBQ0EsWUFBTWIsT0FBTyxHQUFHLHdDQUFtQndCLEtBQW5CLEVBQTBCaEcsT0FBMUIsQ0FBaEI7QUFDQSxZQUFNa0MsUUFBUSxTQUFTLE9BQUksQ0FBQzBDLElBQUwsQ0FBVUosT0FBVixFQUFtQixRQUFuQixFQUE2QjtBQUNsRHVELFFBQUFBLFFBQVEsRUFBR3pDLEdBQUQsSUFBUyxPQUFJLENBQUNGLG9CQUFMLENBQTBCQyxJQUExQixFQUFnQ0MsR0FBaEMsSUFBdUMsT0FBSSxDQUFDUyxhQUFMLENBQW1CVixJQUFuQixFQUF5QjtBQUFFQyxVQUFBQTtBQUFGLFNBQXpCLENBQXZDLEdBQTJFMUIsT0FBTyxDQUFDQyxPQUFSO0FBRDVDLE9BQTdCLENBQXZCO0FBR0EsYUFBTyxnQ0FBWTNCLFFBQVosQ0FBUDtBQU51QztBQU94QztBQUVEOzs7Ozs7Ozs7Ozs7OztBQVlBK0YsRUFBQUEsUUFBUSxDQUFFNUMsSUFBRixFQUFRdUMsUUFBUixFQUFrQlYsS0FBbEIsRUFBeUJsSCxPQUF6QixFQUFrQztBQUN4QyxRQUFJa0ksR0FBRyxHQUFHLEVBQVY7QUFDQSxRQUFJckQsSUFBSSxHQUFHLEVBQVg7O0FBRUEsUUFBSXNELEtBQUssQ0FBQ0MsT0FBTixDQUFjbEIsS0FBZCxLQUF3QixPQUFPQSxLQUFQLEtBQWlCLFFBQTdDLEVBQXVEO0FBQ3JEckMsTUFBQUEsSUFBSSxHQUFHLEdBQUd3RCxNQUFILENBQVVuQixLQUFLLElBQUksRUFBbkIsQ0FBUDtBQUNBZ0IsTUFBQUEsR0FBRyxHQUFHLEVBQU47QUFDRCxLQUhELE1BR08sSUFBSWhCLEtBQUssQ0FBQ29CLEdBQVYsRUFBZTtBQUNwQnpELE1BQUFBLElBQUksR0FBRyxHQUFHd0QsTUFBSCxDQUFVbkIsS0FBSyxDQUFDb0IsR0FBTixJQUFhLEVBQXZCLENBQVA7QUFDQUosTUFBQUEsR0FBRyxHQUFHLEdBQU47QUFDRCxLQUhNLE1BR0EsSUFBSWhCLEtBQUssQ0FBQ3FCLEdBQVYsRUFBZTtBQUNwQkwsTUFBQUEsR0FBRyxHQUFHLEVBQU47QUFDQXJELE1BQUFBLElBQUksR0FBRyxHQUFHd0QsTUFBSCxDQUFVbkIsS0FBSyxDQUFDcUIsR0FBTixJQUFhLEVBQXZCLENBQVA7QUFDRCxLQUhNLE1BR0EsSUFBSXJCLEtBQUssQ0FBQ3NCLE1BQVYsRUFBa0I7QUFDdkJOLE1BQUFBLEdBQUcsR0FBRyxHQUFOO0FBQ0FyRCxNQUFBQSxJQUFJLEdBQUcsR0FBR3dELE1BQUgsQ0FBVW5CLEtBQUssQ0FBQ3NCLE1BQU4sSUFBZ0IsRUFBMUIsQ0FBUDtBQUNEOztBQUVELFNBQUtyRixNQUFMLENBQVlLLEtBQVosQ0FBa0Isa0JBQWxCLEVBQXNDb0UsUUFBdEMsRUFBZ0QsSUFBaEQsRUFBc0R2QyxJQUF0RCxFQUE0RCxLQUE1RDtBQUNBLFdBQU8sS0FBS29ELEtBQUwsQ0FBV3BELElBQVgsRUFBaUJ1QyxRQUFqQixFQUEyQk0sR0FBRyxHQUFHLE9BQWpDLEVBQTBDckQsSUFBMUMsRUFBZ0Q3RSxPQUFoRCxDQUFQO0FBQ0Q7QUFFRDs7Ozs7Ozs7Ozs7Ozs7O0FBYU15SSxFQUFBQSxLQUFOLENBQWFwRCxJQUFiLEVBQW1CdUMsUUFBbkIsRUFBNkJjLE1BQTdCLEVBQXFDeEIsS0FBckMsRUFBNENsSCxPQUFPLEdBQUcsRUFBdEQsRUFBMEQ7QUFBQTs7QUFBQTtBQUN4RCxZQUFNd0UsT0FBTyxHQUFHLHVDQUFrQm9ELFFBQWxCLEVBQTRCYyxNQUE1QixFQUFvQ3hCLEtBQXBDLEVBQTJDbEgsT0FBM0MsQ0FBaEI7QUFDQSxZQUFNa0MsUUFBUSxTQUFTLE9BQUksQ0FBQzBDLElBQUwsQ0FBVUosT0FBVixFQUFtQixPQUFuQixFQUE0QjtBQUNqRHVELFFBQUFBLFFBQVEsRUFBR3pDLEdBQUQsSUFBUyxPQUFJLENBQUNGLG9CQUFMLENBQTBCQyxJQUExQixFQUFnQ0MsR0FBaEMsSUFBdUMsT0FBSSxDQUFDUyxhQUFMLENBQW1CVixJQUFuQixFQUF5QjtBQUFFQyxVQUFBQTtBQUFGLFNBQXpCLENBQXZDLEdBQTJFMUIsT0FBTyxDQUFDQyxPQUFSO0FBRDdDLE9BQTVCLENBQXZCO0FBR0EsYUFBTywrQkFBVzNCLFFBQVgsQ0FBUDtBQUx3RDtBQU16RDtBQUVEOzs7Ozs7Ozs7Ozs7O0FBV0F5RyxFQUFBQSxNQUFNLENBQUVDLFdBQUYsRUFBZXZGLE9BQWYsRUFBd0JyRCxPQUFPLEdBQUcsRUFBbEMsRUFBc0M7QUFDMUMsUUFBSWtILEtBQUssR0FBRyxtQkFBTyxDQUFDLFFBQUQsQ0FBUCxFQUFtQixPQUFuQixFQUE0QmxILE9BQTVCLEVBQXFDOEUsR0FBckMsQ0FBeUNnQixLQUFLLEtBQUs7QUFBRUQsTUFBQUEsSUFBSSxFQUFFLE1BQVI7QUFBZ0JDLE1BQUFBO0FBQWhCLEtBQUwsQ0FBOUMsQ0FBWjtBQUNBLFFBQUl0QixPQUFPLEdBQUc7QUFDWkEsTUFBQUEsT0FBTyxFQUFFLFFBREc7QUFFWkMsTUFBQUEsVUFBVSxFQUFFLENBQ1Y7QUFBRW9CLFFBQUFBLElBQUksRUFBRSxNQUFSO0FBQWdCQyxRQUFBQSxLQUFLLEVBQUU4QztBQUF2QixPQURVLEVBRVYxQixLQUZVLEVBR1Y7QUFBRXJCLFFBQUFBLElBQUksRUFBRSxTQUFSO0FBQW1CQyxRQUFBQSxLQUFLLEVBQUV6QztBQUExQixPQUhVO0FBRkEsS0FBZDtBQVNBLFNBQUtGLE1BQUwsQ0FBWUssS0FBWixDQUFrQixzQkFBbEIsRUFBMENvRixXQUExQyxFQUF1RCxLQUF2RDtBQUNBLFdBQU8sS0FBS2hFLElBQUwsQ0FBVUosT0FBVixDQUFQO0FBQ0Q7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBbUJNcUUsRUFBQUEsY0FBTixDQUFzQnhELElBQXRCLEVBQTRCdUMsUUFBNUIsRUFBc0M1SCxPQUFPLEdBQUcsRUFBaEQsRUFBb0Q7QUFBQTs7QUFBQTtBQUNsRDtBQUNBLE1BQUEsT0FBSSxDQUFDbUQsTUFBTCxDQUFZSyxLQUFaLENBQWtCLG1CQUFsQixFQUF1Q29FLFFBQXZDLEVBQWlELElBQWpELEVBQXVEdkMsSUFBdkQsRUFBNkQsS0FBN0Q7O0FBQ0EsWUFBTXlELFVBQVUsR0FBRzlJLE9BQU8sQ0FBQytJLEtBQVIsSUFBaUIsT0FBSSxDQUFDbEksV0FBTCxDQUFpQjBELE9BQWpCLENBQXlCLFNBQXpCLEtBQXVDLENBQTNFO0FBQ0EsWUFBTXlFLGlCQUFpQixHQUFHO0FBQUV4RSxRQUFBQSxPQUFPLEVBQUUsYUFBWDtBQUEwQkMsUUFBQUEsVUFBVSxFQUFFLENBQUM7QUFBRW9CLFVBQUFBLElBQUksRUFBRSxVQUFSO0FBQW9CQyxVQUFBQSxLQUFLLEVBQUU4QjtBQUEzQixTQUFEO0FBQXRDLE9BQTFCO0FBQ0EsWUFBTSxPQUFJLENBQUNLLFFBQUwsQ0FBYzVDLElBQWQsRUFBb0J1QyxRQUFwQixFQUE4QjtBQUFFVSxRQUFBQSxHQUFHLEVBQUU7QUFBUCxPQUE5QixFQUFvRHRJLE9BQXBELENBQU47QUFDQSxZQUFNaUosR0FBRyxHQUFHSCxVQUFVLEdBQUdFLGlCQUFILEdBQXVCLFNBQTdDO0FBQ0EsYUFBTyxPQUFJLENBQUNwRSxJQUFMLENBQVVxRSxHQUFWLEVBQWUsSUFBZixFQUFxQjtBQUMxQmxCLFFBQUFBLFFBQVEsRUFBR3pDLEdBQUQsSUFBUyxPQUFJLENBQUNGLG9CQUFMLENBQTBCQyxJQUExQixFQUFnQ0MsR0FBaEMsSUFBdUMsT0FBSSxDQUFDUyxhQUFMLENBQW1CVixJQUFuQixFQUF5QjtBQUFFQyxVQUFBQTtBQUFGLFNBQXpCLENBQXZDLEdBQTJFMUIsT0FBTyxDQUFDQyxPQUFSO0FBRHBFLE9BQXJCLENBQVA7QUFQa0Q7QUFVbkQ7QUFFRDs7Ozs7Ozs7Ozs7Ozs7OztBQWNNcUYsRUFBQUEsWUFBTixDQUFvQjdELElBQXBCLEVBQTBCdUMsUUFBMUIsRUFBb0NnQixXQUFwQyxFQUFpRDVJLE9BQU8sR0FBRyxFQUEzRCxFQUErRDtBQUFBOztBQUFBO0FBQzdELE1BQUEsT0FBSSxDQUFDbUQsTUFBTCxDQUFZSyxLQUFaLENBQWtCLGtCQUFsQixFQUFzQ29FLFFBQXRDLEVBQWdELE1BQWhELEVBQXdEdkMsSUFBeEQsRUFBOEQsSUFBOUQsRUFBb0V1RCxXQUFwRSxFQUFpRixLQUFqRjs7QUFDQSxZQUFNO0FBQUVPLFFBQUFBO0FBQUYsZ0JBQTBCLE9BQUksQ0FBQ3ZFLElBQUwsQ0FBVTtBQUN4Q0osUUFBQUEsT0FBTyxFQUFFeEUsT0FBTyxDQUFDK0ksS0FBUixHQUFnQixVQUFoQixHQUE2QixNQURFO0FBRXhDdEUsUUFBQUEsVUFBVSxFQUFFLENBQ1Y7QUFBRW9CLFVBQUFBLElBQUksRUFBRSxVQUFSO0FBQW9CQyxVQUFBQSxLQUFLLEVBQUU4QjtBQUEzQixTQURVLEVBRVY7QUFBRS9CLFVBQUFBLElBQUksRUFBRSxNQUFSO0FBQWdCQyxVQUFBQSxLQUFLLEVBQUU4QztBQUF2QixTQUZVO0FBRjRCLE9BQVYsRUFNN0IsSUFONkIsRUFNdkI7QUFDUGIsUUFBQUEsUUFBUSxFQUFHekMsR0FBRCxJQUFTLE9BQUksQ0FBQ0Ysb0JBQUwsQ0FBMEJDLElBQTFCLEVBQWdDQyxHQUFoQyxJQUF1QyxPQUFJLENBQUNTLGFBQUwsQ0FBbUJWLElBQW5CLEVBQXlCO0FBQUVDLFVBQUFBO0FBQUYsU0FBekIsQ0FBdkMsR0FBMkUxQixPQUFPLENBQUNDLE9BQVI7QUFEdkYsT0FOdUIsQ0FBaEM7QUFTQSxhQUFPc0YsYUFBYSxJQUFJLGdCQUF4QjtBQVg2RDtBQVk5RDtBQUVEOzs7Ozs7Ozs7Ozs7Ozs7O0FBY01DLEVBQUFBLFlBQU4sQ0FBb0IvRCxJQUFwQixFQUEwQnVDLFFBQTFCLEVBQW9DZ0IsV0FBcEMsRUFBaUQ1SSxPQUFPLEdBQUcsRUFBM0QsRUFBK0Q7QUFBQTs7QUFBQTtBQUM3RCxNQUFBLE9BQUksQ0FBQ21ELE1BQUwsQ0FBWUssS0FBWixDQUFrQixpQkFBbEIsRUFBcUNvRSxRQUFyQyxFQUErQyxNQUEvQyxFQUF1RHZDLElBQXZELEVBQTZELElBQTdELEVBQW1FdUQsV0FBbkUsRUFBZ0YsS0FBaEY7O0FBRUEsVUFBSSxPQUFJLENBQUMvSCxXQUFMLENBQWlCMEQsT0FBakIsQ0FBeUIsTUFBekIsTUFBcUMsQ0FBQyxDQUExQyxFQUE2QztBQUMzQztBQUNBLGNBQU0sT0FBSSxDQUFDMkUsWUFBTCxDQUFrQjdELElBQWxCLEVBQXdCdUMsUUFBeEIsRUFBa0NnQixXQUFsQyxFQUErQzVJLE9BQS9DLENBQU47QUFDQSxlQUFPLE9BQUksQ0FBQzZJLGNBQUwsQ0FBb0J4RCxJQUFwQixFQUEwQnVDLFFBQTFCLEVBQW9DNUgsT0FBcEMsQ0FBUDtBQUNELE9BUDRELENBUzdEOzs7QUFDQSxhQUFPLE9BQUksQ0FBQzRFLElBQUwsQ0FBVTtBQUNmSixRQUFBQSxPQUFPLEVBQUV4RSxPQUFPLENBQUMrSSxLQUFSLEdBQWdCLFVBQWhCLEdBQTZCLE1BRHZCO0FBRWZ0RSxRQUFBQSxVQUFVLEVBQUUsQ0FDVjtBQUFFb0IsVUFBQUEsSUFBSSxFQUFFLFVBQVI7QUFBb0JDLFVBQUFBLEtBQUssRUFBRThCO0FBQTNCLFNBRFUsRUFFVjtBQUFFL0IsVUFBQUEsSUFBSSxFQUFFLE1BQVI7QUFBZ0JDLFVBQUFBLEtBQUssRUFBRThDO0FBQXZCLFNBRlU7QUFGRyxPQUFWLEVBTUosQ0FBQyxJQUFELENBTkksRUFNSTtBQUNUYixRQUFBQSxRQUFRLEVBQUd6QyxHQUFELElBQVMsT0FBSSxDQUFDRixvQkFBTCxDQUEwQkMsSUFBMUIsRUFBZ0NDLEdBQWhDLElBQXVDLE9BQUksQ0FBQ1MsYUFBTCxDQUFtQlYsSUFBbkIsRUFBeUI7QUFBRUMsVUFBQUE7QUFBRixTQUF6QixDQUF2QyxHQUEyRTFCLE9BQU8sQ0FBQ0MsT0FBUjtBQURyRixPQU5KLENBQVA7QUFWNkQ7QUFtQjlEO0FBRUQ7Ozs7Ozs7O0FBTU1OLEVBQUFBLGtCQUFOLEdBQTRCO0FBQUE7O0FBQUE7QUFDMUIsVUFBSSxDQUFDLE9BQUksQ0FBQ3RDLGtCQUFOLElBQTRCLE9BQUksQ0FBQ0osV0FBTCxDQUFpQjBELE9BQWpCLENBQXlCLGtCQUF6QixJQUErQyxDQUEzRSxJQUFnRixPQUFJLENBQUM5QyxNQUFMLENBQVk0SCxVQUFoRyxFQUE0RztBQUMxRyxlQUFPLEtBQVA7QUFDRDs7QUFFRCxNQUFBLE9BQUksQ0FBQ2xHLE1BQUwsQ0FBWUssS0FBWixDQUFrQix5QkFBbEI7O0FBQ0EsWUFBTSxPQUFJLENBQUNvQixJQUFMLENBQVU7QUFDZEosUUFBQUEsT0FBTyxFQUFFLFVBREs7QUFFZEMsUUFBQUEsVUFBVSxFQUFFLENBQUM7QUFDWG9CLFVBQUFBLElBQUksRUFBRSxNQURLO0FBRVhDLFVBQUFBLEtBQUssRUFBRTtBQUZJLFNBQUQ7QUFGRSxPQUFWLENBQU47O0FBT0EsTUFBQSxPQUFJLENBQUNyRSxNQUFMLENBQVlQLGlCQUFaOztBQUNBLE1BQUEsT0FBSSxDQUFDaUMsTUFBTCxDQUFZSyxLQUFaLENBQWtCLDhEQUFsQjtBQWQwQjtBQWUzQjtBQUVEOzs7Ozs7Ozs7Ozs7OztBQVlNRixFQUFBQSxLQUFOLENBQWFsQyxJQUFiLEVBQW1CO0FBQUE7O0FBQUE7QUFDakIsVUFBSW9ELE9BQUo7QUFDQSxVQUFJeEUsT0FBTyxHQUFHLEVBQWQ7O0FBRUEsVUFBSSxDQUFDb0IsSUFBTCxFQUFXO0FBQ1QsY0FBTSxJQUFJNkMsS0FBSixDQUFVLHlDQUFWLENBQU47QUFDRDs7QUFFRCxVQUFJLE9BQUksQ0FBQ3BELFdBQUwsQ0FBaUIwRCxPQUFqQixDQUF5QixjQUF6QixLQUE0QyxDQUE1QyxJQUFpRG5ELElBQWpELElBQXlEQSxJQUFJLENBQUNrSSxPQUFsRSxFQUEyRTtBQUN6RTlFLFFBQUFBLE9BQU8sR0FBRztBQUNSQSxVQUFBQSxPQUFPLEVBQUUsY0FERDtBQUVSQyxVQUFBQSxVQUFVLEVBQUUsQ0FDVjtBQUFFb0IsWUFBQUEsSUFBSSxFQUFFLE1BQVI7QUFBZ0JDLFlBQUFBLEtBQUssRUFBRTtBQUF2QixXQURVLEVBRVY7QUFBRUQsWUFBQUEsSUFBSSxFQUFFLE1BQVI7QUFBZ0JDLFlBQUFBLEtBQUssRUFBRSx1Q0FBa0IxRSxJQUFJLENBQUNtSSxJQUF2QixFQUE2Qm5JLElBQUksQ0FBQ2tJLE9BQWxDLENBQXZCO0FBQW1FRSxZQUFBQSxTQUFTLEVBQUU7QUFBOUUsV0FGVTtBQUZKLFNBQVY7QUFRQXhKLFFBQUFBLE9BQU8sQ0FBQ3lKLDZCQUFSLEdBQXdDLElBQXhDLENBVHlFLENBUzVCO0FBQzlDLE9BVkQsTUFVTztBQUNMakYsUUFBQUEsT0FBTyxHQUFHO0FBQ1JBLFVBQUFBLE9BQU8sRUFBRSxPQUREO0FBRVJDLFVBQUFBLFVBQVUsRUFBRSxDQUNWO0FBQUVvQixZQUFBQSxJQUFJLEVBQUUsUUFBUjtBQUFrQkMsWUFBQUEsS0FBSyxFQUFFMUUsSUFBSSxDQUFDbUksSUFBTCxJQUFhO0FBQXRDLFdBRFUsRUFFVjtBQUFFMUQsWUFBQUEsSUFBSSxFQUFFLFFBQVI7QUFBa0JDLFlBQUFBLEtBQUssRUFBRTFFLElBQUksQ0FBQ3NJLElBQUwsSUFBYSxFQUF0QztBQUEwQ0YsWUFBQUEsU0FBUyxFQUFFO0FBQXJELFdBRlU7QUFGSixTQUFWO0FBT0Q7O0FBRUQsTUFBQSxPQUFJLENBQUNyRyxNQUFMLENBQVlLLEtBQVosQ0FBa0IsZUFBbEI7O0FBQ0EsWUFBTXRCLFFBQVEsU0FBUyxPQUFJLENBQUMwQyxJQUFMLENBQVVKLE9BQVYsRUFBbUIsWUFBbkIsRUFBaUN4RSxPQUFqQyxDQUF2QjtBQUNBOzs7Ozs7O0FBTUEsVUFBSWtDLFFBQVEsQ0FBQ3lILFVBQVQsSUFBdUJ6SCxRQUFRLENBQUN5SCxVQUFULENBQW9CN0MsTUFBL0MsRUFBdUQ7QUFDckQ7QUFDQSxRQUFBLE9BQUksQ0FBQ2pHLFdBQUwsR0FBbUJxQixRQUFRLENBQUN5SCxVQUE1QjtBQUNELE9BSEQsTUFHTyxJQUFJekgsUUFBUSxDQUFDMEgsT0FBVCxJQUFvQjFILFFBQVEsQ0FBQzBILE9BQVQsQ0FBaUJDLFVBQXJDLElBQW1EM0gsUUFBUSxDQUFDMEgsT0FBVCxDQUFpQkMsVUFBakIsQ0FBNEIvQyxNQUFuRixFQUEyRjtBQUNoRztBQUNBLFFBQUEsT0FBSSxDQUFDakcsV0FBTCxHQUFtQnFCLFFBQVEsQ0FBQzBILE9BQVQsQ0FBaUJDLFVBQWpCLENBQTRCQyxHQUE1QixHQUFrQ3JGLFVBQWxDLENBQTZDSyxHQUE3QyxDQUFpRCxDQUFDaUYsSUFBSSxHQUFHLEVBQVIsS0FBZUEsSUFBSSxDQUFDakUsS0FBTCxDQUFXa0UsV0FBWCxHQUF5QkMsSUFBekIsRUFBaEUsQ0FBbkI7QUFDRCxPQUhNLE1BR0E7QUFDTDtBQUNBLGNBQU0sT0FBSSxDQUFDakgsZ0JBQUwsQ0FBc0IsSUFBdEIsQ0FBTjtBQUNEOztBQUVELE1BQUEsT0FBSSxDQUFDRCxZQUFMLENBQWtCeEQsbUJBQWxCOztBQUNBLE1BQUEsT0FBSSxDQUFDcUIsY0FBTCxHQUFzQixJQUF0Qjs7QUFDQSxNQUFBLE9BQUksQ0FBQ3VDLE1BQUwsQ0FBWUssS0FBWixDQUFrQixrREFBbEIsRUFBc0UsT0FBSSxDQUFDM0MsV0FBM0U7QUFqRGlCO0FBa0RsQjtBQUVEOzs7Ozs7OztBQU1NK0QsRUFBQUEsSUFBTixDQUFZYSxPQUFaLEVBQXFCeUUsY0FBckIsRUFBcUNsSyxPQUFyQyxFQUE4QztBQUFBOztBQUFBO0FBQzVDLE1BQUEsT0FBSSxDQUFDbUssU0FBTDs7QUFDQSxZQUFNakksUUFBUSxTQUFTLE9BQUksQ0FBQ1QsTUFBTCxDQUFZMkksY0FBWixDQUEyQjNFLE9BQTNCLEVBQW9DeUUsY0FBcEMsRUFBb0RsSyxPQUFwRCxDQUF2Qjs7QUFDQSxVQUFJa0MsUUFBUSxJQUFJQSxRQUFRLENBQUN5SCxVQUF6QixFQUFxQztBQUNuQyxRQUFBLE9BQUksQ0FBQzlJLFdBQUwsR0FBbUJxQixRQUFRLENBQUN5SCxVQUE1QjtBQUNEOztBQUNELGFBQU96SCxRQUFQO0FBTjRDO0FBTzdDO0FBRUQ7Ozs7Ozs7O0FBTUFtSSxFQUFBQSxTQUFTLEdBQUk7QUFDWCxRQUFJLEtBQUt0SixZQUFULEVBQXVCO0FBQ3JCO0FBQ0Q7O0FBQ0QsU0FBS0EsWUFBTCxHQUFvQixLQUFLRixXQUFMLENBQWlCMEQsT0FBakIsQ0FBeUIsTUFBekIsS0FBb0MsQ0FBcEMsR0FBd0MsTUFBeEMsR0FBaUQsTUFBckU7QUFDQSxTQUFLcEIsTUFBTCxDQUFZSyxLQUFaLENBQWtCLHdCQUF3QixLQUFLekMsWUFBL0M7O0FBRUEsUUFBSSxLQUFLQSxZQUFMLEtBQXNCLE1BQTFCLEVBQWtDO0FBQ2hDLFdBQUtDLFlBQUwsR0FBb0JnRCxVQUFVLENBQUMsTUFBTTtBQUNuQyxhQUFLYixNQUFMLENBQVlLLEtBQVosQ0FBa0IsY0FBbEI7QUFDQSxhQUFLb0IsSUFBTCxDQUFVLE1BQVY7QUFDRCxPQUg2QixFQUczQixLQUFLMUUsV0FIc0IsQ0FBOUI7QUFJRCxLQUxELE1BS08sSUFBSSxLQUFLYSxZQUFMLEtBQXNCLE1BQTFCLEVBQWtDO0FBQ3ZDLFdBQUtVLE1BQUwsQ0FBWTJJLGNBQVosQ0FBMkI7QUFDekI1RixRQUFBQSxPQUFPLEVBQUU7QUFEZ0IsT0FBM0I7QUFHQSxXQUFLeEQsWUFBTCxHQUFvQmdELFVBQVUsQ0FBQyxNQUFNO0FBQ25DLGFBQUt2QyxNQUFMLENBQVk2SSxJQUFaLENBQWlCLFVBQWpCO0FBQ0EsYUFBS3ZKLFlBQUwsR0FBb0IsS0FBcEI7QUFDQSxhQUFLb0MsTUFBTCxDQUFZSyxLQUFaLENBQWtCLGlCQUFsQjtBQUNELE9BSjZCLEVBSTNCLEtBQUtyRCxXQUpzQixDQUE5QjtBQUtEO0FBQ0Y7QUFFRDs7Ozs7QUFHQWdLLEVBQUFBLFNBQVMsR0FBSTtBQUNYLFFBQUksQ0FBQyxLQUFLcEosWUFBVixFQUF3QjtBQUN0QjtBQUNEOztBQUVENkIsSUFBQUEsWUFBWSxDQUFDLEtBQUs1QixZQUFOLENBQVo7O0FBQ0EsUUFBSSxLQUFLRCxZQUFMLEtBQXNCLE1BQTFCLEVBQWtDO0FBQ2hDLFdBQUtVLE1BQUwsQ0FBWTZJLElBQVosQ0FBaUIsVUFBakI7QUFDQSxXQUFLbkgsTUFBTCxDQUFZSyxLQUFaLENBQWtCLGlCQUFsQjtBQUNEOztBQUNELFNBQUt6QyxZQUFMLEdBQW9CLEtBQXBCO0FBQ0Q7QUFFRDs7Ozs7Ozs7OztBQVFNa0MsRUFBQUEsaUJBQU4sR0FBMkI7QUFBQTs7QUFBQTtBQUN6QjtBQUNBLFVBQUksT0FBSSxDQUFDeEIsTUFBTCxDQUFZOEksVUFBaEIsRUFBNEI7QUFDMUIsZUFBTyxLQUFQO0FBQ0QsT0FKd0IsQ0FNekI7OztBQUNBLFVBQUksQ0FBQyxPQUFJLENBQUMxSixXQUFMLENBQWlCMEQsT0FBakIsQ0FBeUIsVUFBekIsSUFBdUMsQ0FBdkMsSUFBNEMsT0FBSSxDQUFDaEQsVUFBbEQsS0FBaUUsQ0FBQyxPQUFJLENBQUNGLFdBQTNFLEVBQXdGO0FBQ3RGLGVBQU8sS0FBUDtBQUNEOztBQUVELE1BQUEsT0FBSSxDQUFDOEIsTUFBTCxDQUFZSyxLQUFaLENBQWtCLDBCQUFsQjs7QUFDQSxZQUFNLE9BQUksQ0FBQ29CLElBQUwsQ0FBVSxVQUFWLENBQU47QUFDQSxNQUFBLE9BQUksQ0FBQy9ELFdBQUwsR0FBbUIsRUFBbkI7O0FBQ0EsTUFBQSxPQUFJLENBQUNZLE1BQUwsQ0FBWStJLE9BQVo7O0FBQ0EsYUFBTyxPQUFJLENBQUN4SCxnQkFBTCxFQUFQO0FBZnlCO0FBZ0IxQjtBQUVEOzs7Ozs7Ozs7Ozs7O0FBV01BLEVBQUFBLGdCQUFOLENBQXdCeUgsTUFBeEIsRUFBZ0M7QUFBQTs7QUFBQTtBQUM5QjtBQUNBLFVBQUksQ0FBQ0EsTUFBRCxJQUFXLE9BQUksQ0FBQzVKLFdBQUwsQ0FBaUJpRyxNQUFoQyxFQUF3QztBQUN0QztBQUNELE9BSjZCLENBTTlCO0FBQ0E7OztBQUNBLFVBQUksQ0FBQyxPQUFJLENBQUNyRixNQUFMLENBQVk4SSxVQUFiLElBQTJCLE9BQUksQ0FBQ2xKLFdBQXBDLEVBQWlEO0FBQy9DO0FBQ0Q7O0FBRUQsTUFBQSxPQUFJLENBQUM4QixNQUFMLENBQVlLLEtBQVosQ0FBa0Isd0JBQWxCOztBQUNBLGFBQU8sT0FBSSxDQUFDb0IsSUFBTCxDQUFVLFlBQVYsQ0FBUDtBQWI4QjtBQWMvQjs7QUFFRDhGLEVBQUFBLGFBQWEsQ0FBRVgsSUFBSSxHQUFHLEVBQVQsRUFBYTtBQUN4QixXQUFPLEtBQUtsSixXQUFMLENBQWlCMEQsT0FBakIsQ0FBeUJ3RixJQUFJLENBQUNDLFdBQUwsR0FBbUJDLElBQW5CLEVBQXpCLEtBQXVELENBQTlEO0FBQ0QsR0EvdUJ5QixDQWl2QjFCOztBQUVBOzs7Ozs7OztBQU1BN0gsRUFBQUEsa0JBQWtCLENBQUVGLFFBQUYsRUFBWTtBQUM1QixRQUFJQSxRQUFRLElBQUlBLFFBQVEsQ0FBQ3lILFVBQXpCLEVBQXFDO0FBQ25DLFdBQUs5SSxXQUFMLEdBQW1CcUIsUUFBUSxDQUFDeUgsVUFBNUI7QUFDRDtBQUNGO0FBRUQ7Ozs7Ozs7O0FBTUF4SCxFQUFBQSwwQkFBMEIsQ0FBRUQsUUFBRixFQUFZO0FBQ3BDLFNBQUtyQixXQUFMLEdBQW1CLGlCQUNqQixtQkFBTyxFQUFQLEVBQVcsWUFBWCxDQURpQixFQUVqQixnQkFBSSxDQUFDO0FBQUVpRixNQUFBQTtBQUFGLEtBQUQsS0FBZSxDQUFDQSxLQUFLLElBQUksRUFBVixFQUFja0UsV0FBZCxHQUE0QkMsSUFBNUIsRUFBbkIsQ0FGaUIsRUFHakIvSCxRQUhpQixDQUFuQjtBQUlEO0FBRUQ7Ozs7Ozs7O0FBTUFHLEVBQUFBLHNCQUFzQixDQUFFSCxRQUFGLEVBQVk7QUFDaEMsUUFBSUEsUUFBUSxJQUFJQSxRQUFRLENBQUN5SSxjQUFULENBQXdCLElBQXhCLENBQWhCLEVBQStDO0FBQzdDLFdBQUtySyxRQUFMLElBQWlCLEtBQUtBLFFBQUwsQ0FBYyxLQUFLUSxnQkFBbkIsRUFBcUMsUUFBckMsRUFBK0NvQixRQUFRLENBQUMwSSxFQUF4RCxDQUFqQjtBQUNEO0FBQ0Y7QUFFRDs7Ozs7Ozs7QUFNQXRJLEVBQUFBLHVCQUF1QixDQUFFSixRQUFGLEVBQVk7QUFDakMsUUFBSUEsUUFBUSxJQUFJQSxRQUFRLENBQUN5SSxjQUFULENBQXdCLElBQXhCLENBQWhCLEVBQStDO0FBQzdDLFdBQUtySyxRQUFMLElBQWlCLEtBQUtBLFFBQUwsQ0FBYyxLQUFLUSxnQkFBbkIsRUFBcUMsU0FBckMsRUFBZ0RvQixRQUFRLENBQUMwSSxFQUF6RCxDQUFqQjtBQUNEO0FBQ0Y7QUFFRDs7Ozs7Ozs7QUFNQXJJLEVBQUFBLHFCQUFxQixDQUFFTCxRQUFGLEVBQVk7QUFDL0IsU0FBSzVCLFFBQUwsSUFBaUIsS0FBS0EsUUFBTCxDQUFjLEtBQUtRLGdCQUFuQixFQUFxQyxPQUFyQyxFQUE4QyxHQUFHdUgsTUFBSCxDQUFVLCtCQUFXO0FBQUV1QixNQUFBQSxPQUFPLEVBQUU7QUFBRWlCLFFBQUFBLEtBQUssRUFBRSxDQUFDM0ksUUFBRDtBQUFUO0FBQVgsS0FBWCxLQUFrRCxFQUE1RCxFQUFnRTRJLEtBQWhFLEVBQTlDLENBQWpCO0FBQ0QsR0E1eUJ5QixDQTh5QjFCOztBQUVBOzs7Ozs7QUFJQTlJLEVBQUFBLE9BQU8sR0FBSTtBQUNULFFBQUksQ0FBQyxLQUFLcEIsY0FBTixJQUF3QixLQUFLRyxZQUFqQyxFQUErQztBQUM3QztBQUNBO0FBQ0Q7O0FBRUQsU0FBS29DLE1BQUwsQ0FBWUssS0FBWixDQUFrQix1QkFBbEI7QUFDQSxTQUFLNkcsU0FBTDtBQUNEO0FBRUQ7Ozs7Ozs7QUFLQXRILEVBQUFBLFlBQVksQ0FBRWdJLFFBQUYsRUFBWTtBQUN0QixRQUFJQSxRQUFRLEtBQUssS0FBS3BLLE1BQXRCLEVBQThCO0FBQzVCO0FBQ0Q7O0FBRUQsU0FBS3dDLE1BQUwsQ0FBWUssS0FBWixDQUFrQixxQkFBcUJ1SCxRQUF2QyxFQUxzQixDQU90Qjs7QUFDQSxRQUFJLEtBQUtwSyxNQUFMLEtBQWdCbkIsY0FBaEIsSUFBa0MsS0FBS3NCLGdCQUEzQyxFQUE2RDtBQUMzRCxXQUFLTixjQUFMLElBQXVCLEtBQUtBLGNBQUwsQ0FBb0IsS0FBS00sZ0JBQXpCLENBQXZCO0FBQ0EsV0FBS0EsZ0JBQUwsR0FBd0IsS0FBeEI7QUFDRDs7QUFFRCxTQUFLSCxNQUFMLEdBQWNvSyxRQUFkO0FBQ0Q7QUFFRDs7Ozs7Ozs7OztBQVFBOUQsRUFBQUEsV0FBVyxDQUFFVixJQUFGLEVBQVFsQixJQUFSLEVBQWMyRixTQUFkLEVBQXlCO0FBQ2xDLFVBQU1DLEtBQUssR0FBRzVGLElBQUksQ0FBQzZGLEtBQUwsQ0FBV0YsU0FBWCxDQUFkO0FBQ0EsUUFBSWhFLE1BQU0sR0FBR1QsSUFBYjs7QUFFQSxTQUFLLElBQUlwQixDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHOEYsS0FBSyxDQUFDbkUsTUFBMUIsRUFBa0MzQixDQUFDLEVBQW5DLEVBQXVDO0FBQ3JDLFVBQUlnRyxLQUFLLEdBQUcsS0FBWjs7QUFDQSxXQUFLLElBQUlDLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUdwRSxNQUFNLENBQUNQLFFBQVAsQ0FBZ0JLLE1BQXBDLEVBQTRDc0UsQ0FBQyxFQUE3QyxFQUFpRDtBQUMvQyxZQUFJLEtBQUtDLG9CQUFMLENBQTBCckUsTUFBTSxDQUFDUCxRQUFQLENBQWdCMkUsQ0FBaEIsRUFBbUJ6TCxJQUE3QyxFQUFtRCw0QkFBV3NMLEtBQUssQ0FBQzlGLENBQUQsQ0FBaEIsQ0FBbkQsQ0FBSixFQUE4RTtBQUM1RTZCLFVBQUFBLE1BQU0sR0FBR0EsTUFBTSxDQUFDUCxRQUFQLENBQWdCMkUsQ0FBaEIsQ0FBVDtBQUNBRCxVQUFBQSxLQUFLLEdBQUcsSUFBUjtBQUNBO0FBQ0Q7QUFDRjs7QUFDRCxVQUFJLENBQUNBLEtBQUwsRUFBWTtBQUNWbkUsUUFBQUEsTUFBTSxDQUFDUCxRQUFQLENBQWdCTixJQUFoQixDQUFxQjtBQUNuQnhHLFVBQUFBLElBQUksRUFBRSw0QkFBV3NMLEtBQUssQ0FBQzlGLENBQUQsQ0FBaEIsQ0FEYTtBQUVuQjZGLFVBQUFBLFNBQVMsRUFBRUEsU0FGUTtBQUduQjNGLFVBQUFBLElBQUksRUFBRTRGLEtBQUssQ0FBQ0ssS0FBTixDQUFZLENBQVosRUFBZW5HLENBQUMsR0FBRyxDQUFuQixFQUFzQm9HLElBQXRCLENBQTJCUCxTQUEzQixDQUhhO0FBSW5CdkUsVUFBQUEsUUFBUSxFQUFFO0FBSlMsU0FBckI7QUFNQU8sUUFBQUEsTUFBTSxHQUFHQSxNQUFNLENBQUNQLFFBQVAsQ0FBZ0JPLE1BQU0sQ0FBQ1AsUUFBUCxDQUFnQkssTUFBaEIsR0FBeUIsQ0FBekMsQ0FBVDtBQUNEO0FBQ0Y7O0FBQ0QsV0FBT0UsTUFBUDtBQUNEO0FBRUQ7Ozs7Ozs7OztBQU9BcUUsRUFBQUEsb0JBQW9CLENBQUVHLENBQUYsRUFBS0MsQ0FBTCxFQUFRO0FBQzFCLFdBQU8sQ0FBQ0QsQ0FBQyxDQUFDeEIsV0FBRixPQUFvQixPQUFwQixHQUE4QixPQUE5QixHQUF3Q3dCLENBQXpDLE9BQWlEQyxDQUFDLENBQUN6QixXQUFGLE9BQW9CLE9BQXBCLEdBQThCLE9BQTlCLEdBQXdDeUIsQ0FBekYsQ0FBUDtBQUNEOztBQUVEakosRUFBQUEsWUFBWSxDQUFFa0osT0FBTyxHQUFHQyxlQUFaLEVBQWlDO0FBQzNDLFVBQU14SSxNQUFNLEdBQUd1SSxPQUFPLENBQUMsQ0FBQyxLQUFLdkssS0FBTCxJQUFjLEVBQWYsRUFBbUJvSSxJQUFuQixJQUEyQixFQUE1QixFQUFnQyxLQUFLOUksS0FBckMsQ0FBdEI7QUFDQSxTQUFLMEMsTUFBTCxHQUFjLEtBQUsxQixNQUFMLENBQVkwQixNQUFaLEdBQXFCO0FBQ2pDSyxNQUFBQSxLQUFLLEVBQUUsQ0FBQyxHQUFHb0ksSUFBSixLQUFhO0FBQUUsWUFBSUMsMkJBQW1CLEtBQUtwSixRQUE1QixFQUFzQztBQUFFVSxVQUFBQSxNQUFNLENBQUNLLEtBQVAsQ0FBYW9JLElBQWI7QUFBb0I7QUFBRSxPQURuRDtBQUVqQ0UsTUFBQUEsSUFBSSxFQUFFLENBQUMsR0FBR0YsSUFBSixLQUFhO0FBQUUsWUFBSUcsMEJBQWtCLEtBQUt0SixRQUEzQixFQUFxQztBQUFFVSxVQUFBQSxNQUFNLENBQUMySSxJQUFQLENBQVlGLElBQVo7QUFBbUI7QUFBRSxPQUZoRDtBQUdqQ3hJLE1BQUFBLElBQUksRUFBRSxDQUFDLEdBQUd3SSxJQUFKLEtBQWE7QUFBRSxZQUFJSSwwQkFBa0IsS0FBS3ZKLFFBQTNCLEVBQXFDO0FBQUVVLFVBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZd0ksSUFBWjtBQUFtQjtBQUFFLE9BSGhEO0FBSWpDbkksTUFBQUEsS0FBSyxFQUFFLENBQUMsR0FBR21JLElBQUosS0FBYTtBQUFFLFlBQUlLLDJCQUFtQixLQUFLeEosUUFBNUIsRUFBc0M7QUFBRVUsVUFBQUEsTUFBTSxDQUFDTSxLQUFQLENBQWFtSSxJQUFiO0FBQW9CO0FBQUU7QUFKbkQsS0FBbkM7QUFNRDs7QUF4NEJ5QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IG1hcCwgcGlwZSwgdW5pb24sIHppcCwgZnJvbVBhaXJzLCBwcm9wT3IsIHBhdGhPciwgZmxhdHRlbiB9IGZyb20gJ3JhbWRhJ1xuaW1wb3J0IHsgaW1hcEVuY29kZSwgaW1hcERlY29kZSB9IGZyb20gJ2VtYWlsanMtdXRmNydcbmltcG9ydCB7XG4gIHBhcnNlTkFNRVNQQUNFLFxuICBwYXJzZVNFTEVDVCxcbiAgcGFyc2VGRVRDSCxcbiAgcGFyc2VTRUFSQ0hcbn0gZnJvbSAnLi9jb21tYW5kLXBhcnNlcidcbmltcG9ydCB7XG4gIGJ1aWxkRkVUQ0hDb21tYW5kLFxuICBidWlsZFhPQXV0aDJUb2tlbixcbiAgYnVpbGRTRUFSQ0hDb21tYW5kLFxuICBidWlsZFNUT1JFQ29tbWFuZFxufSBmcm9tICcuL2NvbW1hbmQtYnVpbGRlcidcblxuaW1wb3J0IGNyZWF0ZURlZmF1bHRMb2dnZXIgZnJvbSAnLi9sb2dnZXInXG5pbXBvcnQgSW1hcENsaWVudCBmcm9tICcuL2ltYXAnXG5pbXBvcnQge1xuICBMT0dfTEVWRUxfRVJST1IsXG4gIExPR19MRVZFTF9XQVJOLFxuICBMT0dfTEVWRUxfSU5GTyxcbiAgTE9HX0xFVkVMX0RFQlVHLFxuICBMT0dfTEVWRUxfQUxMXG59IGZyb20gJy4vY29tbW9uJ1xuXG5pbXBvcnQge1xuICBjaGVja1NwZWNpYWxVc2Vcbn0gZnJvbSAnLi9zcGVjaWFsLXVzZSdcblxuZXhwb3J0IGNvbnN0IFRJTUVPVVRfQ09OTkVDVElPTiA9IDkwICogMTAwMCAvLyBNaWxsaXNlY29uZHMgdG8gd2FpdCBmb3IgdGhlIElNQVAgZ3JlZXRpbmcgZnJvbSB0aGUgc2VydmVyXG5leHBvcnQgY29uc3QgVElNRU9VVF9OT09QID0gNjAgKiAxMDAwIC8vIE1pbGxpc2Vjb25kcyBiZXR3ZWVuIE5PT1AgY29tbWFuZHMgd2hpbGUgaWRsaW5nXG5leHBvcnQgY29uc3QgVElNRU9VVF9JRExFID0gNjAgKiAxMDAwIC8vIE1pbGxpc2Vjb25kcyB1bnRpbCBJRExFIGNvbW1hbmQgaXMgY2FuY2VsbGVkXG5cbmV4cG9ydCBjb25zdCBTVEFURV9DT05ORUNUSU5HID0gMVxuZXhwb3J0IGNvbnN0IFNUQVRFX05PVF9BVVRIRU5USUNBVEVEID0gMlxuZXhwb3J0IGNvbnN0IFNUQVRFX0FVVEhFTlRJQ0FURUQgPSAzXG5leHBvcnQgY29uc3QgU1RBVEVfU0VMRUNURUQgPSA0XG5leHBvcnQgY29uc3QgU1RBVEVfTE9HT1VUID0gNVxuXG5leHBvcnQgY29uc3QgREVGQVVMVF9DTElFTlRfSUQgPSB7XG4gIG5hbWU6ICdlbWFpbGpzLWltYXAtY2xpZW50J1xufVxuXG4vKipcbiAqIGVtYWlsanMgSU1BUCBjbGllbnRcbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gW2hvc3Q9J2xvY2FsaG9zdCddIEhvc3RuYW1lIHRvIGNvbmVuY3QgdG9cbiAqIEBwYXJhbSB7TnVtYmVyfSBbcG9ydD0xNDNdIFBvcnQgbnVtYmVyIHRvIGNvbm5lY3QgdG9cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gT3B0aW9uYWwgb3B0aW9ucyBvYmplY3RcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ2xpZW50IHtcbiAgY29uc3RydWN0b3IgKGhvc3QsIHBvcnQsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMudGltZW91dENvbm5lY3Rpb24gPSBUSU1FT1VUX0NPTk5FQ1RJT05cbiAgICB0aGlzLnRpbWVvdXROb29wID0gVElNRU9VVF9OT09QXG4gICAgdGhpcy50aW1lb3V0SWRsZSA9IFRJTUVPVVRfSURMRVxuXG4gICAgdGhpcy5zZXJ2ZXJJZCA9IGZhbHNlIC8vIFJGQyAyOTcxIFNlcnZlciBJRCBhcyBrZXkgdmFsdWUgcGFpcnNcblxuICAgIC8vIEV2ZW50IHBsYWNlaG9sZGVyc1xuICAgIHRoaXMub25jZXJ0ID0gbnVsbFxuICAgIHRoaXMub251cGRhdGUgPSBudWxsXG4gICAgdGhpcy5vbnNlbGVjdG1haWxib3ggPSBudWxsXG4gICAgdGhpcy5vbmNsb3NlbWFpbGJveCA9IG51bGxcblxuICAgIHRoaXMuX2hvc3QgPSBob3N0XG4gICAgdGhpcy5fY2xpZW50SWQgPSBwcm9wT3IoREVGQVVMVF9DTElFTlRfSUQsICdpZCcsIG9wdGlvbnMpXG4gICAgdGhpcy5fc3RhdGUgPSBmYWxzZSAvLyBDdXJyZW50IHN0YXRlXG4gICAgdGhpcy5fYXV0aGVudGljYXRlZCA9IGZhbHNlIC8vIElzIHRoZSBjb25uZWN0aW9uIGF1dGhlbnRpY2F0ZWRcbiAgICB0aGlzLl9jYXBhYmlsaXR5ID0gW10gLy8gTGlzdCBvZiBleHRlbnNpb25zIHRoZSBzZXJ2ZXIgc3VwcG9ydHNcbiAgICB0aGlzLl9zZWxlY3RlZE1haWxib3ggPSBmYWxzZSAvLyBTZWxlY3RlZCBtYWlsYm94XG4gICAgdGhpcy5fZW50ZXJlZElkbGUgPSBmYWxzZVxuICAgIHRoaXMuX2lkbGVUaW1lb3V0ID0gZmFsc2VcbiAgICB0aGlzLl9lbmFibGVDb21wcmVzc2lvbiA9ICEhb3B0aW9ucy5lbmFibGVDb21wcmVzc2lvblxuICAgIHRoaXMuX2F1dGggPSBvcHRpb25zLmF1dGhcbiAgICB0aGlzLl9yZXF1aXJlVExTID0gISFvcHRpb25zLnJlcXVpcmVUTFNcbiAgICB0aGlzLl9pZ25vcmVUTFMgPSAhIW9wdGlvbnMuaWdub3JlVExTXG5cbiAgICB0aGlzLmNsaWVudCA9IG5ldyBJbWFwQ2xpZW50KGhvc3QsIHBvcnQsIG9wdGlvbnMpIC8vIElNQVAgY2xpZW50IG9iamVjdFxuXG4gICAgLy8gRXZlbnQgSGFuZGxlcnNcbiAgICB0aGlzLmNsaWVudC5vbmVycm9yID0gdGhpcy5fb25FcnJvci5iaW5kKHRoaXMpXG4gICAgdGhpcy5jbGllbnQub25jZXJ0ID0gKGNlcnQpID0+ICh0aGlzLm9uY2VydCAmJiB0aGlzLm9uY2VydChjZXJ0KSkgLy8gYWxsb3dzIGNlcnRpZmljYXRlIGhhbmRsaW5nIGZvciBwbGF0Zm9ybXMgdy9vIG5hdGl2ZSB0bHMgc3VwcG9ydFxuICAgIHRoaXMuY2xpZW50Lm9uaWRsZSA9ICgpID0+IHRoaXMuX29uSWRsZSgpIC8vIHN0YXJ0IGlkbGluZ1xuXG4gICAgLy8gRGVmYXVsdCBoYW5kbGVycyBmb3IgdW50YWdnZWQgcmVzcG9uc2VzXG4gICAgdGhpcy5jbGllbnQuc2V0SGFuZGxlcignY2FwYWJpbGl0eScsIChyZXNwb25zZSkgPT4gdGhpcy5fdW50YWdnZWRDYXBhYmlsaXR5SGFuZGxlcihyZXNwb25zZSkpIC8vIGNhcGFiaWxpdHkgdXBkYXRlc1xuICAgIHRoaXMuY2xpZW50LnNldEhhbmRsZXIoJ29rJywgKHJlc3BvbnNlKSA9PiB0aGlzLl91bnRhZ2dlZE9rSGFuZGxlcihyZXNwb25zZSkpIC8vIG5vdGlmaWNhdGlvbnNcbiAgICB0aGlzLmNsaWVudC5zZXRIYW5kbGVyKCdleGlzdHMnLCAocmVzcG9uc2UpID0+IHRoaXMuX3VudGFnZ2VkRXhpc3RzSGFuZGxlcihyZXNwb25zZSkpIC8vIG1lc3NhZ2UgY291bnQgaGFzIGNoYW5nZWRcbiAgICB0aGlzLmNsaWVudC5zZXRIYW5kbGVyKCdleHB1bmdlJywgKHJlc3BvbnNlKSA9PiB0aGlzLl91bnRhZ2dlZEV4cHVuZ2VIYW5kbGVyKHJlc3BvbnNlKSkgLy8gbWVzc2FnZSBoYXMgYmVlbiBkZWxldGVkXG4gICAgdGhpcy5jbGllbnQuc2V0SGFuZGxlcignZmV0Y2gnLCAocmVzcG9uc2UpID0+IHRoaXMuX3VudGFnZ2VkRmV0Y2hIYW5kbGVyKHJlc3BvbnNlKSkgLy8gbWVzc2FnZSBoYXMgYmVlbiB1cGRhdGVkIChlZy4gZmxhZyBjaGFuZ2UpXG5cbiAgICAvLyBBY3RpdmF0ZSBsb2dnaW5nXG4gICAgdGhpcy5jcmVhdGVMb2dnZXIoKVxuICAgIHRoaXMubG9nTGV2ZWwgPSBwcm9wT3IoTE9HX0xFVkVMX0FMTCwgJ2xvZ0xldmVsJywgb3B0aW9ucylcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsZWQgaWYgdGhlIGxvd2VyLWxldmVsIEltYXBDbGllbnQgaGFzIGVuY291bnRlcmVkIGFuIHVucmVjb3ZlcmFibGVcbiAgICogZXJyb3IgZHVyaW5nIG9wZXJhdGlvbi4gQ2xlYW5zIHVwIGFuZCBwcm9wYWdhdGVzIHRoZSBlcnJvciB1cHdhcmRzLlxuICAgKi9cbiAgX29uRXJyb3IgKGVycikge1xuICAgIC8vIG1ha2Ugc3VyZSBubyBpZGxlIHRpbWVvdXQgaXMgcGVuZGluZyBhbnltb3JlXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX2lkbGVUaW1lb3V0KVxuXG4gICAgLy8gcHJvcGFnYXRlIHRoZSBlcnJvciB1cHdhcmRzXG4gICAgdGhpcy5vbmVycm9yICYmIHRoaXMub25lcnJvcihlcnIpXG4gIH1cblxuICAvL1xuICAvL1xuICAvLyBQVUJMSUMgQVBJXG4gIC8vXG4gIC8vXG5cbiAgLyoqXG4gICAqIEluaXRpYXRlIGNvbm5lY3Rpb24gdG8gdGhlIElNQVAgc2VydmVyXG4gICAqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdoZW4gbG9naW4gcHJvY2VkdXJlIGlzIGNvbXBsZXRlXG4gICAqL1xuICBhc3luYyBjb25uZWN0ICgpIHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5fb3BlbkNvbm5lY3Rpb24oKVxuICAgICAgdGhpcy5fY2hhbmdlU3RhdGUoU1RBVEVfTk9UX0FVVEhFTlRJQ0FURUQpXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUNhcGFiaWxpdHkoKVxuICAgICAgYXdhaXQgdGhpcy51cGdyYWRlQ29ubmVjdGlvbigpXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZUlkKHRoaXMuX2NsaWVudElkKVxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ0ZhaWxlZCB0byB1cGRhdGUgc2VydmVyIGlkIScsIGVyci5tZXNzYWdlKVxuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLmxvZ2luKHRoaXMuX2F1dGgpXG4gICAgICBhd2FpdCB0aGlzLmNvbXByZXNzQ29ubmVjdGlvbigpXG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnQ29ubmVjdGlvbiBlc3RhYmxpc2hlZCwgcmVhZHkgdG8gcm9sbCEnKVxuICAgICAgdGhpcy5jbGllbnQub25lcnJvciA9IHRoaXMuX29uRXJyb3IuYmluZCh0aGlzKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ0NvdWxkIG5vdCBjb25uZWN0IHRvIHNlcnZlcicsIGVycilcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMuY2xvc2UoZXJyKSAvLyB3ZSBkb24ndCByZWFsbHkgY2FyZSB3aGV0aGVyIHRoaXMgd29ya3Mgb3Igbm90XG4gICAgICB9IGNhdGNoIChjRXJyKSB7XG4gICAgICAgIHRocm93IGNFcnJcbiAgICAgIH1cbiAgICAgIHRocm93IGVyclxuICAgIH1cbiAgfVxuXG4gIF9vcGVuQ29ubmVjdGlvbiAoKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGxldCBjb25uZWN0aW9uVGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gcmVqZWN0KG5ldyBFcnJvcignVGltZW91dCBjb25uZWN0aW5nIHRvIHNlcnZlcicpKSwgdGhpcy50aW1lb3V0Q29ubmVjdGlvbilcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdDb25uZWN0aW5nIHRvJywgdGhpcy5jbGllbnQuaG9zdCwgJzonLCB0aGlzLmNsaWVudC5wb3J0KVxuICAgICAgdGhpcy5fY2hhbmdlU3RhdGUoU1RBVEVfQ09OTkVDVElORylcbiAgICAgIHRoaXMuY2xpZW50LmNvbm5lY3QoKS50aGVuKCgpID0+IHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ1NvY2tldCBvcGVuZWQsIHdhaXRpbmcgZm9yIGdyZWV0aW5nIGZyb20gdGhlIHNlcnZlci4uLicpXG5cbiAgICAgICAgdGhpcy5jbGllbnQub25yZWFkeSA9ICgpID0+IHtcbiAgICAgICAgICBjbGVhclRpbWVvdXQoY29ubmVjdGlvblRpbWVvdXQpXG4gICAgICAgICAgcmVzb2x2ZSgpXG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNsaWVudC5vbmVycm9yID0gKGVycikgPT4ge1xuICAgICAgICAgIGNsZWFyVGltZW91dChjb25uZWN0aW9uVGltZW91dClcbiAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICB9XG4gICAgICB9KS5jYXRjaChyZWplY3QpXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dvdXRcbiAgICpcbiAgICogU2VuZCBMT0dPVVQsIHRvIHdoaWNoIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgYnkgY2xvc2luZyB0aGUgY29ubmVjdGlvbi5cbiAgICogVXNlIGlzIGRpc2NvdXJhZ2VkIGlmIG5ldHdvcmsgc3RhdHVzIGlzIHVuY2xlYXIhIElmIG5ldHdvcmtzIHN0YXR1cyBpc1xuICAgKiB1bmNsZWFyLCBwbGVhc2UgdXNlICNjbG9zZSBpbnN0ZWFkIVxuICAgKlxuICAgKiBMT0dPVVQgZGV0YWlsczpcbiAgICogICBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuMS4zXG4gICAqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBSZXNvbHZlcyB3aGVuIHNlcnZlciBoYXMgY2xvc2VkIHRoZSBjb25uZWN0aW9uXG4gICAqL1xuICBhc3luYyBsb2dvdXQgKCkge1xuICAgIHRoaXMuX2NoYW5nZVN0YXRlKFNUQVRFX0xPR09VVClcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnTG9nZ2luZyBvdXQuLi4nKVxuICAgIGF3YWl0IHRoaXMuY2xpZW50LmxvZ291dCgpXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX2lkbGVUaW1lb3V0KVxuICB9XG5cbiAgLyoqXG4gICAqIEZvcmNlLWNsb3NlcyB0aGUgY3VycmVudCBjb25uZWN0aW9uIGJ5IGNsb3NpbmcgdGhlIFRDUCBzb2NrZXQuXG4gICAqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBSZXNvbHZlcyB3aGVuIHNvY2tldCBpcyBjbG9zZWRcbiAgICovXG4gIGFzeW5jIGNsb3NlIChlcnIpIHtcbiAgICB0aGlzLl9jaGFuZ2VTdGF0ZShTVEFURV9MT0dPVVQpXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX2lkbGVUaW1lb3V0KVxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdDbG9zaW5nIGNvbm5lY3Rpb24uLi4nKVxuICAgIGF3YWl0IHRoaXMuY2xpZW50LmNsb3NlKGVycilcbiAgICBjbGVhclRpbWVvdXQodGhpcy5faWRsZVRpbWVvdXQpXG4gIH1cblxuICAvKipcbiAgICogUnVucyBJRCBjb21tYW5kLCBwYXJzZXMgSUQgcmVzcG9uc2UsIHNldHMgdGhpcy5zZXJ2ZXJJZFxuICAgKlxuICAgKiBJRCBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzI5NzFcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IGlkIElEIGFzIEpTT04gb2JqZWN0LiBTZWUgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMjk3MSNzZWN0aW9uLTMuMyBmb3IgcG9zc2libGUgdmFsdWVzXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBSZXNvbHZlcyB3aGVuIHJlc3BvbnNlIGhhcyBiZWVuIHBhcnNlZFxuICAgKi9cbiAgYXN5bmMgdXBkYXRlSWQgKGlkKSB7XG4gICAgaWYgKHRoaXMuX2NhcGFiaWxpdHkuaW5kZXhPZignSUQnKSA8IDApIHJldHVyblxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ1VwZGF0aW5nIGlkLi4uJylcblxuICAgIGNvbnN0IGNvbW1hbmQgPSAnSUQnXG4gICAgY29uc3QgYXR0cmlidXRlcyA9IGlkID8gWyBmbGF0dGVuKE9iamVjdC5lbnRyaWVzKGlkKSkgXSA6IFsgbnVsbCBdXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmV4ZWMoeyBjb21tYW5kLCBhdHRyaWJ1dGVzIH0sICdJRCcpXG4gICAgY29uc3QgbGlzdCA9IGZsYXR0ZW4ocGF0aE9yKFtdLCBbJ3BheWxvYWQnLCAnSUQnLCAnMCcsICdhdHRyaWJ1dGVzJywgJzAnXSwgcmVzcG9uc2UpLm1hcChPYmplY3QudmFsdWVzKSlcbiAgICBjb25zdCBrZXlzID0gbGlzdC5maWx0ZXIoKF8sIGkpID0+IGkgJSAyID09PSAwKVxuICAgIGNvbnN0IHZhbHVlcyA9IGxpc3QuZmlsdGVyKChfLCBpKSA9PiBpICUgMiA9PT0gMSlcbiAgICB0aGlzLnNlcnZlcklkID0gZnJvbVBhaXJzKHppcChrZXlzLCB2YWx1ZXMpKVxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdTZXJ2ZXIgaWQgdXBkYXRlZCEnLCB0aGlzLnNlcnZlcklkKVxuICB9XG5cbiAgX3Nob3VsZFNlbGVjdE1haWxib3ggKHBhdGgsIGN0eCkge1xuICAgIGlmICghY3R4KSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cblxuICAgIGNvbnN0IHByZXZpb3VzU2VsZWN0ID0gdGhpcy5jbGllbnQuZ2V0UHJldmlvdXNseVF1ZXVlZChbJ1NFTEVDVCcsICdFWEFNSU5FJ10sIGN0eClcbiAgICBpZiAocHJldmlvdXNTZWxlY3QgJiYgcHJldmlvdXNTZWxlY3QucmVxdWVzdC5hdHRyaWJ1dGVzKSB7XG4gICAgICBjb25zdCBwYXRoQXR0cmlidXRlID0gcHJldmlvdXNTZWxlY3QucmVxdWVzdC5hdHRyaWJ1dGVzLmZpbmQoKGF0dHJpYnV0ZSkgPT4gYXR0cmlidXRlLnR5cGUgPT09ICdTVFJJTkcnKVxuICAgICAgaWYgKHBhdGhBdHRyaWJ1dGUpIHtcbiAgICAgICAgcmV0dXJuIHBhdGhBdHRyaWJ1dGUudmFsdWUgIT09IHBhdGhcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fc2VsZWN0ZWRNYWlsYm94ICE9PSBwYXRoXG4gIH1cblxuICAvKipcbiAgICogUnVucyBTRUxFQ1Qgb3IgRVhBTUlORSB0byBvcGVuIGEgbWFpbGJveFxuICAgKlxuICAgKiBTRUxFQ1QgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi4zLjFcbiAgICogRVhBTUlORSBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjMuMlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBGdWxsIHBhdGggdG8gbWFpbGJveFxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIE9wdGlvbnMgb2JqZWN0XG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdpdGggaW5mb3JtYXRpb24gYWJvdXQgdGhlIHNlbGVjdGVkIG1haWxib3hcbiAgICovXG4gIGFzeW5jIHNlbGVjdE1haWxib3ggKHBhdGgsIG9wdGlvbnMgPSB7fSkge1xuICAgIGxldCBxdWVyeSA9IHtcbiAgICAgIGNvbW1hbmQ6IG9wdGlvbnMucmVhZE9ubHkgPyAnRVhBTUlORScgOiAnU0VMRUNUJyxcbiAgICAgIGF0dHJpYnV0ZXM6IFt7IHR5cGU6ICdTVFJJTkcnLCB2YWx1ZTogcGF0aCB9XVxuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmNvbmRzdG9yZSAmJiB0aGlzLl9jYXBhYmlsaXR5LmluZGV4T2YoJ0NPTkRTVE9SRScpID49IDApIHtcbiAgICAgIHF1ZXJ5LmF0dHJpYnV0ZXMucHVzaChbeyB0eXBlOiAnQVRPTScsIHZhbHVlOiAnQ09ORFNUT1JFJyB9XSlcbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnT3BlbmluZycsIHBhdGgsICcuLi4nKVxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5leGVjKHF1ZXJ5LCBbJ0VYSVNUUycsICdGTEFHUycsICdPSyddLCB7IGN0eDogb3B0aW9ucy5jdHggfSlcbiAgICBsZXQgbWFpbGJveEluZm8gPSBwYXJzZVNFTEVDVChyZXNwb25zZSlcblxuICAgIHRoaXMuX2NoYW5nZVN0YXRlKFNUQVRFX1NFTEVDVEVEKVxuXG4gICAgaWYgKHRoaXMuX3NlbGVjdGVkTWFpbGJveCAhPT0gcGF0aCAmJiB0aGlzLm9uY2xvc2VtYWlsYm94KSB7XG4gICAgICBhd2FpdCB0aGlzLm9uY2xvc2VtYWlsYm94KHRoaXMuX3NlbGVjdGVkTWFpbGJveClcbiAgICB9XG4gICAgdGhpcy5fc2VsZWN0ZWRNYWlsYm94ID0gcGF0aFxuICAgIGlmICh0aGlzLm9uc2VsZWN0bWFpbGJveCkge1xuICAgICAgYXdhaXQgdGhpcy5vbnNlbGVjdG1haWxib3gocGF0aCwgbWFpbGJveEluZm8pXG4gICAgfVxuXG4gICAgcmV0dXJuIG1haWxib3hJbmZvXG4gIH1cblxuICAvKipcbiAgICogUnVucyBOQU1FU1BBQ0UgY29tbWFuZFxuICAgKlxuICAgKiBOQU1FU1BBQ0UgZGV0YWlsczpcbiAgICogICBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMjM0MlxuICAgKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB3aXRoIG5hbWVzcGFjZSBvYmplY3RcbiAgICovXG4gIGFzeW5jIGxpc3ROYW1lc3BhY2VzICgpIHtcbiAgICBpZiAodGhpcy5fY2FwYWJpbGl0eS5pbmRleE9mKCdOQU1FU1BBQ0UnKSA8IDApIHJldHVybiBmYWxzZVxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0xpc3RpbmcgbmFtZXNwYWNlcy4uLicpXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmV4ZWMoJ05BTUVTUEFDRScsICdOQU1FU1BBQ0UnKVxuICAgIHJldHVybiBwYXJzZU5BTUVTUEFDRShyZXNwb25zZSlcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIExJU1QgYW5kIExTVUIgY29tbWFuZHMuIFJldHJpZXZlcyBhIHRyZWUgb2YgYXZhaWxhYmxlIG1haWxib3hlc1xuICAgKlxuICAgKiBMSVNUIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuMy44XG4gICAqIExTVUIgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi4zLjlcbiAgICpcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2l0aCBsaXN0IG9mIG1haWxib3hlc1xuICAgKi9cbiAgYXN5bmMgbGlzdE1haWxib3hlcyAoKSB7XG4gICAgY29uc3QgdHJlZSA9IHsgcm9vdDogdHJ1ZSwgY2hpbGRyZW46IFtdIH1cblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdMaXN0aW5nIG1haWxib3hlcy4uLicpXG4gICAgY29uc3QgbGlzdFJlc3BvbnNlID0gYXdhaXQgdGhpcy5leGVjKHsgY29tbWFuZDogJ0xJU1QnLCBhdHRyaWJ1dGVzOiBbJycsICcqJ10gfSwgJ0xJU1QnKVxuICAgIGNvbnN0IGxpc3QgPSBwYXRoT3IoW10sIFsncGF5bG9hZCcsICdMSVNUJ10sIGxpc3RSZXNwb25zZSlcbiAgICBsaXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICBjb25zdCBhdHRyID0gcHJvcE9yKFtdLCAnYXR0cmlidXRlcycsIGl0ZW0pXG4gICAgICBpZiAoYXR0ci5sZW5ndGggPCAzKSByZXR1cm5cblxuICAgICAgY29uc3QgcGF0aCA9IHBhdGhPcignJywgWycyJywgJ3ZhbHVlJ10sIGF0dHIpXG4gICAgICBjb25zdCBkZWxpbSA9IHBhdGhPcignLycsIFsnMScsICd2YWx1ZSddLCBhdHRyKVxuICAgICAgY29uc3QgYnJhbmNoID0gdGhpcy5fZW5zdXJlUGF0aCh0cmVlLCBwYXRoLCBkZWxpbSlcbiAgICAgIGJyYW5jaC5mbGFncyA9IHByb3BPcihbXSwgJzAnLCBhdHRyKS5tYXAoKHsgdmFsdWUgfSkgPT4gdmFsdWUgfHwgJycpXG4gICAgICBicmFuY2gubGlzdGVkID0gdHJ1ZVxuICAgICAgY2hlY2tTcGVjaWFsVXNlKGJyYW5jaClcbiAgICB9KVxuXG4gICAgY29uc3QgbHN1YlJlc3BvbnNlID0gYXdhaXQgdGhpcy5leGVjKHsgY29tbWFuZDogJ0xTVUInLCBhdHRyaWJ1dGVzOiBbJycsICcqJ10gfSwgJ0xTVUInKVxuICAgIGNvbnN0IGxzdWIgPSBwYXRoT3IoW10sIFsncGF5bG9hZCcsICdMU1VCJ10sIGxzdWJSZXNwb25zZSlcbiAgICBsc3ViLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgIGNvbnN0IGF0dHIgPSBwcm9wT3IoW10sICdhdHRyaWJ1dGVzJywgaXRlbSlcbiAgICAgIGlmIChhdHRyLmxlbmd0aCA8IDMpIHJldHVyblxuXG4gICAgICBjb25zdCBwYXRoID0gcGF0aE9yKCcnLCBbJzInLCAndmFsdWUnXSwgYXR0cilcbiAgICAgIGNvbnN0IGRlbGltID0gcGF0aE9yKCcvJywgWycxJywgJ3ZhbHVlJ10sIGF0dHIpXG4gICAgICBjb25zdCBicmFuY2ggPSB0aGlzLl9lbnN1cmVQYXRoKHRyZWUsIHBhdGgsIGRlbGltKVxuICAgICAgcHJvcE9yKFtdLCAnMCcsIGF0dHIpLm1hcCgoZmxhZyA9ICcnKSA9PiB7IGJyYW5jaC5mbGFncyA9IHVuaW9uKGJyYW5jaC5mbGFncywgW2ZsYWddKSB9KVxuICAgICAgYnJhbmNoLnN1YnNjcmliZWQgPSB0cnVlXG4gICAgfSlcblxuICAgIHJldHVybiB0cmVlXG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgbWFpbGJveCB3aXRoIHRoZSBnaXZlbiBwYXRoLlxuICAgKlxuICAgKiBDUkVBVEUgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi4zLjNcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICogICAgIFRoZSBwYXRoIG9mIHRoZSBtYWlsYm94IHlvdSB3b3VsZCBsaWtlIHRvIGNyZWF0ZS4gIFRoaXMgbWV0aG9kIHdpbGxcbiAgICogICAgIGhhbmRsZSB1dGY3IGVuY29kaW5nIGZvciB5b3UuXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKiAgICAgUHJvbWlzZSByZXNvbHZlcyBpZiBtYWlsYm94IHdhcyBjcmVhdGVkLlxuICAgKiAgICAgSW4gdGhlIGV2ZW50IHRoZSBzZXJ2ZXIgc2F5cyBOTyBbQUxSRUFEWUVYSVNUU10sIHdlIHRyZWF0IHRoYXQgYXMgc3VjY2Vzcy5cbiAgICovXG4gIGFzeW5jIGNyZWF0ZU1haWxib3ggKHBhdGgpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnQ3JlYXRpbmcgbWFpbGJveCcsIHBhdGgsICcuLi4nKVxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLmV4ZWMoeyBjb21tYW5kOiAnQ1JFQVRFJywgYXR0cmlidXRlczogW2ltYXBFbmNvZGUocGF0aCldIH0pXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyICYmIGVyci5jb2RlID09PSAnQUxSRUFEWUVYSVNUUycpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB0aHJvdyBlcnJcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGVsZXRlIGEgbWFpbGJveCB3aXRoIHRoZSBnaXZlbiBwYXRoLlxuICAgKlxuICAgKiBERUxFVEUgZGV0YWlsczpcbiAgICogICBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuMy40XG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAqICAgICBUaGUgcGF0aCBvZiB0aGUgbWFpbGJveCB5b3Ugd291bGQgbGlrZSB0byBkZWxldGUuICBUaGlzIG1ldGhvZCB3aWxsXG4gICAqICAgICBoYW5kbGUgdXRmNyBlbmNvZGluZyBmb3IgeW91LlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICogICAgIFByb21pc2UgcmVzb2x2ZXMgaWYgbWFpbGJveCB3YXMgZGVsZXRlZC5cbiAgICovXG4gIGRlbGV0ZU1haWxib3ggKHBhdGgpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnRGVsZXRpbmcgbWFpbGJveCcsIHBhdGgsICcuLi4nKVxuICAgIHJldHVybiB0aGlzLmV4ZWMoeyBjb21tYW5kOiAnREVMRVRFJywgYXR0cmlidXRlczogW2ltYXBFbmNvZGUocGF0aCldIH0pXG4gIH1cblxuICAvKipcbiAgICogUnVucyBGRVRDSCBjb21tYW5kXG4gICAqXG4gICAqIEZFVENIIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuNC41XG4gICAqIENIQU5HRURTSU5DRSBkZXRhaWxzOlxuICAgKiAgIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM0NTUxI3NlY3Rpb24tMy4zXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBwYXRoIGZvciB0aGUgbWFpbGJveCB3aGljaCBzaG91bGQgYmUgc2VsZWN0ZWQgZm9yIHRoZSBjb21tYW5kLiBTZWxlY3RzIG1haWxib3ggaWYgbmVjZXNzYXJ5XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzZXF1ZW5jZSBTZXF1ZW5jZSBzZXQsIGVnIDE6KiBmb3IgYWxsIG1lc3NhZ2VzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbaXRlbXNdIE1lc3NhZ2UgZGF0YSBpdGVtIG5hbWVzIG9yIG1hY3JvXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gUXVlcnkgbW9kaWZpZXJzXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdpdGggdGhlIGZldGNoZWQgbWVzc2FnZSBpbmZvXG4gICAqL1xuICBhc3luYyBsaXN0TWVzc2FnZXMgKHBhdGgsIHNlcXVlbmNlLCBpdGVtcyA9IFt7IGZhc3Q6IHRydWUgfV0sIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdGZXRjaGluZyBtZXNzYWdlcycsIHNlcXVlbmNlLCAnZnJvbScsIHBhdGgsICcuLi4nKVxuICAgIGNvbnN0IGNvbW1hbmQgPSBidWlsZEZFVENIQ29tbWFuZChzZXF1ZW5jZSwgaXRlbXMsIG9wdGlvbnMpXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmV4ZWMoY29tbWFuZCwgJ0ZFVENIJywge1xuICAgICAgcHJlY2hlY2s6IChjdHgpID0+IHRoaXMuX3Nob3VsZFNlbGVjdE1haWxib3gocGF0aCwgY3R4KSA/IHRoaXMuc2VsZWN0TWFpbGJveChwYXRoLCB7IGN0eCB9KSA6IFByb21pc2UucmVzb2x2ZSgpXG4gICAgfSlcbiAgICByZXR1cm4gcGFyc2VGRVRDSChyZXNwb25zZSlcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIFNFQVJDSCBjb21tYW5kXG4gICAqXG4gICAqIFNFQVJDSCBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjQuNFxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBUaGUgcGF0aCBmb3IgdGhlIG1haWxib3ggd2hpY2ggc2hvdWxkIGJlIHNlbGVjdGVkIGZvciB0aGUgY29tbWFuZC4gU2VsZWN0cyBtYWlsYm94IGlmIG5lY2Vzc2FyeVxuICAgKiBAcGFyYW0ge09iamVjdH0gcXVlcnkgU2VhcmNoIHRlcm1zXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gUXVlcnkgbW9kaWZpZXJzXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdpdGggdGhlIGFycmF5IG9mIG1hdGNoaW5nIHNlcS4gb3IgdWlkIG51bWJlcnNcbiAgICovXG4gIGFzeW5jIHNlYXJjaCAocGF0aCwgcXVlcnksIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdTZWFyY2hpbmcgaW4nLCBwYXRoLCAnLi4uJylcbiAgICBjb25zdCBjb21tYW5kID0gYnVpbGRTRUFSQ0hDb21tYW5kKHF1ZXJ5LCBvcHRpb25zKVxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5leGVjKGNvbW1hbmQsICdTRUFSQ0gnLCB7XG4gICAgICBwcmVjaGVjazogKGN0eCkgPT4gdGhpcy5fc2hvdWxkU2VsZWN0TWFpbGJveChwYXRoLCBjdHgpID8gdGhpcy5zZWxlY3RNYWlsYm94KHBhdGgsIHsgY3R4IH0pIDogUHJvbWlzZS5yZXNvbHZlKClcbiAgICB9KVxuICAgIHJldHVybiBwYXJzZVNFQVJDSChyZXNwb25zZSlcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIFNUT1JFIGNvbW1hbmRcbiAgICpcbiAgICogU1RPUkUgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi40LjZcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggVGhlIHBhdGggZm9yIHRoZSBtYWlsYm94IHdoaWNoIHNob3VsZCBiZSBzZWxlY3RlZCBmb3IgdGhlIGNvbW1hbmQuIFNlbGVjdHMgbWFpbGJveCBpZiBuZWNlc3NhcnlcbiAgICogQHBhcmFtIHtTdHJpbmd9IHNlcXVlbmNlIE1lc3NhZ2Ugc2VsZWN0b3Igd2hpY2ggdGhlIGZsYWcgY2hhbmdlIGlzIGFwcGxpZWQgdG9cbiAgICogQHBhcmFtIHtBcnJheX0gZmxhZ3NcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBRdWVyeSBtb2RpZmllcnNcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2l0aCB0aGUgYXJyYXkgb2YgbWF0Y2hpbmcgc2VxLiBvciB1aWQgbnVtYmVyc1xuICAgKi9cbiAgc2V0RmxhZ3MgKHBhdGgsIHNlcXVlbmNlLCBmbGFncywgb3B0aW9ucykge1xuICAgIGxldCBrZXkgPSAnJ1xuICAgIGxldCBsaXN0ID0gW11cblxuICAgIGlmIChBcnJheS5pc0FycmF5KGZsYWdzKSB8fCB0eXBlb2YgZmxhZ3MgIT09ICdvYmplY3QnKSB7XG4gICAgICBsaXN0ID0gW10uY29uY2F0KGZsYWdzIHx8IFtdKVxuICAgICAga2V5ID0gJydcbiAgICB9IGVsc2UgaWYgKGZsYWdzLmFkZCkge1xuICAgICAgbGlzdCA9IFtdLmNvbmNhdChmbGFncy5hZGQgfHwgW10pXG4gICAgICBrZXkgPSAnKydcbiAgICB9IGVsc2UgaWYgKGZsYWdzLnNldCkge1xuICAgICAga2V5ID0gJydcbiAgICAgIGxpc3QgPSBbXS5jb25jYXQoZmxhZ3Muc2V0IHx8IFtdKVxuICAgIH0gZWxzZSBpZiAoZmxhZ3MucmVtb3ZlKSB7XG4gICAgICBrZXkgPSAnLSdcbiAgICAgIGxpc3QgPSBbXS5jb25jYXQoZmxhZ3MucmVtb3ZlIHx8IFtdKVxuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdTZXR0aW5nIGZsYWdzIG9uJywgc2VxdWVuY2UsICdpbicsIHBhdGgsICcuLi4nKVxuICAgIHJldHVybiB0aGlzLnN0b3JlKHBhdGgsIHNlcXVlbmNlLCBrZXkgKyAnRkxBR1MnLCBsaXN0LCBvcHRpb25zKVxuICB9XG5cbiAgLyoqXG4gICAqIFJ1bnMgU1RPUkUgY29tbWFuZFxuICAgKlxuICAgKiBTVE9SRSBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjQuNlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBUaGUgcGF0aCBmb3IgdGhlIG1haWxib3ggd2hpY2ggc2hvdWxkIGJlIHNlbGVjdGVkIGZvciB0aGUgY29tbWFuZC4gU2VsZWN0cyBtYWlsYm94IGlmIG5lY2Vzc2FyeVxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2VxdWVuY2UgTWVzc2FnZSBzZWxlY3RvciB3aGljaCB0aGUgZmxhZyBjaGFuZ2UgaXMgYXBwbGllZCB0b1xuICAgKiBAcGFyYW0ge1N0cmluZ30gYWN0aW9uIFNUT1JFIG1ldGhvZCB0byBjYWxsLCBlZyBcIitGTEFHU1wiXG4gICAqIEBwYXJhbSB7QXJyYXl9IGZsYWdzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gUXVlcnkgbW9kaWZpZXJzXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdpdGggdGhlIGFycmF5IG9mIG1hdGNoaW5nIHNlcS4gb3IgdWlkIG51bWJlcnNcbiAgICovXG4gIGFzeW5jIHN0b3JlIChwYXRoLCBzZXF1ZW5jZSwgYWN0aW9uLCBmbGFncywgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgY29tbWFuZCA9IGJ1aWxkU1RPUkVDb21tYW5kKHNlcXVlbmNlLCBhY3Rpb24sIGZsYWdzLCBvcHRpb25zKVxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5leGVjKGNvbW1hbmQsICdGRVRDSCcsIHtcbiAgICAgIHByZWNoZWNrOiAoY3R4KSA9PiB0aGlzLl9zaG91bGRTZWxlY3RNYWlsYm94KHBhdGgsIGN0eCkgPyB0aGlzLnNlbGVjdE1haWxib3gocGF0aCwgeyBjdHggfSkgOiBQcm9taXNlLnJlc29sdmUoKVxuICAgIH0pXG4gICAgcmV0dXJuIHBhcnNlRkVUQ0gocmVzcG9uc2UpXG4gIH1cblxuICAvKipcbiAgICogUnVucyBBUFBFTkQgY29tbWFuZFxuICAgKlxuICAgKiBBUFBFTkQgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi4zLjExXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBkZXN0aW5hdGlvbiBUaGUgbWFpbGJveCB3aGVyZSB0byBhcHBlbmQgdGhlIG1lc3NhZ2VcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gYXBwZW5kXG4gICAqIEBwYXJhbSB7QXJyYXl9IG9wdGlvbnMuZmxhZ3MgQW55IGZsYWdzIHlvdSB3YW50IHRvIHNldCBvbiB0aGUgdXBsb2FkZWQgbWVzc2FnZS4gRGVmYXVsdHMgdG8gW1xcU2Vlbl0uIChvcHRpb25hbClcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2l0aCB0aGUgYXJyYXkgb2YgbWF0Y2hpbmcgc2VxLiBvciB1aWQgbnVtYmVyc1xuICAgKi9cbiAgdXBsb2FkIChkZXN0aW5hdGlvbiwgbWVzc2FnZSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgbGV0IGZsYWdzID0gcHJvcE9yKFsnXFxcXFNlZW4nXSwgJ2ZsYWdzJywgb3B0aW9ucykubWFwKHZhbHVlID0+ICh7IHR5cGU6ICdhdG9tJywgdmFsdWUgfSkpXG4gICAgbGV0IGNvbW1hbmQgPSB7XG4gICAgICBjb21tYW5kOiAnQVBQRU5EJyxcbiAgICAgIGF0dHJpYnV0ZXM6IFtcbiAgICAgICAgeyB0eXBlOiAnYXRvbScsIHZhbHVlOiBkZXN0aW5hdGlvbiB9LFxuICAgICAgICBmbGFncyxcbiAgICAgICAgeyB0eXBlOiAnbGl0ZXJhbCcsIHZhbHVlOiBtZXNzYWdlIH1cbiAgICAgIF1cbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnVXBsb2FkaW5nIG1lc3NhZ2UgdG8nLCBkZXN0aW5hdGlvbiwgJy4uLicpXG4gICAgcmV0dXJuIHRoaXMuZXhlYyhjb21tYW5kKVxuICB9XG5cbiAgLyoqXG4gICAqIERlbGV0ZXMgbWVzc2FnZXMgZnJvbSBhIHNlbGVjdGVkIG1haWxib3hcbiAgICpcbiAgICogRVhQVU5HRSBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjQuM1xuICAgKiBVSUQgRVhQVU5HRSBkZXRhaWxzOlxuICAgKiAgIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM0MzE1I3NlY3Rpb24tMi4xXG4gICAqXG4gICAqIElmIHBvc3NpYmxlIChieVVpZDp0cnVlIGFuZCBVSURQTFVTIGV4dGVuc2lvbiBzdXBwb3J0ZWQpLCB1c2VzIFVJRCBFWFBVTkdFXG4gICAqIGNvbW1hbmQgdG8gZGVsZXRlIGEgcmFuZ2Ugb2YgbWVzc2FnZXMsIG90aGVyd2lzZSBmYWxscyBiYWNrIHRvIEVYUFVOR0UuXG4gICAqXG4gICAqIE5CISBUaGlzIG1ldGhvZCBtaWdodCBiZSBkZXN0cnVjdGl2ZSAtIGlmIEVYUFVOR0UgaXMgdXNlZCwgdGhlbiBhbnkgbWVzc2FnZXNcbiAgICogd2l0aCBcXERlbGV0ZWQgZmxhZyBzZXQgYXJlIGRlbGV0ZWRcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggVGhlIHBhdGggZm9yIHRoZSBtYWlsYm94IHdoaWNoIHNob3VsZCBiZSBzZWxlY3RlZCBmb3IgdGhlIGNvbW1hbmQuIFNlbGVjdHMgbWFpbGJveCBpZiBuZWNlc3NhcnlcbiAgICogQHBhcmFtIHtTdHJpbmd9IHNlcXVlbmNlIE1lc3NhZ2UgcmFuZ2UgdG8gYmUgZGVsZXRlZFxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIFF1ZXJ5IG1vZGlmaWVyc1xuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZVxuICAgKi9cbiAgYXN5bmMgZGVsZXRlTWVzc2FnZXMgKHBhdGgsIHNlcXVlbmNlLCBvcHRpb25zID0ge30pIHtcbiAgICAvLyBhZGQgXFxEZWxldGVkIGZsYWcgdG8gdGhlIG1lc3NhZ2VzIGFuZCBydW4gRVhQVU5HRSBvciBVSUQgRVhQVU5HRVxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdEZWxldGluZyBtZXNzYWdlcycsIHNlcXVlbmNlLCAnaW4nLCBwYXRoLCAnLi4uJylcbiAgICBjb25zdCB1c2VVaWRQbHVzID0gb3B0aW9ucy5ieVVpZCAmJiB0aGlzLl9jYXBhYmlsaXR5LmluZGV4T2YoJ1VJRFBMVVMnKSA+PSAwXG4gICAgY29uc3QgdWlkRXhwdW5nZUNvbW1hbmQgPSB7IGNvbW1hbmQ6ICdVSUQgRVhQVU5HRScsIGF0dHJpYnV0ZXM6IFt7IHR5cGU6ICdzZXF1ZW5jZScsIHZhbHVlOiBzZXF1ZW5jZSB9XSB9XG4gICAgYXdhaXQgdGhpcy5zZXRGbGFncyhwYXRoLCBzZXF1ZW5jZSwgeyBhZGQ6ICdcXFxcRGVsZXRlZCcgfSwgb3B0aW9ucylcbiAgICBjb25zdCBjbWQgPSB1c2VVaWRQbHVzID8gdWlkRXhwdW5nZUNvbW1hbmQgOiAnRVhQVU5HRSdcbiAgICByZXR1cm4gdGhpcy5leGVjKGNtZCwgbnVsbCwge1xuICAgICAgcHJlY2hlY2s6IChjdHgpID0+IHRoaXMuX3Nob3VsZFNlbGVjdE1haWxib3gocGF0aCwgY3R4KSA/IHRoaXMuc2VsZWN0TWFpbGJveChwYXRoLCB7IGN0eCB9KSA6IFByb21pc2UucmVzb2x2ZSgpXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBDb3BpZXMgYSByYW5nZSBvZiBtZXNzYWdlcyBmcm9tIHRoZSBhY3RpdmUgbWFpbGJveCB0byB0aGUgZGVzdGluYXRpb24gbWFpbGJveC5cbiAgICogU2lsZW50IG1ldGhvZCAodW5sZXNzIGFuIGVycm9yIG9jY3VycyksIGJ5IGRlZmF1bHQgcmV0dXJucyBubyBpbmZvcm1hdGlvbi5cbiAgICpcbiAgICogQ09QWSBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjQuN1xuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBUaGUgcGF0aCBmb3IgdGhlIG1haWxib3ggd2hpY2ggc2hvdWxkIGJlIHNlbGVjdGVkIGZvciB0aGUgY29tbWFuZC4gU2VsZWN0cyBtYWlsYm94IGlmIG5lY2Vzc2FyeVxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2VxdWVuY2UgTWVzc2FnZSByYW5nZSB0byBiZSBjb3BpZWRcbiAgICogQHBhcmFtIHtTdHJpbmd9IGRlc3RpbmF0aW9uIERlc3RpbmF0aW9uIG1haWxib3ggcGF0aFxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIFF1ZXJ5IG1vZGlmaWVyc1xuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmJ5VWlkXSBJZiB0cnVlLCB1c2VzIFVJRCBDT1BZIGluc3RlYWQgb2YgQ09QWVxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZVxuICAgKi9cbiAgYXN5bmMgY29weU1lc3NhZ2VzIChwYXRoLCBzZXF1ZW5jZSwgZGVzdGluYXRpb24sIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdDb3B5aW5nIG1lc3NhZ2VzJywgc2VxdWVuY2UsICdmcm9tJywgcGF0aCwgJ3RvJywgZGVzdGluYXRpb24sICcuLi4nKVxuICAgIGNvbnN0IHsgaHVtYW5SZWFkYWJsZSB9ID0gYXdhaXQgdGhpcy5leGVjKHtcbiAgICAgIGNvbW1hbmQ6IG9wdGlvbnMuYnlVaWQgPyAnVUlEIENPUFknIDogJ0NPUFknLFxuICAgICAgYXR0cmlidXRlczogW1xuICAgICAgICB7IHR5cGU6ICdzZXF1ZW5jZScsIHZhbHVlOiBzZXF1ZW5jZSB9LFxuICAgICAgICB7IHR5cGU6ICdhdG9tJywgdmFsdWU6IGRlc3RpbmF0aW9uIH1cbiAgICAgIF1cbiAgICB9LCBudWxsLCB7XG4gICAgICBwcmVjaGVjazogKGN0eCkgPT4gdGhpcy5fc2hvdWxkU2VsZWN0TWFpbGJveChwYXRoLCBjdHgpID8gdGhpcy5zZWxlY3RNYWlsYm94KHBhdGgsIHsgY3R4IH0pIDogUHJvbWlzZS5yZXNvbHZlKClcbiAgICB9KVxuICAgIHJldHVybiBodW1hblJlYWRhYmxlIHx8ICdDT1BZIGNvbXBsZXRlZCdcbiAgfVxuXG4gIC8qKlxuICAgKiBNb3ZlcyBhIHJhbmdlIG9mIG1lc3NhZ2VzIGZyb20gdGhlIGFjdGl2ZSBtYWlsYm94IHRvIHRoZSBkZXN0aW5hdGlvbiBtYWlsYm94LlxuICAgKiBQcmVmZXJzIHRoZSBNT1ZFIGV4dGVuc2lvbiBidXQgaWYgbm90IGF2YWlsYWJsZSwgZmFsbHMgYmFjayB0b1xuICAgKiBDT1BZICsgRVhQVU5HRVxuICAgKlxuICAgKiBNT1ZFIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjg1MVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBUaGUgcGF0aCBmb3IgdGhlIG1haWxib3ggd2hpY2ggc2hvdWxkIGJlIHNlbGVjdGVkIGZvciB0aGUgY29tbWFuZC4gU2VsZWN0cyBtYWlsYm94IGlmIG5lY2Vzc2FyeVxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2VxdWVuY2UgTWVzc2FnZSByYW5nZSB0byBiZSBtb3ZlZFxuICAgKiBAcGFyYW0ge1N0cmluZ30gZGVzdGluYXRpb24gRGVzdGluYXRpb24gbWFpbGJveCBwYXRoXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gUXVlcnkgbW9kaWZpZXJzXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlXG4gICAqL1xuICBhc3luYyBtb3ZlTWVzc2FnZXMgKHBhdGgsIHNlcXVlbmNlLCBkZXN0aW5hdGlvbiwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ01vdmluZyBtZXNzYWdlcycsIHNlcXVlbmNlLCAnZnJvbScsIHBhdGgsICd0bycsIGRlc3RpbmF0aW9uLCAnLi4uJylcblxuICAgIGlmICh0aGlzLl9jYXBhYmlsaXR5LmluZGV4T2YoJ01PVkUnKSA9PT0gLTEpIHtcbiAgICAgIC8vIEZhbGxiYWNrIHRvIENPUFkgKyBFWFBVTkdFXG4gICAgICBhd2FpdCB0aGlzLmNvcHlNZXNzYWdlcyhwYXRoLCBzZXF1ZW5jZSwgZGVzdGluYXRpb24sIG9wdGlvbnMpXG4gICAgICByZXR1cm4gdGhpcy5kZWxldGVNZXNzYWdlcyhwYXRoLCBzZXF1ZW5jZSwgb3B0aW9ucylcbiAgICB9XG5cbiAgICAvLyBJZiBwb3NzaWJsZSwgdXNlIE1PVkVcbiAgICByZXR1cm4gdGhpcy5leGVjKHtcbiAgICAgIGNvbW1hbmQ6IG9wdGlvbnMuYnlVaWQgPyAnVUlEIE1PVkUnIDogJ01PVkUnLFxuICAgICAgYXR0cmlidXRlczogW1xuICAgICAgICB7IHR5cGU6ICdzZXF1ZW5jZScsIHZhbHVlOiBzZXF1ZW5jZSB9LFxuICAgICAgICB7IHR5cGU6ICdhdG9tJywgdmFsdWU6IGRlc3RpbmF0aW9uIH1cbiAgICAgIF1cbiAgICB9LCBbJ09LJ10sIHtcbiAgICAgIHByZWNoZWNrOiAoY3R4KSA9PiB0aGlzLl9zaG91bGRTZWxlY3RNYWlsYm94KHBhdGgsIGN0eCkgPyB0aGlzLnNlbGVjdE1haWxib3gocGF0aCwgeyBjdHggfSkgOiBQcm9taXNlLnJlc29sdmUoKVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogUnVucyBDT01QUkVTUyBjb21tYW5kXG4gICAqXG4gICAqIENPTVBSRVNTIGRldGFpbHM6XG4gICAqICAgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzQ5NzhcbiAgICovXG4gIGFzeW5jIGNvbXByZXNzQ29ubmVjdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLl9lbmFibGVDb21wcmVzc2lvbiB8fCB0aGlzLl9jYXBhYmlsaXR5LmluZGV4T2YoJ0NPTVBSRVNTPURFRkxBVEUnKSA8IDAgfHwgdGhpcy5jbGllbnQuY29tcHJlc3NlZCkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0VuYWJsaW5nIGNvbXByZXNzaW9uLi4uJylcbiAgICBhd2FpdCB0aGlzLmV4ZWMoe1xuICAgICAgY29tbWFuZDogJ0NPTVBSRVNTJyxcbiAgICAgIGF0dHJpYnV0ZXM6IFt7XG4gICAgICAgIHR5cGU6ICdBVE9NJyxcbiAgICAgICAgdmFsdWU6ICdERUZMQVRFJ1xuICAgICAgfV1cbiAgICB9KVxuICAgIHRoaXMuY2xpZW50LmVuYWJsZUNvbXByZXNzaW9uKClcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnQ29tcHJlc3Npb24gZW5hYmxlZCwgYWxsIGRhdGEgc2VudCBhbmQgcmVjZWl2ZWQgaXMgZGVmbGF0ZWQhJylcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIExPR0lOIG9yIEFVVEhFTlRJQ0FURSBYT0FVVEgyIGNvbW1hbmRcbiAgICpcbiAgICogTE9HSU4gZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi4yLjNcbiAgICogWE9BVVRIMiBkZXRhaWxzOlxuICAgKiAgIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL2dtYWlsL3hvYXV0aDJfcHJvdG9jb2wjaW1hcF9wcm90b2NvbF9leGNoYW5nZVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gYXV0aC51c2VyXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBhdXRoLnBhc3NcbiAgICogQHBhcmFtIHtTdHJpbmd9IGF1dGgueG9hdXRoMlxuICAgKi9cbiAgYXN5bmMgbG9naW4gKGF1dGgpIHtcbiAgICBsZXQgY29tbWFuZFxuICAgIGxldCBvcHRpb25zID0ge31cblxuICAgIGlmICghYXV0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdBdXRoZW50aWNhdGlvbiBpbmZvcm1hdGlvbiBub3QgcHJvdmlkZWQnKVxuICAgIH1cblxuICAgIGlmICh0aGlzLl9jYXBhYmlsaXR5LmluZGV4T2YoJ0FVVEg9WE9BVVRIMicpID49IDAgJiYgYXV0aCAmJiBhdXRoLnhvYXV0aDIpIHtcbiAgICAgIGNvbW1hbmQgPSB7XG4gICAgICAgIGNvbW1hbmQ6ICdBVVRIRU5USUNBVEUnLFxuICAgICAgICBhdHRyaWJ1dGVzOiBbXG4gICAgICAgICAgeyB0eXBlOiAnQVRPTScsIHZhbHVlOiAnWE9BVVRIMicgfSxcbiAgICAgICAgICB7IHR5cGU6ICdBVE9NJywgdmFsdWU6IGJ1aWxkWE9BdXRoMlRva2VuKGF1dGgudXNlciwgYXV0aC54b2F1dGgyKSwgc2Vuc2l0aXZlOiB0cnVlIH1cbiAgICAgICAgXVxuICAgICAgfVxuXG4gICAgICBvcHRpb25zLmVycm9yUmVzcG9uc2VFeHBlY3RzRW1wdHlMaW5lID0gdHJ1ZSAvLyArIHRhZ2dlZCBlcnJvciByZXNwb25zZSBleHBlY3RzIGFuIGVtcHR5IGxpbmUgaW4gcmV0dXJuXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbW1hbmQgPSB7XG4gICAgICAgIGNvbW1hbmQ6ICdsb2dpbicsXG4gICAgICAgIGF0dHJpYnV0ZXM6IFtcbiAgICAgICAgICB7IHR5cGU6ICdTVFJJTkcnLCB2YWx1ZTogYXV0aC51c2VyIHx8ICcnIH0sXG4gICAgICAgICAgeyB0eXBlOiAnU1RSSU5HJywgdmFsdWU6IGF1dGgucGFzcyB8fCAnJywgc2Vuc2l0aXZlOiB0cnVlIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdMb2dnaW5nIGluLi4uJylcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuZXhlYyhjb21tYW5kLCAnY2FwYWJpbGl0eScsIG9wdGlvbnMpXG4gICAgLypcbiAgICAgKiB1cGRhdGUgcG9zdC1hdXRoIGNhcGFiaWxpdGVzXG4gICAgICogY2FwYWJpbGl0eSBsaXN0IHNob3VsZG4ndCBjb250YWluIGF1dGggcmVsYXRlZCBzdHVmZiBhbnltb3JlXG4gICAgICogYnV0IHNvbWUgbmV3IGV4dGVuc2lvbnMgbWlnaHQgaGF2ZSBwb3BwZWQgdXAgdGhhdCBkbyBub3RcbiAgICAgKiBtYWtlIG11Y2ggc2Vuc2UgaW4gdGhlIG5vbi1hdXRoIHN0YXRlXG4gICAgICovXG4gICAgaWYgKHJlc3BvbnNlLmNhcGFiaWxpdHkgJiYgcmVzcG9uc2UuY2FwYWJpbGl0eS5sZW5ndGgpIHtcbiAgICAgIC8vIGNhcGFiaWxpdGVzIHdlcmUgbGlzdGVkIHdpdGggdGhlIE9LIFtDQVBBQklMSVRZIC4uLl0gcmVzcG9uc2VcbiAgICAgIHRoaXMuX2NhcGFiaWxpdHkgPSByZXNwb25zZS5jYXBhYmlsaXR5XG4gICAgfSBlbHNlIGlmIChyZXNwb25zZS5wYXlsb2FkICYmIHJlc3BvbnNlLnBheWxvYWQuQ0FQQUJJTElUWSAmJiByZXNwb25zZS5wYXlsb2FkLkNBUEFCSUxJVFkubGVuZ3RoKSB7XG4gICAgICAvLyBjYXBhYmlsaXRlcyB3ZXJlIGxpc3RlZCB3aXRoICogQ0FQQUJJTElUWSAuLi4gcmVzcG9uc2VcbiAgICAgIHRoaXMuX2NhcGFiaWxpdHkgPSByZXNwb25zZS5wYXlsb2FkLkNBUEFCSUxJVFkucG9wKCkuYXR0cmlidXRlcy5tYXAoKGNhcGEgPSAnJykgPT4gY2FwYS52YWx1ZS50b1VwcGVyQ2FzZSgpLnRyaW0oKSlcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gY2FwYWJpbGl0aWVzIHdlcmUgbm90IGF1dG9tYXRpY2FsbHkgbGlzdGVkLCByZWxvYWRcbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ2FwYWJpbGl0eSh0cnVlKVxuICAgIH1cblxuICAgIHRoaXMuX2NoYW5nZVN0YXRlKFNUQVRFX0FVVEhFTlRJQ0FURUQpXG4gICAgdGhpcy5fYXV0aGVudGljYXRlZCA9IHRydWVcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnTG9naW4gc3VjY2Vzc2Z1bCwgcG9zdC1hdXRoIGNhcGFiaWxpdGVzIHVwZGF0ZWQhJywgdGhpcy5fY2FwYWJpbGl0eSlcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW4gYW4gSU1BUCBjb21tYW5kLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gcmVxdWVzdCBTdHJ1Y3R1cmVkIHJlcXVlc3Qgb2JqZWN0XG4gICAqIEBwYXJhbSB7QXJyYXl9IGFjY2VwdFVudGFnZ2VkIGEgbGlzdCBvZiB1bnRhZ2dlZCByZXNwb25zZXMgdGhhdCB3aWxsIGJlIGluY2x1ZGVkIGluICdwYXlsb2FkJyBwcm9wZXJ0eVxuICAgKi9cbiAgYXN5bmMgZXhlYyAocmVxdWVzdCwgYWNjZXB0VW50YWdnZWQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLmJyZWFrSWRsZSgpXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmNsaWVudC5lbnF1ZXVlQ29tbWFuZChyZXF1ZXN0LCBhY2NlcHRVbnRhZ2dlZCwgb3B0aW9ucylcbiAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UuY2FwYWJpbGl0eSkge1xuICAgICAgdGhpcy5fY2FwYWJpbGl0eSA9IHJlc3BvbnNlLmNhcGFiaWxpdHlcbiAgICB9XG4gICAgcmV0dXJuIHJlc3BvbnNlXG4gIH1cblxuICAvKipcbiAgICogVGhlIGNvbm5lY3Rpb24gaXMgaWRsaW5nLiBTZW5kcyBhIE5PT1Agb3IgSURMRSBjb21tYW5kXG4gICAqXG4gICAqIElETEUgZGV0YWlsczpcbiAgICogICBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMjE3N1xuICAgKi9cbiAgZW50ZXJJZGxlICgpIHtcbiAgICBpZiAodGhpcy5fZW50ZXJlZElkbGUpIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICB0aGlzLl9lbnRlcmVkSWRsZSA9IHRoaXMuX2NhcGFiaWxpdHkuaW5kZXhPZignSURMRScpID49IDAgPyAnSURMRScgOiAnTk9PUCdcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnRW50ZXJpbmcgaWRsZSB3aXRoICcgKyB0aGlzLl9lbnRlcmVkSWRsZSlcblxuICAgIGlmICh0aGlzLl9lbnRlcmVkSWRsZSA9PT0gJ05PT1AnKSB7XG4gICAgICB0aGlzLl9pZGxlVGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnU2VuZGluZyBOT09QJylcbiAgICAgICAgdGhpcy5leGVjKCdOT09QJylcbiAgICAgIH0sIHRoaXMudGltZW91dE5vb3ApXG4gICAgfSBlbHNlIGlmICh0aGlzLl9lbnRlcmVkSWRsZSA9PT0gJ0lETEUnKSB7XG4gICAgICB0aGlzLmNsaWVudC5lbnF1ZXVlQ29tbWFuZCh7XG4gICAgICAgIGNvbW1hbmQ6ICdJRExFJ1xuICAgICAgfSlcbiAgICAgIHRoaXMuX2lkbGVUaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRoaXMuY2xpZW50LnNlbmQoJ0RPTkVcXHJcXG4nKVxuICAgICAgICB0aGlzLl9lbnRlcmVkSWRsZSA9IGZhbHNlXG4gICAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdJZGxlIHRlcm1pbmF0ZWQnKVxuICAgICAgfSwgdGhpcy50aW1lb3V0SWRsZSlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU3RvcHMgYWN0aW9ucyByZWxhdGVkIGlkbGluZywgaWYgSURMRSBpcyBzdXBwb3J0ZWQsIHNlbmRzIERPTkUgdG8gc3RvcCBpdFxuICAgKi9cbiAgYnJlYWtJZGxlICgpIHtcbiAgICBpZiAoIXRoaXMuX2VudGVyZWRJZGxlKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjbGVhclRpbWVvdXQodGhpcy5faWRsZVRpbWVvdXQpXG4gICAgaWYgKHRoaXMuX2VudGVyZWRJZGxlID09PSAnSURMRScpIHtcbiAgICAgIHRoaXMuY2xpZW50LnNlbmQoJ0RPTkVcXHJcXG4nKVxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ0lkbGUgdGVybWluYXRlZCcpXG4gICAgfVxuICAgIHRoaXMuX2VudGVyZWRJZGxlID0gZmFsc2VcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIFNUQVJUVExTIGNvbW1hbmQgaWYgbmVlZGVkXG4gICAqXG4gICAqIFNUQVJUVExTIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuMi4xXG4gICAqXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW2ZvcmNlZF0gQnkgZGVmYXVsdCB0aGUgY29tbWFuZCBpcyBub3QgcnVuIGlmIGNhcGFiaWxpdHkgaXMgYWxyZWFkeSBsaXN0ZWQuIFNldCB0byB0cnVlIHRvIHNraXAgdGhpcyB2YWxpZGF0aW9uXG4gICAqL1xuICBhc3luYyB1cGdyYWRlQ29ubmVjdGlvbiAoKSB7XG4gICAgLy8gc2tpcCByZXF1ZXN0LCBpZiBhbHJlYWR5IHNlY3VyZWRcbiAgICBpZiAodGhpcy5jbGllbnQuc2VjdXJlTW9kZSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgLy8gc2tpcCBpZiBTVEFSVFRMUyBub3QgYXZhaWxhYmxlIG9yIHN0YXJ0dGxzIHN1cHBvcnQgZGlzYWJsZWRcbiAgICBpZiAoKHRoaXMuX2NhcGFiaWxpdHkuaW5kZXhPZignU1RBUlRUTFMnKSA8IDAgfHwgdGhpcy5faWdub3JlVExTKSAmJiAhdGhpcy5fcmVxdWlyZVRMUykge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0VuY3J5cHRpbmcgY29ubmVjdGlvbi4uLicpXG4gICAgYXdhaXQgdGhpcy5leGVjKCdTVEFSVFRMUycpXG4gICAgdGhpcy5fY2FwYWJpbGl0eSA9IFtdXG4gICAgdGhpcy5jbGllbnQudXBncmFkZSgpXG4gICAgcmV0dXJuIHRoaXMudXBkYXRlQ2FwYWJpbGl0eSgpXG4gIH1cblxuICAvKipcbiAgICogUnVucyBDQVBBQklMSVRZIGNvbW1hbmRcbiAgICpcbiAgICogQ0FQQUJJTElUWSBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjEuMVxuICAgKlxuICAgKiBEb2Vzbid0IHJlZ2lzdGVyIHVudGFnZ2VkIENBUEFCSUxJVFkgaGFuZGxlciBhcyB0aGlzIGlzIGFscmVhZHlcbiAgICogaGFuZGxlZCBieSBnbG9iYWwgaGFuZGxlclxuICAgKlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtmb3JjZWRdIEJ5IGRlZmF1bHQgdGhlIGNvbW1hbmQgaXMgbm90IHJ1biBpZiBjYXBhYmlsaXR5IGlzIGFscmVhZHkgbGlzdGVkLiBTZXQgdG8gdHJ1ZSB0byBza2lwIHRoaXMgdmFsaWRhdGlvblxuICAgKi9cbiAgYXN5bmMgdXBkYXRlQ2FwYWJpbGl0eSAoZm9yY2VkKSB7XG4gICAgLy8gc2tpcCByZXF1ZXN0LCBpZiBub3QgZm9yY2VkIHVwZGF0ZSBhbmQgY2FwYWJpbGl0aWVzIGFyZSBhbHJlYWR5IGxvYWRlZFxuICAgIGlmICghZm9yY2VkICYmIHRoaXMuX2NhcGFiaWxpdHkubGVuZ3RoKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBJZiBTVEFSVFRMUyBpcyByZXF1aXJlZCB0aGVuIHNraXAgY2FwYWJpbGl0eSBsaXN0aW5nIGFzIHdlIGFyZSBnb2luZyB0byB0cnlcbiAgICAvLyBTVEFSVFRMUyBhbnl3YXkgYW5kIHdlIHJlLWNoZWNrIGNhcGFiaWxpdGllcyBhZnRlciBjb25uZWN0aW9uIGlzIHNlY3VyZWRcbiAgICBpZiAoIXRoaXMuY2xpZW50LnNlY3VyZU1vZGUgJiYgdGhpcy5fcmVxdWlyZVRMUykge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ1VwZGF0aW5nIGNhcGFiaWxpdHkuLi4nKVxuICAgIHJldHVybiB0aGlzLmV4ZWMoJ0NBUEFCSUxJVFknKVxuICB9XG5cbiAgaGFzQ2FwYWJpbGl0eSAoY2FwYSA9ICcnKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NhcGFiaWxpdHkuaW5kZXhPZihjYXBhLnRvVXBwZXJDYXNlKCkudHJpbSgpKSA+PSAwXG4gIH1cblxuICAvLyBEZWZhdWx0IGhhbmRsZXJzIGZvciB1bnRhZ2dlZCByZXNwb25zZXNcblxuICAvKipcbiAgICogQ2hlY2tzIGlmIGFuIHVudGFnZ2VkIE9LIGluY2x1ZGVzIFtDQVBBQklMSVRZXSB0YWcgYW5kIHVwZGF0ZXMgY2FwYWJpbGl0eSBvYmplY3RcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIFBhcnNlZCBzZXJ2ZXIgcmVzcG9uc2VcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gbmV4dCBVbnRpbCBjYWxsZWQsIHNlcnZlciByZXNwb25zZXMgYXJlIG5vdCBwcm9jZXNzZWRcbiAgICovXG4gIF91bnRhZ2dlZE9rSGFuZGxlciAocmVzcG9uc2UpIHtcbiAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UuY2FwYWJpbGl0eSkge1xuICAgICAgdGhpcy5fY2FwYWJpbGl0eSA9IHJlc3BvbnNlLmNhcGFiaWxpdHlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyBjYXBhYmlsaXR5IG9iamVjdFxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgUGFyc2VkIHNlcnZlciByZXNwb25zZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBuZXh0IFVudGlsIGNhbGxlZCwgc2VydmVyIHJlc3BvbnNlcyBhcmUgbm90IHByb2Nlc3NlZFxuICAgKi9cbiAgX3VudGFnZ2VkQ2FwYWJpbGl0eUhhbmRsZXIgKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5fY2FwYWJpbGl0eSA9IHBpcGUoXG4gICAgICBwcm9wT3IoW10sICdhdHRyaWJ1dGVzJyksXG4gICAgICBtYXAoKHsgdmFsdWUgfSkgPT4gKHZhbHVlIHx8ICcnKS50b1VwcGVyQ2FzZSgpLnRyaW0oKSlcbiAgICApKHJlc3BvbnNlKVxuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgZXhpc3RpbmcgbWVzc2FnZSBjb3VudFxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgUGFyc2VkIHNlcnZlciByZXNwb25zZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBuZXh0IFVudGlsIGNhbGxlZCwgc2VydmVyIHJlc3BvbnNlcyBhcmUgbm90IHByb2Nlc3NlZFxuICAgKi9cbiAgX3VudGFnZ2VkRXhpc3RzSGFuZGxlciAocmVzcG9uc2UpIHtcbiAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UuaGFzT3duUHJvcGVydHkoJ25yJykpIHtcbiAgICAgIHRoaXMub251cGRhdGUgJiYgdGhpcy5vbnVwZGF0ZSh0aGlzLl9zZWxlY3RlZE1haWxib3gsICdleGlzdHMnLCByZXNwb25zZS5ucilcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSW5kaWNhdGVzIGEgbWVzc2FnZSBoYXMgYmVlbiBkZWxldGVkXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSBQYXJzZWQgc2VydmVyIHJlc3BvbnNlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG5leHQgVW50aWwgY2FsbGVkLCBzZXJ2ZXIgcmVzcG9uc2VzIGFyZSBub3QgcHJvY2Vzc2VkXG4gICAqL1xuICBfdW50YWdnZWRFeHB1bmdlSGFuZGxlciAocmVzcG9uc2UpIHtcbiAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UuaGFzT3duUHJvcGVydHkoJ25yJykpIHtcbiAgICAgIHRoaXMub251cGRhdGUgJiYgdGhpcy5vbnVwZGF0ZSh0aGlzLl9zZWxlY3RlZE1haWxib3gsICdleHB1bmdlJywgcmVzcG9uc2UubnIpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEluZGljYXRlcyB0aGF0IGZsYWdzIGhhdmUgYmVlbiB1cGRhdGVkIGZvciBhIG1lc3NhZ2VcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIFBhcnNlZCBzZXJ2ZXIgcmVzcG9uc2VcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gbmV4dCBVbnRpbCBjYWxsZWQsIHNlcnZlciByZXNwb25zZXMgYXJlIG5vdCBwcm9jZXNzZWRcbiAgICovXG4gIF91bnRhZ2dlZEZldGNoSGFuZGxlciAocmVzcG9uc2UpIHtcbiAgICB0aGlzLm9udXBkYXRlICYmIHRoaXMub251cGRhdGUodGhpcy5fc2VsZWN0ZWRNYWlsYm94LCAnZmV0Y2gnLCBbXS5jb25jYXQocGFyc2VGRVRDSCh7IHBheWxvYWQ6IHsgRkVUQ0g6IFtyZXNwb25zZV0gfSB9KSB8fCBbXSkuc2hpZnQoKSlcbiAgfVxuXG4gIC8vIFByaXZhdGUgaGVscGVyc1xuXG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgdGhhdCB0aGUgY29ubmVjdGlvbiBzdGFydGVkIGlkbGluZy4gSW5pdGlhdGVzIGEgY3ljbGVcbiAgICogb2YgTk9PUHMgb3IgSURMRXMgdG8gcmVjZWl2ZSBub3RpZmljYXRpb25zIGFib3V0IHVwZGF0ZXMgaW4gdGhlIHNlcnZlclxuICAgKi9cbiAgX29uSWRsZSAoKSB7XG4gICAgaWYgKCF0aGlzLl9hdXRoZW50aWNhdGVkIHx8IHRoaXMuX2VudGVyZWRJZGxlKSB7XG4gICAgICAvLyBObyBuZWVkIHRvIElETEUgd2hlbiBub3QgbG9nZ2VkIGluIG9yIGFscmVhZHkgaWRsaW5nXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnQ2xpZW50IHN0YXJ0ZWQgaWRsaW5nJylcbiAgICB0aGlzLmVudGVySWRsZSgpXG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyB0aGUgSU1BUCBzdGF0ZSB2YWx1ZSBmb3IgdGhlIGN1cnJlbnQgY29ubmVjdGlvblxuICAgKlxuICAgKiBAcGFyYW0ge051bWJlcn0gbmV3U3RhdGUgVGhlIHN0YXRlIHlvdSB3YW50IHRvIGNoYW5nZSB0b1xuICAgKi9cbiAgX2NoYW5nZVN0YXRlIChuZXdTdGF0ZSkge1xuICAgIGlmIChuZXdTdGF0ZSA9PT0gdGhpcy5fc3RhdGUpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdFbnRlcmluZyBzdGF0ZTogJyArIG5ld1N0YXRlKVxuXG4gICAgLy8gaWYgYSBtYWlsYm94IHdhcyBvcGVuZWQsIGVtaXQgb25jbG9zZW1haWxib3ggYW5kIGNsZWFyIHNlbGVjdGVkTWFpbGJveCB2YWx1ZVxuICAgIGlmICh0aGlzLl9zdGF0ZSA9PT0gU1RBVEVfU0VMRUNURUQgJiYgdGhpcy5fc2VsZWN0ZWRNYWlsYm94KSB7XG4gICAgICB0aGlzLm9uY2xvc2VtYWlsYm94ICYmIHRoaXMub25jbG9zZW1haWxib3godGhpcy5fc2VsZWN0ZWRNYWlsYm94KVxuICAgICAgdGhpcy5fc2VsZWN0ZWRNYWlsYm94ID0gZmFsc2VcbiAgICB9XG5cbiAgICB0aGlzLl9zdGF0ZSA9IG5ld1N0YXRlXG4gIH1cblxuICAvKipcbiAgICogRW5zdXJlcyBhIHBhdGggZXhpc3RzIGluIHRoZSBNYWlsYm94IHRyZWVcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHRyZWUgTWFpbGJveCB0cmVlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBkZWxpbWl0ZXJcbiAgICogQHJldHVybiB7T2JqZWN0fSBicmFuY2ggZm9yIHVzZWQgcGF0aFxuICAgKi9cbiAgX2Vuc3VyZVBhdGggKHRyZWUsIHBhdGgsIGRlbGltaXRlcikge1xuICAgIGNvbnN0IG5hbWVzID0gcGF0aC5zcGxpdChkZWxpbWl0ZXIpXG4gICAgbGV0IGJyYW5jaCA9IHRyZWVcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCBmb3VuZCA9IGZhbHNlXG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGJyYW5jaC5jaGlsZHJlbi5sZW5ndGg7IGorKykge1xuICAgICAgICBpZiAodGhpcy5fY29tcGFyZU1haWxib3hOYW1lcyhicmFuY2guY2hpbGRyZW5bal0ubmFtZSwgaW1hcERlY29kZShuYW1lc1tpXSkpKSB7XG4gICAgICAgICAgYnJhbmNoID0gYnJhbmNoLmNoaWxkcmVuW2pdXG4gICAgICAgICAgZm91bmQgPSB0cnVlXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFmb3VuZCkge1xuICAgICAgICBicmFuY2guY2hpbGRyZW4ucHVzaCh7XG4gICAgICAgICAgbmFtZTogaW1hcERlY29kZShuYW1lc1tpXSksXG4gICAgICAgICAgZGVsaW1pdGVyOiBkZWxpbWl0ZXIsXG4gICAgICAgICAgcGF0aDogbmFtZXMuc2xpY2UoMCwgaSArIDEpLmpvaW4oZGVsaW1pdGVyKSxcbiAgICAgICAgICBjaGlsZHJlbjogW11cbiAgICAgICAgfSlcbiAgICAgICAgYnJhbmNoID0gYnJhbmNoLmNoaWxkcmVuW2JyYW5jaC5jaGlsZHJlbi5sZW5ndGggLSAxXVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYnJhbmNoXG4gIH1cblxuICAvKipcbiAgICogQ29tcGFyZXMgdHdvIG1haWxib3ggbmFtZXMuIENhc2UgaW5zZW5zaXRpdmUgaW4gY2FzZSBvZiBJTkJPWCwgb3RoZXJ3aXNlIGNhc2Ugc2Vuc2l0aXZlXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBhIE1haWxib3ggbmFtZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gYiBNYWlsYm94IG5hbWVcbiAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGZvbGRlciBuYW1lcyBtYXRjaFxuICAgKi9cbiAgX2NvbXBhcmVNYWlsYm94TmFtZXMgKGEsIGIpIHtcbiAgICByZXR1cm4gKGEudG9VcHBlckNhc2UoKSA9PT0gJ0lOQk9YJyA/ICdJTkJPWCcgOiBhKSA9PT0gKGIudG9VcHBlckNhc2UoKSA9PT0gJ0lOQk9YJyA/ICdJTkJPWCcgOiBiKVxuICB9XG5cbiAgY3JlYXRlTG9nZ2VyIChjcmVhdG9yID0gY3JlYXRlRGVmYXVsdExvZ2dlcikge1xuICAgIGNvbnN0IGxvZ2dlciA9IGNyZWF0b3IoKHRoaXMuX2F1dGggfHwge30pLnVzZXIgfHwgJycsIHRoaXMuX2hvc3QpXG4gICAgdGhpcy5sb2dnZXIgPSB0aGlzLmNsaWVudC5sb2dnZXIgPSB7XG4gICAgICBkZWJ1ZzogKC4uLm1zZ3MpID0+IHsgaWYgKExPR19MRVZFTF9ERUJVRyA+PSB0aGlzLmxvZ0xldmVsKSB7IGxvZ2dlci5kZWJ1Zyhtc2dzKSB9IH0sXG4gICAgICBpbmZvOiAoLi4ubXNncykgPT4geyBpZiAoTE9HX0xFVkVMX0lORk8gPj0gdGhpcy5sb2dMZXZlbCkgeyBsb2dnZXIuaW5mbyhtc2dzKSB9IH0sXG4gICAgICB3YXJuOiAoLi4ubXNncykgPT4geyBpZiAoTE9HX0xFVkVMX1dBUk4gPj0gdGhpcy5sb2dMZXZlbCkgeyBsb2dnZXIud2Fybihtc2dzKSB9IH0sXG4gICAgICBlcnJvcjogKC4uLm1zZ3MpID0+IHsgaWYgKExPR19MRVZFTF9FUlJPUiA+PSB0aGlzLmxvZ0xldmVsKSB7IGxvZ2dlci5lcnJvcihtc2dzKSB9IH1cbiAgICB9XG4gIH1cbn1cbiJdfQ==