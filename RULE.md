# RULE.md — 轻幕项目规范

> 本文件是**项目级硬性规范**。任何 AI 或人,在改动本项目之前必须先读本文件。
> 违反本文件的改动一律视为缺陷。

最后更新:2026-10-06 · 对应版本 v1.0.2

---

## 0. 项目身份

| 项 | 值 |
|---|---|
| 产品名(中文) | `轻幕` |
| Rust crate | `lightcurtain` |
| 应用 ID | `com.lightcurtain.app` |
| 主页/源码标识 | 旧品牌名(历史遗留,勿再用于新产品名) |

**历史遗留警告**:仓库中仍残留 `AnnotPen` / 旧品牌英文标识 / `annotpen.exe` 字样,例如
`scripts/build-portable.sh`、`scripts/consolidate-github-release.mjs`。
这些是改名前的残留,**禁止**在新代码中继续使用,清理时需同步修正引用方。

---

## 1. 图标规范(强制)

### 1.1 唯一主图标

**唯一权威源文件:`最终图标.png`**(项目根目录,1254×1254,带 alpha 通道)。

> 该文件名含中文,但 **Rust / NSIS / WiX / Windows 资源编译器均无法可靠处理非 ASCII 路径**,
> 因此**任何构建流程都不得直接引用它**。引用前必须先转成英文名的派生源。

**铁律:**
1. 禁止把 `最终图标.png` 原地改名或移动 —— 它是设计源文件,必须保留。
2. 需要英文名时,复制一份到 `src-tauri/icons/` 并用英文名(如 `app-icon-source.png`),
   **同时告知使用者改名事实**。
3. 任何图标更新都必须**从 `最终图标.png` 重新生成全套**,不允许只改单个文件 ——
   只改一个会导致 exe 图标、开始菜单、托盘、安装包四张脸不一致。

### 1.2 必须产出的图标矩阵

改图标时,下列文件**全部**要重新生成:

| 文件 | 尺寸/格式 | 用途 |
|---|---|---|
| `icons/32x32.png` | 32 PNG | 安装器、列表小图标 |
| `icons/128x128.png` | 128 PNG | 安装器主图标 |
| `icons/128x128@2x.png` | 256 PNG | 高 DPI |
| `icons/icon.ico` | 多尺寸 ICO(16/32/48/64/128/256) | **exe 文件图标 / 开始菜单** |
| `icons/icon.icns` | macOS 图标包 | macOS 打包 |
| `icons/icon.png` | 512 PNG,带 alpha | 托盘(浅色系统)/ 标题栏(浅色主题) |
| `icons/icon-light.png` | 512 PNG,带 alpha | 托盘(深色系统)/ 标题栏(深色主题) |
| `icons/installer-icon.ico` | ICO | 安装程序自身图标 |
| `icons/installer-sidebar.bmp` | **真 BMP** | NSIS 侧边栏 |
| `icons/installer-banner-blank.bmp` | **真 BMP** | WiX 顶部横幅 |
| `icons/installer-dialog.bmp` | **真 BMP** | WiX 对话框左侧图 |
| `src/assets/app-icon-84.png` | 84 PNG | 应用内设置页侧边栏(28px @3x) |

### 1.3 alpha 语义(极易出错)

托盘与标题栏图标按系统主题切换,**alpha 通道必须显式区分**:

- `icon-light.png`:深色系统主题下使用 → **必须带 alpha**,否则显示为黑方块
- `icon.png`:浅色系统主题下使用 → 需与设计源一致,**不得擅自增删 alpha**

判断依据是**设计源本身**:`最终图标.png` 带 alpha,则两者都保留 alpha。

### 1.4 格式铁律

> **扩展名必须与真实格式一致。NSIS 和 WiX 按扩展名解析,名实不符会导致:WiX「界面很丑」/ NSIS 报 `Error writing temporary file`。**

- `.bmp` → 文件头必须是 `42 4D`
- `.png` → 文件头必须是 `89 50 4E 47`
- `.ico` → 文件头必须是 `00 00 01 00`,且**各条目 offset 不得重叠**,尺寸/字节数必须自洽

**2026-10-06 实例**:三个 `.bmp` 实际是 JPEG 内容(`ff d8 ff db`),构建日志出现
`warning 5040: Unsupported format ...bmp`,NSIS 报 `Error writing temporary file`,
WiX 界面错乱。`.ico` 的条目 offset 也互相重叠。三者都源于「用错扩展名 / 手改二进制」。

### 1.5 重新生成图标

```bash
node scripts/generate-icon-set.mjs
```

