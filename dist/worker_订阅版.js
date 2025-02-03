var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// (disabled):crypto
var require_crypto = __commonJS({
  "(disabled):crypto"() {
  }
});

// (disabled):buffer
var require_buffer = __commonJS({
  "(disabled):buffer"() {
  }
});

// node_modules/js-sha256/src/sha256.js
var require_sha256 = __commonJS({
  "node_modules/js-sha256/src/sha256.js"(exports, module) {
    (function() {
      "use strict";
      var ERROR = "input is invalid type";
      var WINDOW = typeof window === "object";
      var root = WINDOW ? window : {};
      if (root.JS_SHA256_NO_WINDOW) {
        WINDOW = false;
      }
      var WEB_WORKER = !WINDOW && typeof self === "object";
      var NODE_JS = !root.JS_SHA256_NO_NODE_JS && typeof process === "object" && process.versions && process.versions.node;
      if (NODE_JS) {
        root = global;
      } else if (WEB_WORKER) {
        root = self;
      }
      var COMMON_JS = !root.JS_SHA256_NO_COMMON_JS && typeof module === "object" && module.exports;
      var AMD = typeof define === "function" && define.amd;
      var ARRAY_BUFFER = !root.JS_SHA256_NO_ARRAY_BUFFER && typeof ArrayBuffer !== "undefined";
      var HEX_CHARS = "0123456789abcdef".split("");
      var EXTRA = [-2147483648, 8388608, 32768, 128];
      var SHIFT = [24, 16, 8, 0];
      var K = [
        1116352408,
        1899447441,
        3049323471,
        3921009573,
        961987163,
        1508970993,
        2453635748,
        2870763221,
        3624381080,
        310598401,
        607225278,
        1426881987,
        1925078388,
        2162078206,
        2614888103,
        3248222580,
        3835390401,
        4022224774,
        264347078,
        604807628,
        770255983,
        1249150122,
        1555081692,
        1996064986,
        2554220882,
        2821834349,
        2952996808,
        3210313671,
        3336571891,
        3584528711,
        113926993,
        338241895,
        666307205,
        773529912,
        1294757372,
        1396182291,
        1695183700,
        1986661051,
        2177026350,
        2456956037,
        2730485921,
        2820302411,
        3259730800,
        3345764771,
        3516065817,
        3600352804,
        4094571909,
        275423344,
        430227734,
        506948616,
        659060556,
        883997877,
        958139571,
        1322822218,
        1537002063,
        1747873779,
        1955562222,
        2024104815,
        2227730452,
        2361852424,
        2428436474,
        2756734187,
        3204031479,
        3329325298
      ];
      var OUTPUT_TYPES = ["hex", "array", "digest", "arrayBuffer"];
      var blocks = [];
      if (root.JS_SHA256_NO_NODE_JS || !Array.isArray) {
        Array.isArray = function(obj) {
          return Object.prototype.toString.call(obj) === "[object Array]";
        };
      }
      if (ARRAY_BUFFER && (root.JS_SHA256_NO_ARRAY_BUFFER_IS_VIEW || !ArrayBuffer.isView)) {
        ArrayBuffer.isView = function(obj) {
          return typeof obj === "object" && obj.buffer && obj.buffer.constructor === ArrayBuffer;
        };
      }
      var createOutputMethod = function(outputType, is224) {
        return function(message) {
          return new Sha256(is224, true).update(message)[outputType]();
        };
      };
      var createMethod = function(is224) {
        var method = createOutputMethod("hex", is224);
        if (NODE_JS) {
          method = nodeWrap(method, is224);
        }
        method.create = function() {
          return new Sha256(is224);
        };
        method.update = function(message) {
          return method.create().update(message);
        };
        for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
          var type = OUTPUT_TYPES[i];
          method[type] = createOutputMethod(type, is224);
        }
        return method;
      };
      var nodeWrap = function(method, is224) {
        var crypto = require_crypto();
        var Buffer2 = require_buffer().Buffer;
        var algorithm = is224 ? "sha224" : "sha256";
        var bufferFrom;
        if (Buffer2.from && !root.JS_SHA256_NO_BUFFER_FROM) {
          bufferFrom = Buffer2.from;
        } else {
          bufferFrom = function(message) {
            return new Buffer2(message);
          };
        }
        var nodeMethod = function(message) {
          if (typeof message === "string") {
            return crypto.createHash(algorithm).update(message, "utf8").digest("hex");
          } else {
            if (message === null || message === void 0) {
              throw new Error(ERROR);
            } else if (message.constructor === ArrayBuffer) {
              message = new Uint8Array(message);
            }
          }
          if (Array.isArray(message) || ArrayBuffer.isView(message) || message.constructor === Buffer2) {
            return crypto.createHash(algorithm).update(bufferFrom(message)).digest("hex");
          } else {
            return method(message);
          }
        };
        return nodeMethod;
      };
      var createHmacOutputMethod = function(outputType, is224) {
        return function(key, message) {
          return new HmacSha256(key, is224, true).update(message)[outputType]();
        };
      };
      var createHmacMethod = function(is224) {
        var method = createHmacOutputMethod("hex", is224);
        method.create = function(key) {
          return new HmacSha256(key, is224);
        };
        method.update = function(key, message) {
          return method.create(key).update(message);
        };
        for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
          var type = OUTPUT_TYPES[i];
          method[type] = createHmacOutputMethod(type, is224);
        }
        return method;
      };
      function Sha256(is224, sharedMemory) {
        if (sharedMemory) {
          blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
          this.blocks = blocks;
        } else {
          this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        }
        if (is224) {
          this.h0 = 3238371032;
          this.h1 = 914150663;
          this.h2 = 812702999;
          this.h3 = 4144912697;
          this.h4 = 4290775857;
          this.h5 = 1750603025;
          this.h6 = 1694076839;
          this.h7 = 3204075428;
        } else {
          this.h0 = 1779033703;
          this.h1 = 3144134277;
          this.h2 = 1013904242;
          this.h3 = 2773480762;
          this.h4 = 1359893119;
          this.h5 = 2600822924;
          this.h6 = 528734635;
          this.h7 = 1541459225;
        }
        this.block = this.start = this.bytes = this.hBytes = 0;
        this.finalized = this.hashed = false;
        this.first = true;
        this.is224 = is224;
      }
      Sha256.prototype.update = function(message) {
        if (this.finalized) {
          return;
        }
        var notString, type = typeof message;
        if (type !== "string") {
          if (type === "object") {
            if (message === null) {
              throw new Error(ERROR);
            } else if (ARRAY_BUFFER && message.constructor === ArrayBuffer) {
              message = new Uint8Array(message);
            } else if (!Array.isArray(message)) {
              if (!ARRAY_BUFFER || !ArrayBuffer.isView(message)) {
                throw new Error(ERROR);
              }
            }
          } else {
            throw new Error(ERROR);
          }
          notString = true;
        }
        var code, index = 0, i, length = message.length, blocks2 = this.blocks;
        while (index < length) {
          if (this.hashed) {
            this.hashed = false;
            blocks2[0] = this.block;
            this.block = blocks2[16] = blocks2[1] = blocks2[2] = blocks2[3] = blocks2[4] = blocks2[5] = blocks2[6] = blocks2[7] = blocks2[8] = blocks2[9] = blocks2[10] = blocks2[11] = blocks2[12] = blocks2[13] = blocks2[14] = blocks2[15] = 0;
          }
          if (notString) {
            for (i = this.start; index < length && i < 64; ++index) {
              blocks2[i >>> 2] |= message[index] << SHIFT[i++ & 3];
            }
          } else {
            for (i = this.start; index < length && i < 64; ++index) {
              code = message.charCodeAt(index);
              if (code < 128) {
                blocks2[i >>> 2] |= code << SHIFT[i++ & 3];
              } else if (code < 2048) {
                blocks2[i >>> 2] |= (192 | code >>> 6) << SHIFT[i++ & 3];
                blocks2[i >>> 2] |= (128 | code & 63) << SHIFT[i++ & 3];
              } else if (code < 55296 || code >= 57344) {
                blocks2[i >>> 2] |= (224 | code >>> 12) << SHIFT[i++ & 3];
                blocks2[i >>> 2] |= (128 | code >>> 6 & 63) << SHIFT[i++ & 3];
                blocks2[i >>> 2] |= (128 | code & 63) << SHIFT[i++ & 3];
              } else {
                code = 65536 + ((code & 1023) << 10 | message.charCodeAt(++index) & 1023);
                blocks2[i >>> 2] |= (240 | code >>> 18) << SHIFT[i++ & 3];
                blocks2[i >>> 2] |= (128 | code >>> 12 & 63) << SHIFT[i++ & 3];
                blocks2[i >>> 2] |= (128 | code >>> 6 & 63) << SHIFT[i++ & 3];
                blocks2[i >>> 2] |= (128 | code & 63) << SHIFT[i++ & 3];
              }
            }
          }
          this.lastByteIndex = i;
          this.bytes += i - this.start;
          if (i >= 64) {
            this.block = blocks2[16];
            this.start = i - 64;
            this.hash();
            this.hashed = true;
          } else {
            this.start = i;
          }
        }
        if (this.bytes > 4294967295) {
          this.hBytes += this.bytes / 4294967296 << 0;
          this.bytes = this.bytes % 4294967296;
        }
        return this;
      };
      Sha256.prototype.finalize = function() {
        if (this.finalized) {
          return;
        }
        this.finalized = true;
        var blocks2 = this.blocks, i = this.lastByteIndex;
        blocks2[16] = this.block;
        blocks2[i >>> 2] |= EXTRA[i & 3];
        this.block = blocks2[16];
        if (i >= 56) {
          if (!this.hashed) {
            this.hash();
          }
          blocks2[0] = this.block;
          blocks2[16] = blocks2[1] = blocks2[2] = blocks2[3] = blocks2[4] = blocks2[5] = blocks2[6] = blocks2[7] = blocks2[8] = blocks2[9] = blocks2[10] = blocks2[11] = blocks2[12] = blocks2[13] = blocks2[14] = blocks2[15] = 0;
        }
        blocks2[14] = this.hBytes << 3 | this.bytes >>> 29;
        blocks2[15] = this.bytes << 3;
        this.hash();
      };
      Sha256.prototype.hash = function() {
        var a = this.h0, b = this.h1, c = this.h2, d = this.h3, e = this.h4, f = this.h5, g = this.h6, h = this.h7, blocks2 = this.blocks, j, s0, s1, maj, t1, t2, ch, ab, da, cd, bc;
        for (j = 16; j < 64; ++j) {
          t1 = blocks2[j - 15];
          s0 = (t1 >>> 7 | t1 << 25) ^ (t1 >>> 18 | t1 << 14) ^ t1 >>> 3;
          t1 = blocks2[j - 2];
          s1 = (t1 >>> 17 | t1 << 15) ^ (t1 >>> 19 | t1 << 13) ^ t1 >>> 10;
          blocks2[j] = blocks2[j - 16] + s0 + blocks2[j - 7] + s1 << 0;
        }
        bc = b & c;
        for (j = 0; j < 64; j += 4) {
          if (this.first) {
            if (this.is224) {
              ab = 300032;
              t1 = blocks2[0] - 1413257819;
              h = t1 - 150054599 << 0;
              d = t1 + 24177077 << 0;
            } else {
              ab = 704751109;
              t1 = blocks2[0] - 210244248;
              h = t1 - 1521486534 << 0;
              d = t1 + 143694565 << 0;
            }
            this.first = false;
          } else {
            s0 = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10);
            s1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
            ab = a & b;
            maj = ab ^ a & c ^ bc;
            ch = e & f ^ ~e & g;
            t1 = h + s1 + ch + K[j] + blocks2[j];
            t2 = s0 + maj;
            h = d + t1 << 0;
            d = t1 + t2 << 0;
          }
          s0 = (d >>> 2 | d << 30) ^ (d >>> 13 | d << 19) ^ (d >>> 22 | d << 10);
          s1 = (h >>> 6 | h << 26) ^ (h >>> 11 | h << 21) ^ (h >>> 25 | h << 7);
          da = d & a;
          maj = da ^ d & b ^ ab;
          ch = h & e ^ ~h & f;
          t1 = g + s1 + ch + K[j + 1] + blocks2[j + 1];
          t2 = s0 + maj;
          g = c + t1 << 0;
          c = t1 + t2 << 0;
          s0 = (c >>> 2 | c << 30) ^ (c >>> 13 | c << 19) ^ (c >>> 22 | c << 10);
          s1 = (g >>> 6 | g << 26) ^ (g >>> 11 | g << 21) ^ (g >>> 25 | g << 7);
          cd = c & d;
          maj = cd ^ c & a ^ da;
          ch = g & h ^ ~g & e;
          t1 = f + s1 + ch + K[j + 2] + blocks2[j + 2];
          t2 = s0 + maj;
          f = b + t1 << 0;
          b = t1 + t2 << 0;
          s0 = (b >>> 2 | b << 30) ^ (b >>> 13 | b << 19) ^ (b >>> 22 | b << 10);
          s1 = (f >>> 6 | f << 26) ^ (f >>> 11 | f << 21) ^ (f >>> 25 | f << 7);
          bc = b & c;
          maj = bc ^ b & d ^ cd;
          ch = f & g ^ ~f & h;
          t1 = e + s1 + ch + K[j + 3] + blocks2[j + 3];
          t2 = s0 + maj;
          e = a + t1 << 0;
          a = t1 + t2 << 0;
          this.chromeBugWorkAround = true;
        }
        this.h0 = this.h0 + a << 0;
        this.h1 = this.h1 + b << 0;
        this.h2 = this.h2 + c << 0;
        this.h3 = this.h3 + d << 0;
        this.h4 = this.h4 + e << 0;
        this.h5 = this.h5 + f << 0;
        this.h6 = this.h6 + g << 0;
        this.h7 = this.h7 + h << 0;
      };
      Sha256.prototype.hex = function() {
        this.finalize();
        var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4, h5 = this.h5, h6 = this.h6, h7 = this.h7;
        var hex = HEX_CHARS[h0 >>> 28 & 15] + HEX_CHARS[h0 >>> 24 & 15] + HEX_CHARS[h0 >>> 20 & 15] + HEX_CHARS[h0 >>> 16 & 15] + HEX_CHARS[h0 >>> 12 & 15] + HEX_CHARS[h0 >>> 8 & 15] + HEX_CHARS[h0 >>> 4 & 15] + HEX_CHARS[h0 & 15] + HEX_CHARS[h1 >>> 28 & 15] + HEX_CHARS[h1 >>> 24 & 15] + HEX_CHARS[h1 >>> 20 & 15] + HEX_CHARS[h1 >>> 16 & 15] + HEX_CHARS[h1 >>> 12 & 15] + HEX_CHARS[h1 >>> 8 & 15] + HEX_CHARS[h1 >>> 4 & 15] + HEX_CHARS[h1 & 15] + HEX_CHARS[h2 >>> 28 & 15] + HEX_CHARS[h2 >>> 24 & 15] + HEX_CHARS[h2 >>> 20 & 15] + HEX_CHARS[h2 >>> 16 & 15] + HEX_CHARS[h2 >>> 12 & 15] + HEX_CHARS[h2 >>> 8 & 15] + HEX_CHARS[h2 >>> 4 & 15] + HEX_CHARS[h2 & 15] + HEX_CHARS[h3 >>> 28 & 15] + HEX_CHARS[h3 >>> 24 & 15] + HEX_CHARS[h3 >>> 20 & 15] + HEX_CHARS[h3 >>> 16 & 15] + HEX_CHARS[h3 >>> 12 & 15] + HEX_CHARS[h3 >>> 8 & 15] + HEX_CHARS[h3 >>> 4 & 15] + HEX_CHARS[h3 & 15] + HEX_CHARS[h4 >>> 28 & 15] + HEX_CHARS[h4 >>> 24 & 15] + HEX_CHARS[h4 >>> 20 & 15] + HEX_CHARS[h4 >>> 16 & 15] + HEX_CHARS[h4 >>> 12 & 15] + HEX_CHARS[h4 >>> 8 & 15] + HEX_CHARS[h4 >>> 4 & 15] + HEX_CHARS[h4 & 15] + HEX_CHARS[h5 >>> 28 & 15] + HEX_CHARS[h5 >>> 24 & 15] + HEX_CHARS[h5 >>> 20 & 15] + HEX_CHARS[h5 >>> 16 & 15] + HEX_CHARS[h5 >>> 12 & 15] + HEX_CHARS[h5 >>> 8 & 15] + HEX_CHARS[h5 >>> 4 & 15] + HEX_CHARS[h5 & 15] + HEX_CHARS[h6 >>> 28 & 15] + HEX_CHARS[h6 >>> 24 & 15] + HEX_CHARS[h6 >>> 20 & 15] + HEX_CHARS[h6 >>> 16 & 15] + HEX_CHARS[h6 >>> 12 & 15] + HEX_CHARS[h6 >>> 8 & 15] + HEX_CHARS[h6 >>> 4 & 15] + HEX_CHARS[h6 & 15];
        if (!this.is224) {
          hex += HEX_CHARS[h7 >>> 28 & 15] + HEX_CHARS[h7 >>> 24 & 15] + HEX_CHARS[h7 >>> 20 & 15] + HEX_CHARS[h7 >>> 16 & 15] + HEX_CHARS[h7 >>> 12 & 15] + HEX_CHARS[h7 >>> 8 & 15] + HEX_CHARS[h7 >>> 4 & 15] + HEX_CHARS[h7 & 15];
        }
        return hex;
      };
      Sha256.prototype.toString = Sha256.prototype.hex;
      Sha256.prototype.digest = function() {
        this.finalize();
        var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4, h5 = this.h5, h6 = this.h6, h7 = this.h7;
        var arr = [
          h0 >>> 24 & 255,
          h0 >>> 16 & 255,
          h0 >>> 8 & 255,
          h0 & 255,
          h1 >>> 24 & 255,
          h1 >>> 16 & 255,
          h1 >>> 8 & 255,
          h1 & 255,
          h2 >>> 24 & 255,
          h2 >>> 16 & 255,
          h2 >>> 8 & 255,
          h2 & 255,
          h3 >>> 24 & 255,
          h3 >>> 16 & 255,
          h3 >>> 8 & 255,
          h3 & 255,
          h4 >>> 24 & 255,
          h4 >>> 16 & 255,
          h4 >>> 8 & 255,
          h4 & 255,
          h5 >>> 24 & 255,
          h5 >>> 16 & 255,
          h5 >>> 8 & 255,
          h5 & 255,
          h6 >>> 24 & 255,
          h6 >>> 16 & 255,
          h6 >>> 8 & 255,
          h6 & 255
        ];
        if (!this.is224) {
          arr.push(h7 >>> 24 & 255, h7 >>> 16 & 255, h7 >>> 8 & 255, h7 & 255);
        }
        return arr;
      };
      Sha256.prototype.array = Sha256.prototype.digest;
      Sha256.prototype.arrayBuffer = function() {
        this.finalize();
        var buffer = new ArrayBuffer(this.is224 ? 28 : 32);
        var dataView = new DataView(buffer);
        dataView.setUint32(0, this.h0);
        dataView.setUint32(4, this.h1);
        dataView.setUint32(8, this.h2);
        dataView.setUint32(12, this.h3);
        dataView.setUint32(16, this.h4);
        dataView.setUint32(20, this.h5);
        dataView.setUint32(24, this.h6);
        if (!this.is224) {
          dataView.setUint32(28, this.h7);
        }
        return buffer;
      };
      function HmacSha256(key, is224, sharedMemory) {
        var i, type = typeof key;
        if (type === "string") {
          var bytes = [], length = key.length, index = 0, code;
          for (i = 0; i < length; ++i) {
            code = key.charCodeAt(i);
            if (code < 128) {
              bytes[index++] = code;
            } else if (code < 2048) {
              bytes[index++] = 192 | code >>> 6;
              bytes[index++] = 128 | code & 63;
            } else if (code < 55296 || code >= 57344) {
              bytes[index++] = 224 | code >>> 12;
              bytes[index++] = 128 | code >>> 6 & 63;
              bytes[index++] = 128 | code & 63;
            } else {
              code = 65536 + ((code & 1023) << 10 | key.charCodeAt(++i) & 1023);
              bytes[index++] = 240 | code >>> 18;
              bytes[index++] = 128 | code >>> 12 & 63;
              bytes[index++] = 128 | code >>> 6 & 63;
              bytes[index++] = 128 | code & 63;
            }
          }
          key = bytes;
        } else {
          if (type === "object") {
            if (key === null) {
              throw new Error(ERROR);
            } else if (ARRAY_BUFFER && key.constructor === ArrayBuffer) {
              key = new Uint8Array(key);
            } else if (!Array.isArray(key)) {
              if (!ARRAY_BUFFER || !ArrayBuffer.isView(key)) {
                throw new Error(ERROR);
              }
            }
          } else {
            throw new Error(ERROR);
          }
        }
        if (key.length > 64) {
          key = new Sha256(is224, true).update(key).array();
        }
        var oKeyPad = [], iKeyPad = [];
        for (i = 0; i < 64; ++i) {
          var b = key[i] || 0;
          oKeyPad[i] = 92 ^ b;
          iKeyPad[i] = 54 ^ b;
        }
        Sha256.call(this, is224, sharedMemory);
        this.update(iKeyPad);
        this.oKeyPad = oKeyPad;
        this.inner = true;
        this.sharedMemory = sharedMemory;
      }
      HmacSha256.prototype = new Sha256();
      HmacSha256.prototype.finalize = function() {
        Sha256.prototype.finalize.call(this);
        if (this.inner) {
          this.inner = false;
          var innerHash = this.array();
          Sha256.call(this, this.is224, this.sharedMemory);
          this.update(this.oKeyPad);
          this.update(innerHash);
          Sha256.prototype.finalize.call(this);
        }
      };
      var exports2 = createMethod();
      exports2.sha256 = exports2;
      exports2.sha224 = createMethod(true);
      exports2.sha256.hmac = createHmacMethod();
      exports2.sha224.hmac = createHmacMethod(true);
      if (COMMON_JS) {
        module.exports = exports2;
      } else {
        root.sha256 = exports2.sha256;
        root.sha224 = exports2.sha224;
        if (AMD) {
          define(function() {
            return exports2;
          });
        }
      }
    })();
  }
});

