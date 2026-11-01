// 将本地版本标签的源码打包到 dist/versions，无需切换当前分支。
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const version = process.argv[2];
if (!/^v\d+\.\d+(?:\.\d+)?$/.test(version || "")) throw new Error("用法：node scripts/export-version.mjs v1.4");
const root = fileURLToPath(new URL("../", import.meta.url));
const source = file => execFileSync("git", ["show", `refs/tags/${version}:${file}`], { cwd: root, encoding: "utf8" });
let html = source("index.html");
for (const match of [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)]) {
  html = html.replace(match[0], () => `<style>\n${source(match[1]).replace(/<\/style/gi, "<\\/style")}\n</style>`);
}
for (const match of [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]) {
  html = html.replace(match[0], () => `<script>\n${source(match[1]).replace(/<\/script/gi, "<\\/script")}\n</script>`);
}
html = html.replace(/<title>(.*?)<\/title>/, `<title>$1 · ${version}</title>`);
const directory = path.join(root, "dist", "versions");
await mkdir(directory, { recursive: true });
const output = path.join(directory, `field-route-painter-${version}.html`);
await writeFile(output, html, "utf8");
console.log(`已导出 ${version}：${output}`);
