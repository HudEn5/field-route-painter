/* T03：阵营切换、坐标显示。无需改 renderer.js 或 controls.js。 */
(function () {
  "use strict";
  const app = window.RoutePainter = window.RoutePainter || {};
  app.coordinates = {
    init(context) {
      const { store, renderer, elements } = context;
      const { 
        teamSelect, 
        coordinatesToggle, 
        pointerCoordinates, 
        coordinateList, 
        coordinatesEmpty, 
        canvas 
      } = elements;

      // 0. 启用控件（页面里初始是 disabled，T03 负责开启）
      teamSelect.disabled = false;
      coordinatesToggle.disabled = false;

      // 1. 阵营切换
      teamSelect.addEventListener("change", (e) => {
        store.setState({ team: e.target.value });
      });

      // 2. 坐标开关
      coordinatesToggle.addEventListener("change", (e) => {
        store.setState({ showCoordinates: e.target.checked });
      });

      // 3. 鼠标移动
      canvas.addEventListener("mousemove", (e) => {
        const state = store.getState();
        if (!state.showCoordinates) return;
        
        if (typeof renderer.canvasToPoint !== "function") {
          pointerCoordinates.textContent = "暂时无法显示坐标";
          return;
        }
        
        const point = renderer.canvasToPoint(e);
        pointerCoordinates.textContent = `X: ${Math.round(point.x)}, Y: ${Math.round(point.y)}`;
      });

      // 4. 鼠标移出
      canvas.addEventListener("mouseleave", () => {
        pointerCoordinates.textContent = "鼠标移出画布";
      });

      // 5. 渲染 UI
      function updateUI(state) {
        // 同步控件
        teamSelect.value = state.team;
        coordinatesToggle.checked = state.showCoordinates;

        // 显隐控制
        const displayStyle = state.showCoordinates ? "" : "none";
        pointerCoordinates.style.display = displayStyle;
        coordinateList.style.display = displayStyle;
        coordinatesEmpty.style.display = (state.showCoordinates && state.points.length === 0) ? "" : "none";

        if (!state.showCoordinates) {
          coordinateList.innerHTML = "";
          return;
        }

        // 生成列表
        const fragment = document.createDocumentFragment();
        state.points.forEach((p) => {
          const li = document.createElement("li");
          li.textContent = `(${Math.round(p.x)}, ${Math.round(p.y)})`;
          fragment.appendChild(li);
        });

        coordinateList.innerHTML = "";
        coordinateList.appendChild(fragment);
      }

      // 6. 初始渲染
      updateUI(store.getState());

      // 7. 订阅更新
      store.subscribe((newState) => {
        updateUI(newState);
      });
    }
  };
}());
