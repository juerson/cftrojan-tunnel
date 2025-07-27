/**
 * 使用SHA-224算法对字符串进行加密
 *
 * @param {string} str 需要加密的原始字符串。
 * @return {string} 返回使用SHA-224算法加密后的散列字符串。
 */
export function sha224Encrypt(str) {
	if (typeof str !== 'string') throw new TypeError('sha224Encrypt: input must be a string');
	// SHA-224 的初始常量（来自 SHA-2 标准）
	const K = [1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401,
		607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628,
		770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711,
		113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037,
		2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616,
		659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424,
		2428436474, 2756734187, 3204031479, 3329325298];
	// SHA-224 的初始哈希值（前 7 个）
	const H = [0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939, 0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4];
	// 位运算右旋
	function R(x, n) { return (x >>> n) | (x << (32 - n)); }
	// 文本编码为字节数组
	const m = new TextEncoder().encode(str);
	// 原始长度（以 bit 为单位）
	const l = m.length * 8;
	// 填充后总长度（为 512 的倍数）
	const padLen = ((m.length + 9 + 63) >> 6) << 6;
	const buf = new Uint8Array(padLen);
	buf.set(m);
	// 添加 1 位，后接 0，符合 SHA2 填充规范
	buf[m.length] = 0x80;

	// 设置最后 4 字节为长度（只支持最长 2^32 位）
	new DataView(buf.buffer).setUint32(buf.length - 4, l, false);

	// 工作变量、哈希副本
	const w = new Uint32Array(64), h = H.slice();
	// 每次处理 64 字节块
	for (let i = 0; i < buf.length; i += 64) {
		const view = new DataView(buf.buffer, i, 64);
		// 前 16 个字为数据块直接读取
		for (let j = 0; j < 16; j++) w[j] = view.getUint32(j * 4);
		// 剩下 48 个字扩展
		for (let j = 16; j < 64; j++) {
			const s0 = R(w[j - 15], 7) ^ R(w[j - 15], 18) ^ (w[j - 15] >>> 3);
			const s1 = R(w[j - 2], 17) ^ R(w[j - 2], 19) ^ (w[j - 2] >>> 10);
			w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
		}
		// 初始化临时变量
		let [a, b, c, d, e, f, g, hh] = h;
		// 主循环，共 64 轮
		for (let j = 0; j < 64; j++) {
			const S1 = R(e, 6) ^ R(e, 11) ^ R(e, 25), ch = (e & f) ^ ((~e) & g);
			const temp1 = (hh + S1 + ch + K[j] + w[j]) >>> 0;
			const S0 = R(a, 2) ^ R(a, 13) ^ R(a, 22), maj = (a & b) ^ (a & c) ^ (b & c);
			const temp2 = (S0 + maj) >>> 0;
			[hh, g, f, e, d, c, b, a] = [g, f, e, (d + temp1) >>> 0, c, b, a, (temp1 + temp2) >>> 0];
		}
		// 累加结果
		h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0;
		h[3] = (h[3] + d) >>> 0; h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0;
		h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
	}

	// 只保留前 7 个哈希值（224 bit）
	return h.slice(0, 7).map(x => x.toString(16).padStart(8, '0')).join('');
}

// export function isSha224Hash(str) {
// 	const sha224Regex = /^[0-9a-f]{56}$/i;
// 	return typeof str === 'string' && sha224Regex.test(str);
// }
