/* T02：撤销和清空，通过共享状态同步画布、计数和坐标列表。 */
(function () {
  "use strict";
  const app = window.RoutePainter = window.RoutePainter || {};
  let cleanup = null;
  app.controls = {
    init(context) {
      // 释放上一次的事件和订阅，避免重复初始化导致一次撤销多个点。
      app.controls.destroy();
      const { store, elements } = context;
      const { undoButton, clearButton } = elements;

      const updateButtons = (state) => {
        const isEmpty = state.points.length === 0;
        undoButton.disabled = isEmpty;
        clearButton.disabled = isEmpty;
      };

      const undoLastPoint = () => {
        const { points } = store.getState();
        if (points.length === 0) return;
        store.setState({ points: points.slice(0, -1) });
      };

      const clearPoints = () => {
        if (store.getState().points.length === 0) return;
        store.setState({ points: [] });
      };

      undoButton.addEventListener("click", undoLastPoint);
      clearButton.addEventListener("click", clearPoints);
      const unsubscribe = store.subscribe(updateButtons);
      cleanup = () => {
        undoButton.removeEventListener("click", undoLastPoint);
        clearButton.removeEventListener("click", clearPoints);
        unsubscribe();
      };
      updateButtons(store.getState());
    },
    destroy() {
      if (!cleanup) return;
      cleanup();
      cleanup = null;
    }
  };
}());
