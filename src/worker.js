import { connect } from 'cloudflare:sockets';
const { hash224Encrypt } = require('./sha224');
const { parseHostPort, ipsPaging } = require('./addressHandle');
const { fetchGitHubFile, fetchWebPageContent } = require('./crawler');
const { getBaseConfig, buildLinks, buildYamls, buildJsons } = require('./output');
const { base64Decode } = require('./base64');

const landingAddress = '';
let nat64IPv6Prefix = '2001:67c:2960:6464::';
const plaintextPassword = 'a1234567';
let sha224Password = hash224Encrypt(plaintextPassword);
let parsedLandingAddr = { hostname: null, port: null };

// 重定向的域名列表
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
// 设置环境变量的默认值
const DEFAULTS = {
	github: {
		GITHUB_TOKEN: '', // 令牌
		GITHUB_OWNER: '', // 仓库所有者
		GITHUB_REPO: '', // 仓库名称
		GITHUB_BRANCH: 'main', // 分支名称
		GITHUB_FILE_PATH: 'README.md', // 文件路径(相对于仓库根目录)
	},
	password: {
		CONFIG_PASSWORD: '', // 查看节点配置的密码
		SUB_PASSWORD: '', // 查看节点订阅的密码
	},
	urls: {
		DATA_SOURCE_URL: 'https://raw.githubusercontent.com/juerson/cftrojan-tunnel/refs/heads/master/domain.txt', // 数据源URL
		CLASH_TEMPLATE_URL: 'https://raw.githubusercontent.com/juerson/cftrojan-tunnel/refs/heads/master/clashTemplate.yaml', // clash模板
	},
};
// 手动这里设置最大节点数
const defaultMaxNodeMap = {
	v2ray: {
		upperLimit: 2000, // 最大上限
		default: 300, // 默认值，传入的数据不合法使用它
	},
	singbox: {
		upperLimit: 100,
		default: 30,
	},
	clash: {
		upperLimit: 100,
		default: 30,
	},
	'': {
		// 这个用于当target输入错误兜底的
		upperLimit: 500,
		default: 300,
	},
};

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

			const url = new URL(request.url);
			const path = url.pathname;
			const upgradeHeader = request.headers.get('Upgrade');
			if (!upgradeHeader || upgradeHeader !== 'websocket') {
				// 注意：CONFIG_PASSWORD, SUB_PASSWORD, pwdPassword 都已URI编码
				const config = {
					env: extractGroupedEnv(env, DEFAULTS),
					query: extractUrlParams(url, defaultMaxNodeMap),
				};

				return await handleRequest(path, config, password, defaultMaxNodeMap);
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

function extractGroupedEnv(env, groupedDefaults, encodeFields = ['CONFIG_PASSWORD', 'SUB_PASSWORD']) {
	const result = {};

	for (const [groupName, vars] of Object.entries(groupedDefaults)) {
		result[groupName] = {};
		for (const [key, defaultVal] of Object.entries(vars)) {
			let value = env[key] ?? defaultVal;
			// 如果字段在encodeFields中，则对其值进行URI编码
			if (encodeFields.includes(key)) {
				value = encodeURIComponent(String(value));
			}
			result[groupName][key] = value;
		}
	}

	return result;
}

function extractUrlParams(url, defaultMaxNodeMap, encodeFields = ['pwdPassword']) {
	const search = url.searchParams;
	const target = search.get('target') || '';
	const defaultMax = defaultMaxNodeMap[target]?.default ?? defaultMaxNodeMap['']?.default; // ??后面的代码，用于预防target输入错误的情况
	const rawParams = {
		target,
		hostName: search.get('host') || url.hostname,
		pwdPassword: search.get('pwd') || '',
		defaultPort: parseInt(search.get('port') || '0', 10),
		maxNode: parseInt(search.get('max') || defaultMax.toString(), 10),
		page: parseInt(search.get('page') || '1', 10),
	};

	for (const key of encodeFields) {
		if (key in rawParams) {
			rawParams[key] = encodeURIComponent(rawParams[key]);
		}
	}

	return rawParams;
}

async function handleRequest(path, config, nodePassword, defaultMaxNodeMap) {
	const { target, hostName, pwdPassword, defaultPort, maxNode, page } = config.query;
	const { CONFIG_PASSWORD, SUB_PASSWORD } = config.env.password;
	const { DATA_SOURCE_URL, CLASH_TEMPLATE_URL } = config.env.urls;
	const github = config.env.github;

	// 检查GitHub配置是否完整，任何一项参数为空都视为不完整
	function isGitHubConfigComplete(githubConfig) {
		return Object.values(githubConfig).every((val) => val !== '');
	}

	// 替换模板，匹配空白+符号+空白+占位符，这里指“  - ${proxies}”和“      - ${proxy_name}”所在行
	function replaceTemplate(template, data) {
		return template.replace(/(\s*[-*]\s*)\$\{(\w+)\}/g, (_, prefix, key) => {
			return '\n' + data[key];
		});
	}

	switch (path) {
		case '/':
			const randomDomain = domainList[Math.floor(Math.random() * domainList.length)];
			const redirectResponse = new Response(null, { status: 301, headers: { Location: randomDomain } });
			return redirectResponse;
		case `/config`:
			let html_doc = '404 Not Found',
				status = 404;
			if (pwdPassword == CONFIG_PASSWORD) {
				html_doc = getBaseConfig(nodePassword, hostName);
				status = 200;
			}
			return new Response(html_doc, { status: status, headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
		case '/sub':
			if (pwdPassword == SUB_PASSWORD) {
				let ipContents = '';
				if (isGitHubConfigComplete(github)) {
					try {
						const file = await fetchGitHubFile(
							github?.GITHUB_TOKEN,
							github?.GITHUB_OWNER,
							github?.GITHUB_REPO,
							github?.GITHUB_FILE_PATH,
							github?.GITHUB_BRANCH
						);
						ipContents = new TextDecoder().decode(file.body);
					} catch (e) {
						console.log(`获取GitHub的数据失败：${e.message}`);
					}
				}
				if (!ipContents.trim()) ipContents = await fetchWebPageContent(DATA_SOURCE_URL);
				if (!ipContents.trim()) {
					return new Response('Null Data', { status: 200, headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
				}
				let ipsArray = ipContents
					.trim()
					.split(/\r\n|\n|\r/)
					.map((line) => line.trim())
					.filter((line) => line.length > 0);

				let upperLimit = defaultMaxNodeMap[target]?.upperLimit ?? defaultMaxNodeMap['']?.upperLimit;
				let defaultCount = defaultMaxNodeMap[target]?.default ?? defaultMaxNodeMap['']?.default;
				let ipsResult = ipsPaging(ipsArray, maxNode, page, upperLimit, defaultCount);
				if (ipsResult?.hasError) {
					return new Response((ipsResult.message, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
				}

				let html_doc = 'Unknown Error';
				if (target === base64Decode('djJyYXk')) {
					// v2ray
					html_doc = buildLinks(ipsResult?.chunkedIPs, hostName, nodePassword, defaultPort);
				} else if (target === base64Decode('Y2xhc2g')) {
					// clash
					const isCFworkersDomain = hostName.endsWith(base64Decode('d29ya2Vycy5kZXY')) ? true : false;
					if (isCFworkersDomain) {
						html_doc = base64Decode(
							'6K2m5ZGK77ya5L2/55So5Z+f5ZCNI2hvc3ROYW1lI+eUn+aIkOeahGNsYXNo6K6i6ZiF5peg5rOV5L2/55So77yB57uI5q2i5pON5L2c44CC'
						).replace('#hostName#', hostName);
						return new Response(html_doc, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
					}
					let [nodeNames, proxyies] = buildYamls(ipsResult?.chunkedIPs, hostName, nodePassword, defaultPort);
					let confTemplate = await fetchWebPageContent(CLASH_TEMPLATE_URL);
					if (nodeNames.length > 0 && proxyies.length > 0) {
						html_doc = replaceTemplate(confTemplate, {
							proxies: proxyies.join('\n'),
							proxy_name: nodeNames.map((ipWithPort) => `      - ${ipWithPort}`).join('\n'),
						});
					}
				} else if (target === base64Decode('c2luZ2JveA')) {
					// singbox
					let [_, outbds] = buildJsons(ipsResult?.chunkedIPs, hostName, nodePassword, defaultPort);
					html_doc = base64Decode('ew0KICAib3V0Ym91bmRzIjogWw0KI291dGJkcyMNCiAgXQ0KfQ').replace('#outbds#', outbds.join(',\n'));
				}
				return new Response(html_doc, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
			}
		default:
			return new Response('您无相关的权限访问！', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
	}
}

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
