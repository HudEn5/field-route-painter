# 赛场路线画板 · Field Route Painter

四人 Git 协作练习：用 HTML Canvas 制作赛场路线打点画板，体验认领任务、分支开发、测试、PR、合并和同步流程。

**当前状态：T00 基础框架及 T01、T02、T03 基本功能均已合入 main。** T01 关联 [PR #7](https://github.com/HudEn5/field-route-painter/pull/7)，T02 关联 [PR #10](https://github.com/HudEn5/field-route-painter/pull/10)，T03 关联 [PR #8](https://github.com/HudEn5/field-route-painter/pull/8)。接下来由 T04 完成最终联合验收和页面文案整理，再由 T05 完成单文件交付及版本标记。

## 1. 目标和交付

按任务截图，10 月 30 日前提交仓库链接和最终 HTML 文件。先完成基本功能，再考虑扩展。

- 点击画布生成路径点，按点击顺序连接。
- 撤销最后一个点，一键清空全部路径。
- 切换红方/蓝方配色，切换时保留路径。
- 显示路径点坐标和鼠标位置，可关闭坐标显示。
- 最终交付可独立打开、无需网络和其他资源文件的单个 HTML。

本轮范围：浏览器画板。机器人控制、真实场地标定、账号登录、服务器、自动寻路不在基本任务中。页面逻辑坐标不代表毫米或真实场地尺寸。

## 2. 立即运行

无需安装依赖，双击根目录的 `index.html`，使用 Chrome 或 Edge 打开。修改文件并保存后，刷新浏览器查看结果。

当前可用：点击打点、按顺序连线、点编号和计数、撤销最后一点、一键清空、红蓝阵营切换、鼠标坐标及路径坐标列表、坐标显示开关。无路径点时撤销和清空按钮会禁用；切换配色或坐标显示不会删除路径，刷新页面会清空当前路线。

可选本地服务器（已安装 Python 时）：

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

打开 `http://127.0.0.1:8000`，终端按 Ctrl+C 停止。不要使用 ES module 的 `import/export`，以保留双击 HTML 的运行方式。

## 3. 任务认领和看板

A 为 HudEn5；当前负责人见下表，角色列为建议分工。每人使用自己的 GitHub 账号提交。

1. 在仓库 Issues 中申请认领，标题如 `[认领任务] T01`，正文写明任务编号、GitHub 用户名和预计完成时间。
2. A 确认没有重复认领，在 Issue 中回复确认并设置 Assignees（负责人），再统一通过文档 PR 更新下表。认领 Issue 保持 Open，用于跟踪开发；功能完成、验证并合并后再关闭。
3. **T00 合入 main 后**，认领者 Fetch，从最新 `origin/main` 创建自己的任务分支。不要从别人的任务分支开始。
4. 完成功能、自测、同步最新 main，再提 PR；A 合并并发通知后才改成“已合并”。

状态：待认领 / 开发中 / 待合并 / 已合并。A 确认认领后进入“开发中”；功能通过验证并合并后才标为“已合并”。T01、T02、T03 可以并行开发，合并后再联合测试。

| 编号 | 任务 | 建议角色 | GitHub 负责人 | 状态 | 依赖 | 认领 Issue | 相关 PR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T00 | 基础框架、公共接口、任务文档、打包脚本 | A | HudEn5 | 已合并 | 无 | 无 | [#2](https://github.com/HudEn5/field-route-painter/pull/2) |
| T01 | 点击打点与路径绘制 | B | HEEYEEW | 已合并 | T00 合并 | [#5](https://github.com/HudEn5/field-route-painter/issues/5) | [#7](https://github.com/HudEn5/field-route-painter/pull/7) |
| T02 | 撤销与一键清空 | C | mikeypandeserve | 已合并 | T00 合并；与 T01 联测 | [#4](https://github.com/HudEn5/field-route-painter/issues/4) | [#10](https://github.com/HudEn5/field-route-painter/pull/10) |
| T03 | 红蓝配色和坐标显示 | D | Dyeverse | 已合并 | T00 合并；与 T01 联测 | [#3](https://github.com/HudEn5/field-route-painter/issues/3) | [#8](https://github.com/HudEn5/field-route-painter/pull/8) |
| T04 | 功能集成与联合验收 | A 组织，全员测试 | HudEn5 | 开发中 | T01、T02、T03 合并 | 无 | 待创建 |
| T05 | 单文件交付、使用说明和版本标记 | A | HudEn5 | 待认领 | T04 通过 | 无 | 待创建 |

### T00 · 基础框架（A）

- 准备页面布局、Canvas 网格、共享状态、模块入口和 Git 配置。
- 固定逻辑坐标、DOM ID、模块调用方式，提供 PR 模板及单文件打包脚本。
- 验收：直接打开页面能显示网格，无初始化错误；打包后的 HTML 可独立打开。
- 只提供骨架，T01/T02/T03 的具体交互留给认领者实现。

### T01 · 点击打点与路径绘制（建议 B）

- 修改范围：`src/interactions.js`、`src/renderer.js`。
- 点击画布，用 `canvasToPoint(event)` 转为逻辑坐标，追加到共享 `points`。
- `renderer.draw(state)` 完整重绘网格、依次连接相邻点、画点及从 1 开始的编号。
- 根据 `state.team` 选择路线颜色：红方 `#b94740`，蓝方 `#346db5`。
- 无点时只画网格，一个点时只画点；重绘或切换阵营不能丢失路线。
- 同步 Canvas 的 `aria-label`，描述当前路径点数量。
- 验收：依次点击 3 个位置，出现 3 个点和 2 段连线；缩小窗口后点击仍准确；边缘点坐标在 0 到 1000 内。

### T02 · 撤销与一键清空（建议 C）

- 修改范围：`src/controls.js`。
- 绑定已有按钮，通过 `store.setState` 更新数据，不自己绘图。
- 撤销删除最后一点，清空删除所有点；无点时禁用按钮，有点时启用。
- 订阅状态更新按钮，不依赖 T01 的内部实现。
- T01 未完成时可用第 5 节的控制台示例造点自测；刷新恢复初始状态，不提交临时测试代码。
- 验收：3 个点连续撤销到 0，无异常；清空后计数归零；重新打点正常；阵营和坐标开关不被重置。
- 联测：与 T01 合并后，确认点、连线和点计数同步变化。

### T03 · 红蓝配色和坐标显示（建议 D）

- 修改范围：`src/coordinates.js`；必要时调整 `styles/main.css` 的配色/坐标列表样式。
- 启用阵营选择和坐标开关，将选择写入 `team` / `showCoordinates`。
- `app.js` 已负责同步 `body.dataset.team`、点计数和触发重绘，不要重复订阅绘图或修改 T01 文件。
- 鼠标在画布内移动时显示逻辑坐标，移出时显示占位文字；列表按路径顺序显示点坐标。
- 显示值四舍五入，存储数据不取整。关闭坐标时隐藏鼠标读数和列表，保留路线；再开启恢复显示。
- 无点时显示空状态；清空、撤销后列表同步变化。
- 验收：切换红蓝不丢点；坐标开关不影响路线；缩放后读数正确。
- 联测：与 T01 合并后确认路线颜色变化，与 T02 合并后确认列表同步。

### T04 · 集成和联合验收（A 组织）

- 在最新合并版本按第 8 节逐项测试，全员确认各自负责的功能。
- 问题记录步骤、预期及实际结果；由负责人从最新 `origin/main` 开 `fix-<GitHubID>-<任务>` 分支修复并提 PR。
- 基本功能完成后，A 单独提 PR 移除页面“待实现”、基础框架徽标、开发任务说明，将状态文字改为真实运行状态。
- 未通过项不能标为完成，不直接向 main 提交修复。

### T05 · 打包和交付（A）

- 用第 7 节脚本生成单文件 HTML，在空文件夹中断网打开并重新验收。
- 通过文档 PR 完善使用说明及真实验收记录，保留任务认领和功能 PR 的追溯信息。
- 交付仓库链接和 `dist/field-route-painter.html`；`dist/` 是生成产物，不纳入 Git。
- 在实际验证过的提交上创建并推送带说明的 tag，例如 `v1.0.0`；完成前不要提前打正式 tag。
- 本项目不涉及上车；规范中的车辆、接线等项说明不适用，改记浏览器、步骤、测试成员、日期和结果。

## 4. 目录和修改边界

```text
index.html                          A：页面结构、控件 ID、脚本顺序
styles/main.css                     A：基础布局；T03 可改配色/坐标样式
src/store.js                        A：共享状态接口
src/app.js                          A：初始化和公共 DOM 映射
src/renderer.js                     T01：网格、路径、点及编号
src/interactions.js                 T01：画布点击事件
src/controls.js                     T02：撤销和清空
src/coordinates.js                  T03：阵营和坐标
scripts/build.mjs                   A：单文件 HTML 打包
.github/pull_request_template.md    A：PR 描述模板
.gitattributes / .gitignore         A：共享 Git 配置
dist/                              自动生成，Git 忽略
```

普通脚本按 `index.html` 的顺序加载，共用 `window.RoutePainter` 命名空间。更改公共文件名、接口、DOM ID、加载顺序前先与 A 协商，再通过 PR 更新约定。不提交本机代理配置、绝对路径和临时测试代码。

## 5. 公共接口（T00 合并后固定）

```javascript
const state = window.RoutePainter.store.getState();
// { points: [], team: "red", showCoordinates: true }
// points 中每个点格式：{ x: 120.5, y: 300 }

// 状态为只读快照，不能 state.points.push(...) 或直接改 state.team。
window.RoutePainter.store.setState({ points: [...state.points, { x: 200, y: 400 }] });
window.RoutePainter.store.setState({ team: "blue" });

// 只提供变化字段；更新后同步通知订阅者。
const unsubscribe = window.RoutePainter.store.subscribe((nextState) => {
  // 更新按钮或坐标列表，画布由 app.js 统一触发重绘。
});
// 不再需要监听时：unsubscribe();
```

- 画布逻辑尺寸固定 `1000 × 1000`，左上角 `(0, 0)`，X 向右、Y 向下；数值在 `[0, 1000]`。
- 页面显示尺寸会变，必须用 `renderer.canvasToPoint(event)` 换算，不能直接存 `clientX/clientY`。
- 状态仅在当前页面内存中，刷新后重置；本轮不做持久化。
- `subscribe` 只监听后续变化；模块初始化时先主动用 `getState()` 更新一次自己的 UI。
- `app.js` 调用各模块的 `init(context)`，每个模块只绑定一次事件。
- `context` 包含 `store`、`renderer`、`elements`，公共 DOM 如下。

| elements 字段 | DOM ID | 用途 |
| --- | --- | --- |
| `canvas` | `route-canvas` | 点击、移动和坐标换算 |
| `undoButton` / `clearButton` | `undo-button` / `clear-button` | T02 按钮 |
| `teamSelect` | `team-select` | T03 阵营选择 |
| `coordinatesToggle` | `coordinates-toggle` | T03 坐标开关 |
| `pointerCoordinates` | `pointer-coordinates` | T03 鼠标读数 |
| `coordinateList` / `coordinatesEmpty` | `coordinate-list` / `coordinates-empty` | T03 列表及空状态 |

T02/T03 可在浏览器开发者工具 Console 中临时执行以下内容自测 UI；T01 未实现时，画布不会画出这些点：

```javascript
RoutePainter.store.setState({ points: [{ x: 100, y: 100 }, { x: 500, y: 500 }, { x: 900, y: 200 }] });
```

## 6. 每个任务的 Git 流程

完整规则见仓库内《四人 Git 协作规范_精简修订版.pdf》。以下以 T01 为例，替换 `你的GitHubID` 和实际任务名。

```powershell
# 先 git status 并保存已有工作；工作区干净后继续。
git fetch origin
git switch --no-track -c feature-你的GitHubID-draw-route origin/main

# 完成开发、自测后，只暂存本任务的文件。
git add -- src/interactions.js src/renderer.js
git diff --cached
git commit -m "feat(画布): 添加点击打点和路径连线"

# 发 PR 前，在自己的任务分支同步 main；由本分支负责人解决冲突。
git fetch origin
git merge origin/main
# 同步后重新验证，再上传。
git push -u origin feature-你的GitHubID-draw-route
```

- PR：base 选 `main`，compare 选自己的任务分支。标题和提交格式为 `<type>(<模块>): <简短中文描述>`，模块必填。
- 填写任务编号、影响范围和真实验证记录，一个 PR 一个目标。
- A 核对改动、验证结果和冲突后用 Squash and merge；A 自己的代码也提 PR，由 A 合并。
- 谁改代码，谁以自己身份 Commit、Push、提 PR；A 不复制队友代码后代为提交。
- 合并后 A 在群内通知修改人、改动及影响范围、PR 链接、最新 main SHA。同步后回复“已同步 main 版本 xxx”，未同步回复“已知悉，暂未同步”。只 Fetch 不代表已同步。
- PR 作者确认合并后，同步本地 main，清理本地及远程任务分支。下个任务新开分支。Squash 后若提示分支未合并，先核对 PR 和 main 内容并找 A 确认，不直接强制删除。
- 不直接向 main 提交或推送，不强推公共历史；回滚也从最新 main 开 fix 分支并提 PR。

## 7. 生成最终单文件 HTML

安装 Node.js 18 或以上版本后，在项目根目录执行，无需 npm install：

```powershell
node scripts/build.mjs
```

输出 `dist/field-route-painter.html`，内联当前 CSS 和 JS。每次源码变化后重新打包。把输出文件单独复制到空文件夹，断网后双击验证。

以后若增加图片、字体等资源，必须同步调整打包方式，不能留下本地文件依赖。打包成功只代表生成了 HTML，不代表 T01/T02/T03 功能已完成。

## 8. 联合验收清单（功能合并后执行）

T04 工作区的 AI 辅助预检已完成，具体范围和结果见 [验收记录](docs/acceptance.md)。以下清单在最终 main 版本及交付 HTML 上确认通过后再勾选。

- [ ] 页面正常初始化，浏览器 Console 无异常。
- [ ] 点 3 次得到 3 个点、连续编号和 2 段连线。
- [ ] 调整窗口大小后点击位置、逻辑坐标仍准确。
- [ ] 连续撤销到 0，点和线依次消失；空路线无异常。
- [ ] 清空后点、线、计数和坐标列表归零，可以重新打点。
- [ ] 红蓝切换后路线颜色变化，点数和位置不变。
- [ ] 鼠标坐标及点列表正确，撤销/清空后同步更新。
- [ ] 关闭再打开坐标，路线不丢失，读数正确恢复。
- [ ] 单点、边缘点击、连续快速点击无异常。
- [ ] 手机宽度不横向溢出，工具栏换行、画布保持方形。
- [ ] 单文件 HTML 在另一文件夹断网打开后全部功能可用。

实际通过后才勾选；A 根据成员的真实测试结果更新记录。

| 测试成员 | 日期 | 浏览器/版本 | 对应提交 SHA | 步骤和结果 | 未通过项/修复 PR |
| --- | --- | --- | --- | --- | --- |
| HudEn5（AI 辅助预检） | 2026-10-26 | 内置浏览器，桌面及 390px 宽度 | T04 工作区，基线 b52f2c1；合并后 SHA 待记录 | 源码页面交互、9 项测试及单文件打包检查通过，详见验收记录 | 待在最终 main 上确认，并由成员验证独立 HTML 双击、断网运行 |
