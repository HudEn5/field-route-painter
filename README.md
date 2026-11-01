# Field Route Painter · VEX U 赛场路线画板

面向 VEX U「全域接管」对抗赛的双车路线规划工具。在浏览器中绘制和调整路线，通过坐标、贝塞尔曲线和方案库完成策略规划与团队分享。

使用原生 HTML、CSS 和 JavaScript 编写，可打包为单个 HTML 文件本地运行，无需安装应用或连接服务器。

[下载发布版](https://github.com/HudEn5/field-route-painter/releases/latest) · [使用指南](docs/plan-library.md) · [反馈问题](https://github.com/HudEn5/field-route-painter/issues)

## 功能

- **双车规划**：两条路线独立编辑，使用实线圆点、虚线方点区分，支持红蓝阵营配色。
- **坐标编辑**：点击打点或输入毫米坐标，支持全局坐标与相对各车首点的坐标切换。
- **曲线绘制**：每段可选直线或三次贝塞尔曲线，通过输入或拖动控制点调整形状，显示路线估算长度。
- **拖动与撤销**：移动路径点、插入新点和删除任意点；曲线插点保持原形，误操作可撤销。
- **方案库**：命名保存双车方案和备注，支持载入、更新、删除以及单条或整库导入导出。
- **本机保存**：自动恢复当前浏览器中的规划，支持导出路线 JSON 和带路线的独立 HTML。

## 快速开始

1. 从 [Releases](https://github.com/HudEn5/field-route-painter/releases/latest) 下载附件中的 HTML 文件，双击打开。
2. 选择当前编辑的车辆与阵营，点击场地或输入坐标添加路径点；切换到“编辑模式”可拖动点。
3. 在“路线段”中设置曲线，或展开“方案库”保存并分享规划。

发布版 HTML 已内联样式和脚本，无需安装 Node.js。GitHub 自动生成的源码 ZIP 供开发使用，独立 HTML 请从发布附件下载。

## 保存与分享

| 分享内容 | 导出方式 | 接收方操作 |
| --- | --- | --- |
| 当前双车路线 | 导出路线文件（JSON） | 点击“导入路线”，恢复并继续编辑 |
| 单个方案或整套方案 | 方案库 → 导出所选方案 / 导出整库 | 在方案库中导入，再载入所选方案 |
| 带编辑器的当前规划 | 导出带路线 HTML | 双击打开，查看或继续编辑 |

方案库文件保留两车路径点、曲线参数及方案名称和备注。整库导入采用合并方式，跳过完全相同的方案，同名不同内容保留副本。

修改画布后，请先更新库内方案再导出。自动保存仅供当前浏览器恢复，重要规划请导出文件备份。

## 本地开发

测试和打包需要 Node.js 18 或以上版本，无需安装 npm 依赖。

```powershell
git clone https://github.com/HudEn5/field-route-painter.git
cd field-route-painter
node --test
node scripts/build.mjs
```

打包结果为 `dist/field-route-painter.html`。`dist/` 是生成目录，不纳入 Git；修改源码后需重新打包。

开发时可在项目根目录启动本地预览（需安装 Python）：

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

打开 <http://127.0.0.1:8000>，按 `Ctrl+C` 停止服务。源码页面通过 HTTP 预览时支持导出带路线 HTML；直接打开源码 `index.html` 时，该功能可能受浏览器资源读取限制。

## 项目结构

```text
index.html    页面入口与控件
styles/       页面样式
src/          场地绘制、路线编辑、状态管理、保存分享与方案库
scripts/      单文件打包和指定版本导出
tests/        自动化测试及测试说明
docs/         使用指南、版本记录和开发历史
```

## 坐标与场地精度

场地按 12 ft × 12 ft 的名义尺寸换算为毫米。全局原点位于左上角，X 向右、Y 向下；相对坐标以当前车首点为原点，轴向不变。

场内设施的位置与大小按手册图示估计，尚未精确标定。规划结果用于策略讨论和路线调试，上车前应结合实际场地验证尺寸、车身空间和运动效果。

## 文档与贡献

- [方案库与画布编辑](docs/plan-library.md)
- [贝塞尔曲线](docs/bezier-routes.md) · [保存与分享](docs/saving-sharing.md)
- [场地说明](docs/vexu-field.md) · [版本记录](docs/local-versions.md)
- [测试说明](tests/README.md) · [开发与协作历史](docs/project-history.md)

欢迎通过 Issues 提交问题和建议，报告问题时请附浏览器、复现步骤及相关路线文件。代码修改通过任务分支和 PR 合入，提交格式为 `type(模块): 简短中文描述`；完整约定见[协作规范](四人Git协作规范_精简修订版.pdf)。

项目初始版本由 HudEn5、HEEYEEW、mikeypandeserve 和 Dyeverse 协作完成。
