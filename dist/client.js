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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jbGllbnQuanMiXSwibmFtZXMiOlsiVElNRU9VVF9DT05ORUNUSU9OIiwiVElNRU9VVF9OT09QIiwiVElNRU9VVF9JRExFIiwiU1RBVEVfQ09OTkVDVElORyIsIlNUQVRFX05PVF9BVVRIRU5USUNBVEVEIiwiU1RBVEVfQVVUSEVOVElDQVRFRCIsIlNUQVRFX1NFTEVDVEVEIiwiU1RBVEVfTE9HT1VUIiwiREVGQVVMVF9DTElFTlRfSUQiLCJuYW1lIiwiQ2xpZW50IiwiY29uc3RydWN0b3IiLCJob3N0IiwicG9ydCIsIm9wdGlvbnMiLCJfb25FcnJvciIsImJpbmQiLCJ0aW1lb3V0Q29ubmVjdGlvbiIsInRpbWVvdXROb29wIiwidGltZW91dElkbGUiLCJzZXJ2ZXJJZCIsIm9uY2VydCIsIm9udXBkYXRlIiwib25zZWxlY3RtYWlsYm94Iiwib25jbG9zZW1haWxib3giLCJfaG9zdCIsIl9jbGllbnRJZCIsIl9zdGF0ZSIsIl9hdXRoZW50aWNhdGVkIiwiX2NhcGFiaWxpdHkiLCJfc2VsZWN0ZWRNYWlsYm94IiwiX2VudGVyZWRJZGxlIiwiX2lkbGVUaW1lb3V0IiwiX2VuYWJsZUNvbXByZXNzaW9uIiwiZW5hYmxlQ29tcHJlc3Npb24iLCJfYXV0aCIsImF1dGgiLCJfcmVxdWlyZVRMUyIsInJlcXVpcmVUTFMiLCJfaWdub3JlVExTIiwiaWdub3JlVExTIiwiY2xpZW50IiwiSW1hcENsaWVudCIsIm9uZXJyb3IiLCJjZXJ0Iiwib25pZGxlIiwiX29uSWRsZSIsInNldEhhbmRsZXIiLCJyZXNwb25zZSIsIl91bnRhZ2dlZENhcGFiaWxpdHlIYW5kbGVyIiwiX3VudGFnZ2VkT2tIYW5kbGVyIiwiX3VudGFnZ2VkRXhpc3RzSGFuZGxlciIsIl91bnRhZ2dlZEV4cHVuZ2VIYW5kbGVyIiwiX3VudGFnZ2VkRmV0Y2hIYW5kbGVyIiwiY3JlYXRlTG9nZ2VyIiwibG9nTGV2ZWwiLCJMT0dfTEVWRUxfQUxMIiwiZXJyIiwiY2xlYXJUaW1lb3V0IiwiY29ubmVjdCIsIl9vcGVuQ29ubmVjdGlvbiIsIl9jaGFuZ2VTdGF0ZSIsInVwZGF0ZUNhcGFiaWxpdHkiLCJ1cGdyYWRlQ29ubmVjdGlvbiIsInVwZGF0ZUlkIiwibG9nZ2VyIiwid2FybiIsIm1lc3NhZ2UiLCJsb2dpbiIsImNvbXByZXNzQ29ubmVjdGlvbiIsImRlYnVnIiwiZXJyb3IiLCJjbG9zZSIsImNFcnIiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImNvbm5lY3Rpb25UaW1lb3V0Iiwic2V0VGltZW91dCIsIkVycm9yIiwidGhlbiIsIm9ucmVhZHkiLCJjYXRjaCIsImxvZ291dCIsImlkIiwiaW5kZXhPZiIsImNvbW1hbmQiLCJhdHRyaWJ1dGVzIiwiT2JqZWN0IiwiZW50cmllcyIsImV4ZWMiLCJsaXN0IiwibWFwIiwidmFsdWVzIiwia2V5cyIsImZpbHRlciIsIl8iLCJpIiwiX3Nob3VsZFNlbGVjdE1haWxib3giLCJwYXRoIiwiY3R4IiwicHJldmlvdXNTZWxlY3QiLCJnZXRQcmV2aW91c2x5UXVldWVkIiwicmVxdWVzdCIsInBhdGhBdHRyaWJ1dGUiLCJmaW5kIiwiYXR0cmlidXRlIiwidHlwZSIsInZhbHVlIiwic2VsZWN0TWFpbGJveCIsInF1ZXJ5IiwicmVhZE9ubHkiLCJjb25kc3RvcmUiLCJwdXNoIiwibWFpbGJveEluZm8iLCJsaXN0TmFtZXNwYWNlcyIsImxpc3RNYWlsYm94ZXMiLCJ0cmVlIiwicm9vdCIsImNoaWxkcmVuIiwibGlzdFJlc3BvbnNlIiwiZm9yRWFjaCIsIml0ZW0iLCJhdHRyIiwibGVuZ3RoIiwiZGVsaW0iLCJicmFuY2giLCJfZW5zdXJlUGF0aCIsImZsYWdzIiwibGlzdGVkIiwibHN1YlJlc3BvbnNlIiwibHN1YiIsImZsYWciLCJzdWJzY3JpYmVkIiwiY3JlYXRlTWFpbGJveCIsImNvZGUiLCJkZWxldGVNYWlsYm94IiwiZGVsUmVzcG9uc2UiLCJsaXN0TWVzc2FnZXMiLCJzZXF1ZW5jZSIsIml0ZW1zIiwiZmFzdCIsInByZWNoZWNrIiwic2VhcmNoIiwic2V0RmxhZ3MiLCJrZXkiLCJBcnJheSIsImlzQXJyYXkiLCJjb25jYXQiLCJhZGQiLCJzZXQiLCJyZW1vdmUiLCJzdG9yZSIsImFjdGlvbiIsInVwbG9hZCIsImRlc3RpbmF0aW9uIiwidXBsb2FkUmVzcG9uc2UiLCJkZWxldGVNZXNzYWdlcyIsInVzZVVpZFBsdXMiLCJieVVpZCIsInVpZEV4cHVuZ2VDb21tYW5kIiwiY21kIiwiY29weU1lc3NhZ2VzIiwiaHVtYW5SZWFkYWJsZSIsIm1vdmVNZXNzYWdlcyIsIm1vdmVSZXNwb25zZSIsImNvbXByZXNzZWQiLCJ4b2F1dGgyIiwidXNlciIsInNlbnNpdGl2ZSIsImVycm9yUmVzcG9uc2VFeHBlY3RzRW1wdHlMaW5lIiwicGFzcyIsImNhcGFiaWxpdHkiLCJwYXlsb2FkIiwiQ0FQQUJJTElUWSIsInBvcCIsImNhcGEiLCJ0b1VwcGVyQ2FzZSIsInRyaW0iLCJhY2NlcHRVbnRhZ2dlZCIsImJyZWFrSWRsZSIsImVucXVldWVDb21tYW5kIiwiZW50ZXJJZGxlIiwic2VuZCIsInNlY3VyZU1vZGUiLCJ1cGdyYWRlIiwiZm9yY2VkIiwiY2FwUmVzcG9uc2UiLCJoYXNDYXBhYmlsaXR5IiwiaGFzT3duUHJvcGVydHkiLCJuciIsIkZFVENIIiwic2hpZnQiLCJuZXdTdGF0ZSIsImRlbGltaXRlciIsIm5hbWVzIiwic3BsaXQiLCJmb3VuZCIsImoiLCJfY29tcGFyZU1haWxib3hOYW1lcyIsInNsaWNlIiwiam9pbiIsImEiLCJiIiwiY3JlYXRvciIsImNyZWF0ZURlZmF1bHRMb2dnZXIiLCJtc2dzIiwiTE9HX0xFVkVMX0RFQlVHIiwiaW5mbyIsIkxPR19MRVZFTF9JTkZPIiwiTE9HX0xFVkVMX1dBUk4iLCJMT0dfTEVWRUxfRVJST1IiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7QUFDQTs7QUFDQTs7QUFNQTs7QUFPQTs7QUFDQTs7QUFDQTs7QUFRQTs7Ozs7Ozs7QUFJTyxNQUFNQSxrQkFBa0IsR0FBRyxLQUFLLElBQWhDLEMsQ0FBcUM7OztBQUNy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LElBQVo7QUFBbUI7QUFBRSxPQUhoRDtBQUlqQ3ZJLE1BQUFBLEtBQUssRUFBRSxDQUFDLEdBQUd1SSxJQUFKLEtBQWE7QUFBRSxZQUFJSywyQkFBbUIsS0FBSzVKLFFBQTVCLEVBQXNDO0FBQUVVLFVBQUFBLE1BQU0sQ0FBQ00sS0FBUCxDQUFhdUksSUFBYjtBQUFvQjtBQUFFO0FBSm5ELEtBQW5DO0FBTUQ7O0FBaCtCeUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBtYXAsIHBpcGUsIHVuaW9uLCB6aXAsIGZyb21QYWlycywgcHJvcE9yLCBwYXRoT3IsIGZsYXR0ZW4gfSBmcm9tICdyYW1kYSdcbmltcG9ydCB7IGltYXBFbmNvZGUsIGltYXBEZWNvZGUgfSBmcm9tICdlbWFpbGpzLXV0ZjcnXG5pbXBvcnQge1xuICBwYXJzZU5BTUVTUEFDRSxcbiAgcGFyc2VTRUxFQ1QsXG4gIHBhcnNlRkVUQ0gsXG4gIHBhcnNlU0VBUkNIXG59IGZyb20gJy4vY29tbWFuZC1wYXJzZXInXG5pbXBvcnQge1xuICBidWlsZEZFVENIQ29tbWFuZCxcbiAgYnVpbGRYT0F1dGgyVG9rZW4sXG4gIGJ1aWxkU0VBUkNIQ29tbWFuZCxcbiAgYnVpbGRTVE9SRUNvbW1hbmRcbn0gZnJvbSAnLi9jb21tYW5kLWJ1aWxkZXInXG5cbmltcG9ydCBjcmVhdGVEZWZhdWx0TG9nZ2VyIGZyb20gJy4vbG9nZ2VyJ1xuaW1wb3J0IEltYXBDbGllbnQgZnJvbSAnLi9pbWFwJ1xuaW1wb3J0IHtcbiAgTE9HX0xFVkVMX0VSUk9SLFxuICBMT0dfTEVWRUxfV0FSTixcbiAgTE9HX0xFVkVMX0lORk8sXG4gIExPR19MRVZFTF9ERUJVRyxcbiAgTE9HX0xFVkVMX0FMTFxufSBmcm9tICcuL2NvbW1vbidcblxuaW1wb3J0IHtcbiAgY2hlY2tTcGVjaWFsVXNlXG59IGZyb20gJy4vc3BlY2lhbC11c2UnXG5cbmV4cG9ydCBjb25zdCBUSU1FT1VUX0NPTk5FQ1RJT04gPSA5MCAqIDEwMDAgLy8gTWlsbGlzZWNvbmRzIHRvIHdhaXQgZm9yIHRoZSBJTUFQIGdyZWV0aW5nIGZyb20gdGhlIHNlcnZlclxuZXhwb3J0IGNvbnN0IFRJTUVPVVRfTk9PUCA9IDYwICogMTAwMCAvLyBNaWxsaXNlY29uZHMgYmV0d2VlbiBOT09QIGNvbW1hbmRzIHdoaWxlIGlkbGluZ1xuZXhwb3J0IGNvbnN0IFRJTUVPVVRfSURMRSA9IDYwICogMTAwMCAvLyBNaWxsaXNlY29uZHMgdW50aWwgSURMRSBjb21tYW5kIGlzIGNhbmNlbGxlZFxuXG5leHBvcnQgY29uc3QgU1RBVEVfQ09OTkVDVElORyA9IDFcbmV4cG9ydCBjb25zdCBTVEFURV9OT1RfQVVUSEVOVElDQVRFRCA9IDJcbmV4cG9ydCBjb25zdCBTVEFURV9BVVRIRU5USUNBVEVEID0gM1xuZXhwb3J0IGNvbnN0IFNUQVRFX1NFTEVDVEVEID0gNFxuZXhwb3J0IGNvbnN0IFNUQVRFX0xPR09VVCA9IDVcblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfQ0xJRU5UX0lEID0ge1xuICBuYW1lOiAnZW1haWxqcy1pbWFwLWNsaWVudCdcbn1cblxuLyoqXG4gKiBlbWFpbGpzIElNQVAgY2xpZW50XG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IFtob3N0PSdsb2NhbGhvc3QnXSBIb3N0bmFtZSB0byBjb25lbmN0IHRvXG4gKiBAcGFyYW0ge051bWJlcn0gW3BvcnQ9MTQzXSBQb3J0IG51bWJlciB0byBjb25uZWN0IHRvXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0XG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENsaWVudCB7XG4gIGNvbnN0cnVjdG9yIChob3N0LCBwb3J0LCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLl9vbkVycm9yID0gdGhpcy5fb25FcnJvci5iaW5kKHRoaXMpXG4gICAgdGhpcy50aW1lb3V0Q29ubmVjdGlvbiA9IFRJTUVPVVRfQ09OTkVDVElPTlxuICAgIHRoaXMudGltZW91dE5vb3AgPSBUSU1FT1VUX05PT1BcbiAgICB0aGlzLnRpbWVvdXRJZGxlID0gVElNRU9VVF9JRExFXG5cbiAgICB0aGlzLnNlcnZlcklkID0gZmFsc2UgLy8gUkZDIDI5NzEgU2VydmVyIElEIGFzIGtleSB2YWx1ZSBwYWlyc1xuXG4gICAgLy8gRXZlbnQgcGxhY2Vob2xkZXJzXG4gICAgdGhpcy5vbmNlcnQgPSBudWxsXG4gICAgdGhpcy5vbnVwZGF0ZSA9IG51bGxcbiAgICB0aGlzLm9uc2VsZWN0bWFpbGJveCA9IG51bGxcbiAgICB0aGlzLm9uY2xvc2VtYWlsYm94ID0gbnVsbFxuXG4gICAgdGhpcy5faG9zdCA9IGhvc3RcbiAgICB0aGlzLl9jbGllbnRJZCA9IHByb3BPcihERUZBVUxUX0NMSUVOVF9JRCwgJ2lkJywgb3B0aW9ucylcbiAgICB0aGlzLl9zdGF0ZSA9IGZhbHNlIC8vIEN1cnJlbnQgc3RhdGVcbiAgICB0aGlzLl9hdXRoZW50aWNhdGVkID0gZmFsc2UgLy8gSXMgdGhlIGNvbm5lY3Rpb24gYXV0aGVudGljYXRlZFxuICAgIHRoaXMuX2NhcGFiaWxpdHkgPSBbXSAvLyBMaXN0IG9mIGV4dGVuc2lvbnMgdGhlIHNlcnZlciBzdXBwb3J0c1xuICAgIHRoaXMuX3NlbGVjdGVkTWFpbGJveCA9IGZhbHNlIC8vIFNlbGVjdGVkIG1haWxib3hcbiAgICB0aGlzLl9lbnRlcmVkSWRsZSA9IGZhbHNlXG4gICAgdGhpcy5faWRsZVRpbWVvdXQgPSBmYWxzZVxuICAgIHRoaXMuX2VuYWJsZUNvbXByZXNzaW9uID0gISFvcHRpb25zLmVuYWJsZUNvbXByZXNzaW9uXG4gICAgdGhpcy5fYXV0aCA9IG9wdGlvbnMuYXV0aFxuICAgIHRoaXMuX3JlcXVpcmVUTFMgPSAhIW9wdGlvbnMucmVxdWlyZVRMU1xuICAgIHRoaXMuX2lnbm9yZVRMUyA9ICEhb3B0aW9ucy5pZ25vcmVUTFNcblxuICAgIHRoaXMuY2xpZW50ID0gbmV3IEltYXBDbGllbnQoaG9zdCwgcG9ydCwgb3B0aW9ucykgLy8gSU1BUCBjbGllbnQgb2JqZWN0XG5cbiAgICAvLyBFdmVudCBIYW5kbGVyc1xuICAgIHRoaXMuY2xpZW50Lm9uZXJyb3IgPSB0aGlzLl9vbkVycm9yXG4gICAgdGhpcy5jbGllbnQub25jZXJ0ID0gKGNlcnQpID0+ICh0aGlzLm9uY2VydCAmJiB0aGlzLm9uY2VydChjZXJ0KSkgLy8gYWxsb3dzIGNlcnRpZmljYXRlIGhhbmRsaW5nIGZvciBwbGF0Zm9ybXMgdy9vIG5hdGl2ZSB0bHMgc3VwcG9ydFxuICAgIHRoaXMuY2xpZW50Lm9uaWRsZSA9ICgpID0+IHRoaXMuX29uSWRsZSgpIC8vIHN0YXJ0IGlkbGluZ1xuXG4gICAgLy8gRGVmYXVsdCBoYW5kbGVycyBmb3IgdW50YWdnZWQgcmVzcG9uc2VzXG4gICAgdGhpcy5jbGllbnQuc2V0SGFuZGxlcignY2FwYWJpbGl0eScsIChyZXNwb25zZSkgPT4gdGhpcy5fdW50YWdnZWRDYXBhYmlsaXR5SGFuZGxlcihyZXNwb25zZSkpIC8vIGNhcGFiaWxpdHkgdXBkYXRlc1xuICAgIHRoaXMuY2xpZW50LnNldEhhbmRsZXIoJ29rJywgKHJlc3BvbnNlKSA9PiB0aGlzLl91bnRhZ2dlZE9rSGFuZGxlcihyZXNwb25zZSkpIC8vIG5vdGlmaWNhdGlvbnNcbiAgICB0aGlzLmNsaWVudC5zZXRIYW5kbGVyKCdleGlzdHMnLCAocmVzcG9uc2UpID0+IHRoaXMuX3VudGFnZ2VkRXhpc3RzSGFuZGxlcihyZXNwb25zZSkpIC8vIG1lc3NhZ2UgY291bnQgaGFzIGNoYW5nZWRcbiAgICB0aGlzLmNsaWVudC5zZXRIYW5kbGVyKCdleHB1bmdlJywgKHJlc3BvbnNlKSA9PiB0aGlzLl91bnRhZ2dlZEV4cHVuZ2VIYW5kbGVyKHJlc3BvbnNlKSkgLy8gbWVzc2FnZSBoYXMgYmVlbiBkZWxldGVkXG4gICAgdGhpcy5jbGllbnQuc2V0SGFuZGxlcignZmV0Y2gnLCAocmVzcG9uc2UpID0+IHRoaXMuX3VudGFnZ2VkRmV0Y2hIYW5kbGVyKHJlc3BvbnNlKSkgLy8gbWVzc2FnZSBoYXMgYmVlbiB1cGRhdGVkIChlZy4gZmxhZyBjaGFuZ2UpXG5cbiAgICAvLyBBY3RpdmF0ZSBsb2dnaW5nXG4gICAgdGhpcy5jcmVhdGVMb2dnZXIoKVxuICAgIHRoaXMubG9nTGV2ZWwgPSBwcm9wT3IoTE9HX0xFVkVMX0FMTCwgJ2xvZ0xldmVsJywgb3B0aW9ucylcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsZWQgaWYgdGhlIGxvd2VyLWxldmVsIEltYXBDbGllbnQgaGFzIGVuY291bnRlcmVkIGFuIHVucmVjb3ZlcmFibGVcbiAgICogZXJyb3IgZHVyaW5nIG9wZXJhdGlvbi4gQ2xlYW5zIHVwIGFuZCBwcm9wYWdhdGVzIHRoZSBlcnJvciB1cHdhcmRzLlxuICAgKi9cbiAgX29uRXJyb3IgKGVycikge1xuICAgIC8vIG1ha2Ugc3VyZSBubyBpZGxlIHRpbWVvdXQgaXMgcGVuZGluZyBhbnltb3JlXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX2lkbGVUaW1lb3V0KVxuXG4gICAgLy8gcHJvcGFnYXRlIHRoZSBlcnJvciB1cHdhcmRzXG4gICAgdGhpcy5vbmVycm9yICYmIHRoaXMub25lcnJvcihlcnIpXG4gIH1cblxuICAvL1xuICAvL1xuICAvLyBQVUJMSUMgQVBJXG4gIC8vXG4gIC8vXG5cbiAgLyoqXG4gICAqIEluaXRpYXRlIGNvbm5lY3Rpb24gdG8gdGhlIElNQVAgc2VydmVyXG4gICAqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdoZW4gbG9naW4gcHJvY2VkdXJlIGlzIGNvbXBsZXRlXG4gICAqL1xuICBhc3luYyBjb25uZWN0ICgpIHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5fb3BlbkNvbm5lY3Rpb24oKVxuICAgICAgdGhpcy5fY2hhbmdlU3RhdGUoU1RBVEVfTk9UX0FVVEhFTlRJQ0FURUQpXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUNhcGFiaWxpdHkoKVxuICAgICAgYXdhaXQgdGhpcy51cGdyYWRlQ29ubmVjdGlvbigpXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZUlkKHRoaXMuX2NsaWVudElkKVxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ0ZhaWxlZCB0byB1cGRhdGUgc2VydmVyIGlkIScsIGVyci5tZXNzYWdlKVxuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLmxvZ2luKHRoaXMuX2F1dGgpXG4gICAgICBhd2FpdCB0aGlzLmNvbXByZXNzQ29ubmVjdGlvbigpXG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnQ29ubmVjdGlvbiBlc3RhYmxpc2hlZCwgcmVhZHkgdG8gcm9sbCEnKVxuICAgICAgdGhpcy5jbGllbnQub25lcnJvciA9IHRoaXMuX29uRXJyb3JcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdDb3VsZCBub3QgY29ubmVjdCB0byBzZXJ2ZXInLCBlcnIpXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCB0aGlzLmNsb3NlKGVycikgLy8gd2UgZG9uJ3QgcmVhbGx5IGNhcmUgd2hldGhlciB0aGlzIHdvcmtzIG9yIG5vdFxuICAgICAgfSBjYXRjaCAoY0Vycikge1xuICAgICAgICB0aHJvdyBjRXJyXG4gICAgICB9XG4gICAgICB0aHJvdyBlcnJcbiAgICB9XG4gIH1cblxuICBfb3BlbkNvbm5lY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBsZXQgY29ubmVjdGlvblRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHJlamVjdChuZXcgRXJyb3IoJ1RpbWVvdXQgY29ubmVjdGluZyB0byBzZXJ2ZXInKSksIHRoaXMudGltZW91dENvbm5lY3Rpb24pXG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnQ29ubmVjdGluZyB0bycsIHRoaXMuY2xpZW50Lmhvc3QsICc6JywgdGhpcy5jbGllbnQucG9ydClcbiAgICAgIHRoaXMuX2NoYW5nZVN0YXRlKFNUQVRFX0NPTk5FQ1RJTkcpXG4gICAgICB0cnkge1xuICAgICAgICB0aGlzLmNsaWVudC5jb25uZWN0KCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ1NvY2tldCBvcGVuZWQsIHdhaXRpbmcgZm9yIGdyZWV0aW5nIGZyb20gdGhlIHNlcnZlci4uLicpXG5cbiAgICAgICAgICB0aGlzLmNsaWVudC5vbnJlYWR5ID0gKCkgPT4ge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGNvbm5lY3Rpb25UaW1lb3V0KVxuICAgICAgICAgICAgcmVzb2x2ZSgpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGhpcy5jbGllbnQub25lcnJvciA9IChlcnIpID0+IHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChjb25uZWN0aW9uVGltZW91dClcbiAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgfVxuICAgICAgICB9KS5jYXRjaChlcnIgPT4ge1xuICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgIH0pXG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmVqZWN0KGVycilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIExvZ291dFxuICAgKlxuICAgKiBTZW5kIExPR09VVCwgdG8gd2hpY2ggdGhlIHNlcnZlciByZXNwb25kcyBieSBjbG9zaW5nIHRoZSBjb25uZWN0aW9uLlxuICAgKiBVc2UgaXMgZGlzY291cmFnZWQgaWYgbmV0d29yayBzdGF0dXMgaXMgdW5jbGVhciEgSWYgbmV0d29ya3Mgc3RhdHVzIGlzXG4gICAqIHVuY2xlYXIsIHBsZWFzZSB1c2UgI2Nsb3NlIGluc3RlYWQhXG4gICAqXG4gICAqIExPR09VVCBkZXRhaWxzOlxuICAgKiAgIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi4xLjNcbiAgICpcbiAgICogQHJldHVybnMge1Byb21pc2V9IFJlc29sdmVzIHdoZW4gc2VydmVyIGhhcyBjbG9zZWQgdGhlIGNvbm5lY3Rpb25cbiAgICovXG4gIGFzeW5jIGxvZ291dCAoKSB7XG4gICAgdGhpcy5fY2hhbmdlU3RhdGUoU1RBVEVfTE9HT1VUKVxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdMb2dnaW5nIG91dC4uLicpXG4gICAgYXdhaXQgdGhpcy5jbGllbnQubG9nb3V0KClcbiAgICBjbGVhclRpbWVvdXQodGhpcy5faWRsZVRpbWVvdXQpXG4gIH1cblxuICAvKipcbiAgICogRm9yY2UtY2xvc2VzIHRoZSBjdXJyZW50IGNvbm5lY3Rpb24gYnkgY2xvc2luZyB0aGUgVENQIHNvY2tldC5cbiAgICpcbiAgICogQHJldHVybnMge1Byb21pc2V9IFJlc29sdmVzIHdoZW4gc29ja2V0IGlzIGNsb3NlZFxuICAgKi9cbiAgYXN5bmMgY2xvc2UgKGVycikge1xuICAgIHRoaXMuX2NoYW5nZVN0YXRlKFNUQVRFX0xPR09VVClcbiAgICBjbGVhclRpbWVvdXQodGhpcy5faWRsZVRpbWVvdXQpXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0Nsb3NpbmcgY29ubmVjdGlvbi4uLicpXG4gICAgYXdhaXQgdGhpcy5jbGllbnQuY2xvc2UoZXJyKVxuICAgIGNsZWFyVGltZW91dCh0aGlzLl9pZGxlVGltZW91dClcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIElEIGNvbW1hbmQsIHBhcnNlcyBJRCByZXNwb25zZSwgc2V0cyB0aGlzLnNlcnZlcklkXG4gICAqXG4gICAqIElEIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMjk3MVxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gaWQgSUQgYXMgSlNPTiBvYmplY3QuIFNlZSBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMyOTcxI3NlY3Rpb24tMy4zIGZvciBwb3NzaWJsZSB2YWx1ZXNcbiAgICogQHJldHVybnMge1Byb21pc2V9IFJlc29sdmVzIHdoZW4gcmVzcG9uc2UgaGFzIGJlZW4gcGFyc2VkXG4gICAqL1xuICBhc3luYyB1cGRhdGVJZCAoaWQpIHtcbiAgICBpZiAodGhpcy5fY2FwYWJpbGl0eS5pbmRleE9mKCdJRCcpIDwgMCkgcmV0dXJuXG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnVXBkYXRpbmcgaWQuLi4nKVxuXG4gICAgY29uc3QgY29tbWFuZCA9ICdJRCdcbiAgICBjb25zdCBhdHRyaWJ1dGVzID0gaWQgPyBbIGZsYXR0ZW4oT2JqZWN0LmVudHJpZXMoaWQpKSBdIDogWyBudWxsIF1cbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmV4ZWMoeyBjb21tYW5kLCBhdHRyaWJ1dGVzIH0sICdJRCcpXG4gICAgICBjb25zdCBsaXN0ID0gZmxhdHRlbihwYXRoT3IoW10sIFsncGF5bG9hZCcsICdJRCcsICcwJywgJ2F0dHJpYnV0ZXMnLCAnMCddLCByZXNwb25zZSkubWFwKE9iamVjdC52YWx1ZXMpKVxuICAgICAgY29uc3Qga2V5cyA9IGxpc3QuZmlsdGVyKChfLCBpKSA9PiBpICUgMiA9PT0gMClcbiAgICAgIGNvbnN0IHZhbHVlcyA9IGxpc3QuZmlsdGVyKChfLCBpKSA9PiBpICUgMiA9PT0gMSlcbiAgICAgIHRoaXMuc2VydmVySWQgPSBmcm9tUGFpcnMoemlwKGtleXMsIHZhbHVlcykpXG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnU2VydmVyIGlkIHVwZGF0ZWQhJywgdGhpcy5zZXJ2ZXJJZClcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuX29uRXJyb3IoZXJyKVxuICAgIH1cbiAgfVxuXG4gIF9zaG91bGRTZWxlY3RNYWlsYm94IChwYXRoLCBjdHgpIHtcbiAgICBpZiAoIWN0eCkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG5cbiAgICBjb25zdCBwcmV2aW91c1NlbGVjdCA9IHRoaXMuY2xpZW50LmdldFByZXZpb3VzbHlRdWV1ZWQoWydTRUxFQ1QnLCAnRVhBTUlORSddLCBjdHgpXG4gICAgaWYgKHByZXZpb3VzU2VsZWN0ICYmIHByZXZpb3VzU2VsZWN0LnJlcXVlc3QuYXR0cmlidXRlcykge1xuICAgICAgY29uc3QgcGF0aEF0dHJpYnV0ZSA9IHByZXZpb3VzU2VsZWN0LnJlcXVlc3QuYXR0cmlidXRlcy5maW5kKChhdHRyaWJ1dGUpID0+IGF0dHJpYnV0ZS50eXBlID09PSAnU1RSSU5HJylcbiAgICAgIGlmIChwYXRoQXR0cmlidXRlKSB7XG4gICAgICAgIHJldHVybiBwYXRoQXR0cmlidXRlLnZhbHVlICE9PSBwYXRoXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX3NlbGVjdGVkTWFpbGJveCAhPT0gcGF0aFxuICB9XG5cbiAgLyoqXG4gICAqIFJ1bnMgU0VMRUNUIG9yIEVYQU1JTkUgdG8gb3BlbiBhIG1haWxib3hcbiAgICpcbiAgICogU0VMRUNUIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuMy4xXG4gICAqIEVYQU1JTkUgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi4zLjJcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggRnVsbCBwYXRoIHRvIG1haWxib3hcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBPcHRpb25zIG9iamVjdFxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB3aXRoIGluZm9ybWF0aW9uIGFib3V0IHRoZSBzZWxlY3RlZCBtYWlsYm94XG4gICAqL1xuICBhc3luYyBzZWxlY3RNYWlsYm94IChwYXRoLCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgcXVlcnkgPSB7XG4gICAgICBjb21tYW5kOiBvcHRpb25zLnJlYWRPbmx5ID8gJ0VYQU1JTkUnIDogJ1NFTEVDVCcsXG4gICAgICBhdHRyaWJ1dGVzOiBbeyB0eXBlOiAnU1RSSU5HJywgdmFsdWU6IHBhdGggfV1cbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5jb25kc3RvcmUgJiYgdGhpcy5fY2FwYWJpbGl0eS5pbmRleE9mKCdDT05EU1RPUkUnKSA+PSAwKSB7XG4gICAgICBxdWVyeS5hdHRyaWJ1dGVzLnB1c2goW3sgdHlwZTogJ0FUT00nLCB2YWx1ZTogJ0NPTkRTVE9SRScgfV0pXG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ09wZW5pbmcnLCBwYXRoLCAnLi4uJylcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmV4ZWMocXVlcnksIFsnRVhJU1RTJywgJ0ZMQUdTJywgJ09LJ10sIHsgY3R4OiBvcHRpb25zLmN0eCB9KVxuICAgICAgbGV0IG1haWxib3hJbmZvID0gcGFyc2VTRUxFQ1QocmVzcG9uc2UpXG5cbiAgICAgIHRoaXMuX2NoYW5nZVN0YXRlKFNUQVRFX1NFTEVDVEVEKVxuXG4gICAgICBpZiAodGhpcy5fc2VsZWN0ZWRNYWlsYm94ICE9PSBwYXRoICYmIHRoaXMub25jbG9zZW1haWxib3gpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5vbmNsb3NlbWFpbGJveCh0aGlzLl9zZWxlY3RlZE1haWxib3gpXG4gICAgICB9XG4gICAgICB0aGlzLl9zZWxlY3RlZE1haWxib3ggPSBwYXRoXG4gICAgICBpZiAodGhpcy5vbnNlbGVjdG1haWxib3gpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5vbnNlbGVjdG1haWxib3gocGF0aCwgbWFpbGJveEluZm8pXG4gICAgICB9XG5cbiAgICAgIHJldHVybiBtYWlsYm94SW5mb1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5fb25FcnJvcihlcnIpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJ1bnMgTkFNRVNQQUNFIGNvbW1hbmRcbiAgICpcbiAgICogTkFNRVNQQUNFIGRldGFpbHM6XG4gICAqICAgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzIzNDJcbiAgICpcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2l0aCBuYW1lc3BhY2Ugb2JqZWN0XG4gICAqL1xuICBhc3luYyBsaXN0TmFtZXNwYWNlcyAoKSB7XG4gICAgaWYgKHRoaXMuX2NhcGFiaWxpdHkuaW5kZXhPZignTkFNRVNQQUNFJykgPCAwKSByZXR1cm4gZmFsc2VcblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdMaXN0aW5nIG5hbWVzcGFjZXMuLi4nKVxuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuZXhlYygnTkFNRVNQQUNFJywgJ05BTUVTUEFDRScpXG4gICAgICByZXR1cm4gcGFyc2VOQU1FU1BBQ0UocmVzcG9uc2UpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLl9vbkVycm9yKGVycilcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUnVucyBMSVNUIGFuZCBMU1VCIGNvbW1hbmRzLiBSZXRyaWV2ZXMgYSB0cmVlIG9mIGF2YWlsYWJsZSBtYWlsYm94ZXNcbiAgICpcbiAgICogTElTVCBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjMuOFxuICAgKiBMU1VCIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuMy45XG4gICAqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdpdGggbGlzdCBvZiBtYWlsYm94ZXNcbiAgICovXG4gIGFzeW5jIGxpc3RNYWlsYm94ZXMgKCkge1xuICAgIGNvbnN0IHRyZWUgPSB7IHJvb3Q6IHRydWUsIGNoaWxkcmVuOiBbXSB9XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnTGlzdGluZyBtYWlsYm94ZXMuLi4nKVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBsaXN0UmVzcG9uc2UgPSBhd2FpdCB0aGlzLmV4ZWMoeyBjb21tYW5kOiAnTElTVCcsIGF0dHJpYnV0ZXM6IFsnJywgJyonXSB9LCAnTElTVCcpXG4gICAgICBjb25zdCBsaXN0ID0gcGF0aE9yKFtdLCBbJ3BheWxvYWQnLCAnTElTVCddLCBsaXN0UmVzcG9uc2UpXG4gICAgICBsaXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgIGNvbnN0IGF0dHIgPSBwcm9wT3IoW10sICdhdHRyaWJ1dGVzJywgaXRlbSlcbiAgICAgICAgaWYgKGF0dHIubGVuZ3RoIDwgMykgcmV0dXJuXG5cbiAgICAgICAgY29uc3QgcGF0aCA9IHBhdGhPcignJywgWycyJywgJ3ZhbHVlJ10sIGF0dHIpXG4gICAgICAgIGNvbnN0IGRlbGltID0gcGF0aE9yKCcvJywgWycxJywgJ3ZhbHVlJ10sIGF0dHIpXG4gICAgICAgIGNvbnN0IGJyYW5jaCA9IHRoaXMuX2Vuc3VyZVBhdGgodHJlZSwgcGF0aCwgZGVsaW0pXG4gICAgICAgIGJyYW5jaC5mbGFncyA9IHByb3BPcihbXSwgJzAnLCBhdHRyKS5tYXAoKHsgdmFsdWUgfSkgPT4gdmFsdWUgfHwgJycpXG4gICAgICAgIGJyYW5jaC5saXN0ZWQgPSB0cnVlXG4gICAgICAgIGNoZWNrU3BlY2lhbFVzZShicmFuY2gpXG4gICAgICB9KVxuXG4gICAgICBjb25zdCBsc3ViUmVzcG9uc2UgPSBhd2FpdCB0aGlzLmV4ZWMoeyBjb21tYW5kOiAnTFNVQicsIGF0dHJpYnV0ZXM6IFsnJywgJyonXSB9LCAnTFNVQicpXG4gICAgICBjb25zdCBsc3ViID0gcGF0aE9yKFtdLCBbJ3BheWxvYWQnLCAnTFNVQiddLCBsc3ViUmVzcG9uc2UpXG4gICAgICBsc3ViLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgY29uc3QgYXR0ciA9IHByb3BPcihbXSwgJ2F0dHJpYnV0ZXMnLCBpdGVtKVxuICAgICAgICBpZiAoYXR0ci5sZW5ndGggPCAzKSByZXR1cm5cblxuICAgICAgICBjb25zdCBwYXRoID0gcGF0aE9yKCcnLCBbJzInLCAndmFsdWUnXSwgYXR0cilcbiAgICAgICAgY29uc3QgZGVsaW0gPSBwYXRoT3IoJy8nLCBbJzEnLCAndmFsdWUnXSwgYXR0cilcbiAgICAgICAgY29uc3QgYnJhbmNoID0gdGhpcy5fZW5zdXJlUGF0aCh0cmVlLCBwYXRoLCBkZWxpbSlcbiAgICAgICAgcHJvcE9yKFtdLCAnMCcsIGF0dHIpLm1hcCgoZmxhZyA9ICcnKSA9PiB7IGJyYW5jaC5mbGFncyA9IHVuaW9uKGJyYW5jaC5mbGFncywgW2ZsYWddKSB9KVxuICAgICAgICBicmFuY2guc3Vic2NyaWJlZCA9IHRydWVcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiB0cmVlXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLl9vbkVycm9yKGVycilcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgbWFpbGJveCB3aXRoIHRoZSBnaXZlbiBwYXRoLlxuICAgKlxuICAgKiBDUkVBVEUgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi4zLjNcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICogICAgIFRoZSBwYXRoIG9mIHRoZSBtYWlsYm94IHlvdSB3b3VsZCBsaWtlIHRvIGNyZWF0ZS4gIFRoaXMgbWV0aG9kIHdpbGxcbiAgICogICAgIGhhbmRsZSB1dGY3IGVuY29kaW5nIGZvciB5b3UuXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKiAgICAgUHJvbWlzZSByZXNvbHZlcyBpZiBtYWlsYm94IHdhcyBjcmVhdGVkLlxuICAgKiAgICAgSW4gdGhlIGV2ZW50IHRoZSBzZXJ2ZXIgc2F5cyBOTyBbQUxSRUFEWUVYSVNUU10sIHdlIHRyZWF0IHRoYXQgYXMgc3VjY2Vzcy5cbiAgICovXG4gIGFzeW5jIGNyZWF0ZU1haWxib3ggKHBhdGgpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnQ3JlYXRpbmcgbWFpbGJveCcsIHBhdGgsICcuLi4nKVxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLmV4ZWMoeyBjb21tYW5kOiAnQ1JFQVRFJywgYXR0cmlidXRlczogW2ltYXBFbmNvZGUocGF0aCldIH0pXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyICYmIGVyci5jb2RlID09PSAnQUxSRUFEWUVYSVNUUycpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB0aHJvdyBlcnJcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGVsZXRlIGEgbWFpbGJveCB3aXRoIHRoZSBnaXZlbiBwYXRoLlxuICAgKlxuICAgKiBERUxFVEUgZGV0YWlsczpcbiAgICogICBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuMy40XG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAqICAgICBUaGUgcGF0aCBvZiB0aGUgbWFpbGJveCB5b3Ugd291bGQgbGlrZSB0byBkZWxldGUuICBUaGlzIG1ldGhvZCB3aWxsXG4gICAqICAgICBoYW5kbGUgdXRmNyBlbmNvZGluZyBmb3IgeW91LlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICogICAgIFByb21pc2UgcmVzb2x2ZXMgaWYgbWFpbGJveCB3YXMgZGVsZXRlZC5cbiAgICovXG4gIGRlbGV0ZU1haWxib3ggKHBhdGgpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnRGVsZXRpbmcgbWFpbGJveCcsIHBhdGgsICcuLi4nKVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkZWxSZXNwb25zZSA9IHRoaXMuZXhlYyh7IGNvbW1hbmQ6ICdERUxFVEUnLCBhdHRyaWJ1dGVzOiBbaW1hcEVuY29kZShwYXRoKV0gfSlcbiAgICAgIHJldHVybiBkZWxSZXNwb25zZVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5fb25FcnJvcihlcnIpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJ1bnMgRkVUQ0ggY29tbWFuZFxuICAgKlxuICAgKiBGRVRDSCBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjQuNVxuICAgKiBDSEFOR0VEU0lOQ0UgZGV0YWlsczpcbiAgICogICBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNDU1MSNzZWN0aW9uLTMuM1xuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBUaGUgcGF0aCBmb3IgdGhlIG1haWxib3ggd2hpY2ggc2hvdWxkIGJlIHNlbGVjdGVkIGZvciB0aGUgY29tbWFuZC4gU2VsZWN0cyBtYWlsYm94IGlmIG5lY2Vzc2FyeVxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2VxdWVuY2UgU2VxdWVuY2Ugc2V0LCBlZyAxOiogZm9yIGFsbCBtZXNzYWdlc1xuICAgKiBAcGFyYW0ge09iamVjdH0gW2l0ZW1zXSBNZXNzYWdlIGRhdGEgaXRlbSBuYW1lcyBvciBtYWNyb1xuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIFF1ZXJ5IG1vZGlmaWVyc1xuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB3aXRoIHRoZSBmZXRjaGVkIG1lc3NhZ2UgaW5mb1xuICAgKi9cbiAgYXN5bmMgbGlzdE1lc3NhZ2VzIChwYXRoLCBzZXF1ZW5jZSwgaXRlbXMgPSBbeyBmYXN0OiB0cnVlIH1dLCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnRmV0Y2hpbmcgbWVzc2FnZXMnLCBzZXF1ZW5jZSwgJ2Zyb20nLCBwYXRoLCAnLi4uJylcbiAgICB0cnkge1xuICAgICAgY29uc3QgY29tbWFuZCA9IGJ1aWxkRkVUQ0hDb21tYW5kKHNlcXVlbmNlLCBpdGVtcywgb3B0aW9ucylcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5leGVjKGNvbW1hbmQsICdGRVRDSCcsIHtcbiAgICAgICAgcHJlY2hlY2s6IChjdHgpID0+IHRoaXMuX3Nob3VsZFNlbGVjdE1haWxib3gocGF0aCwgY3R4KSA/IHRoaXMuc2VsZWN0TWFpbGJveChwYXRoLCB7IGN0eCB9KSA6IFByb21pc2UucmVzb2x2ZSgpXG4gICAgICB9KVxuICAgICAgcmV0dXJuIHBhcnNlRkVUQ0gocmVzcG9uc2UpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLl9vbkVycm9yKGVycilcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUnVucyBTRUFSQ0ggY29tbWFuZFxuICAgKlxuICAgKiBTRUFSQ0ggZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi40LjRcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggVGhlIHBhdGggZm9yIHRoZSBtYWlsYm94IHdoaWNoIHNob3VsZCBiZSBzZWxlY3RlZCBmb3IgdGhlIGNvbW1hbmQuIFNlbGVjdHMgbWFpbGJveCBpZiBuZWNlc3NhcnlcbiAgICogQHBhcmFtIHtPYmplY3R9IHF1ZXJ5IFNlYXJjaCB0ZXJtc1xuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIFF1ZXJ5IG1vZGlmaWVyc1xuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB3aXRoIHRoZSBhcnJheSBvZiBtYXRjaGluZyBzZXEuIG9yIHVpZCBudW1iZXJzXG4gICAqL1xuICBhc3luYyBzZWFyY2ggKHBhdGgsIHF1ZXJ5LCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnU2VhcmNoaW5nIGluJywgcGF0aCwgJy4uLicpXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBidWlsZFNFQVJDSENvbW1hbmQocXVlcnksIG9wdGlvbnMpXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuZXhlYyhjb21tYW5kLCAnU0VBUkNIJywge1xuICAgICAgICBwcmVjaGVjazogKGN0eCkgPT4gdGhpcy5fc2hvdWxkU2VsZWN0TWFpbGJveChwYXRoLCBjdHgpID8gdGhpcy5zZWxlY3RNYWlsYm94KHBhdGgsIHsgY3R4IH0pIDogUHJvbWlzZS5yZXNvbHZlKClcbiAgICAgIH0pXG4gICAgICByZXR1cm4gcGFyc2VTRUFSQ0gocmVzcG9uc2UpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLl9vbkVycm9yKGVycilcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUnVucyBTVE9SRSBjb21tYW5kXG4gICAqXG4gICAqIFNUT1JFIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuNC42XG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBwYXRoIGZvciB0aGUgbWFpbGJveCB3aGljaCBzaG91bGQgYmUgc2VsZWN0ZWQgZm9yIHRoZSBjb21tYW5kLiBTZWxlY3RzIG1haWxib3ggaWYgbmVjZXNzYXJ5XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzZXF1ZW5jZSBNZXNzYWdlIHNlbGVjdG9yIHdoaWNoIHRoZSBmbGFnIGNoYW5nZSBpcyBhcHBsaWVkIHRvXG4gICAqIEBwYXJhbSB7QXJyYXl9IGZsYWdzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gUXVlcnkgbW9kaWZpZXJzXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdpdGggdGhlIGFycmF5IG9mIG1hdGNoaW5nIHNlcS4gb3IgdWlkIG51bWJlcnNcbiAgICovXG4gIHNldEZsYWdzIChwYXRoLCBzZXF1ZW5jZSwgZmxhZ3MsIG9wdGlvbnMpIHtcbiAgICBsZXQga2V5ID0gJydcbiAgICBsZXQgbGlzdCA9IFtdXG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShmbGFncykgfHwgdHlwZW9mIGZsYWdzICE9PSAnb2JqZWN0Jykge1xuICAgICAgbGlzdCA9IFtdLmNvbmNhdChmbGFncyB8fCBbXSlcbiAgICAgIGtleSA9ICcnXG4gICAgfSBlbHNlIGlmIChmbGFncy5hZGQpIHtcbiAgICAgIGxpc3QgPSBbXS5jb25jYXQoZmxhZ3MuYWRkIHx8IFtdKVxuICAgICAga2V5ID0gJysnXG4gICAgfSBlbHNlIGlmIChmbGFncy5zZXQpIHtcbiAgICAgIGtleSA9ICcnXG4gICAgICBsaXN0ID0gW10uY29uY2F0KGZsYWdzLnNldCB8fCBbXSlcbiAgICB9IGVsc2UgaWYgKGZsYWdzLnJlbW92ZSkge1xuICAgICAga2V5ID0gJy0nXG4gICAgICBsaXN0ID0gW10uY29uY2F0KGZsYWdzLnJlbW92ZSB8fCBbXSlcbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnU2V0dGluZyBmbGFncyBvbicsIHNlcXVlbmNlLCAnaW4nLCBwYXRoLCAnLi4uJylcbiAgICByZXR1cm4gdGhpcy5zdG9yZShwYXRoLCBzZXF1ZW5jZSwga2V5ICsgJ0ZMQUdTJywgbGlzdCwgb3B0aW9ucylcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIFNUT1JFIGNvbW1hbmRcbiAgICpcbiAgICogU1RPUkUgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi40LjZcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggVGhlIHBhdGggZm9yIHRoZSBtYWlsYm94IHdoaWNoIHNob3VsZCBiZSBzZWxlY3RlZCBmb3IgdGhlIGNvbW1hbmQuIFNlbGVjdHMgbWFpbGJveCBpZiBuZWNlc3NhcnlcbiAgICogQHBhcmFtIHtTdHJpbmd9IHNlcXVlbmNlIE1lc3NhZ2Ugc2VsZWN0b3Igd2hpY2ggdGhlIGZsYWcgY2hhbmdlIGlzIGFwcGxpZWQgdG9cbiAgICogQHBhcmFtIHtTdHJpbmd9IGFjdGlvbiBTVE9SRSBtZXRob2QgdG8gY2FsbCwgZWcgXCIrRkxBR1NcIlxuICAgKiBAcGFyYW0ge0FycmF5fSBmbGFnc1xuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIFF1ZXJ5IG1vZGlmaWVyc1xuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB3aXRoIHRoZSBhcnJheSBvZiBtYXRjaGluZyBzZXEuIG9yIHVpZCBudW1iZXJzXG4gICAqL1xuICBhc3luYyBzdG9yZSAocGF0aCwgc2VxdWVuY2UsIGFjdGlvbiwgZmxhZ3MsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBjb21tYW5kID0gYnVpbGRTVE9SRUNvbW1hbmQoc2VxdWVuY2UsIGFjdGlvbiwgZmxhZ3MsIG9wdGlvbnMpXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuZXhlYyhjb21tYW5kLCAnRkVUQ0gnLCB7XG4gICAgICAgIHByZWNoZWNrOiAoY3R4KSA9PiB0aGlzLl9zaG91bGRTZWxlY3RNYWlsYm94KHBhdGgsIGN0eCkgPyB0aGlzLnNlbGVjdE1haWxib3gocGF0aCwgeyBjdHggfSkgOiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgfSlcbiAgICAgIHJldHVybiBwYXJzZUZFVENIKHJlc3BvbnNlKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5fb25FcnJvcihlcnIpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJ1bnMgQVBQRU5EIGNvbW1hbmRcbiAgICpcbiAgICogQVBQRU5EIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuMy4xMVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gZGVzdGluYXRpb24gVGhlIG1haWxib3ggd2hlcmUgdG8gYXBwZW5kIHRoZSBtZXNzYWdlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGFwcGVuZFxuICAgKiBAcGFyYW0ge0FycmF5fSBvcHRpb25zLmZsYWdzIEFueSBmbGFncyB5b3Ugd2FudCB0byBzZXQgb24gdGhlIHVwbG9hZGVkIG1lc3NhZ2UuIERlZmF1bHRzIHRvIFtcXFNlZW5dLiAob3B0aW9uYWwpXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdpdGggdGhlIGFycmF5IG9mIG1hdGNoaW5nIHNlcS4gb3IgdWlkIG51bWJlcnNcbiAgICovXG4gIHVwbG9hZCAoZGVzdGluYXRpb24sIG1lc3NhZ2UsIG9wdGlvbnMgPSB7fSkge1xuICAgIGxldCBmbGFncyA9IHByb3BPcihbJ1xcXFxTZWVuJ10sICdmbGFncycsIG9wdGlvbnMpLm1hcCh2YWx1ZSA9PiAoeyB0eXBlOiAnYXRvbScsIHZhbHVlIH0pKVxuICAgIGxldCBjb21tYW5kID0ge1xuICAgICAgY29tbWFuZDogJ0FQUEVORCcsXG4gICAgICBhdHRyaWJ1dGVzOiBbXG4gICAgICAgIHsgdHlwZTogJ2F0b20nLCB2YWx1ZTogZGVzdGluYXRpb24gfSxcbiAgICAgICAgZmxhZ3MsXG4gICAgICAgIHsgdHlwZTogJ2xpdGVyYWwnLCB2YWx1ZTogbWVzc2FnZSB9XG4gICAgICBdXG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ1VwbG9hZGluZyBtZXNzYWdlIHRvJywgZGVzdGluYXRpb24sICcuLi4nKVxuICAgIHRyeSB7XG4gICAgICBjb25zdCB1cGxvYWRSZXNwb25zZSA9IHRoaXMuZXhlYyhjb21tYW5kKVxuICAgICAgcmV0dXJuIHVwbG9hZFJlc3BvbnNlXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLl9vbkVycm9yKGVycilcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGVsZXRlcyBtZXNzYWdlcyBmcm9tIGEgc2VsZWN0ZWQgbWFpbGJveFxuICAgKlxuICAgKiBFWFBVTkdFIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuNC4zXG4gICAqIFVJRCBFWFBVTkdFIGRldGFpbHM6XG4gICAqICAgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzQzMTUjc2VjdGlvbi0yLjFcbiAgICpcbiAgICogSWYgcG9zc2libGUgKGJ5VWlkOnRydWUgYW5kIFVJRFBMVVMgZXh0ZW5zaW9uIHN1cHBvcnRlZCksIHVzZXMgVUlEIEVYUFVOR0VcbiAgICogY29tbWFuZCB0byBkZWxldGUgYSByYW5nZSBvZiBtZXNzYWdlcywgb3RoZXJ3aXNlIGZhbGxzIGJhY2sgdG8gRVhQVU5HRS5cbiAgICpcbiAgICogTkIhIFRoaXMgbWV0aG9kIG1pZ2h0IGJlIGRlc3RydWN0aXZlIC0gaWYgRVhQVU5HRSBpcyB1c2VkLCB0aGVuIGFueSBtZXNzYWdlc1xuICAgKiB3aXRoIFxcRGVsZXRlZCBmbGFnIHNldCBhcmUgZGVsZXRlZFxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBUaGUgcGF0aCBmb3IgdGhlIG1haWxib3ggd2hpY2ggc2hvdWxkIGJlIHNlbGVjdGVkIGZvciB0aGUgY29tbWFuZC4gU2VsZWN0cyBtYWlsYm94IGlmIG5lY2Vzc2FyeVxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2VxdWVuY2UgTWVzc2FnZSByYW5nZSB0byBiZSBkZWxldGVkXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gUXVlcnkgbW9kaWZpZXJzXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlXG4gICAqL1xuICBhc3luYyBkZWxldGVNZXNzYWdlcyAocGF0aCwgc2VxdWVuY2UsIG9wdGlvbnMgPSB7fSkge1xuICAgIC8vIGFkZCBcXERlbGV0ZWQgZmxhZyB0byB0aGUgbWVzc2FnZXMgYW5kIHJ1biBFWFBVTkdFIG9yIFVJRCBFWFBVTkdFXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0RlbGV0aW5nIG1lc3NhZ2VzJywgc2VxdWVuY2UsICdpbicsIHBhdGgsICcuLi4nKVxuICAgIGNvbnN0IHVzZVVpZFBsdXMgPSBvcHRpb25zLmJ5VWlkICYmIHRoaXMuX2NhcGFiaWxpdHkuaW5kZXhPZignVUlEUExVUycpID49IDBcbiAgICBjb25zdCB1aWRFeHB1bmdlQ29tbWFuZCA9IHsgY29tbWFuZDogJ1VJRCBFWFBVTkdFJywgYXR0cmlidXRlczogW3sgdHlwZTogJ3NlcXVlbmNlJywgdmFsdWU6IHNlcXVlbmNlIH1dIH1cbiAgICBhd2FpdCB0aGlzLnNldEZsYWdzKHBhdGgsIHNlcXVlbmNlLCB7IGFkZDogJ1xcXFxEZWxldGVkJyB9LCBvcHRpb25zKVxuICAgIGNvbnN0IGNtZCA9IHVzZVVpZFBsdXMgPyB1aWRFeHB1bmdlQ29tbWFuZCA6ICdFWFBVTkdFJ1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBkZWxSZXNwb25zZSA9IHRoaXMuZXhlYyhjbWQsIG51bGwsIHtcbiAgICAgICAgcHJlY2hlY2s6IChjdHgpID0+IHRoaXMuX3Nob3VsZFNlbGVjdE1haWxib3gocGF0aCwgY3R4KSA/IHRoaXMuc2VsZWN0TWFpbGJveChwYXRoLCB7IGN0eCB9KSA6IFByb21pc2UucmVzb2x2ZSgpXG4gICAgICB9KVxuICAgICAgcmV0dXJuIGRlbFJlc3BvbnNlXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLl9vbkVycm9yKGVycilcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ29waWVzIGEgcmFuZ2Ugb2YgbWVzc2FnZXMgZnJvbSB0aGUgYWN0aXZlIG1haWxib3ggdG8gdGhlIGRlc3RpbmF0aW9uIG1haWxib3guXG4gICAqIFNpbGVudCBtZXRob2QgKHVubGVzcyBhbiBlcnJvciBvY2N1cnMpLCBieSBkZWZhdWx0IHJldHVybnMgbm8gaW5mb3JtYXRpb24uXG4gICAqXG4gICAqIENPUFkgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi40LjdcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggVGhlIHBhdGggZm9yIHRoZSBtYWlsYm94IHdoaWNoIHNob3VsZCBiZSBzZWxlY3RlZCBmb3IgdGhlIGNvbW1hbmQuIFNlbGVjdHMgbWFpbGJveCBpZiBuZWNlc3NhcnlcbiAgICogQHBhcmFtIHtTdHJpbmd9IHNlcXVlbmNlIE1lc3NhZ2UgcmFuZ2UgdG8gYmUgY29waWVkXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBkZXN0aW5hdGlvbiBEZXN0aW5hdGlvbiBtYWlsYm94IHBhdGhcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBRdWVyeSBtb2RpZmllcnNcbiAgICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5ieVVpZF0gSWYgdHJ1ZSwgdXNlcyBVSUQgQ09QWSBpbnN0ZWFkIG9mIENPUFlcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2VcbiAgICovXG4gIGFzeW5jIGNvcHlNZXNzYWdlcyAocGF0aCwgc2VxdWVuY2UsIGRlc3RpbmF0aW9uLCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnQ29weWluZyBtZXNzYWdlcycsIHNlcXVlbmNlLCAnZnJvbScsIHBhdGgsICd0bycsIGRlc3RpbmF0aW9uLCAnLi4uJylcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBodW1hblJlYWRhYmxlIH0gPSBhd2FpdCB0aGlzLmV4ZWMoe1xuICAgICAgICBjb21tYW5kOiBvcHRpb25zLmJ5VWlkID8gJ1VJRCBDT1BZJyA6ICdDT1BZJyxcbiAgICAgICAgYXR0cmlidXRlczogW1xuICAgICAgICAgIHsgdHlwZTogJ3NlcXVlbmNlJywgdmFsdWU6IHNlcXVlbmNlIH0sXG4gICAgICAgICAgeyB0eXBlOiAnYXRvbScsIHZhbHVlOiBkZXN0aW5hdGlvbiB9XG4gICAgICAgIF1cbiAgICAgIH0sIG51bGwsIHtcbiAgICAgICAgcHJlY2hlY2s6IChjdHgpID0+IHRoaXMuX3Nob3VsZFNlbGVjdE1haWxib3gocGF0aCwgY3R4KSA/IHRoaXMuc2VsZWN0TWFpbGJveChwYXRoLCB7IGN0eCB9KSA6IFByb21pc2UucmVzb2x2ZSgpXG4gICAgICB9KVxuICAgICAgcmV0dXJuIGh1bWFuUmVhZGFibGUgfHwgJ0NPUFkgY29tcGxldGVkJ1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5fb25FcnJvcihlcnIpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE1vdmVzIGEgcmFuZ2Ugb2YgbWVzc2FnZXMgZnJvbSB0aGUgYWN0aXZlIG1haWxib3ggdG8gdGhlIGRlc3RpbmF0aW9uIG1haWxib3guXG4gICAqIFByZWZlcnMgdGhlIE1PVkUgZXh0ZW5zaW9uIGJ1dCBpZiBub3QgYXZhaWxhYmxlLCBmYWxscyBiYWNrIHRvXG4gICAqIENPUFkgKyBFWFBVTkdFXG4gICAqXG4gICAqIE1PVkUgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2ODUxXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBwYXRoIGZvciB0aGUgbWFpbGJveCB3aGljaCBzaG91bGQgYmUgc2VsZWN0ZWQgZm9yIHRoZSBjb21tYW5kLiBTZWxlY3RzIG1haWxib3ggaWYgbmVjZXNzYXJ5XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzZXF1ZW5jZSBNZXNzYWdlIHJhbmdlIHRvIGJlIG1vdmVkXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBkZXN0aW5hdGlvbiBEZXN0aW5hdGlvbiBtYWlsYm94IHBhdGhcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBRdWVyeSBtb2RpZmllcnNcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2VcbiAgICovXG4gIGFzeW5jIG1vdmVNZXNzYWdlcyAocGF0aCwgc2VxdWVuY2UsIGRlc3RpbmF0aW9uLCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnTW92aW5nIG1lc3NhZ2VzJywgc2VxdWVuY2UsICdmcm9tJywgcGF0aCwgJ3RvJywgZGVzdGluYXRpb24sICcuLi4nKVxuXG4gICAgaWYgKHRoaXMuX2NhcGFiaWxpdHkuaW5kZXhPZignTU9WRScpID09PSAtMSkge1xuICAgICAgLy8gRmFsbGJhY2sgdG8gQ09QWSArIEVYUFVOR0VcbiAgICAgIGF3YWl0IHRoaXMuY29weU1lc3NhZ2VzKHBhdGgsIHNlcXVlbmNlLCBkZXN0aW5hdGlvbiwgb3B0aW9ucylcbiAgICAgIHJldHVybiB0aGlzLmRlbGV0ZU1lc3NhZ2VzKHBhdGgsIHNlcXVlbmNlLCBvcHRpb25zKVxuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICAvLyBJZiBwb3NzaWJsZSwgdXNlIE1PVkVcbiAgICAgIGNvbnN0IG1vdmVSZXNwb25zZSA9IHRoaXMuZXhlYyh7XG4gICAgICAgIGNvbW1hbmQ6IG9wdGlvbnMuYnlVaWQgPyAnVUlEIE1PVkUnIDogJ01PVkUnLFxuICAgICAgICBhdHRyaWJ1dGVzOiBbXG4gICAgICAgICAgeyB0eXBlOiAnc2VxdWVuY2UnLCB2YWx1ZTogc2VxdWVuY2UgfSxcbiAgICAgICAgICB7IHR5cGU6ICdhdG9tJywgdmFsdWU6IGRlc3RpbmF0aW9uIH1cbiAgICAgICAgXVxuICAgICAgfSwgWydPSyddLCB7XG4gICAgICAgIHByZWNoZWNrOiAoY3R4KSA9PiB0aGlzLl9zaG91bGRTZWxlY3RNYWlsYm94KHBhdGgsIGN0eCkgPyB0aGlzLnNlbGVjdE1haWxib3gocGF0aCwgeyBjdHggfSkgOiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgfSlcbiAgICAgIHJldHVybiBtb3ZlUmVzcG9uc2VcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuX29uRXJyb3IoZXJyKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIENPTVBSRVNTIGNvbW1hbmRcbiAgICpcbiAgICogQ09NUFJFU1MgZGV0YWlsczpcbiAgICogICBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNDk3OFxuICAgKi9cbiAgYXN5bmMgY29tcHJlc3NDb25uZWN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuX2VuYWJsZUNvbXByZXNzaW9uIHx8IHRoaXMuX2NhcGFiaWxpdHkuaW5kZXhPZignQ09NUFJFU1M9REVGTEFURScpIDwgMCB8fCB0aGlzLmNsaWVudC5jb21wcmVzc2VkKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnRW5hYmxpbmcgY29tcHJlc3Npb24uLi4nKVxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLmV4ZWMoe1xuICAgICAgICBjb21tYW5kOiAnQ09NUFJFU1MnLFxuICAgICAgICBhdHRyaWJ1dGVzOiBbe1xuICAgICAgICAgIHR5cGU6ICdBVE9NJyxcbiAgICAgICAgICB2YWx1ZTogJ0RFRkxBVEUnXG4gICAgICAgIH1dXG4gICAgICB9KVxuICAgICAgdGhpcy5jbGllbnQuZW5hYmxlQ29tcHJlc3Npb24oKVxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ0NvbXByZXNzaW9uIGVuYWJsZWQsIGFsbCBkYXRhIHNlbnQgYW5kIHJlY2VpdmVkIGlzIGRlZmxhdGVkIScpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLl9vbkVycm9yKGVycilcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUnVucyBMT0dJTiBvciBBVVRIRU5USUNBVEUgWE9BVVRIMiBjb21tYW5kXG4gICAqXG4gICAqIExPR0lOIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuMi4zXG4gICAqIFhPQVVUSDIgZGV0YWlsczpcbiAgICogICBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS9nbWFpbC94b2F1dGgyX3Byb3RvY29sI2ltYXBfcHJvdG9jb2xfZXhjaGFuZ2VcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IGF1dGgudXNlclxuICAgKiBAcGFyYW0ge1N0cmluZ30gYXV0aC5wYXNzXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBhdXRoLnhvYXV0aDJcbiAgICovXG4gIGFzeW5jIGxvZ2luIChhdXRoKSB7XG4gICAgbGV0IGNvbW1hbmRcbiAgICBsZXQgb3B0aW9ucyA9IHt9XG5cbiAgICBpZiAoIWF1dGgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQXV0aGVudGljYXRpb24gaW5mb3JtYXRpb24gbm90IHByb3ZpZGVkJylcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fY2FwYWJpbGl0eS5pbmRleE9mKCdBVVRIPVhPQVVUSDInKSA+PSAwICYmIGF1dGggJiYgYXV0aC54b2F1dGgyKSB7XG4gICAgICBjb21tYW5kID0ge1xuICAgICAgICBjb21tYW5kOiAnQVVUSEVOVElDQVRFJyxcbiAgICAgICAgYXR0cmlidXRlczogW1xuICAgICAgICAgIHsgdHlwZTogJ0FUT00nLCB2YWx1ZTogJ1hPQVVUSDInIH0sXG4gICAgICAgICAgeyB0eXBlOiAnQVRPTScsIHZhbHVlOiBidWlsZFhPQXV0aDJUb2tlbihhdXRoLnVzZXIsIGF1dGgueG9hdXRoMiksIHNlbnNpdGl2ZTogdHJ1ZSB9XG4gICAgICAgIF1cbiAgICAgIH1cblxuICAgICAgb3B0aW9ucy5lcnJvclJlc3BvbnNlRXhwZWN0c0VtcHR5TGluZSA9IHRydWUgLy8gKyB0YWdnZWQgZXJyb3IgcmVzcG9uc2UgZXhwZWN0cyBhbiBlbXB0eSBsaW5lIGluIHJldHVyblxuICAgIH0gZWxzZSB7XG4gICAgICBjb21tYW5kID0ge1xuICAgICAgICBjb21tYW5kOiAnbG9naW4nLFxuICAgICAgICBhdHRyaWJ1dGVzOiBbXG4gICAgICAgICAgeyB0eXBlOiAnU1RSSU5HJywgdmFsdWU6IGF1dGgudXNlciB8fCAnJyB9LFxuICAgICAgICAgIHsgdHlwZTogJ1NUUklORycsIHZhbHVlOiBhdXRoLnBhc3MgfHwgJycsIHNlbnNpdGl2ZTogdHJ1ZSB9XG4gICAgICAgIF1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnTG9nZ2luZyBpbi4uLicpXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5leGVjKGNvbW1hbmQsICdjYXBhYmlsaXR5Jywgb3B0aW9ucylcbiAgICAgIC8qXG4gICAgICAgKiB1cGRhdGUgcG9zdC1hdXRoIGNhcGFiaWxpdGVzXG4gICAgICAgKiBjYXBhYmlsaXR5IGxpc3Qgc2hvdWxkbid0IGNvbnRhaW4gYXV0aCByZWxhdGVkIHN0dWZmIGFueW1vcmVcbiAgICAgICAqIGJ1dCBzb21lIG5ldyBleHRlbnNpb25zIG1pZ2h0IGhhdmUgcG9wcGVkIHVwIHRoYXQgZG8gbm90XG4gICAgICAgKiBtYWtlIG11Y2ggc2Vuc2UgaW4gdGhlIG5vbi1hdXRoIHN0YXRlXG4gICAgICAgKi9cbiAgICAgIGlmIChyZXNwb25zZS5jYXBhYmlsaXR5ICYmIHJlc3BvbnNlLmNhcGFiaWxpdHkubGVuZ3RoKSB7XG4gICAgICAgIC8vIGNhcGFiaWxpdGVzIHdlcmUgbGlzdGVkIHdpdGggdGhlIE9LIFtDQVBBQklMSVRZIC4uLl0gcmVzcG9uc2VcbiAgICAgICAgdGhpcy5fY2FwYWJpbGl0eSA9IHJlc3BvbnNlLmNhcGFiaWxpdHlcbiAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UucGF5bG9hZCAmJiByZXNwb25zZS5wYXlsb2FkLkNBUEFCSUxJVFkgJiYgcmVzcG9uc2UucGF5bG9hZC5DQVBBQklMSVRZLmxlbmd0aCkge1xuICAgICAgICAvLyBjYXBhYmlsaXRlcyB3ZXJlIGxpc3RlZCB3aXRoICogQ0FQQUJJTElUWSAuLi4gcmVzcG9uc2VcbiAgICAgICAgdGhpcy5fY2FwYWJpbGl0eSA9IHJlc3BvbnNlLnBheWxvYWQuQ0FQQUJJTElUWS5wb3AoKS5hdHRyaWJ1dGVzLm1hcCgoY2FwYSA9ICcnKSA9PiBjYXBhLnZhbHVlLnRvVXBwZXJDYXNlKCkudHJpbSgpKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gY2FwYWJpbGl0aWVzIHdlcmUgbm90IGF1dG9tYXRpY2FsbHkgbGlzdGVkLCByZWxvYWRcbiAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVDYXBhYmlsaXR5KHRydWUpXG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2NoYW5nZVN0YXRlKFNUQVRFX0FVVEhFTlRJQ0FURUQpXG4gICAgICB0aGlzLl9hdXRoZW50aWNhdGVkID0gdHJ1ZVxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ0xvZ2luIHN1Y2Nlc3NmdWwsIHBvc3QtYXV0aCBjYXBhYmlsaXRlcyB1cGRhdGVkIScsIHRoaXMuX2NhcGFiaWxpdHkpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLl9vbkVycm9yKGVycilcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUnVuIGFuIElNQVAgY29tbWFuZC5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHJlcXVlc3QgU3RydWN0dXJlZCByZXF1ZXN0IG9iamVjdFxuICAgKiBAcGFyYW0ge0FycmF5fSBhY2NlcHRVbnRhZ2dlZCBhIGxpc3Qgb2YgdW50YWdnZWQgcmVzcG9uc2VzIHRoYXQgd2lsbCBiZSBpbmNsdWRlZCBpbiAncGF5bG9hZCcgcHJvcGVydHlcbiAgICovXG4gIGFzeW5jIGV4ZWMgKHJlcXVlc3QsIGFjY2VwdFVudGFnZ2VkLCBvcHRpb25zKSB7XG4gICAgdGhpcy5icmVha0lkbGUoKVxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5jbGllbnQuZW5xdWV1ZUNvbW1hbmQocmVxdWVzdCwgYWNjZXB0VW50YWdnZWQsIG9wdGlvbnMpXG4gICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmNhcGFiaWxpdHkpIHtcbiAgICAgIHRoaXMuX2NhcGFiaWxpdHkgPSByZXNwb25zZS5jYXBhYmlsaXR5XG4gICAgfVxuICAgIHJldHVybiByZXNwb25zZVxuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBjb25uZWN0aW9uIGlzIGlkbGluZy4gU2VuZHMgYSBOT09QIG9yIElETEUgY29tbWFuZFxuICAgKlxuICAgKiBJRExFIGRldGFpbHM6XG4gICAqICAgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzIxNzdcbiAgICovXG4gIGFzeW5jIGVudGVySWRsZSAoKSB7XG4gICAgaWYgKHRoaXMuX2VudGVyZWRJZGxlKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgdGhpcy5fZW50ZXJlZElkbGUgPSB0aGlzLl9jYXBhYmlsaXR5LmluZGV4T2YoJ0lETEUnKSA+PSAwID8gJ0lETEUnIDogJ05PT1AnXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0VudGVyaW5nIGlkbGUgd2l0aCAnICsgdGhpcy5fZW50ZXJlZElkbGUpXG5cbiAgICBpZiAodGhpcy5fZW50ZXJlZElkbGUgPT09ICdOT09QJykge1xuICAgICAgdGhpcy5faWRsZVRpbWVvdXQgPSBzZXRUaW1lb3V0KGFzeW5jICgpID0+IHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ1NlbmRpbmcgTk9PUCcpXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5leGVjKCdOT09QJylcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgdGhpcy5fb25FcnJvcihlcnIpXG4gICAgICAgIH1cbiAgICAgIH0sIHRoaXMudGltZW91dE5vb3ApXG4gICAgfSBlbHNlIGlmICh0aGlzLl9lbnRlcmVkSWRsZSA9PT0gJ0lETEUnKSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCB0aGlzLmNsaWVudC5lbnF1ZXVlQ29tbWFuZCh7XG4gICAgICAgICAgY29tbWFuZDogJ0lETEUnXG4gICAgICAgIH0pXG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgdGhpcy5fb25FcnJvcihlcnIpXG4gICAgICB9XG4gICAgICB0aGlzLl9pZGxlVGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHRoaXMuY2xpZW50LnNlbmQoJ0RPTkVcXHJcXG4nKVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICB0aGlzLl9vbkVycm9yKGVycilcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9lbnRlcmVkSWRsZSA9IGZhbHNlXG4gICAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdJZGxlIHRlcm1pbmF0ZWQnKVxuICAgICAgfSwgdGhpcy50aW1lb3V0SWRsZSlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU3RvcHMgYWN0aW9ucyByZWxhdGVkIGlkbGluZywgaWYgSURMRSBpcyBzdXBwb3J0ZWQsIHNlbmRzIERPTkUgdG8gc3RvcCBpdFxuICAgKi9cbiAgYnJlYWtJZGxlICgpIHtcbiAgICBpZiAoIXRoaXMuX2VudGVyZWRJZGxlKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjbGVhclRpbWVvdXQodGhpcy5faWRsZVRpbWVvdXQpXG4gICAgaWYgKHRoaXMuX2VudGVyZWRJZGxlID09PSAnSURMRScpIHtcbiAgICAgIHRoaXMuY2xpZW50LnNlbmQoJ0RPTkVcXHJcXG4nKVxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ0lkbGUgdGVybWluYXRlZCcpXG4gICAgfVxuICAgIHRoaXMuX2VudGVyZWRJZGxlID0gZmFsc2VcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIFNUQVJUVExTIGNvbW1hbmQgaWYgbmVlZGVkXG4gICAqXG4gICAqIFNUQVJUVExTIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuMi4xXG4gICAqXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW2ZvcmNlZF0gQnkgZGVmYXVsdCB0aGUgY29tbWFuZCBpcyBub3QgcnVuIGlmIGNhcGFiaWxpdHkgaXMgYWxyZWFkeSBsaXN0ZWQuIFNldCB0byB0cnVlIHRvIHNraXAgdGhpcyB2YWxpZGF0aW9uXG4gICAqL1xuICBhc3luYyB1cGdyYWRlQ29ubmVjdGlvbiAoKSB7XG4gICAgLy8gc2tpcCByZXF1ZXN0LCBpZiBhbHJlYWR5IHNlY3VyZWRcbiAgICBpZiAodGhpcy5jbGllbnQuc2VjdXJlTW9kZSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgLy8gc2tpcCBpZiBTVEFSVFRMUyBub3QgYXZhaWxhYmxlIG9yIHN0YXJ0dGxzIHN1cHBvcnQgZGlzYWJsZWRcbiAgICBpZiAoKHRoaXMuX2NhcGFiaWxpdHkuaW5kZXhPZignU1RBUlRUTFMnKSA8IDAgfHwgdGhpcy5faWdub3JlVExTKSAmJiAhdGhpcy5fcmVxdWlyZVRMUykge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0VuY3J5cHRpbmcgY29ubmVjdGlvbi4uLicpXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuZXhlYygnU1RBUlRUTFMnKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5fb25FcnJvcihlcnIpXG4gICAgfVxuICAgIHRoaXMuX2NhcGFiaWxpdHkgPSBbXVxuICAgIHRoaXMuY2xpZW50LnVwZ3JhZGUoKVxuICAgIHJldHVybiB0aGlzLnVwZGF0ZUNhcGFiaWxpdHkoKVxuICB9XG5cbiAgLyoqXG4gICAqIFJ1bnMgQ0FQQUJJTElUWSBjb21tYW5kXG4gICAqXG4gICAqIENBUEFCSUxJVFkgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi4xLjFcbiAgICpcbiAgICogRG9lc24ndCByZWdpc3RlciB1bnRhZ2dlZCBDQVBBQklMSVRZIGhhbmRsZXIgYXMgdGhpcyBpcyBhbHJlYWR5XG4gICAqIGhhbmRsZWQgYnkgZ2xvYmFsIGhhbmRsZXJcbiAgICpcbiAgICogQHBhcmFtIHtCb29sZWFufSBbZm9yY2VkXSBCeSBkZWZhdWx0IHRoZSBjb21tYW5kIGlzIG5vdCBydW4gaWYgY2FwYWJpbGl0eSBpcyBhbHJlYWR5IGxpc3RlZC4gU2V0IHRvIHRydWUgdG8gc2tpcCB0aGlzIHZhbGlkYXRpb25cbiAgICovXG4gIGFzeW5jIHVwZGF0ZUNhcGFiaWxpdHkgKGZvcmNlZCkge1xuICAgIC8vIHNraXAgcmVxdWVzdCwgaWYgbm90IGZvcmNlZCB1cGRhdGUgYW5kIGNhcGFiaWxpdGllcyBhcmUgYWxyZWFkeSBsb2FkZWRcbiAgICBpZiAoIWZvcmNlZCAmJiB0aGlzLl9jYXBhYmlsaXR5Lmxlbmd0aCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gSWYgU1RBUlRUTFMgaXMgcmVxdWlyZWQgdGhlbiBza2lwIGNhcGFiaWxpdHkgbGlzdGluZyBhcyB3ZSBhcmUgZ29pbmcgdG8gdHJ5XG4gICAgLy8gU1RBUlRUTFMgYW55d2F5IGFuZCB3ZSByZS1jaGVjayBjYXBhYmlsaXRpZXMgYWZ0ZXIgY29ubmVjdGlvbiBpcyBzZWN1cmVkXG4gICAgaWYgKCF0aGlzLmNsaWVudC5zZWN1cmVNb2RlICYmIHRoaXMuX3JlcXVpcmVUTFMpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdVcGRhdGluZyBjYXBhYmlsaXR5Li4uJylcbiAgICB0cnkge1xuICAgICAgY29uc3QgY2FwUmVzcG9uc2UgPSB0aGlzLmV4ZWMoJ0NBUEFCSUxJVFknKVxuICAgICAgcmV0dXJuIGNhcFJlc3BvbnNlXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLl9vbkVycm9yKGVycilcbiAgICB9XG4gIH1cblxuICBoYXNDYXBhYmlsaXR5IChjYXBhID0gJycpIHtcbiAgICByZXR1cm4gdGhpcy5fY2FwYWJpbGl0eS5pbmRleE9mKGNhcGEudG9VcHBlckNhc2UoKS50cmltKCkpID49IDBcbiAgfVxuXG4gIC8vIERlZmF1bHQgaGFuZGxlcnMgZm9yIHVudGFnZ2VkIHJlc3BvbnNlc1xuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgYW4gdW50YWdnZWQgT0sgaW5jbHVkZXMgW0NBUEFCSUxJVFldIHRhZyBhbmQgdXBkYXRlcyBjYXBhYmlsaXR5IG9iamVjdFxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgUGFyc2VkIHNlcnZlciByZXNwb25zZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBuZXh0IFVudGlsIGNhbGxlZCwgc2VydmVyIHJlc3BvbnNlcyBhcmUgbm90IHByb2Nlc3NlZFxuICAgKi9cbiAgX3VudGFnZ2VkT2tIYW5kbGVyIChyZXNwb25zZSkge1xuICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5jYXBhYmlsaXR5KSB7XG4gICAgICB0aGlzLl9jYXBhYmlsaXR5ID0gcmVzcG9uc2UuY2FwYWJpbGl0eVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIGNhcGFiaWxpdHkgb2JqZWN0XG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSBQYXJzZWQgc2VydmVyIHJlc3BvbnNlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG5leHQgVW50aWwgY2FsbGVkLCBzZXJ2ZXIgcmVzcG9uc2VzIGFyZSBub3QgcHJvY2Vzc2VkXG4gICAqL1xuICBfdW50YWdnZWRDYXBhYmlsaXR5SGFuZGxlciAocmVzcG9uc2UpIHtcbiAgICB0aGlzLl9jYXBhYmlsaXR5ID0gcGlwZShcbiAgICAgIHByb3BPcihbXSwgJ2F0dHJpYnV0ZXMnKSxcbiAgICAgIG1hcCgoeyB2YWx1ZSB9KSA9PiAodmFsdWUgfHwgJycpLnRvVXBwZXJDYXNlKCkudHJpbSgpKVxuICAgICkocmVzcG9uc2UpXG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyBleGlzdGluZyBtZXNzYWdlIGNvdW50XG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSBQYXJzZWQgc2VydmVyIHJlc3BvbnNlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG5leHQgVW50aWwgY2FsbGVkLCBzZXJ2ZXIgcmVzcG9uc2VzIGFyZSBub3QgcHJvY2Vzc2VkXG4gICAqL1xuICBfdW50YWdnZWRFeGlzdHNIYW5kbGVyIChyZXNwb25zZSkge1xuICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5oYXNPd25Qcm9wZXJ0eSgnbnInKSkge1xuICAgICAgdGhpcy5vbnVwZGF0ZSAmJiB0aGlzLm9udXBkYXRlKHRoaXMuX3NlbGVjdGVkTWFpbGJveCwgJ2V4aXN0cycsIHJlc3BvbnNlLm5yKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgYSBtZXNzYWdlIGhhcyBiZWVuIGRlbGV0ZWRcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIFBhcnNlZCBzZXJ2ZXIgcmVzcG9uc2VcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gbmV4dCBVbnRpbCBjYWxsZWQsIHNlcnZlciByZXNwb25zZXMgYXJlIG5vdCBwcm9jZXNzZWRcbiAgICovXG4gIF91bnRhZ2dlZEV4cHVuZ2VIYW5kbGVyIChyZXNwb25zZSkge1xuICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5oYXNPd25Qcm9wZXJ0eSgnbnInKSkge1xuICAgICAgdGhpcy5vbnVwZGF0ZSAmJiB0aGlzLm9udXBkYXRlKHRoaXMuX3NlbGVjdGVkTWFpbGJveCwgJ2V4cHVuZ2UnLCByZXNwb25zZS5ucilcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSW5kaWNhdGVzIHRoYXQgZmxhZ3MgaGF2ZSBiZWVuIHVwZGF0ZWQgZm9yIGEgbWVzc2FnZVxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgUGFyc2VkIHNlcnZlciByZXNwb25zZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBuZXh0IFVudGlsIGNhbGxlZCwgc2VydmVyIHJlc3BvbnNlcyBhcmUgbm90IHByb2Nlc3NlZFxuICAgKi9cbiAgX3VudGFnZ2VkRmV0Y2hIYW5kbGVyIChyZXNwb25zZSkge1xuICAgIHRoaXMub251cGRhdGUgJiYgdGhpcy5vbnVwZGF0ZSh0aGlzLl9zZWxlY3RlZE1haWxib3gsICdmZXRjaCcsIFtdLmNvbmNhdChwYXJzZUZFVENIKHsgcGF5bG9hZDogeyBGRVRDSDogW3Jlc3BvbnNlXSB9IH0pIHx8IFtdKS5zaGlmdCgpKVxuICB9XG5cbiAgLy8gUHJpdmF0ZSBoZWxwZXJzXG5cbiAgLyoqXG4gICAqIEluZGljYXRlcyB0aGF0IHRoZSBjb25uZWN0aW9uIHN0YXJ0ZWQgaWRsaW5nLiBJbml0aWF0ZXMgYSBjeWNsZVxuICAgKiBvZiBOT09QcyBvciBJRExFcyB0byByZWNlaXZlIG5vdGlmaWNhdGlvbnMgYWJvdXQgdXBkYXRlcyBpbiB0aGUgc2VydmVyXG4gICAqL1xuICBfb25JZGxlICgpIHtcbiAgICBpZiAoIXRoaXMuX2F1dGhlbnRpY2F0ZWQgfHwgdGhpcy5fZW50ZXJlZElkbGUpIHtcbiAgICAgIC8vIE5vIG5lZWQgdG8gSURMRSB3aGVuIG5vdCBsb2dnZWQgaW4gb3IgYWxyZWFkeSBpZGxpbmdcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdDbGllbnQgc3RhcnRlZCBpZGxpbmcnKVxuICAgIHRoaXMuZW50ZXJJZGxlKClcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHRoZSBJTUFQIHN0YXRlIHZhbHVlIGZvciB0aGUgY3VycmVudCBjb25uZWN0aW9uXG4gICAqXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBuZXdTdGF0ZSBUaGUgc3RhdGUgeW91IHdhbnQgdG8gY2hhbmdlIHRvXG4gICAqL1xuICBfY2hhbmdlU3RhdGUgKG5ld1N0YXRlKSB7XG4gICAgaWYgKG5ld1N0YXRlID09PSB0aGlzLl9zdGF0ZSkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0VudGVyaW5nIHN0YXRlOiAnICsgbmV3U3RhdGUpXG5cbiAgICAvLyBpZiBhIG1haWxib3ggd2FzIG9wZW5lZCwgZW1pdCBvbmNsb3NlbWFpbGJveCBhbmQgY2xlYXIgc2VsZWN0ZWRNYWlsYm94IHZhbHVlXG4gICAgaWYgKHRoaXMuX3N0YXRlID09PSBTVEFURV9TRUxFQ1RFRCAmJiB0aGlzLl9zZWxlY3RlZE1haWxib3gpIHtcbiAgICAgIHRoaXMub25jbG9zZW1haWxib3ggJiYgdGhpcy5vbmNsb3NlbWFpbGJveCh0aGlzLl9zZWxlY3RlZE1haWxib3gpXG4gICAgICB0aGlzLl9zZWxlY3RlZE1haWxib3ggPSBmYWxzZVxuICAgIH1cblxuICAgIHRoaXMuX3N0YXRlID0gbmV3U3RhdGVcbiAgfVxuXG4gIC8qKlxuICAgKiBFbnN1cmVzIGEgcGF0aCBleGlzdHMgaW4gdGhlIE1haWxib3ggdHJlZVxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gdHJlZSBNYWlsYm94IHRyZWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICogQHBhcmFtIHtTdHJpbmd9IGRlbGltaXRlclxuICAgKiBAcmV0dXJuIHtPYmplY3R9IGJyYW5jaCBmb3IgdXNlZCBwYXRoXG4gICAqL1xuICBfZW5zdXJlUGF0aCAodHJlZSwgcGF0aCwgZGVsaW1pdGVyKSB7XG4gICAgY29uc3QgbmFtZXMgPSBwYXRoLnNwbGl0KGRlbGltaXRlcilcbiAgICBsZXQgYnJhbmNoID0gdHJlZVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgbGV0IGZvdW5kID0gZmFsc2VcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgYnJhbmNoLmNoaWxkcmVuLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmICh0aGlzLl9jb21wYXJlTWFpbGJveE5hbWVzKGJyYW5jaC5jaGlsZHJlbltqXS5uYW1lLCBpbWFwRGVjb2RlKG5hbWVzW2ldKSkpIHtcbiAgICAgICAgICBicmFuY2ggPSBicmFuY2guY2hpbGRyZW5bal1cbiAgICAgICAgICBmb3VuZCA9IHRydWVcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgIGJyYW5jaC5jaGlsZHJlbi5wdXNoKHtcbiAgICAgICAgICBuYW1lOiBpbWFwRGVjb2RlKG5hbWVzW2ldKSxcbiAgICAgICAgICBkZWxpbWl0ZXI6IGRlbGltaXRlcixcbiAgICAgICAgICBwYXRoOiBuYW1lcy5zbGljZSgwLCBpICsgMSkuam9pbihkZWxpbWl0ZXIpLFxuICAgICAgICAgIGNoaWxkcmVuOiBbXVxuICAgICAgICB9KVxuICAgICAgICBicmFuY2ggPSBicmFuY2guY2hpbGRyZW5bYnJhbmNoLmNoaWxkcmVuLmxlbmd0aCAtIDFdXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBicmFuY2hcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21wYXJlcyB0d28gbWFpbGJveCBuYW1lcy4gQ2FzZSBpbnNlbnNpdGl2ZSBpbiBjYXNlIG9mIElOQk9YLCBvdGhlcndpc2UgY2FzZSBzZW5zaXRpdmVcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IGEgTWFpbGJveCBuYW1lXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBiIE1haWxib3ggbmFtZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgZm9sZGVyIG5hbWVzIG1hdGNoXG4gICAqL1xuICBfY29tcGFyZU1haWxib3hOYW1lcyAoYSwgYikge1xuICAgIHJldHVybiAoYS50b1VwcGVyQ2FzZSgpID09PSAnSU5CT1gnID8gJ0lOQk9YJyA6IGEpID09PSAoYi50b1VwcGVyQ2FzZSgpID09PSAnSU5CT1gnID8gJ0lOQk9YJyA6IGIpXG4gIH1cblxuICBjcmVhdGVMb2dnZXIgKGNyZWF0b3IgPSBjcmVhdGVEZWZhdWx0TG9nZ2VyKSB7XG4gICAgY29uc3QgbG9nZ2VyID0gY3JlYXRvcigodGhpcy5fYXV0aCB8fCB7fSkudXNlciB8fCAnJywgdGhpcy5faG9zdClcbiAgICB0aGlzLmxvZ2dlciA9IHRoaXMuY2xpZW50LmxvZ2dlciA9IHtcbiAgICAgIGRlYnVnOiAoLi4ubXNncykgPT4geyBpZiAoTE9HX0xFVkVMX0RFQlVHID49IHRoaXMubG9nTGV2ZWwpIHsgbG9nZ2VyLmRlYnVnKG1zZ3MpIH0gfSxcbiAgICAgIGluZm86ICguLi5tc2dzKSA9PiB7IGlmIChMT0dfTEVWRUxfSU5GTyA+PSB0aGlzLmxvZ0xldmVsKSB7IGxvZ2dlci5pbmZvKG1zZ3MpIH0gfSxcbiAgICAgIHdhcm46ICguLi5tc2dzKSA9PiB7IGlmIChMT0dfTEVWRUxfV0FSTiA+PSB0aGlzLmxvZ0xldmVsKSB7IGxvZ2dlci53YXJuKG1zZ3MpIH0gfSxcbiAgICAgIGVycm9yOiAoLi4ubXNncykgPT4geyBpZiAoTE9HX0xFVkVMX0VSUk9SID49IHRoaXMubG9nTGV2ZWwpIHsgbG9nZ2VyLmVycm9yKG1zZ3MpIH0gfVxuICAgIH1cbiAgfVxufVxuIl19