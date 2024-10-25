/**
 * 异步函数：使用提供的GitHub访问令牌(token)和其他参数，从指定的仓库中获取文件内容。
 *
 * @param {string} token - GitHub访问令牌，用于授权请求。
 * @param {string} owner - 仓库所有者的用户名。
 * @param {string} repo - 仓库名称。
 * @param {string} filePath - 要获取的文件路径。
 * @param {string} branch - 文件所在的分支名称。
 * @returns {Object} - 包含文件内容和内容类型的对象。如果请求失败，内容为空字符串。
 */
async function fetchGitHubFile(token, owner, repo, filePath, branch = 'main') {
	const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;

	try {
		// 发起GET请求到GitHub API，获取文件内容
		const response = await fetch(githubUrl, {
			method: 'GET',
			headers: {
				Authorization: `token ${token}`,
				Accept: 'application/vnd.github.v3.raw',
				'User-Agent': 'Cloudflare Worker',
			},
		});

		if (!response.ok) {
			return {
				body: '',
				contentType: 'text/plain; charset=utf-8',
			};
		}

		// 从响应头中获取实际的内容类型，如果不存在则默认为二进制流类型
		const contentType = response.headers.get('Content-Type') || 'application/octet-stream';

		// 将响应内容转换为ArrayBuffer格式，以便于后续处理
		const body = await response.arrayBuffer();

		return {
			body: body,
			contentType: contentType,
		};
	} catch (error) {
		return {
			body: '',
			contentType: 'text/plain; charset=utf-8',
		};
	}
}

/**
 * @param {string} ipaddrURL - 要抓取网页的内容
 * @returns {string} - 返回网页的全部内容
 */
async function fetchWebPageContent(URL) {
	try {
		const response = await fetch(URL);
		if (!response.ok) {
			throw new Error(`Failed to get: ${response.status}`);
			return '';
		} else {
			return await response.text();
		}
	} catch (err) {
		console.error(`Failed to fetch ${URL} web conten: ${err.message}`);
		return '';
	}
}

module.exports = {
	fetchGitHubFile,
	fetchWebPageContent,
};