// src/sha224.js
var require_sha224 = __commonJS({
  "src/sha224.js"(exports, module) {
    var sha224 = require_sha256().sha224;
    function hash224encrypt2(str) {
      return sha224(str);
    }
    function isValidSHA2242(hash) {
      const sha224Regex = /^[0-9a-f]{56}$/i;
      return sha224Regex.test(hash);
    }
    module.exports = {
      hash224encrypt: hash224encrypt2,
      isValidSHA224: isValidSHA2242
    };
  }
});

// src/addressHandle.js
var require_addressHandle = __commonJS({
  "src/addressHandle.js"(exports, module) {
    function splitArray(array, chunkSize) {
      const chunks = [];
      let index = 0;
      while (index < array.length) {
        chunks.push(array.slice(index, index + chunkSize));
        index += chunkSize;
      }
      return chunks;
    }
    function splitArrayEvenly2(array, maxChunkSize) {
      const totalLength = array.length;
      const numChunks = Math.ceil(totalLength / maxChunkSize);
      const chunkSize = Math.ceil(totalLength / numChunks);
      return splitArray(array, chunkSize);
    }
    function isValidlandingAddr(ip) {
      var reg = /^(?:(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?::\d{1,5})?|(?:(?:\d{1,3}\.){3}\d{1,3})(?::\d{1,5})?|(?:\[[0-9a-fA-F:]+\])(?::\d{1,5})?)$/;
      return reg.test(ip);
    }
    function parselandingAddr(address) {
      const regex = /^(?:(?<domain>(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(?::(?<port>\d{1,5}))?|(?<ipv4>(?:\d{1,3}\.){3}\d{1,3})(?::(?<port_ipv4>\d{1,5}))?|(?<ipv6>\[[0-9a-fA-F:]+\])(?::(?<port_ipv6>\d{1,5}))?)$/;
      const match = address.match(regex);
      if (match) {
        let host2 = match.groups.domain || match.groups.ipv4 || match.groups.ipv6;
        let port = match.groups.port || match.groups.port_ipv4 || match.groups.port_ipv6 || void 0;
        return { host: host2, port };
      } else {
        return { host: "", undefined: void 0 };
      }
    }
    function getRandomElement(array) {
      const randomIndex = Math.floor(Math.random() * array.length);
      return array[randomIndex];
    }
    module.exports = {
      isValidlandingAddr,
      parselandingAddr,
      splitArrayEvenly: splitArrayEvenly2,
      getRandomElement
    };
  }
});

// src/crawler.js
var require_crawler = __commonJS({
  "src/crawler.js"(exports, module) {
    async function fetchGitHubFile2(token, owner, repo, filePath, branch = "main") {
      const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
      try {
        const response = await fetch(githubUrl, {
          method: "GET",
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3.raw",
            "User-Agent": "Cloudflare Worker"
          }
        });
        if (!response.ok) {
          return {
            body: "",
            contentType: "text/plain; charset=utf-8"
          };
        }
        const contentType = response.headers.get("Content-Type") || "application/octet-stream";
        const body = await response.arrayBuffer();
        return {
          body,
          contentType
        };
      } catch (error) {
        return {
          body: "",
          contentType: "text/plain; charset=utf-8"
        };
      }
    }
    async function fetchWebPageContent2(URL2) {
      try {
        const response = await fetch(URL2);
        if (!response.ok) {
          throw new Error(`Failed to get: ${response.status}`);
          return "";
        } else {
          return await response.text();
        }
      } catch (err) {
        console.error(`Failed to fetch ${URL2} web conten: ${err.message}`);
        return "";
      }
    }
    module.exports = {
      fetchGitHubFile: fetchGitHubFile2,
      fetchWebPageContent: fetchWebPageContent2
    };
  }
});

// src/base64.js
var require_base64 = __commonJS({
  "src/base64.js"(exports, module) {
    function base64Encode(str) {
      let encoder = new TextEncoder();
      let bytes = encoder.encode(str);
      let binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
      return btoa(binary);
    }
    function base64Decode2(base64Str) {
      let binary = atob(base64Str);
      let bytes = new Uint8Array([...binary].map((char) => char.charCodeAt(0)));
      let decoder = new TextDecoder();
      return decoder.decode(bytes);
    }
    module.exports = {
      base64Encode,
      base64Decode: base64Decode2
    };
  }
});

// src/output.js
var require_output = __commonJS({
  "src/output.js"(exports, module) {
    var { getRandomElement } = require_addressHandle();
    var { base64Encode, base64Decode: base64Decode2 } = require_base64();
    function getBaseConfig2(pswd, host2) {
      const server = "www.visa.com.sg";
      const base64Link = "dHJvamFuOi8vI3Bhc3N3b3JkI0AjYWRkcmVzcyM6I3BvcnQjP3NlY3VyaXR5PSNvblRscyMmdHlwZT13cyZob3N0PSNob3N0IyZwYXRoPSUyRiMjYWRkcmVzcyM";
      const base64Yaml = "LSB0eXBlOiB0cm9qYW4NCiAgbmFtZTogI2FkZHJlc3MjDQogIHNlcnZlcjogI2FkZHJlc3MjDQogIHBvcnQ6ICNwb3J0Iw0KICBwYXNzd29yZDogI3Bhc3N3b3JkIw0KICBuZXR3b3JrOiB3cw0KICB1ZHA6IGZhbHNlDQogIHNuaTogI2hvc3QjDQogIGNsaWVudC1maW5nZXJwcmludDogY2hyb21lDQogIHNraXAtY2VydC12ZXJpZnk6IHRydWUNCiAgd3Mtb3B0czoNCiAgICBwYXRoOiAvDQogICAgaGVhZGVyczoNCiAgICAgIEhvc3Q6ICNob3N0Iw";
      const base64Json = "ew0KICAib3V0Ym91bmRzIjogWw0KICAgIHsNCiAgICAgICJuZXR3b3JrIjogInRjcCIsDQogICAgICAicGFzc3dvcmQiOiAiI3Bhc3N3b3JkIyIsDQogICAgICAic2VydmVyIjogIiNhZGRyZXNzIyIsDQogICAgICAic2VydmVyX3BvcnQiOiAjcG9ydCMsDQogICAgICAidGFnIjogIiNhZGRyZXNzIzojcG9ydCMiLA0KICAgICAgInRscyI6IHsNCiAgICAgICAgImVuYWJsZWQiOiAjb25UbHMjLA0KICAgICAgICAiaW5zZWN1cmUiOiB0cnVlLA0KICAgICAgICAic2VydmVyX25hbWUiOiAiI2hvc3QjIiwNCiAgICAgICAgInV0bHMiOiB7DQogICAgICAgICAgImVuYWJsZWQiOiB0cnVlLA0KICAgICAgICAgICJmaW5nZXJwcmludCI6ICJjaHJvbWUiDQogICAgICAgIH0NCiAgICAgIH0sDQogICAgICAidHJhbnNwb3J0Ijogew0KICAgICAgICAiZWFybHlfZGF0YV9oZWFkZXJfbmFtZSI6ICJTZWMtV2ViU29ja2V0LVByb3RvY29sIiwNCiAgICAgICAgImhlYWRlcnMiOiB7DQogICAgICAgICAgIkhvc3QiOiAiI2hvc3QjIg0KICAgICAgICB9LA0KICAgICAgICAicGF0aCI6ICIvIiwNCiAgICAgICAgInR5cGUiOiAid3MiDQogICAgICB9LA0KICAgICAgInR5cGUiOiAidHJvamFuIg0KICAgIH0NCiAgXQ0KfQ";
      const isCFworkersDomain = host2.endsWith(base64Decode2("d29ya2Vycy5kZXY")) ? true : false;
      const port = isCFworkersDomain ? 8080 : 443;
      const replacements = {
        "#password#": pswd,
        "#address#": server,
        "#port#": port,
        "#host#": host2
      };
      const regex1 = new RegExp(Object.keys(replacements).concat("#onTls#").join("|"), "g");
      const finallyLink = base64Decode2(base64Link).replace(regex1, (match) => {
        if (match === "#onTls#") {
          return isCFworkersDomain ? "none" : base64Decode2("dGxzJnNuaT0jaG9zdCMmZnA9Y2hyb21lJmFsbG93SW5zZWN1cmU9MQ").replace("#host#", host2);
        }
        return replacements[match];
      });
      const regex2 = new RegExp(Object.keys(replacements).join("|"), "g");
      const finallyYaml = base64Decode2(base64Yaml).replace(regex2, (match) => replacements[match]);
      const finallyJson = base64Decode2(base64Json).replace(regex1, (match) => {
        if (match === "#onTls#") {
          return isCFworkersDomain ? false : true;
        }
        return replacements[match];
      });
      return `
####################################################################################################################
${base64Decode2("djJyYXk")}
--------------------------------------------------------------------------------------------------------------------
${finallyLink}
--------------------------------------------------------------------------------------------------------------------
####################################################################################################################
${base64Decode2("c2luZy1ib3g")}
--------------------------------------------------------------------------------------------------------------------
${finallyJson}
--------------------------------------------------------------------------------------------------------------------
####################################################################################################################
${base64Decode2("Y2xhc2gubWV0YSAodHJvamFuK3dzK3Rscyk")}
--------------------------------------------------------------------------------------------------------------------
${finallyYaml}
--------------------------------------------------------------------------------------------------------------------
####################################################################################################################
	`;
    }
    function buildLinks2(ipsArrayChunked, hostName, pswd, defaultPort, HTTP_WITH_PORTS2, HTTPS_WITH_PORTS2) {
      let LinkArray = [];
      const base64Link = "dHJvamFuOi8vI3Bhc3N3b3JkI0AjYWRkcmVzcyM6I3BvcnQjP3NlY3VyaXR5PSNvblRscyMmdHlwZT13cyZob3N0PSNob3N0IyZwYXRoPSUyRiMjcmVtYXJrcyM";
      const isCFworkersDomain = hostName.endsWith(base64Decode2("d29ya2Vycy5kZXY")) ? true : false;
      for (let addr of ipsArrayChunked) {
        if (!addr)
          continue;
        let randomHttpPort = getRandomElement(HTTP_WITH_PORTS2);
        let randomHttpsPort = getRandomElement(HTTPS_WITH_PORTS2);
        let port = [0, ...HTTPS_WITH_PORTS2].includes(Number(defaultPort)) && isCFworkersDomain || [0, ...HTTP_WITH_PORTS2].includes(Number(defaultPort)) && !isCFworkersDomain ? isCFworkersDomain ? randomHttpPort : randomHttpsPort : defaultPort;
        let remarks = `cfwks-${addr}:${port}`;
        const replacements = {
          "#password#": pswd,
          "#address#": addr,
          "#port#": port,
          "#host#": hostName,
          "#remarks#": remarks
        };
        const regex = new RegExp(Object.keys(replacements).concat("#onTls#").join("|"), "g");
        const finallyLink = base64Decode2(base64Link).replace(regex, (match) => {
          if (match === "#onTls#") {
            return isCFworkersDomain ? "none" : base64Decode2("dGxzJnNuaT0jaG9zdCMmZnA9Y2hyb21lJmFsbG93SW5zZWN1cmU9MQ").replace("#host#", host);
          }
          return replacements[match];
        });
        if (!LinkArray.includes(finallyLink)) {
          LinkArray.push(finallyLink);
        }
      }
      return base64Encode(LinkArray.join("\n"));
    }
    function buildYamls2(ipsArrayChunked, hostName, pswd, defaultPort, HTTP_WITH_PORTS2, HTTPS_WITH_PORTS2) {
      let proxyies = [];
      let nodeNames = [];
      const base64Yaml = "ICAtIHsidHlwZSI6InRyb2phbiIsIm5hbWUiOiIjcmVtYXJrcyMiLCJzZXJ2ZXIiOiIjc2VydmVyIyIsInBvcnQiOiNwb3J0IywicGFzc3dvcmQiOiIjcGFzc3dvcmQjIiwibmV0d29yayI6IndzIiwidWRwIjpmYWxzZSwic25pIjoiI2hvc3ROYW1lIyIsImNsaWVudC1maW5nZXJwcmludCI6ImNocm9tZSIsInNraXAtY2VydC12ZXJpZnkiOnRydWUsIndzLW9wdHMiOnsicGF0aCI6Ii8iLCJoZWFkZXJzIjp7Ikhvc3QiOiIjaG9zdE5hbWUjIn19fQ";
      const isCFworkersDomain = hostName.includes(base64Decode2("d29ya2Vycy5kZXY")) ? true : false;
      for (let addr of ipsArrayChunked) {
        if (!addr)
          continue;
        let randomHttpPortElement = getRandomElement(HTTP_WITH_PORTS2);
        let randomHttpsPortElement = getRandomElement(HTTPS_WITH_PORTS2);
        let port = [0, ...HTTPS_WITH_PORTS2].includes(Number(defaultPort)) && isCFworkersDomain || [0, ...HTTP_WITH_PORTS2].includes(Number(defaultPort)) && !isCFworkersDomain ? isCFworkersDomain ? randomHttpPortElement : randomHttpsPortElement : defaultPort;
        let remarks = `cfwks-${addr}:${port}`;
        const replacements = {
          "#password#": pswd,
          "#server#": addr,
          "#port#": port,
          "#hostName#": hostName,
          "#remarks#": remarks
        };
        const regex = new RegExp(Object.keys(replacements).join("|"), "g");
        const proxyiesValue = base64Decode2(base64Yaml).replace(regex, (match) => replacements[match]);
        if (!nodeNames.includes(remarks)) {
          proxyies.push(proxyiesValue);
          nodeNames.push(remarks);
        }
      }
      return [nodeNames, proxyies];
    }
    function buildJsons2(ipsArrayChunked, hostName, pswd, defaultPort, HTTP_WITH_PORTS2, HTTPS_WITH_PORTS2) {
      let outbds = [];
      let nodeNames = [];
      const base64Json = "ICAgIHsNCiAgICAgICJuZXR3b3JrIjogInRjcCIsDQogICAgICAicGFzc3dvcmQiOiAiI3Bhc3N3b3JkIyIsDQogICAgICAic2VydmVyIjogIiNzZXJ2ZXIjIiwNCiAgICAgICJzZXJ2ZXJfcG9ydCI6ICNwb3J0IywNCiAgICAgICJ0YWciOiAiI3RhZ25hbWUjIiwNCiAgICAgICJ0bHMiOiB7DQogICAgICAgICJlbmFibGVkIjogI29uVGxzIywNCiAgICAgICAgImluc2VjdXJlIjogdHJ1ZSwNCiAgICAgICAgInNlcnZlcl9uYW1lIjogIiNob3N0TmFtZSMiLA0KICAgICAgICAidXRscyI6IHsNCiAgICAgICAgICAiZW5hYmxlZCI6IHRydWUsDQogICAgICAgICAgImZpbmdlcnByaW50IjogImNocm9tZSINCiAgICAgICAgfQ0KICAgICAgfSwNCiAgICAgICJ0cmFuc3BvcnQiOiB7DQogICAgICAgICJlYXJseV9kYXRhX2hlYWRlcl9uYW1lIjogIlNlYy1XZWJTb2NrZXQtUHJvdG9jb2wiLA0KICAgICAgICAiaGVhZGVycyI6IHsNCiAgICAgICAgICAiSG9zdCI6ICIjaG9zdE5hbWUjIg0KICAgICAgICB9LA0KICAgICAgICAicGF0aCI6ICIvIiwNCiAgICAgICAgInR5cGUiOiAid3MiDQogICAgICB9LA0KICAgICAgInR5cGUiOiAidHJvamFuIg0KICAgIH0";
      const isCFworkersDomain = hostName.includes(base64Decode2("d29ya2Vycy5kZXY")) ? true : false;
      for (let addr of ipsArrayChunked) {
        if (!addr)
          continue;
        let randomHttpPortElement = getRandomElement(HTTP_WITH_PORTS2);
        let randomHttpsPortElement = getRandomElement(HTTPS_WITH_PORTS2);
        let port = [0, ...HTTPS_WITH_PORTS2].includes(Number(defaultPort)) && isCFworkersDomain || [0, ...HTTP_WITH_PORTS2].includes(Number(defaultPort)) && !isCFworkersDomain ? isCFworkersDomain ? randomHttpPortElement : randomHttpsPortElement : defaultPort;
        let remarks = `cfwks-${addr}:${port}`;
        const replacements = {
          "#password#": pswd,
          "#server#": addr,
          "#port#": port,
          "#hostName#": hostName,
          "#tagname#": remarks,
          "#onTls#": !isCFworkersDomain
        };
        const regex = new RegExp(Object.keys(replacements).join("|"), "g");
        const outbdsValue = base64Decode2(base64Json).replace(regex, (match) => replacements[match]);
        if (!nodeNames.includes(remarks)) {
          outbds.push(outbdsValue);
          nodeNames.push(remarks);
        }
      }
      return [nodeNames, outbds];
    }
    module.exports = {
      getBaseConfig: getBaseConfig2,
      buildLinks: buildLinks2,
      buildYamls: buildYamls2,
      buildJsons: buildJsons2
    };
  }
});

// src/worker.js
import { connect } from "cloudflare:sockets";
var { hash224encrypt, isValidSHA224 } = require_sha224();
var { splitArrayEvenly, isValidLandingAddress, parseLandingAddress } = require_addressHandle();
var { fetchGitHubFile, fetchWebPageContent } = require_crawler();
var { getBaseConfig, buildLinks, buildYamls, buildJsons } = require_output();
var { base64Decode } = require_base64();
var landingAddress = "";
var plaintextPassword = "a1234567";
var sha224Password = hash224encrypt(plaintextPassword);
var domainList = [
  "https://www.iq.com",
  "https://www.dell.com",
  "https://www.bilibili.com",
  "https://www.wix.com/",
  "https://landingsite.ai/",
  "https://vimeo.com/",
  "https://www.pexels.com/",
  "https://www.revid.ai/"
];
var HTTP_WITH_PORTS = [80, 8080, 8880, 2052, 2082, 2086, 2095];
var HTTPS_WITH_PORTS = [443, 2053, 2083, 2087, 2096, 8443];
var DEFAULT_GITHUB_TOKEN = "";
var DEFAULT_OWNER = "";
var DEFAULT_REPO = "";
var DEFAULT_BRANCH = "main";
var DEFAULT_FILE_PATH = "README.md";
var confTemplateUrl = "https://raw.githubusercontent.com/juerson/cftrojan-tunnel/refs/heads/master/clashTemplate.yaml";
var ipaddrURL = "https://raw.githubusercontent.com/juerson/cftrojan-tunnel/refs/heads/master/ipaddr.txt";
var worker_default = {
  /**
   * @param {import("@cloudflare/workers-types").Request} request
   * @param {{PASS_CODE: string, LANDING_ADDRESS: string}} env
   * @param {import("@cloudflare/workers-types").ExecutionContext} ctx
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    try {
      const GITHUB_TOKEN = env.GITHUB_TOKEN || DEFAULT_GITHUB_TOKEN;
      const OWNER = env.GITHUB_OWNER || DEFAULT_OWNER;
      const REPO = env.GITHUB_REPO || DEFAULT_REPO;
      const BRANCH = env.GITHUB_BRANCH || DEFAULT_BRANCH;
      const FILE_PATH = env.GITHUB_FILE_PATH || DEFAULT_FILE_PATH;
      let configPassword = env.CONFIG_PASSWORD || "";
      let subPassword = env.SUB_PASSWORD || "";
      landingAddress = env.LANDING_ADDRESS || landingAddress;
      let password = env.PASS_CODE || plaintextPassword;
      if (password !== plaintextPassword) {
        sha224Password = hash224encrypt(password);
      }
      if (!isValidSHA224(sha224Password)) {
        throw new Error("sha224Password is not valid");
      }
      const upgradeHeader = request.headers.get("Upgrade");
      const url = new URL(request.url);
      if (!upgradeHeader || upgradeHeader !== "websocket") {
        const target = url.searchParams.get("target");
        const hostName = url.searchParams.get("host") || url.hostname;
        let pwdPassword = url.searchParams.get("pwd") || "";
        let defaultPort = url.searchParams.get("port") || 0;
        let page = url.searchParams.get("page") || 1;
        if (pwdPassword) {
          pwdPassword = encodeURIComponent(pwdPassword);
          subPassword = encodeURIComponent(subPassword);
          configPassword = encodeURIComponent(configPassword);
        }
        switch (url.pathname) {
          case "/":
            const randomDomain = domainList[Math.floor(Math.random() * domainList.length)];
            const redirectResponse = new Response("", {
              status: 301,
              headers: {
                Location: randomDomain
              }
            });
            return redirectResponse;
          case `/config`:
            let html_doc = "";
            let responseStatus = 200;
            if (pwdPassword === configPassword) {
              html_doc = getBaseConfig(password, hostName);
              responseStatus = 200;
            } else {
              html_doc = "\u60A8\u65E0\u76F8\u5173\u7684\u6743\u9650\u8BBF\u95EE\uFF01";
              responseStatus = 404;
            }
            return new Response(html_doc, {
              status: responseStatus,
              headers: {
                "Content-Type": "text/plain;charset=utf-8"
              }
            });
          case "/sub":
            if (pwdPassword === subPassword) {
              let ips_string = "";
              try {
                const fileContent = await fetchGitHubFile(GITHUB_TOKEN, OWNER, REPO, FILE_PATH, BRANCH);
                const decoder = new TextDecoder("utf-8");
                ips_string = decoder.decode(fileContent.body);
              } catch (error) {
                console.log(`Error: ${error.message}`);
              }
              ips_string = ips_string !== "" ? ips_string : await fetchWebPageContent(ipaddrURL);
              if (ips_string.length == 0) {
                return new Response("\u6570\u636E\u4E3A\u7A7A\uFF0C\u65E0\u6CD5\u751F\u6210\u8BA2\u9605\uFF01", {
                  status: 200,
                  headers: {
                    "Content-Type": "text/plain;charset=utf-8"
                  }
                });
              }
              let ipsArray = ips_string.trim().split(/\r\n|\n|\r/).map((ip) => ip.trim());
              let html_doc2 = "";
              if (target === base64Decode("djJyYXk")) {
                let maxNodeNumber = url.searchParams.get("maxNode") || url.searchParams.get("maxnode") || 1e3;
                maxNodeNumber = maxNodeNumber > 0 && maxNodeNumber <= 5e3 ? maxNodeNumber : 1e3;
                let chunkedArray = splitArrayEvenly(ipsArray, maxNodeNumber);
                let totalPage = Math.ceil(ipsArray.length / maxNodeNumber);
                if (page > totalPage || page < 1) {
                  return new Response("The data is empty.", { status: 200 });
                }
                let ipsArrayChunked = chunkedArray[page - 1];
                html_doc2 = buildLinks(ipsArrayChunked, hostName, password, defaultPort, HTTP_WITH_PORTS, HTTPS_WITH_PORTS);
              } else if (target === base64Decode("Y2xhc2g")) {
                const isCFworkersDomain = hostName.endsWith(base64Decode("d29ya2Vycy5kZXY")) ? true : false;
                if (isCFworkersDomain) {
                  html_doc2 = base64Decode(
                    "6K2m5ZGK77ya5L2/55So5Z+f5ZCNI2hvc3ROYW1lI+eUn+aIkOeahGNsYXNo6K6i6ZiF5peg5rOV5L2/55So77yB57uI5q2i5pON5L2c44CC"
                  ).replace("#hostName#", hostName);
                  return new Response(html_doc2, {
                    status: 200,
                    headers: {
                      "Content-Type": "text/plain;charset=utf-8"
                    }
                  });
                }
                let maxNode = url.searchParams.get("maxNode") || url.searchParams.get("maxnode") || 300;
                maxNode = maxNode > 0 && maxNode <= 1e3 ? maxNode : 300;
                let chunkedArray = splitArrayEvenly(ipsArray, maxNode);
                let totalPage = Math.ceil(ipsArray.length / maxNode);
                if (page > totalPage || page < 1) {
                  return new Response("The data is empty.", { status: 200 });
                }
                let ipsArrayChunked = chunkedArray[page - 1];
                let [nodeNames, proxyies] = buildYamls(ipsArrayChunked, hostName, password, defaultPort, HTTP_WITH_PORTS, HTTPS_WITH_PORTS);
                let confTemplate = await fetchWebPageContent(confTemplateUrl);
                if (nodeNames) {
                  let replaceProxyies = confTemplate.replace(
                    new RegExp(
                      atob(
                        "ICAtIHtuYW1lOiAwMSwgc2VydmVyOiAxMjcuMC4wLjEsIHBvcnQ6IDgwLCB0eXBlOiBzcywgY2lwaGVyOiBhZXMtMTI4LWdjbSwgcGFzc3dvcmQ6IGExMjM0NTZ9"
                      ),
                      "g"
                    ),
                    proxyies.join("\n")
                  );
                  html_doc2 = replaceProxyies.replace(
                    new RegExp(atob("ICAgICAgLSAwMQ=="), "g"),
                    nodeNames.map((ipWithPort) => `      - ${ipWithPort}`).join("\n")
                  );
                }
              } else if (target === base64Decode("c2luZ2JveA")) {
                let maxNode = url.searchParams.get("maxNode") || url.searchParams.get("maxnode") || 50;
                maxNode = maxNode > 0 && maxNode <= 100 ? maxNode : 50;
                let chunkedArray = splitArrayEvenly(ipsArray, maxNode);
                let totalPage = Math.ceil(ipsArray.length / maxNode);
                if (page > totalPage || page < 1) {
                  return new Response("The data is empty.", { status: 200 });
                }
                let ipsArrayChunked = chunkedArray[page - 1];
                let [_, outbds] = buildJsons(ipsArrayChunked, hostName, password, defaultPort, HTTP_WITH_PORTS, HTTPS_WITH_PORTS);
                html_doc2 = base64Decode("ew0KICAib3V0Ym91bmRzIjogWw0KI291dGJkcyMNCiAgXQ0KfQ").replace("#outbds#", outbds.join(",\n"));
              }
              if (!html_doc2 || html_doc2.trim().length === 0) {
                html_doc2 = "\u53D1\u751F\u672A\u77E5\u9519\u8BEF\uFF01";
              }
              return new Response(html_doc2, {
                status: 200,
                headers: {
                  "Content-Type": "text/plain;charset=utf-8"
                }
              });
            }
          default:
            return new Response("\u60A8\u65E0\u76F8\u5173\u7684\u6743\u9650\u8BBF\u95EE\uFF01", {
              status: 404,
              headers: {
                "Content-Type": "text/plain;charset=utf-8"
              }
            });
        }
      } else {
        const pathString = url.pathname;
        if (pathString.includes("/pyip=")) {
          const pathLandingAddress = pathString.split("=")[1];
          if (isValidLandingAddress(pathLandingAddress)) {
            landingAddress = pathLandingAddress;
          }
        }
        return await a1(request);
      }
    } catch (err) {
      let e = err;
      return new Response(e.toString());
    }
  }
};
async function a1(request) {
  const webSocketPair = new WebSocketPair();
  const [client, webSocket] = Object.values(webSocketPair);
  webSocket.accept();
  let address = "";
  let portWithRandomLog = "";
  const log = (info, event) => {
    console.log(`[${address}:${portWithRandomLog}] ${info}`, event || "");
  };
  const earlyDataHeader = request.headers.get("sec-websocket-protocol") || "";
  const readableWebSocketStream = makeReadableWebSocketStream(webSocket, earlyDataHeader, log);
  let remoteSocketWapper = {
    value: null
  };
  let udpStreamWrite = null;
  readableWebSocketStream.pipeTo(
    new WritableStream({
      async write(chunk, controller) {
        if (udpStreamWrite) {
          return udpStreamWrite(chunk);
        }
        if (remoteSocketWapper.value) {
          const writer = remoteSocketWapper.value.writable.getWriter();
          await writer.write(chunk);
          writer.releaseLock();
          return;
        }
        const { hasError, message, addressRemote = "", portRemote = 443, rawClientData } = await parseTr0janHeader(chunk);
        if (hasError) {
          throw new Error(message);
          return;
        }
        address = addressRemote;
        portWithRandomLog = `${portRemote}--${Math.random()} tcp`;
        handleTCPOutBound(remoteSocketWapper, addressRemote, portRemote, rawClientData, webSocket, log);
      },
      close() {
        log(`readableWebSocketStream is closed`);
      },
      abort(reason) {
        log(`readableWebSocketStream is aborted`, JSON.stringify(reason));
      }
    })
  ).catch((err) => {
    log("readableWebSocketStream pipeTo error", err);
  });
  return new Response(null, {
    status: 101,
    webSocket: client
  });
}
async function parseTr0janHeader(buffer) {
  if (buffer.byteLength < 56) {
    return {
      hasError: true,
      message: "invalid data"
    };
  }
  let crLfIndex = 56;
  if (new Uint8Array(buffer.slice(56, 57))[0] !== 13 || new Uint8Array(buffer.slice(57, 58))[0] !== 10) {
    return {
      hasError: true,
      message: "invalid header format (missing CR LF)"
    };
  }
  const password = new TextDecoder().decode(buffer.slice(0, crLfIndex));
  if (password !== sha224Password) {
    return {
      hasError: true,
      message: "invalid password"
    };
  }
  const socks5DataBuffer = buffer.slice(crLfIndex + 2);
  if (socks5DataBuffer.byteLength < 6) {
    return {
      hasError: true,
      message: "invalid SOCKS5 request data"
    };
  }
  const view = new DataView(socks5DataBuffer);
  const cmd = view.getUint8(0);
  if (cmd !== 1) {
    return {
      hasError: true,
      message: "unsupported command, only TCP (CONNECT) is allowed"
    };
  }
  const atype = view.getUint8(1);
  let addressLength = 0;
  let addressIndex = 2;
  let address = "";
  switch (atype) {
    case 1:
      addressLength = 4;
      address = new Uint8Array(socks5DataBuffer.slice(addressIndex, addressIndex + addressLength)).join(".");
      break;
    case 3:
      addressLength = new Uint8Array(socks5DataBuffer.slice(addressIndex, addressIndex + 1))[0];
      addressIndex += 1;
      address = new TextDecoder().decode(socks5DataBuffer.slice(addressIndex, addressIndex + addressLength));
      break;
    case 4:
      addressLength = 16;
      const dataView = new DataView(socks5DataBuffer.slice(addressIndex, addressIndex + addressLength));
      const ipv6 = [];
      for (let i = 0; i < 8; i++) {
        ipv6.push(dataView.getUint16(i * 2).toString(16));
      }
      address = ipv6.join(":");
      break;
    default:
      return {
        hasError: true,
        message: `invalid addressType is ${atype}`
      };
  }
  if (!address) {
    return {
      hasError: true,
      message: `address is empty, addressType is ${atype}`
    };
  }
  const portIndex = addressIndex + addressLength;
  const portBuffer = socks5DataBuffer.slice(portIndex, portIndex + 2);
  const portRemote = new DataView(portBuffer).getUint16(0);
  return {
    hasError: false,
    addressRemote: address,
    portRemote,
    rawClientData: socks5DataBuffer.slice(portIndex + 4)
  };
}
async function handleTCPOutBound(remoteSocket, addressRemote, portRemote, rawClientData, webSocket, log) {
  async function connectAndWrite(address, port) {
    let tcpSocket22 = connect({
      hostname: address,
      port
    });
    remoteSocket.value = tcpSocket22;
    const writer = tcpSocket22.writable.getWriter();
    await writer.write(rawClientData);
    writer.releaseLock();
    return tcpSocket22;
  }
  async function retry() {
    let landingAddressJson = parseLandingAddress(landingAddress);
    let host2 = landingAddressJson.host || addressRemote;
    let port = landingAddressJson.port || portRemote;
    const tcpSocket22 = await connectAndWrite(host2, port);
    tcpSocket22.closed.catch((error) => {
      console.log("retry tcpSocket closed error", error);
    }).finally(() => {
      safeCloseWebSocket(webSocket);
    });
    remoteSocketToWS(tcpSocket22, webSocket, null, log);
  }
  const tcpSocket2 = await connectAndWrite(addressRemote, portRemote);
  remoteSocketToWS(tcpSocket2, webSocket, retry, log);
}
function makeReadableWebSocketStream(webSocketServer, earlyDataHeader, log) {
  let readableStreamCancel = false;
  const stream = new ReadableStream({
    start(controller) {
      webSocketServer.addEventListener("message", (event) => {
        if (readableStreamCancel) {
          return;
        }
        const message = event.data;
        controller.enqueue(message);
      });
      webSocketServer.addEventListener("close", () => {
        safeCloseWebSocket(webSocketServer);
        if (readableStreamCancel) {
          return;
        }
        controller.close();
      });
      webSocketServer.addEventListener("error", (err) => {
        log("webSocketServer error");
        controller.error(err);
      });
      const { earlyData, error } = base64ToArrayBuffer(earlyDataHeader);
      if (error) {
        controller.error(error);
      } else if (earlyData) {
        controller.enqueue(earlyData);
      }
    },
    pull(controller) {
    },
    cancel(reason) {
      if (readableStreamCancel) {
        return;
      }
      log(`readableStream was canceled, due to ${reason}`);
      readableStreamCancel = true;
      safeCloseWebSocket(webSocketServer);
    }
  });
  return stream;
}
async function remoteSocketToWS(remoteSocket, webSocket, retry, log) {
  let hasIncomingData = false;
  await remoteSocket.readable.pipeTo(
    new WritableStream({
      start() {
      },
      /**
       * @param {Uint8Array} chunk
       * @param {*} controller
       */
      async write(chunk, controller) {
        hasIncomingData = true;
        if (webSocket.readyState !== WS_READY_STATE_OPEN) {
          controller.error("webSocket connection is not open");
        }
        webSocket.send(chunk);
      },
      close() {
        log(`remoteSocket.readable is closed, hasIncomingData: ${hasIncomingData}`);
      },
      abort(reason) {
        console.error("remoteSocket.readable abort", reason);
      }
    })
  ).catch((error) => {
    console.error(`remoteSocketToWS error:`, error.stack || error);
    safeCloseWebSocket(webSocket);
  });
  if (hasIncomingData === false && retry) {
    log(`retry`);
    retry();
  }
}
function base64ToArrayBuffer(base64Str) {
  if (!base64Str) {
    return {
      error: null
    };
  }
  try {
    base64Str = base64Str.replace(/-/g, "+").replace(/_/g, "/");
    const decode = atob(base64Str);
    const arryBuffer = Uint8Array.from(decode, (c) => c.charCodeAt(0));
    return {
      earlyData: arryBuffer.buffer,
      error: null
    };
  } catch (error) {
    return {
      error
    };
  }
}
var WS_READY_STATE_OPEN = 1;
var WS_READY_STATE_CLOSING = 2;
function safeCloseWebSocket(socket) {
  try {
    if (socket.readyState === WS_READY_STATE_OPEN || socket.readyState === WS_READY_STATE_CLOSING) {
      socket.close();
    }
  } catch (error) {
    console.error("safeCloseWebSocket error", error);
  }
}
export {
  worker_default as default
};
/*! Bundled license information:

js-sha256/src/sha256.js:
  (**
   * [js-sha256]{@link https://github.com/emn178/js-sha256}
   *
   * @version 0.11.0
   * @author Chen, Yi-Cyuan [emn178@gmail.com]
   * @copyright Chen, Yi-Cyuan 2014-2024
   * @license MIT
   *)
*/
//# sourceMappingURL=worker.js.map
