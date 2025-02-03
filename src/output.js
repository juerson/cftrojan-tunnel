const { getRandomElement } = require('./addressHandle');
const { base64Encode, base64Decode } = require('./base64');

function getBaseConfig(pswd, host) {
	const server = 'www.visa.com.sg';
	const base64Link =
		'dHJvamFuOi8vI3Bhc3N3b3JkI0AjYWRkcmVzcyM6I3BvcnQjP3NlY3VyaXR5PSNvblRscyMmdHlwZT13cyZob3N0PSNob3N0IyZwYXRoPSUyRiMjYWRkcmVzcyM';
	const base64Yaml =
		'LSB0eXBlOiB0cm9qYW4NCiAgbmFtZTogI2FkZHJlc3MjDQogIHNlcnZlcjogI2FkZHJlc3MjDQogIHBvcnQ6ICNwb3J0Iw0KICBwYXNzd29yZDogI3Bhc3N3b3JkIw0KICBuZXR3b3JrOiB3cw0KICB1ZHA6IGZhbHNlDQogIHNuaTogI2hvc3QjDQogIGNsaWVudC1maW5nZXJwcmludDogY2hyb21lDQogIHNraXAtY2VydC12ZXJpZnk6IHRydWUNCiAgd3Mtb3B0czoNCiAgICBwYXRoOiAvDQogICAgaGVhZGVyczoNCiAgICAgIEhvc3Q6ICNob3N0Iw';
	const base64Json =
		'ew0KICAib3V0Ym91bmRzIjogWw0KICAgIHsNCiAgICAgICJuZXR3b3JrIjogInRjcCIsDQogICAgICAicGFzc3dvcmQiOiAiI3Bhc3N3b3JkIyIsDQogICAgICAic2VydmVyIjogIiNhZGRyZXNzIyIsDQogICAgICAic2VydmVyX3BvcnQiOiAjcG9ydCMsDQogICAgICAidGFnIjogIiNhZGRyZXNzIzojcG9ydCMiLA0KICAgICAgInRscyI6IHsNCiAgICAgICAgImVuYWJsZWQiOiAjb25UbHMjLA0KICAgICAgICAiaW5zZWN1cmUiOiB0cnVlLA0KICAgICAgICAic2VydmVyX25hbWUiOiAiI2hvc3QjIiwNCiAgICAgICAgInV0bHMiOiB7DQogICAgICAgICAgImVuYWJsZWQiOiB0cnVlLA0KICAgICAgICAgICJmaW5nZXJwcmludCI6ICJjaHJvbWUiDQogICAgICAgIH0NCiAgICAgIH0sDQogICAgICAidHJhbnNwb3J0Ijogew0KICAgICAgICAiZWFybHlfZGF0YV9oZWFkZXJfbmFtZSI6ICJTZWMtV2ViU29ja2V0LVByb3RvY29sIiwNCiAgICAgICAgImhlYWRlcnMiOiB7DQogICAgICAgICAgIkhvc3QiOiAiI2hvc3QjIg0KICAgICAgICB9LA0KICAgICAgICAicGF0aCI6ICIvIiwNCiAgICAgICAgInR5cGUiOiAid3MiDQogICAgICB9LA0KICAgICAgInR5cGUiOiAidHJvamFuIg0KICAgIH0NCiAgXQ0KfQ';
	const isCFworkersDomain = host.endsWith(base64Decode('d29ya2Vycy5kZXY')) ? true : false;
	const port = isCFworkersDomain ? 8080 : 443;
	const replacements = {
		'#password#': pswd,
		'#address#': server,
		'#port#': port,
		'#host#': host,
	};
	// 使用(正则+回调)替换对应的字符串，生成v2ray分享链接
	const regex1 = new RegExp(Object.keys(replacements).concat('#onTls#').join('|'), 'g');
	const finallyLink = base64Decode(base64Link).replace(regex1, (match) => {
		if (match === '#onTls#') {
			return isCFworkersDomain ? 'none' : base64Decode('dGxzJnNuaT0jaG9zdCMmZnA9Y2hyb21lJmFsbG93SW5zZWN1cmU9MQ').replace('#host#', host);
		}
		return replacements[match];
	});
	// 使用(正则+回调)替换对应的字符串，生成clash的配置信息
	const regex2 = new RegExp(Object.keys(replacements).join('|'), 'g');
	const finallyYaml = base64Decode(base64Yaml).replace(regex2, (match) => replacements[match]);
	// 使用(正则+回调)替换对应的字符串，生成sing-box的配置信息
	const finallyJson = base64Decode(base64Json).replace(regex1, (match) => {
		if (match === '#onTls#') {
			return isCFworkersDomain ? false : true;
		}
		return replacements[match];
	});

	return `
####################################################################################################################
${base64Decode('djJyYXk')}
--------------------------------------------------------------------------------------------------------------------
${finallyLink}
--------------------------------------------------------------------------------------------------------------------
####################################################################################################################
${base64Decode('c2luZy1ib3g')}
--------------------------------------------------------------------------------------------------------------------
${finallyJson}
--------------------------------------------------------------------------------------------------------------------
####################################################################################################################
${base64Decode('Y2xhc2gubWV0YSAodHJvamFuK3dzK3Rscyk')}
--------------------------------------------------------------------------------------------------------------------
${finallyYaml}
--------------------------------------------------------------------------------------------------------------------
####################################################################################################################
	`;
}