该脚本从 `src-tauri/icons/app-icon-source.png` 重建 §1.2 全套图标,并在输出里
直接打印 `BMP=OK` / `ICO=OK` 标记。

**两个必须注意的编码细节(已踩过坑):**

1. **ICO 内必须是真彩色 PNG。**
   Windows 资源编译器拒绝调色板(indexed)PNG,会报:
   ```
   failed to decode icon .../icon.ico: Unsupported PNG color type: Indexed
   ```
   所以 ICO/ICNS 内的 PNG 必须显式 `palette: false`。压缩率略低,换来可编译。

2. **本机 libvips 不含 BMP 编码器。**
   `sharp(...).bmp()` 与 `toFormat('bmp')` 都不可用。脚本改用 `bmp-ts`
   (经 `icojs` 已在依赖树中)。
   注意 `bmp-ts` 的 `encode()` 返回 `BmpEncoder` 实例:
   **完整文件在 `.data`,`.buffer` 是输入像素数组** —— 取错会得到全是 `ff` 的废文件。

> 本脚本不需要 sharp 之外的新依赖。改动它后请跑一次构建验证。

---

## 2. 版本号规范(强制)

版本号是 `MAJOR.MINOR.PATCH`,**必须**在以下 6 处同步:

| # | 文件 | 形式 |
|---|---|---|
| 1 | `package.json` | `"version": "1.0.2"` |
| 2 | `package-lock.json` | `version` + `packages[""].version` |
| 3 | `src-tauri/Cargo.toml` | `version = "1.0.2"` |
| 4 | `src-tauri/Cargo.lock` | `[[package]] name = "lightcurtain"` 的 version |
| 5 | `src-tauri/tauri.conf.json` | `"version": "1.0.2"` ← **决定安装包文件名** |
| 6 | `appxmanifest.xml` | `Version="1.0.2.0"` ← **四段式** |

**唯一合法的改版本方式:`npm run release patch|minor|major`。**
`scripts/lib/version.mjs` 的 `writeVersion()` 是上述 6 处的唯一写入点。

> 历史 bug(已修):该脚本曾只覆盖前 4 处,漏掉 `tauri.conf.json` 与 `appxmanifest.xml`,
> 导致安装包文件名仍停留在旧版本号;且 Cargo.lock 正则写死了改名前的包名 `annotpen`,
> 实际包名已是 `lightcurtain`。**改动此脚本时必须实际验证 6 处都被写入。**

---

## 3. 构建与产物规范(强制)

### 3.1 命令

| 目的 | 命令 |
|---|---|
| 前端构建(带类型检查) | `npm run build:fe` |
| 完整安装包 | `npx tauri build` |
| 签名安装包 | `npm run build:sign` |

### 3.2 产物归档规则

- 新产物拷入 **`release-output/`**。
- **`release-output/` 中的历史版本文件一律不得删除或覆盖** —— 它们可能仍在对外分发渠道。
  每个版本用带版本号的独立文件名,天然不冲突。
- 每次归档前后都应确认历史文件的修改时间未变。

### 3.3 体积预算

前端 `dist/` 应保持在 **400 KB 以内**。

主因是超大 PNG 资源。若 `dist/` 异常增大,先查是否有高分辨率原图被打包
(典型:1254×1254 的图只以 28px 显示)。

**经验规则:图片按实际显示尺寸 × 最大像素密度生成,不要直接塞原图。**

---

## 4. 安装/卸载规范(强制)

### 4.1 只能有一种安装格式

系统内**有且仅有一个「轻幕」**。同一版本**不要同时分发 MSI 和 NSIS 两种安装包**
—— 二者通过不同机制登记卸载项,彼此不可见,结果是两个「轻幕」并存、
新包装不上旧版、用户卸载时残留。

**要求:对外分发只保留一种格式。**

`tauri.conf.json` 的 `bundle.targets` **已固定为 `["nsis"]`**(不再用 `"all"`),
原因:

- NSIS `installMode: currentUser` 不需管理员权限,卸载入口稳定为
  `%LOCALAPPDATA%\轻幕\uninstall.exe`
- 历史上 WiX 生成的是 MSI,需要管理员权限,且与 NSIS 互不识别

> **不要为了「多平台/多格式」把 `targets` 改回 `"all"`。**
> 需要 macOS 包时用 `--target aarch64-apple-darwin` 单独构建,而不是靠 `"all"`。

### 4.2 升级前清理旧版

