/**
 * 把 src/ 下的源码打包成单文件 HTML（dist/math-tutor.html）
 * 双击即可运行，不需要任何服务器、不需要联网安装依赖。
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, 'src');
const dist = join(root, 'dist');
if (!existsSync(dist)) mkdirSync(dist, { recursive: true });

const shell = readFileSync(join(src, 'shell.html'), 'utf8');
const css = readFileSync(join(src, 'styles.css'), 'utf8');

const jsFiles = readdirSync(join(src, 'js'))
  .filter((f) => f.endsWith('.js'))
  .sort();

const jsParts = jsFiles.map((f) => {
  const code = readFileSync(join(src, 'js', f), 'utf8');
  return `\n/* ==================== ${f} ==================== */\n${code}`;
});

const banner = `<!--
  数学图解讲解 · Math Tutor
  单文件版本，由 build.mjs 从 src/ 生成，请勿直接编辑本文件。
  构建时间：${new Date().toLocaleString('zh-CN')}
-->`;

const out = shell
  .replace('<!--__CSS__-->', () => `<style>\n${css}\n</style>`)
  .replace('<!--__JS__-->', () => `<script>\n${jsParts.join('\n')}\n</script>`)
  .replace('<!--__BANNER__-->', () => banner);

writeFileSync(join(dist, 'math-tutor.html'), out, 'utf8');
writeFileSync(join(dist, 'math-tutor.js'), jsParts.join('\n'), 'utf8');
const kb = (Buffer.byteLength(out, 'utf8') / 1024).toFixed(1);
console.log(`✓ dist/math-tutor.html  ${kb} KB  (${jsFiles.length} 个脚本，CSS ${(css.length / 1024).toFixed(1)} KB)`);
console.log(`✓ dist/math-tutor.js    ${(jsParts.join('').length / 1024).toFixed(1)} KB  (预览/调试用)`);
