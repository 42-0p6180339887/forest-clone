# Forest 行为规格（REA 式证据记录）

> 方法：按 REA（Reverse Engineer Anything）的证据纪律，把结论分成三档——
> **Seen**（有公开证据亲见）、**Inferred**（由公开材料合理推断）、**Unknown**（无证据，不臆测、不实现或明确降级）。
> 本文档是重建的依据；实现为 clean-room 独立编写，不使用原应用的任何代码、素材或商标资产。

目标应用：Forest（专注森林），开发商 Seekrtech，2014 年上线。
证据来源（2026-10-21 实际读取）：
- 官网 https://www.forestapp.cc/ 首页与 FAQ 全文（下称「官网」）

---

## Seen（官网明示）

1. **核心循环**：选择专注时长与树种 → 树随专注实时生长 → 中途离开/使用其他应用，树枯死 → 完成会话，树永久加入你的森林。
   - 官网原文："Pick a focus length and a tree species. Your tree grows in real time as you focus." / "Use other apps and your tree dies." / "Finish the session — your tree joins your forest forever."
2. **定位**：番茄钟式专注计时器（pomodoro-style focus timer），"every minute of concentration grows a tree"。
3. **金币与真实种树**：专注赚取金币；金币可用于通过合作方 Trees for the Future 在现实中种树（累计 210 万+ 棵）。
   - ⚠️ 这是原厂的公益项目与资金安排，复刻版**不**实现真实种树，金币仅作应用内计数。
4. **Deep Focus**：会话期间拦截其他应用；退出会话的唯一方式是放弃并让树枯死；支持自定义白名单。
5. **Time Guard**：在会话之外按时间段定时屏蔽应用（如 9–5 点）。
6. **Plant Together**：多人种同一棵树，任何一人放弃，全组树枯死。
7. **Focus Analytics**：按日/周/月统计专注时长、连续天数（streaks）、模式与树种数。
8. **Focus Challenge**：每日/每月任务，奖励限定树种。
9. **Ambient Sounds**：雨声、咖啡馆、森林等环境音可叠加在专注会话上。
10. **Mindful Space**：呼吸冥想空间（休息向）。
11. **森林视图**：历次会话累积成一片可见的森林，是专注时间的记录。
12. 跨平台（iOS / Android / 浏览器）与账号同步；核心专注功能可离线工作。

## Inferred（由公开材料 + 该品类通用机制推断，实现时标注）

1. 时长可自由设定（官网未给数值；原应用为 10–180 分钟量级）→ 复刻版提供 10–180 分钟滑杆 + 常用预设。
2. 树的生长分阶段呈现（官网三张图：幼苗 → 枯树 → 成年树）→ 复刻版设 5 个生长阶段：种子 → 新芽 → 幼苗 → 小树 → 成树。
3. 金币与专注时长正相关（官网仅说"earned coins from your focus"）→ 复刻版：完成会话得金币 = 专注分钟数；枯死得 0。
4. 枯死的树同样留在森林记录中（官网森林图含枯树形象 "withered tree"）→ 复刻版森林视图保留枯树。

## Unknown / 不复刻（无证据或超出 Web 能力边界）

1. **应用屏蔽（Deep Focus / Time Guard 的系统级拦截）**：网页无法拦截其他应用。
   Web 等价物：会话中标签页被切走（`visibilitychange`）视为"离开"，严格模式下触发枯死流程——这是对原机制的**降级映射**，不是原实现。
2. 账号、云同步、好友系统、Plant Together 的服务端逻辑：无公开实现证据，复刻版用 localStorage 本地存档，多人功能不做。
3. 真实种树、内购、订阅、树种商店价格体系：不做（金币只计数展示）。
4. 原应用的美术素材、文案、音效：全部不用；复刻版的树为代码生成的原创 SVG。

## 复刻范围（本次交付）

- [x] 选时长 + 选树种 + 选标签 → 种植
- [x] 树随进度实时生长（5 阶段）
- [x] 放弃 → 树枯死并留档
- [x] 严格模式：切走标签页超过宽限时间 → 树枯死（Deep Focus 的 Web 降级映射）
- [x] 完成 → 金币入账、树入森林
- [x] 森林视图（按日分组，含枯树）
- [x] 统计：累计专注、种树/枯树数、连续天数、近 7 日柱状图
- [x] 环境音：WebAudio 生成的雨声（对应 Ambient Sounds，本地生成无音频文件）
- [x] localStorage 持久化（对应"离线可用 + 本地记录"）
