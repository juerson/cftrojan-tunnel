// src/worker.js
import { connect } from "cloudflare:sockets";

// src/sha224.js
function sha224Encrypt(str) {
  if (typeof str !== "string") throw new TypeError("sha224Encrypt: input must be a string");
  const K = [
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
  const H = [3238371032, 914150663, 812702999, 4144912697, 4290775857, 1750603025, 1694076839, 3204075428];
  function R(x, n) {
    return x >>> n | x << 32 - n;
  }
  const m = new TextEncoder().encode(str);
  const l = m.length * 8;
  const padLen = m.length + 9 + 63 >> 6 << 6;
  const buf = new Uint8Array(padLen);
  buf.set(m);
  buf[m.length] = 128;
  new DataView(buf.buffer).setUint32(buf.length - 4, l, false);
  const w = new Uint32Array(64), h = H.slice();
  for (let i = 0; i < buf.length; i += 64) {
    const view = new DataView(buf.buffer, i, 64);
    for (let j = 0; j < 16; j++) w[j] = view.getUint32(j * 4);
    for (let j = 16; j < 64; j++) {
      const s0 = R(w[j - 15], 7) ^ R(w[j - 15], 18) ^ w[j - 15] >>> 3;
      const s1 = R(w[j - 2], 17) ^ R(w[j - 2], 19) ^ w[j - 2] >>> 10;
      w[j] = w[j - 16] + s0 + w[j - 7] + s1 >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let j = 0; j < 64; j++) {
      const S1 = R(e, 6) ^ R(e, 11) ^ R(e, 25), ch = e & f ^ ~e & g;
      const temp1 = hh + S1 + ch + K[j] + w[j] >>> 0;
      const S0 = R(a, 2) ^ R(a, 13) ^ R(a, 22), maj = a & b ^ a & c ^ b & c;
      const temp2 = S0 + maj >>> 0;
      [hh, g, f, e, d, c, b, a] = [g, f, e, d + temp1 >>> 0, c, b, a, temp1 + temp2 >>> 0];
    }
    h[0] = h[0] + a >>> 0;
    h[1] = h[1] + b >>> 0;
    h[2] = h[2] + c >>> 0;
    h[3] = h[3] + d >>> 0;
    h[4] = h[4] + e >>> 0;
    h[5] = h[5] + f >>> 0;
    h[6] = h[6] + g >>> 0;
    h[7] = h[7] + hh >>> 0;
  }
  return h.slice(0, 7).map((x) => x.toString(16).padStart(8, "0")).join("");
}

// src/address.js
function parseHostPort(s) {
  const v = (x) => {
    x = +x;
    return x >= 1 && x <= 65535 ? x : 443;
  };
  let h, p = 443, i;
  if (s[0] === "[") {
    if ((i = s.indexOf("]")) === -1) return { hostname: null, port: null };
    h = s.slice(0, i + 1);
    if (s[i + 1] === ":") p = v(s.slice(i + 2));
  } else if ((i = s.lastIndexOf(":")) !== -1 && s.indexOf(":") === i) {
    h = s.slice(0, i);
    p = v(s.slice(i + 1));
  } else h = s;
  return { hostname: h, port: p };
}

// src/worker.js
var landingAddress = "";
var nat64IPv6Prefix = `${["2001", "67c", "2960", "6464"].join(":")}::`;
var plaintextPassword = "a1234567";
var sha224Password = sha224Encrypt(plaintextPassword);
var parsedLandingAddr = { hostname: null, port: null };
var domainList = [
  "https://www.bilibili.com",
  "https://www.nicovideo.jp",
  "https://tv.naver.com",
  "https://www.hotstar.com",
  "https://www.netflix.com",
  "https://www.dailymotion.com",
  "https://www.youtube.com",
  "https://www.hulu.com",
  "https://fmovies.llc",
  "https://hdtodayz.to",
  "https://radar.cloudflare.com"
];
var worker_default = {
  async fetch(request, env, ctx) {
    try {
      nat64IPv6Prefix = env.NAT64_IPV6PREFIX || nat64IPv6Prefix;
      let poxyAddr = env.LANDING_ADDRESS || landingAddress;
      let password = env.PASS_CODE || plaintextPassword;
      if (password !== plaintextPassword) sha224Password = sha224Encrypt(password);
      const url = new URL(request.url);
      const path = url.pathname;
      const upgradeHeader = request.headers.get("Upgrade");
      if (!upgradeHeader || upgradeHeader !== "websocket") {
        if (path === "/") {
          const randomDomain = domainList[Math.floor(Math.random() * domainList.length)];
          const redirectResponse = new Response("", { status: 301, headers: { Location: randomDomain } });
          return redirectResponse;
        } else {
          return new Response("404 Not Found!", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        }
      } else {
        if (path.includes("/pyip=")) poxyAddr = path.split("/pyip=")[1];
        let parsedAddr = parseHostPort(poxyAddr);
        parsedLandingAddr = { hostname: parsedAddr?.hostname, port: parsedAddr?.port };
        return await handleWebSocket(request);
      }
    } catch (err) {
      return new Response(err.toString());
    }
  }
};
async function handleWebSocket(request) {
  const webSocketPair = new WebSocketPair();
  const [client, webSocket] = Object.values(webSocketPair);
  webSocket.accept();
  let address = "";
  let portWithRandomLog = "";
  const log = (info, event) => {
  };
  const earlyDataHeader = request.headers.get("sec-websocket-protocol") || "";
  const readableWebSocketStream = makeReadableWebSocketStream(webSocket, earlyDataHeader, log);
  let remoteSocketWrapper = {
    value: null,
    writer: null
  };
  readableWebSocketStream.pipeTo(
    new WritableStream({
      async write(chunk, controller) {
        if (remoteSocketWrapper.writer) {
          await remoteSocketWrapper.writer.write(chunk);
          return;
        }
        if (remoteSocketWrapper.value) {
          remoteSocketWrapper.writer = remoteSocketWrapper.value.writable.getWriter();
          await remoteSocketWrapper.writer.write(chunk);
          return;
        }
        let headerInfo = await parseNaj0rtHeader(chunk, sha224Password);
        if (!headerInfo || headerInfo.hasError) {
          log(`Invalid header info: ${headerInfo?.message || "Unknown error"}`);
          return;
        }
        address = headerInfo?.addressRemote;
        portWithRandomLog = `${headerInfo?.portRemote}--${Math.random()} tcp`;
        handleTCPOutBound(remoteSocketWrapper, address, headerInfo?.portRemote, headerInfo?.rawClientData, webSocket, log);
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
  return new Response(null, { status: 101, webSocket: client });
}
async function parseNaj0rtHeader(buffer, sha224Password2) {
  if (buffer.byteLength < 56) return { hasError: true, message: "invalid data" };
  let crLfIndex = 56;
  if (new Uint8Array(buffer.slice(56, 57))[0] !== 13 || new Uint8Array(buffer.slice(57, 58))[0] !== 10) {
    return { hasError: true, message: "invalid header format (missing CR LF)" };
  }
  const password = new TextDecoder().decode(buffer.slice(0, crLfIndex));
  if (password !== sha224Password2) return { hasError: true, message: "invalid password" };
  const socks5DataBuffer = buffer.slice(crLfIndex + 2);
  if (socks5DataBuffer.byteLength < 6) return { hasError: true, message: "invalid SOCKS5 request data" };
  const view = new DataView(socks5DataBuffer);
  const cmd = view.getUint8(0);
  if (cmd !== 1) return { hasError: true, message: "unsupported command, only TCP (CONNECT) is allowed" };
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
      return { hasError: true, message: `invalid addressType is ${atype}` };
  }
  if (!address) return { hasError: true, message: `address is empty, addressType is ${atype}` };
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
  async function connectAndSend(host, port) {
    const tcpSocket2 = connect({ hostname: host, port });
    remoteSocket.value = tcpSocket2;
    log(`connected to ${host}:${port}`);
    const writer = tcpSocket2.writable.getWriter();
    await writer.write(rawClientData);
    writer.releaseLock();
    return tcpSocket2;
  }
  async function retry() {
    const { address, port } = await resolveTargetAddress(addressRemote, portRemote);
    const tcpSocket2 = await connectAndSend(address, port);
    tcpSocket2.closed.catch((err) => void 0).finally(() => safeCloseWebSocket(ws));
    remoteSocketToWS(tcpSocket2, webSocket, null, log);
  }
  const tcpSocket = await connectAndSend(addressRemote, portRemote);
  remoteSocketToWS(tcpSocket, webSocket, retry, log);
}
async function resolveTargetAddress(addressRemote, portRemote, serverAddr = parsedLandingAddr) {
  if (serverAddr?.hostname) {
    return {
      address: serverAddr.hostname,
      port: serverAddr.port || portRemote
    };
  } else {
    const nat64Address = await getNAT64IPv6Addr(addressRemote);
    return {
      address: nat64Address || addressRemote,
      port: portRemote
    };
  }
}
async function getNAT64IPv6Addr(addressRemote, prefix = nat64IPv6Prefix) {
  if (typeof addressRemote !== "string" || !addressRemote.trim()) return "";
  try {
    const response = await fetch(`https://1.1.1.1/dns-query?name=${addressRemote}&type=A`, {
      headers: { Accept: "application/dns-json" }
    });
    if (!response.ok) return "";
    const data = await response.json();
    const ipv4 = data.Answer?.find((r) => r.type === 1)?.data;
    if (!ipv4) return "";
    const parts = ipv4.split(".");
    if (parts.length !== 4) return "";
    const hexParts = parts.map((p) => {
      const num = Number(p);
      if (!Number.isInteger(num) || num < 0 || num > 255) return null;
      return num.toString(16).padStart(2, "0");
    });
    if (hexParts.includes(null)) return "";
    const ipv6 = `${prefix}${hexParts[0]}${hexParts[1]}:${hexParts[2]}${hexParts[3]}`;
    return `[${ipv6}]`;
  } catch {
    return "";
  }
}
function makeReadableWebSocketStream(webSocket, earlyDataHeader, log) {
  let canceled = false;
  const stream = new ReadableStream({
    start(controller) {
      webSocket.addEventListener("message", (e) => {
        if (!canceled) controller.enqueue(e.data);
      });
      webSocket.addEventListener("close", () => {
        if (!canceled) controller.close();
        safeCloseWebSocket(webSocket);
      });
      webSocket.addEventListener("error", (err) => {
        log("WebSocket error");
        controller.error(err);
      });
      const { earlyData, error } = base64ToArrayBuffer(earlyDataHeader);
      if (error) controller.error(error);
      else if (earlyData) controller.enqueue(earlyData);
    },
    cancel(reason) {
      if (canceled) return;
      canceled = true;
      log(`ReadableStream canceled: ${reason}`);
      safeCloseWebSocket(webSocket);
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
      async write(chunk, controller) {
        hasIncomingData = true;
        if (webSocket.readyState !== WebSocket.OPEN) {
          controller.error("webSocket connection is not open");
        }
        webSocket.send(chunk);
      },
      close() {
        log(`remoteSocket.readable is closed, hasIncomingData: ${hasIncomingData}`);
      },
      abort(reason) {
      }
    })
  ).catch((error) => {
    safeCloseWebSocket(webSocket);
  });
  if (hasIncomingData === false && retry) {
    log(`retry`);
    retry();
  }
}
function base64ToArrayBuffer(base64Str) {
  if (!base64Str) return { earlyData: null, error: null };
  try {
    const normalized = base64Str.replace(/-/g, "+").replace(/_/g, "/");
    const binaryStr = atob(normalized);
    const len = binaryStr.length;
    const buffer = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      buffer[i] = binaryStr.charCodeAt(i);
    }
    return { earlyData: buffer.buffer, error: null };
  } catch (error) {
    return { earlyData: null, error };
  }
}
function safeCloseWebSocket(ws2, code = 1e3, reason = "Normal Closure") {
  try {
    if (ws2.readyState === WebSocket.OPEN || ws2.readyState === WebSocket.CONNECTING) {
      ws2.close(code, reason);
    }
  } catch (e) {
  }
}
export {
  worker_default as default
};
