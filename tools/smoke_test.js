// app.js を DOM/ECharts スタブ付きで実行し、レンダリング経路の例外を検出するスモークテスト
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const appJs = fs.readFileSync(path.join(root, "assets/js/app.js"), "utf-8");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/indicators.json"), "utf-8"));

const elements = {};
function makeEl(id) {
  return {
    id,
    children: [],
    textContent: "",
    innerHTML: "",
    hidden: true,
    href: "",
    className: "",
    appendChild(c) { this.children.push(c); }
  };
}

const chartInits = [];
global.echarts = {
  init(el) {
    const c = { el, setOption(opt) { this.option = opt; }, resize() {} };
    chartInits.push(c);
    return c;
  }
};

global.document = {
  getElementById(id) {
    if (!elements[id]) elements[id] = makeEl(id);
    return elements[id];
  },
  createElement() { return makeEl("dynamic"); }
};

global.window = { addEventListener() {} };

global.fetch = async () => ({
  ok: true,
  json: async () => data
});

(async () => {
  eval(appJs);
  await new Promise(r => setTimeout(r, 50));

  const kpiCount = elements["kpi-grid"].children.length;
  console.log("KPI cards:", kpiCount);
  console.log("charts initialized:", chartInits.length);
  console.log("range label:", elements["range-label"].textContent);
  // error-banner は正常時には参照されない（= 非表示）。参照された場合のみ hidden を確認
  const banner = elements["error-banner"];
  console.log("error banner hidden:", !banner || banner.hidden);

  // 失業率シリーズの位置合わせ検証（1990年は null、1991年は実値）
  const prices = chartInits.find(c => c.el.id === "chart-prices");
  const uemSeries = prices.option.series.find(s => s.name === "失業率");
  const years = prices.option.xAxis.data;
  const i1990 = years.indexOf(1990), i1991 = years.indexOf(1991);
  console.log("uem 1990:", uemSeries.data[i1990], "/ uem 1991:", uemSeries.data[i1991]);

  if (kpiCount !== 7) throw new Error("KPI 件数が不正");
  if (chartInits.length !== 7) throw new Error("チャート数が不正");
  if (uemSeries.data[i1990] !== null) throw new Error("1990年の失業率は null のはず");
  if (typeof uemSeries.data[i1991] !== "number") throw new Error("1991年の失業率が数値でない");
  console.log("SMOKE TEST OK");
})().catch(e => { console.error("SMOKE TEST FAILED:", e.message); process.exit(1); });
