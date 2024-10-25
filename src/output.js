const { getRandomElement } = require('./addressHandle');

function getTROJANConfig(pswd, host) {
	let server = 'www.visa.com.sg';
	let trojanws = `trojan://${pswd}@${server}:8080?security=none&type=ws&host=${host}&path=%2F#trojan-ws`;
	let trojanwsTls = `trojan://${pswd}@${server}:443?security=tls&sni=${host}&fp=chrome&type=ws&host=${host}&path=%2F#trojan-ws-tls`;
	return `
####################################################################################################################
v2ray
--------------------------------------------------------------------------------------------------------------------
trojan-ws分享链接：${trojanws}

trojan-ws-tls分享链接：${trojanwsTls}
--------------------------------------------------------------------------------------------------------------------
####################################################################################################################
clash-meta (trojan-ws-tls)
--------------------------------------------------------------------------------------------------------------------
- type: trojan
  name: trojan-ws-tls
  server: ${server}
  port: 443
  password: ${pswd}
  network: ws
  udp: false
  sni: ${host}
  client-fingerprint: chrome
  skip-cert-verify: true
  ws-opts:
    path: /
    headers:
      Host: ${host}
--------------------------------------------------------------------------------------------------------------------
####################################################################################################################
	`;
}

function buildTrojan(hostName, defaultPort, datas, pswd, HTTP_WITH_PORTS, HTTPS_WITH_PORTS) {
	let trojanArray = [];
	for (let addr of datas) {
		let randomHttpPortElement = getRandomElement(HTTP_WITH_PORTS);
		let randomHttpsPortElement = getRandomElement(HTTPS_WITH_PORTS);
		let port =
			([0, ...HTTPS_WITH_PORTS].includes(Number(defaultPort)) && hostName.includes('workers.dev')) ||
			([0, ...HTTP_WITH_PORTS].includes(Number(defaultPort)) && !hostName.includes('workers.dev'))
				? hostName.includes('workers.dev')
					? randomHttpPortElement
					: randomHttpsPortElement
				: defaultPort;
		if (hostName.endsWith('workers.dev') && addr) {
			let trojanws = `trojan://${pswd}@${addr}:${port}?security=none&type=ws&host=${hostName}&path=%2F#trojan-ws`;
			if (!trojanArray.includes(trojanws)) {
				trojanArray.push(trojanws);
			}
		} else if (addr) {
			let trojanwsTls = `trojan://${pswd}@${addr}:${port}?security=tls&sni=${hostName}&fp=chrome&type=ws&host=${hostName}&path=%2F#trojan-ws-tls`;
			if (!trojanArray.includes(trojanwsTls)) {
				trojanArray.push(trojanwsTls);
			}
		}
	}
	return trojanArray.join('\n');
}

// 生成clash的代理名称和proxyies值的配置信息
function buildPrxyNameClashJSON(ipsArrayChunked, hostName, password, defaultPort, HTTP_WITH_PORTS, HTTPS_WITH_PORTS) {
	let proxyies = [];
	let nodeNames = [];
	for (let server of ipsArrayChunked) {
		let randomHttpPortElement = getRandomElement(HTTP_WITH_PORTS);
		let randomHttpsPortElement = getRandomElement(HTTPS_WITH_PORTS);
		let port =
			([0, ...HTTPS_WITH_PORTS].includes(Number(defaultPort)) && hostName.includes('workers.dev')) ||
			([0, ...HTTP_WITH_PORTS].includes(Number(defaultPort)) && !hostName.includes('workers.dev'))
				? hostName.includes('workers.dev')
					? randomHttpPortElement
					: randomHttpsPortElement
				: defaultPort;
		let nodeName = `【cfwks】${server}:${port}`;
		let jsonObject = {
			type: 'trojan',
			name: nodeName,
			server: server,
			port: port,
			password: password,
			network: 'ws',
			udp: false,
			sni: hostName,
			'client-fingerprint': 'chrome',
			'skip-cert-verify': true,
			'ws-opts': {
				path: '/',
				headers: {
					Host: hostName,
				},
			},
		};
		let clash_node_str = JSON.stringify(jsonObject, null, 0);
		if (!nodeNames.includes(nodeName)) {
			proxyies.push(`  - ${clash_node_str}`);
			nodeNames.push(nodeName);
		}
	}
	return [nodeNames, proxyies];
}

module.exports = {
	getTROJANConfig,
	buildTrojan,
	buildPrxyNameClashJSON,
};
