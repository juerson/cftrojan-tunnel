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
function splitArrayByMaxSize(array, maxChunkSize) {
	const result = [];
	for (let i = 0; i < array.length; i += maxChunkSize) {
		result.push(array.slice(i, i + maxChunkSize));
	}
	return result;
}
function ipsPaging(ipsArray, maxNode, page, upperLimit = 500, defaultCount = 300) {
	if (!Array.isArray(ipsArray)) {
		return { hasError: true, message: "\u8F93\u5165\u6570\u636E\u4E0D\u662F\u6709\u6548\u7684\u6570\u7EC4" };
	}
	let max = maxNode > 0 && maxNode <= upperLimit ? maxNode : defaultCount;
	let chunkedArray = splitArrayByMaxSize(ipsArray, max);
	let totalPage = chunkedArray.length;
	if (page > totalPage || page < 1) {
		return { hasError: true, message: "\u6570\u636E\u4E3A\u7A7A\uFF0C\u6216\u8005\u6CA1\u6709\u8BE5\u9875\u6570\uFF0C\u6570\u636E\u8FC7\u5C11\u8FDC\u8FBE\u4E0D\u5230\u8FD9\u4E2A\u9875\u7801\uFF01" };
	}
	let data = chunkedArray[page - 1];
	return { chunkedIPs: data, totalPage };
}
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

// src/crawler.js
async function fetchGitHubFile(token, owner, repo, filePath, branch = "main") {
	const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
	try {
		const response = await fetch(githubUrl, {
			headers: {
				Authorization: `token ${token}`,
				Accept: "application/vnd.github.v3.raw",
				"User-Agent": "Mozilla/5.0"
			}
		});
		if (!response.ok) {
			return emptyFile();
		}
		const contentType = response.headers.get("Content-Type") || "application/octet-stream";
		const body = await response.arrayBuffer();
		return { body, contentType };
	} catch (error) {
		return emptyFile();
	}
	function emptyFile() {
		return { body: new ArrayBuffer(0), contentType: "text/plain; charset=utf-8" };
	}
}
async function fetchWebPageContent(url) {
	try {
		const response = await fetch(url);
		if (response.ok) {
			return await response.text();
		}
	} catch (err) {
	}
	return "";
}

// src/base64.js
function base64Encode(str) {
	let encoder = new TextEncoder();
	let bytes = encoder.encode(str);
	let binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
	return btoa(binary);
}
function base64Decode(base64Str) {
	let binary = atob(base64Str);
	let bytes = new Uint8Array([...binary].map((char) => char.charCodeAt(0)));
	let decoder = new TextDecoder();
	return decoder.decode(bytes);
}