已装过 MSI 版的老用户,新 NSIS 包**无法**自动发现并卸载它。
发布新版本时,需让用户先执行一次清理:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\uninstall-all.ps1 -DryRun   # 先看
powershell -ExecutionPolicy Bypass -File scripts\uninstall-all.ps1          # 再执行
```

该脚本会枚举注册表全部卸载项 → 静默卸载(MSI 走 `msiexec /x`,NSIS 走 `/S`)
→ 兜底清理残留注册表项与目录 → 复查。

> ⚠️ **脚本必须存为 UTF-8 with BOM**。Windows PowerShell 5.1 默认按 GBK 读取
> 无 BOM 的 UTF-8,中文产品名会变乱码,导致 `DisplayName -like '*轻幕*'` 匹配不到,
> 脚本会「什么都没找到」而静默失败。

| NSIS (currentUser) | `轻幕`(显示名同名) |
| WiX MSI | `{GUID}` |

### 4.3 NSIS 报 "Error writing temporary file" 的排查
**现象**:双击安装包立刻弹出 `NSIS Error` → `Error writing temporary file. Make sure your temp folder is valid.`

**这不是 TEMP 权限问题。** 已逐项排除(全部为**负结论**,不要再重复走):

| 猜测 | 实测 | 结论 |
|---|---|---|
| TEMP 目录不可写 | 用 .NET 写 2 MB / 84 KB 均成功 | ❌ |
| TEMP 磁盘空间不足 | C: 剩余 105 GB | ❌ |
| 磁盘配额 | `Quotas are not enabled` | ❌ |
| 残留 `~nsu*.tmp` 权限受限 | 删掉后仍然失败 | ❌ |
| 短路径 `ADMINI~1` | 改用长路径仍失败 | ❌ |
| 安装包被截断 | PE overlay 与 header 声明长度一致 | ❌ |
| 安装包体积 / 多语言 / 中文安装路径 | 同等条件的自制包 exit 0 | ❌ |
| CRC 校验 (`/NCRC` 可绕过) | 加了仍失败 | ❌ |

**已确认的事实**:
- 用 Tauri CLI **原样**生成的 `nsis-output.exe` 同样失败 → 与 tauri-bundler 后处理无关。
- 在 Tauri 生成的 `installer.nsi` 里,`.onInit` **第一条语句之前**就失败,
  连 `FileOpen` 写日志都做不到 → 失败发生在 **PE stub 解包阶段**,脚本一行都没执行。
- 项目里**上一版 1.0.1 的安装包也同样报错** → 该现象早于本次改动存在。

**结论**:这是**运行环境/NSIS stub 层**的问题,不是项目代码问题。
在其它机器上构建/安装一份验证;若同样失败,属环境缺陷,应向构建环境反馈。

> 诊断时曾用的插桩脚本(`trace-nsis.cjs` 等)已清理,不要留在仓库里。

---

## 5. 代码与构建约束

- **依赖不得随意删除**:`Cargo.toml` 中每个 crate 都应确有引用。
  减体积优先走「资源瘦身 / 编译 profile」,而非删依赖(易导致功能缺失)。
- **编译 profile**(`src-tauri/Cargo.toml`):

  ```toml
  [profile.release]
  opt-level = 3
  lto = "fat"
  codegen-units = 1
  panic = "abort"
  strip = "symbols"
  ```

  - `strip = "symbols"` 比 `strip = true` 更彻底。
  - `opt-level` 保持 `3`。这是实时绘制工具,改成 `"z"` 会牺牲运行性能。
  - `trim` 是 nightly-only 选项,stable 下会报 `unused manifest key` 警告,**不要写**。
- **不要手改 `Cargo.lock` / `package-lock.json`**,除非通过脚本。

---

## 6. 发布前检查清单

```bash
npx vue-tsc --noEmit          # 类型
npm run lint                  # 0 errors
npm test                      # 前端测试
cd src-tauri && cargo fmt --check && cargo clippy -- -D warnings
```

打包后:
- [ ] 构建日志中**没有** `warning 5040: Unsupported format`
- [ ] 按 §1.4 校验所有图标文件头
- [ ] 全新虚拟机/干净账户实测安装 → 覆盖升级 → 卸载
- [ ] 确认系统「已安装的应用」里只有一个「轻幕」
- [ ] 按 §3.2 确认历史产物未被改动

---

## 7. AI 助手行为准则

1. **先读本文件**,再动手。
2. **不要编造**:没验证过的事不要写成结论。没目视确认过的图片,不要声称「视觉正常」。
3. **区分「我改的」与「本来就坏的」**:遇到失败测试/损坏文件,先用 `git diff` 确认归属,
   属于既有问题就如实说明,不要替用户背锅,也不要顺手改无关代码。
4. **破坏性操作前先验证路径**:`release-output/` 等目录只增不删。
5. **不确定就问**,不要猜用户意图(例如图标用途、是否允许覆盖)。
