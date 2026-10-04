# 开源协议说明 / Licensing Rationale

本文回答一个具体问题：**轻幕能不能用 MIT 协议开源？** 结论是 **可以**。

This document explains why 轻幕 can be released under the MIT License, and
what was actually changed relative to the upstream project.

---

## 一、结论速览

| 问题 | 答案 |
| --- | --- |
| 能用 MIT 吗？ | **能。** 上游 MarkerOn 本身就是 MIT，MIT 允许再分发与再授权。 |
| 必须保留什么？ | MarkerOn 的原始版权声明与许可声明全文（MIT 唯一强制的义务）。 |
| 需要新协议吗？ | 不需要。MIT → MIT 是最简单的一条路。 |
| 有没有协议冲突？ | 没有。全部依赖均为 MIT / ISC / Apache-2.0 及其兼容组合。 |
| 有没有 GPL 类污染？ | **没有。** LGPL / MPL 只出现在构建期工具链，不进入分发产物。 |
| 源码语言是什么？ | **TypeScript + Vue 3（前端）+ Rust（Tauri 后端）**，外加少量 Node/Shell 脚本与静态 HTML。 |

---

## 二、MarkerOn 是什么协议

你的判断是对的。上游项目的 LICENSE 原文就是 MIT：

```
MIT License
Copyright (c) 2026 MarkerOn
```

