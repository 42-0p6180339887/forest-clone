// 把 Web 界面文件复制到 dist-web/，供 Capacitor 打包进安卓 App。
// （仓库根目录同时是 GitHub Pages 的发布源，所以不能直接拿根目录当 webDir，
//  否则 node_modules、android/ 等都会被塞进 App。）
import { mkdirSync, copyFileSync } from 'node:fs';

mkdirSync('dist-web', { recursive: true });
for (const f of ['index.html', 'style.css', 'app.js']) {
  copyFileSync(f, `dist-web/${f}`);
  console.log('copied', f);
}
