/* T03：阵营切换、坐标显示。无需改 renderer.js 或 controls.js。 */
(function () {
  "use strict";
  const app = window.RoutePainter = window.RoutePainter || {};
  app.coordinates = {
    init(context) {
      // TODO T03：启用 teamSelect 和 coordinatesToggle，绑定 change。
      // 阵营写入 store.team；app.js 会同步 body.dataset.team 并触发重绘。
      // 用 canvasToPoint 显示鼠标坐标；离开画布时显示占位文字。
      // 订阅 points，在 coordinateList 中按顺序显示 (x, y)，显示时四舍五入。
      // showCoordinates 为 false 时隐藏列表和鼠标读数，不删除 points。
      // 用 textContent / createElement 创建列表，更新 coordinatesEmpty 提示。
      // subscribe 只监听后续变化，初始化时先用 getState() 渲染一次。
      void context;
    }
  };
}());
