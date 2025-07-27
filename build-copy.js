import { build } from "esbuild";
import { minify } from "terser";
import { readFile, writeFile } from "fs/promises";

const entry = "src/worker.js";
const outfile = "_worker.js";

async function buildAndMinify() {
	// Step 1: 使用 esbuild 打包
	await build({
		entryPoints: [entry],
		bundle: true,
		platform: "browser",
		format: "esm",
		outfile,
		sourcemap: false,
		write: true,
		minify: true,
		drop: ["console"], // 移除所有 console.*的打印
		external: ["cloudflare:sockets"],
	});

	// Step 2: 使用 terser 混淆压缩
	const code = await readFile(outfile, "utf8");
	const result = await minify(code, {
		mangle: true,
		compress: true,
	});

	await writeFile(outfile, result.code);
	console.log("Build + Minify done:", outfile);
}

buildAndMinify().catch((err) => {
	console.error('Build failed:', err);
	process.exit(1);
});
