import { connect } from 'cloudflare:sockets';
const { hash224encrypt, isValidSHA224 } = require('./sha224');
const { splitArrayEvenly, isValidProxyIP, parseProxyIP, getRandomElement } = require('./addressHandle');
const { fetchGitHubFile, fetchWebPageContent } = require('./crawler');
const { getTROJANConfig, buildTrojan, buildPrxyNameClashJSON } = require('./output');

let proxyList = ['bpb.yousef.isegaro.com', 'cdn-all.xn--b6gac.eu.org', 'cdn-b100.xn--b6gac.eu.org', 'proxyip.sg.fxxk.dedyn.io'];
let proxyIP = getRandomElement(proxyList);

let plaintextPassword = 'a1234567'; // 明文密码，没有经过sha224加密的密码
let sha224Password = hash224encrypt(plaintextPassword); // 经过sha224加密的密码

const domainList = [
	'https://www.iq.com',
	'https://www.dell.com',
	'https://www.bilibili.com',
	'https://www.wix.com/',
	'https://landingsite.ai/',
	'https://vimeo.com/',
	'https://www.pexels.com/',
	'https://www.revid.ai/',
];

const HTTP_WITH_PORTS = [80, 8080, 8880, 2052, 2082, 2086, 2095];
const HTTPS_WITH_PORTS = [443, 2053, 2083, 2087, 2096, 8443];

// —————————————————————————————————————————— 该参数用于访问GitHub的私有仓库文件 ——————————————————————————————————————————
const DEFAULT_GITHUB_TOKEN = ''; // GitHub的令牌
const DEFAULT_OWNER = ''; // GitHub的用户名
const DEFAULT_REPO = ''; // GitHub的仓库名
const DEFAULT_BRANCH = 'main'; // GitHub的分支名
const DEFAULT_FILE_PATH = 'README.md'; // GitHub的文件路径
// —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

let clash_template_url = 'https://raw.githubusercontent.com/juerson/cftrojan-tunnel/master/clash_template.yaml'; // clash模板
let ipaddrURL = 'https://ipupdate.baipiao.eu.org/'; // 网友收集的优选IP(CDN)

