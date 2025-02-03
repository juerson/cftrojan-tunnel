/**
 * 将UTF8字符串进行Base64加密
 *
 * 该函数，适合bytes数组长度过大（如超过数万个字节）的，
 * 已解决了 "RangeError: Maximum call stack size exceeded" 错误，
 * 也就是该函数解决了超出调用栈的最大限制错误
 * @param {*} str
 * @returns
 */
function base64Encode(str) {
	let encoder = new TextEncoder();
	let bytes = encoder.encode(str);
	let binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
	return btoa(binary);
}

// 将base64加密的字符串转换为正经的字符串
function base64Decode(base64Str) {
	let binary = atob(base64Str);
	let bytes = new Uint8Array([...binary].map((char) => char.charCodeAt(0)));
	let decoder = new TextDecoder();
	return decoder.decode(bytes);
}

module.exports = {
	base64Encode,
	base64Decode,
};