// src/output.js
function getBaseConfig(pswd, hostName) {
	const server = "www.visa.com.sg";
	const base64Link = "dHJvamFuOi8vI3Bhc3N3b3JkI0AjYWRkcmVzcyM6I3BvcnQjP3NlY3VyaXR5PSNvblRscyMmdHlwZT13cyZob3N0PSNob3N0IyZwYXRoPSUyRiMjYWRkcmVzcyM";
	const base64Yaml = "LSB0eXBlOiB0cm9qYW4NCiAgbmFtZTogI2FkZHJlc3MjDQogIHNlcnZlcjogI2FkZHJlc3MjDQogIHBvcnQ6ICNwb3J0Iw0KICBwYXNzd29yZDogI3Bhc3N3b3JkIw0KICBuZXR3b3JrOiB3cw0KICB1ZHA6IGZhbHNlDQogIHNuaTogI2hvc3QjDQogIGNsaWVudC1maW5nZXJwcmludDogY2hyb21lDQogIHNraXAtY2VydC12ZXJpZnk6IHRydWUNCiAgd3Mtb3B0czoNCiAgICBwYXRoOiAvDQogICAgaGVhZGVyczoNCiAgICAgIEhvc3Q6ICNob3N0Iw";
	const base64Json = "ew0KICAib3V0Ym91bmRzIjogWw0KICAgIHsNCiAgICAgICJuZXR3b3JrIjogInRjcCIsDQogICAgICAicGFzc3dvcmQiOiAiI3Bhc3N3b3JkIyIsDQogICAgICAic2VydmVyIjogIiNhZGRyZXNzIyIsDQogICAgICAic2VydmVyX3BvcnQiOiAjcG9ydCMsDQogICAgICAidGFnIjogIiNhZGRyZXNzIzojcG9ydCMiLA0KICAgICAgInRscyI6IHsNCiAgICAgICAgImVuYWJsZWQiOiAjb25UbHMjLA0KICAgICAgICAiaW5zZWN1cmUiOiB0cnVlLA0KICAgICAgICAic2VydmVyX25hbWUiOiAiI2hvc3QjIiwNCiAgICAgICAgInV0bHMiOiB7DQogICAgICAgICAgImVuYWJsZWQiOiB0cnVlLA0KICAgICAgICAgICJmaW5nZXJwcmludCI6ICJjaHJvbWUiDQogICAgICAgIH0NCiAgICAgIH0sDQogICAgICAidHJhbnNwb3J0Ijogew0KICAgICAgICAiZWFybHlfZGF0YV9oZWFkZXJfbmFtZSI6ICJTZWMtV2ViU29ja2V0LVByb3RvY29sIiwNCiAgICAgICAgImhlYWRlcnMiOiB7DQogICAgICAgICAgIkhvc3QiOiAiI2hvc3QjIg0KICAgICAgICB9LA0KICAgICAgICAicGF0aCI6ICIvIiwNCiAgICAgICAgInR5cGUiOiAid3MiDQogICAgICB9LA0KICAgICAgInR5cGUiOiAidHJvamFuIg0KICAgIH0NCiAgXQ0KfQ";
	const isCFworkersDomain = hostName.endsWith(base64Decode("d29ya2Vycy5kZXY")) ? true : false;
	const port = isCFworkersDomain ? 8080 : 443;
	const replacements = {
		"#password#": pswd,
		"#address#": server,
		"#port#": port,
		"#host#": hostName
	};
	const regex1 = new RegExp(Object.keys(replacements).concat("#onTls#").join("|"), "g");
	const finallyLink = base64Decode(base64Link).replace(regex1, (match) => {
		if (match === "#onTls#") {
			return isCFworkersDomain ? "none" : base64Decode("dGxzJnNuaT0jaG9zdCMmZnA9Y2hyb21lJmFsbG93SW5zZWN1cmU9MQ").replace("#host#", hostName);
		}
		return replacements[match];
	});
	const regex2 = new RegExp(Object.keys(replacements).join("|"), "g");
	const finallyYaml = base64Decode(base64Yaml).replace(regex2, (match) => replacements[match]);
	const finallyJson = base64Decode(base64Json).replace(regex1, (match) => {
		if (match === "#onTls#") {
			return isCFworkersDomain ? false : true;
		}
		return replacements[match];
	});
	return `
####################################################################################################################
${base64Decode("djJyYXk")}
--------------------------------------------------------------------------------------------------------------------
${finallyLink}
--------------------------------------------------------------------------------------------------------------------
####################################################################################################################
${base64Decode("c2luZy1ib3g")}
--------------------------------------------------------------------------------------------------------------------
${finallyJson}
--------------------------------------------------------------------------------------------------------------------
####################################################################################################################
${base64Decode("Y2xhc2gubWV0YSAodHJvamFuK3dzK3Rscyk")}
--------------------------------------------------------------------------------------------------------------------
${finallyYaml}
--------------------------------------------------------------------------------------------------------------------
####################################################################################################################
	`;
}
var HTTP_WITH_PORTS = [80, 8080, 8880, 2052, 2082, 2086, 2095];
var HTTPS_WITH_PORTS = [443, 2053, 2083, 2087, 2096, 8443];
function getRandomPort(array) {
	const randomIndex = Math.floor(Math.random() * array.length);
	return array[randomIndex];
}
function buildLinks(ipsArrayChunked, hostName, pswd, defaultPort) {
	let LinkArray = [];
	const base64Link = "dHJvamFuOi8vI3Bhc3N3b3JkI0AjYWRkcmVzcyM6I3BvcnQjP3NlY3VyaXR5PSNvblRscyMmdHlwZT13cyZob3N0PSNob3N0IyZwYXRoPSUyRiMjcmVtYXJrcyM";
	const isCFworkersDomain = hostName.endsWith(base64Decode("d29ya2Vycy5kZXY")) ? true : false;
	for (let addr of ipsArrayChunked) {
		if (!addr) continue;
		let randomHttpPort = getRandomPort(HTTP_WITH_PORTS);
		let randomHttpsPort = getRandomPort(HTTPS_WITH_PORTS);
		let port = [0, ...HTTPS_WITH_PORTS].includes(Number(defaultPort)) && isCFworkersDomain || [0, ...HTTP_WITH_PORTS].includes(Number(defaultPort)) && !isCFworkersDomain ? isCFworkersDomain ? randomHttpPort : randomHttpsPort : defaultPort;
		let remarks = `cfwks-${addr}:${port}`;
		const replacements = {
			"#password#": pswd,
			"#address#": addr,
			"#port#": port,
			"#host#": hostName,
			"#remarks#": remarks
		};
		const regex = new RegExp(Object.keys(replacements).concat("#onTls#").join("|"), "g");
		const finallyLink = base64Decode(base64Link).replace(regex, (match) => {
			if (match === "#onTls#") {
				return isCFworkersDomain ? "none" : base64Decode("dGxzJnNuaT0jaG9zdCMmZnA9Y2hyb21lJmFsbG93SW5zZWN1cmU9MQ").replace("#host#", hostName);
			}
			return replacements[match];
		});
		if (!LinkArray.includes(finallyLink)) {
			LinkArray.push(finallyLink);
		}
	}
	return base64Encode(LinkArray.join("\n"));
}
function buildYamls(ipsArrayChunked, hostName, pswd, defaultPort) {
	let proxyies = [];
	let nodeNames = [];
	const base64Yaml = "ICAtIHsidHlwZSI6InRyb2phbiIsIm5hbWUiOiIjcmVtYXJrcyMiLCJzZXJ2ZXIiOiIjc2VydmVyIyIsInBvcnQiOiNwb3J0IywicGFzc3dvcmQiOiIjcGFzc3dvcmQjIiwibmV0d29yayI6IndzIiwidWRwIjpmYWxzZSwic25pIjoiI2hvc3ROYW1lIyIsImNsaWVudC1maW5nZXJwcmludCI6ImNocm9tZSIsInNraXAtY2VydC12ZXJpZnkiOnRydWUsIndzLW9wdHMiOnsicGF0aCI6Ii8iLCJoZWFkZXJzIjp7Ikhvc3QiOiIjaG9zdE5hbWUjIn19fQ";
	const isCFworkersDomain = hostName.includes(base64Decode("d29ya2Vycy5kZXY")) ? true : false;
	for (let addr of ipsArrayChunked) {
		if (!addr) continue;
		let randomHttpPortElement = getRandomPort(HTTP_WITH_PORTS);
		let randomHttpsPortElement = getRandomPort(HTTPS_WITH_PORTS);
		let port = [0, ...HTTPS_WITH_PORTS].includes(Number(defaultPort)) && isCFworkersDomain || [0, ...HTTP_WITH_PORTS].includes(Number(defaultPort)) && !isCFworkersDomain ? isCFworkersDomain ? randomHttpPortElement : randomHttpsPortElement : defaultPort;
		let remarks = `cfwks-${addr}:${port}`;
		const replacements = {
			"#password#": pswd,
			"#server#": addr,
			"#port#": port,
			"#hostName#": hostName,
			"#remarks#": remarks
		};
		const regex = new RegExp(Object.keys(replacements).join("|"), "g");
		const proxyiesValue = base64Decode(base64Yaml).replace(regex, (match) => replacements[match]);
		if (!nodeNames.includes(remarks)) {
			proxyies.push(proxyiesValue);
			nodeNames.push(remarks);
		}
	}
	return [nodeNames, proxyies];
}
function buildJsons(ipsArrayChunked, hostName, pswd, defaultPort) {
	let outbds = [];
	let nodeNames = [];
	const base64Json = "ICAgIHsNCiAgICAgICJuZXR3b3JrIjogInRjcCIsDQogICAgICAicGFzc3dvcmQiOiAiI3Bhc3N3b3JkIyIsDQogICAgICAic2VydmVyIjogIiNzZXJ2ZXIjIiwNCiAgICAgICJzZXJ2ZXJfcG9ydCI6ICNwb3J0IywNCiAgICAgICJ0YWciOiAiI3RhZ25hbWUjIiwNCiAgICAgICJ0bHMiOiB7DQogICAgICAgICJlbmFibGVkIjogI29uVGxzIywNCiAgICAgICAgImluc2VjdXJlIjogdHJ1ZSwNCiAgICAgICAgInNlcnZlcl9uYW1lIjogIiNob3N0TmFtZSMiLA0KICAgICAgICAidXRscyI6IHsNCiAgICAgICAgICAiZW5hYmxlZCI6IHRydWUsDQogICAgICAgICAgImZpbmdlcnByaW50IjogImNocm9tZSINCiAgICAgICAgfQ0KICAgICAgfSwNCiAgICAgICJ0cmFuc3BvcnQiOiB7DQogICAgICAgICJlYXJseV9kYXRhX2hlYWRlcl9uYW1lIjogIlNlYy1XZWJTb2NrZXQtUHJvdG9jb2wiLA0KICAgICAgICAiaGVhZGVycyI6IHsNCiAgICAgICAgICAiSG9zdCI6ICIjaG9zdE5hbWUjIg0KICAgICAgICB9LA0KICAgICAgICAicGF0aCI6ICIvIiwNCiAgICAgICAgInR5cGUiOiAid3MiDQogICAgICB9LA0KICAgICAgInR5cGUiOiAidHJvamFuIg0KICAgIH0";
	const isCFworkersDomain = hostName.includes(base64Decode("d29ya2Vycy5kZXY")) ? true : false;
	for (let addr of ipsArrayChunked) {
		if (!addr) continue;
		let randomHttpPortElement = getRandomPort(HTTP_WITH_PORTS);
		let randomHttpsPortElement = getRandomPort(HTTPS_WITH_PORTS);
		let port = [0, ...HTTPS_WITH_PORTS].includes(Number(defaultPort)) && isCFworkersDomain || [0, ...HTTP_WITH_PORTS].includes(Number(defaultPort)) && !isCFworkersDomain ? isCFworkersDomain ? randomHttpPortElement : randomHttpsPortElement : defaultPort;
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
		const outbdsValue = base64Decode(base64Json).replace(regex, (match) => replacements[match]);
		if (!nodeNames.includes(remarks)) {
			outbds.push(outbdsValue);
			nodeNames.push(remarks);
		}
	}
	return [nodeNames, outbds];
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
var DEFAULTS = {
	github: {
		// 令牌
		GITHUB_TOKEN: "",
		// 仓库所有者
		GITHUB_OWNER: "",
		// 仓库名称
		GITHUB_REPO: "",
		// 分支名称
		GITHUB_BRANCH: "main",
		// 文件路径(相对于仓库根目录)
		GITHUB_FILE_PATH: "README.md"
	},
	password: {
		CONFIG_PASSWORD: "",
		// 查看节点配置的密码
		SUB_PASSWORD: ""
		// 查看节点订阅的密码
	},
	urls: {
		// 数据源URL
		DATA_SOURCE_URL: "https://raw.githubusercontent.com/juerson/cftrojan-tunnel/refs/heads/master/domain.txt",
		// clash模板
		CLASH_TEMPLATE_URL: "https://raw.githubusercontent.com/juerson/cftrojan-tunnel/refs/heads/master/clashTemplate.yaml"
	}
};
var defaultMaxNodeMap = {
	v2ray: {
		// 最大上限
		upperLimit: 2e3,
		// 默认值，传入的数据不合法使用它
		default: 300
	},
	singbox: {
		upperLimit: 100,
		default: 30
	},
	clash: {
		upperLimit: 100,
		default: 30
	},
	"": {
		// 这个用于当target输入错误兜底的
		upperLimit: 500,
		default: 300
	}
};
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
				const config = {
					env: extractGroupedEnv(env, DEFAULTS),
					query: extractUrlParams(url, defaultMaxNodeMap)
				};
				return await handleRequest(path, config, password, defaultMaxNodeMap);
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
function extractGroupedEnv(env, groupedDefaults, encodeFields = ["CONFIG_PASSWORD", "SUB_PASSWORD"]) {
	const result = {};
	for (const [groupName, vars] of Object.entries(groupedDefaults)) {
		result[groupName] = {};
		for (const [key, defaultVal] of Object.entries(vars)) {
			let value = env[key] ?? defaultVal;
			if (encodeFields.includes(key)) {
				value = encodeURIComponent(String(value));
			}
			result[groupName][key] = value;
		}
	}
	return result;
}
function extractUrlParams(url, defaultMaxNodeMap2, encodeFields = ["pwdPassword"]) {
	const search = url.searchParams;
	const target = search.get("target") || "";
	const defaultMax = defaultMaxNodeMap2[target]?.default ?? defaultMaxNodeMap2[""]?.default;
	const rawParams = {
		target,
		hostName: search.get("host") || url.hostname,
		pwdPassword: search.get("pwd") || "",
		defaultPort: parseInt(search.get("port") || "0", 10),
		maxNode: parseInt(search.get("max") || defaultMax.toString(), 10),
		page: parseInt(search.get("page") || "1", 10)
	};
	for (const key of encodeFields) {
		if (key in rawParams) {
			rawParams[key] = encodeURIComponent(rawParams[key]);
		}
	}
	return rawParams;
}
async function handleRequest(path, config, nodePassword, defaultMaxNodeMap2) {
	const { target, hostName, pwdPassword, defaultPort, maxNode, page } = config.query;
	const { CONFIG_PASSWORD, SUB_PASSWORD } = config.env.password;
	const { DATA_SOURCE_URL, CLASH_TEMPLATE_URL } = config.env.urls;
	const github = config.env.github;
	function isGitHubConfigComplete(githubConfig) {
		return Object.values(githubConfig).every((val) => val !== "");
	}
	function replaceTemplate(template, data) {
		return template.replace(/(\s*[-*]\s*)\$\{(\w+)\}/g, (_, prefix, key) => {
			return "\n" + data[key];
		});
	}
	switch (path) {
		case "/":
			const randomDomain = domainList[Math.floor(Math.random() * domainList.length)];
			const redirectResponse = new Response(null, { status: 301, headers: { Location: randomDomain } });
			return redirectResponse;
		case `/config`:
			let html_doc = "404 Not Found", status = 404;
			if (pwdPassword == CONFIG_PASSWORD) {
				html_doc = getBaseConfig(nodePassword, hostName);
				status = 200;
			}
			return new Response(html_doc, { status, headers: { "Content-Type": "text/plain;charset=utf-8" } });
		case "/sub":
			if (pwdPassword == SUB_PASSWORD) {
				let ipContents = "";
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
					}
				}
				if (!ipContents.trim()) ipContents = await fetchWebPageContent(DATA_SOURCE_URL);
				if (!ipContents.trim()) {
					return new Response("Null Data", { status: 200, headers: { "Content-Type": "text/plain;charset=utf-8" } });
				}
				let ipsArray = ipContents.trim().split(/\r\n|\n|\r/).map((line) => line.trim()).filter((line) => line.length > 0);
				let upperLimit = defaultMaxNodeMap2[target]?.upperLimit ?? defaultMaxNodeMap2[""]?.upperLimit;
				let defaultCount = defaultMaxNodeMap2[target]?.default ?? defaultMaxNodeMap2[""]?.default;
				let ipsResult = ipsPaging(ipsArray, maxNode, page, upperLimit, defaultCount);
				if (ipsResult?.hasError) {
					return new Response((ipsResult.message, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }));
				}
				let html_doc2 = "Unknown Error";
				if (target === base64Decode("djJyYXk")) {
					html_doc2 = buildLinks(ipsResult?.chunkedIPs, hostName, nodePassword, defaultPort);
				} else if (target === base64Decode("Y2xhc2g")) {
					const isCFworkersDomain = hostName.endsWith(base64Decode("d29ya2Vycy5kZXY")) ? true : false;
					if (isCFworkersDomain) {
						html_doc2 = base64Decode(
							"6K2m5ZGK77ya5L2/55So5Z+f5ZCNI2hvc3ROYW1lI+eUn+aIkOeahGNsYXNo6K6i6ZiF5peg5rOV5L2/55So77yB57uI5q2i5pON5L2c44CC"
						).replace("#hostName#", hostName);
						return new Response(html_doc2, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
					}
					let [nodeNames, proxyies] = buildYamls(ipsResult?.chunkedIPs, hostName, nodePassword, defaultPort);
					let confTemplate = await fetchWebPageContent(CLASH_TEMPLATE_URL);
					if (nodeNames.length > 0 && proxyies.length > 0) {
						html_doc2 = replaceTemplate(confTemplate, {
							proxies: proxyies.join("\n"),
							proxy_name: nodeNames.map((ipWithPort) => `      - ${ipWithPort}`).join("\n")
						});
					}
				} else if (target === base64Decode("c2luZ2JveA")) {
					let [_, outbds] = buildJsons(ipsResult?.chunkedIPs, hostName, nodePassword, defaultPort);
					html_doc2 = base64Decode("ew0KICAib3V0Ym91bmRzIjogWw0KI291dGJkcyMNCiAgXQ0KfQ").replace("#outbds#", outbds.join(",\n"));
				}
				return new Response(html_doc2, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
			}
		default:
			return new Response("404 Not Found!", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
	}
}
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
