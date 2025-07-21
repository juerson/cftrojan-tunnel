import { connect } from 'cloudflare:sockets';
const { hash224Encrypt, isValidSHA224 } = require('./sha224');
const { parseHostPort } = require('./addressHandle');

const landingAddress = '';
let nat64IPv6Prefix = '2001:67c:2960:6464::';
const plaintextPassword = 'a1234567';
let sha224Password = hash224Encrypt(plaintextPassword);
let parsedLandingAddr = { hostname: null, port: null };

const domainList = [
	'https://www.bilibili.com',
	'https://www.nicovideo.jp',
	'https://tv.naver.com',
	'https://www.hotstar.com',
	'https://www.netflix.com',
	'https://www.dailymotion.com',
	'https://www.youtube.com',
	'https://www.hulu.com',
	'https://fmovies.llc',
	'https://hdtodayz.to',
	'https://radar.cloudflare.com',
];

const worker_default = {
	async fetch(request, env, ctx) {
		try {
			/**
			 * 只有poxyAddr（也就是大家公认的PROXYIP）不存在才使用它
			 * 利用DNS64服务器进行网络地址与协议转换时，同时作为PROXYIP使用
			 *
			 * 优先级：
			 *   客户端的path"/pyip=xxx" > cf 环境变量设置的LANDING_ADDRESS > 代码中的landingAddress > NAT64_IPV6PREFIX > nat64IPv6Prefix
			 */
			nat64IPv6Prefix = env.NAT64_IPV6PREFIX || nat64IPv6Prefix;
			let poxyAddr = env.LANDING_ADDRESS || landingAddress;
			let password = env.PASS_CODE || plaintextPassword;

			if (password !== plaintextPassword) sha224Password = hash224Encrypt(password);
			if (!isValidSHA224(sha224Password)) throw new Error('sha224Password is not valid');

			const url = new URL(request.url);
			const path = url.pathname;

			const upgradeHeader = request.headers.get('Upgrade');
			if (!upgradeHeader || upgradeHeader !== 'websocket') {
				if (path === '/') {
					const randomDomain = domainList[Math.floor(Math.random() * domainList.length)];
					const redirectResponse = new Response('', {
						status: 301,
						headers: { Location: randomDomain },
					});
					return redirectResponse;
				} else {
					return new Response('404 Not Found', {
						status: 404,
						headers: { 'Content-Type': 'text/plain; charset=utf-8' },
					});
				}
			} else {
				// 仅支持host、[ipv6]、host:port格式
				if (path.includes('/pyip=')) poxyAddr = path.split('/pyip=')[1];

				let parsedAddr = parseHostPort(poxyAddr);
				parsedLandingAddr = { hostname: parsedAddr?.hostname, port: parsedAddr?.port };

				return await handleWebSocket(request);
			}
		} catch (err) {
			return new Response(err.toString());
		}
	},
};

async function handleWebSocket(request) {
	const webSocketPair = new WebSocketPair();
	const [client, webSocket] = Object.values(webSocketPair);
	webSocket.accept();

	let address = '';
	let portWithRandomLog = '';

	const log = (info, event) => {
		console.log(`[${address}:${portWithRandomLog}] ${info}`, event || '');
	};

	const earlyDataHeader = request.headers.get('sec-websocket-protocol') || '';
	const readableWebSocketStream = makeReadableWebSocketStream(webSocket, earlyDataHeader, log);

	let remoteSocketWrapper = {
		value: null,
		writer: null,
	};

	readableWebSocketStream
		.pipeTo(
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
						log(`Invalid header info: ${headerInfo?.message || 'Unknown error'}`);
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
				},
			})
		)
		.catch((err) => {
			log('readableWebSocketStream pipeTo error', err);
		});

	return new Response(null, { status: 101, webSocket: client });
}

async function parseNaj0rtHeader(buffer, sha224Password) {
	if (buffer.byteLength < 56) return { hasError: true, message: 'invalid data' };
	let crLfIndex = 56;
	if (new Uint8Array(buffer.slice(56, 57))[0] !== 0x0d || new Uint8Array(buffer.slice(57, 58))[0] !== 0x0a) {
		return { hasError: true, message: 'invalid header format (missing CR LF)' };
	}
	const password = new TextDecoder().decode(buffer.slice(0, crLfIndex));
	if (password !== sha224Password) return { hasError: true, message: 'invalid password' };

	const socks5DataBuffer = buffer.slice(crLfIndex + 2);
	if (socks5DataBuffer.byteLength < 6) return { hasError: true, message: 'invalid SOCKS5 request data' };

	const view = new DataView(socks5DataBuffer);
	const cmd = view.getUint8(0);
	if (cmd !== 1) return { hasError: true, message: 'unsupported command, only TCP (CONNECT) is allowed' };

	const atype = view.getUint8(1);
	// 0x01: IPv4 address
	// 0x03: Domain name
	// 0x04: IPv6 address
	let addressLength = 0;
	let addressIndex = 2;
	let address = '';
	switch (atype) {
		case 1:
			addressLength = 4;
			address = new Uint8Array(socks5DataBuffer.slice(addressIndex, addressIndex + addressLength)).join('.');
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
			address = ipv6.join(':');
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
		rawClientData: socks5DataBuffer.slice(portIndex + 4),
	};
}