项目主页 [markeron.cn](https://markeron.cn/) 自己也写着
"MarkerOn is open source under the MIT License"。这一点有三重佐证：

1. `git show 6802007:LICENSE` — 你仓库里第一个提交携带的 LICENSE 就是 MIT 全文；
2. 上游 `package.json` 中 `"license": "MIT"`；
3. 上游 `Cargo.toml` 中 `license = "MIT"`。

也就是说，**你拿到的第一份代码就已经是 MIT 授权的了**，你从未拿到过"非商业 / 保留所有权利 / 禁止分发"的代码。

---

## 三、MIT 到底允许了什么

MIT 协议的核心是四句话：

1. 你可以**免费**使用、复制、修改、合并、发布、分发、再授权、出售本软件；
2. 唯一的强制义务：**在所有副本或实质性部分中保留版权声明和许可声明**；
3. 作者**不承担担保责任**；
4. 作者**不承担赔偿责任**。

关键推论：

- **MIT 不要求开源。** 你可以把基于它的代码用于闭源商业产品。
- **MIT 允许改名换皮。** 商标、界面、图标、文档都可以改。
- **MIT 允许收紧协议。** 你可以把衍生作品以更严格的协议发布。
- **MIT 唯一的硬约束**是"别把版权声明删了"。

所以你的疑问"MIT 是不是不够严格、能不能保护我"——答案是：MIT 保护不了你免于被抄，这是它的设计目的（最大化使用）。但它完全、彻底、永久地允许你把这个项目开源、重命名、再分发。

---

## 四、能不能"只署你自己的名字"

这是最容易踩的坑，答案分两种情况。

### 情况 A：MarkerOn 不是你写的 → **不可以只署自己**

只要你的代码里**实质性包含**上游代码（哪怕改动很少），MIT 的那条义务就依然适用：

> The above copyright notice and this permission notice shall be included in
> all copies or substantial portions of the Software.

删掉 `Copyright (c) 2026 MarkerOn` 就是**违反协议**。后果不是"有点不礼貌"，而是对方有权要求你停止分发、并主张赔偿。开源社区对这种行为的处理通常很直接（下架、追责、上游发律师函）。

本仓库的做法是**双署名**：

```markdown
MIT License

Copyright (c) 2026 轻幕 (qingmu)
Copyright (c) 2026 MarkerOn (ifer47) — portions inherited from the upstream project
See NOTICE for the full upstream attribution.
```

外加 `NOTICE` 文件保留上游 MIT 原文。这就是最稳妥、最常见、也是 GitHub 上绝大多数 fork 的标准做法。

### 情况 B：你就是 MarkerOn 的作者

如果 MarkerOn 真的是你本人（或你所在组织）写的，那就只需要署自己的名字，`NOTICE` 里的上游声明反而要去掉。你说"我是根据 MarkerOn 改的"，听起来上游不是你——所以请先确认这一点：

```powershell
git log --format='%an <%ae>' --all
```

如果所有提交的作者都是你自己，那 `authors = ["ifer47"]` 里的 ifer47 很可能也是你（或是你的另一个账号），此时情况 B 成立。

> **在确认之前，按情况 A（双署名）处理。** 这是唯一不会出错的选项。

---

## 五、"实质性包含"的边界在哪里

你可能想知道：我到底改了多少？需要不需要保留署名？

本仓库的实测数据（对比上游 `6802007` 与你的工作区）：

| 指标 | 数值 |
| --- | --- |
| 上游文件总数 | 239 |
| 与上游**逐字节完全相同**的文件 | **144** |
| 被修改过的文件 | 90 |
| 全新增加的文件 | 3 |
| 实际改动的代码行 | 约 +237 / −74 |

其中，**几乎全部 `src/` 与 `src-tauri/src/` 下的源码与测试文件与上游逐字节相同**，例如：

```
src/components/DrawingOverlay.vue
src/composables/useDrawing.ts
src/composables/drawingRender.ts
src/composables/drawingGeometry.ts
src-tauri/src/lib.rs
src-tauri/src/overlay.rs
src-tauri/src/config.rs
src-tauri/src/commands.rs
src-tauri/src/monitor.rs
src-tauri/src/theme.rs
...
```

144 个逐字节相同的文件 = **远超"实质性部分"**。删掉上游署名在法律上站不住脚。

---

## 六、依赖协议体检结果

结论：**没有冲突**。

### 前端运行时依赖（会打进安装包）

| 协议 | 包 |
| --- | --- |
| MIT | `@excalidraw/laser-pointer`、Vue、Tauri 插件（MIT 选项） |
| ISC | `@lucide/vue` |
| Apache-2.0 OR MIT | `@tauri-apps/plugin-*` |

### Rust 直接依赖（会编译进二进制）

24 个直接依赖全部为 MIT / Apache-2.0 / `MIT OR Apache-2.0` / `Zlib OR Apache-2.0 OR MIT`。
单协议的 5 个：`xcap`(Apache-2.0)、`winreg`(MIT)、`tracing` / `tracing-appender` / `tracing-subscriber`(MIT)。

### ⚠️ 唯一需要注意的地方：构建期工具链

`package-lock.json` 里有：

- **10 个 LGPL-3.0-or-later** — 全部来自 `sharp` 附带的 libvips 预编译二进制
- **12 个 MPL-2.0** — 全部来自 `lightningcss`（Vite 的 CSS 压缩器）

它们都**只是构建期工具，不进入分发产物**：

- `lightningcss` 在你的机器上跑，把 CSS 压成一行；产物是压好的 CSS，不是它的源码。
- `sharp` 只被 `scripts/generate-icons*.mjs` 用来生成图标。

所以**分发出去的轻幕里没有任何一行 GPL/LGPL/MPL 代码**，不需要提供源码，也不构成 GPL 传染。

> 顺带一提：如果你把图标生成脚本换掉、删掉 `sharp` 依赖，这 10 条 LGPL 记录会一起消失，协议清单会更干净。这不是必须做的，只是可选的优化。

### 图标与图片

| 资源 | 协议 | 版权 |
| --- | --- | --- |
| `src-tauri/icons/*`、`assets/*`、`.github/assets/*` | MIT（继承自上游） | © 2026 MarkerOn |
| Lucide 图标 | ISC | © Lucide Contributors |

完整清单见 [THIRD-PARTY-LICENSES.md](./THIRD-PARTY-LICENSES.md)。

---

## 七、本次提取做了什么

为了产出可以直接对外发布的干净仓库，做了这些事：

**代码保持不变的部分**
- `src/`、`src-tauri/src/` 的全部业务逻辑原样保留（除了赞助商相关的 UI）
- 318 个前端测试全部通过，`vue-tsc` 类型检查通过，`oxlint` 无错误

**保留上游标识的部分（有意为之）**
- `src-tauri/src/rebrand.rs` — 读取旧标识 `com.annotpen.app` 以迁移用户配置
- `src/utils/rebrandStorage.ts` — 迁移 `annotpen-locale` 等旧 localStorage 键
- `src-tauri/src/portable.rs` — 兼容 `annotpen.portable` / `markeron.portable` 标记文件
- `AboutTab.vue` 与 `SettingsSidebarFooter.vue` 中的 MarkerOn 上游致谢链接
- `README` / `NOTICE` / `THIRD-PARTY-LICENSES.md` 中的上游署名

> 这些地方如果删掉，老用户升级后会丢失配置和便携模式状态。**保留它们既是技术需要，也是法律需要。**

**移除的部分**

| 移除项 | 原因 |
| --- | --- |
| `src-tauri/tauri.sign.conf.json` | 含你的**代码签名证书指纹** |
| `scripts/generate-cert.ps1` | 脚本里硬编码了签名证书密码 |
| `docs/` | 上游作者的线上官网（含 `CNAME: markeron.cn`、微信群二维码） |
| `packaging/` | 绑定上游作者的微软商店 ID / winget / scoop / homebrew 身份 |
| `src/data/afdian-sponsors.json` | 真实赞助者姓名与**付款金额**（第三方个人数据） |
| `scripts/sync-afdian-sponsors.mjs` | 调用上游作者的个人爱发电 API |
| `.github/FUNDING.yml` | 指向个人爱发电主页 |
| `assets/store-screenshots/` | 微软商店营销图 |
| `.github/issue-media/` | 上游 issue 追踪器的截图 |

**改写的部分**
- `LICENSE` — 改为 MIT，双署名
- `NOTICE` — 新增，保留上游 MIT 全文
- `THIRD-PARTY-LICENSES.md` — 新增，依赖协议清单
- `package.json` / `Cargo.toml` — `"license": "MIT"`，移除个人邮箱
- `README.md` / `README_zh.md` — 改为"自行构建"，加"致谢与协议"章节
- `PRIVACY.md` / `SECURITY.md` / `CODE_OF_CONDUCT.md` — 移除个人联系方式
- 关于页 — "暂未开源" → `MIT`，GitHub 链接指向本仓库，加上游致谢

**修复的一个构建缺陷**
- `src/components/SettingsView.vue` 通过 `/图标.png` 引用应用图标，该文件原本放在仓库根目录且未被 git 跟踪。本次已移入 `public/图标.png`，使 `npm run build:fe` 与 `vite build` 恢复正常。原仓库因该文件缺失而无法独立构建。

---

## 七之二、`check:engines` 与 sharp 的一处元数据笔误

**原症状**：`npm run check:engines` 失败，而 CI 的第一步就是它。

```
✖ Pinned Node 24.15.0 does not satisfy lockfile engine requirements:
  • @img/sharp-win32-ia32: requires node ^20.9.0
```

**本文档最初的诊断是错的。** 我曾以为 `satisfiesSingle()` 的 `^` 判断有 bug，
但查证锁文件后发现事实并非如此：

| 包 | `engines.node` |
| --- | --- |
| `@img/sharp-win32-x64` | `>=20.9.0` |
| `@img/sharp-darwin-arm64` | `>=20.9.0` |
| …另 14 个兄弟包 | `>=20.9.0` |
| **`@img/sharp-win32-ia32`** | **`^20.9.0`** ← 只有它不一样 |

按语义化版本规范，`^20.9.0` 表示 `>=20.9.0 <21.0.0`，**确实不匹配** Node 24.15.0。
**脚本的判断是正确的，错的是 sharp 自己发布的包元数据** —— 16 个兄弟包都写 `>=`，
只有 32 位 Windows 那个写成了 `^`，是上游的一处笔误。

**本次的修法**：不去改（本就正确的）版本比较逻辑，而是让脚本
**跳过 npm 本来就不会在本机安装的包**。`@img/sharp-win32-ia32` 标注了
`os: ["win32"]` + `cpu: ["ia32"]`，是 32 位 Windows 专用包，两个 CI 平台都装不到它：

| CI 任务 | 运行平台 | 为何跳过 |
| --- | --- | --- |
| `frontend` | ubuntu / x64 | `os` 不符（win32 ≠ linux） |
| `rust` | windows / x64 | `cpu` 不符（ia32 ≠ x64） |

逻辑上这是更正确的做法：npm 不装的包，其引擎约束与当前平台无关。

已做反向测试确认**没有削弱检查能力**：

```
Host win32/x64 — checked 3 range(s), skipped 1.
  – skipped win32-ia32-only (requires node ^18.0.0)
✖ Pinned Node 24.15.0 does not satisfy lockfile engine requirements:
  • bad-caret: requires node ^18.0.0
  • really-incompatible: requires node >=30
```

真实不兼容仍会被检出（`^18.0.0`、`>=30` 都报错了），
只是不再为装不上的平台包误报。想看跳过清单可跑
`node scripts/check-lock-engines.mjs --verbose`。

> `sharp` 只是 `scripts/generate-icons*.mjs` 用的开发依赖，不进分发产物。
> 若上游修好了这处笔误，这条记录会自动消失，本仓库无需再改。

---

## 八、仓库地址

仓库地址已填好，无需再替换占位符：

| 平台 | 地址 |
| --- | --- |
| GitHub | <https://github.com/jinyu-yjy-jinyu/qingmu> |
| Gitee | <https://gitee.com/jinyuliaodiannao/qingmu> |

已写入以下位置：`package.json`（repository / bugs / homepage）、
`src-tauri/Cargo.toml`（repository）、`src/components/settings/AboutTab.vue`（关于页 GitHub 链接）、
`scripts/release.mjs`、`scripts/consolidate-github-release.mjs`、
`scripts/build-portable.sh`、`.cursor/skills/release/SKILL.md`。

`README.md` / `README_zh.md` 中的徽章与下载链接**不指向任何下载站**，
而是说明"本仓库不含预编译包，请自行构建"，因此不需要改。

> 打开应用「设置 → 关于」时，GitHub 一栏会指向
> `https://github.com/jinyu-yjy-jinyu/qingmu`。等你 GitHub 仓库建好后即可正常跳转。

另外建议：

1. `package.json` 的 `author` 改成你的名字或组织名
2. `appxmanifest.xml` 里的 `Publisher` GUID 和 `PublisherDisplayName` 改成你自己的
3. `src-tauri/tauri.conf.json` 的 `identifier`（当前 `com.lightcurtain.app`）建议改成你自己的域名
4. 你**自己的**签名配置请自行创建，不要把证书指纹写进仓库

---

## 九、发布时的检查清单

- [ ] 确认 `LICENSE` 中的 `Copyright (c) 2026 MarkerOn` 一行**未被删除**
- [ ] 确认 `NOTICE` 与 `LICENSE` 都提交进了仓库
- [ ] `README` 中的致谢与协议章节保留
- [ ] 确认仓库里没有 `*.pfx` / `*.cer` / `.cert-thumbprint` / `tauri.sign.conf.json`
- [ ] 如果 MarkerOn 确实是你本人写的 → 把情况 B 的处理方式告诉我，我帮你把 `NOTICE` 调整成单署名版本
- [ ] `npm test && npm run lint && npx vue-tsc --noEmit` 全绿
- [ ] `cd src-tauri && cargo fmt --check && cargo clippy -- -D warnings && cargo test` 全绿

---

## 十、常见问题

**Q: 我能不能改成 GPL 或其他协议？**
能。MIT 允许你以任何兼容条款重新授权衍生作品，包括 GPLv3、Apache-2.0 或商业闭源。

**Q: 我能不能闭源发布？**
能。MIT 明确允许。但只要你的代码里含有上游的实质性部分，仍必须保留 MarkerOn 的版权声明。

**Q: "MarkerOn" 这个名字我能继续用吗？**
不建议。MIT 只授权代码，不授权商标。改名为"轻幕"是正确做法，本仓库已完成。

**Q: 我改了这么多，还需要署名吗？**
需要。你改的部分归你，原有的部分仍归 ifer47。署名是针对"实质性包含"这件事，不取决于你改了多少。

**Q: 为什么不能只署我一个人？**
见第四节。144 个文件与上游逐字节相同，属于典型的"实质性部分"，删掉署名违反 MIT。

---

## 参考

- MIT License 全文：见 [LICENSE](./LICENSE)
- 上游声明：见 [NOTICE](./NOTICE)
- 依赖协议：见 [THIRD-PARTY-LICENSES.md](./THIRD-PARTY-LICENSES.md)
- 上游项目：[github.com/ifer47/markeron](https://github.com/ifer47/markeron)
- SPDX MIT 条款说明：[spdx.org/licenses/MIT.html](https://spdx.org/licenses/MIT.html)

> 本文件是工程说明，不是法律意见。如果你的具体情况与此不同（例如你本身就是 MarkerOn 的作者），请咨询专业法律意见。