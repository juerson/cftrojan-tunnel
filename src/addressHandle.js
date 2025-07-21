/**
 * 将 array 拆分成若干个子数组，每个子数组的长度最多为 chunkSize 条，最后一个子数组可能少于 chunkSize 条
 * @param {Array} array - 需要分割的原始数组。
 * @param {number} maxChunkSize -  按最大长度切块
 * @returns {Array} 返回分割后的嵌套数组
 */
function splitArrayByMaxSize(array, maxChunkSize) {
	const result = [];
	for (let i = 0; i < array.length; i += maxChunkSize) {
		result.push(array.slice(i, i + maxChunkSize));
	}
	return result;
}

/**
 * 看成将一个大的ips数组转换二维数组，然后根据page数，决定取哪一组数据返回
 * @param {*} ipsArray 全部ips的数组
 * @param {*} maxNode 想要多少个节点，超出upperLimit范围采用默认的数值defaultCount
 * @param {*} page 取第几页的数据
 * @param {*} upperLimit 限制最大上限数，防止无休止取一个很大值（无意义）
 * @param {*} defaultCount 当用户传入的最大节点数不在指定范围，那么这个数就起作用
 * @returns 返回一个含有多个IP或域名的数组
 */
function ipsPaging(ipsArray, maxNode, page, upperLimit = 500, defaultCount = 300) {
	if (!Array.isArray(ipsArray)) {
		return { hasError: true, message: '输入数据不是有效的数组' };
	}

	let max = maxNode > 0 && maxNode <= upperLimit ? maxNode : defaultCount;
	let chunkedArray = splitArrayByMaxSize(ipsArray, max);
	let totalPage = chunkedArray.length;

	if (page > totalPage || page < 1) {
		return { hasError: true, message: '数据为空，或者没有该页数，数据过少远达不到这个页码！' };
	}
	let data = chunkedArray[page - 1]; // page从1开始，所以需要减1
	console.log(`当前页码：${page}，总页数：${totalPage}，每页最大节点数：${max}`);

	return { chunkedIPs: data, totalPage };
}

/**
 * 解析主机名和端口号，支持格式：(子)域名、IPv4、[IPv6]、(子)域名:端口、IPv4:端口、[IPv6]:端口。提取的ipv6保留[]
 * @param {string} s - 输入的主机名或IP地址，可能包含端口号。
 * @returns {Object} 包含解析后的主机名和端口号的对象。
 */
function parseHostPort(s) {
	const v = (x) => {
		x = +x;
		return x >= 1 && x <= 65535 ? x : 443;
	};
	let h,
		p = 443,
		i;
	if (s[0] === '[') {
		if ((i = s.indexOf(']')) === -1) return { hostname: null, port: null };
		h = s.slice(0, i + 1);
		if (s[i + 1] === ':') p = v(s.slice(i + 2));
	} else if ((i = s.lastIndexOf(':')) !== -1 && s.indexOf(':') === i) {
		h = s.slice(0, i);
		p = v(s.slice(i + 1));
	} else h = s;
	return { hostname: h, port: p };
}

module.exports = {
	parseHostPort,
	ipsPaging,
};
