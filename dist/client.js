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

        _this.close(err); // we don't really care whether this works or not


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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jbGllbnQuanMiXSwibmFtZXMiOlsiVElNRU9VVF9DT05ORUNUSU9OIiwiVElNRU9VVF9OT09QIiwiVElNRU9VVF9JRExFIiwiU1RBVEVfQ09OTkVDVElORyIsIlNUQVRFX05PVF9BVVRIRU5USUNBVEVEIiwiU1RBVEVfQVVUSEVOVElDQVRFRCIsIlNUQVRFX1NFTEVDVEVEIiwiU1RBVEVfTE9HT1VUIiwiREVGQVVMVF9DTElFTlRfSUQiLCJuYW1lIiwiQ2xpZW50IiwiY29uc3RydWN0b3IiLCJob3N0IiwicG9ydCIsIm9wdGlvbnMiLCJ0aW1lb3V0Q29ubmVjdGlvbiIsInRpbWVvdXROb29wIiwidGltZW91dElkbGUiLCJzZXJ2ZXJJZCIsIm9uY2VydCIsIm9udXBkYXRlIiwib25zZWxlY3RtYWlsYm94Iiwib25jbG9zZW1haWxib3giLCJfaG9zdCIsIl9jbGllbnRJZCIsIl9zdGF0ZSIsIl9hdXRoZW50aWNhdGVkIiwiX2NhcGFiaWxpdHkiLCJfc2VsZWN0ZWRNYWlsYm94IiwiX2VudGVyZWRJZGxlIiwiX2lkbGVUaW1lb3V0IiwiX2VuYWJsZUNvbXByZXNzaW9uIiwiZW5hYmxlQ29tcHJlc3Npb24iLCJfYXV0aCIsImF1dGgiLCJfcmVxdWlyZVRMUyIsInJlcXVpcmVUTFMiLCJfaWdub3JlVExTIiwiaWdub3JlVExTIiwiY2xpZW50IiwiSW1hcENsaWVudCIsIm9uZXJyb3IiLCJfb25FcnJvciIsImJpbmQiLCJjZXJ0Iiwib25pZGxlIiwiX29uSWRsZSIsInNldEhhbmRsZXIiLCJyZXNwb25zZSIsIl91bnRhZ2dlZENhcGFiaWxpdHlIYW5kbGVyIiwiX3VudGFnZ2VkT2tIYW5kbGVyIiwiX3VudGFnZ2VkRXhpc3RzSGFuZGxlciIsIl91bnRhZ2dlZEV4cHVuZ2VIYW5kbGVyIiwiX3VudGFnZ2VkRmV0Y2hIYW5kbGVyIiwiY3JlYXRlTG9nZ2VyIiwibG9nTGV2ZWwiLCJMT0dfTEVWRUxfQUxMIiwiZXJyIiwiY2xlYXJUaW1lb3V0IiwiY29ubmVjdCIsIl9vcGVuQ29ubmVjdGlvbiIsIl9jaGFuZ2VTdGF0ZSIsInVwZGF0ZUNhcGFiaWxpdHkiLCJ1cGdyYWRlQ29ubmVjdGlvbiIsInVwZGF0ZUlkIiwibG9nZ2VyIiwid2FybiIsIm1lc3NhZ2UiLCJsb2dpbiIsImNvbXByZXNzQ29ubmVjdGlvbiIsImRlYnVnIiwiZXJyb3IiLCJjbG9zZSIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiY29ubmVjdGlvblRpbWVvdXQiLCJzZXRUaW1lb3V0IiwiRXJyb3IiLCJ0aGVuIiwib25yZWFkeSIsImNhdGNoIiwibG9nb3V0IiwiaWQiLCJpbmRleE9mIiwiY29tbWFuZCIsImF0dHJpYnV0ZXMiLCJPYmplY3QiLCJlbnRyaWVzIiwiZXhlYyIsImxpc3QiLCJtYXAiLCJ2YWx1ZXMiLCJrZXlzIiwiZmlsdGVyIiwiXyIsImkiLCJfc2hvdWxkU2VsZWN0TWFpbGJveCIsInBhdGgiLCJjdHgiLCJwcmV2aW91c1NlbGVjdCIsImdldFByZXZpb3VzbHlRdWV1ZWQiLCJyZXF1ZXN0IiwicGF0aEF0dHJpYnV0ZSIsImZpbmQiLCJhdHRyaWJ1dGUiLCJ0eXBlIiwidmFsdWUiLCJzZWxlY3RNYWlsYm94IiwicXVlcnkiLCJyZWFkT25seSIsImNvbmRzdG9yZSIsInB1c2giLCJtYWlsYm94SW5mbyIsImxpc3ROYW1lc3BhY2VzIiwibGlzdE1haWxib3hlcyIsInRyZWUiLCJyb290IiwiY2hpbGRyZW4iLCJsaXN0UmVzcG9uc2UiLCJmb3JFYWNoIiwiaXRlbSIsImF0dHIiLCJsZW5ndGgiLCJkZWxpbSIsImJyYW5jaCIsIl9lbnN1cmVQYXRoIiwiZmxhZ3MiLCJsaXN0ZWQiLCJsc3ViUmVzcG9uc2UiLCJsc3ViIiwiZmxhZyIsInN1YnNjcmliZWQiLCJjcmVhdGVNYWlsYm94IiwiY29kZSIsImRlbGV0ZU1haWxib3giLCJsaXN0TWVzc2FnZXMiLCJzZXF1ZW5jZSIsIml0ZW1zIiwiZmFzdCIsInByZWNoZWNrIiwic2VhcmNoIiwic2V0RmxhZ3MiLCJrZXkiLCJBcnJheSIsImlzQXJyYXkiLCJjb25jYXQiLCJhZGQiLCJzZXQiLCJyZW1vdmUiLCJzdG9yZSIsImFjdGlvbiIsInVwbG9hZCIsImRlc3RpbmF0aW9uIiwiZGVsZXRlTWVzc2FnZXMiLCJ1c2VVaWRQbHVzIiwiYnlVaWQiLCJ1aWRFeHB1bmdlQ29tbWFuZCIsImNtZCIsImNvcHlNZXNzYWdlcyIsImh1bWFuUmVhZGFibGUiLCJtb3ZlTWVzc2FnZXMiLCJjb21wcmVzc2VkIiwieG9hdXRoMiIsInVzZXIiLCJzZW5zaXRpdmUiLCJlcnJvclJlc3BvbnNlRXhwZWN0c0VtcHR5TGluZSIsInBhc3MiLCJjYXBhYmlsaXR5IiwicGF5bG9hZCIsIkNBUEFCSUxJVFkiLCJwb3AiLCJjYXBhIiwidG9VcHBlckNhc2UiLCJ0cmltIiwiYWNjZXB0VW50YWdnZWQiLCJicmVha0lkbGUiLCJlbnF1ZXVlQ29tbWFuZCIsImVudGVySWRsZSIsInNlbmQiLCJzZWN1cmVNb2RlIiwidXBncmFkZSIsImZvcmNlZCIsImhhc0NhcGFiaWxpdHkiLCJoYXNPd25Qcm9wZXJ0eSIsIm5yIiwiRkVUQ0giLCJzaGlmdCIsIm5ld1N0YXRlIiwiZGVsaW1pdGVyIiwibmFtZXMiLCJzcGxpdCIsImZvdW5kIiwiaiIsIl9jb21wYXJlTWFpbGJveE5hbWVzIiwic2xpY2UiLCJqb2luIiwiYSIsImIiLCJjcmVhdG9yIiwiY3JlYXRlRGVmYXVsdExvZ2dlciIsIm1zZ3MiLCJMT0dfTEVWRUxfREVCVUciLCJpbmZvIiwiTE9HX0xFVkVMX0lORk8iLCJMT0dfTEVWRUxfV0FSTiIsIkxPR19MRVZFTF9FUlJPUiJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOztBQUNBOztBQU1BOztBQU9BOztBQUNBOztBQUNBOztBQVFBOzs7Ozs7OztBQUlPLE1BQU1BLGtCQUFrQixHQUFHLEtBQUssSUFBaEMsQyxDQUFxQzs7O0FBQ3JDLE1BQU1DLFlBQVksR0FBRyxLQUFLLElBQTFCLEMsQ0FBK0I7OztBQUMvQixNQUFNQyxZQUFZLEdBQUcsS0FBSyxJ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QUswQyxNQUFMLEdBQWMsS0FBSzFCLE1BQUwsQ0FBWTBCLE1BQVosR0FBcUI7QUFDakNLLE1BQUFBLEtBQUssRUFBRSxDQUFDLEdBQUdtSSxJQUFKLEtBQWE7QUFBRSxZQUFJQywyQkFBbUIsS0FBS25KLFFBQTVCLEVBQXNDO0FBQUVVLFVBQUFBLE1BQU0sQ0FBQ0ssS0FBUCxDQUFhbUksSUFBYjtBQUFvQjtBQUFFLE9BRG5EO0FBRWpDRSxNQUFBQSxJQUFJLEVBQUUsQ0FBQyxHQUFHRixJQUFKLEtBQWE7QUFBRSxZQUFJRywwQkFBa0IsS0FBS3JKLFFBQTNCLEVBQXFDO0FBQUVVLFVBQUFBLE1BQU0sQ0FBQzBJLElBQVAsQ0FBWUYsSUFBWjtBQUFtQjtBQUFFLE9BRmhEO0FBR2pDdkksTUFBQUEsSUFBSSxFQUFFLENBQUMsR0FBR3VJLElBQUosS0FBYTtBQUFFLFlBQUlJLDBCQUFrQixLQUFLdEosUUFBM0IsRUFBcUM7QUFBRVUsVUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVl1SSxJQUFaO0FBQW1CO0FBQUUsT0FIaEQ7QUFJakNsSSxNQUFBQSxLQUFLLEVBQUUsQ0FBQyxHQUFHa0ksSUFBSixLQUFhO0FBQUUsWUFBSUssMkJBQW1CLEtBQUt2SixRQUE1QixFQUFzQztBQUFFVSxVQUFBQSxNQUFNLENBQUNNLEtBQVAsQ0FBYWtJLElBQWI7QUFBb0I7QUFBRTtBQUpuRCxLQUFuQztBQU1EOztBQXA0QnlCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgbWFwLCBwaXBlLCB1bmlvbiwgemlwLCBmcm9tUGFpcnMsIHByb3BPciwgcGF0aE9yLCBmbGF0dGVuIH0gZnJvbSAncmFtZGEnXG5pbXBvcnQgeyBpbWFwRW5jb2RlLCBpbWFwRGVjb2RlIH0gZnJvbSAnZW1haWxqcy11dGY3J1xuaW1wb3J0IHtcbiAgcGFyc2VOQU1FU1BBQ0UsXG4gIHBhcnNlU0VMRUNULFxuICBwYXJzZUZFVENILFxuICBwYXJzZVNFQVJDSFxufSBmcm9tICcuL2NvbW1hbmQtcGFyc2VyJ1xuaW1wb3J0IHtcbiAgYnVpbGRGRVRDSENvbW1hbmQsXG4gIGJ1aWxkWE9BdXRoMlRva2VuLFxuICBidWlsZFNFQVJDSENvbW1hbmQsXG4gIGJ1aWxkU1RPUkVDb21tYW5kXG59IGZyb20gJy4vY29tbWFuZC1idWlsZGVyJ1xuXG5pbXBvcnQgY3JlYXRlRGVmYXVsdExvZ2dlciBmcm9tICcuL2xvZ2dlcidcbmltcG9ydCBJbWFwQ2xpZW50IGZyb20gJy4vaW1hcCdcbmltcG9ydCB7XG4gIExPR19MRVZFTF9FUlJPUixcbiAgTE9HX0xFVkVMX1dBUk4sXG4gIExPR19MRVZFTF9JTkZPLFxuICBMT0dfTEVWRUxfREVCVUcsXG4gIExPR19MRVZFTF9BTExcbn0gZnJvbSAnLi9jb21tb24nXG5cbmltcG9ydCB7XG4gIGNoZWNrU3BlY2lhbFVzZVxufSBmcm9tICcuL3NwZWNpYWwtdXNlJ1xuXG5leHBvcnQgY29uc3QgVElNRU9VVF9DT05ORUNUSU9OID0gOTAgKiAxMDAwIC8vIE1pbGxpc2Vjb25kcyB0byB3YWl0IGZvciB0aGUgSU1BUCBncmVldGluZyBmcm9tIHRoZSBzZXJ2ZXJcbmV4cG9ydCBjb25zdCBUSU1FT1VUX05PT1AgPSA2MCAqIDEwMDAgLy8gTWlsbGlzZWNvbmRzIGJldHdlZW4gTk9PUCBjb21tYW5kcyB3aGlsZSBpZGxpbmdcbmV4cG9ydCBjb25zdCBUSU1FT1VUX0lETEUgPSA2MCAqIDEwMDAgLy8gTWlsbGlzZWNvbmRzIHVudGlsIElETEUgY29tbWFuZCBpcyBjYW5jZWxsZWRcblxuZXhwb3J0IGNvbnN0IFNUQVRFX0NPTk5FQ1RJTkcgPSAxXG5leHBvcnQgY29uc3QgU1RBVEVfTk9UX0FVVEhFTlRJQ0FURUQgPSAyXG5leHBvcnQgY29uc3QgU1RBVEVfQVVUSEVOVElDQVRFRCA9IDNcbmV4cG9ydCBjb25zdCBTVEFURV9TRUxFQ1RFRCA9IDRcbmV4cG9ydCBjb25zdCBTVEFURV9MT0dPVVQgPSA1XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX0NMSUVOVF9JRCA9IHtcbiAgbmFtZTogJ2VtYWlsanMtaW1hcC1jbGllbnQnXG59XG5cbi8qKlxuICogZW1haWxqcyBJTUFQIGNsaWVudFxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBbaG9zdD0nbG9jYWxob3N0J10gSG9zdG5hbWUgdG8gY29uZW5jdCB0b1xuICogQHBhcmFtIHtOdW1iZXJ9IFtwb3J0PTE0M10gUG9ydCBudW1iZXIgdG8gY29ubmVjdCB0b1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBPcHRpb25hbCBvcHRpb25zIG9iamVjdFxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDbGllbnQge1xuICBjb25zdHJ1Y3RvciAoaG9zdCwgcG9ydCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy50aW1lb3V0Q29ubmVjdGlvbiA9IFRJTUVPVVRfQ09OTkVDVElPTlxuICAgIHRoaXMudGltZW91dE5vb3AgPSBUSU1FT1VUX05PT1BcbiAgICB0aGlzLnRpbWVvdXRJZGxlID0gVElNRU9VVF9JRExFXG5cbiAgICB0aGlzLnNlcnZlcklkID0gZmFsc2UgLy8gUkZDIDI5NzEgU2VydmVyIElEIGFzIGtleSB2YWx1ZSBwYWlyc1xuXG4gICAgLy8gRXZlbnQgcGxhY2Vob2xkZXJzXG4gICAgdGhpcy5vbmNlcnQgPSBudWxsXG4gICAgdGhpcy5vbnVwZGF0ZSA9IG51bGxcbiAgICB0aGlzLm9uc2VsZWN0bWFpbGJveCA9IG51bGxcbiAgICB0aGlzLm9uY2xvc2VtYWlsYm94ID0gbnVsbFxuXG4gICAgdGhpcy5faG9zdCA9IGhvc3RcbiAgICB0aGlzLl9jbGllbnRJZCA9IHByb3BPcihERUZBVUxUX0NMSUVOVF9JRCwgJ2lkJywgb3B0aW9ucylcbiAgICB0aGlzLl9zdGF0ZSA9IGZhbHNlIC8vIEN1cnJlbnQgc3RhdGVcbiAgICB0aGlzLl9hdXRoZW50aWNhdGVkID0gZmFsc2UgLy8gSXMgdGhlIGNvbm5lY3Rpb24gYXV0aGVudGljYXRlZFxuICAgIHRoaXMuX2NhcGFiaWxpdHkgPSBbXSAvLyBMaXN0IG9mIGV4dGVuc2lvbnMgdGhlIHNlcnZlciBzdXBwb3J0c1xuICAgIHRoaXMuX3NlbGVjdGVkTWFpbGJveCA9IGZhbHNlIC8vIFNlbGVjdGVkIG1haWxib3hcbiAgICB0aGlzLl9lbnRlcmVkSWRsZSA9IGZhbHNlXG4gICAgdGhpcy5faWRsZVRpbWVvdXQgPSBmYWxzZVxuICAgIHRoaXMuX2VuYWJsZUNvbXByZXNzaW9uID0gISFvcHRpb25zLmVuYWJsZUNvbXByZXNzaW9uXG4gICAgdGhpcy5fYXV0aCA9IG9wdGlvbnMuYXV0aFxuICAgIHRoaXMuX3JlcXVpcmVUTFMgPSAhIW9wdGlvbnMucmVxdWlyZVRMU1xuICAgIHRoaXMuX2lnbm9yZVRMUyA9ICEhb3B0aW9ucy5pZ25vcmVUTFNcblxuICAgIHRoaXMuY2xpZW50ID0gbmV3IEltYXBDbGllbnQoaG9zdCwgcG9ydCwgb3B0aW9ucykgLy8gSU1BUCBjbGllbnQgb2JqZWN0XG5cbiAgICAvLyBFdmVudCBIYW5kbGVyc1xuICAgIHRoaXMuY2xpZW50Lm9uZXJyb3IgPSB0aGlzLl9vbkVycm9yLmJpbmQodGhpcylcbiAgICB0aGlzLmNsaWVudC5vbmNlcnQgPSAoY2VydCkgPT4gKHRoaXMub25jZXJ0ICYmIHRoaXMub25jZXJ0KGNlcnQpKSAvLyBhbGxvd3MgY2VydGlmaWNhdGUgaGFuZGxpbmcgZm9yIHBsYXRmb3JtcyB3L28gbmF0aXZlIHRscyBzdXBwb3J0XG4gICAgdGhpcy5jbGllbnQub25pZGxlID0gKCkgPT4gdGhpcy5fb25JZGxlKCkgLy8gc3RhcnQgaWRsaW5nXG5cbiAgICAvLyBEZWZhdWx0IGhhbmRsZXJzIGZvciB1bnRhZ2dlZCByZXNwb25zZXNcbiAgICB0aGlzLmNsaWVudC5zZXRIYW5kbGVyKCdjYXBhYmlsaXR5JywgKHJlc3BvbnNlKSA9PiB0aGlzLl91bnRhZ2dlZENhcGFiaWxpdHlIYW5kbGVyKHJlc3BvbnNlKSkgLy8gY2FwYWJpbGl0eSB1cGRhdGVzXG4gICAgdGhpcy5jbGllbnQuc2V0SGFuZGxlcignb2snLCAocmVzcG9uc2UpID0+IHRoaXMuX3VudGFnZ2VkT2tIYW5kbGVyKHJlc3BvbnNlKSkgLy8gbm90aWZpY2F0aW9uc1xuICAgIHRoaXMuY2xpZW50LnNldEhhbmRsZXIoJ2V4aXN0cycsIChyZXNwb25zZSkgPT4gdGhpcy5fdW50YWdnZWRFeGlzdHNIYW5kbGVyKHJlc3BvbnNlKSkgLy8gbWVzc2FnZSBjb3VudCBoYXMgY2hhbmdlZFxuICAgIHRoaXMuY2xpZW50LnNldEhhbmRsZXIoJ2V4cHVuZ2UnLCAocmVzcG9uc2UpID0+IHRoaXMuX3VudGFnZ2VkRXhwdW5nZUhhbmRsZXIocmVzcG9uc2UpKSAvLyBtZXNzYWdlIGhhcyBiZWVuIGRlbGV0ZWRcbiAgICB0aGlzLmNsaWVudC5zZXRIYW5kbGVyKCdmZXRjaCcsIChyZXNwb25zZSkgPT4gdGhpcy5fdW50YWdnZWRGZXRjaEhhbmRsZXIocmVzcG9uc2UpKSAvLyBtZXNzYWdlIGhhcyBiZWVuIHVwZGF0ZWQgKGVnLiBmbGFnIGNoYW5nZSlcblxuICAgIC8vIEFjdGl2YXRlIGxvZ2dpbmdcbiAgICB0aGlzLmNyZWF0ZUxvZ2dlcigpXG4gICAgdGhpcy5sb2dMZXZlbCA9IHByb3BPcihMT0dfTEVWRUxfQUxMLCAnbG9nTGV2ZWwnLCBvcHRpb25zKVxuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCBpZiB0aGUgbG93ZXItbGV2ZWwgSW1hcENsaWVudCBoYXMgZW5jb3VudGVyZWQgYW4gdW5yZWNvdmVyYWJsZVxuICAgKiBlcnJvciBkdXJpbmcgb3BlcmF0aW9uLiBDbGVhbnMgdXAgYW5kIHByb3BhZ2F0ZXMgdGhlIGVycm9yIHVwd2FyZHMuXG4gICAqL1xuICBfb25FcnJvciAoZXJyKSB7XG4gICAgLy8gbWFrZSBzdXJlIG5vIGlkbGUgdGltZW91dCBpcyBwZW5kaW5nIGFueW1vcmVcbiAgICBjbGVhclRpbWVvdXQodGhpcy5faWRsZVRpbWVvdXQpXG5cbiAgICAvLyBwcm9wYWdhdGUgdGhlIGVycm9yIHVwd2FyZHNcbiAgICB0aGlzLm9uZXJyb3IgJiYgdGhpcy5vbmVycm9yKGVycilcbiAgfVxuXG4gIC8vXG4gIC8vXG4gIC8vIFBVQkxJQyBBUElcbiAgLy9cbiAgLy9cblxuICAvKipcbiAgICogSW5pdGlhdGUgY29ubmVjdGlvbiB0byB0aGUgSU1BUCBzZXJ2ZXJcbiAgICpcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2hlbiBsb2dpbiBwcm9jZWR1cmUgaXMgY29tcGxldGVcbiAgICovXG4gIGFzeW5jIGNvbm5lY3QgKCkge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLl9vcGVuQ29ubmVjdGlvbigpXG4gICAgICB0aGlzLl9jaGFuZ2VTdGF0ZShTVEFURV9OT1RfQVVUSEVOVElDQVRFRClcbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ2FwYWJpbGl0eSgpXG4gICAgICBhd2FpdCB0aGlzLnVwZ3JhZGVDb25uZWN0aW9uKClcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMudXBkYXRlSWQodGhpcy5fY2xpZW50SWQpXG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybignRmFpbGVkIHRvIHVwZGF0ZSBzZXJ2ZXIgaWQhJywgZXJyLm1lc3NhZ2UpXG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMubG9naW4odGhpcy5fYXV0aClcbiAgICAgIGF3YWl0IHRoaXMuY29tcHJlc3NDb25uZWN0aW9uKClcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdDb25uZWN0aW9uIGVzdGFibGlzaGVkLCByZWFkeSB0byByb2xsIScpXG4gICAgICB0aGlzLmNsaWVudC5vbmVycm9yID0gdGhpcy5fb25FcnJvci5iaW5kKHRoaXMpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignQ291bGQgbm90IGNvbm5lY3QgdG8gc2VydmVyJywgZXJyKVxuICAgICAgdGhpcy5jbG9zZShlcnIpIC8vIHdlIGRvbid0IHJlYWxseSBjYXJlIHdoZXRoZXIgdGhpcyB3b3JrcyBvciBub3RcbiAgICAgIHRocm93IGVyclxuICAgIH1cbiAgfVxuXG4gIF9vcGVuQ29ubmVjdGlvbiAoKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGxldCBjb25uZWN0aW9uVGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gcmVqZWN0KG5ldyBFcnJvcignVGltZW91dCBjb25uZWN0aW5nIHRvIHNlcnZlcicpKSwgdGhpcy50aW1lb3V0Q29ubmVjdGlvbilcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdDb25uZWN0aW5nIHRvJywgdGhpcy5jbGllbnQuaG9zdCwgJzonLCB0aGlzLmNsaWVudC5wb3J0KVxuICAgICAgdGhpcy5fY2hhbmdlU3RhdGUoU1RBVEVfQ09OTkVDVElORylcbiAgICAgIHRoaXMuY2xpZW50LmNvbm5lY3QoKS50aGVuKCgpID0+IHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ1NvY2tldCBvcGVuZWQsIHdhaXRpbmcgZm9yIGdyZWV0aW5nIGZyb20gdGhlIHNlcnZlci4uLicpXG5cbiAgICAgICAgdGhpcy5jbGllbnQub25yZWFkeSA9ICgpID0+IHtcbiAgICAgICAgICBjbGVhclRpbWVvdXQoY29ubmVjdGlvblRpbWVvdXQpXG4gICAgICAgICAgcmVzb2x2ZSgpXG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNsaWVudC5vbmVycm9yID0gKGVycikgPT4ge1xuICAgICAgICAgIGNsZWFyVGltZW91dChjb25uZWN0aW9uVGltZW91dClcbiAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICB9XG4gICAgICB9KS5jYXRjaChyZWplY3QpXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dvdXRcbiAgICpcbiAgICogU2VuZCBMT0dPVVQsIHRvIHdoaWNoIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgYnkgY2xvc2luZyB0aGUgY29ubmVjdGlvbi5cbiAgICogVXNlIGlzIGRpc2NvdXJhZ2VkIGlmIG5ldHdvcmsgc3RhdHVzIGlzIHVuY2xlYXIhIElmIG5ldHdvcmtzIHN0YXR1cyBpc1xuICAgKiB1bmNsZWFyLCBwbGVhc2UgdXNlICNjbG9zZSBpbnN0ZWFkIVxuICAgKlxuICAgKiBMT0dPVVQgZGV0YWlsczpcbiAgICogICBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuMS4zXG4gICAqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBSZXNvbHZlcyB3aGVuIHNlcnZlciBoYXMgY2xvc2VkIHRoZSBjb25uZWN0aW9uXG4gICAqL1xuICBhc3luYyBsb2dvdXQgKCkge1xuICAgIHRoaXMuX2NoYW5nZVN0YXRlKFNUQVRFX0xPR09VVClcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnTG9nZ2luZyBvdXQuLi4nKVxuICAgIGF3YWl0IHRoaXMuY2xpZW50LmxvZ291dCgpXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX2lkbGVUaW1lb3V0KVxuICB9XG5cbiAgLyoqXG4gICAqIEZvcmNlLWNsb3NlcyB0aGUgY3VycmVudCBjb25uZWN0aW9uIGJ5IGNsb3NpbmcgdGhlIFRDUCBzb2NrZXQuXG4gICAqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBSZXNvbHZlcyB3aGVuIHNvY2tldCBpcyBjbG9zZWRcbiAgICovXG4gIGFzeW5jIGNsb3NlIChlcnIpIHtcbiAgICB0aGlzLl9jaGFuZ2VTdGF0ZShTVEFURV9MT0dPVVQpXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX2lkbGVUaW1lb3V0KVxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdDbG9zaW5nIGNvbm5lY3Rpb24uLi4nKVxuICAgIGF3YWl0IHRoaXMuY2xpZW50LmNsb3NlKGVycilcbiAgICBjbGVhclRpbWVvdXQodGhpcy5faWRsZVRpbWVvdXQpXG4gIH1cblxuICAvKipcbiAgICogUnVucyBJRCBjb21tYW5kLCBwYXJzZXMgSUQgcmVzcG9uc2UsIHNldHMgdGhpcy5zZXJ2ZXJJZFxuICAgKlxuICAgKiBJRCBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzI5NzFcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IGlkIElEIGFzIEpTT04gb2JqZWN0LiBTZWUgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMjk3MSNzZWN0aW9uLTMuMyBmb3IgcG9zc2libGUgdmFsdWVzXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBSZXNvbHZlcyB3aGVuIHJlc3BvbnNlIGhhcyBiZWVuIHBhcnNlZFxuICAgKi9cbiAgYXN5bmMgdXBkYXRlSWQgKGlkKSB7XG4gICAgaWYgKHRoaXMuX2NhcGFiaWxpdHkuaW5kZXhPZignSUQnKSA8IDApIHJldHVyblxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ1VwZGF0aW5nIGlkLi4uJylcblxuICAgIGNvbnN0IGNvbW1hbmQgPSAnSUQnXG4gICAgY29uc3QgYXR0cmlidXRlcyA9IGlkID8gWyBmbGF0dGVuKE9iamVjdC5lbnRyaWVzKGlkKSkgXSA6IFsgbnVsbCBdXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmV4ZWMoeyBjb21tYW5kLCBhdHRyaWJ1dGVzIH0sICdJRCcpXG4gICAgY29uc3QgbGlzdCA9IGZsYXR0ZW4ocGF0aE9yKFtdLCBbJ3BheWxvYWQnLCAnSUQnLCAnMCcsICdhdHRyaWJ1dGVzJywgJzAnXSwgcmVzcG9uc2UpLm1hcChPYmplY3QudmFsdWVzKSlcbiAgICBjb25zdCBrZXlzID0gbGlzdC5maWx0ZXIoKF8sIGkpID0+IGkgJSAyID09PSAwKVxuICAgIGNvbnN0IHZhbHVlcyA9IGxpc3QuZmlsdGVyKChfLCBpKSA9PiBpICUgMiA9PT0gMSlcbiAgICB0aGlzLnNlcnZlcklkID0gZnJvbVBhaXJzKHppcChrZXlzLCB2YWx1ZXMpKVxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdTZXJ2ZXIgaWQgdXBkYXRlZCEnLCB0aGlzLnNlcnZlcklkKVxuICB9XG5cbiAgX3Nob3VsZFNlbGVjdE1haWxib3ggKHBhdGgsIGN0eCkge1xuICAgIGlmICghY3R4KSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cblxuICAgIGNvbnN0IHByZXZpb3VzU2VsZWN0ID0gdGhpcy5jbGllbnQuZ2V0UHJldmlvdXNseVF1ZXVlZChbJ1NFTEVDVCcsICdFWEFNSU5FJ10sIGN0eClcbiAgICBpZiAocHJldmlvdXNTZWxlY3QgJiYgcHJldmlvdXNTZWxlY3QucmVxdWVzdC5hdHRyaWJ1dGVzKSB7XG4gICAgICBjb25zdCBwYXRoQXR0cmlidXRlID0gcHJldmlvdXNTZWxlY3QucmVxdWVzdC5hdHRyaWJ1dGVzLmZpbmQoKGF0dHJpYnV0ZSkgPT4gYXR0cmlidXRlLnR5cGUgPT09ICdTVFJJTkcnKVxuICAgICAgaWYgKHBhdGhBdHRyaWJ1dGUpIHtcbiAgICAgICAgcmV0dXJuIHBhdGhBdHRyaWJ1dGUudmFsdWUgIT09IHBhdGhcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fc2VsZWN0ZWRNYWlsYm94ICE9PSBwYXRoXG4gIH1cblxuICAvKipcbiAgICogUnVucyBTRUxFQ1Qgb3IgRVhBTUlORSB0byBvcGVuIGEgbWFpbGJveFxuICAgKlxuICAgKiBTRUxFQ1QgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi4zLjFcbiAgICogRVhBTUlORSBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjMuMlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBGdWxsIHBhdGggdG8gbWFpbGJveFxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIE9wdGlvbnMgb2JqZWN0XG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdpdGggaW5mb3JtYXRpb24gYWJvdXQgdGhlIHNlbGVjdGVkIG1haWxib3hcbiAgICovXG4gIGFzeW5jIHNlbGVjdE1haWxib3ggKHBhdGgsIG9wdGlvbnMgPSB7fSkge1xuICAgIGxldCBxdWVyeSA9IHtcbiAgICAgIGNvbW1hbmQ6IG9wdGlvbnMucmVhZE9ubHkgPyAnRVhBTUlORScgOiAnU0VMRUNUJyxcbiAgICAgIGF0dHJpYnV0ZXM6IFt7IHR5cGU6ICdTVFJJTkcnLCB2YWx1ZTogcGF0aCB9XVxuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmNvbmRzdG9yZSAmJiB0aGlzLl9jYXBhYmlsaXR5LmluZGV4T2YoJ0NPTkRTVE9SRScpID49IDApIHtcbiAgICAgIHF1ZXJ5LmF0dHJpYnV0ZXMucHVzaChbeyB0eXBlOiAnQVRPTScsIHZhbHVlOiAnQ09ORFNUT1JFJyB9XSlcbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnT3BlbmluZycsIHBhdGgsICcuLi4nKVxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5leGVjKHF1ZXJ5LCBbJ0VYSVNUUycsICdGTEFHUycsICdPSyddLCB7IGN0eDogb3B0aW9ucy5jdHggfSlcbiAgICBsZXQgbWFpbGJveEluZm8gPSBwYXJzZVNFTEVDVChyZXNwb25zZSlcblxuICAgIHRoaXMuX2NoYW5nZVN0YXRlKFNUQVRFX1NFTEVDVEVEKVxuXG4gICAgaWYgKHRoaXMuX3NlbGVjdGVkTWFpbGJveCAhPT0gcGF0aCAmJiB0aGlzLm9uY2xvc2VtYWlsYm94KSB7XG4gICAgICBhd2FpdCB0aGlzLm9uY2xvc2VtYWlsYm94KHRoaXMuX3NlbGVjdGVkTWFpbGJveClcbiAgICB9XG4gICAgdGhpcy5fc2VsZWN0ZWRNYWlsYm94ID0gcGF0aFxuICAgIGlmICh0aGlzLm9uc2VsZWN0bWFpbGJveCkge1xuICAgICAgYXdhaXQgdGhpcy5vbnNlbGVjdG1haWxib3gocGF0aCwgbWFpbGJveEluZm8pXG4gICAgfVxuXG4gICAgcmV0dXJuIG1haWxib3hJbmZvXG4gIH1cblxuICAvKipcbiAgICogUnVucyBOQU1FU1BBQ0UgY29tbWFuZFxuICAgKlxuICAgKiBOQU1FU1BBQ0UgZGV0YWlsczpcbiAgICogICBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMjM0MlxuICAgKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB3aXRoIG5hbWVzcGFjZSBvYmplY3RcbiAgICovXG4gIGFzeW5jIGxpc3ROYW1lc3BhY2VzICgpIHtcbiAgICBpZiAodGhpcy5fY2FwYWJpbGl0eS5pbmRleE9mKCdOQU1FU1BBQ0UnKSA8IDApIHJldHVybiBmYWxzZVxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0xpc3RpbmcgbmFtZXNwYWNlcy4uLicpXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmV4ZWMoJ05BTUVTUEFDRScsICdOQU1FU1BBQ0UnKVxuICAgIHJldHVybiBwYXJzZU5BTUVTUEFDRShyZXNwb25zZSlcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIExJU1QgYW5kIExTVUIgY29tbWFuZHMuIFJldHJpZXZlcyBhIHRyZWUgb2YgYXZhaWxhYmxlIG1haWxib3hlc1xuICAgKlxuICAgKiBMSVNUIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuMy44XG4gICAqIExTVUIgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi4zLjlcbiAgICpcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2l0aCBsaXN0IG9mIG1haWxib3hlc1xuICAgKi9cbiAgYXN5bmMgbGlzdE1haWxib3hlcyAoKSB7XG4gICAgY29uc3QgdHJlZSA9IHsgcm9vdDogdHJ1ZSwgY2hpbGRyZW46IFtdIH1cblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdMaXN0aW5nIG1haWxib3hlcy4uLicpXG4gICAgY29uc3QgbGlzdFJlc3BvbnNlID0gYXdhaXQgdGhpcy5leGVjKHsgY29tbWFuZDogJ0xJU1QnLCBhdHRyaWJ1dGVzOiBbJycsICcqJ10gfSwgJ0xJU1QnKVxuICAgIGNvbnN0IGxpc3QgPSBwYXRoT3IoW10sIFsncGF5bG9hZCcsICdMSVNUJ10sIGxpc3RSZXNwb25zZSlcbiAgICBsaXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICBjb25zdCBhdHRyID0gcHJvcE9yKFtdLCAnYXR0cmlidXRlcycsIGl0ZW0pXG4gICAgICBpZiAoYXR0ci5sZW5ndGggPCAzKSByZXR1cm5cblxuICAgICAgY29uc3QgcGF0aCA9IHBhdGhPcignJywgWycyJywgJ3ZhbHVlJ10sIGF0dHIpXG4gICAgICBjb25zdCBkZWxpbSA9IHBhdGhPcignLycsIFsnMScsICd2YWx1ZSddLCBhdHRyKVxuICAgICAgY29uc3QgYnJhbmNoID0gdGhpcy5fZW5zdXJlUGF0aCh0cmVlLCBwYXRoLCBkZWxpbSlcbiAgICAgIGJyYW5jaC5mbGFncyA9IHByb3BPcihbXSwgJzAnLCBhdHRyKS5tYXAoKHsgdmFsdWUgfSkgPT4gdmFsdWUgfHwgJycpXG4gICAgICBicmFuY2gubGlzdGVkID0gdHJ1ZVxuICAgICAgY2hlY2tTcGVjaWFsVXNlKGJyYW5jaClcbiAgICB9KVxuXG4gICAgY29uc3QgbHN1YlJlc3BvbnNlID0gYXdhaXQgdGhpcy5leGVjKHsgY29tbWFuZDogJ0xTVUInLCBhdHRyaWJ1dGVzOiBbJycsICcqJ10gfSwgJ0xTVUInKVxuICAgIGNvbnN0IGxzdWIgPSBwYXRoT3IoW10sIFsncGF5bG9hZCcsICdMU1VCJ10sIGxzdWJSZXNwb25zZSlcbiAgICBsc3ViLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgIGNvbnN0IGF0dHIgPSBwcm9wT3IoW10sICdhdHRyaWJ1dGVzJywgaXRlbSlcbiAgICAgIGlmIChhdHRyLmxlbmd0aCA8IDMpIHJldHVyblxuXG4gICAgICBjb25zdCBwYXRoID0gcGF0aE9yKCcnLCBbJzInLCAndmFsdWUnXSwgYXR0cilcbiAgICAgIGNvbnN0IGRlbGltID0gcGF0aE9yKCcvJywgWycxJywgJ3ZhbHVlJ10sIGF0dHIpXG4gICAgICBjb25zdCBicmFuY2ggPSB0aGlzLl9lbnN1cmVQYXRoKHRyZWUsIHBhdGgsIGRlbGltKVxuICAgICAgcHJvcE9yKFtdLCAnMCcsIGF0dHIpLm1hcCgoZmxhZyA9ICcnKSA9PiB7IGJyYW5jaC5mbGFncyA9IHVuaW9uKGJyYW5jaC5mbGFncywgW2ZsYWddKSB9KVxuICAgICAgYnJhbmNoLnN1YnNjcmliZWQgPSB0cnVlXG4gICAgfSlcblxuICAgIHJldHVybiB0cmVlXG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgbWFpbGJveCB3aXRoIHRoZSBnaXZlbiBwYXRoLlxuICAgKlxuICAgKiBDUkVBVEUgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi4zLjNcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICogICAgIFRoZSBwYXRoIG9mIHRoZSBtYWlsYm94IHlvdSB3b3VsZCBsaWtlIHRvIGNyZWF0ZS4gIFRoaXMgbWV0aG9kIHdpbGxcbiAgICogICAgIGhhbmRsZSB1dGY3IGVuY29kaW5nIGZvciB5b3UuXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKiAgICAgUHJvbWlzZSByZXNvbHZlcyBpZiBtYWlsYm94IHdhcyBjcmVhdGVkLlxuICAgKiAgICAgSW4gdGhlIGV2ZW50IHRoZSBzZXJ2ZXIgc2F5cyBOTyBbQUxSRUFEWUVYSVNUU10sIHdlIHRyZWF0IHRoYXQgYXMgc3VjY2Vzcy5cbiAgICovXG4gIGFzeW5jIGNyZWF0ZU1haWxib3ggKHBhdGgpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnQ3JlYXRpbmcgbWFpbGJveCcsIHBhdGgsICcuLi4nKVxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLmV4ZWMoeyBjb21tYW5kOiAnQ1JFQVRFJywgYXR0cmlidXRlczogW2ltYXBFbmNvZGUocGF0aCldIH0pXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyICYmIGVyci5jb2RlID09PSAnQUxSRUFEWUVYSVNUUycpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB0aHJvdyBlcnJcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGVsZXRlIGEgbWFpbGJveCB3aXRoIHRoZSBnaXZlbiBwYXRoLlxuICAgKlxuICAgKiBERUxFVEUgZGV0YWlsczpcbiAgICogICBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuMy40XG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAqICAgICBUaGUgcGF0aCBvZiB0aGUgbWFpbGJveCB5b3Ugd291bGQgbGlrZSB0byBkZWxldGUuICBUaGlzIG1ldGhvZCB3aWxsXG4gICAqICAgICBoYW5kbGUgdXRmNyBlbmNvZGluZyBmb3IgeW91LlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICogICAgIFByb21pc2UgcmVzb2x2ZXMgaWYgbWFpbGJveCB3YXMgZGVsZXRlZC5cbiAgICovXG4gIGRlbGV0ZU1haWxib3ggKHBhdGgpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnRGVsZXRpbmcgbWFpbGJveCcsIHBhdGgsICcuLi4nKVxuICAgIHJldHVybiB0aGlzLmV4ZWMoeyBjb21tYW5kOiAnREVMRVRFJywgYXR0cmlidXRlczogW2ltYXBFbmNvZGUocGF0aCldIH0pXG4gIH1cblxuICAvKipcbiAgICogUnVucyBGRVRDSCBjb21tYW5kXG4gICAqXG4gICAqIEZFVENIIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuNC41XG4gICAqIENIQU5HRURTSU5DRSBkZXRhaWxzOlxuICAgKiAgIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM0NTUxI3NlY3Rpb24tMy4zXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBwYXRoIGZvciB0aGUgbWFpbGJveCB3aGljaCBzaG91bGQgYmUgc2VsZWN0ZWQgZm9yIHRoZSBjb21tYW5kLiBTZWxlY3RzIG1haWxib3ggaWYgbmVjZXNzYXJ5XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzZXF1ZW5jZSBTZXF1ZW5jZSBzZXQsIGVnIDE6KiBmb3IgYWxsIG1lc3NhZ2VzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbaXRlbXNdIE1lc3NhZ2UgZGF0YSBpdGVtIG5hbWVzIG9yIG1hY3JvXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gUXVlcnkgbW9kaWZpZXJzXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdpdGggdGhlIGZldGNoZWQgbWVzc2FnZSBpbmZvXG4gICAqL1xuICBhc3luYyBsaXN0TWVzc2FnZXMgKHBhdGgsIHNlcXVlbmNlLCBpdGVtcyA9IFt7IGZhc3Q6IHRydWUgfV0sIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdGZXRjaGluZyBtZXNzYWdlcycsIHNlcXVlbmNlLCAnZnJvbScsIHBhdGgsICcuLi4nKVxuICAgIGNvbnN0IGNvbW1hbmQgPSBidWlsZEZFVENIQ29tbWFuZChzZXF1ZW5jZSwgaXRlbXMsIG9wdGlvbnMpXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmV4ZWMoY29tbWFuZCwgJ0ZFVENIJywge1xuICAgICAgcHJlY2hlY2s6IChjdHgpID0+IHRoaXMuX3Nob3VsZFNlbGVjdE1haWxib3gocGF0aCwgY3R4KSA/IHRoaXMuc2VsZWN0TWFpbGJveChwYXRoLCB7IGN0eCB9KSA6IFByb21pc2UucmVzb2x2ZSgpXG4gICAgfSlcbiAgICByZXR1cm4gcGFyc2VGRVRDSChyZXNwb25zZSlcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIFNFQVJDSCBjb21tYW5kXG4gICAqXG4gICAqIFNFQVJDSCBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjQuNFxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBUaGUgcGF0aCBmb3IgdGhlIG1haWxib3ggd2hpY2ggc2hvdWxkIGJlIHNlbGVjdGVkIGZvciB0aGUgY29tbWFuZC4gU2VsZWN0cyBtYWlsYm94IGlmIG5lY2Vzc2FyeVxuICAgKiBAcGFyYW0ge09iamVjdH0gcXVlcnkgU2VhcmNoIHRlcm1zXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gUXVlcnkgbW9kaWZpZXJzXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdpdGggdGhlIGFycmF5IG9mIG1hdGNoaW5nIHNlcS4gb3IgdWlkIG51bWJlcnNcbiAgICovXG4gIGFzeW5jIHNlYXJjaCAocGF0aCwgcXVlcnksIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdTZWFyY2hpbmcgaW4nLCBwYXRoLCAnLi4uJylcbiAgICBjb25zdCBjb21tYW5kID0gYnVpbGRTRUFSQ0hDb21tYW5kKHF1ZXJ5LCBvcHRpb25zKVxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5leGVjKGNvbW1hbmQsICdTRUFSQ0gnLCB7XG4gICAgICBwcmVjaGVjazogKGN0eCkgPT4gdGhpcy5fc2hvdWxkU2VsZWN0TWFpbGJveChwYXRoLCBjdHgpID8gdGhpcy5zZWxlY3RNYWlsYm94KHBhdGgsIHsgY3R4IH0pIDogUHJvbWlzZS5yZXNvbHZlKClcbiAgICB9KVxuICAgIHJldHVybiBwYXJzZVNFQVJDSChyZXNwb25zZSlcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIFNUT1JFIGNvbW1hbmRcbiAgICpcbiAgICogU1RPUkUgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi40LjZcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggVGhlIHBhdGggZm9yIHRoZSBtYWlsYm94IHdoaWNoIHNob3VsZCBiZSBzZWxlY3RlZCBmb3IgdGhlIGNvbW1hbmQuIFNlbGVjdHMgbWFpbGJveCBpZiBuZWNlc3NhcnlcbiAgICogQHBhcmFtIHtTdHJpbmd9IHNlcXVlbmNlIE1lc3NhZ2Ugc2VsZWN0b3Igd2hpY2ggdGhlIGZsYWcgY2hhbmdlIGlzIGFwcGxpZWQgdG9cbiAgICogQHBhcmFtIHtBcnJheX0gZmxhZ3NcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBRdWVyeSBtb2RpZmllcnNcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2l0aCB0aGUgYXJyYXkgb2YgbWF0Y2hpbmcgc2VxLiBvciB1aWQgbnVtYmVyc1xuICAgKi9cbiAgc2V0RmxhZ3MgKHBhdGgsIHNlcXVlbmNlLCBmbGFncywgb3B0aW9ucykge1xuICAgIGxldCBrZXkgPSAnJ1xuICAgIGxldCBsaXN0ID0gW11cblxuICAgIGlmIChBcnJheS5pc0FycmF5KGZsYWdzKSB8fCB0eXBlb2YgZmxhZ3MgIT09ICdvYmplY3QnKSB7XG4gICAgICBsaXN0ID0gW10uY29uY2F0KGZsYWdzIHx8IFtdKVxuICAgICAga2V5ID0gJydcbiAgICB9IGVsc2UgaWYgKGZsYWdzLmFkZCkge1xuICAgICAgbGlzdCA9IFtdLmNvbmNhdChmbGFncy5hZGQgfHwgW10pXG4gICAgICBrZXkgPSAnKydcbiAgICB9IGVsc2UgaWYgKGZsYWdzLnNldCkge1xuICAgICAga2V5ID0gJydcbiAgICAgIGxpc3QgPSBbXS5jb25jYXQoZmxhZ3Muc2V0IHx8IFtdKVxuICAgIH0gZWxzZSBpZiAoZmxhZ3MucmVtb3ZlKSB7XG4gICAgICBrZXkgPSAnLSdcbiAgICAgIGxpc3QgPSBbXS5jb25jYXQoZmxhZ3MucmVtb3ZlIHx8IFtdKVxuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdTZXR0aW5nIGZsYWdzIG9uJywgc2VxdWVuY2UsICdpbicsIHBhdGgsICcuLi4nKVxuICAgIHJldHVybiB0aGlzLnN0b3JlKHBhdGgsIHNlcXVlbmNlLCBrZXkgKyAnRkxBR1MnLCBsaXN0LCBvcHRpb25zKVxuICB9XG5cbiAgLyoqXG4gICAqIFJ1bnMgU1RPUkUgY29tbWFuZFxuICAgKlxuICAgKiBTVE9SRSBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjQuNlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBUaGUgcGF0aCBmb3IgdGhlIG1haWxib3ggd2hpY2ggc2hvdWxkIGJlIHNlbGVjdGVkIGZvciB0aGUgY29tbWFuZC4gU2VsZWN0cyBtYWlsYm94IGlmIG5lY2Vzc2FyeVxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2VxdWVuY2UgTWVzc2FnZSBzZWxlY3RvciB3aGljaCB0aGUgZmxhZyBjaGFuZ2UgaXMgYXBwbGllZCB0b1xuICAgKiBAcGFyYW0ge1N0cmluZ30gYWN0aW9uIFNUT1JFIG1ldGhvZCB0byBjYWxsLCBlZyBcIitGTEFHU1wiXG4gICAqIEBwYXJhbSB7QXJyYXl9IGZsYWdzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gUXVlcnkgbW9kaWZpZXJzXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdpdGggdGhlIGFycmF5IG9mIG1hdGNoaW5nIHNlcS4gb3IgdWlkIG51bWJlcnNcbiAgICovXG4gIGFzeW5jIHN0b3JlIChwYXRoLCBzZXF1ZW5jZSwgYWN0aW9uLCBmbGFncywgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgY29tbWFuZCA9IGJ1aWxkU1RPUkVDb21tYW5kKHNlcXVlbmNlLCBhY3Rpb24sIGZsYWdzLCBvcHRpb25zKVxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5leGVjKGNvbW1hbmQsICdGRVRDSCcsIHtcbiAgICAgIHByZWNoZWNrOiAoY3R4KSA9PiB0aGlzLl9zaG91bGRTZWxlY3RNYWlsYm94KHBhdGgsIGN0eCkgPyB0aGlzLnNlbGVjdE1haWxib3gocGF0aCwgeyBjdHggfSkgOiBQcm9taXNlLnJlc29sdmUoKVxuICAgIH0pXG4gICAgcmV0dXJuIHBhcnNlRkVUQ0gocmVzcG9uc2UpXG4gIH1cblxuICAvKipcbiAgICogUnVucyBBUFBFTkQgY29tbWFuZFxuICAgKlxuICAgKiBBUFBFTkQgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi4zLjExXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBkZXN0aW5hdGlvbiBUaGUgbWFpbGJveCB3aGVyZSB0byBhcHBlbmQgdGhlIG1lc3NhZ2VcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gYXBwZW5kXG4gICAqIEBwYXJhbSB7QXJyYXl9IG9wdGlvbnMuZmxhZ3MgQW55IGZsYWdzIHlvdSB3YW50IHRvIHNldCBvbiB0aGUgdXBsb2FkZWQgbWVzc2FnZS4gRGVmYXVsdHMgdG8gW1xcU2Vlbl0uIChvcHRpb25hbClcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2l0aCB0aGUgYXJyYXkgb2YgbWF0Y2hpbmcgc2VxLiBvciB1aWQgbnVtYmVyc1xuICAgKi9cbiAgdXBsb2FkIChkZXN0aW5hdGlvbiwgbWVzc2FnZSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgbGV0IGZsYWdzID0gcHJvcE9yKFsnXFxcXFNlZW4nXSwgJ2ZsYWdzJywgb3B0aW9ucykubWFwKHZhbHVlID0+ICh7IHR5cGU6ICdhdG9tJywgdmFsdWUgfSkpXG4gICAgbGV0IGNvbW1hbmQgPSB7XG4gICAgICBjb21tYW5kOiAnQVBQRU5EJyxcbiAgICAgIGF0dHJpYnV0ZXM6IFtcbiAgICAgICAgeyB0eXBlOiAnYXRvbScsIHZhbHVlOiBkZXN0aW5hdGlvbiB9LFxuICAgICAgICBmbGFncyxcbiAgICAgICAgeyB0eXBlOiAnbGl0ZXJhbCcsIHZhbHVlOiBtZXNzYWdlIH1cbiAgICAgIF1cbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnVXBsb2FkaW5nIG1lc3NhZ2UgdG8nLCBkZXN0aW5hdGlvbiwgJy4uLicpXG4gICAgcmV0dXJuIHRoaXMuZXhlYyhjb21tYW5kKVxuICB9XG5cbiAgLyoqXG4gICAqIERlbGV0ZXMgbWVzc2FnZXMgZnJvbSBhIHNlbGVjdGVkIG1haWxib3hcbiAgICpcbiAgICogRVhQVU5HRSBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjQuM1xuICAgKiBVSUQgRVhQVU5HRSBkZXRhaWxzOlxuICAgKiAgIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM0MzE1I3NlY3Rpb24tMi4xXG4gICAqXG4gICAqIElmIHBvc3NpYmxlIChieVVpZDp0cnVlIGFuZCBVSURQTFVTIGV4dGVuc2lvbiBzdXBwb3J0ZWQpLCB1c2VzIFVJRCBFWFBVTkdFXG4gICAqIGNvbW1hbmQgdG8gZGVsZXRlIGEgcmFuZ2Ugb2YgbWVzc2FnZXMsIG90aGVyd2lzZSBmYWxscyBiYWNrIHRvIEVYUFVOR0UuXG4gICAqXG4gICAqIE5CISBUaGlzIG1ldGhvZCBtaWdodCBiZSBkZXN0cnVjdGl2ZSAtIGlmIEVYUFVOR0UgaXMgdXNlZCwgdGhlbiBhbnkgbWVzc2FnZXNcbiAgICogd2l0aCBcXERlbGV0ZWQgZmxhZyBzZXQgYXJlIGRlbGV0ZWRcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggVGhlIHBhdGggZm9yIHRoZSBtYWlsYm94IHdoaWNoIHNob3VsZCBiZSBzZWxlY3RlZCBmb3IgdGhlIGNvbW1hbmQuIFNlbGVjdHMgbWFpbGJveCBpZiBuZWNlc3NhcnlcbiAgICogQHBhcmFtIHtTdHJpbmd9IHNlcXVlbmNlIE1lc3NhZ2UgcmFuZ2UgdG8gYmUgZGVsZXRlZFxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIFF1ZXJ5IG1vZGlmaWVyc1xuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZVxuICAgKi9cbiAgYXN5bmMgZGVsZXRlTWVzc2FnZXMgKHBhdGgsIHNlcXVlbmNlLCBvcHRpb25zID0ge30pIHtcbiAgICAvLyBhZGQgXFxEZWxldGVkIGZsYWcgdG8gdGhlIG1lc3NhZ2VzIGFuZCBydW4gRVhQVU5HRSBvciBVSUQgRVhQVU5HRVxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdEZWxldGluZyBtZXNzYWdlcycsIHNlcXVlbmNlLCAnaW4nLCBwYXRoLCAnLi4uJylcbiAgICBjb25zdCB1c2VVaWRQbHVzID0gb3B0aW9ucy5ieVVpZCAmJiB0aGlzLl9jYXBhYmlsaXR5LmluZGV4T2YoJ1VJRFBMVVMnKSA+PSAwXG4gICAgY29uc3QgdWlkRXhwdW5nZUNvbW1hbmQgPSB7IGNvbW1hbmQ6ICdVSUQgRVhQVU5HRScsIGF0dHJpYnV0ZXM6IFt7IHR5cGU6ICdzZXF1ZW5jZScsIHZhbHVlOiBzZXF1ZW5jZSB9XSB9XG4gICAgYXdhaXQgdGhpcy5zZXRGbGFncyhwYXRoLCBzZXF1ZW5jZSwgeyBhZGQ6ICdcXFxcRGVsZXRlZCcgfSwgb3B0aW9ucylcbiAgICBjb25zdCBjbWQgPSB1c2VVaWRQbHVzID8gdWlkRXhwdW5nZUNvbW1hbmQgOiAnRVhQVU5HRSdcbiAgICByZXR1cm4gdGhpcy5leGVjKGNtZCwgbnVsbCwge1xuICAgICAgcHJlY2hlY2s6IChjdHgpID0+IHRoaXMuX3Nob3VsZFNlbGVjdE1haWxib3gocGF0aCwgY3R4KSA/IHRoaXMuc2VsZWN0TWFpbGJveChwYXRoLCB7IGN0eCB9KSA6IFByb21pc2UucmVzb2x2ZSgpXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBDb3BpZXMgYSByYW5nZSBvZiBtZXNzYWdlcyBmcm9tIHRoZSBhY3RpdmUgbWFpbGJveCB0byB0aGUgZGVzdGluYXRpb24gbWFpbGJveC5cbiAgICogU2lsZW50IG1ldGhvZCAodW5sZXNzIGFuIGVycm9yIG9jY3VycyksIGJ5IGRlZmF1bHQgcmV0dXJucyBubyBpbmZvcm1hdGlvbi5cbiAgICpcbiAgICogQ09QWSBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjQuN1xuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBUaGUgcGF0aCBmb3IgdGhlIG1haWxib3ggd2hpY2ggc2hvdWxkIGJlIHNlbGVjdGVkIGZvciB0aGUgY29tbWFuZC4gU2VsZWN0cyBtYWlsYm94IGlmIG5lY2Vzc2FyeVxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2VxdWVuY2UgTWVzc2FnZSByYW5nZSB0byBiZSBjb3BpZWRcbiAgICogQHBhcmFtIHtTdHJpbmd9IGRlc3RpbmF0aW9uIERlc3RpbmF0aW9uIG1haWxib3ggcGF0aFxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIFF1ZXJ5IG1vZGlmaWVyc1xuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmJ5VWlkXSBJZiB0cnVlLCB1c2VzIFVJRCBDT1BZIGluc3RlYWQgb2YgQ09QWVxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZVxuICAgKi9cbiAgYXN5bmMgY29weU1lc3NhZ2VzIChwYXRoLCBzZXF1ZW5jZSwgZGVzdGluYXRpb24sIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdDb3B5aW5nIG1lc3NhZ2VzJywgc2VxdWVuY2UsICdmcm9tJywgcGF0aCwgJ3RvJywgZGVzdGluYXRpb24sICcuLi4nKVxuICAgIGNvbnN0IHsgaHVtYW5SZWFkYWJsZSB9ID0gYXdhaXQgdGhpcy5leGVjKHtcbiAgICAgIGNvbW1hbmQ6IG9wdGlvbnMuYnlVaWQgPyAnVUlEIENPUFknIDogJ0NPUFknLFxuICAgICAgYXR0cmlidXRlczogW1xuICAgICAgICB7IHR5cGU6ICdzZXF1ZW5jZScsIHZhbHVlOiBzZXF1ZW5jZSB9LFxuICAgICAgICB7IHR5cGU6ICdhdG9tJywgdmFsdWU6IGRlc3RpbmF0aW9uIH1cbiAgICAgIF1cbiAgICB9LCBudWxsLCB7XG4gICAgICBwcmVjaGVjazogKGN0eCkgPT4gdGhpcy5fc2hvdWxkU2VsZWN0TWFpbGJveChwYXRoLCBjdHgpID8gdGhpcy5zZWxlY3RNYWlsYm94KHBhdGgsIHsgY3R4IH0pIDogUHJvbWlzZS5yZXNvbHZlKClcbiAgICB9KVxuICAgIHJldHVybiBodW1hblJlYWRhYmxlIHx8ICdDT1BZIGNvbXBsZXRlZCdcbiAgfVxuXG4gIC8qKlxuICAgKiBNb3ZlcyBhIHJhbmdlIG9mIG1lc3NhZ2VzIGZyb20gdGhlIGFjdGl2ZSBtYWlsYm94IHRvIHRoZSBkZXN0aW5hdGlvbiBtYWlsYm94LlxuICAgKiBQcmVmZXJzIHRoZSBNT1ZFIGV4dGVuc2lvbiBidXQgaWYgbm90IGF2YWlsYWJsZSwgZmFsbHMgYmFjayB0b1xuICAgKiBDT1BZICsgRVhQVU5HRVxuICAgKlxuICAgKiBNT1ZFIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjg1MVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBUaGUgcGF0aCBmb3IgdGhlIG1haWxib3ggd2hpY2ggc2hvdWxkIGJlIHNlbGVjdGVkIGZvciB0aGUgY29tbWFuZC4gU2VsZWN0cyBtYWlsYm94IGlmIG5lY2Vzc2FyeVxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2VxdWVuY2UgTWVzc2FnZSByYW5nZSB0byBiZSBtb3ZlZFxuICAgKiBAcGFyYW0ge1N0cmluZ30gZGVzdGluYXRpb24gRGVzdGluYXRpb24gbWFpbGJveCBwYXRoXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gUXVlcnkgbW9kaWZpZXJzXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlXG4gICAqL1xuICBhc3luYyBtb3ZlTWVzc2FnZXMgKHBhdGgsIHNlcXVlbmNlLCBkZXN0aW5hdGlvbiwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ01vdmluZyBtZXNzYWdlcycsIHNlcXVlbmNlLCAnZnJvbScsIHBhdGgsICd0bycsIGRlc3RpbmF0aW9uLCAnLi4uJylcblxuICAgIGlmICh0aGlzLl9jYXBhYmlsaXR5LmluZGV4T2YoJ01PVkUnKSA9PT0gLTEpIHtcbiAgICAgIC8vIEZhbGxiYWNrIHRvIENPUFkgKyBFWFBVTkdFXG4gICAgICBhd2FpdCB0aGlzLmNvcHlNZXNzYWdlcyhwYXRoLCBzZXF1ZW5jZSwgZGVzdGluYXRpb24sIG9wdGlvbnMpXG4gICAgICByZXR1cm4gdGhpcy5kZWxldGVNZXNzYWdlcyhwYXRoLCBzZXF1ZW5jZSwgb3B0aW9ucylcbiAgICB9XG5cbiAgICAvLyBJZiBwb3NzaWJsZSwgdXNlIE1PVkVcbiAgICByZXR1cm4gdGhpcy5leGVjKHtcbiAgICAgIGNvbW1hbmQ6IG9wdGlvbnMuYnlVaWQgPyAnVUlEIE1PVkUnIDogJ01PVkUnLFxuICAgICAgYXR0cmlidXRlczogW1xuICAgICAgICB7IHR5cGU6ICdzZXF1ZW5jZScsIHZhbHVlOiBzZXF1ZW5jZSB9LFxuICAgICAgICB7IHR5cGU6ICdhdG9tJywgdmFsdWU6IGRlc3RpbmF0aW9uIH1cbiAgICAgIF1cbiAgICB9LCBbJ09LJ10sIHtcbiAgICAgIHByZWNoZWNrOiAoY3R4KSA9PiB0aGlzLl9zaG91bGRTZWxlY3RNYWlsYm94KHBhdGgsIGN0eCkgPyB0aGlzLnNlbGVjdE1haWxib3gocGF0aCwgeyBjdHggfSkgOiBQcm9taXNlLnJlc29sdmUoKVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogUnVucyBDT01QUkVTUyBjb21tYW5kXG4gICAqXG4gICAqIENPTVBSRVNTIGRldGFpbHM6XG4gICAqICAgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzQ5NzhcbiAgICovXG4gIGFzeW5jIGNvbXByZXNzQ29ubmVjdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLl9lbmFibGVDb21wcmVzc2lvbiB8fCB0aGlzLl9jYXBhYmlsaXR5LmluZGV4T2YoJ0NPTVBSRVNTPURFRkxBVEUnKSA8IDAgfHwgdGhpcy5jbGllbnQuY29tcHJlc3NlZCkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0VuYWJsaW5nIGNvbXByZXNzaW9uLi4uJylcbiAgICBhd2FpdCB0aGlzLmV4ZWMoe1xuICAgICAgY29tbWFuZDogJ0NPTVBSRVNTJyxcbiAgICAgIGF0dHJpYnV0ZXM6IFt7XG4gICAgICAgIHR5cGU6ICdBVE9NJyxcbiAgICAgICAgdmFsdWU6ICdERUZMQVRFJ1xuICAgICAgfV1cbiAgICB9KVxuICAgIHRoaXMuY2xpZW50LmVuYWJsZUNvbXByZXNzaW9uKClcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnQ29tcHJlc3Npb24gZW5hYmxlZCwgYWxsIGRhdGEgc2VudCBhbmQgcmVjZWl2ZWQgaXMgZGVmbGF0ZWQhJylcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIExPR0lOIG9yIEFVVEhFTlRJQ0FURSBYT0FVVEgyIGNvbW1hbmRcbiAgICpcbiAgICogTE9HSU4gZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi4yLjNcbiAgICogWE9BVVRIMiBkZXRhaWxzOlxuICAgKiAgIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL2dtYWlsL3hvYXV0aDJfcHJvdG9jb2wjaW1hcF9wcm90b2NvbF9leGNoYW5nZVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gYXV0aC51c2VyXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBhdXRoLnBhc3NcbiAgICogQHBhcmFtIHtTdHJpbmd9IGF1dGgueG9hdXRoMlxuICAgKi9cbiAgYXN5bmMgbG9naW4gKGF1dGgpIHtcbiAgICBsZXQgY29tbWFuZFxuICAgIGxldCBvcHRpb25zID0ge31cblxuICAgIGlmICghYXV0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdBdXRoZW50aWNhdGlvbiBpbmZvcm1hdGlvbiBub3QgcHJvdmlkZWQnKVxuICAgIH1cblxuICAgIGlmICh0aGlzLl9jYXBhYmlsaXR5LmluZGV4T2YoJ0FVVEg9WE9BVVRIMicpID49IDAgJiYgYXV0aCAmJiBhdXRoLnhvYXV0aDIpIHtcbiAgICAgIGNvbW1hbmQgPSB7XG4gICAgICAgIGNvbW1hbmQ6ICdBVVRIRU5USUNBVEUnLFxuICAgICAgICBhdHRyaWJ1dGVzOiBbXG4gICAgICAgICAgeyB0eXBlOiAnQVRPTScsIHZhbHVlOiAnWE9BVVRIMicgfSxcbiAgICAgICAgICB7IHR5cGU6ICdBVE9NJywgdmFsdWU6IGJ1aWxkWE9BdXRoMlRva2VuKGF1dGgudXNlciwgYXV0aC54b2F1dGgyKSwgc2Vuc2l0aXZlOiB0cnVlIH1cbiAgICAgICAgXVxuICAgICAgfVxuXG4gICAgICBvcHRpb25zLmVycm9yUmVzcG9uc2VFeHBlY3RzRW1wdHlMaW5lID0gdHJ1ZSAvLyArIHRhZ2dlZCBlcnJvciByZXNwb25zZSBleHBlY3RzIGFuIGVtcHR5IGxpbmUgaW4gcmV0dXJuXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbW1hbmQgPSB7XG4gICAgICAgIGNvbW1hbmQ6ICdsb2dpbicsXG4gICAgICAgIGF0dHJpYnV0ZXM6IFtcbiAgICAgICAgICB7IHR5cGU6ICdTVFJJTkcnLCB2YWx1ZTogYXV0aC51c2VyIHx8ICcnIH0sXG4gICAgICAgICAgeyB0eXBlOiAnU1RSSU5HJywgdmFsdWU6IGF1dGgucGFzcyB8fCAnJywgc2Vuc2l0aXZlOiB0cnVlIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdMb2dnaW5nIGluLi4uJylcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuZXhlYyhjb21tYW5kLCAnY2FwYWJpbGl0eScsIG9wdGlvbnMpXG4gICAgLypcbiAgICAgKiB1cGRhdGUgcG9zdC1hdXRoIGNhcGFiaWxpdGVzXG4gICAgICogY2FwYWJpbGl0eSBsaXN0IHNob3VsZG4ndCBjb250YWluIGF1dGggcmVsYXRlZCBzdHVmZiBhbnltb3JlXG4gICAgICogYnV0IHNvbWUgbmV3IGV4dGVuc2lvbnMgbWlnaHQgaGF2ZSBwb3BwZWQgdXAgdGhhdCBkbyBub3RcbiAgICAgKiBtYWtlIG11Y2ggc2Vuc2UgaW4gdGhlIG5vbi1hdXRoIHN0YXRlXG4gICAgICovXG4gICAgaWYgKHJlc3BvbnNlLmNhcGFiaWxpdHkgJiYgcmVzcG9uc2UuY2FwYWJpbGl0eS5sZW5ndGgpIHtcbiAgICAgIC8vIGNhcGFiaWxpdGVzIHdlcmUgbGlzdGVkIHdpdGggdGhlIE9LIFtDQVBBQklMSVRZIC4uLl0gcmVzcG9uc2VcbiAgICAgIHRoaXMuX2NhcGFiaWxpdHkgPSByZXNwb25zZS5jYXBhYmlsaXR5XG4gICAgfSBlbHNlIGlmIChyZXNwb25zZS5wYXlsb2FkICYmIHJlc3BvbnNlLnBheWxvYWQuQ0FQQUJJTElUWSAmJiByZXNwb25zZS5wYXlsb2FkLkNBUEFCSUxJVFkubGVuZ3RoKSB7XG4gICAgICAvLyBjYXBhYmlsaXRlcyB3ZXJlIGxpc3RlZCB3aXRoICogQ0FQQUJJTElUWSAuLi4gcmVzcG9uc2VcbiAgICAgIHRoaXMuX2NhcGFiaWxpdHkgPSByZXNwb25zZS5wYXlsb2FkLkNBUEFCSUxJVFkucG9wKCkuYXR0cmlidXRlcy5tYXAoKGNhcGEgPSAnJykgPT4gY2FwYS52YWx1ZS50b1VwcGVyQ2FzZSgpLnRyaW0oKSlcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gY2FwYWJpbGl0aWVzIHdlcmUgbm90IGF1dG9tYXRpY2FsbHkgbGlzdGVkLCByZWxvYWRcbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ2FwYWJpbGl0eSh0cnVlKVxuICAgIH1cblxuICAgIHRoaXMuX2NoYW5nZVN0YXRlKFNUQVRFX0FVVEhFTlRJQ0FURUQpXG4gICAgdGhpcy5fYXV0aGVudGljYXRlZCA9IHRydWVcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnTG9naW4gc3VjY2Vzc2Z1bCwgcG9zdC1hdXRoIGNhcGFiaWxpdGVzIHVwZGF0ZWQhJywgdGhpcy5fY2FwYWJpbGl0eSlcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW4gYW4gSU1BUCBjb21tYW5kLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gcmVxdWVzdCBTdHJ1Y3R1cmVkIHJlcXVlc3Qgb2JqZWN0XG4gICAqIEBwYXJhbSB7QXJyYXl9IGFjY2VwdFVudGFnZ2VkIGEgbGlzdCBvZiB1bnRhZ2dlZCByZXNwb25zZXMgdGhhdCB3aWxsIGJlIGluY2x1ZGVkIGluICdwYXlsb2FkJyBwcm9wZXJ0eVxuICAgKi9cbiAgYXN5bmMgZXhlYyAocmVxdWVzdCwgYWNjZXB0VW50YWdnZWQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLmJyZWFrSWRsZSgpXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmNsaWVudC5lbnF1ZXVlQ29tbWFuZChyZXF1ZXN0LCBhY2NlcHRVbnRhZ2dlZCwgb3B0aW9ucylcbiAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UuY2FwYWJpbGl0eSkge1xuICAgICAgdGhpcy5fY2FwYWJpbGl0eSA9IHJlc3BvbnNlLmNhcGFiaWxpdHlcbiAgICB9XG4gICAgcmV0dXJuIHJlc3BvbnNlXG4gIH1cblxuICAvKipcbiAgICogVGhlIGNvbm5lY3Rpb24gaXMgaWRsaW5nLiBTZW5kcyBhIE5PT1Agb3IgSURMRSBjb21tYW5kXG4gICAqXG4gICAqIElETEUgZGV0YWlsczpcbiAgICogICBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMjE3N1xuICAgKi9cbiAgZW50ZXJJZGxlICgpIHtcbiAgICBpZiAodGhpcy5fZW50ZXJlZElkbGUpIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICB0aGlzLl9lbnRlcmVkSWRsZSA9IHRoaXMuX2NhcGFiaWxpdHkuaW5kZXhPZignSURMRScpID49IDAgPyAnSURMRScgOiAnTk9PUCdcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnRW50ZXJpbmcgaWRsZSB3aXRoICcgKyB0aGlzLl9lbnRlcmVkSWRsZSlcblxuICAgIGlmICh0aGlzLl9lbnRlcmVkSWRsZSA9PT0gJ05PT1AnKSB7XG4gICAgICB0aGlzLl9pZGxlVGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnU2VuZGluZyBOT09QJylcbiAgICAgICAgdGhpcy5leGVjKCdOT09QJylcbiAgICAgIH0sIHRoaXMudGltZW91dE5vb3ApXG4gICAgfSBlbHNlIGlmICh0aGlzLl9lbnRlcmVkSWRsZSA9PT0gJ0lETEUnKSB7XG4gICAgICB0aGlzLmNsaWVudC5lbnF1ZXVlQ29tbWFuZCh7XG4gICAgICAgIGNvbW1hbmQ6ICdJRExFJ1xuICAgICAgfSlcbiAgICAgIHRoaXMuX2lkbGVUaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRoaXMuY2xpZW50LnNlbmQoJ0RPTkVcXHJcXG4nKVxuICAgICAgICB0aGlzLl9lbnRlcmVkSWRsZSA9IGZhbHNlXG4gICAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdJZGxlIHRlcm1pbmF0ZWQnKVxuICAgICAgfSwgdGhpcy50aW1lb3V0SWRsZSlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU3RvcHMgYWN0aW9ucyByZWxhdGVkIGlkbGluZywgaWYgSURMRSBpcyBzdXBwb3J0ZWQsIHNlbmRzIERPTkUgdG8gc3RvcCBpdFxuICAgKi9cbiAgYnJlYWtJZGxlICgpIHtcbiAgICBpZiAoIXRoaXMuX2VudGVyZWRJZGxlKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjbGVhclRpbWVvdXQodGhpcy5faWRsZVRpbWVvdXQpXG4gICAgaWYgKHRoaXMuX2VudGVyZWRJZGxlID09PSAnSURMRScpIHtcbiAgICAgIHRoaXMuY2xpZW50LnNlbmQoJ0RPTkVcXHJcXG4nKVxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ0lkbGUgdGVybWluYXRlZCcpXG4gICAgfVxuICAgIHRoaXMuX2VudGVyZWRJZGxlID0gZmFsc2VcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIFNUQVJUVExTIGNvbW1hbmQgaWYgbmVlZGVkXG4gICAqXG4gICAqIFNUQVJUVExTIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuMi4xXG4gICAqXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW2ZvcmNlZF0gQnkgZGVmYXVsdCB0aGUgY29tbWFuZCBpcyBub3QgcnVuIGlmIGNhcGFiaWxpdHkgaXMgYWxyZWFkeSBsaXN0ZWQuIFNldCB0byB0cnVlIHRvIHNraXAgdGhpcyB2YWxpZGF0aW9uXG4gICAqL1xuICBhc3luYyB1cGdyYWRlQ29ubmVjdGlvbiAoKSB7XG4gICAgLy8gc2tpcCByZXF1ZXN0LCBpZiBhbHJlYWR5IHNlY3VyZWRcbiAgICBpZiAodGhpcy5jbGllbnQuc2VjdXJlTW9kZSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgLy8gc2tpcCBpZiBTVEFSVFRMUyBub3QgYXZhaWxhYmxlIG9yIHN0YXJ0dGxzIHN1cHBvcnQgZGlzYWJsZWRcbiAgICBpZiAoKHRoaXMuX2NhcGFiaWxpdHkuaW5kZXhPZignU1RBUlRUTFMnKSA8IDAgfHwgdGhpcy5faWdub3JlVExTKSAmJiAhdGhpcy5fcmVxdWlyZVRMUykge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0VuY3J5cHRpbmcgY29ubmVjdGlvbi4uLicpXG4gICAgYXdhaXQgdGhpcy5leGVjKCdTVEFSVFRMUycpXG4gICAgdGhpcy5fY2FwYWJpbGl0eSA9IFtdXG4gICAgdGhpcy5jbGllbnQudXBncmFkZSgpXG4gICAgcmV0dXJuIHRoaXMudXBkYXRlQ2FwYWJpbGl0eSgpXG4gIH1cblxuICAvKipcbiAgICogUnVucyBDQVBBQklMSVRZIGNvbW1hbmRcbiAgICpcbiAgICogQ0FQQUJJTElUWSBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjEuMVxuICAgKlxuICAgKiBEb2Vzbid0IHJlZ2lzdGVyIHVudGFnZ2VkIENBUEFCSUxJVFkgaGFuZGxlciBhcyB0aGlzIGlzIGFscmVhZHlcbiAgICogaGFuZGxlZCBieSBnbG9iYWwgaGFuZGxlclxuICAgKlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtmb3JjZWRdIEJ5IGRlZmF1bHQgdGhlIGNvbW1hbmQgaXMgbm90IHJ1biBpZiBjYXBhYmlsaXR5IGlzIGFscmVhZHkgbGlzdGVkLiBTZXQgdG8gdHJ1ZSB0byBza2lwIHRoaXMgdmFsaWRhdGlvblxuICAgKi9cbiAgYXN5bmMgdXBkYXRlQ2FwYWJpbGl0eSAoZm9yY2VkKSB7XG4gICAgLy8gc2tpcCByZXF1ZXN0LCBpZiBub3QgZm9yY2VkIHVwZGF0ZSBhbmQgY2FwYWJpbGl0aWVzIGFyZSBhbHJlYWR5IGxvYWRlZFxuICAgIGlmICghZm9yY2VkICYmIHRoaXMuX2NhcGFiaWxpdHkubGVuZ3RoKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBJZiBTVEFSVFRMUyBpcyByZXF1aXJlZCB0aGVuIHNraXAgY2FwYWJpbGl0eSBsaXN0aW5nIGFzIHdlIGFyZSBnb2luZyB0byB0cnlcbiAgICAvLyBTVEFSVFRMUyBhbnl3YXkgYW5kIHdlIHJlLWNoZWNrIGNhcGFiaWxpdGllcyBhZnRlciBjb25uZWN0aW9uIGlzIHNlY3VyZWRcbiAgICBpZiAoIXRoaXMuY2xpZW50LnNlY3VyZU1vZGUgJiYgdGhpcy5fcmVxdWlyZVRMUykge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ1VwZGF0aW5nIGNhcGFiaWxpdHkuLi4nKVxuICAgIHJldHVybiB0aGlzLmV4ZWMoJ0NBUEFCSUxJVFknKVxuICB9XG5cbiAgaGFzQ2FwYWJpbGl0eSAoY2FwYSA9ICcnKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NhcGFiaWxpdHkuaW5kZXhPZihjYXBhLnRvVXBwZXJDYXNlKCkudHJpbSgpKSA+PSAwXG4gIH1cblxuICAvLyBEZWZhdWx0IGhhbmRsZXJzIGZvciB1bnRhZ2dlZCByZXNwb25zZXNcblxuICAvKipcbiAgICogQ2hlY2tzIGlmIGFuIHVudGFnZ2VkIE9LIGluY2x1ZGVzIFtDQVBBQklMSVRZXSB0YWcgYW5kIHVwZGF0ZXMgY2FwYWJpbGl0eSBvYmplY3RcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIFBhcnNlZCBzZXJ2ZXIgcmVzcG9uc2VcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gbmV4dCBVbnRpbCBjYWxsZWQsIHNlcnZlciByZXNwb25zZXMgYXJlIG5vdCBwcm9jZXNzZWRcbiAgICovXG4gIF91bnRhZ2dlZE9rSGFuZGxlciAocmVzcG9uc2UpIHtcbiAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UuY2FwYWJpbGl0eSkge1xuICAgICAgdGhpcy5fY2FwYWJpbGl0eSA9IHJlc3BvbnNlLmNhcGFiaWxpdHlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyBjYXBhYmlsaXR5IG9iamVjdFxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgUGFyc2VkIHNlcnZlciByZXNwb25zZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBuZXh0IFVudGlsIGNhbGxlZCwgc2VydmVyIHJlc3BvbnNlcyBhcmUgbm90IHByb2Nlc3NlZFxuICAgKi9cbiAgX3VudGFnZ2VkQ2FwYWJpbGl0eUhhbmRsZXIgKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5fY2FwYWJpbGl0eSA9IHBpcGUoXG4gICAgICBwcm9wT3IoW10sICdhdHRyaWJ1dGVzJyksXG4gICAgICBtYXAoKHsgdmFsdWUgfSkgPT4gKHZhbHVlIHx8ICcnKS50b1VwcGVyQ2FzZSgpLnRyaW0oKSlcbiAgICApKHJlc3BvbnNlKVxuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgZXhpc3RpbmcgbWVzc2FnZSBjb3VudFxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgUGFyc2VkIHNlcnZlciByZXNwb25zZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBuZXh0IFVudGlsIGNhbGxlZCwgc2VydmVyIHJlc3BvbnNlcyBhcmUgbm90IHByb2Nlc3NlZFxuICAgKi9cbiAgX3VudGFnZ2VkRXhpc3RzSGFuZGxlciAocmVzcG9uc2UpIHtcbiAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UuaGFzT3duUHJvcGVydHkoJ25yJykpIHtcbiAgICAgIHRoaXMub251cGRhdGUgJiYgdGhpcy5vbnVwZGF0ZSh0aGlzLl9zZWxlY3RlZE1haWxib3gsICdleGlzdHMnLCByZXNwb25zZS5ucilcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSW5kaWNhdGVzIGEgbWVzc2FnZSBoYXMgYmVlbiBkZWxldGVkXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSBQYXJzZWQgc2VydmVyIHJlc3BvbnNlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG5leHQgVW50aWwgY2FsbGVkLCBzZXJ2ZXIgcmVzcG9uc2VzIGFyZSBub3QgcHJvY2Vzc2VkXG4gICAqL1xuICBfdW50YWdnZWRFeHB1bmdlSGFuZGxlciAocmVzcG9uc2UpIHtcbiAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UuaGFzT3duUHJvcGVydHkoJ25yJykpIHtcbiAgICAgIHRoaXMub251cGRhdGUgJiYgdGhpcy5vbnVwZGF0ZSh0aGlzLl9zZWxlY3RlZE1haWxib3gsICdleHB1bmdlJywgcmVzcG9uc2UubnIpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEluZGljYXRlcyB0aGF0IGZsYWdzIGhhdmUgYmVlbiB1cGRhdGVkIGZvciBhIG1lc3NhZ2VcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIFBhcnNlZCBzZXJ2ZXIgcmVzcG9uc2VcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gbmV4dCBVbnRpbCBjYWxsZWQsIHNlcnZlciByZXNwb25zZXMgYXJlIG5vdCBwcm9jZXNzZWRcbiAgICovXG4gIF91bnRhZ2dlZEZldGNoSGFuZGxlciAocmVzcG9uc2UpIHtcbiAgICB0aGlzLm9udXBkYXRlICYmIHRoaXMub251cGRhdGUodGhpcy5fc2VsZWN0ZWRNYWlsYm94LCAnZmV0Y2gnLCBbXS5jb25jYXQocGFyc2VGRVRDSCh7IHBheWxvYWQ6IHsgRkVUQ0g6IFtyZXNwb25zZV0gfSB9KSB8fCBbXSkuc2hpZnQoKSlcbiAgfVxuXG4gIC8vIFByaXZhdGUgaGVscGVyc1xuXG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgdGhhdCB0aGUgY29ubmVjdGlvbiBzdGFydGVkIGlkbGluZy4gSW5pdGlhdGVzIGEgY3ljbGVcbiAgICogb2YgTk9PUHMgb3IgSURMRXMgdG8gcmVjZWl2ZSBub3RpZmljYXRpb25zIGFib3V0IHVwZGF0ZXMgaW4gdGhlIHNlcnZlclxuICAgKi9cbiAgX29uSWRsZSAoKSB7XG4gICAgaWYgKCF0aGlzLl9hdXRoZW50aWNhdGVkIHx8IHRoaXMuX2VudGVyZWRJZGxlKSB7XG4gICAgICAvLyBObyBuZWVkIHRvIElETEUgd2hlbiBub3QgbG9nZ2VkIGluIG9yIGFscmVhZHkgaWRsaW5nXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnQ2xpZW50IHN0YXJ0ZWQgaWRsaW5nJylcbiAgICB0aGlzLmVudGVySWRsZSgpXG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyB0aGUgSU1BUCBzdGF0ZSB2YWx1ZSBmb3IgdGhlIGN1cnJlbnQgY29ubmVjdGlvblxuICAgKlxuICAgKiBAcGFyYW0ge051bWJlcn0gbmV3U3RhdGUgVGhlIHN0YXRlIHlvdSB3YW50IHRvIGNoYW5nZSB0b1xuICAgKi9cbiAgX2NoYW5nZVN0YXRlIChuZXdTdGF0ZSkge1xuICAgIGlmIChuZXdTdGF0ZSA9PT0gdGhpcy5fc3RhdGUpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdFbnRlcmluZyBzdGF0ZTogJyArIG5ld1N0YXRlKVxuXG4gICAgLy8gaWYgYSBtYWlsYm94IHdhcyBvcGVuZWQsIGVtaXQgb25jbG9zZW1haWxib3ggYW5kIGNsZWFyIHNlbGVjdGVkTWFpbGJveCB2YWx1ZVxuICAgIGlmICh0aGlzLl9zdGF0ZSA9PT0gU1RBVEVfU0VMRUNURUQgJiYgdGhpcy5fc2VsZWN0ZWRNYWlsYm94KSB7XG4gICAgICB0aGlzLm9uY2xvc2VtYWlsYm94ICYmIHRoaXMub25jbG9zZW1haWxib3godGhpcy5fc2VsZWN0ZWRNYWlsYm94KVxuICAgICAgdGhpcy5fc2VsZWN0ZWRNYWlsYm94ID0gZmFsc2VcbiAgICB9XG5cbiAgICB0aGlzLl9zdGF0ZSA9IG5ld1N0YXRlXG4gIH1cblxuICAvKipcbiAgICogRW5zdXJlcyBhIHBhdGggZXhpc3RzIGluIHRoZSBNYWlsYm94IHRyZWVcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHRyZWUgTWFpbGJveCB0cmVlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBkZWxpbWl0ZXJcbiAgICogQHJldHVybiB7T2JqZWN0fSBicmFuY2ggZm9yIHVzZWQgcGF0aFxuICAgKi9cbiAgX2Vuc3VyZVBhdGggKHRyZWUsIHBhdGgsIGRlbGltaXRlcikge1xuICAgIGNvbnN0IG5hbWVzID0gcGF0aC5zcGxpdChkZWxpbWl0ZXIpXG4gICAgbGV0IGJyYW5jaCA9IHRyZWVcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCBmb3VuZCA9IGZhbHNlXG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGJyYW5jaC5jaGlsZHJlbi5sZW5ndGg7IGorKykge1xuICAgICAgICBpZiAodGhpcy5fY29tcGFyZU1haWxib3hOYW1lcyhicmFuY2guY2hpbGRyZW5bal0ubmFtZSwgaW1hcERlY29kZShuYW1lc1tpXSkpKSB7XG4gICAgICAgICAgYnJhbmNoID0gYnJhbmNoLmNoaWxkcmVuW2pdXG4gICAgICAgICAgZm91bmQgPSB0cnVlXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFmb3VuZCkge1xuICAgICAgICBicmFuY2guY2hpbGRyZW4ucHVzaCh7XG4gICAgICAgICAgbmFtZTogaW1hcERlY29kZShuYW1lc1tpXSksXG4gICAgICAgICAgZGVsaW1pdGVyOiBkZWxpbWl0ZXIsXG4gICAgICAgICAgcGF0aDogbmFtZXMuc2xpY2UoMCwgaSArIDEpLmpvaW4oZGVsaW1pdGVyKSxcbiAgICAgICAgICBjaGlsZHJlbjogW11cbiAgICAgICAgfSlcbiAgICAgICAgYnJhbmNoID0gYnJhbmNoLmNoaWxkcmVuW2JyYW5jaC5jaGlsZHJlbi5sZW5ndGggLSAxXVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYnJhbmNoXG4gIH1cblxuICAvKipcbiAgICogQ29tcGFyZXMgdHdvIG1haWxib3ggbmFtZXMuIENhc2UgaW5zZW5zaXRpdmUgaW4gY2FzZSBvZiBJTkJPWCwgb3RoZXJ3aXNlIGNhc2Ugc2Vuc2l0aXZlXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBhIE1haWxib3ggbmFtZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gYiBNYWlsYm94IG5hbWVcbiAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGZvbGRlciBuYW1lcyBtYXRjaFxuICAgKi9cbiAgX2NvbXBhcmVNYWlsYm94TmFtZXMgKGEsIGIpIHtcbiAgICByZXR1cm4gKGEudG9VcHBlckNhc2UoKSA9PT0gJ0lOQk9YJyA/ICdJTkJPWCcgOiBhKSA9PT0gKGIudG9VcHBlckNhc2UoKSA9PT0gJ0lOQk9YJyA/ICdJTkJPWCcgOiBiKVxuICB9XG5cbiAgY3JlYXRlTG9nZ2VyIChjcmVhdG9yID0gY3JlYXRlRGVmYXVsdExvZ2dlcikge1xuICAgIGNvbnN0IGxvZ2dlciA9IGNyZWF0b3IoKHRoaXMuX2F1dGggfHwge30pLnVzZXIgfHwgJycsIHRoaXMuX2hvc3QpXG4gICAgdGhpcy5sb2dnZXIgPSB0aGlzLmNsaWVudC5sb2dnZXIgPSB7XG4gICAgICBkZWJ1ZzogKC4uLm1zZ3MpID0+IHsgaWYgKExPR19MRVZFTF9ERUJVRyA+PSB0aGlzLmxvZ0xldmVsKSB7IGxvZ2dlci5kZWJ1Zyhtc2dzKSB9IH0sXG4gICAgICBpbmZvOiAoLi4ubXNncykgPT4geyBpZiAoTE9HX0xFVkVMX0lORk8gPj0gdGhpcy5sb2dMZXZlbCkgeyBsb2dnZXIuaW5mbyhtc2dzKSB9IH0sXG4gICAgICB3YXJuOiAoLi4ubXNncykgPT4geyBpZiAoTE9HX0xFVkVMX1dBUk4gPj0gdGhpcy5sb2dMZXZlbCkgeyBsb2dnZXIud2Fybihtc2dzKSB9IH0sXG4gICAgICBlcnJvcjogKC4uLm1zZ3MpID0+IHsgaWYgKExPR19MRVZFTF9FUlJPUiA+PSB0aGlzLmxvZ0xldmVsKSB7IGxvZ2dlci5lcnJvcihtc2dzKSB9IH1cbiAgICB9XG4gIH1cbn1cbiJdfQ==