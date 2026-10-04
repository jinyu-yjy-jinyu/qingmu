# Third-Party Licenses

轻幕 bundles and depends on the components below. All are compatible with
distributing 轻幕 under the MIT License.

- **Upstream project:** see [NOTICE](./NOTICE) — MarkerOn, MIT, © 2026 MarkerOn.
- **Self-inventory:** regenerate npm figures with
  `node -e "const l=require('./package-lock.json');..."` against `package-lock.json`;
  Rust versions are pinned in `src-tauri/Cargo.lock`.

## Summary

| Scope | Conclusion |
| --- | --- |
| Upstream project (MarkerOn) | MIT — compatible |
| Runtime npm dependencies | All MIT / ISC / Apache-2.0 — compatible |
| Build-time npm dependencies | All MIT / ISC / BSD / Apache-2.0 / MPL-2.0 / LGPL-3.0 — compatible, not shipped |
| Rust crates (direct) | MIT / Apache-2.0 / MIT OR Apache-2.0 — compatible |
| Bundled images & icons | Inherited from MarkerOn (MIT) or Lucide (ISC) |

No copyleft (GPL / LGPL / AGPL) code is compiled into, linked with, or
distributed alongside the shipped 轻幕 application.

## Upstream project

| Component | License | Copyright |
| --- | --- | --- |
| [MarkerOn](https://github.com/ifer47/markeron) | MIT | © 2026 MarkerOn |

This is the project 轻幕 was forked from. See [NOTICE](./NOTICE).

## Application icons and imagery

| Asset group | License | Copyright |
| --- | --- | --- |
| `src-tauri/icons/*`, `assets/*`, `.github/assets/*` | MIT (inherited) | © 2026 MarkerOn |
| `public/icon.svg` and the inline SVG paths in `src/components/settings/AboutTab.vue` | MIT (inherited) | © 2026 MarkerOn |
| Lucide icons (`@lucide/vue`) | ISC | © Lucide Contributors |

The Lucide icons are the only third-party icon set bundled into the app; they
are distributed as SVG path data by `@lucide/vue` under the ISC License.

## Rust dependencies (`src-tauri/Cargo.toml`)

Versions below are as pinned in `src-tauri/Cargo.lock`.

| Crate | Version | License |
| --- | --- | --- |
| `tauri` | 2.11.3 | Apache-2.0 OR MIT |
| `tauri-build` | 2.6.3 | Apache-2.0 OR MIT |
| `tauri-plugin-global-shortcut` | 2.3.2 | Apache-2.0 OR MIT |
| `tauri-plugin-opener` | 2.5.4 | Apache-2.0 OR MIT |
| `tauri-plugin-autostart` | 2.5.1 | Apache-2.0 OR MIT |
| `tauri-plugin-single-instance` | 2.4.2 | Apache-2.0 OR MIT |
| `tauri-plugin-process` | 2.3.1 | Apache-2.0 OR MIT |
| `tauri-plugin-dialog` | 2.7.1 | Apache-2.0 OR MIT |
| `serde` | 1.0.228 | MIT OR Apache-2.0 |
| `serde_json` | 1.0.150 | MIT OR Apache-2.0 |
| `thiserror` | 2.0.18 | MIT OR Apache-2.0 |
| `tracing` | 0.1.44 | MIT |
| `tracing-appender` | 0.2.5 | MIT |
| `tracing-subscriber` | 0.3.23 | MIT |
| `time` | 0.3.51 | MIT OR Apache-2.0 |
| `ctrlc` | 3.5.2 | MIT OR Apache-2.0 |
| `xcap` | 0.9.6 | Apache-2.0 |
| `arboard` | 3.6.1 | MIT OR Apache-2.0 |
| `base64` | 0.22.1 | MIT OR Apache-2.0 |
| `image` | 0.25.10 | MIT OR Apache-2.0 |
| `dirs` | 6.0.0 | MIT OR Apache-2.0 |
| `dispatch2` | 0.3.1 | Zlib OR Apache-2.0 OR MIT |
| `winreg` | 0.55.0 | MIT |
| `windows-sys` | 0.61.2 | MIT OR Apache-2.0 |

Notes:

- Every dual-licensed crate may be used under the MIT option alone.
- `xcap` is Apache-2.0 only. Apache-2.0 is permissive and MIT-compatible; it
  requires preserving its own NOTICE/attribution when redistributing binaries.
  `xcap` ships no NOTICE file requiring extra action, and it is a macOS/monitor
  capture helper rather than a derivative of this project.
- `dispatch2` is only compiled on macOS.

## Frontend runtime dependencies (`dependencies` in `package.json`)

These ship inside the application bundle.

| Package | Version | License |
| --- | --- | --- |
| `@excalidraw/laser-pointer` | 1.3.2 | MIT |
| `@tauri-apps/plugin-autostart` | 2.5.1 | MIT OR Apache-2.0 |
| `@tauri-apps/plugin-dialog` | 2.7.1 | MIT OR Apache-2.0 |
| `@tauri-apps/plugin-process` | 2.3.1 | MIT OR Apache-2.0 |
| `@lucide/vue` | 1.8.0 | ISC |

## Build-time dependencies (`devDependencies`)

Build-time only — never redistributed with the application.

| Package | Version | License |
| --- | --- | --- |
| `@commitlint/cli` | 20.5.0 | MIT |
| `@lucide/vue` | 1.8.0 | ISC |
| `@tailwindcss/vite` | 4.2.2 | MIT |
| `@tauri-apps/api` | 2.11.1 | Apache-2.0 OR MIT |
| `@tauri-apps/cli` | 2.10.1 | Apache-2.0 OR MIT |
| `@vitejs/plugin-vue` | 6.0.6 | MIT |
| `czg` | 1.12.0 | MIT |
| `husky` | 9.1.7 | MIT |
| `icojs` | 1.0.0 | MIT |
| `jsdom` | 29.1.1 | MIT |
| `lint-staged` | 16.4.0 | MIT |
| `oxlint` | 1.60.0 | MIT |
| `prettier` | 3.8.3 | MIT |
| `sharp` | 0.35.3 | Apache-2.0 |
| `tailwindcss` | 4.2.2 | MIT |
| `typescript` | 6.0.2 | Apache-2.0 |
| `vite` | 8.0.8 | MIT |
| `vitest` | 3.2.4 | MIT |
| `vue` | 3.5.30 | MIT |
| `vue-tsc` | 3.2.6 | MIT |

Transitive build-time packages total 431 distinct entries in
`package-lock.json`, distributed as:

| License | Count |
| --- | --- |
| MIT | 343 |
| Apache-2.0 | 17 |
| ISC | 15 |
| Apache-2.0 OR MIT | 13 |
| LGPL-3.0-or-later | 10 |
| MPL-2.0 | 12 |
| BSD-3-Clause | 5 |
| BSD-2-Clause | 3 |
| MIT OR Apache-2.0 | 3 |
| Apache-2.0 AND LGPL-3.0-or-later | 3 |
| MIT-0 | 2 |
| 0BSD | 1 |
| Apache-2.0 AND LGPL-3.0-or-later AND MIT | 1 |
| BlueOak-1.0.0 | 1 |
| CC0-1.0 | 1 |
| Python-2.0 | 1 |

### Copyleft in the build toolchain

Ten LGPL-3.0-or-later and twelve MPL-2.0 entries appear, all reachable only
through build-time tooling. They are **not** linked into or redistributed with
the 轻幕 application.

| Package | License | Why it is not a concern |
| --- | --- | --- |
| `lightningcss` (+ platform binaries) | MPL-2.0 | Pulled in by Vite for CSS minification. Runs at build time on the developer/CI machine. Its output is minified CSS, not its source. |
| `@img/sharp-libvips-*` (8 platforms) | LGPL-3.0-or-later | Prebuilt libvips binaries inside the optional `sharp` dependency. `sharp` is used only by `scripts/generate-icons*.mjs` for icon generation. |
| `@img/sharp-wasm32`, `@img/sharp-win32-*` | Apache-2.0 AND LGPL-3.0-or-later | Same as above — optional prebuilt `sharp` binaries. |

None of these are reachable from `dependencies` (runtime) or from the Rust
crate graph, so the distributed application contains no MPL or LGPL code.

If you replace the icon-generation scripts with a different approach, you can
drop `sharp` entirely and the last LGPL entries disappear.

## Tooling not redistributed

Node.js, npm, Rust, cargo, Vite, Tauri CLI, and the CI runners are used to
build the project but are not distributed as part of 轻幕.