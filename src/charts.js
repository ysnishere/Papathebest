/* =========================================================================
 * 楊忪霖 健康追蹤本 — 資料分析與圖表 (charts.js)
 * 模組 C：
 *   1. 血糖 × 有氧運動 折線圖（標記超慢跑 / 散步）
 *   2. 阻力訓練 × 心血管反應 對比條形圖
 *   3. 前端自動化健康洞察小卡
 * 依賴：Chart.js (CDN)、window.HealthStore (main.js)
 * ====================================================================== */

(function () {
  'use strict';

  let bsChart = null;
  let cardioChart = null;
  let carbsChart = null;

  // Muji 色票
  const C = {
    wood: '#A88B6A', sage: '#8FA68E', mist: '#7C99B4', ink: '#4A4540',
    inkSoft: '#7A736B', grid: 'rgba(74,69,64,0.08)',
    jog: '#7C99B4', walk: '#8FA68E', train: '#C58B6A', stretch: '#B7A98F',
  };

  const $ = (s) => document.querySelector(s);

  function getData() {
    return (window.HealthStore ? window.HealthStore.read() : { daily_records: [], exercise_records: [] });
  }

  function avg(arr) {
    const v = arr.filter(x => x != null && Number.isFinite(x));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  }

  // ---------- 圖一：血糖折線 + 運動時間標記 ----------
  function renderBloodSugar(data) {
    const points = data.daily_records
      .filter(r => r.vitals && r.vitals.blood_sugar && r.vitals.blood_sugar.value != null)
      .map(r => ({ x: new Date(r.timestamp).getTime(), y: r.vitals.blood_sugar.value }))
      .sort((a, b) => a.x - b.x);

    // 有氧運動（散步 / 超慢跑）作為散點標記，y 取運動後血糖（若有）
    const aerobic = data.exercise_records.filter(r => r.type === '超慢跑' || r.type === '散步');
    const jogPts = aerobic.filter(r => r.type === '超慢跑')
      .map(r => markPoint(r)).filter(Boolean);
    const walkPts = aerobic.filter(r => r.type === '散步')
      .map(r => markPoint(r)).filter(Boolean);

    // (a) 運動前→後血糖下降斜率：每段虛線連接「開始時間,運動前血糖」→「結束時間,運動後血糖」
    //     用 null 斷點把多段獨立線段塞進同一個 dataset（共用一個圖例）
    const slopeData = [];
    aerobic.forEach(r => {
      const b = r.vitals_before && r.vitals_before.blood_sugar.value;
      const a = r.vitals_after && r.vitals_after.blood_sugar.value;
      if (b == null || a == null) return;
      const x0 = new Date(r.timestamp_start).getTime();
      const x1 = new Date(r.timestamp_end || r.timestamp_start).getTime();
      slopeData.push({ x: x0, y: b }, { x: x1 > x0 ? x1 : x0 + 1, y: a }, { x: null, y: null });
    });

    const ctx = $('#chart-bloodsugar');
    if (bsChart) bsChart.destroy();
    bsChart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: '血糖 (mg/dL)', data: points, borderColor: C.wood,
            backgroundColor: 'rgba(168,139,106,0.12)', borderWidth: 2.5,
            tension: 0.3, fill: true, pointRadius: 4, pointBackgroundColor: C.wood,
            order: 3,
          },
          {
            label: '📉 運動前→後 Δ血糖', data: slopeData, type: 'line',
            borderColor: 'rgba(196,139,106,0.85)', borderWidth: 2, borderDash: [6, 5],
            pointRadius: 3, pointBackgroundColor: 'rgba(196,139,106,0.85)',
            spanGaps: false, fill: false, tension: 0, order: 2,
          },
          {
            label: '🏃 超慢跑', data: jogPts, type: 'scatter',
            borderColor: C.jog, backgroundColor: C.jog, pointRadius: 9,
            pointStyle: 'triangle', showLine: false, order: 1,
          },
          {
            label: '🚶 散步', data: walkPts, type: 'scatter',
            borderColor: C.walk, backgroundColor: C.walk, pointRadius: 9,
            pointStyle: 'rectRot', showLine: false, order: 1,
          },
        ],
      },
      options: baseOptions({
        yTitle: '血糖 (mg/dL)',
        time: true,
      }),
    });

    function markPoint(r) {
      const y = (r.vitals_after && r.vitals_after.blood_sugar.value) ??
                (r.vitals_before && r.vitals_before.blood_sugar.value);
      if (y == null) return null;
      return { x: new Date(r.timestamp_end || r.timestamp_start).getTime(), y };
    }
  }

  // ---------- 圖二：阻力訓練 vs 伸展 心血管反應 ----------
  function renderCardio(data) {
    // 計算各運動類型「運動後 − 運動前」的平均變化
    const groups = { '重訓': [], '深蹲': [], '伸展': [] };
    data.exercise_records.forEach(r => {
      if (!(r.type in groups)) return;
      const b = r.vitals_before, a = r.vitals_after;
      groups[r.type].push({
        dSys: delta(b.blood_pressure.systolic, a.blood_pressure.systolic),
        dDia: delta(b.blood_pressure.diastolic, a.blood_pressure.diastolic),
        dHr: delta(b.heart_rate, a.heart_rate),
      });
    });

    const labels = Object.keys(groups);
    const dSys = labels.map(k => round1(avg(groups[k].map(x => x.dSys))));
    const dDia = labels.map(k => round1(avg(groups[k].map(x => x.dDia))));
    const dHr = labels.map(k => round1(avg(groups[k].map(x => x.dHr))));

    const ctx = $('#chart-cardio');
    if (cardioChart) cardioChart.destroy();
    cardioChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: '收縮壓變化', data: dSys, backgroundColor: C.train },
          { label: '舒張壓變化', data: dDia, backgroundColor: C.mist },
          { label: '心跳變化', data: dHr, backgroundColor: C.sage },
        ],
      },
      options: baseOptions({ yTitle: '運動後 − 運動前（平均）' }),
      plugins: [deltaLabelPlugin],
    });

    function delta(b, a) { return (b != null && a != null) ? a - b : null; }
  }

  // (d) 自訂外掛：在每根長條上標註「前→後」變化數值（+下降/上升符號）
  const deltaLabelPlugin = {
    id: 'deltaLabel',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.save();
      ctx.font = '600 12px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      chart.data.datasets.forEach((ds, di) => {
        const meta = chart.getDatasetMeta(di);
        meta.data.forEach((bar, i) => {
          const v = ds.data[i];
          if (v == null || isNaN(v)) return;
          const txt = (v > 0 ? '▲+' : v < 0 ? '▼' : '±') + v;
          ctx.fillStyle = v > 0 ? '#C2693F' : v < 0 ? '#5E8C5A' : '#7A736B';
          const y = v >= 0 ? bar.y - 6 : bar.y + 14;
          ctx.fillText(txt, bar.x, y);
        });
      });
      ctx.restore();
    },
  };

  // ---------- 模組 C-3：洞察小卡 ----------
  function renderInsights(data) {
    const box = $('#insight-cards');
    const cards = [];

    // 有氧：超慢跑 vs 散步 對餐後血糖的壓制
    const jogDrop = aerobicDrop(data, '超慢跑');
    const walkDrop = aerobicDrop(data, '散步');

    if (jogDrop != null || walkDrop != null) {
      let msg = '洞察：';
      if (jogDrop != null && walkDrop != null) {
        const better = jogDrop >= walkDrop ? '超慢跑' : '散步';
        msg += `忪霖伯伯在「超慢跑」後血糖平均下降 <b>${jogDrop}</b> mg/dL，`
             + `「散步」後下降 <b>${walkDrop}</b> mg/dL，目前看來 <b>${better}</b> 對血糖的幫助更明顯。`;
      } else if (jogDrop != null) {
        msg += `「超慢跑」後血糖平均下降 <b>${jogDrop}</b> mg/dL。再多記幾次散步就能比較囉！`;
      } else {
        msg += `「散步」後血糖平均下降 <b>${walkDrop}</b> mg/dL。再多記幾次超慢跑就能比較囉！`;
      }
      cards.push(card('🩸 有氧運動 × 血糖', msg, 'wood'));
    }

    // 阻力訓練心跳反應
    const trainHr = resistanceHr(data, ['重訓', '深蹲']);
    const stretchHr = resistanceHr(data, ['伸展']);
    if (trainHr != null || stretchHr != null) {
      let msg = '洞察：';
      if (trainHr != null) msg += `「重訓 / 深蹲」平均讓心跳上升 <b>${trainHr}</b> 次/分。`;
      if (stretchHr != null) msg += `「伸展」平均變化 <b>${stretchHr}</b> 次/分，較為和緩。`;
      cards.push(card('💓 阻力訓練 × 心血管', msg, 'mist'));
    }

    // 份量 × 代謝量：用醣類紅綠燈比例 ＋ 爸爸的 TDEE 給份量建議
    const meals = data.daily_records.filter(r => r.meals && ['low', 'medium', 'high'].includes(r.meals.carbs_estimated));
    if (meals.length) {
      const high = meals.filter(r => r.meals.carbs_estimated === 'high').length;
      let msg;
      if (high === 0) {
        msg = `最近記錄的 ${meals.length} 餐都沒有🔴醣類較多的，份量控制得很棒，繼續保持！`;
      } else {
        const pct = Math.round((high / meals.length) * 100);
        msg = `最近 ${meals.length} 餐裡有 <b>${high}</b> 餐被標為🔴醣類較多（約 ${pct}%）`;
        const tdee = estimateTDEE(data.profile);
        if (tdee) {
          msg += `。以爸爸每天約 <b>${tdee.toLocaleString()}</b> 大卡的需求，紅燈餐建議再收斂一點，多換成🟢🟡，血糖會更穩。`;
        } else {
          msg += `，建議多換成🟢🟡，血糖會更穩。（到「我的資料」填基本資料，這裡就會用您的代謝量給更貼切的建議）`;
        }
      }
      cards.push(card('🍽️ 份量 × 代謝量', '洞察：' + msg, 'wood'));
    }

    if (cards.length === 0) {
      box.innerHTML = card('🌱 還在累積資料', '多記錄幾筆「運動前 / 運動後」的血糖與心跳，這裡就會自動算出爸爸的運動成效囉！', 'sage');
    } else {
      box.innerHTML = cards.join('');
    }
  }

  /** 由個人資料估算每日建議熱量 TDEE（與 main.js 同公式），無資料回 null */
  function estimateTDEE(p) {
    if (!p || p.height == null || p.weight == null || p.age == null) return null;
    let bmr = 10 * Number(p.weight) + 6.25 * Number(p.height) - 5 * Number(p.age);
    bmr += (p.sex === 'female') ? -161 : 5;
    return Math.round(bmr * (Number(p.activity) || 1.2));
  }

  /** 計算某有氧運動的平均血糖下降量（運動前 − 運動後，正值＝下降） */
  function aerobicDrop(data, type) {
    const drops = data.exercise_records
      .filter(r => r.type === type)
      .map(r => {
        const b = r.vitals_before.blood_sugar.value, a = r.vitals_after.blood_sugar.value;
        return (b != null && a != null) ? (b - a) : null;
      })
      .filter(x => x != null);
    return drops.length ? round1(avg(drops)) : null;
  }

  function resistanceHr(data, types) {
    const ch = data.exercise_records
      .filter(r => types.includes(r.type))
      .map(r => {
        const b = r.vitals_before.heart_rate, a = r.vitals_after.heart_rate;
        return (b != null && a != null) ? (a - b) : null;
      })
      .filter(x => x != null);
    return ch.length ? round1(avg(ch)) : null;
  }

  function card(title, body, tone) {
    const ring = { wood: 'border-wood/30', mist: 'border-mist/30', sage: 'border-sage/30' }[tone] || 'border-wood/30';
    return `
      <div class="bg-cream rounded-3xl shadow-card border ${ring} p-5">
        <h3 class="font-bold text-woodDk mb-1">${title}</h3>
        <p class="text-[1.05rem] leading-relaxed text-ink">${body}</p>
      </div>`;
  }

  // ---------- 圖三：每日醣類紅綠燈分布（堆疊長條） ----------
  function renderCarbs(data) {
    const byDate = {};
    data.daily_records.forEach(r => {
      const d = (r.timestamp || '').slice(0, 10);
      const c = r.meals && r.meals.carbs_estimated;
      if (!d || !['low', 'medium', 'high'].includes(c)) return;
      byDate[d] = byDate[d] || { low: 0, medium: 0, high: 0 };
      byDate[d][c]++;
    });

    const dates = Object.keys(byDate).sort().slice(-7); // 最近 7 天
    const labels = dates.map(d => { const [, m, dd] = d.split('-'); return `${+m}/${+dd}`; });

    const ctx = $('#chart-carbs');
    if (carbsChart) carbsChart.destroy();
    carbsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: '🟢 較少', data: dates.map(d => byDate[d].low), backgroundColor: C.sage },
          { label: '🟡 中等', data: dates.map(d => byDate[d].medium), backgroundColor: '#E0C878' },
          { label: '🔴 較多', data: dates.map(d => byDate[d].high), backgroundColor: '#D98C8C' },
        ],
      },
      options: baseOptions({ yTitle: '餐數', stacked: true }),
    });
  }

  // ---------- 共用設定 ----------
  function baseOptions({ yTitle, time, stacked }) {
    const opts = {
      responsive: true,
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: { labels: { font: { size: 14 }, color: C.ink, usePointStyle: true } },
        tooltip: { titleFont: { size: 14 }, bodyFont: { size: 14 } },
      },
      scales: {
        y: {
          stacked: !!stacked,
          title: { display: !!yTitle, text: yTitle, color: C.inkSoft, font: { size: 13 } },
          grid: { color: C.grid }, ticks: { color: C.inkSoft, font: { size: 13 }, precision: 0 },
        },
        x: {
          stacked: !!stacked,
          grid: { color: C.grid }, ticks: { color: C.inkSoft, font: { size: 13 } },
        },
      },
    };
    if (time) {
      // 用線性時間軸 + 自訂刻度格式（避免額外引入 date adapter）
      opts.scales.x.type = 'linear';
      opts.scales.x.ticks.callback = (v) => {
        const d = new Date(v);
        const pad = n => String(n).padStart(2, '0');
        return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };
    }
    return opts;
  }

  const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);

  // ---------- 對外：重繪 ----------
  window.refreshCharts = function () {
    const data = getData();
    renderInsights(data);
    renderBloodSugar(data);
    renderCardio(data);
    renderCarbs(data);
  };

  document.addEventListener('DOMContentLoaded', () => {
    // 初次進入分析頁時才繪圖（main.js 切換 tab 時也會呼叫）
    if (typeof window.refreshCharts === 'function') window.refreshCharts();
  });
})();
