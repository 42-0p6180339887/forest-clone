# 🌳 专注森林 · Forest Clone

一个对专注应用 **Forest** 的 clean-room 复刻：种下一颗种子开始专注，树随时间实时长大；
中途放弃（或在深度专注模式下离开页面），树就会枯死；坚持完成，树会永久加入你的森林，并收获金币。

> 本项目为学习目的的独立实现，与 Seekrtech / Forest 官方无关。
> 未使用原应用的任何代码、美术素材、文案或音效；所有树木均为代码生成的原创 SVG。
> 玩法的逆向梳理过程与证据分级见 [SPEC.md](./SPEC.md)（REA 式 Seen / Inferred / Unknown 记录）。

## 📲 App 下载（Android APK / Windows EXE）

同一套界面用 **Capacitor** 打包为安卓 App、**Electron** 打包为 Windows 桌面版：

- **下载**：到 [Releases](https://github.com/42-0p6180339887/forest-clone/releases) 拿 `ForestClone-Android-v1.1.0.apk`（手机直接装，debug 签名）与 `ForestClone-Setup-1.1.0.exe`（安装版）/ `ForestClone-Portable-1.1.0.exe`（免安装版，未签名，SmartScreen 提示时选"仍要运行"）。
- **构建**：GitHub Actions 流程 `.github/workflows/build-apps.yml`，在 Actions 页手动点 Run workflow 即自动构建并发布 Release；改版后 bump `package.json` 的 `version` 并同步改流程里的 tag 即可。
- **本地开发**：`npm install` 后，桌面版 `npm start`；安卓版 `npm run cap:sync && npx cap open android`（需 Android Studio）。

> App 内记录保存在本机（WebView / 浏览器本地存储），不跨设备同步。

## 快速开始

无需安装、无需构建，任选一种方式：

```bash
# 方式一：直接用浏览器打开 index.html

# 方式二：起一个本地静态服务器
npx serve .        # 或 python3 -m http.server 8000
```

也可以部署到 GitHub Pages：仓库 Settings → Pages → Source 选择 `main` 分支根目录即可。

## 功能

- 🌱 **种植**：4 种树（圆冠树 / 松树 / 樱花树 / 仙人掌）× 10–180 分钟时长 × 专注标签（学习 / 工作 / 阅读 / 写作 / 运动 / 休息）
- 🌿 **实时生长**：树分 5 个阶段随进度连续长大（种子 → 新芽 → 幼苗 → 小树 → 成树），配进度圆环与阶段寄语
- 🥀 **枯死机制**：主动放弃，或开启「深度专注」后切走页面超过 5 秒（有回页挽救倒计时），树会枯萎并留档
- 🪙 **金币系统**：完成专注按分钟数得金币，顶栏实时显示余额与连续专注天数
- 🌲 **森林视图**：按日分组展示所有种下的树（含枯树），是你的专注时间记录
- 📊 **统计**：累计专注分钟、种树/枯树数、连续天数、近 7 天柱状图
- 🔊 **环境音**：WebAudio 实时生成的雨声（无音频文件），完成时有轻提示音
- 💾 **本地持久化**：全部数据存于 localStorage，离线可用

## 与原版的差异（诚实清单）

| 原版 Forest | 本复刻 |
|---|---|
| 系统级应用屏蔽（Deep Focus / Time Guard） | 网页做不到；以「切走标签页触发枯死」做降级映射 |
| 账号、云同步、好友组队（Plant Together） | 不做；本地单机存档 |
| 金币可种真实树木（Trees for the Future 合作） | 不做；金币仅计数 |
| 内购树种、季节活动、冥想空间 | 不做 |

## 技术

原生 HTML / CSS / JavaScript，零依赖、零构建。核心是一个参数化 SVG 树渲染器
（`treeSVG(species, progress, dead)`），按树种与生长进度逐帧生成树形。

## 逆向方法说明

本项目按开源工具 **REA（Reverse Engineer Anything）** 的证据工作流梳理目标行为：
先从官网等公开材料确认可观测行为（Seen），再标注合理推断（Inferred）与无证据不实现的部分（Unknown），
最后 clean-room 重建。REA 的原生二进制引擎（Ghidra / Hopper 等）未用于本项目——目标是行为复刻，不是代码复制。

## License

MIT
