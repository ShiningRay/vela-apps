# Vela Apps

Vela 桌面应用的 `.vpk` 示例包，独立于 [Vela](https://github.com/ShiningRay/vela) 主仓构建与发布。

## 应用

| 应用 | 来源 | 产物 |
|---|---|---|
| 科学计算器 | 本仓 `apps/scientific-calculator`，Solid/TS | `scientific-calculator.vpk` |
| Citrine Sheets | [rubyreact/citrine-sheets](https://github.com/ShiningRay/citrine-sheets) 的 Opal 构建产物 | `citrine-sheets.vpk` |
| Market Terminal | [rubyreact/citrine-market-terminal](https://github.com/ShiningRay/citrine-market-terminal) 的 Opal 构建产物 | `citrine-market-terminal.vpk` |

Vela 只保留 `.vpk` 安装器；应用源码、构建脚本和发布产物都在本仓。

## 安装

1. 打开 Vela → Settings → App packages。
2. 选择 `Install .vpk`，安装对应的包。
3. 双击桌面图标启动。

## 构建

要求 Node 22+、pnpm 12+。

```bash
pnpm install
pnpm test
pnpm build
```

产物在 `dist/vpk/`，包含三个 `.vpk`、`README.md` 与 `SHA256SUMS`。校验：

```bash
cd dist/vpk
shasum -a 256 -c SHA256SUMS
```

## 发布

推送 `v*` 标签会触发 [`.github/workflows/release.yml`](.github/workflows/release.yml)，构建并把 `.vpk` 与 `SHA256SUMS` 上传到 GitHub Release。

本地也可以手动发布：

```bash
pnpm build
gh release create v0.1.0 dist/vpk/*.vpk dist/vpk/SHA256SUMS \
  --title "Vela Apps v0.1.0" --notes "Calculator, Citrine Sheets and Market Terminal VPK demos."
```

## 目录

```
apps/scientific-calculator/   计算器源码、测试与 manifest
apps/citrine-sheets/          Opal HTML/CSS/JS 与 manifest
apps/citrine-market-terminal/ Opal HTML/CSS/JS 与 manifest
scripts/build.mjs             打包三个 .vpk
```

Ruby/Opal 两个应用的 `index.html`、`styles.css` 与 `*.js` 是其源码仓的构建产物；更新时从对应仓库重新复制后提交。

## License

MIT
