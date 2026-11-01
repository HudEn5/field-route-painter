/* T01：点击打点入口。 */
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
        
        // 2. 获取当前已经存在的点
        const currentPoints = context.store.getState().points || [];
        
        // 3. 把新点加进去
        const newPoints = [...currentPoints, point];
        
        // 4. 更新状态，自动触发重绘（renderer里的draw会被调用）
        try {
          context.store.setState({ points: newPoints });
          document.getElementById("app-status").textContent = "已添加路径点。";
        } catch (error) { document.getElementById("app-status").textContent = error.message; }
      });

      // 初始化时移除“功能待开发”的描述
      canvas.removeAttribute("aria-describedby");
    }
  };
}());
