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
    this._onError = this._onError.bind(this);
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

    this.client.onerror = this._onError;

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

        _this.client.onerror = _this._onError;
      } catch (err) {
        _this.logger.error('Could not connect to server', err);

        try {
          yield _this.close(err); // we don't really care whether this works or not

          _this._onError(err);
        } catch (cErr) {
          _this._onError(cErr);

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

      try {
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
        }).catch(err => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
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

      try {
        const response = yield _this4.exec({
          command,
          attributes
        }, 'ID');
        const list = (0, _ramda.flatten)((0, _ramda.pathOr)([], ['payload', 'ID', '0', 'attributes', '0'], response).map(Object.values));
        const keys = list.filter((_, i) => i % 2 === 0);
        const values = list.filter((_, i) => i % 2 === 1);
        _this4.serverId = (0, _ramda.fromPairs)((0, _ramda.zip)(keys, values));

        _this4.logger.debug('Server id updated!', _this4.serverId);
      } catch (err) {
        _this4._onError(err);
      }
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

      try {
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
      } catch (err) {
        _this5._onError(err);
      }
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

      try {
        const response = yield _this6.exec('NAMESPACE', 'NAMESPACE');
        return (0, _commandParser.parseNAMESPACE)(response);
      } catch (err) {
        _this6._onError(err);
      }
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

      try {
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
      } catch (err) {
        _this7._onError(err);
      }
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

    try {
      const delResponse = this.exec({
        command: 'DELETE',
        attributes: [(0, _emailjsUtf.imapEncode)(path)]
      });
      return delResponse;
    } catch (err) {
      this._onError(err);
    }
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

      try {
        const command = (0, _commandBuilder.buildFETCHCommand)(sequence, items, options);
        const response = yield _this9.exec(command, 'FETCH', {
          precheck: ctx => _this9._shouldSelectMailbox(path, ctx) ? _this9.selectMailbox(path, {
            ctx
          }) : Promise.resolve()
        });
        return (0, _commandParser.parseFETCH)(response);
      } catch (err) {
        _this9._onError(err);
      }
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

      try {
        const command = (0, _commandBuilder.buildSEARCHCommand)(query, options);
        const response = yield _this10.exec(command, 'SEARCH', {
          precheck: ctx => _this10._shouldSelectMailbox(path, ctx) ? _this10.selectMailbox(path, {
            ctx
          }) : Promise.resolve()
        });
        return (0, _commandParser.parseSEARCH)(response);
      } catch (err) {
        _this10._onError(err);
      }
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
      try {
        const command = (0, _commandBuilder.buildSTORECommand)(sequence, action, flags, options);
        const response = yield _this11.exec(command, 'FETCH', {
          precheck: ctx => _this11._shouldSelectMailbox(path, ctx) ? _this11.selectMailbox(path, {
            ctx
          }) : Promise.resolve()
        });
        return (0, _commandParser.parseFETCH)(response);
      } catch (err) {
        _this11._onError(err);
      }
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

    try {
      const uploadResponse = this.exec(command);
      return uploadResponse;
    } catch (err) {
      this._onError(err);
    }
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

      try {
        const delResponse = _this12.exec(cmd, null, {
          precheck: ctx => _this12._shouldSelectMailbox(path, ctx) ? _this12.selectMailbox(path, {
            ctx
          }) : Promise.resolve()
        });

        return delResponse;
      } catch (err) {
        _this12._onError(err);
      }
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

      try {
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
      } catch (err) {
        _this13._onError(err);
      }
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
      }

      try {
        // If possible, use MOVE
        const moveResponse = _this14.exec({
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

        return moveResponse;
      } catch (err) {
        _this14._onError(err);
      }
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

      try {
        yield _this15.exec({
          command: 'COMPRESS',
          attributes: [{
            type: 'ATOM',
            value: 'DEFLATE'
          }]
        });

        _this15.client.enableCompression();

        _this15.logger.debug('Compression enabled, all data sent and received is deflated!');
      } catch (err) {
        _this15._onError(err);
      }
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

      try {
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
      } catch (err) {
        _this16._onError(err);
      }
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
    var _this18 = this;

    return _asyncToGenerator(function* () {
      if (_this18._enteredIdle) {
        return;
      }

      _this18._enteredIdle = _this18._capability.indexOf('IDLE') >= 0 ? 'IDLE' : 'NOOP';

      _this18.logger.debug('Entering idle with ' + _this18._enteredIdle);

      if (_this18._enteredIdle === 'NOOP') {
        _this18._idleTimeout = setTimeout(
        /*#__PURE__*/
        _asyncToGenerator(function* () {
          _this18.logger.debug('Sending NOOP');

          try {
            yield _this18.exec('NOOP');
          } catch (err) {
            _this18._onError(err);
          }
        }), _this18.timeoutNoop);
      } else if (_this18._enteredIdle === 'IDLE') {
        try {
          yield _this18.client.enqueueCommand({
            command: 'IDLE'
          });
        } catch (err) {
          _this18._onError(err);
        }

        _this18._idleTimeout = setTimeout(() => {
          try {
            _this18.client.send('DONE\r\n');
          } catch (err) {
            _this18._onError(err);
          }

          _this18._enteredIdle = false;

          _this18.logger.debug('Idle terminated');
        }, _this18.timeoutIdle);
      }
    })();
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
    var _this19 = this;

    return _asyncToGenerator(function* () {
      // skip request, if already secured
      if (_this19.client.secureMode) {
        return false;
      } // skip if STARTTLS not available or starttls support disabled


      if ((_this19._capability.indexOf('STARTTLS') < 0 || _this19._ignoreTLS) && !_this19._requireTLS) {
        return false;
      }

      _this19.logger.debug('Encrypting connection...');

      try {
        yield _this19.exec('STARTTLS');
      } catch (err) {
        _this19._onError(err);
      }

      _this19._capability = [];

      _this19.client.upgrade();

      return _this19.updateCapability();
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
    var _this20 = this;

    return _asyncToGenerator(function* () {
      // skip request, if not forced update and capabilities are already loaded
      if (!forced && _this20._capability.length) {
        return;
      } // If STARTTLS is required then skip capability listing as we are going to try
      // STARTTLS anyway and we re-check capabilities after connection is secured


      if (!_this20.client.secureMode && _this20._requireTLS) {
        return;
      }

      _this20.logger.debug('Updating capability...');

      try {
        const capResponse = _this20.exec('CAPABILITY');

        return capResponse;
      } catch (err) {
        _this20._onError(err);
      }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jbGllbnQuanMiXSwibmFtZXMiOlsiVElNRU9VVF9DT05ORUNUSU9OIiwiVElNRU9VVF9OT09QIiwiVElNRU9VVF9JRExFIiwiU1RBVEVfQ09OTkVDVElORyIsIlNUQVRFX05PVF9BVVRIRU5USUNBVEVEIiwiU1RBVEVfQVVUSEVOVElDQVRFRCIsIlNUQVRFX1NFTEVDVEVEIiwiU1RBVEVfTE9HT1VUIiwiREVGQVVMVF9DTElFTlRfSUQiLCJuYW1lIiwiQ2xpZW50IiwiY29uc3RydWN0b3IiLCJob3N0IiwicG9ydCIsIm9wdGlvbnMiLCJfb25FcnJvciIsImJpbmQiLCJ0aW1lb3V0Q29ubmVjdGlvbiIsInRpbWVvdXROb29wIiwidGltZW91dElkbGUiLCJzZXJ2ZXJJZCIsIm9uY2VydCIsIm9udXBkYXRlIiwib25zZWxlY3RtYWlsYm94Iiwib25jbG9zZW1haWxib3giLCJfaG9zdCIsIl9jbGllbnRJZCIsIl9zdGF0ZSIsIl9hdXRoZW50aWNhdGVkIiwiX2NhcGFiaWxpdHkiLCJfc2VsZWN0ZWRNYWlsYm94IiwiX2VudGVyZWRJZGxlIiwiX2lkbGVUaW1lb3V0IiwiX2VuYWJsZUNvbXByZXNzaW9uIiwiZW5hYmxlQ29tcHJlc3Npb24iLCJfYXV0aCIsImF1dGgiLCJfcmVxdWlyZVRMUyIsInJlcXVpcmVUTFMiLCJfaWdub3JlVExTIiwiaWdub3JlVExTIiwiY2xpZW50IiwiSW1hcENsaWVudCIsIm9uZXJyb3IiLCJjZXJ0Iiwib25pZGxlIiwiX29uSWRsZSIsInNldEhhbmRsZXIiLCJyZXNwb25zZSIsIl91bnRhZ2dlZENhcGFiaWxpdHlIYW5kbGVyIiwiX3VudGFnZ2VkT2tIYW5kbGVyIiwiX3VudGFnZ2VkRXhpc3RzSGFuZGxlciIsIl91bnRhZ2dlZEV4cHVuZ2VIYW5kbGVyIiwiX3VudGFnZ2VkRmV0Y2hIYW5kbGVyIiwiY3JlYXRlTG9nZ2VyIiwibG9nTGV2ZWwiLCJMT0dfTEVWRUxfQUxMIiwiZXJyIiwiY2xlYXJUaW1lb3V0IiwiY29ubmVjdCIsIl9vcGVuQ29ubmVjdGlvbiIsIl9jaGFuZ2VTdGF0ZSIsInVwZGF0ZUNhcGFiaWxpdHkiLCJ1cGdyYWRlQ29ubmVjdGlvbiIsInVwZGF0ZUlkIiwibG9nZ2VyIiwid2FybiIsIm1lc3NhZ2UiLCJsb2dpbiIsImNvbXByZXNzQ29ubmVjdGlvbiIsImRlYnVnIiwiZXJyb3IiLCJjbG9zZSIsImNFcnIiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImNvbm5lY3Rpb25UaW1lb3V0Iiwic2V0VGltZW91dCIsIkVycm9yIiwidGhlbiIsIm9ucmVhZHkiLCJjYXRjaCIsImxvZ291dCIsImlkIiwiaW5kZXhPZiIsImNvbW1hbmQiLCJhdHRyaWJ1dGVzIiwiT2JqZWN0IiwiZW50cmllcyIsImV4ZWMiLCJsaXN0IiwibWFwIiwidmFsdWVzIiwia2V5cyIsImZpbHRlciIsIl8iLCJpIiwiX3Nob3VsZFNlbGVjdE1haWxib3giLCJwYXRoIiwiY3R4IiwicHJldmlvdXNTZWxlY3QiLCJnZXRQcmV2aW91c2x5UXVldWVkIiwicmVxdWVzdCIsInBhdGhBdHRyaWJ1dGUiLCJmaW5kIiwiYXR0cmlidXRlIiwidHlwZSIsInZhbHVlIiwic2VsZWN0TWFpbGJveCIsInF1ZXJ5IiwicmVhZE9ubHkiLCJjb25kc3RvcmUiLCJwdXNoIiwibWFpbGJveEluZm8iLCJsaXN0TmFtZXNwYWNlcyIsImxpc3RNYWlsYm94ZXMiLCJ0cmVlIiwicm9vdCIsImNoaWxkcmVuIiwibGlzdFJlc3BvbnNlIiwiZm9yRWFjaCIsIml0ZW0iLCJhdHRyIiwibGVuZ3RoIiwiZGVsaW0iLCJicmFuY2giLCJfZW5zdXJlUGF0aCIsImZsYWdzIiwibGlzdGVkIiwibHN1YlJlc3BvbnNlIiwibHN1YiIsImZsYWciLCJzdWJzY3JpYmVkIiwiY3JlYXRlTWFpbGJveCIsImNvZGUiLCJkZWxldGVNYWlsYm94IiwiZGVsUmVzcG9uc2UiLCJsaXN0TWVzc2FnZXMiLCJzZXF1ZW5jZSIsIml0ZW1zIiwiZmFzdCIsInByZWNoZWNrIiwic2VhcmNoIiwic2V0RmxhZ3MiLCJrZXkiLCJBcnJheSIsImlzQXJyYXkiLCJjb25jYXQiLCJhZGQiLCJzZXQiLCJyZW1vdmUiLCJzdG9yZSIsImFjdGlvbiIsInVwbG9hZCIsImRlc3RpbmF0aW9uIiwidXBsb2FkUmVzcG9uc2UiLCJkZWxldGVNZXNzYWdlcyIsInVzZVVpZFBsdXMiLCJieVVpZCIsInVpZEV4cHVuZ2VDb21tYW5kIiwiY21kIiwiY29weU1lc3NhZ2VzIiwiaHVtYW5SZWFkYWJsZSIsIm1vdmVNZXNzYWdlcyIsIm1vdmVSZXNwb25zZSIsImNvbXByZXNzZWQiLCJ4b2F1dGgyIiwidXNlciIsInNlbnNpdGl2ZSIsImVycm9yUmVzcG9uc2VFeHBlY3RzRW1wdHlMaW5lIiwicGFzcyIsImNhcGFiaWxpdHkiLCJwYXlsb2FkIiwiQ0FQQUJJTElUWSIsInBvcCIsImNhcGEiLCJ0b1VwcGVyQ2FzZSIsInRyaW0iLCJhY2NlcHRVbnRhZ2dlZCIsImJyZWFrSWRsZSIsImVucXVldWVDb21tYW5kIiwiZW50ZXJJZGxlIiwic2VuZCIsInNlY3VyZU1vZGUiLCJ1cGdyYWRlIiwiZm9yY2VkIiwiY2FwUmVzcG9uc2UiLCJoYXNDYXBhYmlsaXR5IiwiaGFzT3duUHJvcGVydHkiLCJuciIsIkZFVENIIiwic2hpZnQiLCJuZXdTdGF0ZSIsImRlbGltaXRlciIsIm5hbWVzIiwic3BsaXQiLCJmb3VuZCIsImoiLCJfY29tcGFyZU1haWxib3hOYW1lcyIsInNsaWNlIiwiam9pbiIsImEiLCJiIiwiY3JlYXRvciIsImNyZWF0ZURlZmF1bHRMb2dnZXIiLCJtc2dzIiwiTE9HX0xFVkVMX0RFQlVHIiwiaW5mbyIsIkxPR19MRVZFTF9JTkZPIiwiTE9HX0xFVkVMX1dBUk4iLCJMT0dfTEVWRUxfRVJST1IiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7QUFDQTs7QUFDQTs7QUFNQTs7QUFPQTs7QUFDQTs7QUFDQTs7QUFRQTs7Ozs7Ozs7QUFJTyxNQUFNQSxrQkFBa0IsR0FBRyxLQUFLLElBQWhDLEMsQ0FBcUM7OztBQUNy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QUFKLEtBQWE7QUFBRSxZQUFJSSwwQkFBa0IsS0FBSzNKLFFBQTNCLEVBQXFDO0FBQUVVLFVBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZNEksSUFBWjtBQUFtQjtBQUFFLE9BSGhEO0FBSWpDdkksTUFBQUEsS0FBSyxFQUFFLENBQUMsR0FBR3VJLElBQUosS0FBYTtBQUFFLFlBQUlLLDJCQUFtQixLQUFLNUosUUFBNUIsRUFBc0M7QUFBRVUsVUFBQUEsTUFBTSxDQUFDTSxLQUFQLENBQWF1SSxJQUFiO0FBQW9CO0FBQUU7QUFKbkQsS0FBbkM7QUFNRDs7QUFsK0J5QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IG1hcCwgcGlwZSwgdW5pb24sIHppcCwgZnJvbVBhaXJzLCBwcm9wT3IsIHBhdGhPciwgZmxhdHRlbiB9IGZyb20gJ3JhbWRhJ1xuaW1wb3J0IHsgaW1hcEVuY29kZSwgaW1hcERlY29kZSB9IGZyb20gJ2VtYWlsanMtdXRmNydcbmltcG9ydCB7XG4gIHBhcnNlTkFNRVNQQUNFLFxuICBwYXJzZVNFTEVDVCxcbiAgcGFyc2VGRVRDSCxcbiAgcGFyc2VTRUFSQ0hcbn0gZnJvbSAnLi9jb21tYW5kLXBhcnNlcidcbmltcG9ydCB7XG4gIGJ1aWxkRkVUQ0hDb21tYW5kLFxuICBidWlsZFhPQXV0aDJUb2tlbixcbiAgYnVpbGRTRUFSQ0hDb21tYW5kLFxuICBidWlsZFNUT1JFQ29tbWFuZFxufSBmcm9tICcuL2NvbW1hbmQtYnVpbGRlcidcblxuaW1wb3J0IGNyZWF0ZURlZmF1bHRMb2dnZXIgZnJvbSAnLi9sb2dnZXInXG5pbXBvcnQgSW1hcENsaWVudCBmcm9tICcuL2ltYXAnXG5pbXBvcnQge1xuICBMT0dfTEVWRUxfRVJST1IsXG4gIExPR19MRVZFTF9XQVJOLFxuICBMT0dfTEVWRUxfSU5GTyxcbiAgTE9HX0xFVkVMX0RFQlVHLFxuICBMT0dfTEVWRUxfQUxMXG59IGZyb20gJy4vY29tbW9uJ1xuXG5pbXBvcnQge1xuICBjaGVja1NwZWNpYWxVc2Vcbn0gZnJvbSAnLi9zcGVjaWFsLXVzZSdcblxuZXhwb3J0IGNvbnN0IFRJTUVPVVRfQ09OTkVDVElPTiA9IDkwICogMTAwMCAvLyBNaWxsaXNlY29uZHMgdG8gd2FpdCBmb3IgdGhlIElNQVAgZ3JlZXRpbmcgZnJvbSB0aGUgc2VydmVyXG5leHBvcnQgY29uc3QgVElNRU9VVF9OT09QID0gNjAgKiAxMDAwIC8vIE1pbGxpc2Vjb25kcyBiZXR3ZWVuIE5PT1AgY29tbWFuZHMgd2hpbGUgaWRsaW5nXG5leHBvcnQgY29uc3QgVElNRU9VVF9JRExFID0gNjAgKiAxMDAwIC8vIE1pbGxpc2Vjb25kcyB1bnRpbCBJRExFIGNvbW1hbmQgaXMgY2FuY2VsbGVkXG5cbmV4cG9ydCBjb25zdCBTVEFURV9DT05ORUNUSU5HID0gMVxuZXhwb3J0IGNvbnN0IFNUQVRFX05PVF9BVVRIRU5USUNBVEVEID0gMlxuZXhwb3J0IGNvbnN0IFNUQVRFX0FVVEhFTlRJQ0FURUQgPSAzXG5leHBvcnQgY29uc3QgU1RBVEVfU0VMRUNURUQgPSA0XG5leHBvcnQgY29uc3QgU1RBVEVfTE9HT1VUID0gNVxuXG5leHBvcnQgY29uc3QgREVGQVVMVF9DTElFTlRfSUQgPSB7XG4gIG5hbWU6ICdlbWFpbGpzLWltYXAtY2xpZW50J1xufVxuXG4vKipcbiAqIGVtYWlsanMgSU1BUCBjbGllbnRcbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gW2hvc3Q9J2xvY2FsaG9zdCddIEhvc3RuYW1lIHRvIGNvbmVuY3QgdG9cbiAqIEBwYXJhbSB7TnVtYmVyfSBbcG9ydD0xNDNdIFBvcnQgbnVtYmVyIHRvIGNvbm5lY3QgdG9cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gT3B0aW9uYWwgb3B0aW9ucyBvYmplY3RcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ2xpZW50IHtcbiAgY29uc3RydWN0b3IgKGhvc3QsIHBvcnQsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMuX29uRXJyb3IgPSB0aGlzLl9vbkVycm9yLmJpbmQodGhpcylcbiAgICB0aGlzLnRpbWVvdXRDb25uZWN0aW9uID0gVElNRU9VVF9DT05ORUNUSU9OXG4gICAgdGhpcy50aW1lb3V0Tm9vcCA9IFRJTUVPVVRfTk9PUFxuICAgIHRoaXMudGltZW91dElkbGUgPSBUSU1FT1VUX0lETEVcblxuICAgIHRoaXMuc2VydmVySWQgPSBmYWxzZSAvLyBSRkMgMjk3MSBTZXJ2ZXIgSUQgYXMga2V5IHZhbHVlIHBhaXJzXG5cbiAgICAvLyBFdmVudCBwbGFjZWhvbGRlcnNcbiAgICB0aGlzLm9uY2VydCA9IG51bGxcbiAgICB0aGlzLm9udXBkYXRlID0gbnVsbFxuICAgIHRoaXMub25zZWxlY3RtYWlsYm94ID0gbnVsbFxuICAgIHRoaXMub25jbG9zZW1haWxib3ggPSBudWxsXG5cbiAgICB0aGlzLl9ob3N0ID0gaG9zdFxuICAgIHRoaXMuX2NsaWVudElkID0gcHJvcE9yKERFRkFVTFRfQ0xJRU5UX0lELCAnaWQnLCBvcHRpb25zKVxuICAgIHRoaXMuX3N0YXRlID0gZmFsc2UgLy8gQ3VycmVudCBzdGF0ZVxuICAgIHRoaXMuX2F1dGhlbnRpY2F0ZWQgPSBmYWxzZSAvLyBJcyB0aGUgY29ubmVjdGlvbiBhdXRoZW50aWNhdGVkXG4gICAgdGhpcy5fY2FwYWJpbGl0eSA9IFtdIC8vIExpc3Qgb2YgZXh0ZW5zaW9ucyB0aGUgc2VydmVyIHN1cHBvcnRzXG4gICAgdGhpcy5fc2VsZWN0ZWRNYWlsYm94ID0gZmFsc2UgLy8gU2VsZWN0ZWQgbWFpbGJveFxuICAgIHRoaXMuX2VudGVyZWRJZGxlID0gZmFsc2VcbiAgICB0aGlzLl9pZGxlVGltZW91dCA9IGZhbHNlXG4gICAgdGhpcy5fZW5hYmxlQ29tcHJlc3Npb24gPSAhIW9wdGlvbnMuZW5hYmxlQ29tcHJlc3Npb25cbiAgICB0aGlzLl9hdXRoID0gb3B0aW9ucy5hdXRoXG4gICAgdGhpcy5fcmVxdWlyZVRMUyA9ICEhb3B0aW9ucy5yZXF1aXJlVExTXG4gICAgdGhpcy5faWdub3JlVExTID0gISFvcHRpb25zLmlnbm9yZVRMU1xuXG4gICAgdGhpcy5jbGllbnQgPSBuZXcgSW1hcENsaWVudChob3N0LCBwb3J0LCBvcHRpb25zKSAvLyBJTUFQIGNsaWVudCBvYmplY3RcblxuICAgIC8vIEV2ZW50IEhhbmRsZXJzXG4gICAgdGhpcy5jbGllbnQub25lcnJvciA9IHRoaXMuX29uRXJyb3JcbiAgICB0aGlzLmNsaWVudC5vbmNlcnQgPSAoY2VydCkgPT4gKHRoaXMub25jZXJ0ICYmIHRoaXMub25jZXJ0KGNlcnQpKSAvLyBhbGxvd3MgY2VydGlmaWNhdGUgaGFuZGxpbmcgZm9yIHBsYXRmb3JtcyB3L28gbmF0aXZlIHRscyBzdXBwb3J0XG4gICAgdGhpcy5jbGllbnQub25pZGxlID0gKCkgPT4gdGhpcy5fb25JZGxlKCkgLy8gc3RhcnQgaWRsaW5nXG5cbiAgICAvLyBEZWZhdWx0IGhhbmRsZXJzIGZvciB1bnRhZ2dlZCByZXNwb25zZXNcbiAgICB0aGlzLmNsaWVudC5zZXRIYW5kbGVyKCdjYXBhYmlsaXR5JywgKHJlc3BvbnNlKSA9PiB0aGlzLl91bnRhZ2dlZENhcGFiaWxpdHlIYW5kbGVyKHJlc3BvbnNlKSkgLy8gY2FwYWJpbGl0eSB1cGRhdGVzXG4gICAgdGhpcy5jbGllbnQuc2V0SGFuZGxlcignb2snLCAocmVzcG9uc2UpID0+IHRoaXMuX3VudGFnZ2VkT2tIYW5kbGVyKHJlc3BvbnNlKSkgLy8gbm90aWZpY2F0aW9uc1xuICAgIHRoaXMuY2xpZW50LnNldEhhbmRsZXIoJ2V4aXN0cycsIChyZXNwb25zZSkgPT4gdGhpcy5fdW50YWdnZWRFeGlzdHNIYW5kbGVyKHJlc3BvbnNlKSkgLy8gbWVzc2FnZSBjb3VudCBoYXMgY2hhbmdlZFxuICAgIHRoaXMuY2xpZW50LnNldEhhbmRsZXIoJ2V4cHVuZ2UnLCAocmVzcG9uc2UpID0+IHRoaXMuX3VudGFnZ2VkRXhwdW5nZUhhbmRsZXIocmVzcG9uc2UpKSAvLyBtZXNzYWdlIGhhcyBiZWVuIGRlbGV0ZWRcbiAgICB0aGlzLmNsaWVudC5zZXRIYW5kbGVyKCdmZXRjaCcsIChyZXNwb25zZSkgPT4gdGhpcy5fdW50YWdnZWRGZXRjaEhhbmRsZXIocmVzcG9uc2UpKSAvLyBtZXNzYWdlIGhhcyBiZWVuIHVwZGF0ZWQgKGVnLiBmbGFnIGNoYW5nZSlcblxuICAgIC8vIEFjdGl2YXRlIGxvZ2dpbmdcbiAgICB0aGlzLmNyZWF0ZUxvZ2dlcigpXG4gICAgdGhpcy5sb2dMZXZlbCA9IHByb3BPcihMT0dfTEVWRUxfQUxMLCAnbG9nTGV2ZWwnLCBvcHRpb25zKVxuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCBpZiB0aGUgbG93ZXItbGV2ZWwgSW1hcENsaWVudCBoYXMgZW5jb3VudGVyZWQgYW4gdW5yZWNvdmVyYWJsZVxuICAgKiBlcnJvciBkdXJpbmcgb3BlcmF0aW9uLiBDbGVhbnMgdXAgYW5kIHByb3BhZ2F0ZXMgdGhlIGVycm9yIHVwd2FyZHMuXG4gICAqL1xuICBfb25FcnJvciAoZXJyKSB7XG4gICAgLy8gbWFrZSBzdXJlIG5vIGlkbGUgdGltZW91dCBpcyBwZW5kaW5nIGFueW1vcmVcbiAgICBjbGVhclRpbWVvdXQodGhpcy5faWRsZVRpbWVvdXQpXG5cbiAgICAvLyBwcm9wYWdhdGUgdGhlIGVycm9yIHVwd2FyZHNcbiAgICB0aGlzLm9uZXJyb3IgJiYgdGhpcy5vbmVycm9yKGVycilcbiAgfVxuXG4gIC8vXG4gIC8vXG4gIC8vIFBVQkxJQyBBUElcbiAgLy9cbiAgLy9cblxuICAvKipcbiAgICogSW5pdGlhdGUgY29ubmVjdGlvbiB0byB0aGUgSU1BUCBzZXJ2ZXJcbiAgICpcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2hlbiBsb2dpbiBwcm9jZWR1cmUgaXMgY29tcGxldGVcbiAgICovXG4gIGFzeW5jIGNvbm5lY3QgKCkge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLl9vcGVuQ29ubmVjdGlvbigpXG4gICAgICB0aGlzLl9jaGFuZ2VTdGF0ZShTVEFURV9OT1RfQVVUSEVOVElDQVRFRClcbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ2FwYWJpbGl0eSgpXG4gICAgICBhd2FpdCB0aGlzLnVwZ3JhZGVDb25uZWN0aW9uKClcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMudXBkYXRlSWQodGhpcy5fY2xpZW50SWQpXG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybignRmFpbGVkIHRvIHVwZGF0ZSBzZXJ2ZXIgaWQhJywgZXJyLm1lc3NhZ2UpXG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMubG9naW4odGhpcy5fYXV0aClcbiAgICAgIGF3YWl0IHRoaXMuY29tcHJlc3NDb25uZWN0aW9uKClcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdDb25uZWN0aW9uIGVzdGFibGlzaGVkLCByZWFkeSB0byByb2xsIScpXG4gICAgICB0aGlzLmNsaWVudC5vbmVycm9yID0gdGhpcy5fb25FcnJvclxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ0NvdWxkIG5vdCBjb25uZWN0IHRvIHNlcnZlcicsIGVycilcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMuY2xvc2UoZXJyKSAvLyB3ZSBkb24ndCByZWFsbHkgY2FyZSB3aGV0aGVyIHRoaXMgd29ya3Mgb3Igbm90XG4gICAgICAgIHRoaXMuX29uRXJyb3IoZXJyKVxuICAgICAgfSBjYXRjaCAoY0Vycikge1xuICAgICAgICB0aGlzLl9vbkVycm9yKGNFcnIpXG4gICAgICAgIHRocm93IGNFcnJcbiAgICAgIH1cbiAgICAgIHRocm93IGVyclxuICAgIH1cbiAgfVxuXG4gIF9vcGVuQ29ubmVjdGlvbiAoKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGxldCBjb25uZWN0aW9uVGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gcmVqZWN0KG5ldyBFcnJvcignVGltZW91dCBjb25uZWN0aW5nIHRvIHNlcnZlcicpKSwgdGhpcy50aW1lb3V0Q29ubmVjdGlvbilcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdDb25uZWN0aW5nIHRvJywgdGhpcy5jbGllbnQuaG9zdCwgJzonLCB0aGlzLmNsaWVudC5wb3J0KVxuICAgICAgdGhpcy5fY2hhbmdlU3RhdGUoU1RBVEVfQ09OTkVDVElORylcbiAgICAgIHRyeSB7XG4gICAgICAgIHRoaXMuY2xpZW50LmNvbm5lY3QoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnU29ja2V0IG9wZW5lZCwgd2FpdGluZyBmb3IgZ3JlZXRpbmcgZnJvbSB0aGUgc2VydmVyLi4uJylcblxuICAgICAgICAgIHRoaXMuY2xpZW50Lm9ucmVhZHkgPSAoKSA9PiB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoY29ubmVjdGlvblRpbWVvdXQpXG4gICAgICAgICAgICByZXNvbHZlKClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLmNsaWVudC5vbmVycm9yID0gKGVycikgPT4ge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGNvbm5lY3Rpb25UaW1lb3V0KVxuICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICB9XG4gICAgICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgfSlcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICByZWplY3QoZXJyKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogTG9nb3V0XG4gICAqXG4gICAqIFNlbmQgTE9HT1VULCB0byB3aGljaCB0aGUgc2VydmVyIHJlc3BvbmRzIGJ5IGNsb3NpbmcgdGhlIGNvbm5lY3Rpb24uXG4gICAqIFVzZSBpcyBkaXNjb3VyYWdlZCBpZiBuZXR3b3JrIHN0YXR1cyBpcyB1bmNsZWFyISBJZiBuZXR3b3JrcyBzdGF0dXMgaXNcbiAgICogdW5jbGVhciwgcGxlYXNlIHVzZSAjY2xvc2UgaW5zdGVhZCFcbiAgICpcbiAgICogTE9HT1VUIGRldGFpbHM6XG4gICAqICAgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjEuM1xuICAgKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUmVzb2x2ZXMgd2hlbiBzZXJ2ZXIgaGFzIGNsb3NlZCB0aGUgY29ubmVjdGlvblxuICAgKi9cbiAgYXN5bmMgbG9nb3V0ICgpIHtcbiAgICB0aGlzLl9jaGFuZ2VTdGF0ZShTVEFURV9MT0dPVVQpXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0xvZ2dpbmcgb3V0Li4uJylcbiAgICBhd2FpdCB0aGlzLmNsaWVudC5sb2dvdXQoKVxuICAgIGNsZWFyVGltZW91dCh0aGlzLl9pZGxlVGltZW91dClcbiAgfVxuXG4gIC8qKlxuICAgKiBGb3JjZS1jbG9zZXMgdGhlIGN1cnJlbnQgY29ubmVjdGlvbiBieSBjbG9zaW5nIHRoZSBUQ1Agc29ja2V0LlxuICAgKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUmVzb2x2ZXMgd2hlbiBzb2NrZXQgaXMgY2xvc2VkXG4gICAqL1xuICBhc3luYyBjbG9zZSAoZXJyKSB7XG4gICAgdGhpcy5fY2hhbmdlU3RhdGUoU1RBVEVfTE9HT1VUKVxuICAgIGNsZWFyVGltZW91dCh0aGlzLl9pZGxlVGltZW91dClcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnQ2xvc2luZyBjb25uZWN0aW9uLi4uJylcbiAgICBhd2FpdCB0aGlzLmNsaWVudC5jbG9zZShlcnIpXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX2lkbGVUaW1lb3V0KVxuICB9XG5cbiAgLyoqXG4gICAqIFJ1bnMgSUQgY29tbWFuZCwgcGFyc2VzIElEIHJlc3BvbnNlLCBzZXRzIHRoaXMuc2VydmVySWRcbiAgICpcbiAgICogSUQgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMyOTcxXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBpZCBJRCBhcyBKU09OIG9iamVjdC4gU2VlIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzI5NzEjc2VjdGlvbi0zLjMgZm9yIHBvc3NpYmxlIHZhbHVlc1xuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUmVzb2x2ZXMgd2hlbiByZXNwb25zZSBoYXMgYmVlbiBwYXJzZWRcbiAgICovXG4gIGFzeW5jIHVwZGF0ZUlkIChpZCkge1xuICAgIGlmICh0aGlzLl9jYXBhYmlsaXR5LmluZGV4T2YoJ0lEJykgPCAwKSByZXR1cm5cblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdVcGRhdGluZyBpZC4uLicpXG5cbiAgICBjb25zdCBjb21tYW5kID0gJ0lEJ1xuICAgIGNvbnN0IGF0dHJpYnV0ZXMgPSBpZCA/IFsgZmxhdHRlbihPYmplY3QuZW50cmllcyhpZCkpIF0gOiBbIG51bGwgXVxuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuZXhlYyh7IGNvbW1hbmQsIGF0dHJpYnV0ZXMgfSwgJ0lEJylcbiAgICAgIGNvbnN0IGxpc3QgPSBmbGF0dGVuKHBhdGhPcihbXSwgWydwYXlsb2FkJywgJ0lEJywgJzAnLCAnYXR0cmlidXRlcycsICcwJ10sIHJlc3BvbnNlKS5tYXAoT2JqZWN0LnZhbHVlcykpXG4gICAgICBjb25zdCBrZXlzID0gbGlzdC5maWx0ZXIoKF8sIGkpID0+IGkgJSAyID09PSAwKVxuICAgICAgY29uc3QgdmFsdWVzID0gbGlzdC5maWx0ZXIoKF8sIGkpID0+IGkgJSAyID09PSAxKVxuICAgICAgdGhpcy5zZXJ2ZXJJZCA9IGZyb21QYWlycyh6aXAoa2V5cywgdmFsdWVzKSlcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdTZXJ2ZXIgaWQgdXBkYXRlZCEnLCB0aGlzLnNlcnZlcklkKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5fb25FcnJvcihlcnIpXG4gICAgfVxuICB9XG5cbiAgX3Nob3VsZFNlbGVjdE1haWxib3ggKHBhdGgsIGN0eCkge1xuICAgIGlmICghY3R4KSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cblxuICAgIGNvbnN0IHByZXZpb3VzU2VsZWN0ID0gdGhpcy5jbGllbnQuZ2V0UHJldmlvdXNseVF1ZXVlZChbJ1NFTEVDVCcsICdFWEFNSU5FJ10sIGN0eClcbiAgICBpZiAocHJldmlvdXNTZWxlY3QgJiYgcHJldmlvdXNTZWxlY3QucmVxdWVzdC5hdHRyaWJ1dGVzKSB7XG4gICAgICBjb25zdCBwYXRoQXR0cmlidXRlID0gcHJldmlvdXNTZWxlY3QucmVxdWVzdC5hdHRyaWJ1dGVzLmZpbmQoKGF0dHJpYnV0ZSkgPT4gYXR0cmlidXRlLnR5cGUgPT09ICdTVFJJTkcnKVxuICAgICAgaWYgKHBhdGhBdHRyaWJ1dGUpIHtcbiAgICAgICAgcmV0dXJuIHBhdGhBdHRyaWJ1dGUudmFsdWUgIT09IHBhdGhcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fc2VsZWN0ZWRNYWlsYm94ICE9PSBwYXRoXG4gIH1cblxuICAvKipcbiAgICogUnVucyBTRUxFQ1Qgb3IgRVhBTUlORSB0byBvcGVuIGEgbWFpbGJveFxuICAgKlxuICAgKiBTRUxFQ1QgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi4zLjFcbiAgICogRVhBTUlORSBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjMuMlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBGdWxsIHBhdGggdG8gbWFpbGJveFxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIE9wdGlvbnMgb2JqZWN0XG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdpdGggaW5mb3JtYXRpb24gYWJvdXQgdGhlIHNlbGVjdGVkIG1haWxib3hcbiAgICovXG4gIGFzeW5jIHNlbGVjdE1haWxib3ggKHBhdGgsIG9wdGlvbnMgPSB7fSkge1xuICAgIGxldCBxdWVyeSA9IHtcbiAgICAgIGNvbW1hbmQ6IG9wdGlvbnMucmVhZE9ubHkgPyAnRVhBTUlORScgOiAnU0VMRUNUJyxcbiAgICAgIGF0dHJpYnV0ZXM6IFt7IHR5cGU6ICdTVFJJTkcnLCB2YWx1ZTogcGF0aCB9XVxuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmNvbmRzdG9yZSAmJiB0aGlzLl9jYXBhYmlsaXR5LmluZGV4T2YoJ0NPTkRTVE9SRScpID49IDApIHtcbiAgICAgIHF1ZXJ5LmF0dHJpYnV0ZXMucHVzaChbeyB0eXBlOiAnQVRPTScsIHZhbHVlOiAnQ09ORFNUT1JFJyB9XSlcbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnT3BlbmluZycsIHBhdGgsICcuLi4nKVxuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuZXhlYyhxdWVyeSwgWydFWElTVFMnLCAnRkxBR1MnLCAnT0snXSwgeyBjdHg6IG9wdGlvbnMuY3R4IH0pXG4gICAgICBsZXQgbWFpbGJveEluZm8gPSBwYXJzZVNFTEVDVChyZXNwb25zZSlcblxuICAgICAgdGhpcy5fY2hhbmdlU3RhdGUoU1RBVEVfU0VMRUNURUQpXG5cbiAgICAgIGlmICh0aGlzLl9zZWxlY3RlZE1haWxib3ggIT09IHBhdGggJiYgdGhpcy5vbmNsb3NlbWFpbGJveCkge1xuICAgICAgICBhd2FpdCB0aGlzLm9uY2xvc2VtYWlsYm94KHRoaXMuX3NlbGVjdGVkTWFpbGJveClcbiAgICAgIH1cbiAgICAgIHRoaXMuX3NlbGVjdGVkTWFpbGJveCA9IHBhdGhcbiAgICAgIGlmICh0aGlzLm9uc2VsZWN0bWFpbGJveCkge1xuICAgICAgICBhd2FpdCB0aGlzLm9uc2VsZWN0bWFpbGJveChwYXRoLCBtYWlsYm94SW5mbylcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG1haWxib3hJbmZvXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLl9vbkVycm9yKGVycilcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUnVucyBOQU1FU1BBQ0UgY29tbWFuZFxuICAgKlxuICAgKiBOQU1FU1BBQ0UgZGV0YWlsczpcbiAgICogICBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMjM0MlxuICAgKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB3aXRoIG5hbWVzcGFjZSBvYmplY3RcbiAgICovXG4gIGFzeW5jIGxpc3ROYW1lc3BhY2VzICgpIHtcbiAgICBpZiAodGhpcy5fY2FwYWJpbGl0eS5pbmRleE9mKCdOQU1FU1BBQ0UnKSA8IDApIHJldHVybiBmYWxzZVxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0xpc3RpbmcgbmFtZXNwYWNlcy4uLicpXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5leGVjKCdOQU1FU1BBQ0UnLCAnTkFNRVNQQUNFJylcbiAgICAgIHJldHVybiBwYXJzZU5BTUVTUEFDRShyZXNwb25zZSlcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuX29uRXJyb3IoZXJyKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIExJU1QgYW5kIExTVUIgY29tbWFuZHMuIFJldHJpZXZlcyBhIHRyZWUgb2YgYXZhaWxhYmxlIG1haWxib3hlc1xuICAgKlxuICAgKiBMSVNUIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuMy44XG4gICAqIExTVUIgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi4zLjlcbiAgICpcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2l0aCBsaXN0IG9mIG1haWxib3hlc1xuICAgKi9cbiAgYXN5bmMgbGlzdE1haWxib3hlcyAoKSB7XG4gICAgY29uc3QgdHJlZSA9IHsgcm9vdDogdHJ1ZSwgY2hpbGRyZW46IFtdIH1cblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdMaXN0aW5nIG1haWxib3hlcy4uLicpXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGxpc3RSZXNwb25zZSA9IGF3YWl0IHRoaXMuZXhlYyh7IGNvbW1hbmQ6ICdMSVNUJywgYXR0cmlidXRlczogWycnLCAnKiddIH0sICdMSVNUJylcbiAgICAgIGNvbnN0IGxpc3QgPSBwYXRoT3IoW10sIFsncGF5bG9hZCcsICdMSVNUJ10sIGxpc3RSZXNwb25zZSlcbiAgICAgIGxpc3QuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgY29uc3QgYXR0ciA9IHByb3BPcihbXSwgJ2F0dHJpYnV0ZXMnLCBpdGVtKVxuICAgICAgICBpZiAoYXR0ci5sZW5ndGggPCAzKSByZXR1cm5cblxuICAgICAgICBjb25zdCBwYXRoID0gcGF0aE9yKCcnLCBbJzInLCAndmFsdWUnXSwgYXR0cilcbiAgICAgICAgY29uc3QgZGVsaW0gPSBwYXRoT3IoJy8nLCBbJzEnLCAndmFsdWUnXSwgYXR0cilcbiAgICAgICAgY29uc3QgYnJhbmNoID0gdGhpcy5fZW5zdXJlUGF0aCh0cmVlLCBwYXRoLCBkZWxpbSlcbiAgICAgICAgYnJhbmNoLmZsYWdzID0gcHJvcE9yKFtdLCAnMCcsIGF0dHIpLm1hcCgoeyB2YWx1ZSB9KSA9PiB2YWx1ZSB8fCAnJylcbiAgICAgICAgYnJhbmNoLmxpc3RlZCA9IHRydWVcbiAgICAgICAgY2hlY2tTcGVjaWFsVXNlKGJyYW5jaClcbiAgICAgIH0pXG5cbiAgICAgIGNvbnN0IGxzdWJSZXNwb25zZSA9IGF3YWl0IHRoaXMuZXhlYyh7IGNvbW1hbmQ6ICdMU1VCJywgYXR0cmlidXRlczogWycnLCAnKiddIH0sICdMU1VCJylcbiAgICAgIGNvbnN0IGxzdWIgPSBwYXRoT3IoW10sIFsncGF5bG9hZCcsICdMU1VCJ10sIGxzdWJSZXNwb25zZSlcbiAgICAgIGxzdWIuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICBjb25zdCBhdHRyID0gcHJvcE9yKFtdLCAnYXR0cmlidXRlcycsIGl0ZW0pXG4gICAgICAgIGlmIChhdHRyLmxlbmd0aCA8IDMpIHJldHVyblxuXG4gICAgICAgIGNvbnN0IHBhdGggPSBwYXRoT3IoJycsIFsnMicsICd2YWx1ZSddLCBhdHRyKVxuICAgICAgICBjb25zdCBkZWxpbSA9IHBhdGhPcignLycsIFsnMScsICd2YWx1ZSddLCBhdHRyKVxuICAgICAgICBjb25zdCBicmFuY2ggPSB0aGlzLl9lbnN1cmVQYXRoKHRyZWUsIHBhdGgsIGRlbGltKVxuICAgICAgICBwcm9wT3IoW10sICcwJywgYXR0cikubWFwKChmbGFnID0gJycpID0+IHsgYnJhbmNoLmZsYWdzID0gdW5pb24oYnJhbmNoLmZsYWdzLCBbZmxhZ10pIH0pXG4gICAgICAgIGJyYW5jaC5zdWJzY3JpYmVkID0gdHJ1ZVxuICAgICAgfSlcblxuICAgICAgcmV0dXJuIHRyZWVcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuX29uRXJyb3IoZXJyKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBtYWlsYm94IHdpdGggdGhlIGdpdmVuIHBhdGguXG4gICAqXG4gICAqIENSRUFURSBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjMuM1xuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgKiAgICAgVGhlIHBhdGggb2YgdGhlIG1haWxib3ggeW91IHdvdWxkIGxpa2UgdG8gY3JlYXRlLiAgVGhpcyBtZXRob2Qgd2lsbFxuICAgKiAgICAgaGFuZGxlIHV0ZjcgZW5jb2RpbmcgZm9yIHlvdS5cbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqICAgICBQcm9taXNlIHJlc29sdmVzIGlmIG1haWxib3ggd2FzIGNyZWF0ZWQuXG4gICAqICAgICBJbiB0aGUgZXZlbnQgdGhlIHNlcnZlciBzYXlzIE5PIFtBTFJFQURZRVhJU1RTXSwgd2UgdHJlYXQgdGhhdCBhcyBzdWNjZXNzLlxuICAgKi9cbiAgYXN5bmMgY3JlYXRlTWFpbGJveCAocGF0aCkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdDcmVhdGluZyBtYWlsYm94JywgcGF0aCwgJy4uLicpXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuZXhlYyh7IGNvbW1hbmQ6ICdDUkVBVEUnLCBhdHRyaWJ1dGVzOiBbaW1hcEVuY29kZShwYXRoKV0gfSlcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmIChlcnIgJiYgZXJyLmNvZGUgPT09ICdBTFJFQURZRVhJU1RTJykge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHRocm93IGVyclxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxldGUgYSBtYWlsYm94IHdpdGggdGhlIGdpdmVuIHBhdGguXG4gICAqXG4gICAqIERFTEVURSBkZXRhaWxzOlxuICAgKiAgIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi4zLjRcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICogICAgIFRoZSBwYXRoIG9mIHRoZSBtYWlsYm94IHlvdSB3b3VsZCBsaWtlIHRvIGRlbGV0ZS4gIFRoaXMgbWV0aG9kIHdpbGxcbiAgICogICAgIGhhbmRsZSB1dGY3IGVuY29kaW5nIGZvciB5b3UuXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKiAgICAgUHJvbWlzZSByZXNvbHZlcyBpZiBtYWlsYm94IHdhcyBkZWxldGVkLlxuICAgKi9cbiAgZGVsZXRlTWFpbGJveCAocGF0aCkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdEZWxldGluZyBtYWlsYm94JywgcGF0aCwgJy4uLicpXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRlbFJlc3BvbnNlID0gdGhpcy5leGVjKHsgY29tbWFuZDogJ0RFTEVURScsIGF0dHJpYnV0ZXM6IFtpbWFwRW5jb2RlKHBhdGgpXSB9KVxuICAgICAgcmV0dXJuIGRlbFJlc3BvbnNlXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLl9vbkVycm9yKGVycilcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUnVucyBGRVRDSCBjb21tYW5kXG4gICAqXG4gICAqIEZFVENIIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuNC41XG4gICAqIENIQU5HRURTSU5DRSBkZXRhaWxzOlxuICAgKiAgIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM0NTUxI3NlY3Rpb24tMy4zXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBwYXRoIGZvciB0aGUgbWFpbGJveCB3aGljaCBzaG91bGQgYmUgc2VsZWN0ZWQgZm9yIHRoZSBjb21tYW5kLiBTZWxlY3RzIG1haWxib3ggaWYgbmVjZXNzYXJ5XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzZXF1ZW5jZSBTZXF1ZW5jZSBzZXQsIGVnIDE6KiBmb3IgYWxsIG1lc3NhZ2VzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbaXRlbXNdIE1lc3NhZ2UgZGF0YSBpdGVtIG5hbWVzIG9yIG1hY3JvXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gUXVlcnkgbW9kaWZpZXJzXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdpdGggdGhlIGZldGNoZWQgbWVzc2FnZSBpbmZvXG4gICAqL1xuICBhc3luYyBsaXN0TWVzc2FnZXMgKHBhdGgsIHNlcXVlbmNlLCBpdGVtcyA9IFt7IGZhc3Q6IHRydWUgfV0sIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdGZXRjaGluZyBtZXNzYWdlcycsIHNlcXVlbmNlLCAnZnJvbScsIHBhdGgsICcuLi4nKVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBjb21tYW5kID0gYnVpbGRGRVRDSENvbW1hbmQoc2VxdWVuY2UsIGl0ZW1zLCBvcHRpb25zKVxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmV4ZWMoY29tbWFuZCwgJ0ZFVENIJywge1xuICAgICAgICBwcmVjaGVjazogKGN0eCkgPT4gdGhpcy5fc2hvdWxkU2VsZWN0TWFpbGJveChwYXRoLCBjdHgpID8gdGhpcy5zZWxlY3RNYWlsYm94KHBhdGgsIHsgY3R4IH0pIDogUHJvbWlzZS5yZXNvbHZlKClcbiAgICAgIH0pXG4gICAgICByZXR1cm4gcGFyc2VGRVRDSChyZXNwb25zZSlcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuX29uRXJyb3IoZXJyKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIFNFQVJDSCBjb21tYW5kXG4gICAqXG4gICAqIFNFQVJDSCBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjQuNFxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBUaGUgcGF0aCBmb3IgdGhlIG1haWxib3ggd2hpY2ggc2hvdWxkIGJlIHNlbGVjdGVkIGZvciB0aGUgY29tbWFuZC4gU2VsZWN0cyBtYWlsYm94IGlmIG5lY2Vzc2FyeVxuICAgKiBAcGFyYW0ge09iamVjdH0gcXVlcnkgU2VhcmNoIHRlcm1zXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gUXVlcnkgbW9kaWZpZXJzXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdpdGggdGhlIGFycmF5IG9mIG1hdGNoaW5nIHNlcS4gb3IgdWlkIG51bWJlcnNcbiAgICovXG4gIGFzeW5jIHNlYXJjaCAocGF0aCwgcXVlcnksIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdTZWFyY2hpbmcgaW4nLCBwYXRoLCAnLi4uJylcbiAgICB0cnkge1xuICAgICAgY29uc3QgY29tbWFuZCA9IGJ1aWxkU0VBUkNIQ29tbWFuZChxdWVyeSwgb3B0aW9ucylcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5leGVjKGNvbW1hbmQsICdTRUFSQ0gnLCB7XG4gICAgICAgIHByZWNoZWNrOiAoY3R4KSA9PiB0aGlzLl9zaG91bGRTZWxlY3RNYWlsYm94KHBhdGgsIGN0eCkgPyB0aGlzLnNlbGVjdE1haWxib3gocGF0aCwgeyBjdHggfSkgOiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgfSlcbiAgICAgIHJldHVybiBwYXJzZVNFQVJDSChyZXNwb25zZSlcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuX29uRXJyb3IoZXJyKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIFNUT1JFIGNvbW1hbmRcbiAgICpcbiAgICogU1RPUkUgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi40LjZcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggVGhlIHBhdGggZm9yIHRoZSBtYWlsYm94IHdoaWNoIHNob3VsZCBiZSBzZWxlY3RlZCBmb3IgdGhlIGNvbW1hbmQuIFNlbGVjdHMgbWFpbGJveCBpZiBuZWNlc3NhcnlcbiAgICogQHBhcmFtIHtTdHJpbmd9IHNlcXVlbmNlIE1lc3NhZ2Ugc2VsZWN0b3Igd2hpY2ggdGhlIGZsYWcgY2hhbmdlIGlzIGFwcGxpZWQgdG9cbiAgICogQHBhcmFtIHtBcnJheX0gZmxhZ3NcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBRdWVyeSBtb2RpZmllcnNcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2l0aCB0aGUgYXJyYXkgb2YgbWF0Y2hpbmcgc2VxLiBvciB1aWQgbnVtYmVyc1xuICAgKi9cbiAgc2V0RmxhZ3MgKHBhdGgsIHNlcXVlbmNlLCBmbGFncywgb3B0aW9ucykge1xuICAgIGxldCBrZXkgPSAnJ1xuICAgIGxldCBsaXN0ID0gW11cblxuICAgIGlmIChBcnJheS5pc0FycmF5KGZsYWdzKSB8fCB0eXBlb2YgZmxhZ3MgIT09ICdvYmplY3QnKSB7XG4gICAgICBsaXN0ID0gW10uY29uY2F0KGZsYWdzIHx8IFtdKVxuICAgICAga2V5ID0gJydcbiAgICB9IGVsc2UgaWYgKGZsYWdzLmFkZCkge1xuICAgICAgbGlzdCA9IFtdLmNvbmNhdChmbGFncy5hZGQgfHwgW10pXG4gICAgICBrZXkgPSAnKydcbiAgICB9IGVsc2UgaWYgKGZsYWdzLnNldCkge1xuICAgICAga2V5ID0gJydcbiAgICAgIGxpc3QgPSBbXS5jb25jYXQoZmxhZ3Muc2V0IHx8IFtdKVxuICAgIH0gZWxzZSBpZiAoZmxhZ3MucmVtb3ZlKSB7XG4gICAgICBrZXkgPSAnLSdcbiAgICAgIGxpc3QgPSBbXS5jb25jYXQoZmxhZ3MucmVtb3ZlIHx8IFtdKVxuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdTZXR0aW5nIGZsYWdzIG9uJywgc2VxdWVuY2UsICdpbicsIHBhdGgsICcuLi4nKVxuICAgIHJldHVybiB0aGlzLnN0b3JlKHBhdGgsIHNlcXVlbmNlLCBrZXkgKyAnRkxBR1MnLCBsaXN0LCBvcHRpb25zKVxuICB9XG5cbiAgLyoqXG4gICAqIFJ1bnMgU1RPUkUgY29tbWFuZFxuICAgKlxuICAgKiBTVE9SRSBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjQuNlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBUaGUgcGF0aCBmb3IgdGhlIG1haWxib3ggd2hpY2ggc2hvdWxkIGJlIHNlbGVjdGVkIGZvciB0aGUgY29tbWFuZC4gU2VsZWN0cyBtYWlsYm94IGlmIG5lY2Vzc2FyeVxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2VxdWVuY2UgTWVzc2FnZSBzZWxlY3RvciB3aGljaCB0aGUgZmxhZyBjaGFuZ2UgaXMgYXBwbGllZCB0b1xuICAgKiBAcGFyYW0ge1N0cmluZ30gYWN0aW9uIFNUT1JFIG1ldGhvZCB0byBjYWxsLCBlZyBcIitGTEFHU1wiXG4gICAqIEBwYXJhbSB7QXJyYXl9IGZsYWdzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gUXVlcnkgbW9kaWZpZXJzXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdpdGggdGhlIGFycmF5IG9mIG1hdGNoaW5nIHNlcS4gb3IgdWlkIG51bWJlcnNcbiAgICovXG4gIGFzeW5jIHN0b3JlIChwYXRoLCBzZXF1ZW5jZSwgYWN0aW9uLCBmbGFncywgb3B0aW9ucyA9IHt9KSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBidWlsZFNUT1JFQ29tbWFuZChzZXF1ZW5jZSwgYWN0aW9uLCBmbGFncywgb3B0aW9ucylcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5leGVjKGNvbW1hbmQsICdGRVRDSCcsIHtcbiAgICAgICAgcHJlY2hlY2s6IChjdHgpID0+IHRoaXMuX3Nob3VsZFNlbGVjdE1haWxib3gocGF0aCwgY3R4KSA/IHRoaXMuc2VsZWN0TWFpbGJveChwYXRoLCB7IGN0eCB9KSA6IFByb21pc2UucmVzb2x2ZSgpXG4gICAgICB9KVxuICAgICAgcmV0dXJuIHBhcnNlRkVUQ0gocmVzcG9uc2UpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLl9vbkVycm9yKGVycilcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUnVucyBBUFBFTkQgY29tbWFuZFxuICAgKlxuICAgKiBBUFBFTkQgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi4zLjExXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBkZXN0aW5hdGlvbiBUaGUgbWFpbGJveCB3aGVyZSB0byBhcHBlbmQgdGhlIG1lc3NhZ2VcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gYXBwZW5kXG4gICAqIEBwYXJhbSB7QXJyYXl9IG9wdGlvbnMuZmxhZ3MgQW55IGZsYWdzIHlvdSB3YW50IHRvIHNldCBvbiB0aGUgdXBsb2FkZWQgbWVzc2FnZS4gRGVmYXVsdHMgdG8gW1xcU2Vlbl0uIChvcHRpb25hbClcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2l0aCB0aGUgYXJyYXkgb2YgbWF0Y2hpbmcgc2VxLiBvciB1aWQgbnVtYmVyc1xuICAgKi9cbiAgdXBsb2FkIChkZXN0aW5hdGlvbiwgbWVzc2FnZSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgbGV0IGZsYWdzID0gcHJvcE9yKFsnXFxcXFNlZW4nXSwgJ2ZsYWdzJywgb3B0aW9ucykubWFwKHZhbHVlID0+ICh7IHR5cGU6ICdhdG9tJywgdmFsdWUgfSkpXG4gICAgbGV0IGNvbW1hbmQgPSB7XG4gICAgICBjb21tYW5kOiAnQVBQRU5EJyxcbiAgICAgIGF0dHJpYnV0ZXM6IFtcbiAgICAgICAgeyB0eXBlOiAnYXRvbScsIHZhbHVlOiBkZXN0aW5hdGlvbiB9LFxuICAgICAgICBmbGFncyxcbiAgICAgICAgeyB0eXBlOiAnbGl0ZXJhbCcsIHZhbHVlOiBtZXNzYWdlIH1cbiAgICAgIF1cbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnVXBsb2FkaW5nIG1lc3NhZ2UgdG8nLCBkZXN0aW5hdGlvbiwgJy4uLicpXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHVwbG9hZFJlc3BvbnNlID0gdGhpcy5leGVjKGNvbW1hbmQpXG4gICAgICByZXR1cm4gdXBsb2FkUmVzcG9uc2VcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuX29uRXJyb3IoZXJyKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxldGVzIG1lc3NhZ2VzIGZyb20gYSBzZWxlY3RlZCBtYWlsYm94XG4gICAqXG4gICAqIEVYUFVOR0UgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi40LjNcbiAgICogVUlEIEVYUFVOR0UgZGV0YWlsczpcbiAgICogICBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNDMxNSNzZWN0aW9uLTIuMVxuICAgKlxuICAgKiBJZiBwb3NzaWJsZSAoYnlVaWQ6dHJ1ZSBhbmQgVUlEUExVUyBleHRlbnNpb24gc3VwcG9ydGVkKSwgdXNlcyBVSUQgRVhQVU5HRVxuICAgKiBjb21tYW5kIHRvIGRlbGV0ZSBhIHJhbmdlIG9mIG1lc3NhZ2VzLCBvdGhlcndpc2UgZmFsbHMgYmFjayB0byBFWFBVTkdFLlxuICAgKlxuICAgKiBOQiEgVGhpcyBtZXRob2QgbWlnaHQgYmUgZGVzdHJ1Y3RpdmUgLSBpZiBFWFBVTkdFIGlzIHVzZWQsIHRoZW4gYW55IG1lc3NhZ2VzXG4gICAqIHdpdGggXFxEZWxldGVkIGZsYWcgc2V0IGFyZSBkZWxldGVkXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBwYXRoIGZvciB0aGUgbWFpbGJveCB3aGljaCBzaG91bGQgYmUgc2VsZWN0ZWQgZm9yIHRoZSBjb21tYW5kLiBTZWxlY3RzIG1haWxib3ggaWYgbmVjZXNzYXJ5XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzZXF1ZW5jZSBNZXNzYWdlIHJhbmdlIHRvIGJlIGRlbGV0ZWRcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBRdWVyeSBtb2RpZmllcnNcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2VcbiAgICovXG4gIGFzeW5jIGRlbGV0ZU1lc3NhZ2VzIChwYXRoLCBzZXF1ZW5jZSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgLy8gYWRkIFxcRGVsZXRlZCBmbGFnIHRvIHRoZSBtZXNzYWdlcyBhbmQgcnVuIEVYUFVOR0Ugb3IgVUlEIEVYUFVOR0VcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnRGVsZXRpbmcgbWVzc2FnZXMnLCBzZXF1ZW5jZSwgJ2luJywgcGF0aCwgJy4uLicpXG4gICAgY29uc3QgdXNlVWlkUGx1cyA9IG9wdGlvbnMuYnlVaWQgJiYgdGhpcy5fY2FwYWJpbGl0eS5pbmRleE9mKCdVSURQTFVTJykgPj0gMFxuICAgIGNvbnN0IHVpZEV4cHVuZ2VDb21tYW5kID0geyBjb21tYW5kOiAnVUlEIEVYUFVOR0UnLCBhdHRyaWJ1dGVzOiBbeyB0eXBlOiAnc2VxdWVuY2UnLCB2YWx1ZTogc2VxdWVuY2UgfV0gfVxuICAgIGF3YWl0IHRoaXMuc2V0RmxhZ3MocGF0aCwgc2VxdWVuY2UsIHsgYWRkOiAnXFxcXERlbGV0ZWQnIH0sIG9wdGlvbnMpXG4gICAgY29uc3QgY21kID0gdXNlVWlkUGx1cyA/IHVpZEV4cHVuZ2VDb21tYW5kIDogJ0VYUFVOR0UnXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRlbFJlc3BvbnNlID0gdGhpcy5leGVjKGNtZCwgbnVsbCwge1xuICAgICAgICBwcmVjaGVjazogKGN0eCkgPT4gdGhpcy5fc2hvdWxkU2VsZWN0TWFpbGJveChwYXRoLCBjdHgpID8gdGhpcy5zZWxlY3RNYWlsYm94KHBhdGgsIHsgY3R4IH0pIDogUHJvbWlzZS5yZXNvbHZlKClcbiAgICAgIH0pXG4gICAgICByZXR1cm4gZGVsUmVzcG9uc2VcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuX29uRXJyb3IoZXJyKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb3BpZXMgYSByYW5nZSBvZiBtZXNzYWdlcyBmcm9tIHRoZSBhY3RpdmUgbWFpbGJveCB0byB0aGUgZGVzdGluYXRpb24gbWFpbGJveC5cbiAgICogU2lsZW50IG1ldGhvZCAodW5sZXNzIGFuIGVycm9yIG9jY3VycyksIGJ5IGRlZmF1bHQgcmV0dXJucyBubyBpbmZvcm1hdGlvbi5cbiAgICpcbiAgICogQ09QWSBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjQuN1xuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBUaGUgcGF0aCBmb3IgdGhlIG1haWxib3ggd2hpY2ggc2hvdWxkIGJlIHNlbGVjdGVkIGZvciB0aGUgY29tbWFuZC4gU2VsZWN0cyBtYWlsYm94IGlmIG5lY2Vzc2FyeVxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2VxdWVuY2UgTWVzc2FnZSByYW5nZSB0byBiZSBjb3BpZWRcbiAgICogQHBhcmFtIHtTdHJpbmd9IGRlc3RpbmF0aW9uIERlc3RpbmF0aW9uIG1haWxib3ggcGF0aFxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIFF1ZXJ5IG1vZGlmaWVyc1xuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmJ5VWlkXSBJZiB0cnVlLCB1c2VzIFVJRCBDT1BZIGluc3RlYWQgb2YgQ09QWVxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZVxuICAgKi9cbiAgYXN5bmMgY29weU1lc3NhZ2VzIChwYXRoLCBzZXF1ZW5jZSwgZGVzdGluYXRpb24sIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdDb3B5aW5nIG1lc3NhZ2VzJywgc2VxdWVuY2UsICdmcm9tJywgcGF0aCwgJ3RvJywgZGVzdGluYXRpb24sICcuLi4nKVxuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IGh1bWFuUmVhZGFibGUgfSA9IGF3YWl0IHRoaXMuZXhlYyh7XG4gICAgICAgIGNvbW1hbmQ6IG9wdGlvbnMuYnlVaWQgPyAnVUlEIENPUFknIDogJ0NPUFknLFxuICAgICAgICBhdHRyaWJ1dGVzOiBbXG4gICAgICAgICAgeyB0eXBlOiAnc2VxdWVuY2UnLCB2YWx1ZTogc2VxdWVuY2UgfSxcbiAgICAgICAgICB7IHR5cGU6ICdhdG9tJywgdmFsdWU6IGRlc3RpbmF0aW9uIH1cbiAgICAgICAgXVxuICAgICAgfSwgbnVsbCwge1xuICAgICAgICBwcmVjaGVjazogKGN0eCkgPT4gdGhpcy5fc2hvdWxkU2VsZWN0TWFpbGJveChwYXRoLCBjdHgpID8gdGhpcy5zZWxlY3RNYWlsYm94KHBhdGgsIHsgY3R4IH0pIDogUHJvbWlzZS5yZXNvbHZlKClcbiAgICAgIH0pXG4gICAgICByZXR1cm4gaHVtYW5SZWFkYWJsZSB8fCAnQ09QWSBjb21wbGV0ZWQnXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLl9vbkVycm9yKGVycilcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTW92ZXMgYSByYW5nZSBvZiBtZXNzYWdlcyBmcm9tIHRoZSBhY3RpdmUgbWFpbGJveCB0byB0aGUgZGVzdGluYXRpb24gbWFpbGJveC5cbiAgICogUHJlZmVycyB0aGUgTU9WRSBleHRlbnNpb24gYnV0IGlmIG5vdCBhdmFpbGFibGUsIGZhbGxzIGJhY2sgdG9cbiAgICogQ09QWSArIEVYUFVOR0VcbiAgICpcbiAgICogTU9WRSBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY4NTFcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggVGhlIHBhdGggZm9yIHRoZSBtYWlsYm94IHdoaWNoIHNob3VsZCBiZSBzZWxlY3RlZCBmb3IgdGhlIGNvbW1hbmQuIFNlbGVjdHMgbWFpbGJveCBpZiBuZWNlc3NhcnlcbiAgICogQHBhcmFtIHtTdHJpbmd9IHNlcXVlbmNlIE1lc3NhZ2UgcmFuZ2UgdG8gYmUgbW92ZWRcbiAgICogQHBhcmFtIHtTdHJpbmd9IGRlc3RpbmF0aW9uIERlc3RpbmF0aW9uIG1haWxib3ggcGF0aFxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIFF1ZXJ5IG1vZGlmaWVyc1xuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZVxuICAgKi9cbiAgYXN5bmMgbW92ZU1lc3NhZ2VzIChwYXRoLCBzZXF1ZW5jZSwgZGVzdGluYXRpb24sIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdNb3ZpbmcgbWVzc2FnZXMnLCBzZXF1ZW5jZSwgJ2Zyb20nLCBwYXRoLCAndG8nLCBkZXN0aW5hdGlvbiwgJy4uLicpXG5cbiAgICBpZiAodGhpcy5fY2FwYWJpbGl0eS5pbmRleE9mKCdNT1ZFJykgPT09IC0xKSB7XG4gICAgICAvLyBGYWxsYmFjayB0byBDT1BZICsgRVhQVU5HRVxuICAgICAgYXdhaXQgdGhpcy5jb3B5TWVzc2FnZXMocGF0aCwgc2VxdWVuY2UsIGRlc3RpbmF0aW9uLCBvcHRpb25zKVxuICAgICAgcmV0dXJuIHRoaXMuZGVsZXRlTWVzc2FnZXMocGF0aCwgc2VxdWVuY2UsIG9wdGlvbnMpXG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIC8vIElmIHBvc3NpYmxlLCB1c2UgTU9WRVxuICAgICAgY29uc3QgbW92ZVJlc3BvbnNlID0gdGhpcy5leGVjKHtcbiAgICAgICAgY29tbWFuZDogb3B0aW9ucy5ieVVpZCA/ICdVSUQgTU9WRScgOiAnTU9WRScsXG4gICAgICAgIGF0dHJpYnV0ZXM6IFtcbiAgICAgICAgICB7IHR5cGU6ICdzZXF1ZW5jZScsIHZhbHVlOiBzZXF1ZW5jZSB9LFxuICAgICAgICAgIHsgdHlwZTogJ2F0b20nLCB2YWx1ZTogZGVzdGluYXRpb24gfVxuICAgICAgICBdXG4gICAgICB9LCBbJ09LJ10sIHtcbiAgICAgICAgcHJlY2hlY2s6IChjdHgpID0+IHRoaXMuX3Nob3VsZFNlbGVjdE1haWxib3gocGF0aCwgY3R4KSA/IHRoaXMuc2VsZWN0TWFpbGJveChwYXRoLCB7IGN0eCB9KSA6IFByb21pc2UucmVzb2x2ZSgpXG4gICAgICB9KVxuICAgICAgcmV0dXJuIG1vdmVSZXNwb25zZVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5fb25FcnJvcihlcnIpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJ1bnMgQ09NUFJFU1MgY29tbWFuZFxuICAgKlxuICAgKiBDT01QUkVTUyBkZXRhaWxzOlxuICAgKiAgIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM0OTc4XG4gICAqL1xuICBhc3luYyBjb21wcmVzc0Nvbm5lY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5fZW5hYmxlQ29tcHJlc3Npb24gfHwgdGhpcy5fY2FwYWJpbGl0eS5pbmRleE9mKCdDT01QUkVTUz1ERUZMQVRFJykgPCAwIHx8IHRoaXMuY2xpZW50LmNvbXByZXNzZWQpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdFbmFibGluZyBjb21wcmVzc2lvbi4uLicpXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuZXhlYyh7XG4gICAgICAgIGNvbW1hbmQ6ICdDT01QUkVTUycsXG4gICAgICAgIGF0dHJpYnV0ZXM6IFt7XG4gICAgICAgICAgdHlwZTogJ0FUT00nLFxuICAgICAgICAgIHZhbHVlOiAnREVGTEFURSdcbiAgICAgICAgfV1cbiAgICAgIH0pXG4gICAgICB0aGlzLmNsaWVudC5lbmFibGVDb21wcmVzc2lvbigpXG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnQ29tcHJlc3Npb24gZW5hYmxlZCwgYWxsIGRhdGEgc2VudCBhbmQgcmVjZWl2ZWQgaXMgZGVmbGF0ZWQhJylcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuX29uRXJyb3IoZXJyKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIExPR0lOIG9yIEFVVEhFTlRJQ0FURSBYT0FVVEgyIGNvbW1hbmRcbiAgICpcbiAgICogTE9HSU4gZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi4yLjNcbiAgICogWE9BVVRIMiBkZXRhaWxzOlxuICAgKiAgIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL2dtYWlsL3hvYXV0aDJfcHJvdG9jb2wjaW1hcF9wcm90b2NvbF9leGNoYW5nZVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gYXV0aC51c2VyXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBhdXRoLnBhc3NcbiAgICogQHBhcmFtIHtTdHJpbmd9IGF1dGgueG9hdXRoMlxuICAgKi9cbiAgYXN5bmMgbG9naW4gKGF1dGgpIHtcbiAgICBsZXQgY29tbWFuZFxuICAgIGxldCBvcHRpb25zID0ge31cblxuICAgIGlmICghYXV0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdBdXRoZW50aWNhdGlvbiBpbmZvcm1hdGlvbiBub3QgcHJvdmlkZWQnKVxuICAgIH1cblxuICAgIGlmICh0aGlzLl9jYXBhYmlsaXR5LmluZGV4T2YoJ0FVVEg9WE9BVVRIMicpID49IDAgJiYgYXV0aCAmJiBhdXRoLnhvYXV0aDIpIHtcbiAgICAgIGNvbW1hbmQgPSB7XG4gICAgICAgIGNvbW1hbmQ6ICdBVVRIRU5USUNBVEUnLFxuICAgICAgICBhdHRyaWJ1dGVzOiBbXG4gICAgICAgICAgeyB0eXBlOiAnQVRPTScsIHZhbHVlOiAnWE9BVVRIMicgfSxcbiAgICAgICAgICB7IHR5cGU6ICdBVE9NJywgdmFsdWU6IGJ1aWxkWE9BdXRoMlRva2VuKGF1dGgudXNlciwgYXV0aC54b2F1dGgyKSwgc2Vuc2l0aXZlOiB0cnVlIH1cbiAgICAgICAgXVxuICAgICAgfVxuXG4gICAgICBvcHRpb25zLmVycm9yUmVzcG9uc2VFeHBlY3RzRW1wdHlMaW5lID0gdHJ1ZSAvLyArIHRhZ2dlZCBlcnJvciByZXNwb25zZSBleHBlY3RzIGFuIGVtcHR5IGxpbmUgaW4gcmV0dXJuXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbW1hbmQgPSB7XG4gICAgICAgIGNvbW1hbmQ6ICdsb2dpbicsXG4gICAgICAgIGF0dHJpYnV0ZXM6IFtcbiAgICAgICAgICB7IHR5cGU6ICdTVFJJTkcnLCB2YWx1ZTogYXV0aC51c2VyIHx8ICcnIH0sXG4gICAgICAgICAgeyB0eXBlOiAnU1RSSU5HJywgdmFsdWU6IGF1dGgucGFzcyB8fCAnJywgc2Vuc2l0aXZlOiB0cnVlIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdMb2dnaW5nIGluLi4uJylcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmV4ZWMoY29tbWFuZCwgJ2NhcGFiaWxpdHknLCBvcHRpb25zKVxuICAgICAgLypcbiAgICAgICAqIHVwZGF0ZSBwb3N0LWF1dGggY2FwYWJpbGl0ZXNcbiAgICAgICAqIGNhcGFiaWxpdHkgbGlzdCBzaG91bGRuJ3QgY29udGFpbiBhdXRoIHJlbGF0ZWQgc3R1ZmYgYW55bW9yZVxuICAgICAgICogYnV0IHNvbWUgbmV3IGV4dGVuc2lvbnMgbWlnaHQgaGF2ZSBwb3BwZWQgdXAgdGhhdCBkbyBub3RcbiAgICAgICAqIG1ha2UgbXVjaCBzZW5zZSBpbiB0aGUgbm9uLWF1dGggc3RhdGVcbiAgICAgICAqL1xuICAgICAgaWYgKHJlc3BvbnNlLmNhcGFiaWxpdHkgJiYgcmVzcG9uc2UuY2FwYWJpbGl0eS5sZW5ndGgpIHtcbiAgICAgICAgLy8gY2FwYWJpbGl0ZXMgd2VyZSBsaXN0ZWQgd2l0aCB0aGUgT0sgW0NBUEFCSUxJVFkgLi4uXSByZXNwb25zZVxuICAgICAgICB0aGlzLl9jYXBhYmlsaXR5ID0gcmVzcG9uc2UuY2FwYWJpbGl0eVxuICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5wYXlsb2FkICYmIHJlc3BvbnNlLnBheWxvYWQuQ0FQQUJJTElUWSAmJiByZXNwb25zZS5wYXlsb2FkLkNBUEFCSUxJVFkubGVuZ3RoKSB7XG4gICAgICAgIC8vIGNhcGFiaWxpdGVzIHdlcmUgbGlzdGVkIHdpdGggKiBDQVBBQklMSVRZIC4uLiByZXNwb25zZVxuICAgICAgICB0aGlzLl9jYXBhYmlsaXR5ID0gcmVzcG9uc2UucGF5bG9hZC5DQVBBQklMSVRZLnBvcCgpLmF0dHJpYnV0ZXMubWFwKChjYXBhID0gJycpID0+IGNhcGEudmFsdWUudG9VcHBlckNhc2UoKS50cmltKCkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBjYXBhYmlsaXRpZXMgd2VyZSBub3QgYXV0b21hdGljYWxseSBsaXN0ZWQsIHJlbG9hZFxuICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZUNhcGFiaWxpdHkodHJ1ZSlcbiAgICAgIH1cblxuICAgICAgdGhpcy5fY2hhbmdlU3RhdGUoU1RBVEVfQVVUSEVOVElDQVRFRClcbiAgICAgIHRoaXMuX2F1dGhlbnRpY2F0ZWQgPSB0cnVlXG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnTG9naW4gc3VjY2Vzc2Z1bCwgcG9zdC1hdXRoIGNhcGFiaWxpdGVzIHVwZGF0ZWQhJywgdGhpcy5fY2FwYWJpbGl0eSlcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuX29uRXJyb3IoZXJyKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSdW4gYW4gSU1BUCBjb21tYW5kLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gcmVxdWVzdCBTdHJ1Y3R1cmVkIHJlcXVlc3Qgb2JqZWN0XG4gICAqIEBwYXJhbSB7QXJyYXl9IGFjY2VwdFVudGFnZ2VkIGEgbGlzdCBvZiB1bnRhZ2dlZCByZXNwb25zZXMgdGhhdCB3aWxsIGJlIGluY2x1ZGVkIGluICdwYXlsb2FkJyBwcm9wZXJ0eVxuICAgKi9cbiAgYXN5bmMgZXhlYyAocmVxdWVzdCwgYWNjZXB0VW50YWdnZWQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLmJyZWFrSWRsZSgpXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmNsaWVudC5lbnF1ZXVlQ29tbWFuZChyZXF1ZXN0LCBhY2NlcHRVbnRhZ2dlZCwgb3B0aW9ucylcbiAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UuY2FwYWJpbGl0eSkge1xuICAgICAgdGhpcy5fY2FwYWJpbGl0eSA9IHJlc3BvbnNlLmNhcGFiaWxpdHlcbiAgICB9XG4gICAgcmV0dXJuIHJlc3BvbnNlXG4gIH1cblxuICAvKipcbiAgICogVGhlIGNvbm5lY3Rpb24gaXMgaWRsaW5nLiBTZW5kcyBhIE5PT1Agb3IgSURMRSBjb21tYW5kXG4gICAqXG4gICAqIElETEUgZGV0YWlsczpcbiAgICogICBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMjE3N1xuICAgKi9cbiAgYXN5bmMgZW50ZXJJZGxlICgpIHtcbiAgICBpZiAodGhpcy5fZW50ZXJlZElkbGUpIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICB0aGlzLl9lbnRlcmVkSWRsZSA9IHRoaXMuX2NhcGFiaWxpdHkuaW5kZXhPZignSURMRScpID49IDAgPyAnSURMRScgOiAnTk9PUCdcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnRW50ZXJpbmcgaWRsZSB3aXRoICcgKyB0aGlzLl9lbnRlcmVkSWRsZSlcblxuICAgIGlmICh0aGlzLl9lbnRlcmVkSWRsZSA9PT0gJ05PT1AnKSB7XG4gICAgICB0aGlzLl9pZGxlVGltZW91dCA9IHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xuICAgICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnU2VuZGluZyBOT09QJylcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCB0aGlzLmV4ZWMoJ05PT1AnKVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICB0aGlzLl9vbkVycm9yKGVycilcbiAgICAgICAgfVxuICAgICAgfSwgdGhpcy50aW1lb3V0Tm9vcClcbiAgICB9IGVsc2UgaWYgKHRoaXMuX2VudGVyZWRJZGxlID09PSAnSURMRScpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMuY2xpZW50LmVucXVldWVDb21tYW5kKHtcbiAgICAgICAgICBjb21tYW5kOiAnSURMRSdcbiAgICAgICAgfSlcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICB0aGlzLl9vbkVycm9yKGVycilcbiAgICAgIH1cbiAgICAgIHRoaXMuX2lkbGVUaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdGhpcy5jbGllbnQuc2VuZCgnRE9ORVxcclxcbicpXG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIHRoaXMuX29uRXJyb3IoZXJyKVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2VudGVyZWRJZGxlID0gZmFsc2VcbiAgICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ0lkbGUgdGVybWluYXRlZCcpXG4gICAgICB9LCB0aGlzLnRpbWVvdXRJZGxlKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTdG9wcyBhY3Rpb25zIHJlbGF0ZWQgaWRsaW5nLCBpZiBJRExFIGlzIHN1cHBvcnRlZCwgc2VuZHMgRE9ORSB0byBzdG9wIGl0XG4gICAqL1xuICBicmVha0lkbGUgKCkge1xuICAgIGlmICghdGhpcy5fZW50ZXJlZElkbGUpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNsZWFyVGltZW91dCh0aGlzLl9pZGxlVGltZW91dClcbiAgICBpZiAodGhpcy5fZW50ZXJlZElkbGUgPT09ICdJRExFJykge1xuICAgICAgdGhpcy5jbGllbnQuc2VuZCgnRE9ORVxcclxcbicpXG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnSWRsZSB0ZXJtaW5hdGVkJylcbiAgICB9XG4gICAgdGhpcy5fZW50ZXJlZElkbGUgPSBmYWxzZVxuICB9XG5cbiAgLyoqXG4gICAqIFJ1bnMgU1RBUlRUTFMgY29tbWFuZCBpZiBuZWVkZWRcbiAgICpcbiAgICogU1RBUlRUTFMgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi4yLjFcbiAgICpcbiAgICogQHBhcmFtIHtCb29sZWFufSBbZm9yY2VkXSBCeSBkZWZhdWx0IHRoZSBjb21tYW5kIGlzIG5vdCBydW4gaWYgY2FwYWJpbGl0eSBpcyBhbHJlYWR5IGxpc3RlZC4gU2V0IHRvIHRydWUgdG8gc2tpcCB0aGlzIHZhbGlkYXRpb25cbiAgICovXG4gIGFzeW5jIHVwZ3JhZGVDb25uZWN0aW9uICgpIHtcbiAgICAvLyBza2lwIHJlcXVlc3QsIGlmIGFscmVhZHkgc2VjdXJlZFxuICAgIGlmICh0aGlzLmNsaWVudC5zZWN1cmVNb2RlKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICAvLyBza2lwIGlmIFNUQVJUVExTIG5vdCBhdmFpbGFibGUgb3Igc3RhcnR0bHMgc3VwcG9ydCBkaXNhYmxlZFxuICAgIGlmICgodGhpcy5fY2FwYWJpbGl0eS5pbmRleE9mKCdTVEFSVFRMUycpIDwgMCB8fCB0aGlzLl9pZ25vcmVUTFMpICYmICF0aGlzLl9yZXF1aXJlVExTKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnRW5jcnlwdGluZyBjb25uZWN0aW9uLi4uJylcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5leGVjKCdTVEFSVFRMUycpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLl9vbkVycm9yKGVycilcbiAgICB9XG4gICAgdGhpcy5fY2FwYWJpbGl0eSA9IFtdXG4gICAgdGhpcy5jbGllbnQudXBncmFkZSgpXG4gICAgcmV0dXJuIHRoaXMudXBkYXRlQ2FwYWJpbGl0eSgpXG4gIH1cblxuICAvKipcbiAgICogUnVucyBDQVBBQklMSVRZIGNvbW1hbmRcbiAgICpcbiAgICogQ0FQQUJJTElUWSBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjEuMVxuICAgKlxuICAgKiBEb2Vzbid0IHJlZ2lzdGVyIHVudGFnZ2VkIENBUEFCSUxJVFkgaGFuZGxlciBhcyB0aGlzIGlzIGFscmVhZHlcbiAgICogaGFuZGxlZCBieSBnbG9iYWwgaGFuZGxlclxuICAgKlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtmb3JjZWRdIEJ5IGRlZmF1bHQgdGhlIGNvbW1hbmQgaXMgbm90IHJ1biBpZiBjYXBhYmlsaXR5IGlzIGFscmVhZHkgbGlzdGVkLiBTZXQgdG8gdHJ1ZSB0byBza2lwIHRoaXMgdmFsaWRhdGlvblxuICAgKi9cbiAgYXN5bmMgdXBkYXRlQ2FwYWJpbGl0eSAoZm9yY2VkKSB7XG4gICAgLy8gc2tpcCByZXF1ZXN0LCBpZiBub3QgZm9yY2VkIHVwZGF0ZSBhbmQgY2FwYWJpbGl0aWVzIGFyZSBhbHJlYWR5IGxvYWRlZFxuICAgIGlmICghZm9yY2VkICYmIHRoaXMuX2NhcGFiaWxpdHkubGVuZ3RoKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBJZiBTVEFSVFRMUyBpcyByZXF1aXJlZCB0aGVuIHNraXAgY2FwYWJpbGl0eSBsaXN0aW5nIGFzIHdlIGFyZSBnb2luZyB0byB0cnlcbiAgICAvLyBTVEFSVFRMUyBhbnl3YXkgYW5kIHdlIHJlLWNoZWNrIGNhcGFiaWxpdGllcyBhZnRlciBjb25uZWN0aW9uIGlzIHNlY3VyZWRcbiAgICBpZiAoIXRoaXMuY2xpZW50LnNlY3VyZU1vZGUgJiYgdGhpcy5fcmVxdWlyZVRMUykge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ1VwZGF0aW5nIGNhcGFiaWxpdHkuLi4nKVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBjYXBSZXNwb25zZSA9IHRoaXMuZXhlYygnQ0FQQUJJTElUWScpXG4gICAgICByZXR1cm4gY2FwUmVzcG9uc2VcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuX29uRXJyb3IoZXJyKVxuICAgIH1cbiAgfVxuXG4gIGhhc0NhcGFiaWxpdHkgKGNhcGEgPSAnJykge1xuICAgIHJldHVybiB0aGlzLl9jYXBhYmlsaXR5LmluZGV4T2YoY2FwYS50b1VwcGVyQ2FzZSgpLnRyaW0oKSkgPj0gMFxuICB9XG5cbiAgLy8gRGVmYXVsdCBoYW5kbGVycyBmb3IgdW50YWdnZWQgcmVzcG9uc2VzXG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiBhbiB1bnRhZ2dlZCBPSyBpbmNsdWRlcyBbQ0FQQUJJTElUWV0gdGFnIGFuZCB1cGRhdGVzIGNhcGFiaWxpdHkgb2JqZWN0XG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSBQYXJzZWQgc2VydmVyIHJlc3BvbnNlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG5leHQgVW50aWwgY2FsbGVkLCBzZXJ2ZXIgcmVzcG9uc2VzIGFyZSBub3QgcHJvY2Vzc2VkXG4gICAqL1xuICBfdW50YWdnZWRPa0hhbmRsZXIgKHJlc3BvbnNlKSB7XG4gICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmNhcGFiaWxpdHkpIHtcbiAgICAgIHRoaXMuX2NhcGFiaWxpdHkgPSByZXNwb25zZS5jYXBhYmlsaXR5XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgY2FwYWJpbGl0eSBvYmplY3RcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIFBhcnNlZCBzZXJ2ZXIgcmVzcG9uc2VcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gbmV4dCBVbnRpbCBjYWxsZWQsIHNlcnZlciByZXNwb25zZXMgYXJlIG5vdCBwcm9jZXNzZWRcbiAgICovXG4gIF91bnRhZ2dlZENhcGFiaWxpdHlIYW5kbGVyIChyZXNwb25zZSkge1xuICAgIHRoaXMuX2NhcGFiaWxpdHkgPSBwaXBlKFxuICAgICAgcHJvcE9yKFtdLCAnYXR0cmlidXRlcycpLFxuICAgICAgbWFwKCh7IHZhbHVlIH0pID0+ICh2YWx1ZSB8fCAnJykudG9VcHBlckNhc2UoKS50cmltKCkpXG4gICAgKShyZXNwb25zZSlcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIGV4aXN0aW5nIG1lc3NhZ2UgY291bnRcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIFBhcnNlZCBzZXJ2ZXIgcmVzcG9uc2VcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gbmV4dCBVbnRpbCBjYWxsZWQsIHNlcnZlciByZXNwb25zZXMgYXJlIG5vdCBwcm9jZXNzZWRcbiAgICovXG4gIF91bnRhZ2dlZEV4aXN0c0hhbmRsZXIgKHJlc3BvbnNlKSB7XG4gICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmhhc093blByb3BlcnR5KCducicpKSB7XG4gICAgICB0aGlzLm9udXBkYXRlICYmIHRoaXMub251cGRhdGUodGhpcy5fc2VsZWN0ZWRNYWlsYm94LCAnZXhpc3RzJywgcmVzcG9uc2UubnIpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEluZGljYXRlcyBhIG1lc3NhZ2UgaGFzIGJlZW4gZGVsZXRlZFxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgUGFyc2VkIHNlcnZlciByZXNwb25zZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBuZXh0IFVudGlsIGNhbGxlZCwgc2VydmVyIHJlc3BvbnNlcyBhcmUgbm90IHByb2Nlc3NlZFxuICAgKi9cbiAgX3VudGFnZ2VkRXhwdW5nZUhhbmRsZXIgKHJlc3BvbnNlKSB7XG4gICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmhhc093blByb3BlcnR5KCducicpKSB7XG4gICAgICB0aGlzLm9udXBkYXRlICYmIHRoaXMub251cGRhdGUodGhpcy5fc2VsZWN0ZWRNYWlsYm94LCAnZXhwdW5nZScsIHJlc3BvbnNlLm5yKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgdGhhdCBmbGFncyBoYXZlIGJlZW4gdXBkYXRlZCBmb3IgYSBtZXNzYWdlXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSBQYXJzZWQgc2VydmVyIHJlc3BvbnNlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG5leHQgVW50aWwgY2FsbGVkLCBzZXJ2ZXIgcmVzcG9uc2VzIGFyZSBub3QgcHJvY2Vzc2VkXG4gICAqL1xuICBfdW50YWdnZWRGZXRjaEhhbmRsZXIgKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5vbnVwZGF0ZSAmJiB0aGlzLm9udXBkYXRlKHRoaXMuX3NlbGVjdGVkTWFpbGJveCwgJ2ZldGNoJywgW10uY29uY2F0KHBhcnNlRkVUQ0goeyBwYXlsb2FkOiB7IEZFVENIOiBbcmVzcG9uc2VdIH0gfSkgfHwgW10pLnNoaWZ0KCkpXG4gIH1cblxuICAvLyBQcml2YXRlIGhlbHBlcnNcblxuICAvKipcbiAgICogSW5kaWNhdGVzIHRoYXQgdGhlIGNvbm5lY3Rpb24gc3RhcnRlZCBpZGxpbmcuIEluaXRpYXRlcyBhIGN5Y2xlXG4gICAqIG9mIE5PT1BzIG9yIElETEVzIHRvIHJlY2VpdmUgbm90aWZpY2F0aW9ucyBhYm91dCB1cGRhdGVzIGluIHRoZSBzZXJ2ZXJcbiAgICovXG4gIF9vbklkbGUgKCkge1xuICAgIGlmICghdGhpcy5fYXV0aGVudGljYXRlZCB8fCB0aGlzLl9lbnRlcmVkSWRsZSkge1xuICAgICAgLy8gTm8gbmVlZCB0byBJRExFIHdoZW4gbm90IGxvZ2dlZCBpbiBvciBhbHJlYWR5IGlkbGluZ1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0NsaWVudCBzdGFydGVkIGlkbGluZycpXG4gICAgdGhpcy5lbnRlcklkbGUoKVxuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIElNQVAgc3RhdGUgdmFsdWUgZm9yIHRoZSBjdXJyZW50IGNvbm5lY3Rpb25cbiAgICpcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG5ld1N0YXRlIFRoZSBzdGF0ZSB5b3Ugd2FudCB0byBjaGFuZ2UgdG9cbiAgICovXG4gIF9jaGFuZ2VTdGF0ZSAobmV3U3RhdGUpIHtcbiAgICBpZiAobmV3U3RhdGUgPT09IHRoaXMuX3N0YXRlKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnRW50ZXJpbmcgc3RhdGU6ICcgKyBuZXdTdGF0ZSlcblxuICAgIC8vIGlmIGEgbWFpbGJveCB3YXMgb3BlbmVkLCBlbWl0IG9uY2xvc2VtYWlsYm94IGFuZCBjbGVhciBzZWxlY3RlZE1haWxib3ggdmFsdWVcbiAgICBpZiAodGhpcy5fc3RhdGUgPT09IFNUQVRFX1NFTEVDVEVEICYmIHRoaXMuX3NlbGVjdGVkTWFpbGJveCkge1xuICAgICAgdGhpcy5vbmNsb3NlbWFpbGJveCAmJiB0aGlzLm9uY2xvc2VtYWlsYm94KHRoaXMuX3NlbGVjdGVkTWFpbGJveClcbiAgICAgIHRoaXMuX3NlbGVjdGVkTWFpbGJveCA9IGZhbHNlXG4gICAgfVxuXG4gICAgdGhpcy5fc3RhdGUgPSBuZXdTdGF0ZVxuICB9XG5cbiAgLyoqXG4gICAqIEVuc3VyZXMgYSBwYXRoIGV4aXN0cyBpbiB0aGUgTWFpbGJveCB0cmVlXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSB0cmVlIE1haWxib3ggdHJlZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgKiBAcGFyYW0ge1N0cmluZ30gZGVsaW1pdGVyXG4gICAqIEByZXR1cm4ge09iamVjdH0gYnJhbmNoIGZvciB1c2VkIHBhdGhcbiAgICovXG4gIF9lbnN1cmVQYXRoICh0cmVlLCBwYXRoLCBkZWxpbWl0ZXIpIHtcbiAgICBjb25zdCBuYW1lcyA9IHBhdGguc3BsaXQoZGVsaW1pdGVyKVxuICAgIGxldCBicmFuY2ggPSB0cmVlXG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZXQgZm91bmQgPSBmYWxzZVxuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBicmFuY2guY2hpbGRyZW4ubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYgKHRoaXMuX2NvbXBhcmVNYWlsYm94TmFtZXMoYnJhbmNoLmNoaWxkcmVuW2pdLm5hbWUsIGltYXBEZWNvZGUobmFtZXNbaV0pKSkge1xuICAgICAgICAgIGJyYW5jaCA9IGJyYW5jaC5jaGlsZHJlbltqXVxuICAgICAgICAgIGZvdW5kID0gdHJ1ZVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgYnJhbmNoLmNoaWxkcmVuLnB1c2goe1xuICAgICAgICAgIG5hbWU6IGltYXBEZWNvZGUobmFtZXNbaV0pLFxuICAgICAgICAgIGRlbGltaXRlcjogZGVsaW1pdGVyLFxuICAgICAgICAgIHBhdGg6IG5hbWVzLnNsaWNlKDAsIGkgKyAxKS5qb2luKGRlbGltaXRlciksXG4gICAgICAgICAgY2hpbGRyZW46IFtdXG4gICAgICAgIH0pXG4gICAgICAgIGJyYW5jaCA9IGJyYW5jaC5jaGlsZHJlblticmFuY2guY2hpbGRyZW4ubGVuZ3RoIC0gMV1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGJyYW5jaFxuICB9XG5cbiAgLyoqXG4gICAqIENvbXBhcmVzIHR3byBtYWlsYm94IG5hbWVzLiBDYXNlIGluc2Vuc2l0aXZlIGluIGNhc2Ugb2YgSU5CT1gsIG90aGVyd2lzZSBjYXNlIHNlbnNpdGl2ZVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gYSBNYWlsYm94IG5hbWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IGIgTWFpbGJveCBuYW1lXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBmb2xkZXIgbmFtZXMgbWF0Y2hcbiAgICovXG4gIF9jb21wYXJlTWFpbGJveE5hbWVzIChhLCBiKSB7XG4gICAgcmV0dXJuIChhLnRvVXBwZXJDYXNlKCkgPT09ICdJTkJPWCcgPyAnSU5CT1gnIDogYSkgPT09IChiLnRvVXBwZXJDYXNlKCkgPT09ICdJTkJPWCcgPyAnSU5CT1gnIDogYilcbiAgfVxuXG4gIGNyZWF0ZUxvZ2dlciAoY3JlYXRvciA9IGNyZWF0ZURlZmF1bHRMb2dnZXIpIHtcbiAgICBjb25zdCBsb2dnZXIgPSBjcmVhdG9yKCh0aGlzLl9hdXRoIHx8IHt9KS51c2VyIHx8ICcnLCB0aGlzLl9ob3N0KVxuICAgIHRoaXMubG9nZ2VyID0gdGhpcy5jbGllbnQubG9nZ2VyID0ge1xuICAgICAgZGVidWc6ICguLi5tc2dzKSA9PiB7IGlmIChMT0dfTEVWRUxfREVCVUcgPj0gdGhpcy5sb2dMZXZlbCkgeyBsb2dnZXIuZGVidWcobXNncykgfSB9LFxuICAgICAgaW5mbzogKC4uLm1zZ3MpID0+IHsgaWYgKExPR19MRVZFTF9JTkZPID49IHRoaXMubG9nTGV2ZWwpIHsgbG9nZ2VyLmluZm8obXNncykgfSB9LFxuICAgICAgd2FybjogKC4uLm1zZ3MpID0+IHsgaWYgKExPR19MRVZFTF9XQVJOID49IHRoaXMubG9nTGV2ZWwpIHsgbG9nZ2VyLndhcm4obXNncykgfSB9LFxuICAgICAgZXJyb3I6ICguLi5tc2dzKSA9PiB7IGlmIChMT0dfTEVWRUxfRVJST1IgPj0gdGhpcy5sb2dMZXZlbCkgeyBsb2dnZXIuZXJyb3IobXNncykgfSB9XG4gICAgfVxuICB9XG59XG4iXX0=