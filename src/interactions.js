/* T01：点击打点入口。只修改本文件和 renderer.js，避免与 T02/T03 冲突。 */
(function () {
  "use strict";
  const app = window.RoutePainter = window.RoutePainter || {};
  app.interactions = {
    init(context) {
      const canvas = context.elements.canvas;
      
      // 监听画布的点击事件
      canvas.addEventListener("click", (event) => {
        // 1. 把鼠标点击的位置转换成坐标点
        const point = context.renderer.canvasToPoint(event);
        
        // 2. 获取当前已经存在的点（如果没有就是空数组）
        const currentPoints = context.store.getState().points || [];
        
        // 3. 把新点加进去（用 [...数组, 新点] 的方式，队长要求的）
        const newPoints = [...currentPoints, point];
        
        // 4. 更新状态，自动触发重绘
        context.store.setState({ points: newPoints });
        
        // 5. 更新无障碍描述（队长要求的 aria-label）
        canvas.setAttribute("aria-label", "当前共有 " + newPoints.length + " 个路径点");
      });

      // 初始化时移除“功能待开发”的描述
      canvas.removeAttribute("aria-describedby");
      canvas.setAttribute("aria-label", "点击画布开始绘制路线");
    }
  };
}());