// 生成v2ray的分享链接
function buildLinks(ipsArrayChunked, hostName, pswd, defaultPort, HTTP_WITH_PORTS, HTTPS_WITH_PORTS) {
	let LinkArray = [];
	const base64Link =
		'dHJvamFuOi8vI3Bhc3N3b3JkI0AjYWRkcmVzcyM6I3BvcnQjP3NlY3VyaXR5PSNvblRscyMmdHlwZT13cyZob3N0PSNob3N0IyZwYXRoPSUyRiMjcmVtYXJrcyM';
	const isCFworkersDomain = hostName.endsWith(base64Decode('d29ya2Vycy5kZXY')) ? true : false;
	for (let addr of ipsArrayChunked) {
		if (!addr) continue;
		let randomHttpPort = getRandomElement(HTTP_WITH_PORTS);
		let randomHttpsPort = getRandomElement(HTTPS_WITH_PORTS);
		let port =
			([0, ...HTTPS_WITH_PORTS].includes(Number(defaultPort)) && isCFworkersDomain) ||
			([0, ...HTTP_WITH_PORTS].includes(Number(defaultPort)) && !isCFworkersDomain)
				? isCFworkersDomain
					? randomHttpPort
					: randomHttpsPort
				: defaultPort;
		let remarks = `cfwks-${addr}:${port}`;
		const replacements = {
			'#password#': pswd,
			'#address#': addr,
			'#port#': port,
			'#host#': hostName,
			'#remarks#': remarks,
		};
		// 使用(正则+回调)替换对应的字符串，生成v2ray分享链接
		const regex = new RegExp(Object.keys(replacements).concat('#onTls#').join('|'), 'g');
		const finallyLink = base64Decode(base64Link).replace(regex, (match) => {
			if (match === '#onTls#') {
				return isCFworkersDomain ? 'none' : base64Decode('dGxzJnNuaT0jaG9zdCMmZnA9Y2hyb21lJmFsbG93SW5zZWN1cmU9MQ').replace('#host#', host);
			}
			return replacements[match];
		});
		if (!LinkArray.includes(finallyLink)) {
			LinkArray.push(finallyLink);
		}
	}
	return base64Encode(LinkArray.join('\n')); // base64加密返回
}

// 生成clash的代理名称和proxyies值的节点信息
function buildYamls(ipsArrayChunked, hostName, pswd, defaultPort, HTTP_WITH_PORTS, HTTPS_WITH_PORTS) {
	let proxyies = [];
	let nodeNames = [];
	const base64Yaml =
		'ICAtIHsidHlwZSI6InRyb2phbiIsIm5hbWUiOiIjcmVtYXJrcyMiLCJzZXJ2ZXIiOiIjc2VydmVyIyIsInBvcnQiOiNwb3J0IywicGFzc3dvcmQiOiIjcGFzc3dvcmQjIiwibmV0d29yayI6IndzIiwidWRwIjpmYWxzZSwic25pIjoiI2hvc3ROYW1lIyIsImNsaWVudC1maW5nZXJwcmludCI6ImNocm9tZSIsInNraXAtY2VydC12ZXJpZnkiOnRydWUsIndzLW9wdHMiOnsicGF0aCI6Ii8iLCJoZWFkZXJzIjp7Ikhvc3QiOiIjaG9zdE5hbWUjIn19fQ';
	const isCFworkersDomain = hostName.includes(base64Decode('d29ya2Vycy5kZXY')) ? true : false;
	for (let addr of ipsArrayChunked) {
		if (!addr) continue;
		let randomHttpPortElement = getRandomElement(HTTP_WITH_PORTS);
		let randomHttpsPortElement = getRandomElement(HTTPS_WITH_PORTS);
		let port =
			([0, ...HTTPS_WITH_PORTS].includes(Number(defaultPort)) && isCFworkersDomain) ||
			([0, ...HTTP_WITH_PORTS].includes(Number(defaultPort)) && !isCFworkersDomain)
				? isCFworkersDomain
					? randomHttpPortElement
					: randomHttpsPortElement
				: defaultPort;
		let remarks = `cfwks-${addr}:${port}`;
		const replacements = {
			'#password#': pswd,
			'#server#': addr,
			'#port#': port,
			'#hostName#': hostName,
			'#remarks#': remarks,
		};

		// 使用(正则+回调)替换对应的字符串，生成clash的节点信息
		const regex = new RegExp(Object.keys(replacements).join('|'), 'g');
		const proxyiesValue = base64Decode(base64Yaml).replace(regex, (match) => replacements[match]);
		if (!nodeNames.includes(remarks)) {
			proxyies.push(proxyiesValue);
			nodeNames.push(remarks);
		}
	}
	return [nodeNames, proxyies];
}

