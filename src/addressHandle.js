/**
 * 将一个数组分割成多个指定大小的子数组。
 * @param {Array} array - 需要分割的原始数组。
 * @param {number} chunkSize - 指定的子数组大小。
 * @returns {Array} 返回一个包含多个指定大小子数组的数组。
 */
function splitArray(array, chunkSize) {
	const chunks = [];
	let index = 0;
	while (index < array.length) {
		chunks.push(array.slice(index, index + chunkSize));
		index += chunkSize;
	}
	return chunks;
}

/**
 * 将数组平均分割成多个小数组。
 * @param {Array} array - 需要分割的原始数组。
 * @param {number} maxChunkSize - 最大块大小，分割后每个块的最大长度。
 * @returns {Array} 返回由平均分割后的子数组组成的数组。
 */
function splitArrayEvenly(array, maxChunkSize) {
	const totalLength = array.length;
	const numChunks = Math.ceil(totalLength / maxChunkSize);
	const chunkSize = Math.ceil(totalLength / numChunks);
	return splitArray(array, chunkSize);
}

// 检查是否为：(子)域名、IPv4、[IPv6]、(子)域名:端口、IPv4:端口、[IPv6]:端口
function isValidlandingAddr(ip) {
	var reg =
		/^(?:(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?::\d{1,5})?|(?:(?:\d{1,3}\.){3}\d{1,3})(?::\d{1,5})?|(?:\[[0-9a-fA-F:]+\])(?::\d{1,5})?)$/;
	return reg.test(ip);
}

// 解析Host和Port，支持格式：(子)域名、IPv4、[IPv6]、(子)域名:端口、IPv4:端口、[IPv6]:端口
function parselandingAddr(address) {
	
	const regex =
		/^(?:(?<domain>(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(?::(?<port>\d{1,5}))?|(?<ipv4>(?:\d{1,3}\.){3}\d{1,3})(?::(?<port_ipv4>\d{1,5}))?|(?<ipv6>\[[0-9a-fA-F:]+\])(?::(?<port_ipv6>\d{1,5}))?)$/;

	const match = address.match(regex);

	if (match) {
		let host = match.groups.domain || match.groups.ipv4 || match.groups.ipv6;
		let port = match.groups.port || match.groups.port_ipv4 || match.groups.port_ipv6 || undefined;

		return { host, port };
	} else {
		return { host: '', undefined };
	}
}

function getRandomElement(array) {
	const randomIndex = Math.floor(Math.random() * array.length);
	return array[randomIndex];
}

module.exports = {
	isValidlandingAddr,
	parselandingAddr,
	splitArrayEvenly,
	getRandomElement,
};
