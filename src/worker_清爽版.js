import { connect } from 'cloudflare:sockets';
const { hash224encrypt, isValidSHA224 } = require('./sha224');
const { isValidlandingAddr, parselandingAddr } = require('./addressHandle');

let landingAddress = '';
let plaintextPassword = 'a1234567';
let sha224Password = hash224encrypt(plaintextPassword);

const domainList = [
	'https://www.iq.com',
	'https://www.dell.com',
	'https://www.bilibili.com',
	'https://www.wix.com/',
	'https://landingsite.ai/',
	'https://www.pexels.com/',
	'https://www.revid.ai/',
];

const worker_default = {
	async fetch(request, env, ctx) {
		try {
			landingAddress = env.LANDING_ADDRESS || landingAddress;
			let password = env.PASS_CODE || plaintextPassword;
			if (password !== plaintextPassword) {
				sha224Password = hash224encrypt(password);
			}

			if (!isValidSHA224(sha224Password)) {
				throw new Error('sha224Password is not valid');
			}

			const upgradeHeader = request.headers.get('Upgrade');
			const url = new URL(request.url);
			if (!upgradeHeader || upgradeHeader !== 'websocket') {
				switch (url.pathname) {
					case '/':
						const randomDomain = domainList[Math.floor(Math.random() * domainList.length)];
						const redirectResponse = new Response('', {
							status: 301,
							headers: {
								Location: randomDomain,
							},
						});
						return redirectResponse;
					default:
						return new Response('警告：您没有相关的权限访问！', {
							status: 200,
							headers: {
								'Content-Type': 'text/plain;charset=utf-8',
							},
						});
				}
			} else {
				const pathString = url.pathname;
				if (pathString.includes('/pyip=')) {
					const pathToLandingAddr = pathString.split('=')[1];
					if (isValidlandingAddr(pathToLandingAddr)) {
						landingAddress = pathToLandingAddr;
					}
				}
				return await a1(request);
			}
		} catch (err) {
			let e = err;
			return new Response(e.toString());
		}
	},
};

async function a1(request) {
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
	let remoteSocketWapper = {
		value: null,
	};
	let udpStreamWrite = null;

	readableWebSocketStream
		.pipeTo(
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

					const { hasError, message, addressRemote = '', portRemote = 443, rawClientData } = await parseTr0janHeader(chunk);

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
				},
			})
		)
		.catch((err) => {
			log('readableWebSocketStream pipeTo error', err);
		});
	return new Response(null, {
		status: 101,
		webSocket: client,
	});
}

async function parseTr0janHeader(buffer) {
	if (buffer.byteLength < 56) {
		return {
			hasError: true,
			message: 'invalid data',
		};
	}
	let crLfIndex = 56;
	if (new Uint8Array(buffer.slice(56, 57))[0] !== 0x0d || new Uint8Array(buffer.slice(57, 58))[0] !== 0x0a) {
		return {
			hasError: true,
			message: 'invalid header format (missing CR LF)',
		};
	}
	const password = new TextDecoder().decode(buffer.slice(0, crLfIndex));
	if (password !== sha224Password) {
		return {
			hasError: true,
			message: 'invalid password',
		};
	}

	const socks5DataBuffer = buffer.slice(crLfIndex + 2);
	if (socks5DataBuffer.byteLength < 6) {
		return {
			hasError: true,
			message: 'invalid SOCKS5 request data',
		};
	}

	const view = new DataView(socks5DataBuffer);
	const cmd = view.getUint8(0);
	if (cmd !== 1) {
		return {
			hasError: true,
			message: 'unsupported command, only TCP (CONNECT) is allowed',
		};
	}

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
			return {
				hasError: true,
				message: `invalid addressType is ${atype}`,
			};
	}

	if (!address) {
		return {
			hasError: true,
			message: `address is empty, addressType is ${atype}`,
		};
	}

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
	async function connectAndWrite(address, port) {
		let tcpSocket2 = connect({
			hostname: address,
			port: port,
		});
		remoteSocket.value = tcpSocket2;
		log(`connected to ${address}:${port}`);
		const writer = tcpSocket2.writable.getWriter();
		await writer.write(rawClientData);
		writer.releaseLock();
		return tcpSocket2;
	}
	async function retry() {
		// 分离host和port（支持"域名、IPv4、[IPv6]、域名:端口、IPv4:端口、[IPv6]:端口"）
		let landingAddrJson = parselandingAddr(landingAddress);
		let host = landingAddrJson.host || addressRemote;
		let port = landingAddrJson.port || portRemote;

		const tcpSocket2 = await connectAndWrite(host, port);
		tcpSocket2.closed
			.catch((error) => {
				console.log('retry tcpSocket closed error', error);
			})
			.finally(() => {
				safeCloseWebSocket(webSocket);
			});
		remoteSocketToWS(tcpSocket2, webSocket, null, log);
	}
	const tcpSocket2 = await connectAndWrite(addressRemote, portRemote);
	remoteSocketToWS(tcpSocket2, webSocket, retry, log);
}

function makeReadableWebSocketStream(webSocketServer, earlyDataHeader, log) {
	let readableStreamCancel = false;
	const stream = new ReadableStream({
		start(controller) {
			webSocketServer.addEventListener('message', (event) => {
				if (readableStreamCancel) {
					return;
				}
				const message = event.data;
				controller.enqueue(message);
			});
			webSocketServer.addEventListener('close', () => {
				safeCloseWebSocket(webSocketServer);
				if (readableStreamCancel) {
					return;
				}
				controller.close();
			});
			webSocketServer.addEventListener('error', (err) => {
				log('webSocketServer error');
				controller.error(err);
			});
			const { earlyData, error } = base64ToArrayBuffer(earlyDataHeader);
			if (error) {
				controller.error(error);
			} else if (earlyData) {
				controller.enqueue(earlyData);
			}
		},
		pull(controller) {},
		cancel(reason) {
			if (readableStreamCancel) {
				return;
			}
			log(`readableStream was canceled, due to ${reason}`);
			readableStreamCancel = true;
			safeCloseWebSocket(webSocketServer);
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
				/**
				 * @param {Uint8Array} chunk
				 * @param {*} controller
				 */
				async write(chunk, controller) {
					hasIncomingData = true;
					if (webSocket.readyState !== WS_READY_STATE_OPEN) {
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
	if (!base64Str) {
		return {
			error: null,
		};
	}
	try {
		base64Str = base64Str.replace(/-/g, '+').replace(/_/g, '/');
		const decode = atob(base64Str);
		const arryBuffer = Uint8Array.from(decode, (c) => c.charCodeAt(0));
		return {
			earlyData: arryBuffer.buffer,
			error: null,
		};
	} catch (error) {
		return {
			error,
		};
	}
}

let WS_READY_STATE_OPEN = 1;
let WS_READY_STATE_CLOSING = 2;

function safeCloseWebSocket(socket) {
	try {
		if (socket.readyState === WS_READY_STATE_OPEN || socket.readyState === WS_READY_STATE_CLOSING) {
			socket.close();
		}
	} catch (error) {
		console.error('safeCloseWebSocket error', error);
	}
}

export { worker_default as default };
