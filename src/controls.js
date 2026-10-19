/* T02：撤销和清空。页面已预留按钮，功能完成后由本模块启用。 */
(function () {
  "use strict";
  const app = window.RoutePainter = window.RoutePainter || {};
  app.controls = {
    init(context) {
      // TODO T02：为 elements.undoButton / clearButton 绑定事件。
      // 撤销：用新数组保留前 n-1 个点；清空：设置 points: []。
      // 订阅共享状态，无点时禁用按钮，有点时启用。
      // 初始化时先主动读取 getState() 更新一次按钮。
      // 即使当前 points 为空，重复操作也不能报错。
      void context;
    }
  };
}());
