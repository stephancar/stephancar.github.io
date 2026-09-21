/* QR Code Generator — UI. Depends on qr.js (window.QR). */

(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  var canvas = $("qr-canvas");
  var canvasBox = $("canvas-box");
  var statusEl = $("status");
  var btnPng = $("btn-png");
  var btnSvg = $("btn-svg");
  var btnCopy = $("btn-copy");
  var warnEl = $("contrast-warning");

  var placeholder = document.createElement("p");
  placeholder.className = "qr-empty";
  placeholder.textContent = "Nothing to encode yet.";
  placeholder.hidden = true;
  canvasBox.appendChild(placeholder);

  var state = { ecc: "M", quiet: 4, code: null, payload: "" };

  // ---------- payload builders ----------

  // WIFI: values are delimited by ; and :, so those characters (plus \ , and ")
  // have to be backslash-escaped inside a field.
  var WIFI_RESERVED = ["\\", ";", ",", ":", '"'];

  function escapeWifi(value) {
    var out = "";
    for (var i = 0; i < value.length; i++) {
      var ch = value.charAt(i);
      if (WIFI_RESERVED.indexOf(ch) >= 0) out += "\\";
      out += ch;
    }
    return out;
  }

  function buildPayload() {
    var pane = document.querySelector('.qr-tab[aria-selected="true"]').dataset.pane;

    if (pane === "text") {
      return $("in-text").value;
    }

    if (pane === "wifi") {
      var ssid = $("in-wifi-ssid").value;
      if (!ssid) return "";
      var type = $("in-wifi-type").value;
      var out = "WIFI:T:" + type + ";S:" + escapeWifi(ssid) + ";";
      if (type !== "nopass") out += "P:" + escapeWifi($("in-wifi-pass").value) + ";";
      if ($("in-wifi-hidden").checked) out += "H:true;";
      return out + ";";
    }

    if (pane === "email") {
      var to = $("in-mail-to").value.trim();
      if (!to) return "";
      var params = [];
      var subject = $("in-mail-subject").value;
      var body = $("in-mail-body").value;
      if (subject) params.push("subject=" + encodeURIComponent(subject));
      if (body) params.push("body=" + encodeURIComponent(body));
      return "mailto:" + encodeURIComponent(to).replace(/%40/g, "@")
        + (params.length ? "?" + params.join("&") : "");
    }

    if (pane === "sms") {
      var number = $("in-sms-number").value.replace(/[^\d+]/g, "");
      if (!number) return "";
      var text = $("in-sms-body").value;
      return "SMSTO:" + number + (text ? ":" + text : "");
    }

    return "";
  }

  // ---------- drawing ----------

  function drawPreview(code) {
    var n = code.size + state.quiet * 2;
    var scale = Math.max(1, Math.floor(512 / n));
    var px = n * scale;
    canvas.width = px;
    canvas.height = px;

    var ctx = canvas.getContext("2d");
    ctx.fillStyle = $("in-bg").value;
    ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = $("in-fg").value;
    for (var y = 0; y < code.size; y++) {
      for (var x = 0; x < code.size; x++) {
        if (code.isDark(x, y)) {
          ctx.fillRect((x + state.quiet) * scale, (y + state.quiet) * scale, scale, scale);
        }
      }
    }
  }

  // Renders at an exact multiple of the module size so no module gets a
  // half-pixel edge; the result is the closest whole size at or below target.
  function renderToCanvas(code, targetPx) {
    var n = code.size + state.quiet * 2;
    var scale = Math.max(1, Math.round(targetPx / n));
    var px = n * scale;
    var off = document.createElement("canvas");
    off.width = px;
    off.height = px;
    var ctx = off.getContext("2d");
    ctx.fillStyle = $("in-bg").value;
    ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = $("in-fg").value;
    for (var y = 0; y < code.size; y++) {
      for (var x = 0; x < code.size; x++) {
        if (code.isDark(x, y)) {
          ctx.fillRect((x + state.quiet) * scale, (y + state.quiet) * scale, scale, scale);
        }
      }
    }
    return off;
  }

  // One path, with horizontal runs merged, so the file stays small.
  function buildSvg(code) {
    var n = code.size + state.quiet * 2;
    var parts = [];
    for (var y = 0; y < code.size; y++) {
      var runStart = -1;
      for (var x = 0; x <= code.size; x++) {
        var dark = x < code.size && code.isDark(x, y);
        if (dark && runStart < 0) runStart = x;
        if (!dark && runStart >= 0) {
          parts.push("M" + (runStart + state.quiet) + " " + (y + state.quiet) + "h" + (x - runStart) + "v1h-" + (x - runStart) + "z");
          runStart = -1;
        }
      }
    }
    return '<?xml version="1.0" encoding="UTF-8"?>\n'
      + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + " " + n + '" '
      + 'width="' + n * 8 + '" height="' + n * 8 + '" shape-rendering="crispEdges">\n'
      + '  <rect width="' + n + '" height="' + n + '" fill="' + $("in-bg").value + '"/>\n'
      + '  <path fill="' + $("in-fg").value + '" d="' + parts.join("") + '"/>\n'
      + "</svg>\n";
  }

  // ---------- contrast check ----------

  function luminance(hex) {
    var channels = [
      parseInt(hex.substr(1, 2), 16),
      parseInt(hex.substr(3, 2), 16),
      parseInt(hex.substr(5, 2), 16)
    ].map(function (v) {
      var c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function checkContrast() {
    var fg = luminance($("in-fg").value);
    var bg = luminance($("in-bg").value);
    var ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
    // Inverted codes (light modules on a dark field) trip up plenty of
    // scanners too, so flag those regardless of ratio.
    warnEl.hidden = ratio >= 4 && fg < bg;
  }

  // ---------- main update ----------

  function setEnabled(on) {
    btnPng.disabled = !on;
    btnSvg.disabled = !on;
    btnCopy.disabled = !on;
  }

  function update() {
    checkContrast();

    var payload = buildPayload();
    state.payload = payload;

    if (!payload) {
      state.code = null;
      canvas.hidden = true;
      placeholder.hidden = false;
      placeholder.textContent = "Nothing to encode yet.";
      statusEl.textContent = "";
      statusEl.classList.remove("qr-status--error");
      setEnabled(false);
      return;
    }

    var code;
    try {
      code = window.QR.encode(payload, state.ecc);
    } catch (err) {
      state.code = null;
      canvas.hidden = true;
      placeholder.hidden = false;
      placeholder.textContent = err.code === "TOO_LONG"
        ? "Too long for one QR code. Shorten the text, or drop to a lower error correction level."
        : "Could not encode this.";
      statusEl.textContent = "";
      statusEl.classList.add("qr-status--error");
      setEnabled(false);
      return;
    }

    state.code = code;
    placeholder.hidden = true;
    canvas.hidden = false;
    drawPreview(code);

    var used = Math.round((code.dataBitsUsed / code.dataBitsAvailable) * 100);
    statusEl.classList.remove("qr-status--error");
    statusEl.textContent = "Version " + code.version + " · " + code.size + "×" + code.size
      + " modules · " + code.mode + " mode · level " + state.ecc + " · " + used + "% of capacity used";
    setEnabled(true);
  }

  // ---------- downloads ----------

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  btnPng.addEventListener("click", function () {
    if (!state.code) return;
    var off = renderToCanvas(state.code, parseInt($("in-size").value, 10));
    off.toBlob(function (blob) { downloadBlob(blob, "qr-code.png"); }, "image/png");
  });

  btnSvg.addEventListener("click", function () {
    if (!state.code) return;
    downloadBlob(new Blob([buildSvg(state.code)], { type: "image/svg+xml" }), "qr-code.svg");
  });

  if (navigator.clipboard && typeof window.ClipboardItem === "function") {
    btnCopy.hidden = false;
    btnCopy.addEventListener("click", function () {
      if (!state.code) return;
      var off = renderToCanvas(state.code, parseInt($("in-size").value, 10));
      off.toBlob(function (blob) {
        navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })]).then(function () {
          var previous = btnCopy.textContent;
          btnCopy.textContent = "Copied!";
          setTimeout(function () { btnCopy.textContent = previous; }, 1500);
        }).catch(function () {
          btnCopy.textContent = "Copy failed";
          setTimeout(function () { btnCopy.textContent = "Copy image"; }, 1500);
        });
      }, "image/png");
    });
  }

  // ---------- wiring ----------

  Array.prototype.forEach.call(document.querySelectorAll(".qr-tab"), function (tab) {
    tab.addEventListener("click", function () {
      Array.prototype.forEach.call(document.querySelectorAll(".qr-tab"), function (other) {
        var selected = other === tab;
        other.setAttribute("aria-selected", String(selected));
        $("pane-" + other.dataset.pane).hidden = !selected;
      });
      var firstField = $("pane-" + tab.dataset.pane).querySelector("input, textarea, select");
      if (firstField) firstField.focus();
      update();
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll(".qr-seg"), function (seg) {
    seg.addEventListener("click", function () {
      state.ecc = seg.dataset.ecc;
      Array.prototype.forEach.call(document.querySelectorAll(".qr-seg"), function (other) {
        other.setAttribute("aria-pressed", String(other === seg));
      });
      update();
    });
  });

  $("in-quiet").addEventListener("input", function () {
    state.quiet = parseInt(this.value, 10);
    $("out-quiet").textContent = this.value;
    update();
  });

  // Disabling the password field for open networks avoids a confusing dead input.
  $("in-wifi-type").addEventListener("change", function () {
    $("in-wifi-pass").disabled = this.value === "nopass";
  });

  Array.prototype.forEach.call(
    document.querySelectorAll(".qr-pane input, .qr-pane textarea, .qr-pane select, #in-fg, #in-bg"),
    function (el) {
      el.addEventListener("input", update);
      el.addEventListener("change", update);
    }
  );

  update();
})();
