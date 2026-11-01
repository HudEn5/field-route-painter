# 自动化测试

需要 Node.js 18 或以上版本，无需安装依赖。在仓库根目录执行：

```powershell
node --test tests/controls.test.mjs tests/field.test.mjs tests/vehicles.test.mjs tests/coordinates.test.mjs tests/point-editor.test.mjs tests/curves.test.mjs
```

测试直接加载当前仓库的 `src/store.js` 和 `src/controls.js`，使用模拟按钮验证：

- 初始按钮状态、连续撤销、清空后重新添加路径点。
- 阵营和坐标开关保留，空操作不产生状态更新。
- 重复初始化时每次点击只撤销一个点。
- 更换按钮或共享状态后，旧事件和旧订阅被移除。
- `destroy()` 可重复调用，销毁后可重新初始化。

这些测试验证状态和事件行为；画布、布局和浏览器交互仍需联调验收。

`field.test.mjs` 额外检查名义场宽到毫米的单位换算、多段折线长度，以及桌面/手机画布点击位置和边界限制。场内设施位置为图示估计，自动化测试不证明几何尺寸已标定。

`vehicles.test.mjs` 检查双车数据隔离、切车后的按钮状态、只撤销/清空当前车，以及切换阵营或坐标显隐时两条路线保留。

`coordinates.test.mjs` 检查全局/相对首点换算、负坐标、双车独立原点、清空后重新建原点，以及坐标切换不改动路线数据。

`point-editor.test.mjs` 验证坐标输入的反向换算、边界、负值、双车隔离、已有点修改、首点移动及无效输入拒绝。

`curves.test.mjs` 验证可选曲线、混合路线、双车控制点隔离、参数保留、撤销后的段清理、贝塞尔几何和弧长，以及 Canvas 曲线绘制指令。

## 初始化与清理

`RoutePainter.controls.init(context)` 在绑定前自动清理上一次的事件和订阅。
页面移除控件时可调用 `RoutePainter.controls.destroy()`；该方法保留路线数据。
现有单页启动流程仍可照常只调用一次 `init(context)`。
