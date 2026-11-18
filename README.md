# 🌳 专注森林 · Forest Clone

一个对专注应用 **Forest** 的 clean-room 复刻：种下一颗种子开始专注，树随时间实时长大；
中途放弃（或在深度专注模式下离开页面），树就会枯死；坚持完成，树会永久加入你的森林，并收获金币。

> 本项目为学习目的的独立实现，与 Seekrtech / Forest 官方无关。
> 未使用原应用的任何代码、美术素材、文案或音效；所有树木均为代码生成的原创 SVG。
> 玩法的逆向梳理过程与证据分级见 [SPEC.md](./SPEC.md)（REA 式 Seen / Inferred / Unknown 记录）。

## 📲 App 下载（Android APK / Windows EXE）

同一套界面用 **Capacitor** 打包为安卓 App、**Electron** 打包为 Windows 桌面版：

- **更新**：Android 和 Windows 版在「统计 → 检查更新」打开私有更新窗口。拥有统一私有发布库读取权限的用户可以授权、查看新版和校验下载。首次需要手动安装含更新入口的版本。
- **旧安卓版迁移**：1.2.0 的旧 APK 使用 CI 临时签名。「专注森林·新版」以独立包名 `com.wenhao.forestclone.privateupdates` 安装，可以与旧版并存。先在旧版「统计 → 存档备份与迁移」复制或导出存档，再在新版同页导入。两边核对记录数、最近记录和金币，确认后再处理旧版。使用 Gist 同步时，在新版重新连接。已有旧版应保留到迁移完成。
- **Android 构建**：默认 Gradle 构建沿用 `com.wenhao.forestclone`。正式迁移包使用 `./gradlew :app:assembleRelease -PforestMigration=true`，再用专属于新版的长期密钥签名。以后更新新版须沿用该包名和证书。
- **维护更新签名**：Windows 可运行 `scripts/sign-forest-android.ps1 -InputApk <未签名 APK> -OutputApk <新版 APK> -SigningDirectory <原签名目录> -Toolchain <Android 工具目录>`。脚本核对正式证书指纹和 APK v2/v3 签名。DPAPI 密码由创建它的 Windows 用户解密。迁移发布电脑前，请在原账户另行备份密钥及可恢复的加密密码。
- **Windows 版**：结束计时和同步、导出存档后再关闭旧程序，使用原 Windows 用户账户覆盖安装。便携版使用对应的 Portable 文件。
- **构建**：GitHub Actions 的 `.github/workflows/build-apps.yml` 可手动排队验证安卓和 Windows 打包。通过 [私有发布库](https://github.com/42-0p6180339887/app-updates) 的发布流程提供正式包。
- **本地开发**：`npm install` 后，桌面版 `npm start`；安卓版 `npm run cap:sync && npx cap open android`（需 Android Studio）。

> App 内记录默认保存在本机（WebView / 浏览器本地存储）。可在统计页开启 **GitHub Gist 自动同步**实现跨设备一致（见下），也可用同页的导出/导入手动迁移（按记录编号自动合并，不丢不重；「清空全部记录」会通过同步墓碑传播到其他设备）。

### ☁️ GitHub Gist 自动同步（v1.2.0+）

1. 在 [GitHub Token 页面](https://github.com/settings/tokens/new?scopes=gist&description=ForestCloneSync) 生成一个只带 **gist** 权限的 Token。
2. 在每台设备的统计页「自动同步」卡片里粘贴 Token 并连接——App 会在你的账号下找到（或新建）一个名为 `forest-save.json` 的私密 Gist 作为存档中转。
3. 之后：种完树自动推送、打开 App 自动拉取合并。Token 只保存在本设备本地、只发往 api.github.com；随时可在统计页断开，或在 GitHub 上吊销 Token / 删除该 Gist。

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
