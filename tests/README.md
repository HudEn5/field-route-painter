# T02 工具栏测试

需要 Node.js 18 或以上版本，无需安装依赖。在仓库根目录执行：

```powershell
node --test tests/controls.test.mjs
```

测试直接加载当前仓库的 `src/store.js` 和 `src/controls.js`，使用模拟按钮验证：

- 初始按钮状态、连续撤销、清空后重新添加路径点。
- 阵营和坐标开关保留，空操作不产生状态更新。
- 重复初始化时每次点击只撤销一个点。
- 更换按钮或共享状态后，旧事件和旧订阅被移除。
- `destroy()` 可重复调用，销毁后可重新初始化。

这些测试验证状态和事件行为；画布、布局和浏览器交互仍需联调验收。

## 初始化与清理

`RoutePainter.controls.init(context)` 在绑定前自动清理上一次的事件和订阅。
页面移除控件时可调用 `RoutePainter.controls.destroy()`；该方法保留路线数据。
现有单页启动流程仍可照常只调用一次 `init(context)`。