const worker_default = {
	/**
	 * @param {import("@cloudflare/workers-types").Request} request
	 * @param {{SHA224PASS: string, PROXYIP: string}} env
	 * @param {import("@cloudflare/workers-types").ExecutionContext} ctx
	 * @returns {Promise<Response>}
	 */
	async fetch(request, env, ctx) {
		try {
			// ———————————————————————————— 访问GitHub的私有仓库文件 ————————————————————————————
			const GITHUB_TOKEN = env.GITHUB_TOKEN || DEFAULT_GITHUB_TOKEN;
			const OWNER = env.GITHUB_OWNER || DEFAULT_OWNER;
			const REPO = env.GITHUB_REPO || DEFAULT_REPO;
			const BRANCH = env.GITHUB_BRANCH || DEFAULT_BRANCH;
			const FILE_PATH = env.GITHUB_FILE_PATH || DEFAULT_FILE_PATH;
			// ————————————————————————————————————————————————————————————————————————————————
			let configPassword = env.CONFIG_PASSWORD || '';
			let subPassword = env.SUB_PASSWORD || '';
			// ————————————————————————————————————————————————————————————————————————————————
			proxyIP = env.PROXYIP || proxyIP;
			let password = env.SHA224PASS || plaintextPassword; // 明文密码，没有经过sha224加密的密码
			if (password !== plaintextPassword) {
				sha224Password = hash224encrypt(password);
			}

			if (!isValidSHA224(sha224Password)) {
				throw new Error('sha224Password is not valid');
			}

			const upgradeHeader = request.headers.get('Upgrade');
			const url = new URL(request.url);
			if (!upgradeHeader || upgradeHeader !== 'websocket') {
				const target = url.searchParams.get('target') || 'v2ray';
				const hostName = url.searchParams.get('host') || url.hostname;
				let pwdPassword = url.searchParams.get('pwd') || ''; // 密码参数，分别跟config、sub
				let defaultPort = url.searchParams.get('port') || 0; // 默认端口
				let page = url.searchParams.get('page') || 1; // 从1开始的页码

				if (pwdPassword) {
					pwdPassword = encodeURIComponent(pwdPassword);
					subPassword = encodeURIComponent(subPassword);
					configPassword = encodeURIComponent(configPassword);
				}

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
					case `/config`:
						let trojanConfig = ''; // 要显示的网页内容
						let responseStatus = 200; // 响应的状态码
						if (pwdPassword === configPassword) {
							trojanConfig = getTROJANConfig(password, hostName);
							responseStatus = 200;
						} else {
							trojanConfig = '404 Not found'; // pwd密码输入错误，不允许查看配置信息
							responseStatus = 404;
						}
						return new Response(trojanConfig, {
							status: responseStatus,
							headers: {
								'Content-Type': 'text/plain;charset=utf-8',
							},
						});
					case '/sub':
						if (pwdPassword === subPassword) {
							let ips_string = '';
							try {
								// 读取 GitHub 私有仓库的优选IP或域名，读取不到就默认为空字符串
								const fileContent = await fetchGitHubFile(GITHUB_TOKEN, OWNER, REPO, FILE_PATH, BRANCH);
								const decoder = new TextDecoder('utf-8');
								ips_string = decoder.decode(fileContent.body);
							} catch (error) {
								console.log(`Error: ${error.message}`);
							}
							// 如果读取到GitHub私有文件的内容为空时，就使用ipaddrURL的IP地址
							ips_string = ips_string !== '' ? ips_string : await fetchWebPageContent(ipaddrURL);
							let ipsArray = ips_string
								.trim()
								.split(/\r\n|\n|\r/)
								.map((ip) => ip.trim());

							let resultString = '';
							if (target === 'v2ray' || target === 'trojan') {
								// 限制最大节点数
								let maxNodeNumber = url.searchParams.get('maxNode') || url.searchParams.get('maxnode') || 1000;
								maxNodeNumber = maxNodeNumber > 0 && maxNodeNumber <= 5000 ? maxNodeNumber : 1000;
								// splitArrayEvenly函数：ipArray数组分割成每个子数组都不超过maxNode的数组(子数组之间元素个数平均分配)
								let chunkedArray = splitArrayEvenly(ipsArray, maxNodeNumber);
								let totalPage = Math.ceil(ipsArray.length / maxNodeNumber); // 计算总页数
								// 页码超出范围，返回404错误页面
								if (page > totalPage || page < 1) {
									return new Response('Not found', { status: 404 });
								}
								// 使用哪个子数组的数据？
								let ipsArrayChunked = chunkedArray[page - 1];
								resultString = buildTrojan(hostName, defaultPort, ipsArrayChunked, password, HTTP_WITH_PORTS, HTTPS_WITH_PORTS);
							} else if (target === 'clash') {
								let maxNode = url.searchParams.get('maxNode') || url.searchParams.get('maxnode') || 300;
								maxNode = maxNode > 0 && maxNode <= 1000 ? maxNode : 300;
								let chunkedArray = splitArrayEvenly(ipsArray, maxNode);
								let totalPage = Math.ceil(ipsArray.length / maxNode);
								if (page > totalPage || page < 1) {
									return new Response('Not found', { status: 404 });
								}
								let ipsArrayChunked = chunkedArray[page - 1];
								let [nodeNames, proxyies] = buildPrxyNameClashJSON(
									ipsArrayChunked,
									hostName,
									password,
									defaultPort,
									HTTP_WITH_PORTS,
									HTTPS_WITH_PORTS
								);
								// 抓取clash配置模板
								let clash_template = await fetchWebPageContent(clash_template_url);
								if (nodeNames) {
									// 替换clash模板中的对应的字符串，生成clash配置文件
									let replaceProxyies = clash_template.replace(
										new RegExp(
											atob(
												'ICAtIHtuYW1lOiAwMSwgc2VydmVyOiAxMjcuMC4wLjEsIHBvcnQ6IDgwLCB0eXBlOiBzcywgY2lwaGVyOiBhZXMtMTI4LWdjbSwgcGFzc3dvcmQ6IGExMjM0NTZ9'
											),
											'g'
										),
										proxyies.join('\n')
									);
									resultString = replaceProxyies.replace(
										new RegExp(atob('ICAgICAgLSAwMQ=='), 'g'),
										nodeNames.map((ipWithPort) => `      - ${ipWithPort}`).join('\n')
									);
								}
							}
							return new Response(resultString, {
								status: 200,
								headers: {
									'Content-Type': 'text/plain;charset=utf-8',
								},
							});
						}
					default:
						return new Response('404 Not found', {
							status: 404,
							headers: {
								'Content-Type': 'text/plain;charset=utf-8',
							},
						});
				}
			} else {
				const pathString = url.pathname;
				if (pathString.includes('/proxyip=')) {
					const pathPoxyip = pathString.split('=')[1];
					if (isValidProxyIP(pathPoxyip)) {
						proxyIP = pathPoxyip;
					}
				}
				return await trojanOverWSHandler(request);
			}
		} catch (err) {
			let e = err;
			return new Response(e.toString());
		}
	},
};

async function trojanOverWSHandler(request) {
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

					const { hasError, message, addressRemote = '', portRemote = 443, rawClientData } = await parseTrojanHeader(chunk);

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

async function parseTrojanHeader(buffer) {
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
		// log(`connected to ${address}:${port}`);
		const writer = tcpSocket2.writable.getWriter();
		await writer.write(rawClientData);
		writer.releaseLock();
		return tcpSocket2;
	}
	async function retry() {
		// 分离ProxyIP的host和port端口（支持"域名、IPv4、[IPv6]、域名:端口、IPv4:端口、[IPv6]:端口"）
		let porxyip_json = parseProxyIP(proxyIP);
		let host = porxyip_json.host || addressRemote;
		let port = porxyip_json.port || portRemote;

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
