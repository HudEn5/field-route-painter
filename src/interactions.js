/* T01：点击打点入口。只修改本文件和 renderer.js，避免与 T02/T03 冲突。 */
(function () {
  "use strict";
  const app = window.RoutePainter = window.RoutePainter || {};
  app.interactions = {
    init(context) {
      // TODO T01：监听 context.elements.canvas 的 click。
      // 用 context.renderer.canvasToPoint(event) 得到逻辑坐标。
      // 用 context.store.setState({ points: 新数组 }) 更新，禁止原地 push。
      // 完成后同步 canvas 的 aria-label，移除“功能待开发”的描述。
      void context;
    }
  };
}());
