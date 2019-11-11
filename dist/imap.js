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

const TIMEOUT_SOCKET_LOWER_BOUND = 30000;
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
      } catch (E) {} // Connection closing unexpected is an error


      this.socket.onclose = () => this._onError(new Error('Socket closed unexpectedly!'));

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
    });
  }
  /**
   * Closes the connection to the server
   *
   * @returns {Promise} Resolves when the socket is closed
   */


  close(error) {
    return new Promise(resolve => {
      var tearDown = () => {
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

          try {
            this.socket.oncert = null;
          } catch (E) {}

          this.socket = null;
        }

        resolve();
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
    const buffer = (0, _common.toTypedArray)(str).buffer; // const timeout = this.timeoutSocketLowerBound + Math.floor(buffer.byteLength * this.timeoutSocketMultiplier)
    //
    // clearTimeout(this._socketTimeoutTimer) // clear pending timeouts
    // this._socketTimeoutTimer = setTimeout(() => this._onError(new Error('Socket timed out!')), timeout) // arm the next timeout

    if (this.compressed) {
      this._sendCompressed(buffer);
    } else {
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

    this.close(error).then(() => {
      this.onerror && this.onerror(error);
    }, () => {
      this.onerror && this.onerror(error);
    }); // don't close the connect
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
    // const timeout = this.timeoutSocketLowerBound + Math.floor(4096 * this.timeoutSocketMultiplier) // max packet size is 4096 bytes
    //
    // clearTimeout(this._socketTimeoutTimer) // reset the timeout on each data packet
    // this._socketTimeoutTimer = setTimeout(() => this._onError(new Error('Socket timed out!')), timeout)
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbWFwLmpzIl0sIm5hbWVzIjpbIk1FU1NBR0VfSU5JVElBTElaRV9XT1JLRVIiLCJNRVNTQUdFX0lORkxBVEUiLCJNRVNTQUdFX0lORkxBVEVEX0RBVEFfUkVBRFkiLCJNRVNTQUdFX0RFRkxBVEUiLCJNRVNTQUdFX0RFRkxBVEVEX0RBVEFfUkVBRFkiLCJFT0wiLCJMSU5FX0ZFRUQiLCJDQVJSSUFHRV9SRVRVUk4iLCJMRUZUX0NVUkxZX0JSQUNLRVQiLCJSSUdIVF9DVVJMWV9CUkFDS0VUIiwiQVNDSUlfUExVUyIsIkJVRkZFUl9TVEFURV9MSVRFUkFMIiwiQlVGRkVSX1NUQVRFX1BPU1NJQkxZX0xJVEVSQUxfTEVOR1RIXzEiLCJCVUZGRVJfU1RBVEVfUE9TU0lCTFlfTElURVJBTF9MRU5HVEhfMiIsIkJVRkZFUl9TVEFURV9ERUZBVUxUIiwiVElNRU9VVF9FTlRFUl9JRExFIiwiVElNRU9VVF9TT0NLRVRfTE9XRVJfQk9VTkQiLCJUSU1FT1VUX1NPQ0tFVF9NVUxUSVBMSUVSIiwiSW1hcCIsImNvbnN0cnVjdG9yIiwiaG9zdCIsInBvcnQiLCJvcHRpb25zIiwidGltZW91dEVudGVySWRsZSIsInRpbWVvdXRTb2NrZXRMb3dlckJvdW5kIiwidGltZW91dFNvY2tldE11bHRpcGxpZXIiLCJ1c2VTZWN1cmVUcmFuc3BvcnQiLCJzZWN1cmVNb2RlIiwiX2Nvbm5lY3Rpb25SZWFkeSIsIl9nbG9iYWxBY2NlcHRVbnRhZ2dlZCIsIl9jbGllbnRRdWV1ZSIsIl9jYW5TZW5kIiwiX3RhZ0NvdW50ZXIiLCJfY3VycmVudENvbW1hbmQiLCJfaWRsZVRpbWVyIiwiX3NvY2tldFRpbWVvdXRUaW1lciIsImNvbXByZXNzZWQiLCJfaW5jb21pbmdCdWZmZXJzIiwiX2J1ZmZlclN0YXRlIiwiX2xpdGVyYWxSZW1haW5pbmciLCJvbmNlcnQiLCJvbmVycm9yIiwib25yZWFkeSIsIm9uaWRsZSIsImNvbm5lY3QiLCJTb2NrZXQiLCJUQ1BTb2NrZXQiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInNvY2tldCIsIm9wZW4iLCJiaW5hcnlUeXBlIiwiY2EiLCJ3cyIsInNlcnZlcm5hbWUiLCJjZXJ0IiwiRSIsIm9uY2xvc2UiLCJfb25FcnJvciIsIkVycm9yIiwib25kYXRhIiwiZXZ0IiwiX29uRGF0YSIsImVyciIsImUiLCJkYXRhIiwibWVzc2FnZSIsIm9ub3BlbiIsImNsb3NlIiwiZXJyb3IiLCJ0ZWFyRG93biIsImZvckVhY2giLCJjbWQiLCJjYWxsYmFjayIsImNsZWFyVGltZW91dCIsIl9kaXNhYmxlQ29tcHJlc3Npb24iLCJyZWFkeVN0YXRlIiwibG9nb3V0IiwidGhlbiIsImNhdGNoIiwiZW5xdWV1ZUNvbW1hbmQiLCJ1cGdyYWRlIiwidXBncmFkZVRvU2VjdXJlIiwicmVxdWVzdCIsImFjY2VwdFVudGFnZ2VkIiwiY29tbWFuZCIsImNvbmNhdCIsIm1hcCIsInVudGFnZ2VkIiwidG9TdHJpbmciLCJ0b1VwcGVyQ2FzZSIsInRyaW0iLCJ0YWciLCJwYXlsb2FkIiwibGVuZ3RoIiwidW5kZWZpbmVkIiwicmVzcG9uc2UiLCJpc0Vycm9yIiwiaW5kZXhPZiIsImh1bWFuUmVhZGFibGUiLCJjb2RlIiwiT2JqZWN0Iiwia2V5cyIsImtleSIsImluZGV4IiwiY3R4Iiwic3BsaWNlIiwicHVzaCIsIl9zZW5kUmVxdWVzdCIsImdldFByZXZpb3VzbHlRdWV1ZWQiLCJjb21tYW5kcyIsInN0YXJ0SW5kZXgiLCJpIiwiaXNNYXRjaCIsInNlbmQiLCJzdHIiLCJidWZmZXIiLCJfc2VuZENvbXByZXNzZWQiLCJzZXRIYW5kbGVyIiwibG9nZ2VyIiwiVWludDhBcnJheSIsIl9wYXJzZUluY29taW5nQ29tbWFuZHMiLCJfaXRlcmF0ZUluY29taW5nQnVmZmVyIiwiYnVmIiwiZGlmZiIsIk1hdGgiLCJtaW4iLCJOdW1iZXIiLCJfbGVuZ3RoQnVmZmVyIiwic3RhcnQiLCJsYXRlc3QiLCJzdWJhcnJheSIsInByZXZCdWYiLCJzZXQiLCJsZWZ0SWR4IiwibGVmdE9mTGVmdEN1cmx5IiwiTEZpZHgiLCJjb21tYW5kTGVuZ3RoIiwicmVkdWNlIiwicHJldiIsImN1cnIiLCJ1aW50OEFycmF5Iiwic2hpZnQiLCJyZW1haW5pbmdMZW5ndGgiLCJleGNlc3NMZW5ndGgiLCJfY2xlYXJJZGxlIiwiY2h1bmsiLCJlcnJvclJlc3BvbnNlRXhwZWN0c0VtcHR5TGluZSIsInZhbHVlQXNTdHJpbmciLCJkZWJ1ZyIsIl9wcm9jZXNzUmVzcG9uc2UiLCJfaGFuZGxlUmVzcG9uc2UiLCJfZW50ZXJJZGxlIiwiX3Jlc3RhcnRRdWV1ZSIsInByZWNoZWNrIiwiY29udGV4dCIsIndhaXREcmFpbiIsInNldFRpbWVvdXQiLCJhdHRyaWJ1dGVzIiwidGVzdCIsInR5cGUiLCJuciIsInZhbHVlIiwic2VjdGlvbiIsIm9wdGlvbiIsIkFycmF5IiwiaXNBcnJheSIsInRvTG93ZXJDYXNlIiwicHJvdG90eXBlIiwiY2FsbCIsIm1hdGNoIiwiZW5hYmxlQ29tcHJlc3Npb24iLCJfc29ja2V0T25EYXRhIiwid2luZG93IiwiV29ya2VyIiwiX2NvbXByZXNzaW9uV29ya2VyIiwiVVJMIiwiY3JlYXRlT2JqZWN0VVJMIiwiQmxvYiIsIkNvbXByZXNzaW9uQmxvYiIsIm9ubWVzc2FnZSIsInBvc3RNZXNzYWdlIiwiY3JlYXRlTWVzc2FnZSIsImluZmxhdGVkUmVhZHkiLCJkZWZsYXRlZFJlYWR5IiwiX2NvbXByZXNzaW9uIiwiQ29tcHJlc3Npb24iLCJpbmZsYXRlIiwidGVybWluYXRlIiwiZGVmbGF0ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOzs7OztzK3hDQUdBO0FBQ0E7QUFDQTs7QUFDQSxNQUFNQSx5QkFBeUIsR0FBRyxPQUFsQztBQUNBLE1BQU1DLGVBQWUsR0FBRyxTQUF4QjtBQUNBLE1BQU1DLDJCQUEyQixHQUFHLGdCQUFwQztBQUNBLE1BQU1DLGVBQWUsR0FBRyxTQUF4QjtBQUNBLE1BQU1DLDJCQUEyQixHQUFHLGdCQUFwQztBQUVBLE1B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QSxTQUFLYyxNQUFMLENBQVlXLE1BQVosR0FBcUIsS0FBS2dILGFBQTFCO0FBQ0EsU0FBS0EsYUFBTCxHQUFxQixJQUFyQjs7QUFFQSxRQUFJLEtBQUtHLGtCQUFULEVBQTZCO0FBQzNCO0FBQ0EsV0FBS0Esa0JBQUwsQ0FBd0JhLFNBQXhCOztBQUNBLFdBQUtiLGtCQUFMLEdBQTBCLElBQTFCO0FBQ0Q7QUFDRjtBQUVEOzs7Ozs7O0FBS0ExRCxFQUFBQSxlQUFlLENBQUVELE1BQUYsRUFBVTtBQUN2QjtBQUNBLFFBQUksS0FBSzJELGtCQUFULEVBQTZCO0FBQzNCLFdBQUtBLGtCQUFMLENBQXdCTSxXQUF4QixDQUFvQ0MsYUFBYSxDQUFDcEwsZUFBRCxFQUFrQmtILE1BQWxCLENBQWpELEVBQTRFLENBQUNBLE1BQUQsQ0FBNUU7QUFDRCxLQUZELE1BRU87QUFDTCxXQUFLcUUsWUFBTCxDQUFrQkksT0FBbEIsQ0FBMEJ6RSxNQUExQjtBQUNEO0FBQ0Y7O0FBcnhCdUI7Ozs7QUF3eEIxQixNQUFNa0UsYUFBYSxHQUFHLENBQUNwSCxPQUFELEVBQVVrRCxNQUFWLE1BQXNCO0FBQUVsRCxFQUFBQSxPQUFGO0FBQVdrRCxFQUFBQTtBQUFYLENBQXRCLENBQXRCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcHJvcE9yIH0gZnJvbSAncmFtZGEnXG5pbXBvcnQgVENQU29ja2V0IGZyb20gJ2VtYWlsanMtdGNwLXNvY2tldCdcbmltcG9ydCB7IHRvVHlwZWRBcnJheSwgZnJvbVR5cGVkQXJyYXkgfSBmcm9tICcuL2NvbW1vbidcbmltcG9ydCB7IHBhcnNlciwgY29tcGlsZXIgfSBmcm9tICdlbWFpbGpzLWltYXAtaGFuZGxlcidcbmltcG9ydCBDb21wcmVzc2lvbiBmcm9tICcuL2NvbXByZXNzaW9uJ1xuaW1wb3J0IENvbXByZXNzaW9uQmxvYiBmcm9tICcuLi9yZXMvY29tcHJlc3Npb24ud29ya2VyLmJsb2InXG5cbi8vXG4vLyBjb25zdGFudHMgdXNlZCBmb3IgY29tbXVuaWNhdGlvbiB3aXRoIHRoZSB3b3JrZXJcbi8vXG5jb25zdCBNRVNTQUdFX0lOSVRJQUxJWkVfV09SS0VSID0gJ3N0YXJ0J1xuY29uc3QgTUVTU0FHRV9JTkZMQVRFID0gJ2luZmxhdGUnXG5jb25zdCBNRVNTQUdFX0lORkxBVEVEX0RBVEFfUkVBRFkgPSAnaW5mbGF0ZWRfcmVhZHknXG5jb25zdCBNRVNTQUdFX0RFRkxBVEUgPSAnZGVmbGF0ZSdcbmNvbnN0IE1FU1NBR0VfREVGTEFURURfREFUQV9SRUFEWSA9ICdkZWZsYXRlZF9yZWFkeSdcblxuY29uc3QgRU9MID0gJ1xcclxcbidcbmNvbnN0IExJTkVfRkVFRCA9IDEwXG5jb25zdCBDQVJSSUFHRV9SRVRVUk4gPSAxM1xuY29uc3QgTEVGVF9DVVJMWV9CUkFDS0VUID0gMTIzXG5jb25zdCBSSUdIVF9DVVJMWV9CUkFDS0VUID0gMTI1XG5cbmNvbnN0IEFTQ0lJX1BMVVMgPSA0M1xuXG4vLyBTdGF0ZSB0cmFja2luZyB3aGVuIGNvbnN0cnVjdGluZyBhbiBJTUFQIGNvbW1hbmQgZnJvbSBidWZmZXJzLlxuY29uc3QgQlVGRkVSX1NUQVRFX0xJVEVSQUwgPSAnbGl0ZXJhbCdcbmNvbnN0IEJVRkZFUl9TVEFURV9QT1NTSUJMWV9MSVRFUkFMX0xFTkdUSF8xID0gJ2xpdGVyYWxfbGVuZ3RoXzEnXG5jb25zdCBCVUZGRVJfU1RBVEVfUE9TU0lCTFlfTElURVJBTF9MRU5HVEhfMiA9ICdsaXRlcmFsX2xlbmd0aF8yJ1xuY29uc3QgQlVGRkVSX1NUQVRFX0RFRkFVTFQgPSAnZGVmYXVsdCdcblxuLyoqXG4gKiBIb3cgbXVjaCB0aW1lIHRvIHdhaXQgc2luY2UgdGhlIGxhc3QgcmVzcG9uc2UgdW50aWwgdGhlIGNvbm5lY3Rpb24gaXMgY29uc2lkZXJlZCBpZGxpbmdcbiAqL1xuY29uc3QgVElNRU9VVF9FTlRFUl9JRExFID0gMTAwMFxuXG4vKipcbiAqIExvd2VyIEJvdW5kIGZvciBzb2NrZXQgdGltZW91dCB0byB3YWl0IHNpbmNlIHRoZSBsYXN0IGRhdGEgd2FzIHdyaXR0ZW4gdG8gYSBzb2NrZXRcbiAqL1xuY29uc3QgVElNRU9VVF9TT0NLRVRfTE9XRVJfQk9VTkQgPSAzMDAwMFxuXG4vKipcbiAqIE11bHRpcGxpZXIgZm9yIHNvY2tldCB0aW1lb3V0OlxuICpcbiAqIFdlIGFzc3VtZSBhdCBsZWFzdCBhIEdQUlMgY29ubmVjdGlvbiB3aXRoIDExNSBrYi9zID0gMTQsMzc1IGtCL3MgdG9wcywgc28gMTAgS0IvcyB0byBiZSBvblxuICogdGhlIHNhZmUgc2lkZS4gV2UgY2FuIHRpbWVvdXQgYWZ0ZXIgYSBsb3dlciBib3VuZCBvZiAxMHMgKyAobiBLQiAvIDEwIEtCL3MpLiBBIDEgTUIgbWVzc2FnZVxuICogdXBsb2FkIHdvdWxkIGJlIDExMCBzZWNvbmRzIHRvIHdhaXQgZm9yIHRoZSB0aW1lb3V0LiAxMCBLQi9zID09PSAwLjEgcy9CXG4gKi9cbmNvbnN0IFRJTUVPVVRfU09DS0VUX01VTFRJUExJRVIgPSAwLjFcblxuLyoqXG4gKiBDcmVhdGVzIGEgY29ubmVjdGlvbiBvYmplY3QgdG8gYW4gSU1BUCBzZXJ2ZXIuIENhbGwgYGNvbm5lY3RgIG1ldGhvZCB0byBpbml0aXRhdGVcbiAqIHRoZSBhY3R1YWwgY29ubmVjdGlvbiwgdGhlIGNvbnN0cnVjdG9yIG9ubHkgZGVmaW5lcyB0aGUgcHJvcGVydGllcyBidXQgZG9lcyBub3QgYWN0dWFsbHkgY29ubmVjdC5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gW2hvc3Q9J2xvY2FsaG9zdCddIEhvc3RuYW1lIHRvIGNvbmVuY3QgdG9cbiAqIEBwYXJhbSB7TnVtYmVyfSBbcG9ydD0xNDNdIFBvcnQgbnVtYmVyIHRvIGNvbm5lY3QgdG9cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gT3B0aW9uYWwgb3B0aW9ucyBvYmplY3RcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMudXNlU2VjdXJlVHJhbnNwb3J0XSBTZXQgdG8gdHJ1ZSwgdG8gdXNlIGVuY3J5cHRlZCBjb25uZWN0aW9uXG4gKiBAcGFyYW0ge1N0cmluZ30gW29wdGlvbnMuY29tcHJlc3Npb25Xb3JrZXJQYXRoXSBvZmZsb2FkcyBkZS0vY29tcHJlc3Npb24gY29tcHV0YXRpb24gdG8gYSB3ZWIgd29ya2VyLCB0aGlzIGlzIHRoZSBwYXRoIHRvIHRoZSBicm93c2VyaWZpZWQgZW1haWxqcy1jb21wcmVzc29yLXdvcmtlci5qc1xuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBJbWFwIHtcbiAgY29uc3RydWN0b3IgKGhvc3QsIHBvcnQsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMudGltZW91dEVudGVySWRsZSA9IFRJTUVPVVRfRU5URVJfSURMRVxuICAgIHRoaXMudGltZW91dFNvY2tldExvd2VyQm91bmQgPSBUSU1FT1VUX1NPQ0tFVF9MT1dFUl9CT1VORFxuICAgIHRoaXMudGltZW91dFNvY2tldE11bHRpcGxpZXIgPSBUSU1FT1VUX1NPQ0tFVF9NVUxUSVBMSUVSXG5cbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zXG5cbiAgICB0aGlzLnBvcnQgPSBwb3J0IHx8ICh0aGlzLm9wdGlvbnMudXNlU2VjdXJlVHJhbnNwb3J0ID8gOTkzIDogMTQzKVxuICAgIHRoaXMuaG9zdCA9IGhvc3QgfHwgJ2xvY2FsaG9zdCdcblxuICAgIC8vIFVzZSBhIFRMUyBjb25uZWN0aW9uLiBQb3J0IDk5MyBhbHNvIGZvcmNlcyBUTFMuXG4gICAgdGhpcy5vcHRpb25zLnVzZVNlY3VyZVRyYW5zcG9ydCA9ICd1c2VTZWN1cmVUcmFuc3BvcnQnIGluIHRoaXMub3B0aW9ucyA/ICEhdGhpcy5vcHRpb25zLnVzZVNlY3VyZVRyYW5zcG9ydCA6IHRoaXMucG9ydCA9PT0gOTkzXG5cbiAgICB0aGlzLnNlY3VyZU1vZGUgPSAhIXRoaXMub3B0aW9ucy51c2VTZWN1cmVUcmFuc3BvcnQgLy8gRG9lcyB0aGUgY29ubmVjdGlvbiB1c2UgU1NML1RMU1xuXG4gICAgdGhpcy5fY29ubmVjdGlvblJlYWR5ID0gZmFsc2UgLy8gSXMgdGhlIGNvbmVjdGlvbiBlc3RhYmxpc2hlZCBhbmQgZ3JlZXRpbmcgaXMgcmVjZWl2ZWQgZnJvbSB0aGUgc2VydmVyXG5cbiAgICB0aGlzLl9nbG9iYWxBY2NlcHRVbnRhZ2dlZCA9IHt9IC8vIEdsb2JhbCBoYW5kbGVycyBmb3IgdW5yZWxhdGVkIHJlc3BvbnNlcyAoRVhQVU5HRSwgRVhJU1RTIGV0Yy4pXG5cbiAgICB0aGlzLl9jbGllbnRRdWV1ZSA9IFtdIC8vIFF1ZXVlIG9mIG91dGdvaW5nIGNvbW1hbmRzXG4gICAgdGhpcy5fY2FuU2VuZCA9IGZhbHNlIC8vIElzIGl0IE9LIHRvIHNlbmQgc29tZXRoaW5nIHRvIHRoZSBzZXJ2ZXJcbiAgICB0aGlzLl90YWdDb3VudGVyID0gMCAvLyBDb3VudGVyIHRvIGFsbG93IHVuaXF1ZXVlIGltYXAgdGFnc1xuICAgIHRoaXMuX2N1cnJlbnRDb21tYW5kID0gZmFsc2UgLy8gQ3VycmVudCBjb21tYW5kIHRoYXQgaXMgd2FpdGluZyBmb3IgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyXG5cbiAgICB0aGlzLl9pZGxlVGltZXIgPSBmYWxzZSAvLyBUaW1lciB3YWl0aW5nIHRvIGVudGVyIGlkbGVcbiAgICB0aGlzLl9zb2NrZXRUaW1lb3V0VGltZXIgPSBmYWxzZSAvLyBUaW1lciB3YWl0aW5nIHRvIGRlY2xhcmUgdGhlIHNvY2tldCBkZWFkIHN0YXJ0aW5nIGZyb20gdGhlIGxhc3Qgd3JpdGVcblxuICAgIHRoaXMuY29tcHJlc3NlZCA9IGZhbHNlIC8vIElzIHRoZSBjb25uZWN0aW9uIGNvbXByZXNzZWQgYW5kIG5lZWRzIGluZmxhdGluZy9kZWZsYXRpbmdcblxuICAgIC8vXG4gICAgLy8gSEVMUEVSU1xuICAgIC8vXG5cbiAgICAvLyBBcyB0aGUgc2VydmVyIHNlbmRzIGRhdGEgaW4gY2h1bmtzLCBpdCBuZWVkcyB0byBiZSBzcGxpdCBpbnRvIHNlcGFyYXRlIGxpbmVzLiBIZWxwcyBwYXJzaW5nIHRoZSBpbnB1dC5cbiAgICB0aGlzLl9pbmNvbWluZ0J1ZmZlcnMgPSBbXVxuICAgIHRoaXMuX2J1ZmZlclN0YXRlID0gQlVGRkVSX1NUQVRFX0RFRkFVTFRcbiAgICB0aGlzLl9saXRlcmFsUmVtYWluaW5nID0gMFxuXG4gICAgLy9cbiAgICAvLyBFdmVudCBwbGFjZWhvbGRlcnMsIG1heSBiZSBvdmVycmlkZW4gd2l0aCBjYWxsYmFjayBmdW5jdGlvbnNcbiAgICAvL1xuICAgIHRoaXMub25jZXJ0ID0gbnVsbFxuICAgIHRoaXMub25lcnJvciA9IG51bGwgLy8gSXJyZWNvdmVyYWJsZSBlcnJvciBvY2N1cnJlZC4gQ29ubmVjdGlvbiB0byB0aGUgc2VydmVyIHdpbGwgYmUgY2xvc2VkIGF1dG9tYXRpY2FsbHkuXG4gICAgdGhpcy5vbnJlYWR5ID0gbnVsbCAvLyBUaGUgY29ubmVjdGlvbiB0byB0aGUgc2VydmVyIGhhcyBiZWVuIGVzdGFibGlzaGVkIGFuZCBncmVldGluZyBpcyByZWNlaXZlZFxuICAgIHRoaXMub25pZGxlID0gbnVsbCAvLyBUaGVyZSBhcmUgbm8gbW9yZSBjb21tYW5kcyB0byBwcm9jZXNzXG4gIH1cblxuICAvLyBQVUJMSUMgTUVUSE9EU1xuXG4gIC8qKlxuICAgKiBJbml0aWF0ZSBhIGNvbm5lY3Rpb24gdG8gdGhlIHNlcnZlci4gV2FpdCBmb3Igb25yZWFkeSBldmVudFxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gU29ja2V0XG4gICAqICAgICBURVNUSU5HIE9OTFkhIFRoZSBUQ1BTb2NrZXQgaGFzIGEgcHJldHR5IG5vbnNlbnNpY2FsIGNvbnZlbmllbmNlIGNvbnN0cnVjdG9yLFxuICAgKiAgICAgd2hpY2ggbWFrZXMgaXQgaGFyZCB0byBtb2NrLiBGb3IgZGVwZW5kZW5jeS1pbmplY3Rpb24gcHVycG9zZXMsIHdlIHVzZSB0aGVcbiAgICogICAgIFNvY2tldCBwYXJhbWV0ZXIgdG8gcGFzcyBpbiBhIG1vY2sgU29ja2V0IGltcGxlbWVudGF0aW9uLiBTaG91bGQgYmUgbGVmdCBibGFua1xuICAgKiAgICAgaW4gcHJvZHVjdGlvbiB1c2UhXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBSZXNvbHZlcyB3aGVuIHNvY2tldCBpcyBvcGVuZWRcbiAgICovXG4gIGNvbm5lY3QgKFNvY2tldCA9IFRDUFNvY2tldCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLnNvY2tldCA9IFNvY2tldC5vcGVuKHRoaXMuaG9zdCwgdGhpcy5wb3J0LCB7XG4gICAgICAgIGJpbmFyeVR5cGU6ICdhcnJheWJ1ZmZlcicsXG4gICAgICAgIHVzZVNlY3VyZVRyYW5zcG9ydDogdGhpcy5zZWN1cmVNb2RlLFxuICAgICAgICBjYTogdGhpcy5vcHRpb25zLmNhLFxuICAgICAgICB3czogdGhpcy5vcHRpb25zLndzLFxuICAgICAgICBzZXJ2ZXJuYW1lOiB0aGlzLm9wdGlvbnMuc2VydmVybmFtZVxuICAgICAgfSlcblxuICAgICAgLy8gYWxsb3dzIGNlcnRpZmljYXRlIGhhbmRsaW5nIGZvciBwbGF0Zm9ybSB3L28gbmF0aXZlIHRscyBzdXBwb3J0XG4gICAgICAvLyBvbmNlcnQgaXMgbm9uIHN0YW5kYXJkIHNvIHNldHRpbmcgaXQgbWlnaHQgdGhyb3cgaWYgdGhlIHNvY2tldCBvYmplY3QgaXMgaW1tdXRhYmxlXG4gICAgICB0cnkge1xuICAgICAgICB0aGlzLnNvY2tldC5vbmNlcnQgPSAoY2VydCkgPT4geyB0aGlzLm9uY2VydCAmJiB0aGlzLm9uY2VydChjZXJ0KSB9XG4gICAgICB9IGNhdGNoIChFKSB7IH1cblxuICAgICAgLy8gQ29ubmVjdGlvbiBjbG9zaW5nIHVuZXhwZWN0ZWQgaXMgYW4gZXJyb3JcbiAgICAgIHRoaXMuc29ja2V0Lm9uY2xvc2UgPSAoKSA9PiB0aGlzLl9vbkVycm9yKG5ldyBFcnJvcignU29ja2V0IGNsb3NlZCB1bmV4cGVjdGVkbHkhJykpXG4gICAgICB0aGlzLnNvY2tldC5vbmRhdGEgPSAoZXZ0KSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdGhpcy5fb25EYXRhKGV2dClcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgdGhpcy5fb25FcnJvcihlcnIpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gaWYgYW4gZXJyb3IgaGFwcGVucyBkdXJpbmcgY3JlYXRlIHRpbWUsIHJlamVjdCB0aGUgcHJvbWlzZVxuICAgICAgdGhpcy5zb2NrZXQub25lcnJvciA9IChlKSA9PiB7XG4gICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ0NvdWxkIG5vdCBvcGVuIHNvY2tldDogJyArIGUuZGF0YS5tZXNzYWdlKSlcbiAgICAgIH1cblxuICAgICAgdGhpcy5zb2NrZXQub25vcGVuID0gKCkgPT4ge1xuICAgICAgICAvLyB1c2UgcHJvcGVyIFwiaXJyZWNvdmVyYWJsZSBlcnJvciwgdGVhciBkb3duIGV2ZXJ5dGhpbmdcIi1oYW5kbGVyIG9ubHkgYWZ0ZXIgc29ja2V0IGlzIG9wZW5cbiAgICAgICAgdGhpcy5zb2NrZXQub25lcnJvciA9IChlKSA9PiB0aGlzLl9vbkVycm9yKGUpXG4gICAgICAgIHJlc29sdmUoKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIHRoZSBjb25uZWN0aW9uIHRvIHRoZSBzZXJ2ZXJcbiAgICpcbiAgICogQHJldHVybnMge1Byb21pc2V9IFJlc29sdmVzIHdoZW4gdGhlIHNvY2tldCBpcyBjbG9zZWRcbiAgICovXG4gIGNsb3NlIChlcnJvcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgdmFyIHRlYXJEb3duID0gKCkgPT4ge1xuICAgICAgICAvLyBmdWxmaWxsIHBlbmRpbmcgcHJvbWlzZXNcbiAgICAgICAgdGhpcy5fY2xpZW50UXVldWUuZm9yRWFjaChjbWQgPT4gY21kLmNhbGxiYWNrKGVycm9yKSlcbiAgICAgICAgaWYgKHRoaXMuX2N1cnJlbnRDb21tYW5kKSB7XG4gICAgICAgICAgdGhpcy5fY3VycmVudENvbW1hbmQuY2FsbGJhY2soZXJyb3IpXG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9jb25uZWN0aW9uUmVhZHkgPSBmYWxzZVxuICAgICAgICB0aGlzLl9jbGllbnRRdWV1ZSA9IFtdXG4gICAgICAgIHRoaXMuX3RhZ0NvdW50ZXIgPSAwXG4gICAgICAgIHRoaXMuX2N1cnJlbnRDb21tYW5kID0gZmFsc2VcblxuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5faWRsZVRpbWVyKVxuICAgICAgICB0aGlzLl9pZGxlVGltZXIgPSBudWxsXG5cbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuX3NvY2tldFRpbWVvdXRUaW1lcilcbiAgICAgICAgdGhpcy5fc29ja2V0VGltZW91dFRpbWVyID0gbnVsbFxuXG4gICAgICAgIGlmICh0aGlzLnNvY2tldCkge1xuICAgICAgICAgIC8vIHJlbW92ZSBhbGwgbGlzdGVuZXJzXG4gICAgICAgICAgdGhpcy5zb2NrZXQub25vcGVuID0gbnVsbFxuICAgICAgICAgIHRoaXMuc29ja2V0Lm9uY2xvc2UgPSBudWxsXG4gICAgICAgICAgdGhpcy5zb2NrZXQub25kYXRhID0gbnVsbFxuICAgICAgICAgIHRoaXMuc29ja2V0Lm9uZXJyb3IgPSBudWxsXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuc29ja2V0Lm9uY2VydCA9IG51bGxcbiAgICAgICAgICB9IGNhdGNoIChFKSB7IH1cblxuICAgICAgICAgIHRoaXMuc29ja2V0ID0gbnVsbFxuICAgICAgICB9XG5cbiAgICAgICAgcmVzb2x2ZSgpXG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2Rpc2FibGVDb21wcmVzc2lvbigpXG5cbiAgICAgIGlmICghdGhpcy5zb2NrZXQgfHwgdGhpcy5zb2NrZXQucmVhZHlTdGF0ZSAhPT0gJ29wZW4nKSB7XG4gICAgICAgIHJldHVybiB0ZWFyRG93bigpXG4gICAgICB9XG5cbiAgICAgIHRoaXMuc29ja2V0Lm9uY2xvc2UgPSB0aGlzLnNvY2tldC5vbmVycm9yID0gdGVhckRvd24gLy8gd2UgZG9uJ3QgcmVhbGx5IGNhcmUgYWJvdXQgdGhlIGVycm9yIGhlcmVcbiAgICAgIHRoaXMuc29ja2V0LmNsb3NlKClcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIFNlbmQgTE9HT1VUIHRvIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIFVzZSBpcyBkaXNjb3VyYWdlZCFcbiAgICpcbiAgICogQHJldHVybnMge1Byb21pc2V9IFJlc29sdmVzIHdoZW4gY29ubmVjdGlvbiBpcyBjbG9zZWQgYnkgc2VydmVyLlxuICAgKi9cbiAgbG9nb3V0ICgpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5zb2NrZXQub25jbG9zZSA9IHRoaXMuc29ja2V0Lm9uZXJyb3IgPSAoKSA9PiB7XG4gICAgICAgIHRoaXMuY2xvc2UoJ0NsaWVudCBsb2dnaW5nIG91dCcpLnRoZW4ocmVzb2x2ZSkuY2F0Y2gocmVqZWN0KVxuICAgICAgfVxuXG4gICAgICB0aGlzLmVucXVldWVDb21tYW5kKCdMT0dPVVQnKVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhdGVzIFRMUyBoYW5kc2hha2VcbiAgICovXG4gIHVwZ3JhZGUgKCkge1xuICAgIHRoaXMuc2VjdXJlTW9kZSA9IHRydWVcbiAgICB0aGlzLnNvY2tldC51cGdyYWRlVG9TZWN1cmUoKVxuICB9XG5cbiAgLyoqXG4gICAqIFNjaGVkdWxlcyBhIGNvbW1hbmQgdG8gYmUgc2VudCB0byB0aGUgc2VydmVyLlxuICAgKiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2VtYWlsanMvZW1haWxqcy1pbWFwLWhhbmRsZXIgZm9yIHJlcXVlc3Qgc3RydWN0dXJlLlxuICAgKiBEbyBub3QgcHJvdmlkZSBhIHRhZyBwcm9wZXJ0eSwgaXQgd2lsbCBiZSBzZXQgYnkgdGhlIHF1ZXVlIG1hbmFnZXIuXG4gICAqXG4gICAqIFRvIGNhdGNoIHVudGFnZ2VkIHJlc3BvbnNlcyB1c2UgYWNjZXB0VW50YWdnZWQgcHJvcGVydHkuIEZvciBleGFtcGxlLCBpZlxuICAgKiB0aGUgdmFsdWUgZm9yIGl0IGlzICdGRVRDSCcgdGhlbiB0aGUgcmVwb25zZSBpbmNsdWRlcyAncGF5bG9hZC5GRVRDSCcgcHJvcGVydHlcbiAgICogdGhhdCBpcyBhbiBhcnJheSBpbmNsdWRpbmcgYWxsIGxpc3RlZCAqIEZFVENIIHJlc3BvbnNlcy5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHJlcXVlc3QgU3RydWN0dXJlZCByZXF1ZXN0IG9iamVjdFxuICAgKiBAcGFyYW0ge0FycmF5fSBhY2NlcHRVbnRhZ2dlZCBhIGxpc3Qgb2YgdW50YWdnZWQgcmVzcG9uc2VzIHRoYXQgd2lsbCBiZSBpbmNsdWRlZCBpbiAncGF5bG9hZCcgcHJvcGVydHlcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBPcHRpb25hbCBkYXRhIGZvciB0aGUgY29tbWFuZCBwYXlsb2FkXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiB0aGUgY29ycmVzcG9uZGluZyByZXNwb25zZSB3YXMgcmVjZWl2ZWRcbiAgICovXG4gIGVucXVldWVDb21tYW5kIChyZXF1ZXN0LCBhY2NlcHRVbnRhZ2dlZCwgb3B0aW9ucykge1xuICAgIGlmICh0eXBlb2YgcmVxdWVzdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJlcXVlc3QgPSB7XG4gICAgICAgIGNvbW1hbmQ6IHJlcXVlc3RcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhY2NlcHRVbnRhZ2dlZCA9IFtdLmNvbmNhdChhY2NlcHRVbnRhZ2dlZCB8fCBbXSkubWFwKCh1bnRhZ2dlZCkgPT4gKHVudGFnZ2VkIHx8ICcnKS50b1N0cmluZygpLnRvVXBwZXJDYXNlKCkudHJpbSgpKVxuXG4gICAgdmFyIHRhZyA9ICdXJyArICgrK3RoaXMuX3RhZ0NvdW50ZXIpXG4gICAgcmVxdWVzdC50YWcgPSB0YWdcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgdGFnOiB0YWcsXG4gICAgICAgIHJlcXVlc3Q6IHJlcXVlc3QsXG4gICAgICAgIHBheWxvYWQ6IGFjY2VwdFVudGFnZ2VkLmxlbmd0aCA/IHt9IDogdW5kZWZpbmVkLFxuICAgICAgICBjYWxsYmFjazogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgaWYgKHRoaXMuaXNFcnJvcihyZXNwb25zZSkpIHtcbiAgICAgICAgICAgIHJldHVybiByZWplY3QocmVzcG9uc2UpXG4gICAgICAgICAgfSBlbHNlIGlmIChbJ05PJywgJ0JBRCddLmluZGV4T2YocHJvcE9yKCcnLCAnY29tbWFuZCcsIHJlc3BvbnNlKS50b1VwcGVyQ2FzZSgpLnRyaW0oKSkgPj0gMCkge1xuICAgICAgICAgICAgLy8gSWdub3JlIFFRIEVtYWlsIE5PIGNvbW1hbmQgbWVzc2FnZSBgTmVlZCB0byBTRUxFQ1QgZmlyc3QhYFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmh1bWFuUmVhZGFibGUgIT09ICdOZWVkIHRvIFNFTEVDVCBmaXJzdCEnKSB7XG4gICAgICAgICAgICAgIHZhciBlcnJvciA9IG5ldyBFcnJvcihyZXNwb25zZS5odW1hblJlYWRhYmxlIHx8ICdFcnJvcicpXG4gICAgICAgICAgICAgIGlmIChyZXNwb25zZS5jb2RlKSB7XG4gICAgICAgICAgICAgICAgZXJyb3IuY29kZSA9IHJlc3BvbnNlLmNvZGVcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KGVycm9yKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gYXBwbHkgYW55IGFkZGl0aW9uYWwgb3B0aW9ucyB0byB0aGUgY29tbWFuZFxuICAgICAgT2JqZWN0LmtleXMob3B0aW9ucyB8fCB7fSkuZm9yRWFjaCgoa2V5KSA9PiB7IGRhdGFba2V5XSA9IG9wdGlvbnNba2V5XSB9KVxuXG4gICAgICBhY2NlcHRVbnRhZ2dlZC5mb3JFYWNoKChjb21tYW5kKSA9PiB7IGRhdGEucGF5bG9hZFtjb21tYW5kXSA9IFtdIH0pXG5cbiAgICAgIC8vIGlmIHdlJ3JlIGluIHByaW9yaXR5IG1vZGUgKGkuZS4gd2UgcmFuIGNvbW1hbmRzIGluIGEgcHJlY2hlY2spLFxuICAgICAgLy8gcXVldWUgYW55IGNvbW1hbmRzIEJFRk9SRSB0aGUgY29tbWFuZCB0aGF0IGNvbnRpYW5lZCB0aGUgcHJlY2hlY2ssXG4gICAgICAvLyBvdGhlcndpc2UganVzdCBxdWV1ZSBjb21tYW5kIGFzIHVzdWFsXG4gICAgICB2YXIgaW5kZXggPSBkYXRhLmN0eCA/IHRoaXMuX2NsaWVudFF1ZXVlLmluZGV4T2YoZGF0YS5jdHgpIDogLTFcbiAgICAgIGlmIChpbmRleCA+PSAwKSB7XG4gICAgICAgIGRhdGEudGFnICs9ICcucCdcbiAgICAgICAgZGF0YS5yZXF1ZXN0LnRhZyArPSAnLnAnXG4gICAgICAgIHRoaXMuX2NsaWVudFF1ZXVlLnNwbGljZShpbmRleCwgMCwgZGF0YSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2NsaWVudFF1ZXVlLnB1c2goZGF0YSlcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2NhblNlbmQpIHtcbiAgICAgICAgdGhpcy5fc2VuZFJlcXVlc3QoKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGNvbW1hbmRzXG4gICAqIEBwYXJhbSBjdHhcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBnZXRQcmV2aW91c2x5UXVldWVkIChjb21tYW5kcywgY3R4KSB7XG4gICAgY29uc3Qgc3RhcnRJbmRleCA9IHRoaXMuX2NsaWVudFF1ZXVlLmluZGV4T2YoY3R4KSAtIDFcblxuICAgIC8vIHNlYXJjaCBiYWNrd2FyZHMgZm9yIHRoZSBjb21tYW5kcyBhbmQgcmV0dXJuIHRoZSBmaXJzdCBmb3VuZFxuICAgIGZvciAobGV0IGkgPSBzdGFydEluZGV4OyBpID49IDA7IGktLSkge1xuICAgICAgaWYgKGlzTWF0Y2godGhpcy5fY2xpZW50UXVldWVbaV0pKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jbGllbnRRdWV1ZVtpXVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGFsc28gY2hlY2sgY3VycmVudCBjb21tYW5kIGlmIG5vIFNFTEVDVCBpcyBxdWV1ZWRcbiAgICBpZiAoaXNNYXRjaCh0aGlzLl9jdXJyZW50Q29tbWFuZCkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9jdXJyZW50Q29tbWFuZFxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZVxuXG4gICAgZnVuY3Rpb24gaXNNYXRjaCAoZGF0YSkge1xuICAgICAgcmV0dXJuIGRhdGEgJiYgZGF0YS5yZXF1ZXN0ICYmIGNvbW1hbmRzLmluZGV4T2YoZGF0YS5yZXF1ZXN0LmNvbW1hbmQpID49IDBcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2VuZCBkYXRhIHRvIHRoZSBUQ1Agc29ja2V0XG4gICAqIEFybXMgYSB0aW1lb3V0IHdhaXRpbmcgZm9yIGEgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gc3RyIFBheWxvYWRcbiAgICovXG4gIHNlbmQgKHN0cikge1xuICAgIGNvbnN0IGJ1ZmZlciA9IHRvVHlwZWRBcnJheShzdHIpLmJ1ZmZlclxuICAgIC8vIGNvbnN0IHRpbWVvdXQgPSB0aGlzLnRpbWVvdXRTb2NrZXRMb3dlckJvdW5kICsgTWF0aC5mbG9vcihidWZmZXIuYnl0ZUxlbmd0aCAqIHRoaXMudGltZW91dFNvY2tldE11bHRpcGxpZXIpXG4gICAgLy9cbiAgICAvLyBjbGVhclRpbWVvdXQodGhpcy5fc29ja2V0VGltZW91dFRpbWVyKSAvLyBjbGVhciBwZW5kaW5nIHRpbWVvdXRzXG4gICAgLy8gdGhpcy5fc29ja2V0VGltZW91dFRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB0aGlzLl9vbkVycm9yKG5ldyBFcnJvcignU29ja2V0IHRpbWVkIG91dCEnKSksIHRpbWVvdXQpIC8vIGFybSB0aGUgbmV4dCB0aW1lb3V0XG5cbiAgICBpZiAodGhpcy5jb21wcmVzc2VkKSB7XG4gICAgICB0aGlzLl9zZW5kQ29tcHJlc3NlZChidWZmZXIpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc29ja2V0LnNlbmQoYnVmZmVyKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgYSBnbG9iYWwgaGFuZGxlciBmb3IgYW4gdW50YWdnZWQgcmVzcG9uc2UuIElmIGN1cnJlbnRseSBwcm9jZXNzZWQgY29tbWFuZFxuICAgKiBoYXMgbm90IGxpc3RlZCB1bnRhZ2dlZCBjb21tYW5kIGl0IGlzIGZvcndhcmRlZCB0byB0aGUgZ2xvYmFsIGhhbmRsZXIuIFVzZWZ1bFxuICAgKiB3aXRoIEVYUFVOR0UsIEVYSVNUUyBldGMuXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBjb21tYW5kIFVudGFnZ2VkIGNvbW1hbmQgbmFtZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBDYWxsYmFjayBmdW5jdGlvbiB3aXRoIHJlc3BvbnNlIG9iamVjdCBhbmQgY29udGludWUgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICovXG4gIHNldEhhbmRsZXIgKGNvbW1hbmQsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5fZ2xvYmFsQWNjZXB0VW50YWdnZWRbY29tbWFuZC50b1VwcGVyQ2FzZSgpLnRyaW0oKV0gPSBjYWxsYmFja1xuICB9XG5cbiAgLy8gSU5URVJOQUwgRVZFTlRTXG5cbiAgLyoqXG4gICAqIEVycm9yIGhhbmRsZXIgZm9yIHRoZSBzb2NrZXRcbiAgICpcbiAgICogQGV2ZW50XG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2dCBFdmVudCBvYmplY3QuIFNlZSBldnQuZGF0YSBmb3IgdGhlIGVycm9yXG4gICAqL1xuICBfb25FcnJvciAoZXZ0KSB7XG4gICAgdmFyIGVycm9yXG4gICAgaWYgKHRoaXMuaXNFcnJvcihldnQpKSB7XG4gICAgICBlcnJvciA9IGV2dFxuICAgIH0gZWxzZSBpZiAoZXZ0ICYmIHRoaXMuaXNFcnJvcihldnQuZGF0YSkpIHtcbiAgICAgIGVycm9yID0gZXZ0LmRhdGFcbiAgICB9IGVsc2Uge1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoKGV2dCAmJiBldnQuZGF0YSAmJiBldnQuZGF0YS5tZXNzYWdlKSB8fCBldnQuZGF0YSB8fCBldnQgfHwgJ0Vycm9yJylcbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci5lcnJvcihlcnJvcilcblxuICAgIC8vIGFsd2F5cyBjYWxsIG9uZXJyb3IgY2FsbGJhY2ssIG5vIG1hdHRlciBpZiBjbG9zZSgpIHN1Y2NlZWRzIG9yIGZhaWxzXG4gICAgdGhpcy5jbG9zZShlcnJvcikudGhlbigoKSA9PiB7XG4gICAgICB0aGlzLm9uZXJyb3IgJiYgdGhpcy5vbmVycm9yKGVycm9yKVxuICAgIH0sICgpID0+IHtcbiAgICAgIHRoaXMub25lcnJvciAmJiB0aGlzLm9uZXJyb3IoZXJyb3IpXG4gICAgfSlcblxuICAgIC8vIGRvbid0IGNsb3NlIHRoZSBjb25uZWN0XG4gICAgLy8gdGhpcy5vbmVycm9yICYmIHRoaXMub25lcnJvcihlcnJvcilcbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGVyIGZvciBpbmNvbWluZyBkYXRhIGZyb20gdGhlIHNlcnZlci4gVGhlIGRhdGEgaXMgc2VudCBpbiBhcmJpdHJhcnlcbiAgICogY2h1bmtzIGFuZCBjYW4ndCBiZSB1c2VkIGRpcmVjdGx5IHNvIHRoaXMgZnVuY3Rpb24gbWFrZXMgc3VyZSB0aGUgZGF0YVxuICAgKiBpcyBzcGxpdCBpbnRvIGNvbXBsZXRlIGxpbmVzIGJlZm9yZSB0aGUgZGF0YSBpcyBwYXNzZWQgdG8gdGhlIGNvbW1hbmRcbiAgICogaGFuZGxlclxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldnRcbiAgICovXG4gIF9vbkRhdGEgKGV2dCkge1xuICAgIC8vIGNvbnN0IHRpbWVvdXQgPSB0aGlzLnRpbWVvdXRTb2NrZXRMb3dlckJvdW5kICsgTWF0aC5mbG9vcig0MDk2ICogdGhpcy50aW1lb3V0U29ja2V0TXVsdGlwbGllcikgLy8gbWF4IHBhY2tldCBzaXplIGlzIDQwOTYgYnl0ZXNcbiAgICAvL1xuICAgIC8vIGNsZWFyVGltZW91dCh0aGlzLl9zb2NrZXRUaW1lb3V0VGltZXIpIC8vIHJlc2V0IHRoZSB0aW1lb3V0IG9uIGVhY2ggZGF0YSBwYWNrZXRcbiAgICAvLyB0aGlzLl9zb2NrZXRUaW1lb3V0VGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHRoaXMuX29uRXJyb3IobmV3IEVycm9yKCdTb2NrZXQgdGltZWQgb3V0IScpKSwgdGltZW91dClcblxuICAgIHRoaXMuX2luY29taW5nQnVmZmVycy5wdXNoKG5ldyBVaW50OEFycmF5KGV2dC5kYXRhKSkgLy8gYXBwZW5kIHRvIHRoZSBpbmNvbWluZyBidWZmZXJcbiAgICB0aGlzLl9wYXJzZUluY29taW5nQ29tbWFuZHModGhpcy5faXRlcmF0ZUluY29taW5nQnVmZmVyKCkpIC8vIENvbnN1bWUgdGhlIGluY29taW5nIGJ1ZmZlclxuICB9XG5cbiAgKiBfaXRlcmF0ZUluY29taW5nQnVmZmVyICgpIHtcbiAgICBsZXQgYnVmID0gdGhpcy5faW5jb21pbmdCdWZmZXJzW3RoaXMuX2luY29taW5nQnVmZmVycy5sZW5ndGggLSAxXSB8fCBbXVxuICAgIGxldCBpID0gMFxuXG4gICAgLy8gbG9vcCBpbnZhcmlhbnQ6XG4gICAgLy8gICB0aGlzLl9pbmNvbWluZ0J1ZmZlcnMgc3RhcnRzIHdpdGggdGhlIGJlZ2lubmluZyBvZiBpbmNvbWluZyBjb21tYW5kLlxuICAgIC8vICAgYnVmIGlzIHNob3J0aGFuZCBmb3IgbGFzdCBlbGVtZW50IG9mIHRoaXMuX2luY29taW5nQnVmZmVycy5cbiAgICAvLyAgIGJ1ZlswLi5pLTFdIGlzIHBhcnQgb2YgaW5jb21pbmcgY29tbWFuZC5cbiAgICB3aGlsZSAoaSA8IGJ1Zi5sZW5ndGgpIHtcbiAgICAgIHN3aXRjaCAodGhpcy5fYnVmZmVyU3RhdGUpIHtcbiAgICAgICAgY2FzZSBCVUZGRVJfU1RBVEVfTElURVJBTDpcbiAgICAgICAgICBjb25zdCBkaWZmID0gTWF0aC5taW4oYnVmLmxlbmd0aCAtIGksIHRoaXMuX2xpdGVyYWxSZW1haW5pbmcpXG4gICAgICAgICAgdGhpcy5fbGl0ZXJhbFJlbWFpbmluZyAtPSBkaWZmXG4gICAgICAgICAgaSArPSBkaWZmXG4gICAgICAgICAgaWYgKHRoaXMuX2xpdGVyYWxSZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuX2J1ZmZlclN0YXRlID0gQlVGRkVSX1NUQVRFX0RFRkFVTFRcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGludWVcblxuICAgICAgICBjYXNlIEJVRkZFUl9TVEFURV9QT1NTSUJMWV9MSVRFUkFMX0xFTkdUSF8yOlxuICAgICAgICAgIGlmIChpIDwgYnVmLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKGJ1ZltpXSA9PT0gQ0FSUklBR0VfUkVUVVJOKSB7XG4gICAgICAgICAgICAgIHRoaXMuX2xpdGVyYWxSZW1haW5pbmcgPSBOdW1iZXIoZnJvbVR5cGVkQXJyYXkodGhpcy5fbGVuZ3RoQnVmZmVyKSkgKyAyIC8vIGZvciBDUkxGXG4gICAgICAgICAgICAgIHRoaXMuX2J1ZmZlclN0YXRlID0gQlVGRkVSX1NUQVRFX0xJVEVSQUxcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRoaXMuX2J1ZmZlclN0YXRlID0gQlVGRkVSX1NUQVRFX0RFRkFVTFRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9sZW5ndGhCdWZmZXJcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGludWVcblxuICAgICAgICBjYXNlIEJVRkZFUl9TVEFURV9QT1NTSUJMWV9MSVRFUkFMX0xFTkdUSF8xOlxuICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gaVxuICAgICAgICAgIHdoaWxlIChpIDwgYnVmLmxlbmd0aCAmJiBidWZbaV0gPj0gNDggJiYgYnVmW2ldIDw9IDU3KSB7IC8vIGRpZ2l0c1xuICAgICAgICAgICAgaSsrXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzdGFydCAhPT0gaSkge1xuICAgICAgICAgICAgY29uc3QgbGF0ZXN0ID0gYnVmLnN1YmFycmF5KHN0YXJ0LCBpKVxuICAgICAgICAgICAgY29uc3QgcHJldkJ1ZiA9IHRoaXMuX2xlbmd0aEJ1ZmZlclxuICAgICAgICAgICAgdGhpcy5fbGVuZ3RoQnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkocHJldkJ1Zi5sZW5ndGggKyBsYXRlc3QubGVuZ3RoKVxuICAgICAgICAgICAgdGhpcy5fbGVuZ3RoQnVmZmVyLnNldChwcmV2QnVmKVxuICAgICAgICAgICAgdGhpcy5fbGVuZ3RoQnVmZmVyLnNldChsYXRlc3QsIHByZXZCdWYubGVuZ3RoKVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaSA8IGJ1Zi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9sZW5ndGhCdWZmZXIubGVuZ3RoID4gMCAmJiBidWZbaV0gPT09IFJJR0hUX0NVUkxZX0JSQUNLRVQpIHtcbiAgICAgICAgICAgICAgdGhpcy5fYnVmZmVyU3RhdGUgPSBCVUZGRVJfU1RBVEVfUE9TU0lCTFlfTElURVJBTF9MRU5HVEhfMlxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2xlbmd0aEJ1ZmZlclxuICAgICAgICAgICAgICB0aGlzLl9idWZmZXJTdGF0ZSA9IEJVRkZFUl9TVEFURV9ERUZBVUxUXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpKytcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGludWVcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIC8vIGZpbmQgbGl0ZXJhbCBsZW5ndGhcbiAgICAgICAgICBjb25zdCBsZWZ0SWR4ID0gYnVmLmluZGV4T2YoTEVGVF9DVVJMWV9CUkFDS0VULCBpKVxuICAgICAgICAgIGlmIChsZWZ0SWR4ID4gLTEpIHtcbiAgICAgICAgICAgIGNvbnN0IGxlZnRPZkxlZnRDdXJseSA9IG5ldyBVaW50OEFycmF5KGJ1Zi5idWZmZXIsIGksIGxlZnRJZHggLSBpKVxuICAgICAgICAgICAgaWYgKGxlZnRPZkxlZnRDdXJseS5pbmRleE9mKExJTkVfRkVFRCkgPT09IC0xKSB7XG4gICAgICAgICAgICAgIGkgPSBsZWZ0SWR4ICsgMVxuICAgICAgICAgICAgICB0aGlzLl9sZW5ndGhCdWZmZXIgPSBuZXcgVWludDhBcnJheSgwKVxuICAgICAgICAgICAgICB0aGlzLl9idWZmZXJTdGF0ZSA9IEJVRkZFUl9TVEFURV9QT1NTSUJMWV9MSVRFUkFMX0xFTkdUSF8xXG4gICAgICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gZmluZCBlbmQgb2YgY29tbWFuZFxuICAgICAgICAgIGNvbnN0IExGaWR4ID0gYnVmLmluZGV4T2YoTElORV9GRUVELCBpKVxuICAgICAgICAgIGlmIChMRmlkeCA+IC0xKSB7XG4gICAgICAgICAgICBpZiAoTEZpZHggPCBidWYubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICB0aGlzLl9pbmNvbWluZ0J1ZmZlcnNbdGhpcy5faW5jb21pbmdCdWZmZXJzLmxlbmd0aCAtIDFdID0gbmV3IFVpbnQ4QXJyYXkoYnVmLmJ1ZmZlciwgMCwgTEZpZHggKyAxKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgY29tbWFuZExlbmd0aCA9IHRoaXMuX2luY29taW5nQnVmZmVycy5yZWR1Y2UoKHByZXYsIGN1cnIpID0+IHByZXYgKyBjdXJyLmxlbmd0aCwgMCkgLSAyIC8vIDIgZm9yIENSTEZcbiAgICAgICAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgVWludDhBcnJheShjb21tYW5kTGVuZ3RoKVxuICAgICAgICAgICAgbGV0IGluZGV4ID0gMFxuICAgICAgICAgICAgd2hpbGUgKHRoaXMuX2luY29taW5nQnVmZmVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgIGxldCB1aW50OEFycmF5ID0gdGhpcy5faW5jb21pbmdCdWZmZXJzLnNoaWZ0KClcblxuICAgICAgICAgICAgICBjb25zdCByZW1haW5pbmdMZW5ndGggPSBjb21tYW5kTGVuZ3RoIC0gaW5kZXhcbiAgICAgICAgICAgICAgaWYgKHVpbnQ4QXJyYXkubGVuZ3RoID4gcmVtYWluaW5nTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZXhjZXNzTGVuZ3RoID0gdWludDhBcnJheS5sZW5ndGggLSByZW1haW5pbmdMZW5ndGhcbiAgICAgICAgICAgICAgICB1aW50OEFycmF5ID0gdWludDhBcnJheS5zdWJhcnJheSgwLCAtZXhjZXNzTGVuZ3RoKVxuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2luY29taW5nQnVmZmVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICB0aGlzLl9pbmNvbWluZ0J1ZmZlcnMgPSBbXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb21tYW5kLnNldCh1aW50OEFycmF5LCBpbmRleClcbiAgICAgICAgICAgICAgaW5kZXggKz0gdWludDhBcnJheS5sZW5ndGhcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHlpZWxkIGNvbW1hbmRcbiAgICAgICAgICAgIGlmIChMRmlkeCA8IGJ1Zi5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGJ1Zi5zdWJhcnJheShMRmlkeCArIDEpKVxuICAgICAgICAgICAgICB0aGlzLl9pbmNvbWluZ0J1ZmZlcnMucHVzaChidWYpXG4gICAgICAgICAgICAgIGkgPSAwXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBjbGVhciB0aGUgdGltZW91dCB3aGVuIGFuIGVudGlyZSBjb21tYW5kIGhhcyBhcnJpdmVkXG4gICAgICAgICAgICAgIC8vIGFuZCBub3Qgd2FpdGluZyBvbiBtb3JlIGRhdGEgZm9yIG5leHQgY29tbWFuZFxuICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5fc29ja2V0VGltZW91dFRpbWVyKVxuICAgICAgICAgICAgICB0aGlzLl9zb2NrZXRUaW1lb3V0VGltZXIgPSBudWxsXG4gICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gUFJJVkFURSBNRVRIT0RTXG5cbiAgLyoqXG4gICAqIFByb2Nlc3NlcyBhIGNvbW1hbmQgZnJvbSB0aGUgcXVldWUuIFRoZSBjb21tYW5kIGlzIHBhcnNlZCBhbmQgZmVlZGVkIHRvIGEgaGFuZGxlclxuICAgKi9cbiAgX3BhcnNlSW5jb21pbmdDb21tYW5kcyAoY29tbWFuZHMpIHtcbiAgICBmb3IgKHZhciBjb21tYW5kIG9mIGNvbW1hbmRzKSB7XG4gICAgICB0aGlzLl9jbGVhcklkbGUoKVxuXG4gICAgICAvKlxuICAgICAgICogVGhlIFwiK1wiLXRhZ2dlZCByZXNwb25zZSBpcyBhIHNwZWNpYWwgY2FzZTpcbiAgICAgICAqIEVpdGhlciB0aGUgc2VydmVyIGNhbiBhc2tzIGZvciB0aGUgbmV4dCBjaHVuayBvZiBkYXRhLCBlLmcuIGZvciB0aGUgQVVUSEVOVElDQVRFIGNvbW1hbmQuXG4gICAgICAgKlxuICAgICAgICogT3IgdGhlcmUgd2FzIGFuIGVycm9yIGluIHRoZSBYT0FVVEgyIGF1dGhlbnRpY2F0aW9uLCBmb3Igd2hpY2ggU0FTTCBpbml0aWFsIGNsaWVudCByZXNwb25zZSBleHRlbnNpb25cbiAgICAgICAqIGRpY3RhdGVzIHRoZSBjbGllbnQgc2VuZHMgYW4gZW1wdHkgRU9MIHJlc3BvbnNlIHRvIHRoZSBjaGFsbGVuZ2UgY29udGFpbmluZyB0aGUgZXJyb3IgbWVzc2FnZS5cbiAgICAgICAqXG4gICAgICAgKiBEZXRhaWxzIG9uIFwiK1wiLXRhZ2dlZCByZXNwb25zZTpcbiAgICAgICAqICAgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM1MDEjc2VjdGlvbi0yLjIuMVxuICAgICAgICovXG4gICAgICAvL1xuICAgICAgaWYgKGNvbW1hbmRbMF0gPT09IEFTQ0lJX1BMVVMpIHtcbiAgICAgICAgaWYgKHRoaXMuX2N1cnJlbnRDb21tYW5kLmRhdGEubGVuZ3RoKSB7XG4gICAgICAgICAgLy8gZmVlZCB0aGUgbmV4dCBjaHVuayBvZiBkYXRhXG4gICAgICAgICAgdmFyIGNodW5rID0gdGhpcy5fY3VycmVudENvbW1hbmQuZGF0YS5zaGlmdCgpXG4gICAgICAgICAgY2h1bmsgKz0gKCF0aGlzLl9jdXJyZW50Q29tbWFuZC5kYXRhLmxlbmd0aCA/IEVPTCA6ICcnKSAvLyBFT0wgaWYgdGhlcmUncyBub3RoaW5nIG1vcmUgdG8gc2VuZFxuICAgICAgICAgIHRoaXMuc2VuZChjaHVuaylcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9jdXJyZW50Q29tbWFuZC5lcnJvclJlc3BvbnNlRXhwZWN0c0VtcHR5TGluZSkge1xuICAgICAgICAgIHRoaXMuc2VuZChFT0wpIC8vIFhPQVVUSDIgZW1wdHkgcmVzcG9uc2UsIGVycm9yIHdpbGwgYmUgcmVwb3J0ZWQgd2hlbiBzZXJ2ZXIgY29udGludWVzIHdpdGggTk8gcmVzcG9uc2VcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICB2YXIgcmVzcG9uc2VcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHZhbHVlQXNTdHJpbmcgPSB0aGlzLl9jdXJyZW50Q29tbWFuZC5yZXF1ZXN0ICYmIHRoaXMuX2N1cnJlbnRDb21tYW5kLnJlcXVlc3QudmFsdWVBc1N0cmluZ1xuICAgICAgICByZXNwb25zZSA9IHBhcnNlcihjb21tYW5kLCB7IHZhbHVlQXNTdHJpbmcgfSlcbiAgICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ1M6JywgKCkgPT4gY29tcGlsZXIocmVzcG9uc2UsIGZhbHNlLCB0cnVlKSlcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ0Vycm9yIHBhcnNpbmcgaW1hcCBjb21tYW5kIScsIHJlc3BvbnNlKVxuICAgICAgICByZXR1cm4gdGhpcy5fb25FcnJvcihlKVxuICAgICAgfVxuXG4gICAgICB0aGlzLl9wcm9jZXNzUmVzcG9uc2UocmVzcG9uc2UpXG4gICAgICB0aGlzLl9oYW5kbGVSZXNwb25zZShyZXNwb25zZSlcblxuICAgICAgLy8gZmlyc3QgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLCBjb25uZWN0aW9uIGlzIG5vdyB1c2FibGVcbiAgICAgIGlmICghdGhpcy5fY29ubmVjdGlvblJlYWR5KSB7XG4gICAgICAgIHRoaXMuX2Nvbm5lY3Rpb25SZWFkeSA9IHRydWVcbiAgICAgICAgdGhpcy5vbnJlYWR5ICYmIHRoaXMub25yZWFkeSgpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEZlZWRzIGEgcGFyc2VkIHJlc3BvbnNlIG9iamVjdCB0byBhbiBhcHByb3ByaWF0ZSBoYW5kbGVyXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSBQYXJzZWQgY29tbWFuZCBvYmplY3RcbiAgICovXG4gIF9oYW5kbGVSZXNwb25zZSAocmVzcG9uc2UpIHtcbiAgICB2YXIgY29tbWFuZCA9IHByb3BPcignJywgJ2NvbW1hbmQnLCByZXNwb25zZSkudG9VcHBlckNhc2UoKS50cmltKClcblxuICAgIGlmICghdGhpcy5fY3VycmVudENvbW1hbmQpIHtcbiAgICAgIC8vIHVuc29saWNpdGVkIHVudGFnZ2VkIHJlc3BvbnNlXG4gICAgICBpZiAocmVzcG9uc2UudGFnID09PSAnKicgJiYgY29tbWFuZCBpbiB0aGlzLl9nbG9iYWxBY2NlcHRVbnRhZ2dlZCkge1xuICAgICAgICB0aGlzLl9nbG9iYWxBY2NlcHRVbnRhZ2dlZFtjb21tYW5kXShyZXNwb25zZSlcbiAgICAgICAgdGhpcy5fY2FuU2VuZCA9IHRydWVcbiAgICAgICAgdGhpcy5fc2VuZFJlcXVlc3QoKVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGhpcy5fY3VycmVudENvbW1hbmQucGF5bG9hZCAmJiByZXNwb25zZS50YWcgPT09ICcqJyAmJiBjb21tYW5kIGluIHRoaXMuX2N1cnJlbnRDb21tYW5kLnBheWxvYWQpIHtcbiAgICAgIC8vIGV4cGVjdGVkIHVudGFnZ2VkIHJlc3BvbnNlXG4gICAgICB0aGlzLl9jdXJyZW50Q29tbWFuZC5wYXlsb2FkW2NvbW1hbmRdLnB1c2gocmVzcG9uc2UpXG4gICAgfSBlbHNlIGlmIChyZXNwb25zZS50YWcgPT09ICcqJyAmJiBjb21tYW5kIGluIHRoaXMuX2dsb2JhbEFjY2VwdFVudGFnZ2VkKSB7XG4gICAgICAvLyB1bmV4cGVjdGVkIHVudGFnZ2VkIHJlc3BvbnNlXG4gICAgICB0aGlzLl9nbG9iYWxBY2NlcHRVbnRhZ2dlZFtjb21tYW5kXShyZXNwb25zZSlcbiAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLnRhZyA9PT0gdGhpcy5fY3VycmVudENvbW1hbmQudGFnKSB7XG4gICAgICAvLyB0YWdnZWQgcmVzcG9uc2VcbiAgICAgIGlmICh0aGlzLl9jdXJyZW50Q29tbWFuZC5wYXlsb2FkICYmIE9iamVjdC5rZXlzKHRoaXMuX2N1cnJlbnRDb21tYW5kLnBheWxvYWQpLmxlbmd0aCkge1xuICAgICAgICByZXNwb25zZS5wYXlsb2FkID0gdGhpcy5fY3VycmVudENvbW1hbmQucGF5bG9hZFxuICAgICAgfVxuICAgICAgdGhpcy5fY3VycmVudENvbW1hbmQuY2FsbGJhY2socmVzcG9uc2UpXG4gICAgICB0aGlzLl9jYW5TZW5kID0gdHJ1ZVxuICAgICAgdGhpcy5fc2VuZFJlcXVlc3QoKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kcyBhIGNvbW1hbmQgZnJvbSBjbGllbnQgcXVldWUgdG8gdGhlIHNlcnZlci5cbiAgICovXG4gIF9zZW5kUmVxdWVzdCAoKSB7XG4gICAgaWYgKCF0aGlzLl9jbGllbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB0aGlzLl9lbnRlcklkbGUoKVxuICAgIH1cbiAgICB0aGlzLl9jbGVhcklkbGUoKVxuXG4gICAgLy8gYW4gb3BlcmF0aW9uIHdhcyBtYWRlIGluIHRoZSBwcmVjaGVjaywgbm8gbmVlZCB0byByZXN0YXJ0IHRoZSBxdWV1ZSBtYW51YWxseVxuICAgIHRoaXMuX3Jlc3RhcnRRdWV1ZSA9IGZhbHNlXG5cbiAgICB2YXIgY29tbWFuZCA9IHRoaXMuX2NsaWVudFF1ZXVlWzBdXG4gICAgaWYgKHR5cGVvZiBjb21tYW5kLnByZWNoZWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAvLyByZW1lbWJlciB0aGUgY29udGV4dFxuICAgICAgdmFyIGNvbnRleHQgPSBjb21tYW5kXG4gICAgICB2YXIgcHJlY2hlY2sgPSBjb250ZXh0LnByZWNoZWNrXG4gICAgICBkZWxldGUgY29udGV4dC5wcmVjaGVja1xuXG4gICAgICAvLyB3ZSBuZWVkIHRvIHJlc3RhcnQgdGhlIHF1ZXVlIGhhbmRsaW5nIGlmIG5vIG9wZXJhdGlvbiB3YXMgbWFkZSBpbiB0aGUgcHJlY2hlY2tcbiAgICAgIHRoaXMuX3Jlc3RhcnRRdWV1ZSA9IHRydWVcblxuICAgICAgLy8gaW52b2tlIHRoZSBwcmVjaGVjayBjb21tYW5kIGFuZCByZXN1bWUgbm9ybWFsIG9wZXJhdGlvbiBhZnRlciB0aGUgcHJvbWlzZSByZXNvbHZlc1xuICAgICAgcHJlY2hlY2soY29udGV4dCkudGhlbigoKSA9PiB7XG4gICAgICAgIC8vIHdlJ3JlIGRvbmUgd2l0aCB0aGUgcHJlY2hlY2tcbiAgICAgICAgaWYgKHRoaXMuX3Jlc3RhcnRRdWV1ZSkge1xuICAgICAgICAgIC8vIHdlIG5lZWQgdG8gcmVzdGFydCB0aGUgcXVldWUgaGFuZGxpbmdcbiAgICAgICAgICB0aGlzLl9zZW5kUmVxdWVzdCgpXG4gICAgICAgIH1cbiAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgLy8gcHJlY2hlY2sgZmFpbGVkLCBzbyB3ZSByZW1vdmUgdGhlIGluaXRpYWwgY29tbWFuZFxuICAgICAgICAvLyBmcm9tIHRoZSBxdWV1ZSwgaW52b2tlIGl0cyBjYWxsYmFjayBhbmQgcmVzdW1lIG5vcm1hbCBvcGVyYXRpb25cbiAgICAgICAgbGV0IGNtZFxuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuX2NsaWVudFF1ZXVlLmluZGV4T2YoY29udGV4dClcbiAgICAgICAgaWYgKGluZGV4ID49IDApIHtcbiAgICAgICAgICBjbWQgPSB0aGlzLl9jbGllbnRRdWV1ZS5zcGxpY2UoaW5kZXgsIDEpWzBdXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNtZCAmJiBjbWQuY2FsbGJhY2spIHtcbiAgICAgICAgICBjbWQuY2FsbGJhY2soZXJyKVxuICAgICAgICAgIHRoaXMuX2NhblNlbmQgPSB0cnVlXG4gICAgICAgICAgdGhpcy5fcGFyc2VJbmNvbWluZ0NvbW1hbmRzKHRoaXMuX2l0ZXJhdGVJbmNvbWluZ0J1ZmZlcigpKSAvLyBDb25zdW1lIHRoZSByZXN0IG9mIHRoZSBpbmNvbWluZyBidWZmZXJcbiAgICAgICAgICB0aGlzLl9zZW5kUmVxdWVzdCgpIC8vIGNvbnRpbnVlIHNlbmRpbmdcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMuX2NhblNlbmQgPSBmYWxzZVxuICAgIHRoaXMuX2N1cnJlbnRDb21tYW5kID0gdGhpcy5fY2xpZW50UXVldWUuc2hpZnQoKVxuXG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuX2N1cnJlbnRDb21tYW5kLmRhdGEgPSBjb21waWxlcih0aGlzLl9jdXJyZW50Q29tbWFuZC5yZXF1ZXN0LCB0cnVlKVxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ0M6JywgKCkgPT4gY29tcGlsZXIodGhpcy5fY3VycmVudENvbW1hbmQucmVxdWVzdCwgZmFsc2UsIHRydWUpKSAvLyBleGNsdWRlcyBwYXNzd29yZHMgZXRjLlxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdFcnJvciBjb21waWxpbmcgaW1hcCBjb21tYW5kIScsIHRoaXMuX2N1cnJlbnRDb21tYW5kLnJlcXVlc3QpXG4gICAgICByZXR1cm4gdGhpcy5fb25FcnJvcihuZXcgRXJyb3IoJ0Vycm9yIGNvbXBpbGluZyBpbWFwIGNvbW1hbmQhJykpXG4gICAgfVxuXG4gICAgdmFyIGRhdGEgPSB0aGlzLl9jdXJyZW50Q29tbWFuZC5kYXRhLnNoaWZ0KClcblxuICAgIHRoaXMuc2VuZChkYXRhICsgKCF0aGlzLl9jdXJyZW50Q29tbWFuZC5kYXRhLmxlbmd0aCA/IEVPTCA6ICcnKSlcbiAgICByZXR1cm4gdGhpcy53YWl0RHJhaW5cbiAgfVxuXG4gIC8qKlxuICAgKiBFbWl0cyBvbmlkbGUsIG5vdGluZyB0byBkbyBjdXJyZW50bHlcbiAgICovXG4gIF9lbnRlcklkbGUgKCkge1xuICAgIGNsZWFyVGltZW91dCh0aGlzLl9pZGxlVGltZXIpXG4gICAgdGhpcy5faWRsZVRpbWVyID0gc2V0VGltZW91dCgoKSA9PiAodGhpcy5vbmlkbGUgJiYgdGhpcy5vbmlkbGUoKSksIHRoaXMudGltZW91dEVudGVySWRsZSlcbiAgfVxuXG4gIC8qKlxuICAgKiBDYW5jZWwgaWRsZSB0aW1lclxuICAgKi9cbiAgX2NsZWFySWRsZSAoKSB7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX2lkbGVUaW1lcilcbiAgICB0aGlzLl9pZGxlVGltZXIgPSBudWxsXG4gIH1cblxuICAvKipcbiAgICogTWV0aG9kIHByb2Nlc3NlcyBhIHJlc3BvbnNlIGludG8gYW4gZWFzaWVyIHRvIGhhbmRsZSBmb3JtYXQuXG4gICAqIEFkZCB1bnRhZ2dlZCBudW1iZXJlZCByZXNwb25zZXMgKGUuZy4gRkVUQ0gpIGludG8gYSBuaWNlbHkgZmVhc2libGUgZm9ybVxuICAgKiBDaGVja3MgaWYgYSByZXNwb25zZSBpbmNsdWRlcyBvcHRpb25hbCByZXNwb25zZSBjb2Rlc1xuICAgKiBhbmQgY29waWVzIHRoZXNlIGludG8gc2VwYXJhdGUgcHJvcGVydGllcy4gRm9yIGV4YW1wbGUgdGhlXG4gICAqIGZvbGxvd2luZyByZXNwb25zZSBpbmNsdWRlcyBhIGNhcGFiaWxpdHkgbGlzdGluZyBhbmQgYSBodW1hblxuICAgKiByZWFkYWJsZSBtZXNzYWdlOlxuICAgKlxuICAgKiAgICAgKiBPSyBbQ0FQQUJJTElUWSBJRCBOQU1FU1BBQ0VdIEFsbCByZWFkeVxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBhZGRzIGEgJ2NhcGFiaWxpdHknIHByb3BlcnR5IHdpdGggYW4gYXJyYXkgdmFsdWUgWydJRCcsICdOQU1FU1BBQ0UnXVxuICAgKiB0byB0aGUgcmVzcG9uc2Ugb2JqZWN0LiBBZGRpdGlvbmFsbHkgJ0FsbCByZWFkeScgaXMgYWRkZWQgYXMgJ2h1bWFuUmVhZGFibGUnIHByb3BlcnR5LlxuICAgKlxuICAgKiBTZWUgcG9zc2libGVtIElNQVAgUmVzcG9uc2UgQ29kZXMgYXQgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzU1MzBcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIFBhcnNlZCByZXNwb25zZSBvYmplY3RcbiAgICovXG4gIF9wcm9jZXNzUmVzcG9uc2UgKHJlc3BvbnNlKSB7XG4gICAgbGV0IGNvbW1hbmQgPSBwcm9wT3IoJycsICdjb21tYW5kJywgcmVzcG9uc2UpLnRvVXBwZXJDYXNlKCkudHJpbSgpXG5cbiAgICAvLyBubyBhdHRyaWJ1dGVzXG4gICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UuYXR0cmlidXRlcyB8fCAhcmVzcG9uc2UuYXR0cmlidXRlcy5sZW5ndGgpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIHVudGFnZ2VkIHJlc3BvbnNlcyB3LyBzZXF1ZW5jZSBudW1iZXJzXG4gICAgaWYgKHJlc3BvbnNlLnRhZyA9PT0gJyonICYmIC9eXFxkKyQvLnRlc3QocmVzcG9uc2UuY29tbWFuZCkgJiYgcmVzcG9uc2UuYXR0cmlidXRlc1swXS50eXBlID09PSAnQVRPTScpIHtcbiAgICAgIHJlc3BvbnNlLm5yID0gTnVtYmVyKHJlc3BvbnNlLmNvbW1hbmQpXG4gICAgICByZXNwb25zZS5jb21tYW5kID0gKHJlc3BvbnNlLmF0dHJpYnV0ZXMuc2hpZnQoKS52YWx1ZSB8fCAnJykudG9TdHJpbmcoKS50b1VwcGVyQ2FzZSgpLnRyaW0oKVxuICAgIH1cblxuICAgIC8vIG5vIG9wdGlvbmFsIHJlc3BvbnNlIGNvZGVcbiAgICBpZiAoWydPSycsICdOTycsICdCQUQnLCAnQllFJywgJ1BSRUFVVEgnXS5pbmRleE9mKGNvbW1hbmQpIDwgMCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gSWYgbGFzdCBlbGVtZW50IG9mIHRoZSByZXNwb25zZSBpcyBURVhUIHRoZW4gdGhpcyBpcyBmb3IgaHVtYW5zXG4gICAgaWYgKHJlc3BvbnNlLmF0dHJpYnV0ZXNbcmVzcG9uc2UuYXR0cmlidXRlcy5sZW5ndGggLSAxXS50eXBlID09PSAnVEVYVCcpIHtcbiAgICAgIHJlc3BvbnNlLmh1bWFuUmVhZGFibGUgPSByZXNwb25zZS5hdHRyaWJ1dGVzW3Jlc3BvbnNlLmF0dHJpYnV0ZXMubGVuZ3RoIC0gMV0udmFsdWVcbiAgICB9XG5cbiAgICAvLyBQYXJzZSBhbmQgZm9ybWF0IEFUT00gdmFsdWVzXG4gICAgaWYgKHJlc3BvbnNlLmF0dHJpYnV0ZXNbMF0udHlwZSA9PT0gJ0FUT00nICYmIHJlc3BvbnNlLmF0dHJpYnV0ZXNbMF0uc2VjdGlvbikge1xuICAgICAgY29uc3Qgb3B0aW9uID0gcmVzcG9uc2UuYXR0cmlidXRlc1swXS5zZWN0aW9uLm1hcCgoa2V5KSA9PiB7XG4gICAgICAgIGlmICgha2V5KSB7XG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoa2V5KSkge1xuICAgICAgICAgIHJldHVybiBrZXkubWFwKChrZXkpID0+IChrZXkudmFsdWUgfHwgJycpLnRvU3RyaW5nKCkudHJpbSgpKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiAoa2V5LnZhbHVlIHx8ICcnKS50b1N0cmluZygpLnRvVXBwZXJDYXNlKCkudHJpbSgpXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIGNvbnN0IGtleSA9IG9wdGlvbi5zaGlmdCgpXG4gICAgICByZXNwb25zZS5jb2RlID0ga2V5XG5cbiAgICAgIGlmIChvcHRpb24ubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHJlc3BvbnNlW2tleS50b0xvd2VyQ2FzZSgpXSA9IG9wdGlvblswXVxuICAgICAgfSBlbHNlIGlmIChvcHRpb24ubGVuZ3RoID4gMSkge1xuICAgICAgICByZXNwb25zZVtrZXkudG9Mb3dlckNhc2UoKV0gPSBvcHRpb25cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIGEgdmFsdWUgaXMgYW4gRXJyb3Igb2JqZWN0XG4gICAqXG4gICAqIEBwYXJhbSB7TWl4ZWR9IHZhbHVlIFZhbHVlIHRvIGJlIGNoZWNrZWRcbiAgICogQHJldHVybiB7Qm9vbGVhbn0gcmV0dXJucyB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBhbiBFcnJvclxuICAgKi9cbiAgaXNFcnJvciAodmFsdWUpIHtcbiAgICByZXR1cm4gISFPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLm1hdGNoKC9FcnJvclxcXSQvKVxuICB9XG5cbiAgLy8gQ09NUFJFU1NJT04gUkVMQVRFRCBNRVRIT0RTXG5cbiAgLyoqXG4gICAqIFNldHMgdXAgZGVmbGF0ZS9pbmZsYXRlIGZvciB0aGUgSU9cbiAgICovXG4gIGVuYWJsZUNvbXByZXNzaW9uICgpIHtcbiAgICB0aGlzLl9zb2NrZXRPbkRhdGEgPSB0aGlzLnNvY2tldC5vbmRhdGFcbiAgICB0aGlzLmNvbXByZXNzZWQgPSB0cnVlXG5cbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93Lldvcmtlcikge1xuICAgICAgdGhpcy5fY29tcHJlc3Npb25Xb3JrZXIgPSBuZXcgV29ya2VyKFVSTC5jcmVhdGVPYmplY3RVUkwobmV3IEJsb2IoW0NvbXByZXNzaW9uQmxvYl0pKSlcbiAgICAgIHRoaXMuX2NvbXByZXNzaW9uV29ya2VyLm9ubWVzc2FnZSA9IChlKSA9PiB7XG4gICAgICAgIHZhciBtZXNzYWdlID0gZS5kYXRhLm1lc3NhZ2VcbiAgICAgICAgdmFyIGRhdGEgPSBlLmRhdGEuYnVmZmVyXG5cbiAgICAgICAgc3dpdGNoIChtZXNzYWdlKSB7XG4gICAgICAgICAgY2FzZSBNRVNTQUdFX0lORkxBVEVEX0RBVEFfUkVBRFk6XG4gICAgICAgICAgICB0aGlzLl9zb2NrZXRPbkRhdGEoeyBkYXRhIH0pXG4gICAgICAgICAgICBicmVha1xuXG4gICAgICAgICAgY2FzZSBNRVNTQUdFX0RFRkxBVEVEX0RBVEFfUkVBRFk6XG4gICAgICAgICAgICB0aGlzLndhaXREcmFpbiA9IHRoaXMuc29ja2V0LnNlbmQoZGF0YSlcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5fY29tcHJlc3Npb25Xb3JrZXIub25lcnJvciA9IChlKSA9PiB7XG4gICAgICAgIHRoaXMuX29uRXJyb3IobmV3IEVycm9yKCdFcnJvciBoYW5kbGluZyBjb21wcmVzc2lvbiB3ZWIgd29ya2VyOiAnICsgZS5tZXNzYWdlKSlcbiAgICAgIH1cblxuICAgICAgdGhpcy5fY29tcHJlc3Npb25Xb3JrZXIucG9zdE1lc3NhZ2UoY3JlYXRlTWVzc2FnZShNRVNTQUdFX0lOSVRJQUxJWkVfV09SS0VSKSlcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgaW5mbGF0ZWRSZWFkeSA9IChidWZmZXIpID0+IHsgdGhpcy5fc29ja2V0T25EYXRhKHsgZGF0YTogYnVmZmVyIH0pIH1cbiAgICAgIGNvbnN0IGRlZmxhdGVkUmVhZHkgPSAoYnVmZmVyKSA9PiB7IHRoaXMud2FpdERyYWluID0gdGhpcy5zb2NrZXQuc2VuZChidWZmZXIpIH1cbiAgICAgIHRoaXMuX2NvbXByZXNzaW9uID0gbmV3IENvbXByZXNzaW9uKGluZmxhdGVkUmVhZHksIGRlZmxhdGVkUmVhZHkpXG4gICAgfVxuXG4gICAgLy8gb3ZlcnJpZGUgZGF0YSBoYW5kbGVyLCBkZWNvbXByZXNzIGluY29taW5nIGRhdGFcbiAgICB0aGlzLnNvY2tldC5vbmRhdGEgPSAoZXZ0KSA9PiB7XG4gICAgICBpZiAoIXRoaXMuY29tcHJlc3NlZCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2NvbXByZXNzaW9uV29ya2VyKSB7XG4gICAgICAgIHRoaXMuX2NvbXByZXNzaW9uV29ya2VyLnBvc3RNZXNzYWdlKGNyZWF0ZU1lc3NhZ2UoTUVTU0FHRV9JTkZMQVRFLCBldnQuZGF0YSksIFtldnQuZGF0YV0pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9jb21wcmVzc2lvbi5pbmZsYXRlKGV2dC5kYXRhKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBVbmRvZXMgYW55IGNoYW5nZXMgcmVsYXRlZCB0byBjb21wcmVzc2lvbi4gVGhpcyBvbmx5IGJlIGNhbGxlZCB3aGVuIGNsb3NpbmcgdGhlIGNvbm5lY3Rpb25cbiAgICovXG4gIF9kaXNhYmxlQ29tcHJlc3Npb24gKCkge1xuICAgIGlmICghdGhpcy5jb21wcmVzc2VkKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB0aGlzLmNvbXByZXNzZWQgPSBmYWxzZVxuICAgIHRoaXMuc29ja2V0Lm9uZGF0YSA9IHRoaXMuX3NvY2tldE9uRGF0YVxuICAgIHRoaXMuX3NvY2tldE9uRGF0YSA9IG51bGxcblxuICAgIGlmICh0aGlzLl9jb21wcmVzc2lvbldvcmtlcikge1xuICAgICAgLy8gdGVybWluYXRlIHRoZSB3b3JrZXJcbiAgICAgIHRoaXMuX2NvbXByZXNzaW9uV29ya2VyLnRlcm1pbmF0ZSgpXG4gICAgICB0aGlzLl9jb21wcmVzc2lvbldvcmtlciA9IG51bGxcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogT3V0Z29pbmcgcGF5bG9hZCBuZWVkcyB0byBiZSBjb21wcmVzc2VkIGFuZCBzZW50IHRvIHNvY2tldFxuICAgKlxuICAgKiBAcGFyYW0ge0FycmF5QnVmZmVyfSBidWZmZXIgT3V0Z29pbmcgdW5jb21wcmVzc2VkIGFycmF5YnVmZmVyXG4gICAqL1xuICBfc2VuZENvbXByZXNzZWQgKGJ1ZmZlcikge1xuICAgIC8vIGRlZmxhdGVcbiAgICBpZiAodGhpcy5fY29tcHJlc3Npb25Xb3JrZXIpIHtcbiAgICAgIHRoaXMuX2NvbXByZXNzaW9uV29ya2VyLnBvc3RNZXNzYWdlKGNyZWF0ZU1lc3NhZ2UoTUVTU0FHRV9ERUZMQVRFLCBidWZmZXIpLCBbYnVmZmVyXSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fY29tcHJlc3Npb24uZGVmbGF0ZShidWZmZXIpXG4gICAgfVxuICB9XG59XG5cbmNvbnN0IGNyZWF0ZU1lc3NhZ2UgPSAobWVzc2FnZSwgYnVmZmVyKSA9PiAoeyBtZXNzYWdlLCBidWZmZXIgfSlcbiJdfQ==