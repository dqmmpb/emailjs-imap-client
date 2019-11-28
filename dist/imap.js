"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _ramda = require("ramda");

var _emailjsTcpSocket = _interopRequireDefault(require("emailjs-tcp-socket"));

var _common = require("./common");

var _emailjsImapHandler = require("emailjs-imap-handler");

var _compression = _interopRequireDefault(require("./compression"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* babel-plugin-inline-import '../res/compression.worker.blob' */
const CompressionBlob = "!function(e){var t={};function a(n){if(t[n])return t[n].exports;var i=t[n]={i:n,l:!1,exports:{}};return e[n].call(i.exports,i,i.exports,a),i.l=!0,i.exports}a.m=e,a.c=t,a.d=function(e,t,n){a.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:n})},a.r=function(e){\"undefined\"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:\"Module\"}),Object.defineProperty(e,\"__esModule\",{value:!0})},a.t=function(e,t){if(1&t&&(e=a(e)),8&t)return e;if(4&t&&\"object\"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(a.r(n),Object.defineProperty(n,\"default\",{enumerable:!0,value:e}),2&t&&\"string\"!=typeof e)for(var i in e)a.d(n,i,function(t){return e[t]}.bind(null,i));return n},a.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return a.d(t,\"a\",t),t},a.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},a.p=\"\",a(a.s=11)}([function(e,t,a){\"use strict\";e.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},function(e,t,a){\"use strict\";e.exports={2:\"need dictionary\",1:\"stream end\",0:\"\",\"-1\":\"file error\",\"-2\":\"stream error\",\"-3\":\"data error\",\"-4\":\"insufficient memory\",\"-5\":\"buffer error\",\"-6\":\"incompatible version\"}},function(e,t,a){\"use strict\";var n=\"undefined\"!=typeof Uint8Array&&\"undefined\"!=typeof Uint16Array&&\"undefined\"!=typeof Int32Array;function i(e,t){return Object.prototype.hasOwnProperty.call(e,t)}t.assign=function(e){for(var t=Array.prototype.slice.call(arguments,1);t.length;){var a=t.shift();if(a){if(\"object\"!=typeof a)throw new TypeError(a+\"must be non-object\");for(var n in a)i(a,n)&&(e[n]=a[n])}}return e},t.shrinkBuf=function(e,t){return e.length===t?e:e.subarray?e.subarray(0,t):(e.length=t,e)};var r={arraySet:function(e,t,a,n,i){if(t.subarray&&e.subarray)e.set(t.subarray(a,a+n),i);else for(var r=0;r<n;r++)e[i+r]=t[a+r]},flattenChunks:function(e){var t,a,n,i,r,s;for(n=0,t=0,a=e.length;t<a;t++)n+=e[t].length;for(s=new Uint8Array(n),i=0,t=0,a=e.length;t<a;t++)r=e[t],s.set(r,i),i+=r.length;return s}},s={arraySet:function(e,t,a,n,i){for(var r=0;r<n;r++)e[i+r]=t[a+r]},flattenChunks:function(e){return[].concat.apply([],e)}};t.setTyped=function(e){e?(t.Buf8=Uint8Array,t.Buf16=Uint16Array,t.Buf32=Int32Array,t.assign(t,r)):(t.Buf8=Array,t.Buf16=Array,t.Buf32=Array,t.assign(t,s))},t.setTyped(n)},function(e,t,a){\"use strict\";e.exports=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg=\"\",this.state=null,this.data_type=2,this.adler=0}},function(e,t,a){\"use strict\";var n,i=a(2),r=a(8),s=a(6),l=a(7),o=a(1),h=0,d=1,_=3,f=4,u=5,c=0,b=1,g=-2,m=-3,w=-5,p=-1,v=1,k=2,y=3,x=4,z=0,S=2,E=8,A=9,Z=15,O=8,R=286,B=30,T=19,N=2*R+1,D=15,U=3,I=258,F=I+U+1,L=32,M=42,j=69,C=73,P=91,H=103,K=113,Y=666,G=1,X=2,W=3,q=4,J=3;function Q(e,t){return e.msg=o[t],t}function V(e){return(e<<1)-(e>4?9:0)}function $(e){for(var t=e.length;--t>=0;)e[t]=0}function ee(e){var t=e.state,a=t.pending;a>e.avail_out&&(a=e.avail_out),0!==a&&(i.arraySet(e.output,t.pending_buf,t.pending_out,a,e.next_out),e.next_out+=a,t.pending_out+=a,e.total_out+=a,e.avail_out-=a,t.pending-=a,0===t.pending&&(t.pending_out=0))}function te(e,t){r._tr_flush_block(e,e.block_start>=0?e.block_start:-1,e.strstart-e.block_start,t),e.block_start=e.strstart,ee(e.strm)}function ae(e,t){e.pending_buf[e.pending++]=t}function ne(e,t){e.pending_buf[e.pending++]=t>>>8&255,e.pending_buf[e.pending++]=255&t}function ie(e,t){var a,n,i=e.max_chain_length,r=e.strstart,s=e.prev_length,l=e.nice_match,o=e.strstart>e.w_size-F?e.strstart-(e.w_size-F):0,h=e.window,d=e.w_mask,_=e.prev,f=e.strstart+I,u=h[r+s-1],c=h[r+s];e.prev_length>=e.good_match&&(i>>=2),l>e.lookahead&&(l=e.lookahead);do{if(h[(a=t)+s]===c&&h[a+s-1]===u&&h[a]===h[r]&&h[++a]===h[r+1]){r+=2,a++;do{}while(h[++r]===h[++a]&&h[++r]===h[++a]&&h[++r]===h[++a]&&h[++r]===h[++a]&&h[++r]===h[++a]&&h[++r]===h[++a]&&h[++r]===h[++a]&&h[++r]===h[++a]&&r<f);if(n=I-(f-r),r=f-I,n>s){if(e.match_start=t,s=n,n>=l)break;u=h[r+s-1],c=h[r+s]}}}while((t=_[t&d])>o&&0!=--i);return s<=e.lookahead?s:e.lookahead}function re(e){var t,a,n,r,o,h,d,_,f,u,c=e.w_size;do{if(r=e.window_size-e.lookahead-e.strstart,e.strstart>=c+(c-F)){i.arraySet(e.window,e.window,c,c,0),e.match_start-=c,e.strstart-=c,e.block_start-=c,t=a=e.hash_size;do{n=e.head[--t],e.head[t]=n>=c?n-c:0}while(--a);t=a=c;do{n=e.prev[--t],e.prev[t]=n>=c?n-c:0}while(--a);r+=c}if(0===e.strm.avail_in)break;if(h=e.strm,d=e.window,_=e.strstart+e.lookahead,f=r,u=void 0,(u=h.avail_in)>f&&(u=f),a=0===u?0:(h.avail_in-=u,i.arraySet(d,h.input,h.next_in,u,_),1===h.state.wrap?h.adler=s(h.adler,d,u,_):2===h.state.wrap&&(h.adler=l(h.adler,d,u,_)),h.next_in+=u,h.total_in+=u,u),e.lookahead+=a,e.lookahead+e.insert>=U)for(o=e.strstart-e.insert,e.ins_h=e.window[o],e.ins_h=(e.ins_h<<e.hash_shift^e.window[o+1])&e.hash_mask;e.insert&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[o+U-1])&e.hash_mask,e.prev[o&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=o,o++,e.insert--,!(e.lookahead+e.insert<U)););}while(e.lookahead<F&&0!==e.strm.avail_in)}function se(e,t){for(var a,n;;){if(e.lookahead<F){if(re(e),e.lookahead<F&&t===h)return G;if(0===e.lookahead)break}if(a=0,e.lookahead>=U&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+U-1])&e.hash_mask,a=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!==a&&e.strstart-a<=e.w_size-F&&(e.match_length=ie(e,a)),e.match_length>=U)if(n=r._tr_tally(e,e.strstart-e.match_start,e.match_length-U),e.lookahead-=e.match_length,e.match_length<=e.max_lazy_match&&e.lookahead>=U){e.match_length--;do{e.strstart++,e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+U-1])&e.hash_mask,a=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart}while(0!=--e.match_length);e.strstart++}else e.strstart+=e.match_length,e.match_length=0,e.ins_h=e.window[e.strstart],e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+1])&e.hash_mask;else n=r._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++;if(n&&(te(e,!1),0===e.strm.avail_out))return G}return e.insert=e.strstart<U-1?e.strstart:U-1,t===f?(te(e,!0),0===e.strm.avail_out?W:q):e.last_lit&&(te(e,!1),0===e.strm.avail_out)?G:X}function le(e,t){for(var a,n,i;;){if(e.lookahead<F){if(re(e),e.lookahead<F&&t===h)return G;if(0===e.lookahead)break}if(a=0,e.lookahead>=U&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+U-1])&e.hash_mask,a=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),e.prev_length=e.match_length,e.prev_match=e.match_start,e.match_length=U-1,0!==a&&e.prev_length<e.max_lazy_match&&e.strstart-a<=e.w_size-F&&(e.match_length=ie(e,a),e.match_length<=5&&(e.strategy===v||e.match_length===U&&e.strstart-e.match_start>4096)&&(e.match_length=U-1)),e.prev_length>=U&&e.match_length<=e.prev_length){i=e.strstart+e.lookahead-U,n=r._tr_tally(e,e.strstart-1-e.prev_match,e.prev_length-U),e.lookahead-=e.prev_length-1,e.prev_length-=2;do{++e.strstart<=i&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+U-1])&e.hash_mask,a=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart)}while(0!=--e.prev_length);if(e.match_available=0,e.match_length=U-1,e.strstart++,n&&(te(e,!1),0===e.strm.avail_out))return G}else if(e.match_available){if((n=r._tr_tally(e,0,e.window[e.strstart-1]))&&te(e,!1),e.strstart++,e.lookahead--,0===e.strm.avail_out)return G}else e.match_available=1,e.strstart++,e.lookahead--}return e.match_available&&(n=r._tr_tally(e,0,e.window[e.strstart-1]),e.match_available=0),e.insert=e.strstart<U-1?e.strstart:U-1,t===f?(te(e,!0),0===e.strm.avail_out?W:q):e.last_lit&&(te(e,!1),0===e.strm.avail_out)?G:X}function oe(e,t,a,n,i){this.good_length=e,this.max_lazy=t,this.nice_length=a,this.max_chain=n,this.func=i}function he(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=E,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new i.Buf16(2*N),this.dyn_dtree=new i.Buf16(2*(2*B+1)),this.bl_tree=new i.Buf16(2*(2*T+1)),$(this.dyn_ltree),$(this.dyn_dtree),$(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new i.Buf16(D+1),this.heap=new i.Buf16(2*R+1),$(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new i.Buf16(2*R+1),$(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}function de(e){var t;return e&&e.state?(e.total_in=e.total_out=0,e.data_type=S,(t=e.state).pending=0,t.pending_out=0,t.wrap<0&&(t.wrap=-t.wrap),t.status=t.wrap?M:K,e.adler=2===t.wrap?0:1,t.last_flush=h,r._tr_init(t),c):Q(e,g)}function _e(e){var t,a=de(e);return a===c&&((t=e.state).window_size=2*t.w_size,$(t.head),t.max_lazy_match=n[t.level].max_lazy,t.good_match=n[t.level].good_length,t.nice_match=n[t.level].nice_length,t.max_chain_length=n[t.level].max_chain,t.strstart=0,t.block_start=0,t.lookahead=0,t.insert=0,t.match_length=t.prev_length=U-1,t.match_available=0,t.ins_h=0),a}function fe(e,t,a,n,r,s){if(!e)return g;var l=1;if(t===p&&(t=6),n<0?(l=0,n=-n):n>15&&(l=2,n-=16),r<1||r>A||a!==E||n<8||n>15||t<0||t>9||s<0||s>x)return Q(e,g);8===n&&(n=9);var o=new he;return e.state=o,o.strm=e,o.wrap=l,o.gzhead=null,o.w_bits=n,o.w_size=1<<o.w_bits,o.w_mask=o.w_size-1,o.hash_bits=r+7,o.hash_size=1<<o.hash_bits,o.hash_mask=o.hash_size-1,o.hash_shift=~~((o.hash_bits+U-1)/U),o.window=new i.Buf8(2*o.w_size),o.head=new i.Buf16(o.hash_size),o.prev=new i.Buf16(o.w_size),o.lit_bufsize=1<<r+6,o.pending_buf_size=4*o.lit_bufsize,o.pending_buf=new i.Buf8(o.pending_buf_size),o.d_buf=1*o.lit_bufsize,o.l_buf=3*o.lit_bufsize,o.level=t,o.strategy=s,o.method=a,_e(e)}n=[new oe(0,0,0,0,function(e,t){var a=65535;for(a>e.pending_buf_size-5&&(a=e.pending_buf_size-5);;){if(e.lookahead<=1){if(re(e),0===e.lookahead&&t===h)return G;if(0===e.lookahead)break}e.strstart+=e.lookahead,e.lookahead=0;var n=e.block_start+a;if((0===e.strstart||e.strstart>=n)&&(e.lookahead=e.strstart-n,e.strstart=n,te(e,!1),0===e.strm.avail_out))return G;if(e.strstart-e.block_start>=e.w_size-F&&(te(e,!1),0===e.strm.avail_out))return G}return e.insert=0,t===f?(te(e,!0),0===e.strm.avail_out?W:q):(e.strstart>e.block_start&&(te(e,!1),e.strm.avail_out),G)}),new oe(4,4,8,4,se),new oe(4,5,16,8,se),new oe(4,6,32,32,se),new oe(4,4,16,16,le),new oe(8,16,32,32,le),new oe(8,16,128,128,le),new oe(8,32,128,256,le),new oe(32,128,258,1024,le),new oe(32,258,258,4096,le)],t.deflateInit=function(e,t){return fe(e,t,E,Z,O,z)},t.deflateInit2=fe,t.deflateReset=_e,t.deflateResetKeep=de,t.deflateSetHeader=function(e,t){return e&&e.state?2!==e.state.wrap?g:(e.state.gzhead=t,c):g},t.deflate=function(e,t){var a,i,s,o;if(!e||!e.state||t>u||t<0)return e?Q(e,g):g;if(i=e.state,!e.output||!e.input&&0!==e.avail_in||i.status===Y&&t!==f)return Q(e,0===e.avail_out?w:g);if(i.strm=e,a=i.last_flush,i.last_flush=t,i.status===M)if(2===i.wrap)e.adler=0,ae(i,31),ae(i,139),ae(i,8),i.gzhead?(ae(i,(i.gzhead.text?1:0)+(i.gzhead.hcrc?2:0)+(i.gzhead.extra?4:0)+(i.gzhead.name?8:0)+(i.gzhead.comment?16:0)),ae(i,255&i.gzhead.time),ae(i,i.gzhead.time>>8&255),ae(i,i.gzhead.time>>16&255),ae(i,i.gzhead.time>>24&255),ae(i,9===i.level?2:i.strategy>=k||i.level<2?4:0),ae(i,255&i.gzhead.os),i.gzhead.extra&&i.gzhead.extra.length&&(ae(i,255&i.gzhead.extra.length),ae(i,i.gzhead.extra.length>>8&255)),i.gzhead.hcrc&&(e.adler=l(e.adler,i.pending_buf,i.pending,0)),i.gzindex=0,i.status=j):(ae(i,0),ae(i,0),ae(i,0),ae(i,0),ae(i,0),ae(i,9===i.level?2:i.strategy>=k||i.level<2?4:0),ae(i,J),i.status=K);else{var m=E+(i.w_bits-8<<4)<<8;m|=(i.strategy>=k||i.level<2?0:i.level<6?1:6===i.level?2:3)<<6,0!==i.strstart&&(m|=L),m+=31-m%31,i.status=K,ne(i,m),0!==i.strstart&&(ne(i,e.adler>>>16),ne(i,65535&e.adler)),e.adler=1}if(i.status===j)if(i.gzhead.extra){for(s=i.pending;i.gzindex<(65535&i.gzhead.extra.length)&&(i.pending!==i.pending_buf_size||(i.gzhead.hcrc&&i.pending>s&&(e.adler=l(e.adler,i.pending_buf,i.pending-s,s)),ee(e),s=i.pending,i.pending!==i.pending_buf_size));)ae(i,255&i.gzhead.extra[i.gzindex]),i.gzindex++;i.gzhead.hcrc&&i.pending>s&&(e.adler=l(e.adler,i.pending_buf,i.pending-s,s)),i.gzindex===i.gzhead.extra.length&&(i.gzindex=0,i.status=C)}else i.status=C;if(i.status===C)if(i.gzhead.name){s=i.pending;do{if(i.pending===i.pending_buf_size&&(i.gzhead.hcrc&&i.pending>s&&(e.adler=l(e.adler,i.pending_buf,i.pending-s,s)),ee(e),s=i.pending,i.pending===i.pending_buf_size)){o=1;break}o=i.gzindex<i.gzhead.name.length?255&i.gzhead.name.charCodeAt(i.gzindex++):0,ae(i,o)}while(0!==o);i.gzhead.hcrc&&i.pending>s&&(e.adler=l(e.adler,i.pending_buf,i.pending-s,s)),0===o&&(i.gzindex=0,i.status=P)}else i.status=P;if(i.status===P)if(i.gzhead.comment){s=i.pending;do{if(i.pending===i.pending_buf_size&&(i.gzhead.hcrc&&i.pending>s&&(e.adler=l(e.adler,i.pending_buf,i.pending-s,s)),ee(e),s=i.pending,i.pending===i.pending_buf_size)){o=1;break}o=i.gzindex<i.gzhead.comment.length?255&i.gzhead.comment.charCodeAt(i.gzindex++):0,ae(i,o)}while(0!==o);i.gzhead.hcrc&&i.pending>s&&(e.adler=l(e.adler,i.pending_buf,i.pending-s,s)),0===o&&(i.status=H)}else i.status=H;if(i.status===H&&(i.gzhead.hcrc?(i.pending+2>i.pending_buf_size&&ee(e),i.pending+2<=i.pending_buf_size&&(ae(i,255&e.adler),ae(i,e.adler>>8&255),e.adler=0,i.status=K)):i.status=K),0!==i.pending){if(ee(e),0===e.avail_out)return i.last_flush=-1,c}else if(0===e.avail_in&&V(t)<=V(a)&&t!==f)return Q(e,w);if(i.status===Y&&0!==e.avail_in)return Q(e,w);if(0!==e.avail_in||0!==i.lookahead||t!==h&&i.status!==Y){var p=i.strategy===k?function(e,t){for(var a;;){if(0===e.lookahead&&(re(e),0===e.lookahead)){if(t===h)return G;break}if(e.match_length=0,a=r._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++,a&&(te(e,!1),0===e.strm.avail_out))return G}return e.insert=0,t===f?(te(e,!0),0===e.strm.avail_out?W:q):e.last_lit&&(te(e,!1),0===e.strm.avail_out)?G:X}(i,t):i.strategy===y?function(e,t){for(var a,n,i,s,l=e.window;;){if(e.lookahead<=I){if(re(e),e.lookahead<=I&&t===h)return G;if(0===e.lookahead)break}if(e.match_length=0,e.lookahead>=U&&e.strstart>0&&(n=l[i=e.strstart-1])===l[++i]&&n===l[++i]&&n===l[++i]){s=e.strstart+I;do{}while(n===l[++i]&&n===l[++i]&&n===l[++i]&&n===l[++i]&&n===l[++i]&&n===l[++i]&&n===l[++i]&&n===l[++i]&&i<s);e.match_length=I-(s-i),e.match_length>e.lookahead&&(e.match_length=e.lookahead)}if(e.match_length>=U?(a=r._tr_tally(e,1,e.match_length-U),e.lookahead-=e.match_length,e.strstart+=e.match_length,e.match_length=0):(a=r._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++),a&&(te(e,!1),0===e.strm.avail_out))return G}return e.insert=0,t===f?(te(e,!0),0===e.strm.avail_out?W:q):e.last_lit&&(te(e,!1),0===e.strm.avail_out)?G:X}(i,t):n[i.level].func(i,t);if(p!==W&&p!==q||(i.status=Y),p===G||p===W)return 0===e.avail_out&&(i.last_flush=-1),c;if(p===X&&(t===d?r._tr_align(i):t!==u&&(r._tr_stored_block(i,0,0,!1),t===_&&($(i.head),0===i.lookahead&&(i.strstart=0,i.block_start=0,i.insert=0))),ee(e),0===e.avail_out))return i.last_flush=-1,c}return t!==f?c:i.wrap<=0?b:(2===i.wrap?(ae(i,255&e.adler),ae(i,e.adler>>8&255),ae(i,e.adler>>16&255),ae(i,e.adler>>24&255),ae(i,255&e.total_in),ae(i,e.total_in>>8&255),ae(i,e.total_in>>16&255),ae(i,e.total_in>>24&255)):(ne(i,e.adler>>>16),ne(i,65535&e.adler)),ee(e),i.wrap>0&&(i.wrap=-i.wrap),0!==i.pending?c:b)},t.deflateEnd=function(e){var t;return e&&e.state?(t=e.state.status)!==M&&t!==j&&t!==C&&t!==P&&t!==H&&t!==K&&t!==Y?Q(e,g):(e.state=null,t===K?Q(e,m):c):g},t.deflateSetDictionary=function(e,t){var a,n,r,l,o,h,d,_,f=t.length;if(!e||!e.state)return g;if(2===(l=(a=e.state).wrap)||1===l&&a.status!==M||a.lookahead)return g;for(1===l&&(e.adler=s(e.adler,t,f,0)),a.wrap=0,f>=a.w_size&&(0===l&&($(a.head),a.strstart=0,a.block_start=0,a.insert=0),_=new i.Buf8(a.w_size),i.arraySet(_,t,f-a.w_size,a.w_size,0),t=_,f=a.w_size),o=e.avail_in,h=e.next_in,d=e.input,e.avail_in=f,e.next_in=0,e.input=t,re(a);a.lookahead>=U;){n=a.strstart,r=a.lookahead-(U-1);do{a.ins_h=(a.ins_h<<a.hash_shift^a.window[n+U-1])&a.hash_mask,a.prev[n&a.w_mask]=a.head[a.ins_h],a.head[a.ins_h]=n,n++}while(--r);a.strstart=n,a.lookahead=U-1,re(a)}return a.strstart+=a.lookahead,a.block_start=a.strstart,a.insert=a.lookahead,a.lookahead=0,a.match_length=a.prev_length=U-1,a.match_available=0,e.next_in=h,e.input=d,e.avail_in=o,a.wrap=l,c},t.deflateInfo=\"pako deflate (from Nodeca project)\"},function(e,t,a){\"use strict\";var n=a(2),i=a(6),r=a(7),s=a(9),l=a(10),o=0,h=1,d=2,_=4,f=5,u=6,c=0,b=1,g=2,m=-2,w=-3,p=-4,v=-5,k=8,y=1,x=2,z=3,S=4,E=5,A=6,Z=7,O=8,R=9,B=10,T=11,N=12,D=13,U=14,I=15,F=16,L=17,M=18,j=19,C=20,P=21,H=22,K=23,Y=24,G=25,X=26,W=27,q=28,J=29,Q=30,V=31,$=32,ee=852,te=592,ae=15;function ne(e){return(e>>>24&255)+(e>>>8&65280)+((65280&e)<<8)+((255&e)<<24)}function ie(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new n.Buf16(320),this.work=new n.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function re(e){var t;return e&&e.state?(t=e.state,e.total_in=e.total_out=t.total=0,e.msg=\"\",t.wrap&&(e.adler=1&t.wrap),t.mode=y,t.last=0,t.havedict=0,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new n.Buf32(ee),t.distcode=t.distdyn=new n.Buf32(te),t.sane=1,t.back=-1,c):m}function se(e){var t;return e&&e.state?((t=e.state).wsize=0,t.whave=0,t.wnext=0,re(e)):m}function le(e,t){var a,n;return e&&e.state?(n=e.state,t<0?(a=0,t=-t):(a=1+(t>>4),t<48&&(t&=15)),t&&(t<8||t>15)?m:(null!==n.window&&n.wbits!==t&&(n.window=null),n.wrap=a,n.wbits=t,se(e))):m}function oe(e,t){var a,n;return e?(n=new ie,e.state=n,n.window=null,(a=le(e,t))!==c&&(e.state=null),a):m}var he,de,_e=!0;function fe(e){if(_e){var t;for(he=new n.Buf32(512),de=new n.Buf32(32),t=0;t<144;)e.lens[t++]=8;for(;t<256;)e.lens[t++]=9;for(;t<280;)e.lens[t++]=7;for(;t<288;)e.lens[t++]=8;for(l(h,e.lens,0,288,he,0,e.work,{bits:9}),t=0;t<32;)e.lens[t++]=5;l(d,e.lens,0,32,de,0,e.work,{bits:5}),_e=!1}e.lencode=he,e.lenbits=9,e.distcode=de,e.distbits=5}function ue(e,t,a,i){var r,s=e.state;return null===s.window&&(s.wsize=1<<s.wbits,s.wnext=0,s.whave=0,s.window=new n.Buf8(s.wsize)),i>=s.wsize?(n.arraySet(s.window,t,a-s.wsize,s.wsize,0),s.wnext=0,s.whave=s.wsize):((r=s.wsize-s.wnext)>i&&(r=i),n.arraySet(s.window,t,a-i,r,s.wnext),(i-=r)?(n.arraySet(s.window,t,a-i,i,0),s.wnext=i,s.whave=s.wsize):(s.wnext+=r,s.wnext===s.wsize&&(s.wnext=0),s.whave<s.wsize&&(s.whave+=r))),0}t.inflateReset=se,t.inflateReset2=le,t.inflateResetKeep=re,t.inflateInit=function(e){return oe(e,ae)},t.inflateInit2=oe,t.inflate=function(e,t){var a,ee,te,ae,ie,re,se,le,oe,he,de,_e,ce,be,ge,me,we,pe,ve,ke,ye,xe,ze,Se,Ee=0,Ae=new n.Buf8(4),Ze=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!e||!e.state||!e.output||!e.input&&0!==e.avail_in)return m;(a=e.state).mode===N&&(a.mode=D),ie=e.next_out,te=e.output,se=e.avail_out,ae=e.next_in,ee=e.input,re=e.avail_in,le=a.hold,oe=a.bits,he=re,de=se,xe=c;e:for(;;)switch(a.mode){case y:if(0===a.wrap){a.mode=D;break}for(;oe<16;){if(0===re)break e;re--,le+=ee[ae++]<<oe,oe+=8}if(2&a.wrap&&35615===le){a.check=0,Ae[0]=255&le,Ae[1]=le>>>8&255,a.check=r(a.check,Ae,2,0),le=0,oe=0,a.mode=x;break}if(a.flags=0,a.head&&(a.head.done=!1),!(1&a.wrap)||(((255&le)<<8)+(le>>8))%31){e.msg=\"incorrect header check\",a.mode=Q;break}if((15&le)!==k){e.msg=\"unknown compression method\",a.mode=Q;break}if(oe-=4,ye=8+(15&(le>>>=4)),0===a.wbits)a.wbits=ye;else if(ye>a.wbits){e.msg=\"invalid window size\",a.mode=Q;break}a.dmax=1<<ye,e.adler=a.check=1,a.mode=512&le?B:N,le=0,oe=0;break;case x:for(;oe<16;){if(0===re)break e;re--,le+=ee[ae++]<<oe,oe+=8}if(a.flags=le,(255&a.flags)!==k){e.msg=\"unknown compression method\",a.mode=Q;break}if(57344&a.flags){e.msg=\"unknown header flags set\",a.mode=Q;break}a.head&&(a.head.text=le>>8&1),512&a.flags&&(Ae[0]=255&le,Ae[1]=le>>>8&255,a.check=r(a.check,Ae,2,0)),le=0,oe=0,a.mode=z;case z:for(;oe<32;){if(0===re)break e;re--,le+=ee[ae++]<<oe,oe+=8}a.head&&(a.head.time=le),512&a.flags&&(Ae[0]=255&le,Ae[1]=le>>>8&255,Ae[2]=le>>>16&255,Ae[3]=le>>>24&255,a.check=r(a.check,Ae,4,0)),le=0,oe=0,a.mode=S;case S:for(;oe<16;){if(0===re)break e;re--,le+=ee[ae++]<<oe,oe+=8}a.head&&(a.head.xflags=255&le,a.head.os=le>>8),512&a.flags&&(Ae[0]=255&le,Ae[1]=le>>>8&255,a.check=r(a.check,Ae,2,0)),le=0,oe=0,a.mode=E;case E:if(1024&a.flags){for(;oe<16;){if(0===re)break e;re--,le+=ee[ae++]<<oe,oe+=8}a.length=le,a.head&&(a.head.extra_len=le),512&a.flags&&(Ae[0]=255&le,Ae[1]=le>>>8&255,a.check=r(a.check,Ae,2,0)),le=0,oe=0}else a.head&&(a.head.extra=null);a.mode=A;case A:if(1024&a.flags&&((_e=a.length)>re&&(_e=re),_e&&(a.head&&(ye=a.head.extra_len-a.length,a.head.extra||(a.head.extra=new Array(a.head.extra_len)),n.arraySet(a.head.extra,ee,ae,_e,ye)),512&a.flags&&(a.check=r(a.check,ee,_e,ae)),re-=_e,ae+=_e,a.length-=_e),a.length))break e;a.length=0,a.mode=Z;case Z:if(2048&a.flags){if(0===re)break e;_e=0;do{ye=ee[ae+_e++],a.head&&ye&&a.length<65536&&(a.head.name+=String.fromCharCode(ye))}while(ye&&_e<re);if(512&a.flags&&(a.check=r(a.check,ee,_e,ae)),re-=_e,ae+=_e,ye)break e}else a.head&&(a.head.name=null);a.length=0,a.mode=O;case O:if(4096&a.flags){if(0===re)break e;_e=0;do{ye=ee[ae+_e++],a.head&&ye&&a.length<65536&&(a.head.comment+=String.fromCharCode(ye))}while(ye&&_e<re);if(512&a.flags&&(a.check=r(a.check,ee,_e,ae)),re-=_e,ae+=_e,ye)break e}else a.head&&(a.head.comment=null);a.mode=R;case R:if(512&a.flags){for(;oe<16;){if(0===re)break e;re--,le+=ee[ae++]<<oe,oe+=8}if(le!==(65535&a.check)){e.msg=\"header crc mismatch\",a.mode=Q;break}le=0,oe=0}a.head&&(a.head.hcrc=a.flags>>9&1,a.head.done=!0),e.adler=a.check=0,a.mode=N;break;case B:for(;oe<32;){if(0===re)break e;re--,le+=ee[ae++]<<oe,oe+=8}e.adler=a.check=ne(le),le=0,oe=0,a.mode=T;case T:if(0===a.havedict)return e.next_out=ie,e.avail_out=se,e.next_in=ae,e.avail_in=re,a.hold=le,a.bits=oe,g;e.adler=a.check=1,a.mode=N;case N:if(t===f||t===u)break e;case D:if(a.last){le>>>=7&oe,oe-=7&oe,a.mode=W;break}for(;oe<3;){if(0===re)break e;re--,le+=ee[ae++]<<oe,oe+=8}switch(a.last=1&le,oe-=1,3&(le>>>=1)){case 0:a.mode=U;break;case 1:if(fe(a),a.mode=C,t===u){le>>>=2,oe-=2;break e}break;case 2:a.mode=L;break;case 3:e.msg=\"invalid block type\",a.mode=Q}le>>>=2,oe-=2;break;case U:for(le>>>=7&oe,oe-=7&oe;oe<32;){if(0===re)break e;re--,le+=ee[ae++]<<oe,oe+=8}if((65535&le)!=(le>>>16^65535)){e.msg=\"invalid stored block lengths\",a.mode=Q;break}if(a.length=65535&le,le=0,oe=0,a.mode=I,t===u)break e;case I:a.mode=F;case F:if(_e=a.length){if(_e>re&&(_e=re),_e>se&&(_e=se),0===_e)break e;n.arraySet(te,ee,ae,_e,ie),re-=_e,ae+=_e,se-=_e,ie+=_e,a.length-=_e;break}a.mode=N;break;case L:for(;oe<14;){if(0===re)break e;re--,le+=ee[ae++]<<oe,oe+=8}if(a.nlen=257+(31&le),le>>>=5,oe-=5,a.ndist=1+(31&le),le>>>=5,oe-=5,a.ncode=4+(15&le),le>>>=4,oe-=4,a.nlen>286||a.ndist>30){e.msg=\"too many length or distance symbols\",a.mode=Q;break}a.have=0,a.mode=M;case M:for(;a.have<a.ncode;){for(;oe<3;){if(0===re)break e;re--,le+=ee[ae++]<<oe,oe+=8}a.lens[Ze[a.have++]]=7&le,le>>>=3,oe-=3}for(;a.have<19;)a.lens[Ze[a.have++]]=0;if(a.lencode=a.lendyn,a.lenbits=7,ze={bits:a.lenbits},xe=l(o,a.lens,0,19,a.lencode,0,a.work,ze),a.lenbits=ze.bits,xe){e.msg=\"invalid code lengths set\",a.mode=Q;break}a.have=0,a.mode=j;case j:for(;a.have<a.nlen+a.ndist;){for(;me=(Ee=a.lencode[le&(1<<a.lenbits)-1])>>>16&255,we=65535&Ee,!((ge=Ee>>>24)<=oe);){if(0===re)break e;re--,le+=ee[ae++]<<oe,oe+=8}if(we<16)le>>>=ge,oe-=ge,a.lens[a.have++]=we;else{if(16===we){for(Se=ge+2;oe<Se;){if(0===re)break e;re--,le+=ee[ae++]<<oe,oe+=8}if(le>>>=ge,oe-=ge,0===a.have){e.msg=\"invalid bit length repeat\",a.mode=Q;break}ye=a.lens[a.have-1],_e=3+(3&le),le>>>=2,oe-=2}else if(17===we){for(Se=ge+3;oe<Se;){if(0===re)break e;re--,le+=ee[ae++]<<oe,oe+=8}oe-=ge,ye=0,_e=3+(7&(le>>>=ge)),le>>>=3,oe-=3}else{for(Se=ge+7;oe<Se;){if(0===re)break e;re--,le+=ee[ae++]<<oe,oe+=8}oe-=ge,ye=0,_e=11+(127&(le>>>=ge)),le>>>=7,oe-=7}if(a.have+_e>a.nlen+a.ndist){e.msg=\"invalid bit length repeat\",a.mode=Q;break}for(;_e--;)a.lens[a.have++]=ye}}if(a.mode===Q)break;if(0===a.lens[256]){e.msg=\"invalid code -- missing end-of-block\",a.mode=Q;break}if(a.lenbits=9,ze={bits:a.lenbits},xe=l(h,a.lens,0,a.nlen,a.lencode,0,a.work,ze),a.lenbits=ze.bits,xe){e.msg=\"invalid literal/lengths set\",a.mode=Q;break}if(a.distbits=6,a.distcode=a.distdyn,ze={bits:a.distbits},xe=l(d,a.lens,a.nlen,a.ndist,a.distcode,0,a.work,ze),a.distbits=ze.bits,xe){e.msg=\"invalid distances set\",a.mode=Q;break}if(a.mode=C,t===u)break e;case C:a.mode=P;case P:if(re>=6&&se>=258){e.next_out=ie,e.avail_out=se,e.next_in=ae,e.avail_in=re,a.hold=le,a.bits=oe,s(e,de),ie=e.next_out,te=e.output,se=e.avail_out,ae=e.next_in,ee=e.input,re=e.avail_in,le=a.hold,oe=a.bits,a.mode===N&&(a.back=-1);break}for(a.back=0;me=(Ee=a.lencode[le&(1<<a.lenbits)-1])>>>16&255,we=65535&Ee,!((ge=Ee>>>24)<=oe);){if(0===re)break e;re--,le+=ee[ae++]<<oe,oe+=8}if(me&&0==(240&me)){for(pe=ge,ve=me,ke=we;me=(Ee=a.lencode[ke+((le&(1<<pe+ve)-1)>>pe)])>>>16&255,we=65535&Ee,!(pe+(ge=Ee>>>24)<=oe);){if(0===re)break e;re--,le+=ee[ae++]<<oe,oe+=8}le>>>=pe,oe-=pe,a.back+=pe}if(le>>>=ge,oe-=ge,a.back+=ge,a.length=we,0===me){a.mode=X;break}if(32&me){a.back=-1,a.mode=N;break}if(64&me){e.msg=\"invalid literal/length code\",a.mode=Q;break}a.extra=15&me,a.mode=H;case H:if(a.extra){for(Se=a.extra;oe<Se;){if(0===re)break e;re--,le+=ee[ae++]<<oe,oe+=8}a.length+=le&(1<<a.extra)-1,le>>>=a.extra,oe-=a.extra,a.back+=a.extra}a.was=a.length,a.mode=K;case K:for(;me=(Ee=a.distcode[le&(1<<a.distbits)-1])>>>16&255,we=65535&Ee,!((ge=Ee>>>24)<=oe);){if(0===re)break e;re--,le+=ee[ae++]<<oe,oe+=8}if(0==(240&me)){for(pe=ge,ve=me,ke=we;me=(Ee=a.distcode[ke+((le&(1<<pe+ve)-1)>>pe)])>>>16&255,we=65535&Ee,!(pe+(ge=Ee>>>24)<=oe);){if(0===re)break e;re--,le+=ee[ae++]<<oe,oe+=8}le>>>=pe,oe-=pe,a.back+=pe}if(le>>>=ge,oe-=ge,a.back+=ge,64&me){e.msg=\"invalid distance code\",a.mode=Q;break}a.offset=we,a.extra=15&me,a.mode=Y;case Y:if(a.extra){for(Se=a.extra;oe<Se;){if(0===re)break e;re--,le+=ee[ae++]<<oe,oe+=8}a.offset+=le&(1<<a.extra)-1,le>>>=a.extra,oe-=a.extra,a.back+=a.extra}if(a.offset>a.dmax){e.msg=\"invalid distance too far back\",a.mode=Q;break}a.mode=G;case G:if(0===se)break e;if(_e=de-se,a.offset>_e){if((_e=a.offset-_e)>a.whave&&a.sane){e.msg=\"invalid distance too far back\",a.mode=Q;break}_e>a.wnext?(_e-=a.wnext,ce=a.wsize-_e):ce=a.wnext-_e,_e>a.length&&(_e=a.length),be=a.window}else be=te,ce=ie-a.offset,_e=a.length;_e>se&&(_e=se),se-=_e,a.length-=_e;do{te[ie++]=be[ce++]}while(--_e);0===a.length&&(a.mode=P);break;case X:if(0===se)break e;te[ie++]=a.length,se--,a.mode=P;break;case W:if(a.wrap){for(;oe<32;){if(0===re)break e;re--,le|=ee[ae++]<<oe,oe+=8}if(de-=se,e.total_out+=de,a.total+=de,de&&(e.adler=a.check=a.flags?r(a.check,te,de,ie-de):i(a.check,te,de,ie-de)),de=se,(a.flags?le:ne(le))!==a.check){e.msg=\"incorrect data check\",a.mode=Q;break}le=0,oe=0}a.mode=q;case q:if(a.wrap&&a.flags){for(;oe<32;){if(0===re)break e;re--,le+=ee[ae++]<<oe,oe+=8}if(le!==(4294967295&a.total)){e.msg=\"incorrect length check\",a.mode=Q;break}le=0,oe=0}a.mode=J;case J:xe=b;break e;case Q:xe=w;break e;case V:return p;case $:default:return m}return e.next_out=ie,e.avail_out=se,e.next_in=ae,e.avail_in=re,a.hold=le,a.bits=oe,(a.wsize||de!==e.avail_out&&a.mode<Q&&(a.mode<W||t!==_))&&ue(e,e.output,e.next_out,de-e.avail_out)?(a.mode=V,p):(he-=e.avail_in,de-=e.avail_out,e.total_in+=he,e.total_out+=de,a.total+=de,a.wrap&&de&&(e.adler=a.check=a.flags?r(a.check,te,de,e.next_out-de):i(a.check,te,de,e.next_out-de)),e.data_type=a.bits+(a.last?64:0)+(a.mode===N?128:0)+(a.mode===C||a.mode===I?256:0),(0===he&&0===de||t===_)&&xe===c&&(xe=v),xe)},t.inflateEnd=function(e){if(!e||!e.state)return m;var t=e.state;return t.window&&(t.window=null),e.state=null,c},t.inflateGetHeader=function(e,t){var a;return e&&e.state?0==(2&(a=e.state).wrap)?m:(a.head=t,t.done=!1,c):m},t.inflateSetDictionary=function(e,t){var a,n=t.length;return e&&e.state?0!==(a=e.state).wrap&&a.mode!==T?m:a.mode===T&&i(1,t,n,0)!==a.check?w:ue(e,t,n,n)?(a.mode=V,p):(a.havedict=1,c):m},t.inflateInfo=\"pako inflate (from Nodeca project)\"},function(e,t,a){\"use strict\";e.exports=function(e,t,a,n){for(var i=65535&e|0,r=e>>>16&65535|0,s=0;0!==a;){a-=s=a>2e3?2e3:a;do{r=r+(i=i+t[n++]|0)|0}while(--s);i%=65521,r%=65521}return i|r<<16|0}},function(e,t,a){\"use strict\";var n=function(){for(var e,t=[],a=0;a<256;a++){e=a;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[a]=e}return t}();e.exports=function(e,t,a,i){var r=n,s=i+a;e^=-1;for(var l=i;l<s;l++)e=e>>>8^r[255&(e^t[l])];return-1^e}},function(e,t,a){\"use strict\";var n=a(2),i=4,r=0,s=1,l=2;function o(e){for(var t=e.length;--t>=0;)e[t]=0}var h=0,d=1,_=2,f=29,u=256,c=u+1+f,b=30,g=19,m=2*c+1,w=15,p=16,v=7,k=256,y=16,x=17,z=18,S=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],E=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],A=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],Z=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],O=new Array(2*(c+2));o(O);var R=new Array(2*b);o(R);var B=new Array(512);o(B);var T=new Array(256);o(T);var N=new Array(f);o(N);var D,U,I,F=new Array(b);function L(e,t,a,n,i){this.static_tree=e,this.extra_bits=t,this.extra_base=a,this.elems=n,this.max_length=i,this.has_stree=e&&e.length}function M(e,t){this.dyn_tree=e,this.max_code=0,this.stat_desc=t}function j(e){return e<256?B[e]:B[256+(e>>>7)]}function C(e,t){e.pending_buf[e.pending++]=255&t,e.pending_buf[e.pending++]=t>>>8&255}function P(e,t,a){e.bi_valid>p-a?(e.bi_buf|=t<<e.bi_valid&65535,C(e,e.bi_buf),e.bi_buf=t>>p-e.bi_valid,e.bi_valid+=a-p):(e.bi_buf|=t<<e.bi_valid&65535,e.bi_valid+=a)}function H(e,t,a){P(e,a[2*t],a[2*t+1])}function K(e,t){var a=0;do{a|=1&e,e>>>=1,a<<=1}while(--t>0);return a>>>1}function Y(e,t,a){var n,i,r=new Array(w+1),s=0;for(n=1;n<=w;n++)r[n]=s=s+a[n-1]<<1;for(i=0;i<=t;i++){var l=e[2*i+1];0!==l&&(e[2*i]=K(r[l]++,l))}}function G(e){var t;for(t=0;t<c;t++)e.dyn_ltree[2*t]=0;for(t=0;t<b;t++)e.dyn_dtree[2*t]=0;for(t=0;t<g;t++)e.bl_tree[2*t]=0;e.dyn_ltree[2*k]=1,e.opt_len=e.static_len=0,e.last_lit=e.matches=0}function X(e){e.bi_valid>8?C(e,e.bi_buf):e.bi_valid>0&&(e.pending_buf[e.pending++]=e.bi_buf),e.bi_buf=0,e.bi_valid=0}function W(e,t,a,n){var i=2*t,r=2*a;return e[i]<e[r]||e[i]===e[r]&&n[t]<=n[a]}function q(e,t,a){for(var n=e.heap[a],i=a<<1;i<=e.heap_len&&(i<e.heap_len&&W(t,e.heap[i+1],e.heap[i],e.depth)&&i++,!W(t,n,e.heap[i],e.depth));)e.heap[a]=e.heap[i],a=i,i<<=1;e.heap[a]=n}function J(e,t,a){var n,i,r,s,l=0;if(0!==e.last_lit)do{n=e.pending_buf[e.d_buf+2*l]<<8|e.pending_buf[e.d_buf+2*l+1],i=e.pending_buf[e.l_buf+l],l++,0===n?H(e,i,t):(H(e,(r=T[i])+u+1,t),0!==(s=S[r])&&P(e,i-=N[r],s),H(e,r=j(--n),a),0!==(s=E[r])&&P(e,n-=F[r],s))}while(l<e.last_lit);H(e,k,t)}function Q(e,t){var a,n,i,r=t.dyn_tree,s=t.stat_desc.static_tree,l=t.stat_desc.has_stree,o=t.stat_desc.elems,h=-1;for(e.heap_len=0,e.heap_max=m,a=0;a<o;a++)0!==r[2*a]?(e.heap[++e.heap_len]=h=a,e.depth[a]=0):r[2*a+1]=0;for(;e.heap_len<2;)r[2*(i=e.heap[++e.heap_len]=h<2?++h:0)]=1,e.depth[i]=0,e.opt_len--,l&&(e.static_len-=s[2*i+1]);for(t.max_code=h,a=e.heap_len>>1;a>=1;a--)q(e,r,a);i=o;do{a=e.heap[1],e.heap[1]=e.heap[e.heap_len--],q(e,r,1),n=e.heap[1],e.heap[--e.heap_max]=a,e.heap[--e.heap_max]=n,r[2*i]=r[2*a]+r[2*n],e.depth[i]=(e.depth[a]>=e.depth[n]?e.depth[a]:e.depth[n])+1,r[2*a+1]=r[2*n+1]=i,e.heap[1]=i++,q(e,r,1)}while(e.heap_len>=2);e.heap[--e.heap_max]=e.heap[1],function(e,t){var a,n,i,r,s,l,o=t.dyn_tree,h=t.max_code,d=t.stat_desc.static_tree,_=t.stat_desc.has_stree,f=t.stat_desc.extra_bits,u=t.stat_desc.extra_base,c=t.stat_desc.max_length,b=0;for(r=0;r<=w;r++)e.bl_count[r]=0;for(o[2*e.heap[e.heap_max]+1]=0,a=e.heap_max+1;a<m;a++)(r=o[2*o[2*(n=e.heap[a])+1]+1]+1)>c&&(r=c,b++),o[2*n+1]=r,n>h||(e.bl_count[r]++,s=0,n>=u&&(s=f[n-u]),l=o[2*n],e.opt_len+=l*(r+s),_&&(e.static_len+=l*(d[2*n+1]+s)));if(0!==b){do{for(r=c-1;0===e.bl_count[r];)r--;e.bl_count[r]--,e.bl_count[r+1]+=2,e.bl_count[c]--,b-=2}while(b>0);for(r=c;0!==r;r--)for(n=e.bl_count[r];0!==n;)(i=e.heap[--a])>h||(o[2*i+1]!==r&&(e.opt_len+=(r-o[2*i+1])*o[2*i],o[2*i+1]=r),n--)}}(e,t),Y(r,h,e.bl_count)}function V(e,t,a){var n,i,r=-1,s=t[1],l=0,o=7,h=4;for(0===s&&(o=138,h=3),t[2*(a+1)+1]=65535,n=0;n<=a;n++)i=s,s=t[2*(n+1)+1],++l<o&&i===s||(l<h?e.bl_tree[2*i]+=l:0!==i?(i!==r&&e.bl_tree[2*i]++,e.bl_tree[2*y]++):l<=10?e.bl_tree[2*x]++:e.bl_tree[2*z]++,l=0,r=i,0===s?(o=138,h=3):i===s?(o=6,h=3):(o=7,h=4))}function $(e,t,a){var n,i,r=-1,s=t[1],l=0,o=7,h=4;for(0===s&&(o=138,h=3),n=0;n<=a;n++)if(i=s,s=t[2*(n+1)+1],!(++l<o&&i===s)){if(l<h)do{H(e,i,e.bl_tree)}while(0!=--l);else 0!==i?(i!==r&&(H(e,i,e.bl_tree),l--),H(e,y,e.bl_tree),P(e,l-3,2)):l<=10?(H(e,x,e.bl_tree),P(e,l-3,3)):(H(e,z,e.bl_tree),P(e,l-11,7));l=0,r=i,0===s?(o=138,h=3):i===s?(o=6,h=3):(o=7,h=4)}}o(F);var ee=!1;function te(e,t,a,i){P(e,(h<<1)+(i?1:0),3),function(e,t,a,i){X(e),i&&(C(e,a),C(e,~a)),n.arraySet(e.pending_buf,e.window,t,a,e.pending),e.pending+=a}(e,t,a,!0)}t._tr_init=function(e){ee||(function(){var e,t,a,n,i,r=new Array(w+1);for(a=0,n=0;n<f-1;n++)for(N[n]=a,e=0;e<1<<S[n];e++)T[a++]=n;for(T[a-1]=n,i=0,n=0;n<16;n++)for(F[n]=i,e=0;e<1<<E[n];e++)B[i++]=n;for(i>>=7;n<b;n++)for(F[n]=i<<7,e=0;e<1<<E[n]-7;e++)B[256+i++]=n;for(t=0;t<=w;t++)r[t]=0;for(e=0;e<=143;)O[2*e+1]=8,e++,r[8]++;for(;e<=255;)O[2*e+1]=9,e++,r[9]++;for(;e<=279;)O[2*e+1]=7,e++,r[7]++;for(;e<=287;)O[2*e+1]=8,e++,r[8]++;for(Y(O,c+1,r),e=0;e<b;e++)R[2*e+1]=5,R[2*e]=K(e,5);D=new L(O,S,u+1,c,w),U=new L(R,E,0,b,w),I=new L(new Array(0),A,0,g,v)}(),ee=!0),e.l_desc=new M(e.dyn_ltree,D),e.d_desc=new M(e.dyn_dtree,U),e.bl_desc=new M(e.bl_tree,I),e.bi_buf=0,e.bi_valid=0,G(e)},t._tr_stored_block=te,t._tr_flush_block=function(e,t,a,n){var o,h,f=0;e.level>0?(e.strm.data_type===l&&(e.strm.data_type=function(e){var t,a=4093624447;for(t=0;t<=31;t++,a>>>=1)if(1&a&&0!==e.dyn_ltree[2*t])return r;if(0!==e.dyn_ltree[18]||0!==e.dyn_ltree[20]||0!==e.dyn_ltree[26])return s;for(t=32;t<u;t++)if(0!==e.dyn_ltree[2*t])return s;return r}(e)),Q(e,e.l_desc),Q(e,e.d_desc),f=function(e){var t;for(V(e,e.dyn_ltree,e.l_desc.max_code),V(e,e.dyn_dtree,e.d_desc.max_code),Q(e,e.bl_desc),t=g-1;t>=3&&0===e.bl_tree[2*Z[t]+1];t--);return e.opt_len+=3*(t+1)+5+5+4,t}(e),o=e.opt_len+3+7>>>3,(h=e.static_len+3+7>>>3)<=o&&(o=h)):o=h=a+5,a+4<=o&&-1!==t?te(e,t,a,n):e.strategy===i||h===o?(P(e,(d<<1)+(n?1:0),3),J(e,O,R)):(P(e,(_<<1)+(n?1:0),3),function(e,t,a,n){var i;for(P(e,t-257,5),P(e,a-1,5),P(e,n-4,4),i=0;i<n;i++)P(e,e.bl_tree[2*Z[i]+1],3);$(e,e.dyn_ltree,t-1),$(e,e.dyn_dtree,a-1)}(e,e.l_desc.max_code+1,e.d_desc.max_code+1,f+1),J(e,e.dyn_ltree,e.dyn_dtree)),G(e),n&&X(e)},t._tr_tally=function(e,t,a){return e.pending_buf[e.d_buf+2*e.last_lit]=t>>>8&255,e.pending_buf[e.d_buf+2*e.last_lit+1]=255&t,e.pending_buf[e.l_buf+e.last_lit]=255&a,e.last_lit++,0===t?e.dyn_ltree[2*a]++:(e.matches++,t--,e.dyn_ltree[2*(T[a]+u+1)]++,e.dyn_dtree[2*j(t)]++),e.last_lit===e.lit_bufsize-1},t._tr_align=function(e){P(e,d<<1,3),H(e,k,O),function(e){16===e.bi_valid?(C(e,e.bi_buf),e.bi_buf=0,e.bi_valid=0):e.bi_valid>=8&&(e.pending_buf[e.pending++]=255&e.bi_buf,e.bi_buf>>=8,e.bi_valid-=8)}(e)}},function(e,t,a){\"use strict\";e.exports=function(e,t){var a,n,i,r,s,l,o,h,d,_,f,u,c,b,g,m,w,p,v,k,y,x,z,S,E;a=e.state,n=e.next_in,S=e.input,i=n+(e.avail_in-5),r=e.next_out,E=e.output,s=r-(t-e.avail_out),l=r+(e.avail_out-257),o=a.dmax,h=a.wsize,d=a.whave,_=a.wnext,f=a.window,u=a.hold,c=a.bits,b=a.lencode,g=a.distcode,m=(1<<a.lenbits)-1,w=(1<<a.distbits)-1;e:do{c<15&&(u+=S[n++]<<c,c+=8,u+=S[n++]<<c,c+=8),p=b[u&m];t:for(;;){if(u>>>=v=p>>>24,c-=v,0===(v=p>>>16&255))E[r++]=65535&p;else{if(!(16&v)){if(0==(64&v)){p=b[(65535&p)+(u&(1<<v)-1)];continue t}if(32&v){a.mode=12;break e}e.msg=\"invalid literal/length code\",a.mode=30;break e}k=65535&p,(v&=15)&&(c<v&&(u+=S[n++]<<c,c+=8),k+=u&(1<<v)-1,u>>>=v,c-=v),c<15&&(u+=S[n++]<<c,c+=8,u+=S[n++]<<c,c+=8),p=g[u&w];a:for(;;){if(u>>>=v=p>>>24,c-=v,!(16&(v=p>>>16&255))){if(0==(64&v)){p=g[(65535&p)+(u&(1<<v)-1)];continue a}e.msg=\"invalid distance code\",a.mode=30;break e}if(y=65535&p,c<(v&=15)&&(u+=S[n++]<<c,(c+=8)<v&&(u+=S[n++]<<c,c+=8)),(y+=u&(1<<v)-1)>o){e.msg=\"invalid distance too far back\",a.mode=30;break e}if(u>>>=v,c-=v,y>(v=r-s)){if((v=y-v)>d&&a.sane){e.msg=\"invalid distance too far back\",a.mode=30;break e}if(x=0,z=f,0===_){if(x+=h-v,v<k){k-=v;do{E[r++]=f[x++]}while(--v);x=r-y,z=E}}else if(_<v){if(x+=h+_-v,(v-=_)<k){k-=v;do{E[r++]=f[x++]}while(--v);if(x=0,_<k){k-=v=_;do{E[r++]=f[x++]}while(--v);x=r-y,z=E}}}else if(x+=_-v,v<k){k-=v;do{E[r++]=f[x++]}while(--v);x=r-y,z=E}for(;k>2;)E[r++]=z[x++],E[r++]=z[x++],E[r++]=z[x++],k-=3;k&&(E[r++]=z[x++],k>1&&(E[r++]=z[x++]))}else{x=r-y;do{E[r++]=E[x++],E[r++]=E[x++],E[r++]=E[x++],k-=3}while(k>2);k&&(E[r++]=E[x++],k>1&&(E[r++]=E[x++]))}break}}break}}while(n<i&&r<l);n-=k=c>>3,u&=(1<<(c-=k<<3))-1,e.next_in=n,e.next_out=r,e.avail_in=n<i?i-n+5:5-(n-i),e.avail_out=r<l?l-r+257:257-(r-l),a.hold=u,a.bits=c}},function(e,t,a){\"use strict\";var n=a(2),i=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],r=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],s=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],l=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];e.exports=function(e,t,a,o,h,d,_,f){var u,c,b,g,m,w,p,v,k,y=f.bits,x=0,z=0,S=0,E=0,A=0,Z=0,O=0,R=0,B=0,T=0,N=null,D=0,U=new n.Buf16(16),I=new n.Buf16(16),F=null,L=0;for(x=0;x<=15;x++)U[x]=0;for(z=0;z<o;z++)U[t[a+z]]++;for(A=y,E=15;E>=1&&0===U[E];E--);if(A>E&&(A=E),0===E)return h[d++]=20971520,h[d++]=20971520,f.bits=1,0;for(S=1;S<E&&0===U[S];S++);for(A<S&&(A=S),R=1,x=1;x<=15;x++)if(R<<=1,(R-=U[x])<0)return-1;if(R>0&&(0===e||1!==E))return-1;for(I[1]=0,x=1;x<15;x++)I[x+1]=I[x]+U[x];for(z=0;z<o;z++)0!==t[a+z]&&(_[I[t[a+z]]++]=z);if(0===e?(N=F=_,w=19):1===e?(N=i,D-=257,F=r,L-=257,w=256):(N=s,F=l,w=-1),T=0,z=0,x=S,m=d,Z=A,O=0,b=-1,g=(B=1<<A)-1,1===e&&B>852||2===e&&B>592)return 1;for(;;){p=x-O,_[z]<w?(v=0,k=_[z]):_[z]>w?(v=F[L+_[z]],k=N[D+_[z]]):(v=96,k=0),u=1<<x-O,S=c=1<<Z;do{h[m+(T>>O)+(c-=u)]=p<<24|v<<16|k|0}while(0!==c);for(u=1<<x-1;T&u;)u>>=1;if(0!==u?(T&=u-1,T+=u):T=0,z++,0==--U[x]){if(x===E)break;x=t[a+_[z]]}if(x>A&&(T&g)!==b){for(0===O&&(O=A),m+=S,R=1<<(Z=x-O);Z+O<E&&!((R-=U[Z+O])<=0);)Z++,R<<=1;if(B+=1<<Z,1===e&&B>852||2===e&&B>592)return 1;h[b=T&g]=A<<24|Z<<16|m-d|0}}return 0!==T&&(h[m+T]=x-O<<24|64<<16|0),f.bits=A,0}},function(e,t,a){\"use strict\";a.r(t);var n=a(3),i=a.n(n),r=a(4),s=a(5),l=a(1),o=a.n(l),h=a(0),d=16384,_=15;function f(e,t){var a=this;this.inflatedReady=e,this.deflatedReady=t,this._inflate=function(e){var t=new i.a,a=Object(s.inflateInit2)(t,_);if(a!==h.Z_OK)throw new Error(\"Problem initializing inflate stream: \"+o.a[a]);return function(a){if(void 0===a)return e();var n,i,r;t.input=a,t.next_in=0,t.avail_in=t.input.length;var l=!0;do{if(0===t.avail_out&&(t.output=new Uint8Array(d),n=t.next_out=0,t.avail_out=d),(i=Object(s.inflate)(t,h.Z_NO_FLUSH))!==h.Z_STREAM_END&&i!==h.Z_OK)throw new Error(\"inflate problem: \"+o.a[i]);t.next_out&&(0!==t.avail_out&&i!==h.Z_STREAM_END||(r=t.output.subarray(n,n=t.next_out),l=e(r)))}while(t.avail_in>0&&i!==h.Z_STREAM_END);return t.next_out>n&&(r=t.output.subarray(n,n=t.next_out),l=e(r)),l}}(function(e){return a.inflatedReady(e.buffer.slice(e.byteOffset,e.byteOffset+e.length))}),this._deflate=function(e){var t=new i.a,a=Object(r.deflateInit2)(t,h.Z_DEFAULT_COMPRESSION,h.Z_DEFLATED,_,8,h.Z_DEFAULT_STRATEGY);if(a!==h.Z_OK)throw new Error(\"Problem initializing deflate stream: \"+o.a[a]);return function(a){if(void 0===a)return e();var n,i,s;t.input=a,t.next_in=0,t.avail_in=t.input.length;var l=!0;do{if(0===t.avail_out&&(t.output=new Uint8Array(d),s=t.next_out=0,t.avail_out=d),(n=Object(r.deflate)(t,h.Z_SYNC_FLUSH))!==h.Z_STREAM_END&&n!==h.Z_OK)throw new Error(\"Deflate problem: \"+o.a[n]);0===t.avail_out&&t.next_out>s&&(i=t.output.subarray(s,s=t.next_out),l=e(i))}while((t.avail_in>0||0===t.avail_out)&&n!==h.Z_STREAM_END);return t.next_out>s&&(i=t.output.subarray(s,s=t.next_out),l=e(i)),l}}(function(e){return a.deflatedReady(e.buffer.slice(e.byteOffset,e.byteOffset+e.length))})}f.prototype.inflate=function(e){this._inflate(new Uint8Array(e))},f.prototype.deflate=function(e){this._deflate(new Uint8Array(e))};var u=function(e,t){return{message:e,buffer:t}},c=new f(function(e){return self.postMessage(u(\"inflated_ready\",e),[e])},function(e){return self.postMessage(u(\"deflated_ready\",e),[e])});self.onmessage=function(e){var t=e.data.message,a=e.data.buffer;switch(t){case\"start\":break;case\"inflate\":c.inflate(a);break;case\"deflate\":c.deflate(a)}}}]);"; //
// constants used for communication with the worker
//

const MESSAGE_INITIALIZE_WORKER = 'start';
const MESSAGE_INFLATE = 'inflate';
const MESSAGE_INFLATED_DATA_READY = 'inflated_ready';
const MESSAGE_DEFLATE = 'deflate';
const MESSAGE_DEFLATED_DATA_READY = 'deflated_ready';
const EOL = '\r\n';
const LINE_FEED = 10;
const CARRIAGE_RETURN = 13;
const LEFT_CURLY_BRACKET = 123;
const RIGHT_CURLY_BRACKET = 125;
const ASCII_PLUS = 43; // State tracking when constructing an IMAP command from buffers.

const BUFFER_STATE_LITERAL = 'literal';
const BUFFER_STATE_POSSIBLY_LITERAL_LENGTH_1 = 'literal_length_1';
const BUFFER_STATE_POSSIBLY_LITERAL_LENGTH_2 = 'literal_length_2';
const BUFFER_STATE_DEFAULT = 'default';
/**
 * How much time to wait since the last response until the connection is considered idling
 */

const TIMEOUT_ENTER_IDLE = 1000;
/**
 * Lower Bound for socket timeout to wait since the last data was written to a socket
 */

const TIMEOUT_SOCKET_LOWER_BOUND = 10000;
/**
 * Multiplier for socket timeout:
 *
 * We assume at least a GPRS connection with 115 kb/s = 14,375 kB/s tops, so 10 KB/s to be on
 * the safe side. We can timeout after a lower bound of 10s + (n KB / 10 KB/s). A 1 MB message
 * upload would be 110 seconds to wait for the timeout. 10 KB/s === 0.1 s/B
 */

const TIMEOUT_SOCKET_MULTIPLIER = 0.1;
/**
 * Creates a connection object to an IMAP server. Call `connect` method to inititate
 * the actual connection, the constructor only defines the properties but does not actually connect.
 *
 * @constructor
 *
 * @param {String} [host='localhost'] Hostname to conenct to
 * @param {Number} [port=143] Port number to connect to
 * @param {Object} [options] Optional options object
 * @param {Boolean} [options.useSecureTransport] Set to true, to use encrypted connection
 * @param {String} [options.compressionWorkerPath] offloads de-/compression computation to a web worker, this is the path to the browserified emailjs-compressor-worker.js
 */

class Imap {
  constructor(host, port, options = {}) {
    this.timeoutEnterIdle = TIMEOUT_ENTER_IDLE;
    this.timeoutSocketLowerBound = TIMEOUT_SOCKET_LOWER_BOUND;
    this.timeoutSocketMultiplier = TIMEOUT_SOCKET_MULTIPLIER;
    this.options = options;
    this.port = port || (this.options.useSecureTransport ? 993 : 143);
    this.host = host || 'localhost'; // Use a TLS connection. Port 993 also forces TLS.

    this.options.useSecureTransport = 'useSecureTransport' in this.options ? !!this.options.useSecureTransport : this.port === 993;
    this.secureMode = !!this.options.useSecureTransport; // Does the connection use SSL/TLS

    this._connectionReady = false; // Is the conection established and greeting is received from the server

    this._globalAcceptUntagged = {}; // Global handlers for unrelated responses (EXPUNGE, EXISTS etc.)

    this._clientQueue = []; // Queue of outgoing commands

    this._canSend = false; // Is it OK to send something to the server

    this._tagCounter = 0; // Counter to allow uniqueue imap tags

    this._currentCommand = false; // Current command that is waiting for response from the server

    this._idleTimer = false; // Timer waiting to enter idle

    this._socketTimeoutTimer = false; // Timer waiting to declare the socket dead starting from the last write

    this.compressed = false; // Is the connection compressed and needs inflating/deflating
    //
    // HELPERS
    //
    // As the server sends data in chunks, it needs to be split into separate lines. Helps parsing the input.

    this._incomingBuffers = [];
    this._bufferState = BUFFER_STATE_DEFAULT;
    this._literalRemaining = 0; //
    // Event placeholders, may be overriden with callback functions
    //

    this.oncert = null;
    this.onerror = null; // Irrecoverable error occurred. Connection to the server will be closed automatically.

    this.onready = null; // The connection to the server has been established and greeting is received

    this.onidle = null; // There are no more commands to process

    this._onData = this._onData.bind(this);
    this._onError = this._onError.bind(this);
  } // PUBLIC METHODS

  /**
   * Initiate a connection to the server. Wait for onready event
   *
   * @param {Object} Socket
   *     TESTING ONLY! The TCPSocket has a pretty nonsensical convenience constructor,
   *     which makes it hard to mock. For dependency-injection purposes, we use the
   *     Socket parameter to pass in a mock Socket implementation. Should be left blank
   *     in production use!
   * @returns {Promise} Resolves when socket is opened
   */


  connect(Socket = _emailjsTcpSocket.default) {
    return new Promise((resolve, reject) => {
      try {
        this.socket = Socket.open(this.host, this.port, {
          binaryType: 'arraybuffer',
          useSecureTransport: this.secureMode,
          ca: this.options.ca,
          ws: this.options.ws,
          servername: this.options.servername
        }); // allows certificate handling for platform w/o native tls support
        // oncert is non standard so setting it might throw if the socket object is immutable

        try {
          this.socket.oncert = cert => {
            this.oncert && this.oncert(cert);
          };
        } catch (e) {} // Connection closing unexpected is an error


        this.socket.onclose = e => {
          console.log('close ', e);

          this._onError(new Error('Socket closed unexpectedly!' + this.host));
        };

        this.socket.ondata = evt => {
          try {
            this._onData(evt);
          } catch (err) {
            this._onError(err);
          }
        }; // if an error happens during create time, reject the promise


        this.socket.onerror = e => {
          reject(new Error('Could not open socket: ' + e.data.message));
        };

        this.socket.onopen = () => {
          // use proper "irrecoverable error, tear down everything"-handler only after socket is open
          this.socket.onerror = e => this._onError(e);

          resolve();
        };
      } catch (e) {
        reject(e);
      }
    });
  }
  /**
   * Closes the connection to the server
   *
   * @returns {Promise} Resolves when the socket is closed
   */


  close(error) {
    return new Promise((resolve, reject) => {
      const tearDown = () => {
        try {
          // fulfill pending promises
          this._clientQueue.forEach(cmd => cmd.callback(error));

          if (this._currentCommand) {
            this._currentCommand.callback(error);
          }

          this._connectionReady = false;
          this._clientQueue = [];
          this._tagCounter = 0;
          this._currentCommand = false;
          clearTimeout(this._idleTimer);
          this._idleTimer = null;
          clearTimeout(this._socketTimeoutTimer);
          this._socketTimeoutTimer = null;

          if (this.socket) {
            // remove all listeners
            this.socket.onopen = null;
            this.socket.onclose = null;
            this.socket.ondata = null;
            this.socket.onerror = null;
            this.socket.oncert = null;
            this.socket = null;
          }

          resolve();
        } catch (err) {
          reject(err);
        }
      };

      this._disableCompression();

      if (!this.socket || this.socket.readyState !== 'open') {
        return tearDown();
      }

      this.socket.onclose = this.socket.onerror = tearDown; // we don't really care about the error here

      this.socket.close();
    });
  }
  /**
   * Send LOGOUT to the server.
   *
   * Use is discouraged!
   *
   * @returns {Promise} Resolves when connection is closed by server.
   */


  logout() {
    return new Promise((resolve, reject) => {
      this.socket.onclose = this.socket.onerror = () => {
        this.close('Client logging out').then(resolve).catch(reject);
      };

      this.enqueueCommand('LOGOUT');
    });
  }
  /**
   * Initiates TLS handshake
   */


  upgrade() {
    this.secureMode = true;
    this.socket.upgradeToSecure();
  }
  /**
   * Schedules a command to be sent to the server.
   * See https://github.com/emailjs/emailjs-imap-handler for request structure.
   * Do not provide a tag property, it will be set by the queue manager.
   *
   * To catch untagged responses use acceptUntagged property. For example, if
   * the value for it is 'FETCH' then the reponse includes 'payload.FETCH' property
   * that is an array including all listed * FETCH responses.
   *
   * @param {Object} request Structured request object
   * @param {Array} acceptUntagged a list of untagged responses that will be included in 'payload' property
   * @param {Object} [options] Optional data for the command payload
   * @returns {Promise} Promise that resolves when the corresponding response was received
   */


  enqueueCommand(request, acceptUntagged, options) {
    if (typeof request === 'string') {
      request = {
        command: request
      };
    }

    acceptUntagged = [].concat(acceptUntagged || []).map(untagged => (untagged || '').toString().toUpperCase().trim());
    var tag = 'W' + ++this._tagCounter;
    request.tag = tag;
    return new Promise((resolve, reject) => {
      var data = {
        tag: tag,
        request: request,
        payload: acceptUntagged.length ? {} : undefined,
        callback: response => {
          if (this.isError(response)) {
            return reject(response);
          } else if (['NO', 'BAD'].indexOf((0, _ramda.propOr)('', 'command', response).toUpperCase().trim()) >= 0) {
            // Ignore QQ Email NO command message `Need to SELECT first!`
            if (response.humanReadable !== 'Need to SELECT first!') {
              var error = new Error(response.humanReadable || 'Error');

              if (response.code) {
                error.code = response.code;
              }

              return reject(error);
            }
          }

          resolve(response);
        } // apply any additional options to the command

      };
      Object.keys(options || {}).forEach(key => {
        data[key] = options[key];
      });
      acceptUntagged.forEach(command => {
        data.payload[command] = [];
      }); // if we're in priority mode (i.e. we ran commands in a precheck),
      // queue any commands BEFORE the command that contianed the precheck,
      // otherwise just queue command as usual

      var index = data.ctx ? this._clientQueue.indexOf(data.ctx) : -1;

      if (index >= 0) {
        data.tag += '.p';
        data.request.tag += '.p';

        this._clientQueue.splice(index, 0, data);
      } else {
        this._clientQueue.push(data);
      }

      if (this._canSend) {
        this._sendRequest();
      }
    });
  }
  /**
   *
   * @param commands
   * @param ctx
   * @returns {*}
   */


  getPreviouslyQueued(commands, ctx) {
    const startIndex = this._clientQueue.indexOf(ctx) - 1; // search backwards for the commands and return the first found

    for (let i = startIndex; i >= 0; i--) {
      if (isMatch(this._clientQueue[i])) {
        return this._clientQueue[i];
      }
    } // also check current command if no SELECT is queued


    if (isMatch(this._currentCommand)) {
      return this._currentCommand;
    }

    return false;

    function isMatch(data) {
      return data && data.request && commands.indexOf(data.request.command) >= 0;
    }
  }
  /**
   * Send data to the TCP socket
   * Arms a timeout waiting for a response from the server.
   *
   * @param {String} str Payload
   */


  send(str) {
    const buffer = (0, _common.toTypedArray)(str).buffer;
    const timeout = this.timeoutSocketLowerBound + Math.floor(buffer.byteLength * this.timeoutSocketMultiplier);
    clearTimeout(this._socketTimeoutTimer); // clear pending timeouts

    this._socketTimeoutTimer = setTimeout(() => this._onError(new Error('Socket timed out!')), timeout); // arm the next timeout

    if (this.compressed) {
      this._sendCompressed(buffer);
    } else {
      if (!this.socket) {
        throw new Error('Socket timed out!');
      }

      this.socket.send(buffer);
    }
  }
  /**
   * Set a global handler for an untagged response. If currently processed command
   * has not listed untagged command it is forwarded to the global handler. Useful
   * with EXPUNGE, EXISTS etc.
   *
   * @param {String} command Untagged command name
   * @param {Function} callback Callback function with response object and continue callback function
   */


  setHandler(command, callback) {
    this._globalAcceptUntagged[command.toUpperCase().trim()] = callback;
  } // INTERNAL EVENTS

  /**
   * Error handler for the socket
   *
   * @event
   * @param {Event} evt Event object. See evt.data for the error
   */


  _onError(evt) {
    var error;

    if (this.isError(evt)) {
      error = evt;
    } else if (evt && this.isError(evt.data)) {
      error = evt.data;
    } else {
      error = new Error(evt && evt.data && evt.data.message || evt.data || evt || 'Error');
    }

    this.logger.error(error); // always call onerror callback, no matter if close() succeeds or fails
    // this.close(error).then(() => {
    //   this.onerror && this.onerror(error)
    // }, error => {
    //   this.onerror && this.onerror(error)
    // })

    this.onerror && this.onerror(error); // don't close the connect
    // this.onerror && this.onerror(error)
  }
  /**
   * Handler for incoming data from the server. The data is sent in arbitrary
   * chunks and can't be used directly so this function makes sure the data
   * is split into complete lines before the data is passed to the command
   * handler
   *
   * @param {Event} evt
   */


  _onData(evt) {
    const timeout = this.timeoutSocketLowerBound + Math.floor(4096 * this.timeoutSocketMultiplier); // max packet size is 4096 bytes

    clearTimeout(this._socketTimeoutTimer); // reset the timeout on each data packet

    this._socketTimeoutTimer = setTimeout(() => this._onError(new Error('Socket timed out!')), timeout);

    this._incomingBuffers.push(new Uint8Array(evt.data)); // append to the incoming buffer


    this._parseIncomingCommands(this._iterateIncomingBuffer()); // Consume the incoming buffer

  }

  *_iterateIncomingBuffer() {
    let buf = this._incomingBuffers[this._incomingBuffers.length - 1] || [];
    let i = 0; // loop invariant:
    //   this._incomingBuffers starts with the beginning of incoming command.
    //   buf is shorthand for last element of this._incomingBuffers.
    //   buf[0..i-1] is part of incoming command.

    while (i < buf.length) {
      switch (this._bufferState) {
        case BUFFER_STATE_LITERAL:
          const diff = Math.min(buf.length - i, this._literalRemaining);
          this._literalRemaining -= diff;
          i += diff;

          if (this._literalRemaining === 0) {
            this._bufferState = BUFFER_STATE_DEFAULT;
          }

          continue;

        case BUFFER_STATE_POSSIBLY_LITERAL_LENGTH_2:
          if (i < buf.length) {
            if (buf[i] === CARRIAGE_RETURN) {
              this._literalRemaining = Number((0, _common.fromTypedArray)(this._lengthBuffer)) + 2; // for CRLF

              this._bufferState = BUFFER_STATE_LITERAL;
            } else {
              this._bufferState = BUFFER_STATE_DEFAULT;
            }

            delete this._lengthBuffer;
          }

          continue;

        case BUFFER_STATE_POSSIBLY_LITERAL_LENGTH_1:
          const start = i;

          while (i < buf.length && buf[i] >= 48 && buf[i] <= 57) {
            // digits
            i++;
          }

          if (start !== i) {
            const latest = buf.subarray(start, i);
            const prevBuf = this._lengthBuffer;
            this._lengthBuffer = new Uint8Array(prevBuf.length + latest.length);

            this._lengthBuffer.set(prevBuf);

            this._lengthBuffer.set(latest, prevBuf.length);
          }

          if (i < buf.length) {
            if (this._lengthBuffer.length > 0 && buf[i] === RIGHT_CURLY_BRACKET) {
              this._bufferState = BUFFER_STATE_POSSIBLY_LITERAL_LENGTH_2;
            } else {
              delete this._lengthBuffer;
              this._bufferState = BUFFER_STATE_DEFAULT;
            }

            i++;
          }

          continue;

        default:
          // find literal length
          const leftIdx = buf.indexOf(LEFT_CURLY_BRACKET, i);

          if (leftIdx > -1) {
            const leftOfLeftCurly = new Uint8Array(buf.buffer, i, leftIdx - i);

            if (leftOfLeftCurly.indexOf(LINE_FEED) === -1) {
              i = leftIdx + 1;
              this._lengthBuffer = new Uint8Array(0);
              this._bufferState = BUFFER_STATE_POSSIBLY_LITERAL_LENGTH_1;
              continue;
            }
          } // find end of command


          const LFidx = buf.indexOf(LINE_FEED, i);

          if (LFidx > -1) {
            if (LFidx < buf.length - 1) {
              this._incomingBuffers[this._incomingBuffers.length - 1] = new Uint8Array(buf.buffer, 0, LFidx + 1);
            }

            const commandLength = this._incomingBuffers.reduce((prev, curr) => prev + curr.length, 0) - 2; // 2 for CRLF

            const command = new Uint8Array(commandLength);
            let index = 0;

            while (this._incomingBuffers.length > 0) {
              let uint8Array = this._incomingBuffers.shift();

              const remainingLength = commandLength - index;

              if (uint8Array.length > remainingLength) {
                const excessLength = uint8Array.length - remainingLength;
                uint8Array = uint8Array.subarray(0, -excessLength);

                if (this._incomingBuffers.length > 0) {
                  this._incomingBuffers = [];
                }
              }

              command.set(uint8Array, index);
              index += uint8Array.length;
            }

            yield command;

            if (LFidx < buf.length - 1) {
              buf = new Uint8Array(buf.subarray(LFidx + 1));

              this._incomingBuffers.push(buf);

              i = 0;
            } else {
              // clear the timeout when an entire command has arrived
              // and not waiting on more data for next command
              clearTimeout(this._socketTimeoutTimer);
              this._socketTimeoutTimer = null;
              return;
            }
          } else {
            return;
          }

      }
    }
  } // PRIVATE METHODS

  /**
   * Processes a command from the queue. The command is parsed and feeded to a handler
   */


  _parseIncomingCommands(commands) {
    for (var command of commands) {
      this._clearIdle();
      /*
       * The "+"-tagged response is a special case:
       * Either the server can asks for the next chunk of data, e.g. for the AUTHENTICATE command.
       *
       * Or there was an error in the XOAUTH2 authentication, for which SASL initial client response extension
       * dictates the client sends an empty EOL response to the challenge containing the error message.
       *
       * Details on "+"-tagged response:
       *   https://tools.ietf.org/html/rfc3501#section-2.2.1
       */
      //


      if (command[0] === ASCII_PLUS) {
        if (this._currentCommand.data.length) {
          // feed the next chunk of data
          var chunk = this._currentCommand.data.shift();

          chunk += !this._currentCommand.data.length ? EOL : ''; // EOL if there's nothing more to send

          this.send(chunk);
        } else if (this._currentCommand.errorResponseExpectsEmptyLine) {
          this.send(EOL); // XOAUTH2 empty response, error will be reported when server continues with NO response
        }

        continue;
      }

      var response;

      try {
        const valueAsString = this._currentCommand.request && this._currentCommand.request.valueAsString;
        response = (0, _emailjsImapHandler.parser)(command, {
          valueAsString
        });
        this.logger.debug('S:', () => (0, _emailjsImapHandler.compiler)(response, false, true));
      } catch (e) {
        this.logger.error('Error parsing imap command!', response);
        return this._onError(e);
      }

      this._processResponse(response);

      this._handleResponse(response); // first response from the server, connection is now usable


      if (!this._connectionReady) {
        this._connectionReady = true;
        this.onready && this.onready();
      }
    }
  }
  /**
   * Feeds a parsed response object to an appropriate handler
   *
   * @param {Object} response Parsed command object
   */


  _handleResponse(response) {
    var command = (0, _ramda.propOr)('', 'command', response).toUpperCase().trim();

    if (!this._currentCommand) {
      // unsolicited untagged response
      if (response.tag === '*' && command in this._globalAcceptUntagged) {
        this._globalAcceptUntagged[command](response);

        this._canSend = true;

        this._sendRequest();
      }
    } else if (this._currentCommand.payload && response.tag === '*' && command in this._currentCommand.payload) {
      // expected untagged response
      this._currentCommand.payload[command].push(response);
    } else if (response.tag === '*' && command in this._globalAcceptUntagged) {
      // unexpected untagged response
      this._globalAcceptUntagged[command](response);
    } else if (response.tag === this._currentCommand.tag) {
      // tagged response
      if (this._currentCommand.payload && Object.keys(this._currentCommand.payload).length) {
        response.payload = this._currentCommand.payload;
      }

      this._currentCommand.callback(response);

      this._canSend = true;

      this._sendRequest();
    }
  }
  /**
   * Sends a command from client queue to the server.
   */


  _sendRequest() {
    if (!this._clientQueue.length) {
      return this._enterIdle();
    }

    this._clearIdle(); // an operation was made in the precheck, no need to restart the queue manually


    this._restartQueue = false;
    var command = this._clientQueue[0];

    if (typeof command.precheck === 'function') {
      // remember the context
      var context = command;
      var precheck = context.precheck;
      delete context.precheck; // we need to restart the queue handling if no operation was made in the precheck

      this._restartQueue = true; // invoke the precheck command and resume normal operation after the promise resolves

      precheck(context).then(() => {
        // we're done with the precheck
        if (this._restartQueue) {
          // we need to restart the queue handling
          this._sendRequest();
        }
      }).catch(err => {
        // precheck failed, so we remove the initial command
        // from the queue, invoke its callback and resume normal operation
        let cmd;

        const index = this._clientQueue.indexOf(context);

        if (index >= 0) {
          cmd = this._clientQueue.splice(index, 1)[0];
        }

        if (cmd && cmd.callback) {
          cmd.callback(err);
          this._canSend = true;

          this._parseIncomingCommands(this._iterateIncomingBuffer()); // Consume the rest of the incoming buffer


          this._sendRequest(); // continue sending

        }
      });
      return;
    }

    this._canSend = false;
    this._currentCommand = this._clientQueue.shift();

    try {
      this._currentCommand.data = (0, _emailjsImapHandler.compiler)(this._currentCommand.request, true);
      this.logger.debug('C:', () => (0, _emailjsImapHandler.compiler)(this._currentCommand.request, false, true)); // excludes passwords etc.
    } catch (e) {
      this.logger.error('Error compiling imap command!', this._currentCommand.request);
      return this._onError(new Error('Error compiling imap command!'));
    }

    var data = this._currentCommand.data.shift();

    this.send(data + (!this._currentCommand.data.length ? EOL : ''));
    return this.waitDrain;
  }
  /**
   * Emits onidle, noting to do currently
   */


  _enterIdle() {
    clearTimeout(this._idleTimer);
    this._idleTimer = setTimeout(() => this.onidle && this.onidle(), this.timeoutEnterIdle);
  }
  /**
   * Cancel idle timer
   */


  _clearIdle() {
    clearTimeout(this._idleTimer);
    this._idleTimer = null;
  }
  /**
   * Method processes a response into an easier to handle format.
   * Add untagged numbered responses (e.g. FETCH) into a nicely feasible form
   * Checks if a response includes optional response codes
   * and copies these into separate properties. For example the
   * following response includes a capability listing and a human
   * readable message:
   *
   *     * OK [CAPABILITY ID NAMESPACE] All ready
   *
   * This method adds a 'capability' property with an array value ['ID', 'NAMESPACE']
   * to the response object. Additionally 'All ready' is added as 'humanReadable' property.
   *
   * See possiblem IMAP Response Codes at https://tools.ietf.org/html/rfc5530
   *
   * @param {Object} response Parsed response object
   */


  _processResponse(response) {
    let command = (0, _ramda.propOr)('', 'command', response).toUpperCase().trim(); // no attributes

    if (!response || !response.attributes || !response.attributes.length) {
      return;
    } // untagged responses w/ sequence numbers


    if (response.tag === '*' && /^\d+$/.test(response.command) && response.attributes[0].type === 'ATOM') {
      response.nr = Number(response.command);
      response.command = (response.attributes.shift().value || '').toString().toUpperCase().trim();
    } // no optional response code


    if (['OK', 'NO', 'BAD', 'BYE', 'PREAUTH'].indexOf(command) < 0) {
      return;
    } // If last element of the response is TEXT then this is for humans


    if (response.attributes[response.attributes.length - 1].type === 'TEXT') {
      response.humanReadable = response.attributes[response.attributes.length - 1].value;
    } // Parse and format ATOM values


    if (response.attributes[0].type === 'ATOM' && response.attributes[0].section) {
      const option = response.attributes[0].section.map(key => {
        if (!key) {
          return;
        }

        if (Array.isArray(key)) {
          return key.map(key => (key.value || '').toString().trim());
        } else {
          return (key.value || '').toString().toUpperCase().trim();
        }
      });
      const key = option.shift();
      response.code = key;

      if (option.length === 1) {
        response[key.toLowerCase()] = option[0];
      } else if (option.length > 1) {
        response[key.toLowerCase()] = option;
      }
    }
  }
  /**
   * Checks if a value is an Error object
   *
   * @param {Mixed} value Value to be checked
   * @return {Boolean} returns true if the value is an Error
   */


  isError(value) {
    return !!Object.prototype.toString.call(value).match(/Error\]$/);
  } // COMPRESSION RELATED METHODS

  /**
   * Sets up deflate/inflate for the IO
   */


  enableCompression() {
    this._socketOnData = this.socket.ondata;
    this.compressed = true;

    if (typeof window !== 'undefined' && window.Worker) {
      this._compressionWorker = new Worker(URL.createObjectURL(new Blob([CompressionBlob])));

      this._compressionWorker.onmessage = e => {
        var message = e.data.message;
        var data = e.data.buffer;

        switch (message) {
          case MESSAGE_INFLATED_DATA_READY:
            this._socketOnData({
              data
            });

            break;

          case MESSAGE_DEFLATED_DATA_READY:
            this.waitDrain = this.socket.send(data);
            break;
        }
      };

      this._compressionWorker.onerror = e => {
        this._onError(new Error('Error handling compression web worker: ' + e.message));
      };

      this._compressionWorker.postMessage(createMessage(MESSAGE_INITIALIZE_WORKER));
    } else {
      const inflatedReady = buffer => {
        this._socketOnData({
          data: buffer
        });
      };

      const deflatedReady = buffer => {
        this.waitDrain = this.socket.send(buffer);
      };

      this._compression = new _compression.default(inflatedReady, deflatedReady);
    } // override data handler, decompress incoming data


    this.socket.ondata = evt => {
      if (!this.compressed) {
        return;
      }

      if (this._compressionWorker) {
        this._compressionWorker.postMessage(createMessage(MESSAGE_INFLATE, evt.data), [evt.data]);
      } else {
        this._compression.inflate(evt.data);
      }
    };
  }
  /**
   * Undoes any changes related to compression. This only be called when closing the connection
   */


  _disableCompression() {
    if (!this.compressed) {
      return;
    }

    this.compressed = false;
    this.socket.ondata = this._socketOnData;
    this._socketOnData = null;

    if (this._compressionWorker) {
      // terminate the worker
      this._compressionWorker.terminate();

      this._compressionWorker = null;
    }
  }
  /**
   * Outgoing payload needs to be compressed and sent to socket
   *
   * @param {ArrayBuffer} buffer Outgoing uncompressed arraybuffer
   */


  _sendCompressed(buffer) {
    // deflate
    if (this._compressionWorker) {
      this._compressionWorker.postMessage(createMessage(MESSAGE_DEFLATE, buffer), [buffer]);
    } else {
      this._compression.deflate(buffer);
    }
  }

}

exports.default = Imap;

const createMessage = (message, buffer) => ({
  message,
  buffer
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbWFwLmpzIl0sIm5hbWVzIjpbIk1FU1NBR0VfSU5JVElBTElaRV9XT1JLRVIiLCJNRVNTQUdFX0lORkxBVEUiLCJNRVNTQUdFX0lORkxBVEVEX0RBVEFfUkVBRFkiLCJNRVNTQUdFX0RFRkxBVEUiLCJNRVNTQUdFX0RFRkxBVEVEX0RBVEFfUkVBRFkiLCJFT0wiLCJMSU5FX0ZFRUQiLCJDQVJSSUFHRV9SRVRVUk4iLCJMRUZUX0NVUkxZX0JSQUNLRVQiLCJSSUdIVF9DVVJMWV9CUkFDS0VUIiwiQVNDSUlfUExVUyIsIkJVRkZFUl9TVEFURV9MSVRFUkFMIiwiQlVGRkVSX1NUQVRFX1BPU1NJQkxZX0xJVEVSQUxfTEVOR1RIXzEiLCJCVUZGRVJfU1RBVEVfUE9TU0lCTFlfTElURVJBTF9MRU5HVEhfMiIsIkJVRkZFUl9TVEFURV9ERUZBVUxUIiwiVElNRU9VVF9FTlRFUl9JRExFIiwiVElNRU9VVF9TT0NLRVRfTE9XRVJfQk9VTkQiLCJUSU1FT1VUX1NPQ0tFVF9NVUxUSVBMSUVSIiwiSW1hcCIsImNvbnN0cnVjdG9yIiwiaG9zdCIsInBvcnQiLCJvcHRpb25zIiwidGltZW91dEVudGVySWRsZSIsInRpbWVvdXRTb2NrZXRMb3dlckJvdW5kIiwidGltZW91dFNvY2tldE11bHRpcGxpZXIiLCJ1c2VTZWN1cmVUcmFuc3BvcnQiLCJzZWN1cmVNb2RlIiwiX2Nvbm5lY3Rpb25SZWFkeSIsIl9nbG9iYWxBY2NlcHRVbnRhZ2dlZCIsIl9jbGllbnRRdWV1ZSIsIl9jYW5TZW5kIiwiX3RhZ0NvdW50ZXIiLCJfY3VycmVudENvbW1hbmQiLCJfaWRsZVRpbWVyIiwiX3NvY2tldFRpbWVvdXRUaW1lciIsImNvbXByZXNzZWQiLCJfaW5jb21pbmdCdWZmZXJzIiwiX2J1ZmZlclN0YXRlIiwiX2xpdGVyYWxSZW1haW5pbmciLCJvbmNlcnQiLCJvbmVycm9yIiwib25yZWFkeSIsIm9uaWRsZSIsIl9vbkRhdGEiLCJiaW5kIiwiX29uRXJyb3IiLCJjb25uZWN0IiwiU29ja2V0IiwiVENQU29ja2V0IiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJzb2NrZXQiLCJvcGVuIiwiYmluYXJ5VHlwZSIsImNhIiwid3MiLCJzZXJ2ZXJuYW1lIiwiY2VydCIsImUiLCJvbmNsb3NlIiwiY29uc29sZSIsImxvZyIsIkVycm9yIiwib25kYXRhIiwiZXZ0IiwiZXJyIiwiZGF0YSIsIm1lc3NhZ2UiLCJvbm9wZW4iLCJjbG9zZSIsImVycm9yIiwidGVhckRvd24iLCJmb3JFYWNoIiwiY21kIiwiY2FsbGJhY2siLCJjbGVhclRpbWVvdXQiLCJfZGlzYWJsZUNvbXByZXNzaW9uIiwicmVhZHlTdGF0ZSIsImxvZ291dCIsInRoZW4iLCJjYXRjaCIsImVucXVldWVDb21tYW5kIiwidXBncmFkZSIsInVwZ3JhZGVUb1NlY3VyZSIsInJlcXVlc3QiLCJhY2NlcHRVbnRhZ2dlZCIsImNvbW1hbmQiLCJjb25jYXQiLCJtYXAiLCJ1bnRhZ2dlZCIsInRvU3RyaW5nIiwidG9VcHBlckNhc2UiLCJ0cmltIiwidGFnIiwicGF5bG9hZCIsImxlbmd0aCIsInVuZGVmaW5lZCIsInJlc3BvbnNlIiwiaXNFcnJvciIsImluZGV4T2YiLCJodW1hblJlYWRhYmxlIiwiY29kZSIsIk9iamVjdCIsImtleXMiLCJrZXkiLCJpbmRleCIsImN0eCIsInNwbGljZSIsInB1c2giLCJfc2VuZFJlcXVlc3QiLCJnZXRQcmV2aW91c2x5UXVldWVkIiwiY29tbWFuZHMiLCJzdGFydEluZGV4IiwiaSIsImlzTWF0Y2giLCJzZW5kIiwic3RyIiwiYnVmZmVyIiwidGltZW91dCIsIk1hdGgiLCJmbG9vciIsImJ5dGVMZW5ndGgiLCJzZXRUaW1lb3V0IiwiX3NlbmRDb21wcmVzc2VkIiwic2V0SGFuZGxlciIsImxvZ2dlciIsIlVpbnQ4QXJyYXkiLCJfcGFyc2VJbmNvbWluZ0NvbW1hbmRzIiwiX2l0ZXJhdGVJbmNvbWluZ0J1ZmZlciIsImJ1ZiIsImRpZmYiLCJtaW4iLCJOdW1iZXIiLCJfbGVuZ3RoQnVmZmVyIiwic3RhcnQiLCJsYXRlc3QiLCJzdWJhcnJheSIsInByZXZCdWYiLCJzZXQiLCJsZWZ0SWR4IiwibGVmdE9mTGVmdEN1cmx5IiwiTEZpZHgiLCJjb21tYW5kTGVuZ3RoIiwicmVkdWNlIiwicHJldiIsImN1cnIiLCJ1aW50OEFycmF5Iiwic2hpZnQiLCJyZW1haW5pbmdMZW5ndGgiLCJleGNlc3NMZW5ndGgiLCJfY2xlYXJJZGxlIiwiY2h1bmsiLCJlcnJvclJlc3BvbnNlRXhwZWN0c0VtcHR5TGluZSIsInZhbHVlQXNTdHJpbmciLCJkZWJ1ZyIsIl9wcm9jZXNzUmVzcG9uc2UiLCJfaGFuZGxlUmVzcG9uc2UiLCJfZW50ZXJJZGxlIiwiX3Jlc3RhcnRRdWV1ZSIsInByZWNoZWNrIiwiY29udGV4dCIsIndhaXREcmFpbiIsImF0dHJpYnV0ZXMiLCJ0ZXN0IiwidHlwZSIsIm5yIiwidmFsdWUiLCJzZWN0aW9uIiwib3B0aW9uIiwiQXJyYXkiLCJpc0FycmF5IiwidG9Mb3dlckNhc2UiLCJwcm90b3R5cGUiLCJjYWxsIiwibWF0Y2giLCJlbmFibGVDb21wcmVzc2lvbiIsIl9zb2NrZXRPbkRhdGEiLCJ3aW5kb3ciLCJXb3JrZXIiLCJfY29tcHJlc3Npb25Xb3JrZXIiLCJVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJCbG9iIiwiQ29tcHJlc3Npb25CbG9iIiwib25tZXNzYWdlIiwicG9zdE1lc3NhZ2UiLCJjcmVhdGVNZXNzYWdlIiwiaW5mbGF0ZWRSZWFkeSIsImRlZmxhdGVkUmVhZHkiLCJfY29tcHJlc3Npb24iLCJDb21wcmVzc2lvbiIsImluZmxhdGUiLCJ0ZXJtaW5hdGUiLCJkZWZsYXRlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7O3MreENBR0E7QUFDQTtBQUNBOztBQUNBLE1BQU1BLHlCQUF5QixHQUFHLE9BQWxDO0FBQ0EsTUFBTUMsZUFBZSxHQUFHLFNBQXhCO0FBQ0EsTUFBTUMsMkJBQTJCLEdBQUcsZ0JBQXBDO0FBQ0EsTUFBTUMsZUFB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WSxNQUFaLEdBQXFCLEtBQUtpSCxhQUExQjtBQUNBLFNBQUtBLGFBQUwsR0FBcUIsSUFBckI7O0FBRUEsUUFBSSxLQUFLRyxrQkFBVCxFQUE2QjtBQUMzQjtBQUNBLFdBQUtBLGtCQUFMLENBQXdCYSxTQUF4Qjs7QUFDQSxXQUFLYixrQkFBTCxHQUEwQixJQUExQjtBQUNEO0FBQ0Y7QUFFRDs7Ozs7OztBQUtBeEQsRUFBQUEsZUFBZSxDQUFFTixNQUFGLEVBQVU7QUFDdkI7QUFDQSxRQUFJLEtBQUs4RCxrQkFBVCxFQUE2QjtBQUMzQixXQUFLQSxrQkFBTCxDQUF3Qk0sV0FBeEIsQ0FBb0NDLGFBQWEsQ0FBQ3pMLGVBQUQsRUFBa0JvSCxNQUFsQixDQUFqRCxFQUE0RSxDQUFDQSxNQUFELENBQTVFO0FBQ0QsS0FGRCxNQUVPO0FBQ0wsV0FBS3dFLFlBQUwsQ0FBa0JJLE9BQWxCLENBQTBCNUUsTUFBMUI7QUFDRDtBQUNGOztBQXB5QnVCOzs7O0FBdXlCMUIsTUFBTXFFLGFBQWEsR0FBRyxDQUFDdkgsT0FBRCxFQUFVa0QsTUFBVixNQUFzQjtBQUFFbEQsRUFBQUEsT0FBRjtBQUFXa0QsRUFBQUE7QUFBWCxDQUF0QixDQUF0QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHByb3BPciB9IGZyb20gJ3JhbWRhJ1xuaW1wb3J0IFRDUFNvY2tldCBmcm9tICdlbWFpbGpzLXRjcC1zb2NrZXQnXG5pbXBvcnQgeyB0b1R5cGVkQXJyYXksIGZyb21UeXBlZEFycmF5IH0gZnJvbSAnLi9jb21tb24nXG5pbXBvcnQgeyBwYXJzZXIsIGNvbXBpbGVyIH0gZnJvbSAnZW1haWxqcy1pbWFwLWhhbmRsZXInXG5pbXBvcnQgQ29tcHJlc3Npb24gZnJvbSAnLi9jb21wcmVzc2lvbidcbmltcG9ydCBDb21wcmVzc2lvbkJsb2IgZnJvbSAnLi4vcmVzL2NvbXByZXNzaW9uLndvcmtlci5ibG9iJ1xuXG4vL1xuLy8gY29uc3RhbnRzIHVzZWQgZm9yIGNvbW11bmljYXRpb24gd2l0aCB0aGUgd29ya2VyXG4vL1xuY29uc3QgTUVTU0FHRV9JTklUSUFMSVpFX1dPUktFUiA9ICdzdGFydCdcbmNvbnN0IE1FU1NBR0VfSU5GTEFURSA9ICdpbmZsYXRlJ1xuY29uc3QgTUVTU0FHRV9JTkZMQVRFRF9EQVRBX1JFQURZID0gJ2luZmxhdGVkX3JlYWR5J1xuY29uc3QgTUVTU0FHRV9ERUZMQVRFID0gJ2RlZmxhdGUnXG5jb25zdCBNRVNTQUdFX0RFRkxBVEVEX0RBVEFfUkVBRFkgPSAnZGVmbGF0ZWRfcmVhZHknXG5cbmNvbnN0IEVPTCA9ICdcXHJcXG4nXG5jb25zdCBMSU5FX0ZFRUQgPSAxMFxuY29uc3QgQ0FSUklBR0VfUkVUVVJOID0gMTNcbmNvbnN0IExFRlRfQ1VSTFlfQlJBQ0tFVCA9IDEyM1xuY29uc3QgUklHSFRfQ1VSTFlfQlJBQ0tFVCA9IDEyNVxuXG5jb25zdCBBU0NJSV9QTFVTID0gNDNcblxuLy8gU3RhdGUgdHJhY2tpbmcgd2hlbiBjb25zdHJ1Y3RpbmcgYW4gSU1BUCBjb21tYW5kIGZyb20gYnVmZmVycy5cbmNvbnN0IEJVRkZFUl9TVEFURV9MSVRFUkFMID0gJ2xpdGVyYWwnXG5jb25zdCBCVUZGRVJfU1RBVEVfUE9TU0lCTFlfTElURVJBTF9MRU5HVEhfMSA9ICdsaXRlcmFsX2xlbmd0aF8xJ1xuY29uc3QgQlVGRkVSX1NUQVRFX1BPU1NJQkxZX0xJVEVSQUxfTEVOR1RIXzIgPSAnbGl0ZXJhbF9sZW5ndGhfMidcbmNvbnN0IEJVRkZFUl9TVEFURV9ERUZBVUxUID0gJ2RlZmF1bHQnXG5cbi8qKlxuICogSG93IG11Y2ggdGltZSB0byB3YWl0IHNpbmNlIHRoZSBsYXN0IHJlc3BvbnNlIHVudGlsIHRoZSBjb25uZWN0aW9uIGlzIGNvbnNpZGVyZWQgaWRsaW5nXG4gKi9cbmNvbnN0IFRJTUVPVVRfRU5URVJfSURMRSA9IDEwMDBcblxuLyoqXG4gKiBMb3dlciBCb3VuZCBmb3Igc29ja2V0IHRpbWVvdXQgdG8gd2FpdCBzaW5jZSB0aGUgbGFzdCBkYXRhIHdhcyB3cml0dGVuIHRvIGEgc29ja2V0XG4gKi9cbmNvbnN0IFRJTUVPVVRfU09DS0VUX0xPV0VSX0JPVU5EID0gMTAwMDBcblxuLyoqXG4gKiBNdWx0aXBsaWVyIGZvciBzb2NrZXQgdGltZW91dDpcbiAqXG4gKiBXZSBhc3N1bWUgYXQgbGVhc3QgYSBHUFJTIGNvbm5lY3Rpb24gd2l0aCAxMTUga2IvcyA9IDE0LDM3NSBrQi9zIHRvcHMsIHNvIDEwIEtCL3MgdG8gYmUgb25cbiAqIHRoZSBzYWZlIHNpZGUuIFdlIGNhbiB0aW1lb3V0IGFmdGVyIGEgbG93ZXIgYm91bmQgb2YgMTBzICsgKG4gS0IgLyAxMCBLQi9zKS4gQSAxIE1CIG1lc3NhZ2VcbiAqIHVwbG9hZCB3b3VsZCBiZSAxMTAgc2Vjb25kcyB0byB3YWl0IGZvciB0aGUgdGltZW91dC4gMTAgS0IvcyA9PT0gMC4xIHMvQlxuICovXG5jb25zdCBUSU1FT1VUX1NPQ0tFVF9NVUxUSVBMSUVSID0gMC4xXG5cbi8qKlxuICogQ3JlYXRlcyBhIGNvbm5lY3Rpb24gb2JqZWN0IHRvIGFuIElNQVAgc2VydmVyLiBDYWxsIGBjb25uZWN0YCBtZXRob2QgdG8gaW5pdGl0YXRlXG4gKiB0aGUgYWN0dWFsIGNvbm5lY3Rpb24sIHRoZSBjb25zdHJ1Y3RvciBvbmx5IGRlZmluZXMgdGhlIHByb3BlcnRpZXMgYnV0IGRvZXMgbm90IGFjdHVhbGx5IGNvbm5lY3QuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IFtob3N0PSdsb2NhbGhvc3QnXSBIb3N0bmFtZSB0byBjb25lbmN0IHRvXG4gKiBAcGFyYW0ge051bWJlcn0gW3BvcnQ9MTQzXSBQb3J0IG51bWJlciB0byBjb25uZWN0IHRvXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0XG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLnVzZVNlY3VyZVRyYW5zcG9ydF0gU2V0IHRvIHRydWUsIHRvIHVzZSBlbmNyeXB0ZWQgY29ubmVjdGlvblxuICogQHBhcmFtIHtTdHJpbmd9IFtvcHRpb25zLmNvbXByZXNzaW9uV29ya2VyUGF0aF0gb2ZmbG9hZHMgZGUtL2NvbXByZXNzaW9uIGNvbXB1dGF0aW9uIHRvIGEgd2ViIHdvcmtlciwgdGhpcyBpcyB0aGUgcGF0aCB0byB0aGUgYnJvd3NlcmlmaWVkIGVtYWlsanMtY29tcHJlc3Nvci13b3JrZXIuanNcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSW1hcCB7XG4gIGNvbnN0cnVjdG9yIChob3N0LCBwb3J0LCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLnRpbWVvdXRFbnRlcklkbGUgPSBUSU1FT1VUX0VOVEVSX0lETEVcbiAgICB0aGlzLnRpbWVvdXRTb2NrZXRMb3dlckJvdW5kID0gVElNRU9VVF9TT0NLRVRfTE9XRVJfQk9VTkRcbiAgICB0aGlzLnRpbWVvdXRTb2NrZXRNdWx0aXBsaWVyID0gVElNRU9VVF9TT0NLRVRfTVVMVElQTElFUlxuXG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9uc1xuXG4gICAgdGhpcy5wb3J0ID0gcG9ydCB8fCAodGhpcy5vcHRpb25zLnVzZVNlY3VyZVRyYW5zcG9ydCA/IDk5MyA6IDE0MylcbiAgICB0aGlzLmhvc3QgPSBob3N0IHx8ICdsb2NhbGhvc3QnXG5cbiAgICAvLyBVc2UgYSBUTFMgY29ubmVjdGlvbi4gUG9ydCA5OTMgYWxzbyBmb3JjZXMgVExTLlxuICAgIHRoaXMub3B0aW9ucy51c2VTZWN1cmVUcmFuc3BvcnQgPSAndXNlU2VjdXJlVHJhbnNwb3J0JyBpbiB0aGlzLm9wdGlvbnMgPyAhIXRoaXMub3B0aW9ucy51c2VTZWN1cmVUcmFuc3BvcnQgOiB0aGlzLnBvcnQgPT09IDk5M1xuXG4gICAgdGhpcy5zZWN1cmVNb2RlID0gISF0aGlzLm9wdGlvbnMudXNlU2VjdXJlVHJhbnNwb3J0IC8vIERvZXMgdGhlIGNvbm5lY3Rpb24gdXNlIFNTTC9UTFNcblxuICAgIHRoaXMuX2Nvbm5lY3Rpb25SZWFkeSA9IGZhbHNlIC8vIElzIHRoZSBjb25lY3Rpb24gZXN0YWJsaXNoZWQgYW5kIGdyZWV0aW5nIGlzIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZlclxuXG4gICAgdGhpcy5fZ2xvYmFsQWNjZXB0VW50YWdnZWQgPSB7fSAvLyBHbG9iYWwgaGFuZGxlcnMgZm9yIHVucmVsYXRlZCByZXNwb25zZXMgKEVYUFVOR0UsIEVYSVNUUyBldGMuKVxuXG4gICAgdGhpcy5fY2xpZW50UXVldWUgPSBbXSAvLyBRdWV1ZSBvZiBvdXRnb2luZyBjb21tYW5kc1xuICAgIHRoaXMuX2NhblNlbmQgPSBmYWxzZSAvLyBJcyBpdCBPSyB0byBzZW5kIHNvbWV0aGluZyB0byB0aGUgc2VydmVyXG4gICAgdGhpcy5fdGFnQ291bnRlciA9IDAgLy8gQ291bnRlciB0byBhbGxvdyB1bmlxdWV1ZSBpbWFwIHRhZ3NcbiAgICB0aGlzLl9jdXJyZW50Q29tbWFuZCA9IGZhbHNlIC8vIEN1cnJlbnQgY29tbWFuZCB0aGF0IGlzIHdhaXRpbmcgZm9yIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlclxuXG4gICAgdGhpcy5faWRsZVRpbWVyID0gZmFsc2UgLy8gVGltZXIgd2FpdGluZyB0byBlbnRlciBpZGxlXG4gICAgdGhpcy5fc29ja2V0VGltZW91dFRpbWVyID0gZmFsc2UgLy8gVGltZXIgd2FpdGluZyB0byBkZWNsYXJlIHRoZSBzb2NrZXQgZGVhZCBzdGFydGluZyBmcm9tIHRoZSBsYXN0IHdyaXRlXG5cbiAgICB0aGlzLmNvbXByZXNzZWQgPSBmYWxzZSAvLyBJcyB0aGUgY29ubmVjdGlvbiBjb21wcmVzc2VkIGFuZCBuZWVkcyBpbmZsYXRpbmcvZGVmbGF0aW5nXG5cbiAgICAvL1xuICAgIC8vIEhFTFBFUlNcbiAgICAvL1xuXG4gICAgLy8gQXMgdGhlIHNlcnZlciBzZW5kcyBkYXRhIGluIGNodW5rcywgaXQgbmVlZHMgdG8gYmUgc3BsaXQgaW50byBzZXBhcmF0ZSBsaW5lcy4gSGVscHMgcGFyc2luZyB0aGUgaW5wdXQuXG4gICAgdGhpcy5faW5jb21pbmdCdWZmZXJzID0gW11cbiAgICB0aGlzLl9idWZmZXJTdGF0ZSA9IEJVRkZFUl9TVEFURV9ERUZBVUxUXG4gICAgdGhpcy5fbGl0ZXJhbFJlbWFpbmluZyA9IDBcblxuICAgIC8vXG4gICAgLy8gRXZlbnQgcGxhY2Vob2xkZXJzLCBtYXkgYmUgb3ZlcnJpZGVuIHdpdGggY2FsbGJhY2sgZnVuY3Rpb25zXG4gICAgLy9cbiAgICB0aGlzLm9uY2VydCA9IG51bGxcbiAgICB0aGlzLm9uZXJyb3IgPSBudWxsIC8vIElycmVjb3ZlcmFibGUgZXJyb3Igb2NjdXJyZWQuIENvbm5lY3Rpb24gdG8gdGhlIHNlcnZlciB3aWxsIGJlIGNsb3NlZCBhdXRvbWF0aWNhbGx5LlxuICAgIHRoaXMub25yZWFkeSA9IG51bGwgLy8gVGhlIGNvbm5lY3Rpb24gdG8gdGhlIHNlcnZlciBoYXMgYmVlbiBlc3RhYmxpc2hlZCBhbmQgZ3JlZXRpbmcgaXMgcmVjZWl2ZWRcbiAgICB0aGlzLm9uaWRsZSA9IG51bGwgLy8gVGhlcmUgYXJlIG5vIG1vcmUgY29tbWFuZHMgdG8gcHJvY2Vzc1xuXG4gICAgdGhpcy5fb25EYXRhID0gdGhpcy5fb25EYXRhLmJpbmQodGhpcylcbiAgICB0aGlzLl9vbkVycm9yID0gdGhpcy5fb25FcnJvci5iaW5kKHRoaXMpXG4gIH1cblxuICAvLyBQVUJMSUMgTUVUSE9EU1xuXG4gIC8qKlxuICAgKiBJbml0aWF0ZSBhIGNvbm5lY3Rpb24gdG8gdGhlIHNlcnZlci4gV2FpdCBmb3Igb25yZWFkeSBldmVudFxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gU29ja2V0XG4gICAqICAgICBURVNUSU5HIE9OTFkhIFRoZSBUQ1BTb2NrZXQgaGFzIGEgcHJldHR5IG5vbnNlbnNpY2FsIGNvbnZlbmllbmNlIGNvbnN0cnVjdG9yLFxuICAgKiAgICAgd2hpY2ggbWFrZXMgaXQgaGFyZCB0byBtb2NrLiBGb3IgZGVwZW5kZW5jeS1pbmplY3Rpb24gcHVycG9zZXMsIHdlIHVzZSB0aGVcbiAgICogICAgIFNvY2tldCBwYXJhbWV0ZXIgdG8gcGFzcyBpbiBhIG1vY2sgU29ja2V0IGltcGxlbWVudGF0aW9uLiBTaG91bGQgYmUgbGVmdCBibGFua1xuICAgKiAgICAgaW4gcHJvZHVjdGlvbiB1c2UhXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBSZXNvbHZlcyB3aGVuIHNvY2tldCBpcyBvcGVuZWRcbiAgICovXG4gIGNvbm5lY3QgKFNvY2tldCA9IFRDUFNvY2tldCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICB0aGlzLnNvY2tldCA9IFNvY2tldC5vcGVuKHRoaXMuaG9zdCwgdGhpcy5wb3J0LCB7XG4gICAgICAgICAgYmluYXJ5VHlwZTogJ2FycmF5YnVmZmVyJyxcbiAgICAgICAgICB1c2VTZWN1cmVUcmFuc3BvcnQ6IHRoaXMuc2VjdXJlTW9kZSxcbiAgICAgICAgICBjYTogdGhpcy5vcHRpb25zLmNhLFxuICAgICAgICAgIHdzOiB0aGlzLm9wdGlvbnMud3MsXG4gICAgICAgICAgc2VydmVybmFtZTogdGhpcy5vcHRpb25zLnNlcnZlcm5hbWVcbiAgICAgICAgfSlcbiAgICAgICAgLy8gYWxsb3dzIGNlcnRpZmljYXRlIGhhbmRsaW5nIGZvciBwbGF0Zm9ybSB3L28gbmF0aXZlIHRscyBzdXBwb3J0XG4gICAgICAgIC8vIG9uY2VydCBpcyBub24gc3RhbmRhcmQgc28gc2V0dGluZyBpdCBtaWdodCB0aHJvdyBpZiB0aGUgc29ja2V0IG9iamVjdCBpcyBpbW11dGFibGVcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB0aGlzLnNvY2tldC5vbmNlcnQgPSAoY2VydCkgPT4geyB0aGlzLm9uY2VydCAmJiB0aGlzLm9uY2VydChjZXJ0KSB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbm5lY3Rpb24gY2xvc2luZyB1bmV4cGVjdGVkIGlzIGFuIGVycm9yXG4gICAgICAgIHRoaXMuc29ja2V0Lm9uY2xvc2UgPSAoZSkgPT4ge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdjbG9zZSAnLCBlKVxuICAgICAgICAgIHRoaXMuX29uRXJyb3IobmV3IEVycm9yKCdTb2NrZXQgY2xvc2VkIHVuZXhwZWN0ZWRseSEnICsgdGhpcy5ob3N0KSlcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc29ja2V0Lm9uZGF0YSA9IChldnQpID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fb25EYXRhKGV2dClcbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHRoaXMuX29uRXJyb3IoZXJyKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIGFuIGVycm9yIGhhcHBlbnMgZHVyaW5nIGNyZWF0ZSB0aW1lLCByZWplY3QgdGhlIHByb21pc2VcbiAgICAgICAgdGhpcy5zb2NrZXQub25lcnJvciA9IChlKSA9PiB7XG4gICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignQ291bGQgbm90IG9wZW4gc29ja2V0OiAnICsgZS5kYXRhLm1lc3NhZ2UpKVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zb2NrZXQub25vcGVuID0gKCkgPT4ge1xuICAgICAgICAgIC8vIHVzZSBwcm9wZXIgXCJpcnJlY292ZXJhYmxlIGVycm9yLCB0ZWFyIGRvd24gZXZlcnl0aGluZ1wiLWhhbmRsZXIgb25seSBhZnRlciBzb2NrZXQgaXMgb3BlblxuICAgICAgICAgIHRoaXMuc29ja2V0Lm9uZXJyb3IgPSAoZSkgPT4gdGhpcy5fb25FcnJvcihlKVxuICAgICAgICAgIHJlc29sdmUoKVxuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJlamVjdChlKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIHRoZSBjb25uZWN0aW9uIHRvIHRoZSBzZXJ2ZXJcbiAgICpcbiAgICogQHJldHVybnMge1Byb21pc2V9IFJlc29sdmVzIHdoZW4gdGhlIHNvY2tldCBpcyBjbG9zZWRcbiAgICovXG4gIGNsb3NlIChlcnJvcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCB0ZWFyRG93biA9ICgpID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBmdWxmaWxsIHBlbmRpbmcgcHJvbWlzZXNcbiAgICAgICAgICB0aGlzLl9jbGllbnRRdWV1ZS5mb3JFYWNoKGNtZCA9PiBjbWQuY2FsbGJhY2soZXJyb3IpKVxuICAgICAgICAgIGlmICh0aGlzLl9jdXJyZW50Q29tbWFuZCkge1xuICAgICAgICAgICAgdGhpcy5fY3VycmVudENvbW1hbmQuY2FsbGJhY2soZXJyb3IpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGhpcy5fY29ubmVjdGlvblJlYWR5ID0gZmFsc2VcbiAgICAgICAgICB0aGlzLl9jbGllbnRRdWV1ZSA9IFtdXG4gICAgICAgICAgdGhpcy5fdGFnQ291bnRlciA9IDBcbiAgICAgICAgICB0aGlzLl9jdXJyZW50Q29tbWFuZCA9IGZhbHNlXG5cbiAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5faWRsZVRpbWVyKVxuICAgICAgICAgIHRoaXMuX2lkbGVUaW1lciA9IG51bGxcblxuICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLl9zb2NrZXRUaW1lb3V0VGltZXIpXG4gICAgICAgICAgdGhpcy5fc29ja2V0VGltZW91dFRpbWVyID0gbnVsbFxuXG4gICAgICAgICAgaWYgKHRoaXMuc29ja2V0KSB7XG4gICAgICAgICAgICAvLyByZW1vdmUgYWxsIGxpc3RlbmVyc1xuICAgICAgICAgICAgdGhpcy5zb2NrZXQub25vcGVuID0gbnVsbFxuICAgICAgICAgICAgdGhpcy5zb2NrZXQub25jbG9zZSA9IG51bGxcbiAgICAgICAgICAgIHRoaXMuc29ja2V0Lm9uZGF0YSA9IG51bGxcbiAgICAgICAgICAgIHRoaXMuc29ja2V0Lm9uZXJyb3IgPSBudWxsXG4gICAgICAgICAgICB0aGlzLnNvY2tldC5vbmNlcnQgPSBudWxsXG5cbiAgICAgICAgICAgIHRoaXMuc29ja2V0ID0gbnVsbFxuICAgICAgICAgIH1cbiAgICAgICAgICByZXNvbHZlKClcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLl9kaXNhYmxlQ29tcHJlc3Npb24oKVxuXG4gICAgICBpZiAoIXRoaXMuc29ja2V0IHx8IHRoaXMuc29ja2V0LnJlYWR5U3RhdGUgIT09ICdvcGVuJykge1xuICAgICAgICByZXR1cm4gdGVhckRvd24oKVxuICAgICAgfVxuXG4gICAgICB0aGlzLnNvY2tldC5vbmNsb3NlID0gdGhpcy5zb2NrZXQub25lcnJvciA9IHRlYXJEb3duIC8vIHdlIGRvbid0IHJlYWxseSBjYXJlIGFib3V0IHRoZSBlcnJvciBoZXJlXG4gICAgICB0aGlzLnNvY2tldC5jbG9zZSgpXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kIExPR09VVCB0byB0aGUgc2VydmVyLlxuICAgKlxuICAgKiBVc2UgaXMgZGlzY291cmFnZWQhXG4gICAqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBSZXNvbHZlcyB3aGVuIGNvbm5lY3Rpb24gaXMgY2xvc2VkIGJ5IHNlcnZlci5cbiAgICovXG4gIGxvZ291dCAoKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMuc29ja2V0Lm9uY2xvc2UgPSB0aGlzLnNvY2tldC5vbmVycm9yID0gKCkgPT4ge1xuICAgICAgICB0aGlzLmNsb3NlKCdDbGllbnQgbG9nZ2luZyBvdXQnKS50aGVuKHJlc29sdmUpLmNhdGNoKHJlamVjdClcbiAgICAgIH1cblxuICAgICAgdGhpcy5lbnF1ZXVlQ29tbWFuZCgnTE9HT1VUJylcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYXRlcyBUTFMgaGFuZHNoYWtlXG4gICAqL1xuICB1cGdyYWRlICgpIHtcbiAgICB0aGlzLnNlY3VyZU1vZGUgPSB0cnVlXG4gICAgdGhpcy5zb2NrZXQudXBncmFkZVRvU2VjdXJlKClcbiAgfVxuXG4gIC8qKlxuICAgKiBTY2hlZHVsZXMgYSBjb21tYW5kIHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlci5cbiAgICogU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9lbWFpbGpzL2VtYWlsanMtaW1hcC1oYW5kbGVyIGZvciByZXF1ZXN0IHN0cnVjdHVyZS5cbiAgICogRG8gbm90IHByb3ZpZGUgYSB0YWcgcHJvcGVydHksIGl0IHdpbGwgYmUgc2V0IGJ5IHRoZSBxdWV1ZSBtYW5hZ2VyLlxuICAgKlxuICAgKiBUbyBjYXRjaCB1bnRhZ2dlZCByZXNwb25zZXMgdXNlIGFjY2VwdFVudGFnZ2VkIHByb3BlcnR5LiBGb3IgZXhhbXBsZSwgaWZcbiAgICogdGhlIHZhbHVlIGZvciBpdCBpcyAnRkVUQ0gnIHRoZW4gdGhlIHJlcG9uc2UgaW5jbHVkZXMgJ3BheWxvYWQuRkVUQ0gnIHByb3BlcnR5XG4gICAqIHRoYXQgaXMgYW4gYXJyYXkgaW5jbHVkaW5nIGFsbCBsaXN0ZWQgKiBGRVRDSCByZXNwb25zZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSByZXF1ZXN0IFN0cnVjdHVyZWQgcmVxdWVzdCBvYmplY3RcbiAgICogQHBhcmFtIHtBcnJheX0gYWNjZXB0VW50YWdnZWQgYSBsaXN0IG9mIHVudGFnZ2VkIHJlc3BvbnNlcyB0aGF0IHdpbGwgYmUgaW5jbHVkZWQgaW4gJ3BheWxvYWQnIHByb3BlcnR5XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gT3B0aW9uYWwgZGF0YSBmb3IgdGhlIGNvbW1hbmQgcGF5bG9hZFxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUHJvbWlzZSB0aGF0IHJlc29sdmVzIHdoZW4gdGhlIGNvcnJlc3BvbmRpbmcgcmVzcG9uc2Ugd2FzIHJlY2VpdmVkXG4gICAqL1xuICBlbnF1ZXVlQ29tbWFuZCAocmVxdWVzdCwgYWNjZXB0VW50YWdnZWQsIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIHJlcXVlc3QgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXF1ZXN0ID0ge1xuICAgICAgICBjb21tYW5kOiByZXF1ZXN0XG4gICAgICB9XG4gICAgfVxuXG4gICAgYWNjZXB0VW50YWdnZWQgPSBbXS5jb25jYXQoYWNjZXB0VW50YWdnZWQgfHwgW10pLm1hcCgodW50YWdnZWQpID0+ICh1bnRhZ2dlZCB8fCAnJykudG9TdHJpbmcoKS50b1VwcGVyQ2FzZSgpLnRyaW0oKSlcblxuICAgIHZhciB0YWcgPSAnVycgKyAoKyt0aGlzLl90YWdDb3VudGVyKVxuICAgIHJlcXVlc3QudGFnID0gdGFnXG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgIHRhZzogdGFnLFxuICAgICAgICByZXF1ZXN0OiByZXF1ZXN0LFxuICAgICAgICBwYXlsb2FkOiBhY2NlcHRVbnRhZ2dlZC5sZW5ndGggPyB7fSA6IHVuZGVmaW5lZCxcbiAgICAgICAgY2FsbGJhY2s6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgIGlmICh0aGlzLmlzRXJyb3IocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVqZWN0KHJlc3BvbnNlKVxuICAgICAgICAgIH0gZWxzZSBpZiAoWydOTycsICdCQUQnXS5pbmRleE9mKHByb3BPcignJywgJ2NvbW1hbmQnLCByZXNwb25zZSkudG9VcHBlckNhc2UoKS50cmltKCkpID49IDApIHtcbiAgICAgICAgICAgIC8vIElnbm9yZSBRUSBFbWFpbCBOTyBjb21tYW5kIG1lc3NhZ2UgYE5lZWQgdG8gU0VMRUNUIGZpcnN0IWBcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5odW1hblJlYWRhYmxlICE9PSAnTmVlZCB0byBTRUxFQ1QgZmlyc3QhJykge1xuICAgICAgICAgICAgICB2YXIgZXJyb3IgPSBuZXcgRXJyb3IocmVzcG9uc2UuaHVtYW5SZWFkYWJsZSB8fCAnRXJyb3InKVxuICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuY29kZSkge1xuICAgICAgICAgICAgICAgIGVycm9yLmNvZGUgPSByZXNwb25zZS5jb2RlXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChlcnJvcilcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXNvbHZlKHJlc3BvbnNlKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIGFwcGx5IGFueSBhZGRpdGlvbmFsIG9wdGlvbnMgdG8gdGhlIGNvbW1hbmRcbiAgICAgIE9iamVjdC5rZXlzKG9wdGlvbnMgfHwge30pLmZvckVhY2goKGtleSkgPT4geyBkYXRhW2tleV0gPSBvcHRpb25zW2tleV0gfSlcblxuICAgICAgYWNjZXB0VW50YWdnZWQuZm9yRWFjaCgoY29tbWFuZCkgPT4geyBkYXRhLnBheWxvYWRbY29tbWFuZF0gPSBbXSB9KVxuXG4gICAgICAvLyBpZiB3ZSdyZSBpbiBwcmlvcml0eSBtb2RlIChpLmUuIHdlIHJhbiBjb21tYW5kcyBpbiBhIHByZWNoZWNrKSxcbiAgICAgIC8vIHF1ZXVlIGFueSBjb21tYW5kcyBCRUZPUkUgdGhlIGNvbW1hbmQgdGhhdCBjb250aWFuZWQgdGhlIHByZWNoZWNrLFxuICAgICAgLy8gb3RoZXJ3aXNlIGp1c3QgcXVldWUgY29tbWFuZCBhcyB1c3VhbFxuICAgICAgdmFyIGluZGV4ID0gZGF0YS5jdHggPyB0aGlzLl9jbGllbnRRdWV1ZS5pbmRleE9mKGRhdGEuY3R4KSA6IC0xXG4gICAgICBpZiAoaW5kZXggPj0gMCkge1xuICAgICAgICBkYXRhLnRhZyArPSAnLnAnXG4gICAgICAgIGRhdGEucmVxdWVzdC50YWcgKz0gJy5wJ1xuICAgICAgICB0aGlzLl9jbGllbnRRdWV1ZS5zcGxpY2UoaW5kZXgsIDAsIGRhdGEpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9jbGllbnRRdWV1ZS5wdXNoKGRhdGEpXG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9jYW5TZW5kKSB7XG4gICAgICAgIHRoaXMuX3NlbmRSZXF1ZXN0KClcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSBjb21tYW5kc1xuICAgKiBAcGFyYW0gY3R4XG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZ2V0UHJldmlvdXNseVF1ZXVlZCAoY29tbWFuZHMsIGN0eCkge1xuICAgIGNvbnN0IHN0YXJ0SW5kZXggPSB0aGlzLl9jbGllbnRRdWV1ZS5pbmRleE9mKGN0eCkgLSAxXG5cbiAgICAvLyBzZWFyY2ggYmFja3dhcmRzIGZvciB0aGUgY29tbWFuZHMgYW5kIHJldHVybiB0aGUgZmlyc3QgZm91bmRcbiAgICBmb3IgKGxldCBpID0gc3RhcnRJbmRleDsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIGlmIChpc01hdGNoKHRoaXMuX2NsaWVudFF1ZXVlW2ldKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2xpZW50UXVldWVbaV1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBhbHNvIGNoZWNrIGN1cnJlbnQgY29tbWFuZCBpZiBubyBTRUxFQ1QgaXMgcXVldWVkXG4gICAgaWYgKGlzTWF0Y2godGhpcy5fY3VycmVudENvbW1hbmQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fY3VycmVudENvbW1hbmRcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2VcblxuICAgIGZ1bmN0aW9uIGlzTWF0Y2ggKGRhdGEpIHtcbiAgICAgIHJldHVybiBkYXRhICYmIGRhdGEucmVxdWVzdCAmJiBjb21tYW5kcy5pbmRleE9mKGRhdGEucmVxdWVzdC5jb21tYW5kKSA+PSAwXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNlbmQgZGF0YSB0byB0aGUgVENQIHNvY2tldFxuICAgKiBBcm1zIGEgdGltZW91dCB3YWl0aW5nIGZvciBhIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHN0ciBQYXlsb2FkXG4gICAqL1xuICBzZW5kIChzdHIpIHtcbiAgICBjb25zdCBidWZmZXIgPSB0b1R5cGVkQXJyYXkoc3RyKS5idWZmZXJcbiAgICBjb25zdCB0aW1lb3V0ID0gdGhpcy50aW1lb3V0U29ja2V0TG93ZXJCb3VuZCArIE1hdGguZmxvb3IoYnVmZmVyLmJ5dGVMZW5ndGggKiB0aGlzLnRpbWVvdXRTb2NrZXRNdWx0aXBsaWVyKVxuXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX3NvY2tldFRpbWVvdXRUaW1lcikgLy8gY2xlYXIgcGVuZGluZyB0aW1lb3V0c1xuICAgIHRoaXMuX3NvY2tldFRpbWVvdXRUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4gdGhpcy5fb25FcnJvcihuZXcgRXJyb3IoJ1NvY2tldCB0aW1lZCBvdXQhJykpLCB0aW1lb3V0KSAvLyBhcm0gdGhlIG5leHQgdGltZW91dFxuXG4gICAgaWYgKHRoaXMuY29tcHJlc3NlZCkge1xuICAgICAgdGhpcy5fc2VuZENvbXByZXNzZWQoYnVmZmVyKVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIXRoaXMuc29ja2V0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignU29ja2V0IHRpbWVkIG91dCEnKVxuICAgICAgfVxuICAgICAgdGhpcy5zb2NrZXQuc2VuZChidWZmZXIpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldCBhIGdsb2JhbCBoYW5kbGVyIGZvciBhbiB1bnRhZ2dlZCByZXNwb25zZS4gSWYgY3VycmVudGx5IHByb2Nlc3NlZCBjb21tYW5kXG4gICAqIGhhcyBub3QgbGlzdGVkIHVudGFnZ2VkIGNvbW1hbmQgaXQgaXMgZm9yd2FyZGVkIHRvIHRoZSBnbG9iYWwgaGFuZGxlci4gVXNlZnVsXG4gICAqIHdpdGggRVhQVU5HRSwgRVhJU1RTIGV0Yy5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IGNvbW1hbmQgVW50YWdnZWQgY29tbWFuZCBuYW1lXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIGZ1bmN0aW9uIHdpdGggcmVzcG9uc2Ugb2JqZWN0IGFuZCBjb250aW51ZSBjYWxsYmFjayBmdW5jdGlvblxuICAgKi9cbiAgc2V0SGFuZGxlciAoY29tbWFuZCwgY2FsbGJhY2spIHtcbiAgICB0aGlzLl9nbG9iYWxBY2NlcHRVbnRhZ2dlZFtjb21tYW5kLnRvVXBwZXJDYXNlKCkudHJpbSgpXSA9IGNhbGxiYWNrXG4gIH1cblxuICAvLyBJTlRFUk5BTCBFVkVOVFNcblxuICAvKipcbiAgICogRXJyb3IgaGFuZGxlciBmb3IgdGhlIHNvY2tldFxuICAgKlxuICAgKiBAZXZlbnRcbiAgICogQHBhcmFtIHtFdmVudH0gZXZ0IEV2ZW50IG9iamVjdC4gU2VlIGV2dC5kYXRhIGZvciB0aGUgZXJyb3JcbiAgICovXG4gIF9vbkVycm9yIChldnQpIHtcbiAgICB2YXIgZXJyb3JcbiAgICBpZiAodGhpcy5pc0Vycm9yKGV2dCkpIHtcbiAgICAgIGVycm9yID0gZXZ0XG4gICAgfSBlbHNlIGlmIChldnQgJiYgdGhpcy5pc0Vycm9yKGV2dC5kYXRhKSkge1xuICAgICAgZXJyb3IgPSBldnQuZGF0YVxuICAgIH0gZWxzZSB7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcigoZXZ0ICYmIGV2dC5kYXRhICYmIGV2dC5kYXRhLm1lc3NhZ2UpIHx8IGV2dC5kYXRhIHx8IGV2dCB8fCAnRXJyb3InKVxuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLmVycm9yKGVycm9yKVxuXG4gICAgLy8gYWx3YXlzIGNhbGwgb25lcnJvciBjYWxsYmFjaywgbm8gbWF0dGVyIGlmIGNsb3NlKCkgc3VjY2VlZHMgb3IgZmFpbHNcbiAgICAvLyB0aGlzLmNsb3NlKGVycm9yKS50aGVuKCgpID0+IHtcbiAgICAvLyAgIHRoaXMub25lcnJvciAmJiB0aGlzLm9uZXJyb3IoZXJyb3IpXG4gICAgLy8gfSwgZXJyb3IgPT4ge1xuICAgIC8vICAgdGhpcy5vbmVycm9yICYmIHRoaXMub25lcnJvcihlcnJvcilcbiAgICAvLyB9KVxuICAgIHRoaXMub25lcnJvciAmJiB0aGlzLm9uZXJyb3IoZXJyb3IpXG4gICAgLy8gZG9uJ3QgY2xvc2UgdGhlIGNvbm5lY3RcbiAgICAvLyB0aGlzLm9uZXJyb3IgJiYgdGhpcy5vbmVycm9yKGVycm9yKVxuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZXIgZm9yIGluY29taW5nIGRhdGEgZnJvbSB0aGUgc2VydmVyLiBUaGUgZGF0YSBpcyBzZW50IGluIGFyYml0cmFyeVxuICAgKiBjaHVua3MgYW5kIGNhbid0IGJlIHVzZWQgZGlyZWN0bHkgc28gdGhpcyBmdW5jdGlvbiBtYWtlcyBzdXJlIHRoZSBkYXRhXG4gICAqIGlzIHNwbGl0IGludG8gY29tcGxldGUgbGluZXMgYmVmb3JlIHRoZSBkYXRhIGlzIHBhc3NlZCB0byB0aGUgY29tbWFuZFxuICAgKiBoYW5kbGVyXG4gICAqXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2dFxuICAgKi9cbiAgX29uRGF0YSAoZXZ0KSB7XG4gICAgY29uc3QgdGltZW91dCA9IHRoaXMudGltZW91dFNvY2tldExvd2VyQm91bmQgKyBNYXRoLmZsb29yKDQwOTYgKiB0aGlzLnRpbWVvdXRTb2NrZXRNdWx0aXBsaWVyKSAvLyBtYXggcGFja2V0IHNpemUgaXMgNDA5NiBieXRlc1xuXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX3NvY2tldFRpbWVvdXRUaW1lcikgLy8gcmVzZXQgdGhlIHRpbWVvdXQgb24gZWFjaCBkYXRhIHBhY2tldFxuICAgIHRoaXMuX3NvY2tldFRpbWVvdXRUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4gdGhpcy5fb25FcnJvcihuZXcgRXJyb3IoJ1NvY2tldCB0aW1lZCBvdXQhJykpLCB0aW1lb3V0KVxuXG4gICAgdGhpcy5faW5jb21pbmdCdWZmZXJzLnB1c2gobmV3IFVpbnQ4QXJyYXkoZXZ0LmRhdGEpKSAvLyBhcHBlbmQgdG8gdGhlIGluY29taW5nIGJ1ZmZlclxuICAgIHRoaXMuX3BhcnNlSW5jb21pbmdDb21tYW5kcyh0aGlzLl9pdGVyYXRlSW5jb21pbmdCdWZmZXIoKSkgLy8gQ29uc3VtZSB0aGUgaW5jb21pbmcgYnVmZmVyXG4gIH1cblxuICAqIF9pdGVyYXRlSW5jb21pbmdCdWZmZXIgKCkge1xuICAgIGxldCBidWYgPSB0aGlzLl9pbmNvbWluZ0J1ZmZlcnNbdGhpcy5faW5jb21pbmdCdWZmZXJzLmxlbmd0aCAtIDFdIHx8IFtdXG4gICAgbGV0IGkgPSAwXG5cbiAgICAvLyBsb29wIGludmFyaWFudDpcbiAgICAvLyAgIHRoaXMuX2luY29taW5nQnVmZmVycyBzdGFydHMgd2l0aCB0aGUgYmVnaW5uaW5nIG9mIGluY29taW5nIGNvbW1hbmQuXG4gICAgLy8gICBidWYgaXMgc2hvcnRoYW5kIGZvciBsYXN0IGVsZW1lbnQgb2YgdGhpcy5faW5jb21pbmdCdWZmZXJzLlxuICAgIC8vICAgYnVmWzAuLmktMV0gaXMgcGFydCBvZiBpbmNvbWluZyBjb21tYW5kLlxuICAgIHdoaWxlIChpIDwgYnVmLmxlbmd0aCkge1xuICAgICAgc3dpdGNoICh0aGlzLl9idWZmZXJTdGF0ZSkge1xuICAgICAgICBjYXNlIEJVRkZFUl9TVEFURV9MSVRFUkFMOlxuICAgICAgICAgIGNvbnN0IGRpZmYgPSBNYXRoLm1pbihidWYubGVuZ3RoIC0gaSwgdGhpcy5fbGl0ZXJhbFJlbWFpbmluZylcbiAgICAgICAgICB0aGlzLl9saXRlcmFsUmVtYWluaW5nIC09IGRpZmZcbiAgICAgICAgICBpICs9IGRpZmZcbiAgICAgICAgICBpZiAodGhpcy5fbGl0ZXJhbFJlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy5fYnVmZmVyU3RhdGUgPSBCVUZGRVJfU1RBVEVfREVGQVVMVFxuICAgICAgICAgIH1cbiAgICAgICAgICBjb250aW51ZVxuXG4gICAgICAgIGNhc2UgQlVGRkVSX1NUQVRFX1BPU1NJQkxZX0xJVEVSQUxfTEVOR1RIXzI6XG4gICAgICAgICAgaWYgKGkgPCBidWYubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoYnVmW2ldID09PSBDQVJSSUFHRV9SRVRVUk4pIHtcbiAgICAgICAgICAgICAgdGhpcy5fbGl0ZXJhbFJlbWFpbmluZyA9IE51bWJlcihmcm9tVHlwZWRBcnJheSh0aGlzLl9sZW5ndGhCdWZmZXIpKSArIDIgLy8gZm9yIENSTEZcbiAgICAgICAgICAgICAgdGhpcy5fYnVmZmVyU3RhdGUgPSBCVUZGRVJfU1RBVEVfTElURVJBTFxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhpcy5fYnVmZmVyU3RhdGUgPSBCVUZGRVJfU1RBVEVfREVGQVVMVFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2xlbmd0aEJ1ZmZlclxuICAgICAgICAgIH1cbiAgICAgICAgICBjb250aW51ZVxuXG4gICAgICAgIGNhc2UgQlVGRkVSX1NUQVRFX1BPU1NJQkxZX0xJVEVSQUxfTEVOR1RIXzE6XG4gICAgICAgICAgY29uc3Qgc3RhcnQgPSBpXG4gICAgICAgICAgd2hpbGUgKGkgPCBidWYubGVuZ3RoICYmIGJ1ZltpXSA+PSA0OCAmJiBidWZbaV0gPD0gNTcpIHsgLy8gZGlnaXRzXG4gICAgICAgICAgICBpKytcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHN0YXJ0ICE9PSBpKSB7XG4gICAgICAgICAgICBjb25zdCBsYXRlc3QgPSBidWYuc3ViYXJyYXkoc3RhcnQsIGkpXG4gICAgICAgICAgICBjb25zdCBwcmV2QnVmID0gdGhpcy5fbGVuZ3RoQnVmZmVyXG4gICAgICAgICAgICB0aGlzLl9sZW5ndGhCdWZmZXIgPSBuZXcgVWludDhBcnJheShwcmV2QnVmLmxlbmd0aCArIGxhdGVzdC5sZW5ndGgpXG4gICAgICAgICAgICB0aGlzLl9sZW5ndGhCdWZmZXIuc2V0KHByZXZCdWYpXG4gICAgICAgICAgICB0aGlzLl9sZW5ndGhCdWZmZXIuc2V0KGxhdGVzdCwgcHJldkJ1Zi5sZW5ndGgpXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpIDwgYnVmLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2xlbmd0aEJ1ZmZlci5sZW5ndGggPiAwICYmIGJ1ZltpXSA9PT0gUklHSFRfQ1VSTFlfQlJBQ0tFVCkge1xuICAgICAgICAgICAgICB0aGlzLl9idWZmZXJTdGF0ZSA9IEJVRkZFUl9TVEFURV9QT1NTSUJMWV9MSVRFUkFMX0xFTkdUSF8yXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fbGVuZ3RoQnVmZmVyXG4gICAgICAgICAgICAgIHRoaXMuX2J1ZmZlclN0YXRlID0gQlVGRkVSX1NUQVRFX0RFRkFVTFRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGkrK1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb250aW51ZVxuXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgLy8gZmluZCBsaXRlcmFsIGxlbmd0aFxuICAgICAgICAgIGNvbnN0IGxlZnRJZHggPSBidWYuaW5kZXhPZihMRUZUX0NVUkxZX0JSQUNLRVQsIGkpXG4gICAgICAgICAgaWYgKGxlZnRJZHggPiAtMSkge1xuICAgICAgICAgICAgY29uc3QgbGVmdE9mTGVmdEN1cmx5ID0gbmV3IFVpbnQ4QXJyYXkoYnVmLmJ1ZmZlciwgaSwgbGVmdElkeCAtIGkpXG4gICAgICAgICAgICBpZiAobGVmdE9mTGVmdEN1cmx5LmluZGV4T2YoTElORV9GRUVEKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgaSA9IGxlZnRJZHggKyAxXG4gICAgICAgICAgICAgIHRoaXMuX2xlbmd0aEJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KDApXG4gICAgICAgICAgICAgIHRoaXMuX2J1ZmZlclN0YXRlID0gQlVGRkVSX1NUQVRFX1BPU1NJQkxZX0xJVEVSQUxfTEVOR1RIXzFcbiAgICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBmaW5kIGVuZCBvZiBjb21tYW5kXG4gICAgICAgICAgY29uc3QgTEZpZHggPSBidWYuaW5kZXhPZihMSU5FX0ZFRUQsIGkpXG4gICAgICAgICAgaWYgKExGaWR4ID4gLTEpIHtcbiAgICAgICAgICAgIGlmIChMRmlkeCA8IGJ1Zi5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgIHRoaXMuX2luY29taW5nQnVmZmVyc1t0aGlzLl9pbmNvbWluZ0J1ZmZlcnMubGVuZ3RoIC0gMV0gPSBuZXcgVWludDhBcnJheShidWYuYnVmZmVyLCAwLCBMRmlkeCArIDEpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBjb21tYW5kTGVuZ3RoID0gdGhpcy5faW5jb21pbmdCdWZmZXJzLnJlZHVjZSgocHJldiwgY3VycikgPT4gcHJldiArIGN1cnIubGVuZ3RoLCAwKSAtIDIgLy8gMiBmb3IgQ1JMRlxuICAgICAgICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBVaW50OEFycmF5KGNvbW1hbmRMZW5ndGgpXG4gICAgICAgICAgICBsZXQgaW5kZXggPSAwXG4gICAgICAgICAgICB3aGlsZSAodGhpcy5faW5jb21pbmdCdWZmZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgbGV0IHVpbnQ4QXJyYXkgPSB0aGlzLl9pbmNvbWluZ0J1ZmZlcnMuc2hpZnQoKVxuXG4gICAgICAgICAgICAgIGNvbnN0IHJlbWFpbmluZ0xlbmd0aCA9IGNvbW1hbmRMZW5ndGggLSBpbmRleFxuICAgICAgICAgICAgICBpZiAodWludDhBcnJheS5sZW5ndGggPiByZW1haW5pbmdMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBleGNlc3NMZW5ndGggPSB1aW50OEFycmF5Lmxlbmd0aCAtIHJlbWFpbmluZ0xlbmd0aFxuICAgICAgICAgICAgICAgIHVpbnQ4QXJyYXkgPSB1aW50OEFycmF5LnN1YmFycmF5KDAsIC1leGNlc3NMZW5ndGgpXG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5faW5jb21pbmdCdWZmZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgIHRoaXMuX2luY29taW5nQnVmZmVycyA9IFtdXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbW1hbmQuc2V0KHVpbnQ4QXJyYXksIGluZGV4KVxuICAgICAgICAgICAgICBpbmRleCArPSB1aW50OEFycmF5Lmxlbmd0aFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgeWllbGQgY29tbWFuZFxuICAgICAgICAgICAgaWYgKExGaWR4IDwgYnVmLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYnVmLnN1YmFycmF5KExGaWR4ICsgMSkpXG4gICAgICAgICAgICAgIHRoaXMuX2luY29taW5nQnVmZmVycy5wdXNoKGJ1ZilcbiAgICAgICAgICAgICAgaSA9IDBcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIGNsZWFyIHRoZSB0aW1lb3V0IHdoZW4gYW4gZW50aXJlIGNvbW1hbmQgaGFzIGFycml2ZWRcbiAgICAgICAgICAgICAgLy8gYW5kIG5vdCB3YWl0aW5nIG9uIG1vcmUgZGF0YSBmb3IgbmV4dCBjb21tYW5kXG4gICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLl9zb2NrZXRUaW1lb3V0VGltZXIpXG4gICAgICAgICAgICAgIHRoaXMuX3NvY2tldFRpbWVvdXRUaW1lciA9IG51bGxcbiAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBQUklWQVRFIE1FVEhPRFNcblxuICAvKipcbiAgICogUHJvY2Vzc2VzIGEgY29tbWFuZCBmcm9tIHRoZSBxdWV1ZS4gVGhlIGNvbW1hbmQgaXMgcGFyc2VkIGFuZCBmZWVkZWQgdG8gYSBoYW5kbGVyXG4gICAqL1xuICBfcGFyc2VJbmNvbWluZ0NvbW1hbmRzIChjb21tYW5kcykge1xuICAgIGZvciAodmFyIGNvbW1hbmQgb2YgY29tbWFuZHMpIHtcbiAgICAgIHRoaXMuX2NsZWFySWRsZSgpXG5cbiAgICAgIC8qXG4gICAgICAgKiBUaGUgXCIrXCItdGFnZ2VkIHJlc3BvbnNlIGlzIGEgc3BlY2lhbCBjYXNlOlxuICAgICAgICogRWl0aGVyIHRoZSBzZXJ2ZXIgY2FuIGFza3MgZm9yIHRoZSBuZXh0IGNodW5rIG9mIGRhdGEsIGUuZy4gZm9yIHRoZSBBVVRIRU5USUNBVEUgY29tbWFuZC5cbiAgICAgICAqXG4gICAgICAgKiBPciB0aGVyZSB3YXMgYW4gZXJyb3IgaW4gdGhlIFhPQVVUSDIgYXV0aGVudGljYXRpb24sIGZvciB3aGljaCBTQVNMIGluaXRpYWwgY2xpZW50IHJlc3BvbnNlIGV4dGVuc2lvblxuICAgICAgICogZGljdGF0ZXMgdGhlIGNsaWVudCBzZW5kcyBhbiBlbXB0eSBFT0wgcmVzcG9uc2UgdG8gdGhlIGNoYWxsZW5nZSBjb250YWluaW5nIHRoZSBlcnJvciBtZXNzYWdlLlxuICAgICAgICpcbiAgICAgICAqIERldGFpbHMgb24gXCIrXCItdGFnZ2VkIHJlc3BvbnNlOlxuICAgICAgICogICBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzUwMSNzZWN0aW9uLTIuMi4xXG4gICAgICAgKi9cbiAgICAgIC8vXG4gICAgICBpZiAoY29tbWFuZFswXSA9PT0gQVNDSUlfUExVUykge1xuICAgICAgICBpZiAodGhpcy5fY3VycmVudENvbW1hbmQuZGF0YS5sZW5ndGgpIHtcbiAgICAgICAgICAvLyBmZWVkIHRoZSBuZXh0IGNodW5rIG9mIGRhdGFcbiAgICAgICAgICB2YXIgY2h1bmsgPSB0aGlzLl9jdXJyZW50Q29tbWFuZC5kYXRhLnNoaWZ0KClcbiAgICAgICAgICBjaHVuayArPSAoIXRoaXMuX2N1cnJlbnRDb21tYW5kLmRhdGEubGVuZ3RoID8gRU9MIDogJycpIC8vIEVPTCBpZiB0aGVyZSdzIG5vdGhpbmcgbW9yZSB0byBzZW5kXG4gICAgICAgICAgdGhpcy5zZW5kKGNodW5rKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2N1cnJlbnRDb21tYW5kLmVycm9yUmVzcG9uc2VFeHBlY3RzRW1wdHlMaW5lKSB7XG4gICAgICAgICAgdGhpcy5zZW5kKEVPTCkgLy8gWE9BVVRIMiBlbXB0eSByZXNwb25zZSwgZXJyb3Igd2lsbCBiZSByZXBvcnRlZCB3aGVuIHNlcnZlciBjb250aW51ZXMgd2l0aCBOTyByZXNwb25zZVxuICAgICAgICB9XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIHZhciByZXNwb25zZVxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgdmFsdWVBc1N0cmluZyA9IHRoaXMuX2N1cnJlbnRDb21tYW5kLnJlcXVlc3QgJiYgdGhpcy5fY3VycmVudENvbW1hbmQucmVxdWVzdC52YWx1ZUFzU3RyaW5nXG4gICAgICAgIHJlc3BvbnNlID0gcGFyc2VyKGNvbW1hbmQsIHsgdmFsdWVBc1N0cmluZyB9KVxuICAgICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnUzonLCAoKSA9PiBjb21waWxlcihyZXNwb25zZSwgZmFsc2UsIHRydWUpKVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignRXJyb3IgcGFyc2luZyBpbWFwIGNvbW1hbmQhJywgcmVzcG9uc2UpXG4gICAgICAgIHJldHVybiB0aGlzLl9vbkVycm9yKGUpXG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3Byb2Nlc3NSZXNwb25zZShyZXNwb25zZSlcbiAgICAgIHRoaXMuX2hhbmRsZVJlc3BvbnNlKHJlc3BvbnNlKVxuXG4gICAgICAvLyBmaXJzdCByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIsIGNvbm5lY3Rpb24gaXMgbm93IHVzYWJsZVxuICAgICAgaWYgKCF0aGlzLl9jb25uZWN0aW9uUmVhZHkpIHtcbiAgICAgICAgdGhpcy5fY29ubmVjdGlvblJlYWR5ID0gdHJ1ZVxuICAgICAgICB0aGlzLm9ucmVhZHkgJiYgdGhpcy5vbnJlYWR5KClcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRmVlZHMgYSBwYXJzZWQgcmVzcG9uc2Ugb2JqZWN0IHRvIGFuIGFwcHJvcHJpYXRlIGhhbmRsZXJcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIFBhcnNlZCBjb21tYW5kIG9iamVjdFxuICAgKi9cbiAgX2hhbmRsZVJlc3BvbnNlIChyZXNwb25zZSkge1xuICAgIHZhciBjb21tYW5kID0gcHJvcE9yKCcnLCAnY29tbWFuZCcsIHJlc3BvbnNlKS50b1VwcGVyQ2FzZSgpLnRyaW0oKVxuXG4gICAgaWYgKCF0aGlzLl9jdXJyZW50Q29tbWFuZCkge1xuICAgICAgLy8gdW5zb2xpY2l0ZWQgdW50YWdnZWQgcmVzcG9uc2VcbiAgICAgIGlmIChyZXNwb25zZS50YWcgPT09ICcqJyAmJiBjb21tYW5kIGluIHRoaXMuX2dsb2JhbEFjY2VwdFVudGFnZ2VkKSB7XG4gICAgICAgIHRoaXMuX2dsb2JhbEFjY2VwdFVudGFnZ2VkW2NvbW1hbmRdKHJlc3BvbnNlKVxuICAgICAgICB0aGlzLl9jYW5TZW5kID0gdHJ1ZVxuICAgICAgICB0aGlzLl9zZW5kUmVxdWVzdCgpXG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLl9jdXJyZW50Q29tbWFuZC5wYXlsb2FkICYmIHJlc3BvbnNlLnRhZyA9PT0gJyonICYmIGNvbW1hbmQgaW4gdGhpcy5fY3VycmVudENvbW1hbmQucGF5bG9hZCkge1xuICAgICAgLy8gZXhwZWN0ZWQgdW50YWdnZWQgcmVzcG9uc2VcbiAgICAgIHRoaXMuX2N1cnJlbnRDb21tYW5kLnBheWxvYWRbY29tbWFuZF0ucHVzaChyZXNwb25zZSlcbiAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLnRhZyA9PT0gJyonICYmIGNvbW1hbmQgaW4gdGhpcy5fZ2xvYmFsQWNjZXB0VW50YWdnZWQpIHtcbiAgICAgIC8vIHVuZXhwZWN0ZWQgdW50YWdnZWQgcmVzcG9uc2VcbiAgICAgIHRoaXMuX2dsb2JhbEFjY2VwdFVudGFnZ2VkW2NvbW1hbmRdKHJlc3BvbnNlKVxuICAgIH0gZWxzZSBpZiAocmVzcG9uc2UudGFnID09PSB0aGlzLl9jdXJyZW50Q29tbWFuZC50YWcpIHtcbiAgICAgIC8vIHRhZ2dlZCByZXNwb25zZVxuICAgICAgaWYgKHRoaXMuX2N1cnJlbnRDb21tYW5kLnBheWxvYWQgJiYgT2JqZWN0LmtleXModGhpcy5fY3VycmVudENvbW1hbmQucGF5bG9hZCkubGVuZ3RoKSB7XG4gICAgICAgIHJlc3BvbnNlLnBheWxvYWQgPSB0aGlzLl9jdXJyZW50Q29tbWFuZC5wYXlsb2FkXG4gICAgICB9XG4gICAgICB0aGlzLl9jdXJyZW50Q29tbWFuZC5jYWxsYmFjayhyZXNwb25zZSlcbiAgICAgIHRoaXMuX2NhblNlbmQgPSB0cnVlXG4gICAgICB0aGlzLl9zZW5kUmVxdWVzdCgpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNlbmRzIGEgY29tbWFuZCBmcm9tIGNsaWVudCBxdWV1ZSB0byB0aGUgc2VydmVyLlxuICAgKi9cbiAgX3NlbmRSZXF1ZXN0ICgpIHtcbiAgICBpZiAoIXRoaXMuX2NsaWVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2VudGVySWRsZSgpXG4gICAgfVxuICAgIHRoaXMuX2NsZWFySWRsZSgpXG5cbiAgICAvLyBhbiBvcGVyYXRpb24gd2FzIG1hZGUgaW4gdGhlIHByZWNoZWNrLCBubyBuZWVkIHRvIHJlc3RhcnQgdGhlIHF1ZXVlIG1hbnVhbGx5XG4gICAgdGhpcy5fcmVzdGFydFF1ZXVlID0gZmFsc2VcblxuICAgIHZhciBjb21tYW5kID0gdGhpcy5fY2xpZW50UXVldWVbMF1cbiAgICBpZiAodHlwZW9mIGNvbW1hbmQucHJlY2hlY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIHJlbWVtYmVyIHRoZSBjb250ZXh0XG4gICAgICB2YXIgY29udGV4dCA9IGNvbW1hbmRcbiAgICAgIHZhciBwcmVjaGVjayA9IGNvbnRleHQucHJlY2hlY2tcbiAgICAgIGRlbGV0ZSBjb250ZXh0LnByZWNoZWNrXG5cbiAgICAgIC8vIHdlIG5lZWQgdG8gcmVzdGFydCB0aGUgcXVldWUgaGFuZGxpbmcgaWYgbm8gb3BlcmF0aW9uIHdhcyBtYWRlIGluIHRoZSBwcmVjaGVja1xuICAgICAgdGhpcy5fcmVzdGFydFF1ZXVlID0gdHJ1ZVxuXG4gICAgICAvLyBpbnZva2UgdGhlIHByZWNoZWNrIGNvbW1hbmQgYW5kIHJlc3VtZSBub3JtYWwgb3BlcmF0aW9uIGFmdGVyIHRoZSBwcm9taXNlIHJlc29sdmVzXG4gICAgICBwcmVjaGVjayhjb250ZXh0KS50aGVuKCgpID0+IHtcbiAgICAgICAgLy8gd2UncmUgZG9uZSB3aXRoIHRoZSBwcmVjaGVja1xuICAgICAgICBpZiAodGhpcy5fcmVzdGFydFF1ZXVlKSB7XG4gICAgICAgICAgLy8gd2UgbmVlZCB0byByZXN0YXJ0IHRoZSBxdWV1ZSBoYW5kbGluZ1xuICAgICAgICAgIHRoaXMuX3NlbmRSZXF1ZXN0KClcbiAgICAgICAgfVxuICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAvLyBwcmVjaGVjayBmYWlsZWQsIHNvIHdlIHJlbW92ZSB0aGUgaW5pdGlhbCBjb21tYW5kXG4gICAgICAgIC8vIGZyb20gdGhlIHF1ZXVlLCBpbnZva2UgaXRzIGNhbGxiYWNrIGFuZCByZXN1bWUgbm9ybWFsIG9wZXJhdGlvblxuICAgICAgICBsZXQgY21kXG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5fY2xpZW50UXVldWUuaW5kZXhPZihjb250ZXh0KVxuICAgICAgICBpZiAoaW5kZXggPj0gMCkge1xuICAgICAgICAgIGNtZCA9IHRoaXMuX2NsaWVudFF1ZXVlLnNwbGljZShpbmRleCwgMSlbMF1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY21kICYmIGNtZC5jYWxsYmFjaykge1xuICAgICAgICAgIGNtZC5jYWxsYmFjayhlcnIpXG4gICAgICAgICAgdGhpcy5fY2FuU2VuZCA9IHRydWVcbiAgICAgICAgICB0aGlzLl9wYXJzZUluY29taW5nQ29tbWFuZHModGhpcy5faXRlcmF0ZUluY29taW5nQnVmZmVyKCkpIC8vIENvbnN1bWUgdGhlIHJlc3Qgb2YgdGhlIGluY29taW5nIGJ1ZmZlclxuICAgICAgICAgIHRoaXMuX3NlbmRSZXF1ZXN0KCkgLy8gY29udGludWUgc2VuZGluZ1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdGhpcy5fY2FuU2VuZCA9IGZhbHNlXG4gICAgdGhpcy5fY3VycmVudENvbW1hbmQgPSB0aGlzLl9jbGllbnRRdWV1ZS5zaGlmdCgpXG5cbiAgICB0cnkge1xuICAgICAgdGhpcy5fY3VycmVudENvbW1hbmQuZGF0YSA9IGNvbXBpbGVyKHRoaXMuX2N1cnJlbnRDb21tYW5kLnJlcXVlc3QsIHRydWUpXG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnQzonLCAoKSA9PiBjb21waWxlcih0aGlzLl9jdXJyZW50Q29tbWFuZC5yZXF1ZXN0LCBmYWxzZSwgdHJ1ZSkpIC8vIGV4Y2x1ZGVzIHBhc3N3b3JkcyBldGMuXG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ0Vycm9yIGNvbXBpbGluZyBpbWFwIGNvbW1hbmQhJywgdGhpcy5fY3VycmVudENvbW1hbmQucmVxdWVzdClcbiAgICAgIHJldHVybiB0aGlzLl9vbkVycm9yKG5ldyBFcnJvcignRXJyb3IgY29tcGlsaW5nIGltYXAgY29tbWFuZCEnKSlcbiAgICB9XG5cbiAgICB2YXIgZGF0YSA9IHRoaXMuX2N1cnJlbnRDb21tYW5kLmRhdGEuc2hpZnQoKVxuXG4gICAgdGhpcy5zZW5kKGRhdGEgKyAoIXRoaXMuX2N1cnJlbnRDb21tYW5kLmRhdGEubGVuZ3RoID8gRU9MIDogJycpKVxuICAgIHJldHVybiB0aGlzLndhaXREcmFpblxuICB9XG5cbiAgLyoqXG4gICAqIEVtaXRzIG9uaWRsZSwgbm90aW5nIHRvIGRvIGN1cnJlbnRseVxuICAgKi9cbiAgX2VudGVySWRsZSAoKSB7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX2lkbGVUaW1lcilcbiAgICB0aGlzLl9pZGxlVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+ICh0aGlzLm9uaWRsZSAmJiB0aGlzLm9uaWRsZSgpKSwgdGhpcy50aW1lb3V0RW50ZXJJZGxlKVxuICB9XG5cbiAgLyoqXG4gICAqIENhbmNlbCBpZGxlIHRpbWVyXG4gICAqL1xuICBfY2xlYXJJZGxlICgpIHtcbiAgICBjbGVhclRpbWVvdXQodGhpcy5faWRsZVRpbWVyKVxuICAgIHRoaXMuX2lkbGVUaW1lciA9IG51bGxcbiAgfVxuXG4gIC8qKlxuICAgKiBNZXRob2QgcHJvY2Vzc2VzIGEgcmVzcG9uc2UgaW50byBhbiBlYXNpZXIgdG8gaGFuZGxlIGZvcm1hdC5cbiAgICogQWRkIHVudGFnZ2VkIG51bWJlcmVkIHJlc3BvbnNlcyAoZS5nLiBGRVRDSCkgaW50byBhIG5pY2VseSBmZWFzaWJsZSBmb3JtXG4gICAqIENoZWNrcyBpZiBhIHJlc3BvbnNlIGluY2x1ZGVzIG9wdGlvbmFsIHJlc3BvbnNlIGNvZGVzXG4gICAqIGFuZCBjb3BpZXMgdGhlc2UgaW50byBzZXBhcmF0ZSBwcm9wZXJ0aWVzLiBGb3IgZXhhbXBsZSB0aGVcbiAgICogZm9sbG93aW5nIHJlc3BvbnNlIGluY2x1ZGVzIGEgY2FwYWJpbGl0eSBsaXN0aW5nIGFuZCBhIGh1bWFuXG4gICAqIHJlYWRhYmxlIG1lc3NhZ2U6XG4gICAqXG4gICAqICAgICAqIE9LIFtDQVBBQklMSVRZIElEIE5BTUVTUEFDRV0gQWxsIHJlYWR5XG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGFkZHMgYSAnY2FwYWJpbGl0eScgcHJvcGVydHkgd2l0aCBhbiBhcnJheSB2YWx1ZSBbJ0lEJywgJ05BTUVTUEFDRSddXG4gICAqIHRvIHRoZSByZXNwb25zZSBvYmplY3QuIEFkZGl0aW9uYWxseSAnQWxsIHJlYWR5JyBpcyBhZGRlZCBhcyAnaHVtYW5SZWFkYWJsZScgcHJvcGVydHkuXG4gICAqXG4gICAqIFNlZSBwb3NzaWJsZW0gSU1BUCBSZXNwb25zZSBDb2RlcyBhdCBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNTUzMFxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgUGFyc2VkIHJlc3BvbnNlIG9iamVjdFxuICAgKi9cbiAgX3Byb2Nlc3NSZXNwb25zZSAocmVzcG9uc2UpIHtcbiAgICBsZXQgY29tbWFuZCA9IHByb3BPcignJywgJ2NvbW1hbmQnLCByZXNwb25zZSkudG9VcHBlckNhc2UoKS50cmltKClcblxuICAgIC8vIG5vIGF0dHJpYnV0ZXNcbiAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5hdHRyaWJ1dGVzIHx8ICFyZXNwb25zZS5hdHRyaWJ1dGVzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gdW50YWdnZWQgcmVzcG9uc2VzIHcvIHNlcXVlbmNlIG51bWJlcnNcbiAgICBpZiAocmVzcG9uc2UudGFnID09PSAnKicgJiYgL15cXGQrJC8udGVzdChyZXNwb25zZS5jb21tYW5kKSAmJiByZXNwb25zZS5hdHRyaWJ1dGVzWzBdLnR5cGUgPT09ICdBVE9NJykge1xuICAgICAgcmVzcG9uc2UubnIgPSBOdW1iZXIocmVzcG9uc2UuY29tbWFuZClcbiAgICAgIHJlc3BvbnNlLmNvbW1hbmQgPSAocmVzcG9uc2UuYXR0cmlidXRlcy5zaGlmdCgpLnZhbHVlIHx8ICcnKS50b1N0cmluZygpLnRvVXBwZXJDYXNlKCkudHJpbSgpXG4gICAgfVxuXG4gICAgLy8gbm8gb3B0aW9uYWwgcmVzcG9uc2UgY29kZVxuICAgIGlmIChbJ09LJywgJ05PJywgJ0JBRCcsICdCWUUnLCAnUFJFQVVUSCddLmluZGV4T2YoY29tbWFuZCkgPCAwKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBJZiBsYXN0IGVsZW1lbnQgb2YgdGhlIHJlc3BvbnNlIGlzIFRFWFQgdGhlbiB0aGlzIGlzIGZvciBodW1hbnNcbiAgICBpZiAocmVzcG9uc2UuYXR0cmlidXRlc1tyZXNwb25zZS5hdHRyaWJ1dGVzLmxlbmd0aCAtIDFdLnR5cGUgPT09ICdURVhUJykge1xuICAgICAgcmVzcG9uc2UuaHVtYW5SZWFkYWJsZSA9IHJlc3BvbnNlLmF0dHJpYnV0ZXNbcmVzcG9uc2UuYXR0cmlidXRlcy5sZW5ndGggLSAxXS52YWx1ZVxuICAgIH1cblxuICAgIC8vIFBhcnNlIGFuZCBmb3JtYXQgQVRPTSB2YWx1ZXNcbiAgICBpZiAocmVzcG9uc2UuYXR0cmlidXRlc1swXS50eXBlID09PSAnQVRPTScgJiYgcmVzcG9uc2UuYXR0cmlidXRlc1swXS5zZWN0aW9uKSB7XG4gICAgICBjb25zdCBvcHRpb24gPSByZXNwb25zZS5hdHRyaWJ1dGVzWzBdLnNlY3Rpb24ubWFwKChrZXkpID0+IHtcbiAgICAgICAgaWYgKCFrZXkpIHtcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShrZXkpKSB7XG4gICAgICAgICAgcmV0dXJuIGtleS5tYXAoKGtleSkgPT4gKGtleS52YWx1ZSB8fCAnJykudG9TdHJpbmcoKS50cmltKCkpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIChrZXkudmFsdWUgfHwgJycpLnRvU3RyaW5nKCkudG9VcHBlckNhc2UoKS50cmltKClcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgY29uc3Qga2V5ID0gb3B0aW9uLnNoaWZ0KClcbiAgICAgIHJlc3BvbnNlLmNvZGUgPSBrZXlcblxuICAgICAgaWYgKG9wdGlvbi5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmVzcG9uc2Vba2V5LnRvTG93ZXJDYXNlKCldID0gb3B0aW9uWzBdXG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbi5sZW5ndGggPiAxKSB7XG4gICAgICAgIHJlc3BvbnNlW2tleS50b0xvd2VyQ2FzZSgpXSA9IG9wdGlvblxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgYSB2YWx1ZSBpcyBhbiBFcnJvciBvYmplY3RcbiAgICpcbiAgICogQHBhcmFtIHtNaXhlZH0gdmFsdWUgVmFsdWUgdG8gYmUgY2hlY2tlZFxuICAgKiBAcmV0dXJuIHtCb29sZWFufSByZXR1cm5zIHRydWUgaWYgdGhlIHZhbHVlIGlzIGFuIEVycm9yXG4gICAqL1xuICBpc0Vycm9yICh2YWx1ZSkge1xuICAgIHJldHVybiAhIU9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkubWF0Y2goL0Vycm9yXFxdJC8pXG4gIH1cblxuICAvLyBDT01QUkVTU0lPTiBSRUxBVEVEIE1FVEhPRFNcblxuICAvKipcbiAgICogU2V0cyB1cCBkZWZsYXRlL2luZmxhdGUgZm9yIHRoZSBJT1xuICAgKi9cbiAgZW5hYmxlQ29tcHJlc3Npb24gKCkge1xuICAgIHRoaXMuX3NvY2tldE9uRGF0YSA9IHRoaXMuc29ja2V0Lm9uZGF0YVxuICAgIHRoaXMuY29tcHJlc3NlZCA9IHRydWVcblxuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuV29ya2VyKSB7XG4gICAgICB0aGlzLl9jb21wcmVzc2lvbldvcmtlciA9IG5ldyBXb3JrZXIoVVJMLmNyZWF0ZU9iamVjdFVSTChuZXcgQmxvYihbQ29tcHJlc3Npb25CbG9iXSkpKVxuICAgICAgdGhpcy5fY29tcHJlc3Npb25Xb3JrZXIub25tZXNzYWdlID0gKGUpID0+IHtcbiAgICAgICAgdmFyIG1lc3NhZ2UgPSBlLmRhdGEubWVzc2FnZVxuICAgICAgICB2YXIgZGF0YSA9IGUuZGF0YS5idWZmZXJcblxuICAgICAgICBzd2l0Y2ggKG1lc3NhZ2UpIHtcbiAgICAgICAgICBjYXNlIE1FU1NBR0VfSU5GTEFURURfREFUQV9SRUFEWTpcbiAgICAgICAgICAgIHRoaXMuX3NvY2tldE9uRGF0YSh7IGRhdGEgfSlcbiAgICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgICBjYXNlIE1FU1NBR0VfREVGTEFURURfREFUQV9SRUFEWTpcbiAgICAgICAgICAgIHRoaXMud2FpdERyYWluID0gdGhpcy5zb2NrZXQuc2VuZChkYXRhKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLl9jb21wcmVzc2lvbldvcmtlci5vbmVycm9yID0gKGUpID0+IHtcbiAgICAgICAgdGhpcy5fb25FcnJvcihuZXcgRXJyb3IoJ0Vycm9yIGhhbmRsaW5nIGNvbXByZXNzaW9uIHdlYiB3b3JrZXI6ICcgKyBlLm1lc3NhZ2UpKVxuICAgICAgfVxuXG4gICAgICB0aGlzLl9jb21wcmVzc2lvbldvcmtlci5wb3N0TWVzc2FnZShjcmVhdGVNZXNzYWdlKE1FU1NBR0VfSU5JVElBTElaRV9XT1JLRVIpKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBpbmZsYXRlZFJlYWR5ID0gKGJ1ZmZlcikgPT4geyB0aGlzLl9zb2NrZXRPbkRhdGEoeyBkYXRhOiBidWZmZXIgfSkgfVxuICAgICAgY29uc3QgZGVmbGF0ZWRSZWFkeSA9IChidWZmZXIpID0+IHsgdGhpcy53YWl0RHJhaW4gPSB0aGlzLnNvY2tldC5zZW5kKGJ1ZmZlcikgfVxuICAgICAgdGhpcy5fY29tcHJlc3Npb24gPSBuZXcgQ29tcHJlc3Npb24oaW5mbGF0ZWRSZWFkeSwgZGVmbGF0ZWRSZWFkeSlcbiAgICB9XG5cbiAgICAvLyBvdmVycmlkZSBkYXRhIGhhbmRsZXIsIGRlY29tcHJlc3MgaW5jb21pbmcgZGF0YVxuICAgIHRoaXMuc29ja2V0Lm9uZGF0YSA9IChldnQpID0+IHtcbiAgICAgIGlmICghdGhpcy5jb21wcmVzc2VkKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fY29tcHJlc3Npb25Xb3JrZXIpIHtcbiAgICAgICAgdGhpcy5fY29tcHJlc3Npb25Xb3JrZXIucG9zdE1lc3NhZ2UoY3JlYXRlTWVzc2FnZShNRVNTQUdFX0lORkxBVEUsIGV2dC5kYXRhKSwgW2V2dC5kYXRhXSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2NvbXByZXNzaW9uLmluZmxhdGUoZXZ0LmRhdGEpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFVuZG9lcyBhbnkgY2hhbmdlcyByZWxhdGVkIHRvIGNvbXByZXNzaW9uLiBUaGlzIG9ubHkgYmUgY2FsbGVkIHdoZW4gY2xvc2luZyB0aGUgY29ubmVjdGlvblxuICAgKi9cbiAgX2Rpc2FibGVDb21wcmVzc2lvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmNvbXByZXNzZWQpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMuY29tcHJlc3NlZCA9IGZhbHNlXG4gICAgdGhpcy5zb2NrZXQub25kYXRhID0gdGhpcy5fc29ja2V0T25EYXRhXG4gICAgdGhpcy5fc29ja2V0T25EYXRhID0gbnVsbFxuXG4gICAgaWYgKHRoaXMuX2NvbXByZXNzaW9uV29ya2VyKSB7XG4gICAgICAvLyB0ZXJtaW5hdGUgdGhlIHdvcmtlclxuICAgICAgdGhpcy5fY29tcHJlc3Npb25Xb3JrZXIudGVybWluYXRlKClcbiAgICAgIHRoaXMuX2NvbXByZXNzaW9uV29ya2VyID0gbnVsbFxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBPdXRnb2luZyBwYXlsb2FkIG5lZWRzIHRvIGJlIGNvbXByZXNzZWQgYW5kIHNlbnQgdG8gc29ja2V0XG4gICAqXG4gICAqIEBwYXJhbSB7QXJyYXlCdWZmZXJ9IGJ1ZmZlciBPdXRnb2luZyB1bmNvbXByZXNzZWQgYXJyYXlidWZmZXJcbiAgICovXG4gIF9zZW5kQ29tcHJlc3NlZCAoYnVmZmVyKSB7XG4gICAgLy8gZGVmbGF0ZVxuICAgIGlmICh0aGlzLl9jb21wcmVzc2lvbldvcmtlcikge1xuICAgICAgdGhpcy5fY29tcHJlc3Npb25Xb3JrZXIucG9zdE1lc3NhZ2UoY3JlYXRlTWVzc2FnZShNRVNTQUdFX0RFRkxBVEUsIGJ1ZmZlciksIFtidWZmZXJdKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9jb21wcmVzc2lvbi5kZWZsYXRlKGJ1ZmZlcilcbiAgICB9XG4gIH1cbn1cblxuY29uc3QgY3JlYXRlTWVzc2FnZSA9IChtZXNzYWdlLCBidWZmZXIpID0+ICh7IG1lc3NhZ2UsIGJ1ZmZlciB9KVxuIl19