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
          _this18.client.send('DONE\r\n');

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jbGllbnQuanMiXSwibmFtZXMiOlsiVElNRU9VVF9DT05ORUNUSU9OIiwiVElNRU9VVF9OT09QIiwiVElNRU9VVF9JRExFIiwiU1RBVEVfQ09OTkVDVElORyIsIlNUQVRFX05PVF9BVVRIRU5USUNBVEVEIiwiU1RBVEVfQVVUSEVOVElDQVRFRCIsIlNUQVRFX1NFTEVDVEVEIiwiU1RBVEVfTE9HT1VUIiwiREVGQVVMVF9DTElFTlRfSUQiLCJuYW1lIiwiQ2xpZW50IiwiY29uc3RydWN0b3IiLCJob3N0IiwicG9ydCIsIm9wdGlvbnMiLCJfb25FcnJvciIsImJpbmQiLCJ0aW1lb3V0Q29ubmVjdGlvbiIsInRpbWVvdXROb29wIiwidGltZW91dElkbGUiLCJzZXJ2ZXJJZCIsIm9uY2VydCIsIm9udXBkYXRlIiwib25zZWxlY3RtYWlsYm94Iiwib25jbG9zZW1haWxib3giLCJfaG9zdCIsIl9jbGllbnRJZCIsIl9zdGF0ZSIsIl9hdXRoZW50aWNhdGVkIiwiX2NhcGFiaWxpdHkiLCJfc2VsZWN0ZWRNYWlsYm94IiwiX2VudGVyZWRJZGxlIiwiX2lkbGVUaW1lb3V0IiwiX2VuYWJsZUNvbXByZXNzaW9uIiwiZW5hYmxlQ29tcHJlc3Npb24iLCJfYXV0aCIsImF1dGgiLCJfcmVxdWlyZVRMUyIsInJlcXVpcmVUTFMiLCJfaWdub3JlVExTIiwiaWdub3JlVExTIiwiY2xpZW50IiwiSW1hcENsaWVudCIsIm9uZXJyb3IiLCJjZXJ0Iiwib25pZGxlIiwiX29uSWRsZSIsInNldEhhbmRsZXIiLCJyZXNwb25zZSIsIl91bnRhZ2dlZENhcGFiaWxpdHlIYW5kbGVyIiwiX3VudGFnZ2VkT2tIYW5kbGVyIiwiX3VudGFnZ2VkRXhpc3RzSGFuZGxlciIsIl91bnRhZ2dlZEV4cHVuZ2VIYW5kbGVyIiwiX3VudGFnZ2VkRmV0Y2hIYW5kbGVyIiwiY3JlYXRlTG9nZ2VyIiwibG9nTGV2ZWwiLCJMT0dfTEVWRUxfQUxMIiwiZXJyIiwiY2xlYXJUaW1lb3V0IiwiY29ubmVjdCIsIl9vcGVuQ29ubmVjdGlvbiIsIl9jaGFuZ2VTdGF0ZSIsInVwZGF0ZUNhcGFiaWxpdHkiLCJ1cGdyYWRlQ29ubmVjdGlvbiIsInVwZGF0ZUlkIiwibG9nZ2VyIiwid2FybiIsIm1lc3NhZ2UiLCJsb2dpbiIsImNvbXByZXNzQ29ubmVjdGlvbiIsImRlYnVnIiwiZXJyb3IiLCJjbG9zZSIsImNFcnIiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImNvbm5lY3Rpb25UaW1lb3V0Iiwic2V0VGltZW91dCIsIkVycm9yIiwidGhlbiIsIm9ucmVhZHkiLCJjYXRjaCIsImxvZ291dCIsImlkIiwiaW5kZXhPZiIsImNvbW1hbmQiLCJhdHRyaWJ1dGVzIiwiT2JqZWN0IiwiZW50cmllcyIsImV4ZWMiLCJsaXN0IiwibWFwIiwidmFsdWVzIiwia2V5cyIsImZpbHRlciIsIl8iLCJpIiwiX3Nob3VsZFNlbGVjdE1haWxib3giLCJwYXRoIiwiY3R4IiwicHJldmlvdXNTZWxlY3QiLCJnZXRQcmV2aW91c2x5UXVldWVkIiwicmVxdWVzdCIsInBhdGhBdHRyaWJ1dGUiLCJmaW5kIiwiYXR0cmlidXRlIiwidHlwZSIsInZhbHVlIiwic2VsZWN0TWFpbGJveCIsInF1ZXJ5IiwicmVhZE9ubHkiLCJjb25kc3RvcmUiLCJwdXNoIiwibWFpbGJveEluZm8iLCJsaXN0TmFtZXNwYWNlcyIsImxpc3RNYWlsYm94ZXMiLCJ0cmVlIiwicm9vdCIsImNoaWxkcmVuIiwibGlzdFJlc3BvbnNlIiwiZm9yRWFjaCIsIml0ZW0iLCJhdHRyIiwibGVuZ3RoIiwiZGVsaW0iLCJicmFuY2giLCJfZW5zdXJlUGF0aCIsImZsYWdzIiwibGlzdGVkIiwibHN1YlJlc3BvbnNlIiwibHN1YiIsImZsYWciLCJzdWJzY3JpYmVkIiwiY3JlYXRlTWFpbGJveCIsImNvZGUiLCJkZWxldGVNYWlsYm94IiwiZGVsUmVzcG9uc2UiLCJsaXN0TWVzc2FnZXMiLCJzZXF1ZW5jZSIsIml0ZW1zIiwiZmFzdCIsInByZWNoZWNrIiwic2VhcmNoIiwic2V0RmxhZ3MiLCJrZXkiLCJBcnJheSIsImlzQXJyYXkiLCJjb25jYXQiLCJhZGQiLCJzZXQiLCJyZW1vdmUiLCJzdG9yZSIsImFjdGlvbiIsInVwbG9hZCIsImRlc3RpbmF0aW9uIiwidXBsb2FkUmVzcG9uc2UiLCJkZWxldGVNZXNzYWdlcyIsInVzZVVpZFBsdXMiLCJieVVpZCIsInVpZEV4cHVuZ2VDb21tYW5kIiwiY21kIiwiY29weU1lc3NhZ2VzIiwiaHVtYW5SZWFkYWJsZSIsIm1vdmVNZXNzYWdlcyIsIm1vdmVSZXNwb25zZSIsImNvbXByZXNzZWQiLCJ4b2F1dGgyIiwidXNlciIsInNlbnNpdGl2ZSIsImVycm9yUmVzcG9uc2VFeHBlY3RzRW1wdHlMaW5lIiwicGFzcyIsImNhcGFiaWxpdHkiLCJwYXlsb2FkIiwiQ0FQQUJJTElUWSIsInBvcCIsImNhcGEiLCJ0b1VwcGVyQ2FzZSIsInRyaW0iLCJhY2NlcHRVbnRhZ2dlZCIsImJyZWFrSWRsZSIsImVucXVldWVDb21tYW5kIiwiZW50ZXJJZGxlIiwic2VuZCIsInNlY3VyZU1vZGUiLCJ1cGdyYWRlIiwiZm9yY2VkIiwiY2FwUmVzcG9uc2UiLCJoYXNDYXBhYmlsaXR5IiwiaGFzT3duUHJvcGVydHkiLCJuciIsIkZFVENIIiwic2hpZnQiLCJuZXdTdGF0ZSIsImRlbGltaXRlciIsIm5hbWVzIiwic3BsaXQiLCJmb3VuZCIsImoiLCJfY29tcGFyZU1haWxib3hOYW1lcyIsInNsaWNlIiwiam9pbiIsImEiLCJiIiwiY3JlYXRvciIsImNyZWF0ZURlZmF1bHRMb2dnZXIiLCJtc2dzIiwiTE9HX0xFVkVMX0RFQlVHIiwiaW5mbyIsIkxPR19MRVZFTF9JTkZPIiwiTE9HX0xFVkVMX1dBUk4iLCJMT0dfTEVWRUxfRVJST1IiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7QUFDQTs7QUFDQTs7QUFNQTs7QUFPQTs7QUFDQTs7QUFDQTs7QUFRQTs7Ozs7Ozs7QUFJTyxNQUFNQSxrQkFBa0IsR0FBRyxLQUFLLElBQWhDLEMsQ0FBcUM7OztBQUNy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LEtBQUs1SixRQUE1QixFQUFzQztBQUFFVSxVQUFBQSxNQUFNLENBQUNNLEtBQVAsQ0FBYXVJLElBQWI7QUFBb0I7QUFBRTtBQUpuRCxLQUFuQztBQU1EOztBQTU5QnlCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgbWFwLCBwaXBlLCB1bmlvbiwgemlwLCBmcm9tUGFpcnMsIHByb3BPciwgcGF0aE9yLCBmbGF0dGVuIH0gZnJvbSAncmFtZGEnXG5pbXBvcnQgeyBpbWFwRW5jb2RlLCBpbWFwRGVjb2RlIH0gZnJvbSAnZW1haWxqcy11dGY3J1xuaW1wb3J0IHtcbiAgcGFyc2VOQU1FU1BBQ0UsXG4gIHBhcnNlU0VMRUNULFxuICBwYXJzZUZFVENILFxuICBwYXJzZVNFQVJDSFxufSBmcm9tICcuL2NvbW1hbmQtcGFyc2VyJ1xuaW1wb3J0IHtcbiAgYnVpbGRGRVRDSENvbW1hbmQsXG4gIGJ1aWxkWE9BdXRoMlRva2VuLFxuICBidWlsZFNFQVJDSENvbW1hbmQsXG4gIGJ1aWxkU1RPUkVDb21tYW5kXG59IGZyb20gJy4vY29tbWFuZC1idWlsZGVyJ1xuXG5pbXBvcnQgY3JlYXRlRGVmYXVsdExvZ2dlciBmcm9tICcuL2xvZ2dlcidcbmltcG9ydCBJbWFwQ2xpZW50IGZyb20gJy4vaW1hcCdcbmltcG9ydCB7XG4gIExPR19MRVZFTF9FUlJPUixcbiAgTE9HX0xFVkVMX1dBUk4sXG4gIExPR19MRVZFTF9JTkZPLFxuICBMT0dfTEVWRUxfREVCVUcsXG4gIExPR19MRVZFTF9BTExcbn0gZnJvbSAnLi9jb21tb24nXG5cbmltcG9ydCB7XG4gIGNoZWNrU3BlY2lhbFVzZVxufSBmcm9tICcuL3NwZWNpYWwtdXNlJ1xuXG5leHBvcnQgY29uc3QgVElNRU9VVF9DT05ORUNUSU9OID0gOTAgKiAxMDAwIC8vIE1pbGxpc2Vjb25kcyB0byB3YWl0IGZvciB0aGUgSU1BUCBncmVldGluZyBmcm9tIHRoZSBzZXJ2ZXJcbmV4cG9ydCBjb25zdCBUSU1FT1VUX05PT1AgPSA2MCAqIDEwMDAgLy8gTWlsbGlzZWNvbmRzIGJldHdlZW4gTk9PUCBjb21tYW5kcyB3aGlsZSBpZGxpbmdcbmV4cG9ydCBjb25zdCBUSU1FT1VUX0lETEUgPSA2MCAqIDEwMDAgLy8gTWlsbGlzZWNvbmRzIHVudGlsIElETEUgY29tbWFuZCBpcyBjYW5jZWxsZWRcblxuZXhwb3J0IGNvbnN0IFNUQVRFX0NPTk5FQ1RJTkcgPSAxXG5leHBvcnQgY29uc3QgU1RBVEVfTk9UX0FVVEhFTlRJQ0FURUQgPSAyXG5leHBvcnQgY29uc3QgU1RBVEVfQVVUSEVOVElDQVRFRCA9IDNcbmV4cG9ydCBjb25zdCBTVEFURV9TRUxFQ1RFRCA9IDRcbmV4cG9ydCBjb25zdCBTVEFURV9MT0dPVVQgPSA1XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX0NMSUVOVF9JRCA9IHtcbiAgbmFtZTogJ2VtYWlsanMtaW1hcC1jbGllbnQnXG59XG5cbi8qKlxuICogZW1haWxqcyBJTUFQIGNsaWVudFxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBbaG9zdD0nbG9jYWxob3N0J10gSG9zdG5hbWUgdG8gY29uZW5jdCB0b1xuICogQHBhcmFtIHtOdW1iZXJ9IFtwb3J0PTE0M10gUG9ydCBudW1iZXIgdG8gY29ubmVjdCB0b1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBPcHRpb25hbCBvcHRpb25zIG9iamVjdFxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDbGllbnQge1xuICBjb25zdHJ1Y3RvciAoaG9zdCwgcG9ydCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5fb25FcnJvciA9IHRoaXMuX29uRXJyb3IuYmluZCh0aGlzKVxuICAgIHRoaXMudGltZW91dENvbm5lY3Rpb24gPSBUSU1FT1VUX0NPTk5FQ1RJT05cbiAgICB0aGlzLnRpbWVvdXROb29wID0gVElNRU9VVF9OT09QXG4gICAgdGhpcy50aW1lb3V0SWRsZSA9IFRJTUVPVVRfSURMRVxuXG4gICAgdGhpcy5zZXJ2ZXJJZCA9IGZhbHNlIC8vIFJGQyAyOTcxIFNlcnZlciBJRCBhcyBrZXkgdmFsdWUgcGFpcnNcblxuICAgIC8vIEV2ZW50IHBsYWNlaG9sZGVyc1xuICAgIHRoaXMub25jZXJ0ID0gbnVsbFxuICAgIHRoaXMub251cGRhdGUgPSBudWxsXG4gICAgdGhpcy5vbnNlbGVjdG1haWxib3ggPSBudWxsXG4gICAgdGhpcy5vbmNsb3NlbWFpbGJveCA9IG51bGxcblxuICAgIHRoaXMuX2hvc3QgPSBob3N0XG4gICAgdGhpcy5fY2xpZW50SWQgPSBwcm9wT3IoREVGQVVMVF9DTElFTlRfSUQsICdpZCcsIG9wdGlvbnMpXG4gICAgdGhpcy5fc3RhdGUgPSBmYWxzZSAvLyBDdXJyZW50IHN0YXRlXG4gICAgdGhpcy5fYXV0aGVudGljYXRlZCA9IGZhbHNlIC8vIElzIHRoZSBjb25uZWN0aW9uIGF1dGhlbnRpY2F0ZWRcbiAgICB0aGlzLl9jYXBhYmlsaXR5ID0gW10gLy8gTGlzdCBvZiBleHRlbnNpb25zIHRoZSBzZXJ2ZXIgc3VwcG9ydHNcbiAgICB0aGlzLl9zZWxlY3RlZE1haWxib3ggPSBmYWxzZSAvLyBTZWxlY3RlZCBtYWlsYm94XG4gICAgdGhpcy5fZW50ZXJlZElkbGUgPSBmYWxzZVxuICAgIHRoaXMuX2lkbGVUaW1lb3V0ID0gZmFsc2VcbiAgICB0aGlzLl9lbmFibGVDb21wcmVzc2lvbiA9ICEhb3B0aW9ucy5lbmFibGVDb21wcmVzc2lvblxuICAgIHRoaXMuX2F1dGggPSBvcHRpb25zLmF1dGhcbiAgICB0aGlzLl9yZXF1aXJlVExTID0gISFvcHRpb25zLnJlcXVpcmVUTFNcbiAgICB0aGlzLl9pZ25vcmVUTFMgPSAhIW9wdGlvbnMuaWdub3JlVExTXG5cbiAgICB0aGlzLmNsaWVudCA9IG5ldyBJbWFwQ2xpZW50KGhvc3QsIHBvcnQsIG9wdGlvbnMpIC8vIElNQVAgY2xpZW50IG9iamVjdFxuXG4gICAgLy8gRXZlbnQgSGFuZGxlcnNcbiAgICB0aGlzLmNsaWVudC5vbmVycm9yID0gdGhpcy5fb25FcnJvclxuICAgIHRoaXMuY2xpZW50Lm9uY2VydCA9IChjZXJ0KSA9PiAodGhpcy5vbmNlcnQgJiYgdGhpcy5vbmNlcnQoY2VydCkpIC8vIGFsbG93cyBjZXJ0aWZpY2F0ZSBoYW5kbGluZyBmb3IgcGxhdGZvcm1zIHcvbyBuYXRpdmUgdGxzIHN1cHBvcnRcbiAgICB0aGlzLmNsaWVudC5vbmlkbGUgPSAoKSA9PiB0aGlzLl9vbklkbGUoKSAvLyBzdGFydCBpZGxpbmdcblxuICAgIC8vIERlZmF1bHQgaGFuZGxlcnMgZm9yIHVudGFnZ2VkIHJlc3BvbnNlc1xuICAgIHRoaXMuY2xpZW50LnNldEhhbmRsZXIoJ2NhcGFiaWxpdHknLCAocmVzcG9uc2UpID0+IHRoaXMuX3VudGFnZ2VkQ2FwYWJpbGl0eUhhbmRsZXIocmVzcG9uc2UpKSAvLyBjYXBhYmlsaXR5IHVwZGF0ZXNcbiAgICB0aGlzLmNsaWVudC5zZXRIYW5kbGVyKCdvaycsIChyZXNwb25zZSkgPT4gdGhpcy5fdW50YWdnZWRPa0hhbmRsZXIocmVzcG9uc2UpKSAvLyBub3RpZmljYXRpb25zXG4gICAgdGhpcy5jbGllbnQuc2V0SGFuZGxlcignZXhpc3RzJywgKHJlc3BvbnNlKSA9PiB0aGlzLl91bnRhZ2dlZEV4aXN0c0hhbmRsZXIocmVzcG9uc2UpKSAvLyBtZXNzYWdlIGNvdW50IGhhcyBjaGFuZ2VkXG4gICAgdGhpcy5jbGllbnQuc2V0SGFuZGxlcignZXhwdW5nZScsIChyZXNwb25zZSkgPT4gdGhpcy5fdW50YWdnZWRFeHB1bmdlSGFuZGxlcihyZXNwb25zZSkpIC8vIG1lc3NhZ2UgaGFzIGJlZW4gZGVsZXRlZFxuICAgIHRoaXMuY2xpZW50LnNldEhhbmRsZXIoJ2ZldGNoJywgKHJlc3BvbnNlKSA9PiB0aGlzLl91bnRhZ2dlZEZldGNoSGFuZGxlcihyZXNwb25zZSkpIC8vIG1lc3NhZ2UgaGFzIGJlZW4gdXBkYXRlZCAoZWcuIGZsYWcgY2hhbmdlKVxuXG4gICAgLy8gQWN0aXZhdGUgbG9nZ2luZ1xuICAgIHRoaXMuY3JlYXRlTG9nZ2VyKClcbiAgICB0aGlzLmxvZ0xldmVsID0gcHJvcE9yKExPR19MRVZFTF9BTEwsICdsb2dMZXZlbCcsIG9wdGlvbnMpXG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIGlmIHRoZSBsb3dlci1sZXZlbCBJbWFwQ2xpZW50IGhhcyBlbmNvdW50ZXJlZCBhbiB1bnJlY292ZXJhYmxlXG4gICAqIGVycm9yIGR1cmluZyBvcGVyYXRpb24uIENsZWFucyB1cCBhbmQgcHJvcGFnYXRlcyB0aGUgZXJyb3IgdXB3YXJkcy5cbiAgICovXG4gIF9vbkVycm9yIChlcnIpIHtcbiAgICAvLyBtYWtlIHN1cmUgbm8gaWRsZSB0aW1lb3V0IGlzIHBlbmRpbmcgYW55bW9yZVxuICAgIGNsZWFyVGltZW91dCh0aGlzLl9pZGxlVGltZW91dClcblxuICAgIC8vIHByb3BhZ2F0ZSB0aGUgZXJyb3IgdXB3YXJkc1xuICAgIHRoaXMub25lcnJvciAmJiB0aGlzLm9uZXJyb3IoZXJyKVxuICB9XG5cbiAgLy9cbiAgLy9cbiAgLy8gUFVCTElDIEFQSVxuICAvL1xuICAvL1xuXG4gIC8qKlxuICAgKiBJbml0aWF0ZSBjb25uZWN0aW9uIHRvIHRoZSBJTUFQIHNlcnZlclxuICAgKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB3aGVuIGxvZ2luIHByb2NlZHVyZSBpcyBjb21wbGV0ZVxuICAgKi9cbiAgYXN5bmMgY29ubmVjdCAoKSB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuX29wZW5Db25uZWN0aW9uKClcbiAgICAgIHRoaXMuX2NoYW5nZVN0YXRlKFNUQVRFX05PVF9BVVRIRU5USUNBVEVEKVxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVDYXBhYmlsaXR5KClcbiAgICAgIGF3YWl0IHRoaXMudXBncmFkZUNvbm5lY3Rpb24oKVxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVJZCh0aGlzLl9jbGllbnRJZClcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKCdGYWlsZWQgdG8gdXBkYXRlIHNlcnZlciBpZCEnLCBlcnIubWVzc2FnZSlcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5sb2dpbih0aGlzLl9hdXRoKVxuICAgICAgYXdhaXQgdGhpcy5jb21wcmVzc0Nvbm5lY3Rpb24oKVxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ0Nvbm5lY3Rpb24gZXN0YWJsaXNoZWQsIHJlYWR5IHRvIHJvbGwhJylcbiAgICAgIHRoaXMuY2xpZW50Lm9uZXJyb3IgPSB0aGlzLl9vbkVycm9yXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignQ291bGQgbm90IGNvbm5lY3QgdG8gc2VydmVyJywgZXJyKVxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgdGhpcy5jbG9zZShlcnIpIC8vIHdlIGRvbid0IHJlYWxseSBjYXJlIHdoZXRoZXIgdGhpcyB3b3JrcyBvciBub3RcbiAgICAgIH0gY2F0Y2ggKGNFcnIpIHtcbiAgICAgICAgdGhyb3cgY0VyclxuICAgICAgfVxuICAgICAgdGhyb3cgZXJyXG4gICAgfVxuICB9XG5cbiAgX29wZW5Db25uZWN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgbGV0IGNvbm5lY3Rpb25UaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiByZWplY3QobmV3IEVycm9yKCdUaW1lb3V0IGNvbm5lY3RpbmcgdG8gc2VydmVyJykpLCB0aGlzLnRpbWVvdXRDb25uZWN0aW9uKVxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ0Nvbm5lY3RpbmcgdG8nLCB0aGlzLmNsaWVudC5ob3N0LCAnOicsIHRoaXMuY2xpZW50LnBvcnQpXG4gICAgICB0aGlzLl9jaGFuZ2VTdGF0ZShTVEFURV9DT05ORUNUSU5HKVxuICAgICAgdHJ5IHtcbiAgICAgICAgdGhpcy5jbGllbnQuY29ubmVjdCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdTb2NrZXQgb3BlbmVkLCB3YWl0aW5nIGZvciBncmVldGluZyBmcm9tIHRoZSBzZXJ2ZXIuLi4nKVxuXG4gICAgICAgICAgdGhpcy5jbGllbnQub25yZWFkeSA9ICgpID0+IHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChjb25uZWN0aW9uVGltZW91dClcbiAgICAgICAgICAgIHJlc29sdmUoKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMuY2xpZW50Lm9uZXJyb3IgPSAoZXJyKSA9PiB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoY29ubmVjdGlvblRpbWVvdXQpXG4gICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgIH1cbiAgICAgICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICB9KVxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHJlamVjdChlcnIpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dvdXRcbiAgICpcbiAgICogU2VuZCBMT0dPVVQsIHRvIHdoaWNoIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgYnkgY2xvc2luZyB0aGUgY29ubmVjdGlvbi5cbiAgICogVXNlIGlzIGRpc2NvdXJhZ2VkIGlmIG5ldHdvcmsgc3RhdHVzIGlzIHVuY2xlYXIhIElmIG5ldHdvcmtzIHN0YXR1cyBpc1xuICAgKiB1bmNsZWFyLCBwbGVhc2UgdXNlICNjbG9zZSBpbnN0ZWFkIVxuICAgKlxuICAgKiBMT0dPVVQgZGV0YWlsczpcbiAgICogICBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuMS4zXG4gICAqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBSZXNvbHZlcyB3aGVuIHNlcnZlciBoYXMgY2xvc2VkIHRoZSBjb25uZWN0aW9uXG4gICAqL1xuICBhc3luYyBsb2dvdXQgKCkge1xuICAgIHRoaXMuX2NoYW5nZVN0YXRlKFNUQVRFX0xPR09VVClcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnTG9nZ2luZyBvdXQuLi4nKVxuICAgIGF3YWl0IHRoaXMuY2xpZW50LmxvZ291dCgpXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX2lkbGVUaW1lb3V0KVxuICB9XG5cbiAgLyoqXG4gICAqIEZvcmNlLWNsb3NlcyB0aGUgY3VycmVudCBjb25uZWN0aW9uIGJ5IGNsb3NpbmcgdGhlIFRDUCBzb2NrZXQuXG4gICAqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBSZXNvbHZlcyB3aGVuIHNvY2tldCBpcyBjbG9zZWRcbiAgICovXG4gIGFzeW5jIGNsb3NlIChlcnIpIHtcbiAgICB0aGlzLl9jaGFuZ2VTdGF0ZShTVEFURV9MT0dPVVQpXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX2lkbGVUaW1lb3V0KVxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdDbG9zaW5nIGNvbm5lY3Rpb24uLi4nKVxuICAgIGF3YWl0IHRoaXMuY2xpZW50LmNsb3NlKGVycilcbiAgICBjbGVhclRpbWVvdXQodGhpcy5faWRsZVRpbWVvdXQpXG4gIH1cblxuICAvKipcbiAgICogUnVucyBJRCBjb21tYW5kLCBwYXJzZXMgSUQgcmVzcG9uc2UsIHNldHMgdGhpcy5zZXJ2ZXJJZFxuICAgKlxuICAgKiBJRCBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzI5NzFcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IGlkIElEIGFzIEpTT04gb2JqZWN0LiBTZWUgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMjk3MSNzZWN0aW9uLTMuMyBmb3IgcG9zc2libGUgdmFsdWVzXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBSZXNvbHZlcyB3aGVuIHJlc3BvbnNlIGhhcyBiZWVuIHBhcnNlZFxuICAgKi9cbiAgYXN5bmMgdXBkYXRlSWQgKGlkKSB7XG4gICAgaWYgKHRoaXMuX2NhcGFiaWxpdHkuaW5kZXhPZignSUQnKSA8IDApIHJldHVyblxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ1VwZGF0aW5nIGlkLi4uJylcblxuICAgIGNvbnN0IGNvbW1hbmQgPSAnSUQnXG4gICAgY29uc3QgYXR0cmlidXRlcyA9IGlkID8gWyBmbGF0dGVuKE9iamVjdC5lbnRyaWVzKGlkKSkgXSA6IFsgbnVsbCBdXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5leGVjKHsgY29tbWFuZCwgYXR0cmlidXRlcyB9LCAnSUQnKVxuICAgICAgY29uc3QgbGlzdCA9IGZsYXR0ZW4ocGF0aE9yKFtdLCBbJ3BheWxvYWQnLCAnSUQnLCAnMCcsICdhdHRyaWJ1dGVzJywgJzAnXSwgcmVzcG9uc2UpLm1hcChPYmplY3QudmFsdWVzKSlcbiAgICAgIGNvbnN0IGtleXMgPSBsaXN0LmZpbHRlcigoXywgaSkgPT4gaSAlIDIgPT09IDApXG4gICAgICBjb25zdCB2YWx1ZXMgPSBsaXN0LmZpbHRlcigoXywgaSkgPT4gaSAlIDIgPT09IDEpXG4gICAgICB0aGlzLnNlcnZlcklkID0gZnJvbVBhaXJzKHppcChrZXlzLCB2YWx1ZXMpKVxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ1NlcnZlciBpZCB1cGRhdGVkIScsIHRoaXMuc2VydmVySWQpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLl9vbkVycm9yKGVycilcbiAgICB9XG4gIH1cblxuICBfc2hvdWxkU2VsZWN0TWFpbGJveCAocGF0aCwgY3R4KSB7XG4gICAgaWYgKCFjdHgpIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuXG4gICAgY29uc3QgcHJldmlvdXNTZWxlY3QgPSB0aGlzLmNsaWVudC5nZXRQcmV2aW91c2x5UXVldWVkKFsnU0VMRUNUJywgJ0VYQU1JTkUnXSwgY3R4KVxuICAgIGlmIChwcmV2aW91c1NlbGVjdCAmJiBwcmV2aW91c1NlbGVjdC5yZXF1ZXN0LmF0dHJpYnV0ZXMpIHtcbiAgICAgIGNvbnN0IHBhdGhBdHRyaWJ1dGUgPSBwcmV2aW91c1NlbGVjdC5yZXF1ZXN0LmF0dHJpYnV0ZXMuZmluZCgoYXR0cmlidXRlKSA9PiBhdHRyaWJ1dGUudHlwZSA9PT0gJ1NUUklORycpXG4gICAgICBpZiAocGF0aEF0dHJpYnV0ZSkge1xuICAgICAgICByZXR1cm4gcGF0aEF0dHJpYnV0ZS52YWx1ZSAhPT0gcGF0aFxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9zZWxlY3RlZE1haWxib3ggIT09IHBhdGhcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIFNFTEVDVCBvciBFWEFNSU5FIHRvIG9wZW4gYSBtYWlsYm94XG4gICAqXG4gICAqIFNFTEVDVCBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjMuMVxuICAgKiBFWEFNSU5FIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuMy4yXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIEZ1bGwgcGF0aCB0byBtYWlsYm94XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gT3B0aW9ucyBvYmplY3RcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2l0aCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgc2VsZWN0ZWQgbWFpbGJveFxuICAgKi9cbiAgYXN5bmMgc2VsZWN0TWFpbGJveCAocGF0aCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgbGV0IHF1ZXJ5ID0ge1xuICAgICAgY29tbWFuZDogb3B0aW9ucy5yZWFkT25seSA/ICdFWEFNSU5FJyA6ICdTRUxFQ1QnLFxuICAgICAgYXR0cmlidXRlczogW3sgdHlwZTogJ1NUUklORycsIHZhbHVlOiBwYXRoIH1dXG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuY29uZHN0b3JlICYmIHRoaXMuX2NhcGFiaWxpdHkuaW5kZXhPZignQ09ORFNUT1JFJykgPj0gMCkge1xuICAgICAgcXVlcnkuYXR0cmlidXRlcy5wdXNoKFt7IHR5cGU6ICdBVE9NJywgdmFsdWU6ICdDT05EU1RPUkUnIH1dKVxuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdPcGVuaW5nJywgcGF0aCwgJy4uLicpXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5leGVjKHF1ZXJ5LCBbJ0VYSVNUUycsICdGTEFHUycsICdPSyddLCB7IGN0eDogb3B0aW9ucy5jdHggfSlcbiAgICAgIGxldCBtYWlsYm94SW5mbyA9IHBhcnNlU0VMRUNUKHJlc3BvbnNlKVxuXG4gICAgICB0aGlzLl9jaGFuZ2VTdGF0ZShTVEFURV9TRUxFQ1RFRClcblxuICAgICAgaWYgKHRoaXMuX3NlbGVjdGVkTWFpbGJveCAhPT0gcGF0aCAmJiB0aGlzLm9uY2xvc2VtYWlsYm94KSB7XG4gICAgICAgIGF3YWl0IHRoaXMub25jbG9zZW1haWxib3godGhpcy5fc2VsZWN0ZWRNYWlsYm94KVxuICAgICAgfVxuICAgICAgdGhpcy5fc2VsZWN0ZWRNYWlsYm94ID0gcGF0aFxuICAgICAgaWYgKHRoaXMub25zZWxlY3RtYWlsYm94KSB7XG4gICAgICAgIGF3YWl0IHRoaXMub25zZWxlY3RtYWlsYm94KHBhdGgsIG1haWxib3hJbmZvKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gbWFpbGJveEluZm9cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuX29uRXJyb3IoZXJyKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIE5BTUVTUEFDRSBjb21tYW5kXG4gICAqXG4gICAqIE5BTUVTUEFDRSBkZXRhaWxzOlxuICAgKiAgIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMyMzQyXG4gICAqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHdpdGggbmFtZXNwYWNlIG9iamVjdFxuICAgKi9cbiAgYXN5bmMgbGlzdE5hbWVzcGFjZXMgKCkge1xuICAgIGlmICh0aGlzLl9jYXBhYmlsaXR5LmluZGV4T2YoJ05BTUVTUEFDRScpIDwgMCkgcmV0dXJuIGZhbHNlXG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnTGlzdGluZyBuYW1lc3BhY2VzLi4uJylcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmV4ZWMoJ05BTUVTUEFDRScsICdOQU1FU1BBQ0UnKVxuICAgICAgcmV0dXJuIHBhcnNlTkFNRVNQQUNFKHJlc3BvbnNlKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5fb25FcnJvcihlcnIpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJ1bnMgTElTVCBhbmQgTFNVQiBjb21tYW5kcy4gUmV0cmlldmVzIGEgdHJlZSBvZiBhdmFpbGFibGUgbWFpbGJveGVzXG4gICAqXG4gICAqIExJU1QgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi4zLjhcbiAgICogTFNVQiBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjMuOVxuICAgKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB3aXRoIGxpc3Qgb2YgbWFpbGJveGVzXG4gICAqL1xuICBhc3luYyBsaXN0TWFpbGJveGVzICgpIHtcbiAgICBjb25zdCB0cmVlID0geyByb290OiB0cnVlLCBjaGlsZHJlbjogW10gfVxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0xpc3RpbmcgbWFpbGJveGVzLi4uJylcbiAgICB0cnkge1xuICAgICAgY29uc3QgbGlzdFJlc3BvbnNlID0gYXdhaXQgdGhpcy5leGVjKHsgY29tbWFuZDogJ0xJU1QnLCBhdHRyaWJ1dGVzOiBbJycsICcqJ10gfSwgJ0xJU1QnKVxuICAgICAgY29uc3QgbGlzdCA9IHBhdGhPcihbXSwgWydwYXlsb2FkJywgJ0xJU1QnXSwgbGlzdFJlc3BvbnNlKVxuICAgICAgbGlzdC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICBjb25zdCBhdHRyID0gcHJvcE9yKFtdLCAnYXR0cmlidXRlcycsIGl0ZW0pXG4gICAgICAgIGlmIChhdHRyLmxlbmd0aCA8IDMpIHJldHVyblxuXG4gICAgICAgIGNvbnN0IHBhdGggPSBwYXRoT3IoJycsIFsnMicsICd2YWx1ZSddLCBhdHRyKVxuICAgICAgICBjb25zdCBkZWxpbSA9IHBhdGhPcignLycsIFsnMScsICd2YWx1ZSddLCBhdHRyKVxuICAgICAgICBjb25zdCBicmFuY2ggPSB0aGlzLl9lbnN1cmVQYXRoKHRyZWUsIHBhdGgsIGRlbGltKVxuICAgICAgICBicmFuY2guZmxhZ3MgPSBwcm9wT3IoW10sICcwJywgYXR0cikubWFwKCh7IHZhbHVlIH0pID0+IHZhbHVlIHx8ICcnKVxuICAgICAgICBicmFuY2gubGlzdGVkID0gdHJ1ZVxuICAgICAgICBjaGVja1NwZWNpYWxVc2UoYnJhbmNoKVxuICAgICAgfSlcblxuICAgICAgY29uc3QgbHN1YlJlc3BvbnNlID0gYXdhaXQgdGhpcy5leGVjKHsgY29tbWFuZDogJ0xTVUInLCBhdHRyaWJ1dGVzOiBbJycsICcqJ10gfSwgJ0xTVUInKVxuICAgICAgY29uc3QgbHN1YiA9IHBhdGhPcihbXSwgWydwYXlsb2FkJywgJ0xTVUInXSwgbHN1YlJlc3BvbnNlKVxuICAgICAgbHN1Yi5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIGNvbnN0IGF0dHIgPSBwcm9wT3IoW10sICdhdHRyaWJ1dGVzJywgaXRlbSlcbiAgICAgICAgaWYgKGF0dHIubGVuZ3RoIDwgMykgcmV0dXJuXG5cbiAgICAgICAgY29uc3QgcGF0aCA9IHBhdGhPcignJywgWycyJywgJ3ZhbHVlJ10sIGF0dHIpXG4gICAgICAgIGNvbnN0IGRlbGltID0gcGF0aE9yKCcvJywgWycxJywgJ3ZhbHVlJ10sIGF0dHIpXG4gICAgICAgIGNvbnN0IGJyYW5jaCA9IHRoaXMuX2Vuc3VyZVBhdGgodHJlZSwgcGF0aCwgZGVsaW0pXG4gICAgICAgIHByb3BPcihbXSwgJzAnLCBhdHRyKS5tYXAoKGZsYWcgPSAnJykgPT4geyBicmFuY2guZmxhZ3MgPSB1bmlvbihicmFuY2guZmxhZ3MsIFtmbGFnXSkgfSlcbiAgICAgICAgYnJhbmNoLnN1YnNjcmliZWQgPSB0cnVlXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gdHJlZVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5fb25FcnJvcihlcnIpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG1haWxib3ggd2l0aCB0aGUgZ2l2ZW4gcGF0aC5cbiAgICpcbiAgICogQ1JFQVRFIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuMy4zXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAqICAgICBUaGUgcGF0aCBvZiB0aGUgbWFpbGJveCB5b3Ugd291bGQgbGlrZSB0byBjcmVhdGUuICBUaGlzIG1ldGhvZCB3aWxsXG4gICAqICAgICBoYW5kbGUgdXRmNyBlbmNvZGluZyBmb3IgeW91LlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICogICAgIFByb21pc2UgcmVzb2x2ZXMgaWYgbWFpbGJveCB3YXMgY3JlYXRlZC5cbiAgICogICAgIEluIHRoZSBldmVudCB0aGUgc2VydmVyIHNheXMgTk8gW0FMUkVBRFlFWElTVFNdLCB3ZSB0cmVhdCB0aGF0IGFzIHN1Y2Nlc3MuXG4gICAqL1xuICBhc3luYyBjcmVhdGVNYWlsYm94IChwYXRoKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0NyZWF0aW5nIG1haWxib3gnLCBwYXRoLCAnLi4uJylcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5leGVjKHsgY29tbWFuZDogJ0NSRUFURScsIGF0dHJpYnV0ZXM6IFtpbWFwRW5jb2RlKHBhdGgpXSB9KVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgaWYgKGVyciAmJiBlcnIuY29kZSA9PT0gJ0FMUkVBRFlFWElTVFMnKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdGhyb3cgZXJyXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERlbGV0ZSBhIG1haWxib3ggd2l0aCB0aGUgZ2l2ZW4gcGF0aC5cbiAgICpcbiAgICogREVMRVRFIGRldGFpbHM6XG4gICAqICAgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjMuNFxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgKiAgICAgVGhlIHBhdGggb2YgdGhlIG1haWxib3ggeW91IHdvdWxkIGxpa2UgdG8gZGVsZXRlLiAgVGhpcyBtZXRob2Qgd2lsbFxuICAgKiAgICAgaGFuZGxlIHV0ZjcgZW5jb2RpbmcgZm9yIHlvdS5cbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqICAgICBQcm9taXNlIHJlc29sdmVzIGlmIG1haWxib3ggd2FzIGRlbGV0ZWQuXG4gICAqL1xuICBkZWxldGVNYWlsYm94IChwYXRoKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0RlbGV0aW5nIG1haWxib3gnLCBwYXRoLCAnLi4uJylcbiAgICB0cnkge1xuICAgICAgY29uc3QgZGVsUmVzcG9uc2UgPSB0aGlzLmV4ZWMoeyBjb21tYW5kOiAnREVMRVRFJywgYXR0cmlidXRlczogW2ltYXBFbmNvZGUocGF0aCldIH0pXG4gICAgICByZXR1cm4gZGVsUmVzcG9uc2VcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuX29uRXJyb3IoZXJyKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIEZFVENIIGNvbW1hbmRcbiAgICpcbiAgICogRkVUQ0ggZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi40LjVcbiAgICogQ0hBTkdFRFNJTkNFIGRldGFpbHM6XG4gICAqICAgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzQ1NTEjc2VjdGlvbi0zLjNcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggVGhlIHBhdGggZm9yIHRoZSBtYWlsYm94IHdoaWNoIHNob3VsZCBiZSBzZWxlY3RlZCBmb3IgdGhlIGNvbW1hbmQuIFNlbGVjdHMgbWFpbGJveCBpZiBuZWNlc3NhcnlcbiAgICogQHBhcmFtIHtTdHJpbmd9IHNlcXVlbmNlIFNlcXVlbmNlIHNldCwgZWcgMToqIGZvciBhbGwgbWVzc2FnZXNcbiAgICogQHBhcmFtIHtPYmplY3R9IFtpdGVtc10gTWVzc2FnZSBkYXRhIGl0ZW0gbmFtZXMgb3IgbWFjcm9cbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBRdWVyeSBtb2RpZmllcnNcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2l0aCB0aGUgZmV0Y2hlZCBtZXNzYWdlIGluZm9cbiAgICovXG4gIGFzeW5jIGxpc3RNZXNzYWdlcyAocGF0aCwgc2VxdWVuY2UsIGl0ZW1zID0gW3sgZmFzdDogdHJ1ZSB9XSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0ZldGNoaW5nIG1lc3NhZ2VzJywgc2VxdWVuY2UsICdmcm9tJywgcGF0aCwgJy4uLicpXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBidWlsZEZFVENIQ29tbWFuZChzZXF1ZW5jZSwgaXRlbXMsIG9wdGlvbnMpXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuZXhlYyhjb21tYW5kLCAnRkVUQ0gnLCB7XG4gICAgICAgIHByZWNoZWNrOiAoY3R4KSA9PiB0aGlzLl9zaG91bGRTZWxlY3RNYWlsYm94KHBhdGgsIGN0eCkgPyB0aGlzLnNlbGVjdE1haWxib3gocGF0aCwgeyBjdHggfSkgOiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgfSlcbiAgICAgIHJldHVybiBwYXJzZUZFVENIKHJlc3BvbnNlKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5fb25FcnJvcihlcnIpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJ1bnMgU0VBUkNIIGNvbW1hbmRcbiAgICpcbiAgICogU0VBUkNIIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuNC40XG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBwYXRoIGZvciB0aGUgbWFpbGJveCB3aGljaCBzaG91bGQgYmUgc2VsZWN0ZWQgZm9yIHRoZSBjb21tYW5kLiBTZWxlY3RzIG1haWxib3ggaWYgbmVjZXNzYXJ5XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBxdWVyeSBTZWFyY2ggdGVybXNcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBRdWVyeSBtb2RpZmllcnNcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2l0aCB0aGUgYXJyYXkgb2YgbWF0Y2hpbmcgc2VxLiBvciB1aWQgbnVtYmVyc1xuICAgKi9cbiAgYXN5bmMgc2VhcmNoIChwYXRoLCBxdWVyeSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ1NlYXJjaGluZyBpbicsIHBhdGgsICcuLi4nKVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBjb21tYW5kID0gYnVpbGRTRUFSQ0hDb21tYW5kKHF1ZXJ5LCBvcHRpb25zKVxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmV4ZWMoY29tbWFuZCwgJ1NFQVJDSCcsIHtcbiAgICAgICAgcHJlY2hlY2s6IChjdHgpID0+IHRoaXMuX3Nob3VsZFNlbGVjdE1haWxib3gocGF0aCwgY3R4KSA/IHRoaXMuc2VsZWN0TWFpbGJveChwYXRoLCB7IGN0eCB9KSA6IFByb21pc2UucmVzb2x2ZSgpXG4gICAgICB9KVxuICAgICAgcmV0dXJuIHBhcnNlU0VBUkNIKHJlc3BvbnNlKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5fb25FcnJvcihlcnIpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJ1bnMgU1RPUkUgY29tbWFuZFxuICAgKlxuICAgKiBTVE9SRSBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjQuNlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBUaGUgcGF0aCBmb3IgdGhlIG1haWxib3ggd2hpY2ggc2hvdWxkIGJlIHNlbGVjdGVkIGZvciB0aGUgY29tbWFuZC4gU2VsZWN0cyBtYWlsYm94IGlmIG5lY2Vzc2FyeVxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2VxdWVuY2UgTWVzc2FnZSBzZWxlY3RvciB3aGljaCB0aGUgZmxhZyBjaGFuZ2UgaXMgYXBwbGllZCB0b1xuICAgKiBAcGFyYW0ge0FycmF5fSBmbGFnc1xuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIFF1ZXJ5IG1vZGlmaWVyc1xuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB3aXRoIHRoZSBhcnJheSBvZiBtYXRjaGluZyBzZXEuIG9yIHVpZCBudW1iZXJzXG4gICAqL1xuICBzZXRGbGFncyAocGF0aCwgc2VxdWVuY2UsIGZsYWdzLCBvcHRpb25zKSB7XG4gICAgbGV0IGtleSA9ICcnXG4gICAgbGV0IGxpc3QgPSBbXVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZmxhZ3MpIHx8IHR5cGVvZiBmbGFncyAhPT0gJ29iamVjdCcpIHtcbiAgICAgIGxpc3QgPSBbXS5jb25jYXQoZmxhZ3MgfHwgW10pXG4gICAgICBrZXkgPSAnJ1xuICAgIH0gZWxzZSBpZiAoZmxhZ3MuYWRkKSB7XG4gICAgICBsaXN0ID0gW10uY29uY2F0KGZsYWdzLmFkZCB8fCBbXSlcbiAgICAgIGtleSA9ICcrJ1xuICAgIH0gZWxzZSBpZiAoZmxhZ3Muc2V0KSB7XG4gICAgICBrZXkgPSAnJ1xuICAgICAgbGlzdCA9IFtdLmNvbmNhdChmbGFncy5zZXQgfHwgW10pXG4gICAgfSBlbHNlIGlmIChmbGFncy5yZW1vdmUpIHtcbiAgICAgIGtleSA9ICctJ1xuICAgICAgbGlzdCA9IFtdLmNvbmNhdChmbGFncy5yZW1vdmUgfHwgW10pXG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ1NldHRpbmcgZmxhZ3Mgb24nLCBzZXF1ZW5jZSwgJ2luJywgcGF0aCwgJy4uLicpXG4gICAgcmV0dXJuIHRoaXMuc3RvcmUocGF0aCwgc2VxdWVuY2UsIGtleSArICdGTEFHUycsIGxpc3QsIG9wdGlvbnMpXG4gIH1cblxuICAvKipcbiAgICogUnVucyBTVE9SRSBjb21tYW5kXG4gICAqXG4gICAqIFNUT1JFIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuNC42XG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBwYXRoIGZvciB0aGUgbWFpbGJveCB3aGljaCBzaG91bGQgYmUgc2VsZWN0ZWQgZm9yIHRoZSBjb21tYW5kLiBTZWxlY3RzIG1haWxib3ggaWYgbmVjZXNzYXJ5XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzZXF1ZW5jZSBNZXNzYWdlIHNlbGVjdG9yIHdoaWNoIHRoZSBmbGFnIGNoYW5nZSBpcyBhcHBsaWVkIHRvXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBhY3Rpb24gU1RPUkUgbWV0aG9kIHRvIGNhbGwsIGVnIFwiK0ZMQUdTXCJcbiAgICogQHBhcmFtIHtBcnJheX0gZmxhZ3NcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBRdWVyeSBtb2RpZmllcnNcbiAgICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2Ugd2l0aCB0aGUgYXJyYXkgb2YgbWF0Y2hpbmcgc2VxLiBvciB1aWQgbnVtYmVyc1xuICAgKi9cbiAgYXN5bmMgc3RvcmUgKHBhdGgsIHNlcXVlbmNlLCBhY3Rpb24sIGZsYWdzLCBvcHRpb25zID0ge30pIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgY29tbWFuZCA9IGJ1aWxkU1RPUkVDb21tYW5kKHNlcXVlbmNlLCBhY3Rpb24sIGZsYWdzLCBvcHRpb25zKVxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmV4ZWMoY29tbWFuZCwgJ0ZFVENIJywge1xuICAgICAgICBwcmVjaGVjazogKGN0eCkgPT4gdGhpcy5fc2hvdWxkU2VsZWN0TWFpbGJveChwYXRoLCBjdHgpID8gdGhpcy5zZWxlY3RNYWlsYm94KHBhdGgsIHsgY3R4IH0pIDogUHJvbWlzZS5yZXNvbHZlKClcbiAgICAgIH0pXG4gICAgICByZXR1cm4gcGFyc2VGRVRDSChyZXNwb25zZSlcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuX29uRXJyb3IoZXJyKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIEFQUEVORCBjb21tYW5kXG4gICAqXG4gICAqIEFQUEVORCBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjMuMTFcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IGRlc3RpbmF0aW9uIFRoZSBtYWlsYm94IHdoZXJlIHRvIGFwcGVuZCB0aGUgbWVzc2FnZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZSBUaGUgbWVzc2FnZSB0byBhcHBlbmRcbiAgICogQHBhcmFtIHtBcnJheX0gb3B0aW9ucy5mbGFncyBBbnkgZmxhZ3MgeW91IHdhbnQgdG8gc2V0IG9uIHRoZSB1cGxvYWRlZCBtZXNzYWdlLiBEZWZhdWx0cyB0byBbXFxTZWVuXS4gKG9wdGlvbmFsKVxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB3aXRoIHRoZSBhcnJheSBvZiBtYXRjaGluZyBzZXEuIG9yIHVpZCBudW1iZXJzXG4gICAqL1xuICB1cGxvYWQgKGRlc3RpbmF0aW9uLCBtZXNzYWdlLCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgZmxhZ3MgPSBwcm9wT3IoWydcXFxcU2VlbiddLCAnZmxhZ3MnLCBvcHRpb25zKS5tYXAodmFsdWUgPT4gKHsgdHlwZTogJ2F0b20nLCB2YWx1ZSB9KSlcbiAgICBsZXQgY29tbWFuZCA9IHtcbiAgICAgIGNvbW1hbmQ6ICdBUFBFTkQnLFxuICAgICAgYXR0cmlidXRlczogW1xuICAgICAgICB7IHR5cGU6ICdhdG9tJywgdmFsdWU6IGRlc3RpbmF0aW9uIH0sXG4gICAgICAgIGZsYWdzLFxuICAgICAgICB7IHR5cGU6ICdsaXRlcmFsJywgdmFsdWU6IG1lc3NhZ2UgfVxuICAgICAgXVxuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdVcGxvYWRpbmcgbWVzc2FnZSB0bycsIGRlc3RpbmF0aW9uLCAnLi4uJylcbiAgICB0cnkge1xuICAgICAgY29uc3QgdXBsb2FkUmVzcG9uc2UgPSB0aGlzLmV4ZWMoY29tbWFuZClcbiAgICAgIHJldHVybiB1cGxvYWRSZXNwb25zZVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5fb25FcnJvcihlcnIpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERlbGV0ZXMgbWVzc2FnZXMgZnJvbSBhIHNlbGVjdGVkIG1haWxib3hcbiAgICpcbiAgICogRVhQVU5HRSBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjQuM1xuICAgKiBVSUQgRVhQVU5HRSBkZXRhaWxzOlxuICAgKiAgIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM0MzE1I3NlY3Rpb24tMi4xXG4gICAqXG4gICAqIElmIHBvc3NpYmxlIChieVVpZDp0cnVlIGFuZCBVSURQTFVTIGV4dGVuc2lvbiBzdXBwb3J0ZWQpLCB1c2VzIFVJRCBFWFBVTkdFXG4gICAqIGNvbW1hbmQgdG8gZGVsZXRlIGEgcmFuZ2Ugb2YgbWVzc2FnZXMsIG90aGVyd2lzZSBmYWxscyBiYWNrIHRvIEVYUFVOR0UuXG4gICAqXG4gICAqIE5CISBUaGlzIG1ldGhvZCBtaWdodCBiZSBkZXN0cnVjdGl2ZSAtIGlmIEVYUFVOR0UgaXMgdXNlZCwgdGhlbiBhbnkgbWVzc2FnZXNcbiAgICogd2l0aCBcXERlbGV0ZWQgZmxhZyBzZXQgYXJlIGRlbGV0ZWRcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggVGhlIHBhdGggZm9yIHRoZSBtYWlsYm94IHdoaWNoIHNob3VsZCBiZSBzZWxlY3RlZCBmb3IgdGhlIGNvbW1hbmQuIFNlbGVjdHMgbWFpbGJveCBpZiBuZWNlc3NhcnlcbiAgICogQHBhcmFtIHtTdHJpbmd9IHNlcXVlbmNlIE1lc3NhZ2UgcmFuZ2UgdG8gYmUgZGVsZXRlZFxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIFF1ZXJ5IG1vZGlmaWVyc1xuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZVxuICAgKi9cbiAgYXN5bmMgZGVsZXRlTWVzc2FnZXMgKHBhdGgsIHNlcXVlbmNlLCBvcHRpb25zID0ge30pIHtcbiAgICAvLyBhZGQgXFxEZWxldGVkIGZsYWcgdG8gdGhlIG1lc3NhZ2VzIGFuZCBydW4gRVhQVU5HRSBvciBVSUQgRVhQVU5HRVxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdEZWxldGluZyBtZXNzYWdlcycsIHNlcXVlbmNlLCAnaW4nLCBwYXRoLCAnLi4uJylcbiAgICBjb25zdCB1c2VVaWRQbHVzID0gb3B0aW9ucy5ieVVpZCAmJiB0aGlzLl9jYXBhYmlsaXR5LmluZGV4T2YoJ1VJRFBMVVMnKSA+PSAwXG4gICAgY29uc3QgdWlkRXhwdW5nZUNvbW1hbmQgPSB7IGNvbW1hbmQ6ICdVSUQgRVhQVU5HRScsIGF0dHJpYnV0ZXM6IFt7IHR5cGU6ICdzZXF1ZW5jZScsIHZhbHVlOiBzZXF1ZW5jZSB9XSB9XG4gICAgYXdhaXQgdGhpcy5zZXRGbGFncyhwYXRoLCBzZXF1ZW5jZSwgeyBhZGQ6ICdcXFxcRGVsZXRlZCcgfSwgb3B0aW9ucylcbiAgICBjb25zdCBjbWQgPSB1c2VVaWRQbHVzID8gdWlkRXhwdW5nZUNvbW1hbmQgOiAnRVhQVU5HRSdcbiAgICB0cnkge1xuICAgICAgY29uc3QgZGVsUmVzcG9uc2UgPSB0aGlzLmV4ZWMoY21kLCBudWxsLCB7XG4gICAgICAgIHByZWNoZWNrOiAoY3R4KSA9PiB0aGlzLl9zaG91bGRTZWxlY3RNYWlsYm94KHBhdGgsIGN0eCkgPyB0aGlzLnNlbGVjdE1haWxib3gocGF0aCwgeyBjdHggfSkgOiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgfSlcbiAgICAgIHJldHVybiBkZWxSZXNwb25zZVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5fb25FcnJvcihlcnIpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENvcGllcyBhIHJhbmdlIG9mIG1lc3NhZ2VzIGZyb20gdGhlIGFjdGl2ZSBtYWlsYm94IHRvIHRoZSBkZXN0aW5hdGlvbiBtYWlsYm94LlxuICAgKiBTaWxlbnQgbWV0aG9kICh1bmxlc3MgYW4gZXJyb3Igb2NjdXJzKSwgYnkgZGVmYXVsdCByZXR1cm5zIG5vIGluZm9ybWF0aW9uLlxuICAgKlxuICAgKiBDT1BZIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTYuNC43XG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBwYXRoIGZvciB0aGUgbWFpbGJveCB3aGljaCBzaG91bGQgYmUgc2VsZWN0ZWQgZm9yIHRoZSBjb21tYW5kLiBTZWxlY3RzIG1haWxib3ggaWYgbmVjZXNzYXJ5XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzZXF1ZW5jZSBNZXNzYWdlIHJhbmdlIHRvIGJlIGNvcGllZFxuICAgKiBAcGFyYW0ge1N0cmluZ30gZGVzdGluYXRpb24gRGVzdGluYXRpb24gbWFpbGJveCBwYXRoXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gUXVlcnkgbW9kaWZpZXJzXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuYnlVaWRdIElmIHRydWUsIHVzZXMgVUlEIENPUFkgaW5zdGVhZCBvZiBDT1BZXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlXG4gICAqL1xuICBhc3luYyBjb3B5TWVzc2FnZXMgKHBhdGgsIHNlcXVlbmNlLCBkZXN0aW5hdGlvbiwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0NvcHlpbmcgbWVzc2FnZXMnLCBzZXF1ZW5jZSwgJ2Zyb20nLCBwYXRoLCAndG8nLCBkZXN0aW5hdGlvbiwgJy4uLicpXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgaHVtYW5SZWFkYWJsZSB9ID0gYXdhaXQgdGhpcy5leGVjKHtcbiAgICAgICAgY29tbWFuZDogb3B0aW9ucy5ieVVpZCA/ICdVSUQgQ09QWScgOiAnQ09QWScsXG4gICAgICAgIGF0dHJpYnV0ZXM6IFtcbiAgICAgICAgICB7IHR5cGU6ICdzZXF1ZW5jZScsIHZhbHVlOiBzZXF1ZW5jZSB9LFxuICAgICAgICAgIHsgdHlwZTogJ2F0b20nLCB2YWx1ZTogZGVzdGluYXRpb24gfVxuICAgICAgICBdXG4gICAgICB9LCBudWxsLCB7XG4gICAgICAgIHByZWNoZWNrOiAoY3R4KSA9PiB0aGlzLl9zaG91bGRTZWxlY3RNYWlsYm94KHBhdGgsIGN0eCkgPyB0aGlzLnNlbGVjdE1haWxib3gocGF0aCwgeyBjdHggfSkgOiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgfSlcbiAgICAgIHJldHVybiBodW1hblJlYWRhYmxlIHx8ICdDT1BZIGNvbXBsZXRlZCdcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuX29uRXJyb3IoZXJyKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBNb3ZlcyBhIHJhbmdlIG9mIG1lc3NhZ2VzIGZyb20gdGhlIGFjdGl2ZSBtYWlsYm94IHRvIHRoZSBkZXN0aW5hdGlvbiBtYWlsYm94LlxuICAgKiBQcmVmZXJzIHRoZSBNT1ZFIGV4dGVuc2lvbiBidXQgaWYgbm90IGF2YWlsYWJsZSwgZmFsbHMgYmFjayB0b1xuICAgKiBDT1BZICsgRVhQVU5HRVxuICAgKlxuICAgKiBNT1ZFIGRldGFpbHM6XG4gICAqICAgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjg1MVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBUaGUgcGF0aCBmb3IgdGhlIG1haWxib3ggd2hpY2ggc2hvdWxkIGJlIHNlbGVjdGVkIGZvciB0aGUgY29tbWFuZC4gU2VsZWN0cyBtYWlsYm94IGlmIG5lY2Vzc2FyeVxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2VxdWVuY2UgTWVzc2FnZSByYW5nZSB0byBiZSBtb3ZlZFxuICAgKiBAcGFyYW0ge1N0cmluZ30gZGVzdGluYXRpb24gRGVzdGluYXRpb24gbWFpbGJveCBwYXRoXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gUXVlcnkgbW9kaWZpZXJzXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlXG4gICAqL1xuICBhc3luYyBtb3ZlTWVzc2FnZXMgKHBhdGgsIHNlcXVlbmNlLCBkZXN0aW5hdGlvbiwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ01vdmluZyBtZXNzYWdlcycsIHNlcXVlbmNlLCAnZnJvbScsIHBhdGgsICd0bycsIGRlc3RpbmF0aW9uLCAnLi4uJylcblxuICAgIGlmICh0aGlzLl9jYXBhYmlsaXR5LmluZGV4T2YoJ01PVkUnKSA9PT0gLTEpIHtcbiAgICAgIC8vIEZhbGxiYWNrIHRvIENPUFkgKyBFWFBVTkdFXG4gICAgICBhd2FpdCB0aGlzLmNvcHlNZXNzYWdlcyhwYXRoLCBzZXF1ZW5jZSwgZGVzdGluYXRpb24sIG9wdGlvbnMpXG4gICAgICByZXR1cm4gdGhpcy5kZWxldGVNZXNzYWdlcyhwYXRoLCBzZXF1ZW5jZSwgb3B0aW9ucylcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgLy8gSWYgcG9zc2libGUsIHVzZSBNT1ZFXG4gICAgICBjb25zdCBtb3ZlUmVzcG9uc2UgPSB0aGlzLmV4ZWMoe1xuICAgICAgICBjb21tYW5kOiBvcHRpb25zLmJ5VWlkID8gJ1VJRCBNT1ZFJyA6ICdNT1ZFJyxcbiAgICAgICAgYXR0cmlidXRlczogW1xuICAgICAgICAgIHsgdHlwZTogJ3NlcXVlbmNlJywgdmFsdWU6IHNlcXVlbmNlIH0sXG4gICAgICAgICAgeyB0eXBlOiAnYXRvbScsIHZhbHVlOiBkZXN0aW5hdGlvbiB9XG4gICAgICAgIF1cbiAgICAgIH0sIFsnT0snXSwge1xuICAgICAgICBwcmVjaGVjazogKGN0eCkgPT4gdGhpcy5fc2hvdWxkU2VsZWN0TWFpbGJveChwYXRoLCBjdHgpID8gdGhpcy5zZWxlY3RNYWlsYm94KHBhdGgsIHsgY3R4IH0pIDogUHJvbWlzZS5yZXNvbHZlKClcbiAgICAgIH0pXG4gICAgICByZXR1cm4gbW92ZVJlc3BvbnNlXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLl9vbkVycm9yKGVycilcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUnVucyBDT01QUkVTUyBjb21tYW5kXG4gICAqXG4gICAqIENPTVBSRVNTIGRldGFpbHM6XG4gICAqICAgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzQ5NzhcbiAgICovXG4gIGFzeW5jIGNvbXByZXNzQ29ubmVjdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLl9lbmFibGVDb21wcmVzc2lvbiB8fCB0aGlzLl9jYXBhYmlsaXR5LmluZGV4T2YoJ0NPTVBSRVNTPURFRkxBVEUnKSA8IDAgfHwgdGhpcy5jbGllbnQuY29tcHJlc3NlZCkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0VuYWJsaW5nIGNvbXByZXNzaW9uLi4uJylcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5leGVjKHtcbiAgICAgICAgY29tbWFuZDogJ0NPTVBSRVNTJyxcbiAgICAgICAgYXR0cmlidXRlczogW3tcbiAgICAgICAgICB0eXBlOiAnQVRPTScsXG4gICAgICAgICAgdmFsdWU6ICdERUZMQVRFJ1xuICAgICAgICB9XVxuICAgICAgfSlcbiAgICAgIHRoaXMuY2xpZW50LmVuYWJsZUNvbXByZXNzaW9uKClcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdDb21wcmVzc2lvbiBlbmFibGVkLCBhbGwgZGF0YSBzZW50IGFuZCByZWNlaXZlZCBpcyBkZWZsYXRlZCEnKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5fb25FcnJvcihlcnIpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJ1bnMgTE9HSU4gb3IgQVVUSEVOVElDQVRFIFhPQVVUSDIgY29tbWFuZFxuICAgKlxuICAgKiBMT0dJTiBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjIuM1xuICAgKiBYT0FVVEgyIGRldGFpbHM6XG4gICAqICAgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20vZ21haWwveG9hdXRoMl9wcm90b2NvbCNpbWFwX3Byb3RvY29sX2V4Y2hhbmdlXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBhdXRoLnVzZXJcbiAgICogQHBhcmFtIHtTdHJpbmd9IGF1dGgucGFzc1xuICAgKiBAcGFyYW0ge1N0cmluZ30gYXV0aC54b2F1dGgyXG4gICAqL1xuICBhc3luYyBsb2dpbiAoYXV0aCkge1xuICAgIGxldCBjb21tYW5kXG4gICAgbGV0IG9wdGlvbnMgPSB7fVxuXG4gICAgaWYgKCFhdXRoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0F1dGhlbnRpY2F0aW9uIGluZm9ybWF0aW9uIG5vdCBwcm92aWRlZCcpXG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2NhcGFiaWxpdHkuaW5kZXhPZignQVVUSD1YT0FVVEgyJykgPj0gMCAmJiBhdXRoICYmIGF1dGgueG9hdXRoMikge1xuICAgICAgY29tbWFuZCA9IHtcbiAgICAgICAgY29tbWFuZDogJ0FVVEhFTlRJQ0FURScsXG4gICAgICAgIGF0dHJpYnV0ZXM6IFtcbiAgICAgICAgICB7IHR5cGU6ICdBVE9NJywgdmFsdWU6ICdYT0FVVEgyJyB9LFxuICAgICAgICAgIHsgdHlwZTogJ0FUT00nLCB2YWx1ZTogYnVpbGRYT0F1dGgyVG9rZW4oYXV0aC51c2VyLCBhdXRoLnhvYXV0aDIpLCBzZW5zaXRpdmU6IHRydWUgfVxuICAgICAgICBdXG4gICAgICB9XG5cbiAgICAgIG9wdGlvbnMuZXJyb3JSZXNwb25zZUV4cGVjdHNFbXB0eUxpbmUgPSB0cnVlIC8vICsgdGFnZ2VkIGVycm9yIHJlc3BvbnNlIGV4cGVjdHMgYW4gZW1wdHkgbGluZSBpbiByZXR1cm5cbiAgICB9IGVsc2Uge1xuICAgICAgY29tbWFuZCA9IHtcbiAgICAgICAgY29tbWFuZDogJ2xvZ2luJyxcbiAgICAgICAgYXR0cmlidXRlczogW1xuICAgICAgICAgIHsgdHlwZTogJ1NUUklORycsIHZhbHVlOiBhdXRoLnVzZXIgfHwgJycgfSxcbiAgICAgICAgICB7IHR5cGU6ICdTVFJJTkcnLCB2YWx1ZTogYXV0aC5wYXNzIHx8ICcnLCBzZW5zaXRpdmU6IHRydWUgfVxuICAgICAgICBdXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0xvZ2dpbmcgaW4uLi4nKVxuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuZXhlYyhjb21tYW5kLCAnY2FwYWJpbGl0eScsIG9wdGlvbnMpXG4gICAgICAvKlxuICAgICAgICogdXBkYXRlIHBvc3QtYXV0aCBjYXBhYmlsaXRlc1xuICAgICAgICogY2FwYWJpbGl0eSBsaXN0IHNob3VsZG4ndCBjb250YWluIGF1dGggcmVsYXRlZCBzdHVmZiBhbnltb3JlXG4gICAgICAgKiBidXQgc29tZSBuZXcgZXh0ZW5zaW9ucyBtaWdodCBoYXZlIHBvcHBlZCB1cCB0aGF0IGRvIG5vdFxuICAgICAgICogbWFrZSBtdWNoIHNlbnNlIGluIHRoZSBub24tYXV0aCBzdGF0ZVxuICAgICAgICovXG4gICAgICBpZiAocmVzcG9uc2UuY2FwYWJpbGl0eSAmJiByZXNwb25zZS5jYXBhYmlsaXR5Lmxlbmd0aCkge1xuICAgICAgICAvLyBjYXBhYmlsaXRlcyB3ZXJlIGxpc3RlZCB3aXRoIHRoZSBPSyBbQ0FQQUJJTElUWSAuLi5dIHJlc3BvbnNlXG4gICAgICAgIHRoaXMuX2NhcGFiaWxpdHkgPSByZXNwb25zZS5jYXBhYmlsaXR5XG4gICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLnBheWxvYWQgJiYgcmVzcG9uc2UucGF5bG9hZC5DQVBBQklMSVRZICYmIHJlc3BvbnNlLnBheWxvYWQuQ0FQQUJJTElUWS5sZW5ndGgpIHtcbiAgICAgICAgLy8gY2FwYWJpbGl0ZXMgd2VyZSBsaXN0ZWQgd2l0aCAqIENBUEFCSUxJVFkgLi4uIHJlc3BvbnNlXG4gICAgICAgIHRoaXMuX2NhcGFiaWxpdHkgPSByZXNwb25zZS5wYXlsb2FkLkNBUEFCSUxJVFkucG9wKCkuYXR0cmlidXRlcy5tYXAoKGNhcGEgPSAnJykgPT4gY2FwYS52YWx1ZS50b1VwcGVyQ2FzZSgpLnRyaW0oKSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGNhcGFiaWxpdGllcyB3ZXJlIG5vdCBhdXRvbWF0aWNhbGx5IGxpc3RlZCwgcmVsb2FkXG4gICAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ2FwYWJpbGl0eSh0cnVlKVxuICAgICAgfVxuXG4gICAgICB0aGlzLl9jaGFuZ2VTdGF0ZShTVEFURV9BVVRIRU5USUNBVEVEKVxuICAgICAgdGhpcy5fYXV0aGVudGljYXRlZCA9IHRydWVcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdMb2dpbiBzdWNjZXNzZnVsLCBwb3N0LWF1dGggY2FwYWJpbGl0ZXMgdXBkYXRlZCEnLCB0aGlzLl9jYXBhYmlsaXR5KVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5fb25FcnJvcihlcnIpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJ1biBhbiBJTUFQIGNvbW1hbmQuXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSByZXF1ZXN0IFN0cnVjdHVyZWQgcmVxdWVzdCBvYmplY3RcbiAgICogQHBhcmFtIHtBcnJheX0gYWNjZXB0VW50YWdnZWQgYSBsaXN0IG9mIHVudGFnZ2VkIHJlc3BvbnNlcyB0aGF0IHdpbGwgYmUgaW5jbHVkZWQgaW4gJ3BheWxvYWQnIHByb3BlcnR5XG4gICAqL1xuICBhc3luYyBleGVjIChyZXF1ZXN0LCBhY2NlcHRVbnRhZ2dlZCwgb3B0aW9ucykge1xuICAgIHRoaXMuYnJlYWtJZGxlKClcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuY2xpZW50LmVucXVldWVDb21tYW5kKHJlcXVlc3QsIGFjY2VwdFVudGFnZ2VkLCBvcHRpb25zKVxuICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5jYXBhYmlsaXR5KSB7XG4gICAgICB0aGlzLl9jYXBhYmlsaXR5ID0gcmVzcG9uc2UuY2FwYWJpbGl0eVxuICAgIH1cbiAgICByZXR1cm4gcmVzcG9uc2VcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgY29ubmVjdGlvbiBpcyBpZGxpbmcuIFNlbmRzIGEgTk9PUCBvciBJRExFIGNvbW1hbmRcbiAgICpcbiAgICogSURMRSBkZXRhaWxzOlxuICAgKiAgIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMyMTc3XG4gICAqL1xuICBhc3luYyBlbnRlcklkbGUgKCkge1xuICAgIGlmICh0aGlzLl9lbnRlcmVkSWRsZSkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIHRoaXMuX2VudGVyZWRJZGxlID0gdGhpcy5fY2FwYWJpbGl0eS5pbmRleE9mKCdJRExFJykgPj0gMCA/ICdJRExFJyA6ICdOT09QJ1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdFbnRlcmluZyBpZGxlIHdpdGggJyArIHRoaXMuX2VudGVyZWRJZGxlKVxuXG4gICAgaWYgKHRoaXMuX2VudGVyZWRJZGxlID09PSAnTk9PUCcpIHtcbiAgICAgIHRoaXMuX2lkbGVUaW1lb3V0ID0gc2V0VGltZW91dChhc3luYyAoKSA9PiB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdTZW5kaW5nIE5PT1AnKVxuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IHRoaXMuZXhlYygnTk9PUCcpXG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIHRoaXMuX29uRXJyb3IoZXJyKVxuICAgICAgICB9XG4gICAgICB9LCB0aGlzLnRpbWVvdXROb29wKVxuICAgIH0gZWxzZSBpZiAodGhpcy5fZW50ZXJlZElkbGUgPT09ICdJRExFJykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgdGhpcy5jbGllbnQuZW5xdWV1ZUNvbW1hbmQoe1xuICAgICAgICAgIGNvbW1hbmQ6ICdJRExFJ1xuICAgICAgICB9KVxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHRoaXMuX29uRXJyb3IoZXJyKVxuICAgICAgfVxuICAgICAgdGhpcy5faWRsZVRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdGhpcy5jbGllbnQuc2VuZCgnRE9ORVxcclxcbicpXG4gICAgICAgIHRoaXMuX2VudGVyZWRJZGxlID0gZmFsc2VcbiAgICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ0lkbGUgdGVybWluYXRlZCcpXG4gICAgICB9LCB0aGlzLnRpbWVvdXRJZGxlKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTdG9wcyBhY3Rpb25zIHJlbGF0ZWQgaWRsaW5nLCBpZiBJRExFIGlzIHN1cHBvcnRlZCwgc2VuZHMgRE9ORSB0byBzdG9wIGl0XG4gICAqL1xuICBicmVha0lkbGUgKCkge1xuICAgIGlmICghdGhpcy5fZW50ZXJlZElkbGUpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNsZWFyVGltZW91dCh0aGlzLl9pZGxlVGltZW91dClcbiAgICBpZiAodGhpcy5fZW50ZXJlZElkbGUgPT09ICdJRExFJykge1xuICAgICAgdGhpcy5jbGllbnQuc2VuZCgnRE9ORVxcclxcbicpXG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnSWRsZSB0ZXJtaW5hdGVkJylcbiAgICB9XG4gICAgdGhpcy5fZW50ZXJlZElkbGUgPSBmYWxzZVxuICB9XG5cbiAgLyoqXG4gICAqIFJ1bnMgU1RBUlRUTFMgY29tbWFuZCBpZiBuZWVkZWRcbiAgICpcbiAgICogU1RBUlRUTFMgZGV0YWlsczpcbiAgICogICBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNTAxI3NlY3Rpb24tNi4yLjFcbiAgICpcbiAgICogQHBhcmFtIHtCb29sZWFufSBbZm9yY2VkXSBCeSBkZWZhdWx0IHRoZSBjb21tYW5kIGlzIG5vdCBydW4gaWYgY2FwYWJpbGl0eSBpcyBhbHJlYWR5IGxpc3RlZC4gU2V0IHRvIHRydWUgdG8gc2tpcCB0aGlzIHZhbGlkYXRpb25cbiAgICovXG4gIGFzeW5jIHVwZ3JhZGVDb25uZWN0aW9uICgpIHtcbiAgICAvLyBza2lwIHJlcXVlc3QsIGlmIGFscmVhZHkgc2VjdXJlZFxuICAgIGlmICh0aGlzLmNsaWVudC5zZWN1cmVNb2RlKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICAvLyBza2lwIGlmIFNUQVJUVExTIG5vdCBhdmFpbGFibGUgb3Igc3RhcnR0bHMgc3VwcG9ydCBkaXNhYmxlZFxuICAgIGlmICgodGhpcy5fY2FwYWJpbGl0eS5pbmRleE9mKCdTVEFSVFRMUycpIDwgMCB8fCB0aGlzLl9pZ25vcmVUTFMpICYmICF0aGlzLl9yZXF1aXJlVExTKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnRW5jcnlwdGluZyBjb25uZWN0aW9uLi4uJylcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5leGVjKCdTVEFSVFRMUycpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLl9vbkVycm9yKGVycilcbiAgICB9XG4gICAgdGhpcy5fY2FwYWJpbGl0eSA9IFtdXG4gICAgdGhpcy5jbGllbnQudXBncmFkZSgpXG4gICAgcmV0dXJuIHRoaXMudXBkYXRlQ2FwYWJpbGl0eSgpXG4gIH1cblxuICAvKipcbiAgICogUnVucyBDQVBBQklMSVRZIGNvbW1hbmRcbiAgICpcbiAgICogQ0FQQUJJTElUWSBkZXRhaWxzOlxuICAgKiAgIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi02LjEuMVxuICAgKlxuICAgKiBEb2Vzbid0IHJlZ2lzdGVyIHVudGFnZ2VkIENBUEFCSUxJVFkgaGFuZGxlciBhcyB0aGlzIGlzIGFscmVhZHlcbiAgICogaGFuZGxlZCBieSBnbG9iYWwgaGFuZGxlclxuICAgKlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtmb3JjZWRdIEJ5IGRlZmF1bHQgdGhlIGNvbW1hbmQgaXMgbm90IHJ1biBpZiBjYXBhYmlsaXR5IGlzIGFscmVhZHkgbGlzdGVkLiBTZXQgdG8gdHJ1ZSB0byBza2lwIHRoaXMgdmFsaWRhdGlvblxuICAgKi9cbiAgYXN5bmMgdXBkYXRlQ2FwYWJpbGl0eSAoZm9yY2VkKSB7XG4gICAgLy8gc2tpcCByZXF1ZXN0LCBpZiBub3QgZm9yY2VkIHVwZGF0ZSBhbmQgY2FwYWJpbGl0aWVzIGFyZSBhbHJlYWR5IGxvYWRlZFxuICAgIGlmICghZm9yY2VkICYmIHRoaXMuX2NhcGFiaWxpdHkubGVuZ3RoKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBJZiBTVEFSVFRMUyBpcyByZXF1aXJlZCB0aGVuIHNraXAgY2FwYWJpbGl0eSBsaXN0aW5nIGFzIHdlIGFyZSBnb2luZyB0byB0cnlcbiAgICAvLyBTVEFSVFRMUyBhbnl3YXkgYW5kIHdlIHJlLWNoZWNrIGNhcGFiaWxpdGllcyBhZnRlciBjb25uZWN0aW9uIGlzIHNlY3VyZWRcbiAgICBpZiAoIXRoaXMuY2xpZW50LnNlY3VyZU1vZGUgJiYgdGhpcy5fcmVxdWlyZVRMUykge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ1VwZGF0aW5nIGNhcGFiaWxpdHkuLi4nKVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBjYXBSZXNwb25zZSA9IHRoaXMuZXhlYygnQ0FQQUJJTElUWScpXG4gICAgICByZXR1cm4gY2FwUmVzcG9uc2VcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuX29uRXJyb3IoZXJyKVxuICAgIH1cbiAgfVxuXG4gIGhhc0NhcGFiaWxpdHkgKGNhcGEgPSAnJykge1xuICAgIHJldHVybiB0aGlzLl9jYXBhYmlsaXR5LmluZGV4T2YoY2FwYS50b1VwcGVyQ2FzZSgpLnRyaW0oKSkgPj0gMFxuICB9XG5cbiAgLy8gRGVmYXVsdCBoYW5kbGVycyBmb3IgdW50YWdnZWQgcmVzcG9uc2VzXG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiBhbiB1bnRhZ2dlZCBPSyBpbmNsdWRlcyBbQ0FQQUJJTElUWV0gdGFnIGFuZCB1cGRhdGVzIGNhcGFiaWxpdHkgb2JqZWN0XG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSBQYXJzZWQgc2VydmVyIHJlc3BvbnNlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG5leHQgVW50aWwgY2FsbGVkLCBzZXJ2ZXIgcmVzcG9uc2VzIGFyZSBub3QgcHJvY2Vzc2VkXG4gICAqL1xuICBfdW50YWdnZWRPa0hhbmRsZXIgKHJlc3BvbnNlKSB7XG4gICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmNhcGFiaWxpdHkpIHtcbiAgICAgIHRoaXMuX2NhcGFiaWxpdHkgPSByZXNwb25zZS5jYXBhYmlsaXR5XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgY2FwYWJpbGl0eSBvYmplY3RcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIFBhcnNlZCBzZXJ2ZXIgcmVzcG9uc2VcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gbmV4dCBVbnRpbCBjYWxsZWQsIHNlcnZlciByZXNwb25zZXMgYXJlIG5vdCBwcm9jZXNzZWRcbiAgICovXG4gIF91bnRhZ2dlZENhcGFiaWxpdHlIYW5kbGVyIChyZXNwb25zZSkge1xuICAgIHRoaXMuX2NhcGFiaWxpdHkgPSBwaXBlKFxuICAgICAgcHJvcE9yKFtdLCAnYXR0cmlidXRlcycpLFxuICAgICAgbWFwKCh7IHZhbHVlIH0pID0+ICh2YWx1ZSB8fCAnJykudG9VcHBlckNhc2UoKS50cmltKCkpXG4gICAgKShyZXNwb25zZSlcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIGV4aXN0aW5nIG1lc3NhZ2UgY291bnRcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIFBhcnNlZCBzZXJ2ZXIgcmVzcG9uc2VcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gbmV4dCBVbnRpbCBjYWxsZWQsIHNlcnZlciByZXNwb25zZXMgYXJlIG5vdCBwcm9jZXNzZWRcbiAgICovXG4gIF91bnRhZ2dlZEV4aXN0c0hhbmRsZXIgKHJlc3BvbnNlKSB7XG4gICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmhhc093blByb3BlcnR5KCducicpKSB7XG4gICAgICB0aGlzLm9udXBkYXRlICYmIHRoaXMub251cGRhdGUodGhpcy5fc2VsZWN0ZWRNYWlsYm94LCAnZXhpc3RzJywgcmVzcG9uc2UubnIpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEluZGljYXRlcyBhIG1lc3NhZ2UgaGFzIGJlZW4gZGVsZXRlZFxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgUGFyc2VkIHNlcnZlciByZXNwb25zZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBuZXh0IFVudGlsIGNhbGxlZCwgc2VydmVyIHJlc3BvbnNlcyBhcmUgbm90IHByb2Nlc3NlZFxuICAgKi9cbiAgX3VudGFnZ2VkRXhwdW5nZUhhbmRsZXIgKHJlc3BvbnNlKSB7XG4gICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmhhc093blByb3BlcnR5KCducicpKSB7XG4gICAgICB0aGlzLm9udXBkYXRlICYmIHRoaXMub251cGRhdGUodGhpcy5fc2VsZWN0ZWRNYWlsYm94LCAnZXhwdW5nZScsIHJlc3BvbnNlLm5yKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgdGhhdCBmbGFncyBoYXZlIGJlZW4gdXBkYXRlZCBmb3IgYSBtZXNzYWdlXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSBQYXJzZWQgc2VydmVyIHJlc3BvbnNlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG5leHQgVW50aWwgY2FsbGVkLCBzZXJ2ZXIgcmVzcG9uc2VzIGFyZSBub3QgcHJvY2Vzc2VkXG4gICAqL1xuICBfdW50YWdnZWRGZXRjaEhhbmRsZXIgKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5vbnVwZGF0ZSAmJiB0aGlzLm9udXBkYXRlKHRoaXMuX3NlbGVjdGVkTWFpbGJveCwgJ2ZldGNoJywgW10uY29uY2F0KHBhcnNlRkVUQ0goeyBwYXlsb2FkOiB7IEZFVENIOiBbcmVzcG9uc2VdIH0gfSkgfHwgW10pLnNoaWZ0KCkpXG4gIH1cblxuICAvLyBQcml2YXRlIGhlbHBlcnNcblxuICAvKipcbiAgICogSW5kaWNhdGVzIHRoYXQgdGhlIGNvbm5lY3Rpb24gc3RhcnRlZCBpZGxpbmcuIEluaXRpYXRlcyBhIGN5Y2xlXG4gICAqIG9mIE5PT1BzIG9yIElETEVzIHRvIHJlY2VpdmUgbm90aWZpY2F0aW9ucyBhYm91dCB1cGRhdGVzIGluIHRoZSBzZXJ2ZXJcbiAgICovXG4gIF9vbklkbGUgKCkge1xuICAgIGlmICghdGhpcy5fYXV0aGVudGljYXRlZCB8fCB0aGlzLl9lbnRlcmVkSWRsZSkge1xuICAgICAgLy8gTm8gbmVlZCB0byBJRExFIHdoZW4gbm90IGxvZ2dlZCBpbiBvciBhbHJlYWR5IGlkbGluZ1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0NsaWVudCBzdGFydGVkIGlkbGluZycpXG4gICAgdGhpcy5lbnRlcklkbGUoKVxuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIElNQVAgc3RhdGUgdmFsdWUgZm9yIHRoZSBjdXJyZW50IGNvbm5lY3Rpb25cbiAgICpcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG5ld1N0YXRlIFRoZSBzdGF0ZSB5b3Ugd2FudCB0byBjaGFuZ2UgdG9cbiAgICovXG4gIF9jaGFuZ2VTdGF0ZSAobmV3U3RhdGUpIHtcbiAgICBpZiAobmV3U3RhdGUgPT09IHRoaXMuX3N0YXRlKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnRW50ZXJpbmcgc3RhdGU6ICcgKyBuZXdTdGF0ZSlcblxuICAgIC8vIGlmIGEgbWFpbGJveCB3YXMgb3BlbmVkLCBlbWl0IG9uY2xvc2VtYWlsYm94IGFuZCBjbGVhciBzZWxlY3RlZE1haWxib3ggdmFsdWVcbiAgICBpZiAodGhpcy5fc3RhdGUgPT09IFNUQVRFX1NFTEVDVEVEICYmIHRoaXMuX3NlbGVjdGVkTWFpbGJveCkge1xuICAgICAgdGhpcy5vbmNsb3NlbWFpbGJveCAmJiB0aGlzLm9uY2xvc2VtYWlsYm94KHRoaXMuX3NlbGVjdGVkTWFpbGJveClcbiAgICAgIHRoaXMuX3NlbGVjdGVkTWFpbGJveCA9IGZhbHNlXG4gICAgfVxuXG4gICAgdGhpcy5fc3RhdGUgPSBuZXdTdGF0ZVxuICB9XG5cbiAgLyoqXG4gICAqIEVuc3VyZXMgYSBwYXRoIGV4aXN0cyBpbiB0aGUgTWFpbGJveCB0cmVlXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSB0cmVlIE1haWxib3ggdHJlZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgKiBAcGFyYW0ge1N0cmluZ30gZGVsaW1pdGVyXG4gICAqIEByZXR1cm4ge09iamVjdH0gYnJhbmNoIGZvciB1c2VkIHBhdGhcbiAgICovXG4gIF9lbnN1cmVQYXRoICh0cmVlLCBwYXRoLCBkZWxpbWl0ZXIpIHtcbiAgICBjb25zdCBuYW1lcyA9IHBhdGguc3BsaXQoZGVsaW1pdGVyKVxuICAgIGxldCBicmFuY2ggPSB0cmVlXG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZXQgZm91bmQgPSBmYWxzZVxuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBicmFuY2guY2hpbGRyZW4ubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYgKHRoaXMuX2NvbXBhcmVNYWlsYm94TmFtZXMoYnJhbmNoLmNoaWxkcmVuW2pdLm5hbWUsIGltYXBEZWNvZGUobmFtZXNbaV0pKSkge1xuICAgICAgICAgIGJyYW5jaCA9IGJyYW5jaC5jaGlsZHJlbltqXVxuICAgICAgICAgIGZvdW5kID0gdHJ1ZVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgYnJhbmNoLmNoaWxkcmVuLnB1c2goe1xuICAgICAgICAgIG5hbWU6IGltYXBEZWNvZGUobmFtZXNbaV0pLFxuICAgICAgICAgIGRlbGltaXRlcjogZGVsaW1pdGVyLFxuICAgICAgICAgIHBhdGg6IG5hbWVzLnNsaWNlKDAsIGkgKyAxKS5qb2luKGRlbGltaXRlciksXG4gICAgICAgICAgY2hpbGRyZW46IFtdXG4gICAgICAgIH0pXG4gICAgICAgIGJyYW5jaCA9IGJyYW5jaC5jaGlsZHJlblticmFuY2guY2hpbGRyZW4ubGVuZ3RoIC0gMV1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGJyYW5jaFxuICB9XG5cbiAgLyoqXG4gICAqIENvbXBhcmVzIHR3byBtYWlsYm94IG5hbWVzLiBDYXNlIGluc2Vuc2l0aXZlIGluIGNhc2Ugb2YgSU5CT1gsIG90aGVyd2lzZSBjYXNlIHNlbnNpdGl2ZVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gYSBNYWlsYm94IG5hbWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IGIgTWFpbGJveCBuYW1lXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBmb2xkZXIgbmFtZXMgbWF0Y2hcbiAgICovXG4gIF9jb21wYXJlTWFpbGJveE5hbWVzIChhLCBiKSB7XG4gICAgcmV0dXJuIChhLnRvVXBwZXJDYXNlKCkgPT09ICdJTkJPWCcgPyAnSU5CT1gnIDogYSkgPT09IChiLnRvVXBwZXJDYXNlKCkgPT09ICdJTkJPWCcgPyAnSU5CT1gnIDogYilcbiAgfVxuXG4gIGNyZWF0ZUxvZ2dlciAoY3JlYXRvciA9IGNyZWF0ZURlZmF1bHRMb2dnZXIpIHtcbiAgICBjb25zdCBsb2dnZXIgPSBjcmVhdG9yKCh0aGlzLl9hdXRoIHx8IHt9KS51c2VyIHx8ICcnLCB0aGlzLl9ob3N0KVxuICAgIHRoaXMubG9nZ2VyID0gdGhpcy5jbGllbnQubG9nZ2VyID0ge1xuICAgICAgZGVidWc6ICguLi5tc2dzKSA9PiB7IGlmIChMT0dfTEVWRUxfREVCVUcgPj0gdGhpcy5sb2dMZXZlbCkgeyBsb2dnZXIuZGVidWcobXNncykgfSB9LFxuICAgICAgaW5mbzogKC4uLm1zZ3MpID0+IHsgaWYgKExPR19MRVZFTF9JTkZPID49IHRoaXMubG9nTGV2ZWwpIHsgbG9nZ2VyLmluZm8obXNncykgfSB9LFxuICAgICAgd2FybjogKC4uLm1zZ3MpID0+IHsgaWYgKExPR19MRVZFTF9XQVJOID49IHRoaXMubG9nTGV2ZWwpIHsgbG9nZ2VyLndhcm4obXNncykgfSB9LFxuICAgICAgZXJyb3I6ICguLi5tc2dzKSA9PiB7IGlmIChMT0dfTEVWRUxfRVJST1IgPj0gdGhpcy5sb2dMZXZlbCkgeyBsb2dnZXIuZXJyb3IobXNncykgfSB9XG4gICAgfVxuICB9XG59XG4iXX0=