async function handleTCPOutBound(remoteSocket, addressRemote, portRemote, rawClientData, webSocket, log) {
	async function connectAndSend(host, port) {
		const tcpSocket = connect({ hostname: host, port });
		remoteSocket.value = tcpSocket;
		log(`connected to ${host}:${port}`);
		const writer = tcpSocket.writable.getWriter();
		await writer.write(rawClientData);
		writer.releaseLock();
		return tcpSocket;
	}

	async function retry() {
		const { address, port } = await resolveTargetAddress(addressRemote, portRemote);

		const tcpSocket = await connectAndSend(address, port);
		tcpSocket.closed.catch((err) => console.log('retry socket closed error', err)).finally(() => safeCloseWebSocket(ws));

		remoteSocketToWS(tcpSocket, webSocket, null, log);
	}

	const tcpSocket = await connectAndSend(addressRemote, portRemote);
	remoteSocketToWS(tcpSocket, webSocket, retry, log);
}

async function resolveTargetAddress(addressRemote, portRemote, serverAddr = parsedLandingAddr) {
	if (serverAddr?.hostname) {
		return {
			address: serverAddr.hostname,
			port: serverAddr.port || portRemote,
		};
	} else {
		const nat64Address = await getNAT64IPv6Addr(addressRemote);
		return {
			address: nat64Address || addressRemote,
			port: portRemote,
		};
	}
}

async function getNAT64IPv6Addr(addressRemote, prefix = nat64IPv6Prefix) {
	if (typeof addressRemote !== 'string' || !addressRemote.trim()) return '';

	try {
		const response = await fetch(`https://1.1.1.1/dns-query?name=${addressRemote}&type=A`, {
			headers: { Accept: 'application/dns-json' },
		});

		if (!response.ok) return '';
		const data = await response.json();
		const ipv4 = data.Answer?.find((r) => r.type === 1)?.data;
		if (!ipv4) return '';

		const parts = ipv4.split('.');
		if (parts.length !== 4) return '';

		const hexParts = parts.map((p) => {
			const num = Number(p);
			if (!Number.isInteger(num) || num < 0 || num > 255) return null;
			return num.toString(16).padStart(2, '0');
		});

		if (hexParts.includes(null)) return '';

		const ipv6 = `${prefix}${hexParts[0]}${hexParts[1]}:${hexParts[2]}${hexParts[3]}`;
		return `[${ipv6}]`;
	} catch {
		return '';
	}
}

function makeReadableWebSocketStream(webSocket, earlyDataHeader, log) {
	let canceled = false;

	const stream = new ReadableStream({
		start(controller) {
			webSocket.addEventListener('message', (e) => {
				if (!canceled) controller.enqueue(e.data);
			});
			webSocket.addEventListener('close', () => {
				if (!canceled) controller.close();
				safeCloseWebSocket(webSocket);
			});
			webSocket.addEventListener('error', (err) => {
				log('WebSocket error');
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
		},
	});

	return stream;
}

async function remoteSocketToWS(remoteSocket, webSocket, retry, log) {
	let hasIncomingData = false;
	await remoteSocket.readable
		.pipeTo(
			new WritableStream({
				start() {},
				async write(chunk, controller) {
					hasIncomingData = true;
					if (webSocket.readyState !== WebSocket.OPEN) {
						controller.error('webSocket connection is not open');
					}
					webSocket.send(chunk);
				},
				close() {
					log(`remoteSocket.readable is closed, hasIncomingData: ${hasIncomingData}`);
				},
				abort(reason) {
					console.error('remoteSocket.readable abort', reason);
				},
			})
		)
		.catch((error) => {
			console.error(`remoteSocketToWS error:`, error.stack || error);
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
		// 标准化 Base64 字符串
		const normalized = base64Str.replace(/-/g, '+').replace(/_/g, '/');
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

function safeCloseWebSocket(ws, code = 1000, reason = 'Normal Closure') {
	try {
		if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
			ws.close(code, reason);
		}
	} catch (e) {
		console.error('Failed close WebSocket', e);
	}
}

export { worker_default as default };
