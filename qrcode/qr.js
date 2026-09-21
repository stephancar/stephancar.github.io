/* ============================================================
   qr.js — QR Code encoder (ISO/IEC 18004), no dependencies.

   Supports versions 1-40, error correction levels L/M/Q/H and
   numeric / alphanumeric / byte (UTF-8) modes. Everything runs
   in the browser; nothing is sent anywhere.

   Usage:
     var qr = QR.encode("hello", "M");
     qr.size        // number of modules per side
     qr.isDark(x,y) // true when the module at column x, row y is dark
   ============================================================ */

(function (global) {
  "use strict";

  var MIN_VERSION = 1;
  var MAX_VERSION = 40;

  // L, M, Q, H -> index. The bit pattern written into the format info
  // is not the same order, hence the second table.
  var ECC_INDEX = { L: 0, M: 1, Q: 2, H: 3 };
  var ECC_FORMAT_BITS = [1, 0, 3, 2];

  // Indexed [eccIndex][version]; index 0 is unused padding.
  var ECC_CODEWORDS_PER_BLOCK = [
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
  ];

  var NUM_ERROR_CORRECTION_BLOCKS = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
  ];

  var ALPHANUMERIC_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

  var PENALTY_N1 = 3, PENALTY_N2 = 3, PENALTY_N3 = 40, PENALTY_N4 = 10;

  // ---------- capacity maths ----------

  // Number of modules available for data and ECC, before dividing into codewords.
  function getNumRawDataModules(ver) {
    var result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var numAlign = Math.floor(ver / 7) + 2;
      result -= (25 * numAlign - 10) * numAlign - 55;
      if (ver >= 7) result -= 36;
    }
    return result;
  }

  function getNumDataCodewords(ver, ecc) {
    return Math.floor(getNumRawDataModules(ver) / 8)
      - ECC_CODEWORDS_PER_BLOCK[ecc][ver] * NUM_ERROR_CORRECTION_BLOCKS[ecc][ver];
  }

  function charCountBits(mode, ver) {
    var i = ver <= 9 ? 0 : (ver <= 26 ? 1 : 2);
    return mode.countBits[i];
  }

  // ---------- segments ----------

  var MODE_NUMERIC = { indicator: 1, countBits: [10, 12, 14] };
  var MODE_ALPHANUMERIC = { indicator: 2, countBits: [9, 11, 13] };
  var MODE_BYTE = { indicator: 4, countBits: [8, 16, 16] };

  function isNumeric(text) { return /^[0-9]*$/.test(text); }

  function isAlphanumeric(text) {
    for (var i = 0; i < text.length; i++) {
      if (ALPHANUMERIC_CHARSET.indexOf(text.charAt(i)) < 0) return false;
    }
    return true;
  }

  function toUtf8(text) {
    if (typeof TextEncoder === "function") return Array.from(new TextEncoder().encode(text));
    // Fallback for very old engines.
    var out = [], escaped = encodeURIComponent(text);
    for (var i = 0; i < escaped.length; i++) {
      if (escaped.charAt(i) === "%") {
        out.push(parseInt(escaped.substr(i + 1, 2), 16));
        i += 2;
      } else {
        out.push(escaped.charCodeAt(i));
      }
    }
    return out;
  }

  // Picks the most compact of the three modes that can represent the whole string.
  function makeSegment(text) {
    if (isNumeric(text)) {
      return { mode: MODE_NUMERIC, numChars: text.length, text: text, bitLength: numericBitLength(text.length) };
    }
    if (isAlphanumeric(text)) {
      return { mode: MODE_ALPHANUMERIC, numChars: text.length, text: text, bitLength: alphanumericBitLength(text.length) };
    }
    var bytes = toUtf8(text);
    return { mode: MODE_BYTE, numChars: bytes.length, bytes: bytes, bitLength: bytes.length * 8 };
  }

  function numericBitLength(n) {
    return 10 * Math.floor(n / 3) + (n % 3 === 1 ? 4 : (n % 3 === 2 ? 7 : 0));
  }

  function alphanumericBitLength(n) {
    return 11 * Math.floor(n / 2) + (n % 2) * 6;
  }

  function appendBits(val, len, bits) {
    for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  }

  function segmentBits(seg, bits) {
    var i;
    if (seg.mode === MODE_NUMERIC) {
      for (i = 0; i < seg.numChars;) {
        var n = Math.min(seg.numChars - i, 3);
        appendBits(parseInt(seg.text.substr(i, n), 10), n * 3 + 1, bits);
        i += n;
      }
    } else if (seg.mode === MODE_ALPHANUMERIC) {
      for (i = 0; i + 2 <= seg.numChars; i += 2) {
        var pair = ALPHANUMERIC_CHARSET.indexOf(seg.text.charAt(i)) * 45
          + ALPHANUMERIC_CHARSET.indexOf(seg.text.charAt(i + 1));
        appendBits(pair, 11, bits);
      }
      if (i < seg.numChars) appendBits(ALPHANUMERIC_CHARSET.indexOf(seg.text.charAt(i)), 6, bits);
    } else {
      for (i = 0; i < seg.bytes.length; i++) appendBits(seg.bytes[i], 8, bits);
    }
  }

  // ---------- Reed-Solomon over GF(2^8), primitive polynomial 0x11D ----------

  function gfMultiply(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xff;
  }

  function rsComputeDivisor(degree) {
    var result = [];
    for (var i = 0; i < degree - 1; i++) result.push(0);
    result.push(1);
    var root = 1;
    for (i = 0; i < degree; i++) {
      for (var j = 0; j < result.length; j++) {
        result[j] = gfMultiply(result[j], root);
        if (j + 1 < result.length) result[j] ^= result[j + 1];
      }
      root = gfMultiply(root, 0x02);
    }
    return result;
  }

  function rsComputeRemainder(data, divisor) {
    var result = divisor.map(function () { return 0; });
    data.forEach(function (b) {
      var factor = b ^ result.shift();
      result.push(0);
      divisor.forEach(function (coef, i) { result[i] ^= gfMultiply(coef, factor); });
    });
    return result;
  }

  // ---------- the code itself ----------

  function QrCode(version, ecc, dataCodewords) {
    this.version = version;
    this.ecc = ecc;
    this.size = version * 4 + 17;
    this.modules = [];
    this.isFunction = [];
    for (var y = 0; y < this.size; y++) {
      this.modules.push(new Array(this.size).fill(false));
      this.isFunction.push(new Array(this.size).fill(false));
    }

    this.drawFunctionPatterns();
    this.drawCodewords(addEccAndInterleave(version, ecc, dataCodewords));

    // Try all eight masks, keep the one the standard's penalty rules like best.
    var bestMask = 0, minPenalty = Infinity;
    for (var mask = 0; mask < 8; mask++) {
      this.applyMask(mask);
      this.drawFormatBits(mask);
      var penalty = this.getPenaltyScore();
      if (penalty < minPenalty) { minPenalty = penalty; bestMask = mask; }
      this.applyMask(mask); // undo
    }
    this.mask = bestMask;
    this.applyMask(bestMask);
    this.drawFormatBits(bestMask);
  }

  QrCode.prototype.isDark = function (x, y) {
    return x >= 0 && x < this.size && y >= 0 && y < this.size && this.modules[y][x];
  };

  QrCode.prototype.setFunctionModule = function (x, y, isDark) {
    this.modules[y][x] = isDark;
    this.isFunction[y][x] = true;
  };

  QrCode.prototype.drawFunctionPatterns = function () {
    var size = this.size, i, j;

    for (i = 0; i < size; i++) {
      this.setFunctionModule(6, i, i % 2 === 0);
      this.setFunctionModule(i, 6, i % 2 === 0);
    }

    this.drawFinderPattern(3, 3);
    this.drawFinderPattern(size - 4, 3);
    this.drawFinderPattern(3, size - 4);

    var pos = getAlignmentPatternPositions(this.version);
    for (i = 0; i < pos.length; i++) {
      for (j = 0; j < pos.length; j++) {
        var corner = (i === 0 && j === 0)
          || (i === 0 && j === pos.length - 1)
          || (i === pos.length - 1 && j === 0);
        if (!corner) this.drawAlignmentPattern(pos[i], pos[j]);
      }
    }

    this.drawFormatBits(0); // placeholder, rewritten once the mask is chosen
    this.drawVersion();
  };

  QrCode.prototype.drawFinderPattern = function (x, y) {
    for (var dy = -4; dy <= 4; dy++) {
      for (var dx = -4; dx <= 4; dx++) {
        var dist = Math.max(Math.abs(dx), Math.abs(dy));
        var xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
          this.setFunctionModule(xx, yy, dist !== 2 && dist !== 4);
        }
      }
    }
  };

  QrCode.prototype.drawAlignmentPattern = function (x, y) {
    for (var dy = -2; dy <= 2; dy++) {
      for (var dx = -2; dx <= 2; dx++) {
        this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  };

  QrCode.prototype.drawFormatBits = function (mask) {
    var size = this.size, i;
    var data = (ECC_FORMAT_BITS[this.ecc] << 3) | mask;
    var rem = data;
    for (i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    var bits = ((data << 10) | rem) ^ 0x5412;

    for (i = 0; i <= 5; i++) this.setFunctionModule(8, i, getBit(bits, i));
    this.setFunctionModule(8, 7, getBit(bits, 6));
    this.setFunctionModule(8, 8, getBit(bits, 7));
    this.setFunctionModule(7, 8, getBit(bits, 8));
    for (i = 9; i < 15; i++) this.setFunctionModule(14 - i, 8, getBit(bits, i));

    for (i = 0; i < 8; i++) this.setFunctionModule(size - 1 - i, 8, getBit(bits, i));
    for (i = 8; i < 15; i++) this.setFunctionModule(8, size - 15 + i, getBit(bits, i));
    this.setFunctionModule(8, size - 8, true); // always-dark module
  };

  QrCode.prototype.drawVersion = function () {
    if (this.version < 7) return;
    var rem = this.version;
    for (var i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    var bits = (this.version << 12) | rem;
    for (i = 0; i < 18; i++) {
      var bit = getBit(bits, i);
      var a = this.size - 11 + (i % 3);
      var b = Math.floor(i / 3);
      this.setFunctionModule(a, b, bit);
      this.setFunctionModule(b, a, bit);
    }
  };

  QrCode.prototype.drawCodewords = function (data) {
    var size = this.size, i = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5; // skip the vertical timing column
      for (var vert = 0; vert < size; vert++) {
        for (var j = 0; j < 2; j++) {
          var x = right - j;
          var upward = ((right + 1) & 2) === 0;
          var y = upward ? size - 1 - vert : vert;
          if (!this.isFunction[y][x] && i < data.length * 8) {
            this.modules[y][x] = getBit(data[i >>> 3], 7 - (i & 7));
            i++;
          }
          // Remaining modules past the data stream stay light, as the standard requires.
        }
      }
    }
  };

  QrCode.prototype.applyMask = function (mask) {
    for (var y = 0; y < this.size; y++) {
      for (var x = 0; x < this.size; x++) {
        if (this.isFunction[y][x]) continue;
        var invert;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (x + y) % 3 === 0; break;
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invert = (x * y) % 2 + (x * y) % 3 === 0; break;
          case 6: invert = ((x * y) % 2 + (x * y) % 3) % 2 === 0; break;
          case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
        }
        if (invert) this.modules[y][x] = !this.modules[y][x];
      }
    }
  };

  QrCode.prototype.getPenaltyScore = function () {
    var size = this.size, result = 0, x, y;

    // Rule 1 + rule 3, scanned per row.
    for (y = 0; y < size; y++) {
      var runColor = false, runLen = 0, history = [0, 0, 0, 0, 0, 0, 0];
      for (x = 0; x < size; x++) {
        if (this.modules[y][x] === runColor) {
          runLen++;
          if (runLen === 5) result += PENALTY_N1;
          else if (runLen > 5) result++;
        } else {
          finderPenaltyAddHistory(runLen, history, size);
          if (!runColor) result += finderPenaltyCountPatterns(history) * PENALTY_N3;
          runColor = this.modules[y][x];
          runLen = 1;
        }
      }
      result += finderPenaltyTerminateAndCount(runColor, runLen, history, size) * PENALTY_N3;
    }

    // Same, per column.
    for (x = 0; x < size; x++) {
      var runColorV = false, runLenV = 0, historyV = [0, 0, 0, 0, 0, 0, 0];
      for (y = 0; y < size; y++) {
        if (this.modules[y][x] === runColorV) {
          runLenV++;
          if (runLenV === 5) result += PENALTY_N1;
          else if (runLenV > 5) result++;
        } else {
          finderPenaltyAddHistory(runLenV, historyV, size);
          if (!runColorV) result += finderPenaltyCountPatterns(historyV) * PENALTY_N3;
          runColorV = this.modules[y][x];
          runLenV = 1;
        }
      }
      result += finderPenaltyTerminateAndCount(runColorV, runLenV, historyV, size) * PENALTY_N3;
    }

    // Rule 2: solid 2x2 blocks.
    for (y = 0; y < size - 1; y++) {
      for (x = 0; x < size - 1; x++) {
        var color = this.modules[y][x];
        if (color === this.modules[y][x + 1] && color === this.modules[y + 1][x] && color === this.modules[y + 1][x + 1]) {
          result += PENALTY_N2;
        }
      }
    }

    // Rule 4: balance between dark and light modules.
    var dark = 0;
    for (y = 0; y < size; y++) {
      for (x = 0; x < size; x++) if (this.modules[y][x]) dark++;
    }
    var total = size * size;
    var k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    return result + k * PENALTY_N4;
  };

  function finderPenaltyCountPatterns(history) {
    var n = history[1];
    var core = n > 0 && history[2] === n && history[3] === n * 3 && history[4] === n && history[5] === n;
    return (core && history[0] >= n * 4 && history[6] >= n ? 1 : 0)
      + (core && history[6] >= n * 4 && history[0] >= n ? 1 : 0);
  }

  function finderPenaltyTerminateAndCount(currentRunColor, currentRunLength, history, size) {
    if (currentRunColor) {
      finderPenaltyAddHistory(currentRunLength, history, size);
      currentRunLength = 0;
    }
    currentRunLength += size; // the quiet zone counts as light modules
    finderPenaltyAddHistory(currentRunLength, history, size);
    return finderPenaltyCountPatterns(history);
  }

  function finderPenaltyAddHistory(currentRunLength, history, size) {
    if (history[0] === 0) currentRunLength += size;
    history.pop();
    history.unshift(currentRunLength);
  }

  function getBit(x, i) { return ((x >>> i) & 1) !== 0; }

  function getAlignmentPatternPositions(ver) {
    if (ver === 1) return [];
    var numAlign = Math.floor(ver / 7) + 2;
    var step = (ver === 32) ? 26 : Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
    var result = [6];
    for (var pos = ver * 4 + 10; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
    return result;
  }

  function addEccAndInterleave(version, ecc, data) {
    var numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecc][version];
    var blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecc][version];
    var rawCodewords = Math.floor(getNumRawDataModules(version) / 8);
    var numShortBlocks = numBlocks - rawCodewords % numBlocks;
    var shortBlockLen = Math.floor(rawCodewords / numBlocks);

    var blocks = [];
    var rsDiv = rsComputeDivisor(blockEccLen);
    for (var i = 0, k = 0; i < numBlocks; i++) {
      var dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
      k += dat.length;
      var eccBytes = rsComputeRemainder(dat, rsDiv);
      if (i < numShortBlocks) dat.push(0); // placeholder, skipped when interleaving
      blocks.push(dat.concat(eccBytes));
    }

    var result = [];
    for (var j = 0; j < blocks[0].length; j++) {
      for (var b = 0; b < blocks.length; b++) {
        if (j !== shortBlockLen - blockEccLen || b >= numShortBlocks) result.push(blocks[b][j]);
      }
    }
    return result;
  }

  // ---------- public entry point ----------

  function encode(text, eccName) {
    var ecc = ECC_INDEX[eccName];
    if (ecc === undefined) throw new Error("Unknown error correction level: " + eccName);
    if (text.length === 0) throw new Error("Nothing to encode");

    var seg = makeSegment(text);

    var version = null, dataCapacityBits = 0;
    for (var v = MIN_VERSION; v <= MAX_VERSION; v++) {
      var capacity = getNumDataCodewords(v, ecc) * 8;
      var used = 4 + charCountBits(seg.mode, v) + seg.bitLength;
      if (used <= capacity) { version = v; dataCapacityBits = capacity; break; }
    }
    if (version === null) {
      var err = new Error("Too much data for a QR code at this error correction level");
      err.code = "TOO_LONG";
      throw err;
    }

    var bits = [];
    appendBits(seg.mode.indicator, 4, bits);
    appendBits(seg.numChars, charCountBits(seg.mode, version), bits);
    segmentBits(seg, bits);

    appendBits(0, Math.min(4, dataCapacityBits - bits.length), bits); // terminator
    appendBits(0, (8 - bits.length % 8) % 8, bits);                   // pad to a byte
    for (var pad = 0xec; bits.length < dataCapacityBits; pad ^= 0xec ^ 0x11) {
      appendBits(pad, 8, bits);
    }

    var codewords = new Array(bits.length / 8).fill(0);
    for (var i = 0; i < bits.length; i++) {
      codewords[i >>> 3] |= bits[i] << (7 - (i & 7));
    }

    var code = new QrCode(version, ecc, codewords);
    code.mode = seg.mode === MODE_NUMERIC ? "numeric"
      : (seg.mode === MODE_ALPHANUMERIC ? "alphanumeric" : "byte");
    code.dataBitsUsed = 4 + charCountBits(seg.mode, version) + seg.bitLength;
    code.dataBitsAvailable = dataCapacityBits;
    return code;
  }

  global.QR = { encode: encode, ECC_LEVELS: ["L", "M", "Q", "H"] };
})(typeof window !== "undefined" ? window : this);
