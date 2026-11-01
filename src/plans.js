/* 可移植路线格式。只保存全局逻辑坐标；相对原点由每辆车首点推导。 */
(function () {
  "use strict";
  const app = window.RoutePainter = window.RoutePainter || {};
  const fieldId = "vexu-override-2026-27-preview1", appVersion = "v1.8";
  function point(value) {
    if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y) || value.x < 0 || value.x > 1000 || value.y < 0 || value.y > 1000) throw new RangeError("路线包含无效或超出场地的坐标。");
    return { x: value.x, y: value.y };
  }
  function validate(data) {
    if (!data || data.schemaVersion !== 1) throw new TypeError("不支持的路线文件格式版本。");
    if (data.fieldId !== fieldId || data.fieldSizeMm !== app.field.sizeMm || data.coordinateUnits !== "logical-1000") throw new TypeError("路线的场地版本或坐标单位与当前画板不匹配。");
    const vehicles = {};
    let count = 0;
    for (const id of ["1", "2"]) {
      const v = data.vehicles?.[id];
      if (!v || !Array.isArray(v.points) || !Array.isArray(v.segments)) throw new TypeError("文件必须包含两辆车的完整路线。");
      count += v.points.length;
      if (count > 5000) throw new RangeError("路线点过多，最多支持两车合计 5000 个点。");
      const points = v.points.map(point);
      if (v.segments.length !== Math.max(0, points.length - 1)) throw new TypeError("路径点与路线段数量不一致。");
      const segments = v.segments.map(s => {
        if (!s || !["line", "bezier"].includes(s.type)) throw new TypeError("路线段类型无效。");
        const result = { type: s.type };
        if (s.type === "bezier" || s.c1 || s.c2) { result.c1 = point(s.c1); result.c2 = point(s.c2); }
        return result;
      });
      vehicles[id] = { points, segments };
    }
    const v = data.view;
    if (!v || !["1", "2"].includes(v.activeVehicle) || !["red", "blue"].includes(v.team) || !["global", "relative"].includes(v.coordinateMode)
      || typeof v.showCoordinates !== "boolean" || typeof v.showControlPoints !== "boolean") throw new TypeError("路线的显示设置无效。");
    const segmentCount = vehicles[v.activeVehicle].segments.length;
    const selectedSegment = segmentCount ? (v.selectedSegment ?? 0) : null;
    if (segmentCount && (!Number.isInteger(selectedSegment) || selectedSegment < 0 || selectedSegment >= segmentCount)) throw new RangeError("所选路线段无效。");
    const documentId = data.documentId ?? "workspace";
    if (typeof documentId !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(documentId)) throw new TypeError("路线文档标识无效。");
    return {
      schemaVersion: 1, appVersion, fieldId, fieldSizeMm: app.field.sizeMm, coordinateUnits: "logical-1000", documentId,
      vehicles,
      view: { activeVehicle: v.activeVehicle, team: v.team, coordinateMode: v.coordinateMode, showCoordinates: v.showCoordinates, showControlPoints: v.showControlPoints, selectedSegment }
    };
  }
  function snapshot(state, documentId = "workspace") {
    return validate({
      schemaVersion: 1, appVersion, fieldId, fieldSizeMm: app.field.sizeMm, coordinateUnits: "logical-1000", documentId,
      vehicles: { "1": { points: state.routes["1"], segments: state.segmentRoutes["1"] }, "2": { points: state.routes["2"], segments: state.segmentRoutes["2"] } },
      view: { activeVehicle: state.activeVehicle, team: state.team, coordinateMode: state.coordinateMode, showCoordinates: state.showCoordinates, showControlPoints: state.showControlPoints, selectedSegment: state.selectedSegment }
    });
  }
  app.plans = {
    version: appVersion,
    validate, snapshot,
    parse(text) {
      if (typeof text !== "string" || text.length > 5 * 1024 * 1024) throw new TypeError("路线文件应为不超过 5 MB 的 JSON 文本。");
      let data;
      try { data = JSON.parse(text.replace(/^\uFEFF/, "")); } catch { throw new TypeError("路线文件不是有效的 JSON。"); }
      return validate(data);
    }
  };
}());