// 生成sing-box的代理名称和outbounds值的节点信息
function buildJsons(ipsArrayChunked, hostName, pswd, defaultPort, HTTP_WITH_PORTS, HTTPS_WITH_PORTS) {
	let outbds = [];
	let nodeNames = []; // 后续可以构建完整的订阅，这里省略后的，可以删除
	const base64Json =
		'ICAgIHsNCiAgICAgICJuZXR3b3JrIjogInRjcCIsDQogICAgICAicGFzc3dvcmQiOiAiI3Bhc3N3b3JkIyIsDQogICAgICAic2VydmVyIjogIiNzZXJ2ZXIjIiwNCiAgICAgICJzZXJ2ZXJfcG9ydCI6ICNwb3J0IywNCiAgICAgICJ0YWciOiAiI3RhZ25hbWUjIiwNCiAgICAgICJ0bHMiOiB7DQogICAgICAgICJlbmFibGVkIjogI29uVGxzIywNCiAgICAgICAgImluc2VjdXJlIjogdHJ1ZSwNCiAgICAgICAgInNlcnZlcl9uYW1lIjogIiNob3N0TmFtZSMiLA0KICAgICAgICAidXRscyI6IHsNCiAgICAgICAgICAiZW5hYmxlZCI6IHRydWUsDQogICAgICAgICAgImZpbmdlcnByaW50IjogImNocm9tZSINCiAgICAgICAgfQ0KICAgICAgfSwNCiAgICAgICJ0cmFuc3BvcnQiOiB7DQogICAgICAgICJlYXJseV9kYXRhX2hlYWRlcl9uYW1lIjogIlNlYy1XZWJTb2NrZXQtUHJvdG9jb2wiLA0KICAgICAgICAiaGVhZGVycyI6IHsNCiAgICAgICAgICAiSG9zdCI6ICIjaG9zdE5hbWUjIg0KICAgICAgICB9LA0KICAgICAgICAicGF0aCI6ICIvIiwNCiAgICAgICAgInR5cGUiOiAid3MiDQogICAgICB9LA0KICAgICAgInR5cGUiOiAidHJvamFuIg0KICAgIH0';
	const isCFworkersDomain = hostName.includes(base64Decode('d29ya2Vycy5kZXY')) ? true : false;
	for (let addr of ipsArrayChunked) {
		if (!addr) continue;
		let randomHttpPortElement = getRandomElement(HTTP_WITH_PORTS);
		let randomHttpsPortElement = getRandomElement(HTTPS_WITH_PORTS);
		let port =
			([0, ...HTTPS_WITH_PORTS].includes(Number(defaultPort)) && isCFworkersDomain) ||
			([0, ...HTTP_WITH_PORTS].includes(Number(defaultPort)) && !isCFworkersDomain)
				? isCFworkersDomain
					? randomHttpPortElement
					: randomHttpsPortElement
				: defaultPort;
		let remarks = `cfwks-${addr}:${port}`;
		const replacements = {
			'#password#': pswd,
			'#server#': addr,
			'#port#': port,
			'#hostName#': hostName,
			'#tagname#': remarks,
			'#onTls#': !isCFworkersDomain,
		};
		// 使用(正则+回调)替换对应的字符串，生成sing-box的节点信息
		const regex = new RegExp(Object.keys(replacements).join('|'), 'g');
		const outbdsValue = base64Decode(base64Json).replace(regex, (match) => replacements[match]);
		if (!nodeNames.includes(remarks)) {
			outbds.push(outbdsValue);
			nodeNames.push(remarks);
		}
	}
	return [nodeNames, outbds];
}

module.exports = {
	getBaseConfig,
	buildLinks,
	buildYamls,
	buildJsons,
};
