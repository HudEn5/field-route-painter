// 内联本地样式与脚本，生成无需其他文件的交付 HTML。不需安装 npm 包。
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
async function inlineFiles(html, pattern, render) {
  for (const match of [...html.matchAll(pattern)]) {
    const source = await readFile(path.join(root, match[1]), "utf8");
    html = html.replace(match[0], () => render(source));
  }
  return html;
}
let html = await readFile(path.join(root, "index.html"), "utf8");
html = await inlineFiles(html, /<link rel="stylesheet" href="([^"]+)">/g,
  (source) => `<style>\n${source.replace(/<\/style/gi, "<\\/style")}\n</style>`);
html = await inlineFiles(html, /<script src="([^"]+)"><\/script>/g,
  (source) => `<script>\n${source.replace(/<\/script/gi, "<\\/script")}\n</script>`);
await mkdir(path.join(root, "dist"), { recursive: true });
const output = path.join(root, "dist", "field-route-painter.html");
await writeFile(output, html, "utf8");
console.log(`已生成单文件 HTML：${output}`);
