/* 日本経済ダッシュボード: data/indicators.json を読み込み ECharts で描画する */
(function () {
  "use strict";

  var COLORS = {
    text: "#e8ecf4",
    dim: "#9aa7bd",
    axisLine: "#3a4761",
    splitLine: "#232d42",
    accent: "#4da3ff",
    accent2: "#ff7a59",
    accent3: "#3ecf8e",
    accent4: "#f5c542",
    accent5: "#b78cff",
    negative: "#ff5d6c",
    tooltipBg: "#1b2436"
  };

  var KPI_CODES = [
    "NY.GDP.MKTP.CD",
    "NY.GDP.MKTP.KD.ZG",
    "NY.GDP.PCAP.CD",
    "FP.CPI.TOTL.ZG",
    "SL.UEM.TOTL.ZS",
    "SP.POP.TOTL",
    "PA.NUS.FCRF"
  ];

  function toDisplay(ind, v) {
    if (v == null) return null;
    switch (ind.format) {
      case "trillionUSD": return v / 1e12;
      case "millionPeople": return v / 1e6;
      default: return v;
    }
  }

  function fmt(ind, v) {
    if (v == null) return "-";
    var d = toDisplay(ind, v);
    switch (ind.format) {
      case "trillionUSD": return d.toFixed(2);
      case "millionPeople": return d.toFixed(1);
      case "usd": return Math.round(d).toLocaleString("ja-JP");
      case "yen": return d.toFixed(1);
      case "percent": return d.toFixed(1);
      default: return String(d);
    }
  }

  /* 複数指標の年の和集合（昇順）を返す。欠損年を含めて x 軸をそろえるため */
  function unionYears() {
    var set = {};
    Array.prototype.forEach.call(arguments, function (ind) {
      Object.keys(ind.data).forEach(function (y) { set[y] = true; });
    });
    return Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
  }

  /* 指標データを指定した年配列に合わせて並べる（欠損年は null） */
  function alignedValues(ind, years) {
    return years.map(function (y) {
      var v = ind.data[String(y)];
      return v == null ? null : toDisplay(ind, v);
    });
  }

  function renderKpis(byCode) {
    var grid = document.getElementById("kpi-grid");
    KPI_CODES.forEach(function (code) {
      var ind = byCode[code];
      var years = Object.keys(ind.data).map(Number).sort(function (a, b) { return a - b; });
      var lastYear = years[years.length - 1];
      var prevYear = years[years.length - 2];
      var last = ind.data[String(lastYear)];
      var prev = prevYear != null ? ind.data[String(prevYear)] : null;

      var deltaHtml = "";
      if (prev != null) {
        var isRatio = ind.format === "percent";
        var diff = toDisplay(ind, last) - toDisplay(ind, prev);
        var rel = (last - prev) / Math.abs(prev) * 100;
        var up = diff > 0;
        var cls = Math.abs(diff) < 1e-12 ? "" : (up ? "up" : "down");
        var arrow = Math.abs(diff) < 1e-12 ? "±0" : (up ? "+" : "-");
        var body = isRatio
          ? arrow + Math.abs(diff).toFixed(1) + "pt"
          : arrow + Math.abs(rel).toFixed(1) + "%";
        deltaHtml = '<div class="kpi-delta ' + cls + '">前年比 ' + body + "（" + lastYear + "年）</div>";
      } else {
        deltaHtml = '<div class="kpi-delta">' + lastYear + "年</div>";
      }

      var card = document.createElement("div");
      card.className = "kpi-card";
      card.innerHTML =
        '<div class="kpi-name">' + ind.name + "</div>" +
        '<span class="kpi-value">' + fmt(ind, last) + '</span><span class="kpi-unit">' + ind.unit + "</span>" +
        deltaHtml;
      grid.appendChild(card);
    });
  }

  function baseOption() {
    return {
      backgroundColor: "transparent",
      textStyle: { color: COLORS.dim, fontFamily: "inherit" },
      grid: { left: 8, right: 14, top: 40, bottom: 24, containLabel: true },
      tooltip: {
        trigger: "axis",
        backgroundColor: COLORS.tooltipBg,
        borderColor: COLORS.axisLine,
        textStyle: { color: COLORS.text, fontSize: 12 }
      },
      legend: { top: 0, right: 0, textStyle: { color: COLORS.dim, fontSize: 11 } }
    };
  }

  function axisX(years) {
    return {
      type: "category",
      data: years,
      axisLine: { lineStyle: { color: COLORS.axisLine } },
      axisTick: { show: false },
      axisLabel: { color: COLORS.dim }
    };
  }

  function axisY(name, extra) {
    var base = {
      type: "value",
      name: name,
      nameTextStyle: { color: COLORS.dim, fontSize: 11 },
      axisLabel: { color: COLORS.dim },
      splitLine: { lineStyle: { color: COLORS.splitLine } }
    };
    return Object.assign(base, extra || {});
  }

  function areaStyle(color) {
    return {
      color: {
        type: "linear", x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: color + "55" },
          { offset: 1, color: color + "00" }
        ]
      }
    };
  }

  function buildCharts(byCode) {
    var charts = [];
    function init(id, option) {
      var el = document.getElementById(id);
      var c = echarts.init(el);
      c.setOption(option);
      charts.push(c);
    }

    // GDP（棒）× 実質成長率（線）
    var gdp = byCode["NY.GDP.MKTP.CD"];
    var growth = byCode["NY.GDP.MKTP.KD.ZG"];
    var gdpYears = unionYears(gdp, growth);
    init("chart-gdp", Object.assign(baseOption(), {
      xAxis: axisX(gdpYears),
      yAxis: [
        axisY("兆米ドル"),
        axisY("成長率（%）", { splitLine: { show: false } })
      ],
      series: [
        {
          name: "GDP（名目）", type: "bar", data: alignedValues(gdp, gdpYears),
          itemStyle: { color: COLORS.accent, borderRadius: [2, 2, 0, 0] },
          barMaxWidth: 22
        },
        {
          name: "実質GDP成長率", type: "line", yAxisIndex: 1, data: alignedValues(growth, gdpYears),
          itemStyle: { color: COLORS.accent2 }, lineStyle: { width: 2.5 },
          symbolSize: 6, z: 3
        }
      ],
      tooltip: Object.assign(baseOption().tooltip, {
        valueFormatter: function (v) { return v == null ? "-" : Number(v).toFixed(2); }
      })
    }));

    // 一人当たりGDP
    var gdppc = byCode["NY.GDP.PCAP.CD"];
    var gdppcYears = unionYears(gdppc);
    init("chart-gdppc", Object.assign(baseOption(), {
      xAxis: axisX(gdppcYears),
      yAxis: [axisY("米ドル", {
        axisLabel: { color: COLORS.dim, formatter: function (v) { return v.toLocaleString(); } }
      })],
      series: [{
        name: "一人当たりGDP", type: "line", data: alignedValues(gdppc, gdppcYears),
        itemStyle: { color: COLORS.accent3 }, lineStyle: { width: 2.5 },
        symbolSize: 5, areaStyle: areaStyle(COLORS.accent3)
      }],
      tooltip: Object.assign(baseOption().tooltip, {
        valueFormatter: function (v) { return v == null ? "-" : Math.round(v).toLocaleString() + " ドル"; }
      })
    }));

    // 物価上昇率 × 失業率
    var cpi = byCode["FP.CPI.TOTL.ZG"];
    var uem = byCode["SL.UEM.TOTL.ZS"];
    var priceYears = unionYears(cpi, uem);
    init("chart-prices", Object.assign(baseOption(), {
      xAxis: axisX(priceYears),
      yAxis: [axisY("%")],
      series: [
        {
          name: "消費者物価上昇率", type: "line", data: alignedValues(cpi, priceYears),
          itemStyle: { color: COLORS.accent4 }, lineStyle: { width: 2.5 }, symbolSize: 5
        },
        {
          name: "失業率", type: "line", data: alignedValues(uem, priceYears),
          itemStyle: { color: COLORS.accent5 }, lineStyle: { width: 2.5 }, symbolSize: 5
        }
      ],
      tooltip: Object.assign(baseOption().tooltip, {
        valueFormatter: function (v) { return v == null ? "-" : Number(v).toFixed(1) + " %"; }
      })
    }));

    // 人口（棒）× 人口増加率（線）
    var pop = byCode["SP.POP.TOTL"];
    var popGrow = byCode["SP.POP.GROW"];
    var popYears = unionYears(pop, popGrow);
    init("chart-pop", Object.assign(baseOption(), {
      xAxis: axisX(popYears),
      yAxis: [
        axisY("百万人", { min: 115 }),
        axisY("増加率（%）", { splitLine: { show: false } })
      ],
      series: [
        {
          name: "総人口", type: "bar", data: alignedValues(pop, popYears),
          itemStyle: { color: COLORS.accent3, borderRadius: [2, 2, 0, 0] }, barMaxWidth: 16
        },
        {
          name: "人口増加率", type: "line", yAxisIndex: 1, data: alignedValues(popGrow, popYears),
          itemStyle: { color: COLORS.accent2 }, lineStyle: { width: 2.5 }, symbolSize: 5, z: 3
        }
      ],
      tooltip: Object.assign(baseOption().tooltip, {
        valueFormatter: function (v) { return v == null ? "-" : Number(v).toFixed(1); }
      })
    }));

    // 為替レート
    var fx = byCode["PA.NUS.FCRF"];
    var fxYears = unionYears(fx);
    init("chart-fx", Object.assign(baseOption(), {
      xAxis: axisX(fxYears),
      yAxis: [axisY("円/ドル")],
      series: [{
        name: "為替レート（年平均）", type: "line", data: alignedValues(fx, fxYears),
        itemStyle: { color: COLORS.accent }, lineStyle: { width: 2.5 },
        symbolSize: 5, areaStyle: areaStyle(COLORS.accent)
      }],
      tooltip: Object.assign(baseOption().tooltip, {
        valueFormatter: function (v) { return v == null ? "-" : Number(v).toFixed(1) + " 円"; }
      })
    }));

    // 貿易（輸出・輸入、対GDP比）
    var exp = byCode["NE.EXP.GNFS.ZS"];
    var imp = byCode["NE.IMP.GNFS.ZS"];
    var tradeYears = unionYears(exp, imp);
    init("chart-trade", Object.assign(baseOption(), {
      xAxis: axisX(tradeYears),
      yAxis: [axisY("対GDP比（%）")],
      series: [
        {
          name: "輸出", type: "line", data: alignedValues(exp, tradeYears),
          itemStyle: { color: COLORS.accent }, lineStyle: { width: 2.5 }, symbolSize: 5
        },
        {
          name: "輸入", type: "line", data: alignedValues(imp, tradeYears),
          itemStyle: { color: COLORS.accent2 }, lineStyle: { width: 2.5 }, symbolSize: 5
        }
      ],
      tooltip: Object.assign(baseOption().tooltip, {
        valueFormatter: function (v) { return v == null ? "-" : Number(v).toFixed(1) + " %"; }
      })
    }));

    // 経常収支（対GDP比）
    var cab = byCode["BN.CAB.XOKA.GD.ZS"];
    var cabYears = unionYears(cab);
    init("chart-cab", Object.assign(baseOption(), {
      xAxis: axisX(cabYears),
      yAxis: [axisY("対GDP比（%）")],
      series: [{
        name: "経常収支", type: "bar",
        data: alignedValues(cab, cabYears).map(function (v) {
          return {
            value: v,
            itemStyle: { color: v >= 0 ? COLORS.accent3 : COLORS.negative, borderRadius: [2, 2, 0, 0] }
          };
        }),
        barMaxWidth: 16
      }],
      tooltip: Object.assign(baseOption().tooltip, {
        valueFormatter: function (v) { return v == null ? "-" : Number(v).toFixed(1) + " %"; }
      })
    }));

    window.addEventListener("resize", function () {
      charts.forEach(function (c) { c.resize(); });
    });
  }

  function showError(message) {
    var banner = document.getElementById("error-banner");
    banner.textContent = message;
    banner.hidden = false;
  }

  fetch("data/indicators.json")
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (payload) {
      var byCode = {};
      payload.indicators.forEach(function (ind) { byCode[ind.code] = ind; });

      document.getElementById("range-label").textContent =
        "（" + payload.range[0] + "–" + payload.range[1] + "）";
      document.getElementById("generated-label").textContent = payload.generated;
      var link = document.getElementById("source-link");
      link.textContent = payload.source;
      link.href = payload.sourceUrl;

      renderKpis(byCode);
      buildCharts(byCode);
    })
    .catch(function (err) {
      showError(
        "データの読み込みに失敗しました（" + err.message + "）。" +
        "file:// で直接開いている場合は、ローカルサーバー（例: python3 -m http.server）経由でアクセスしてください。"
      );
    });
})();
