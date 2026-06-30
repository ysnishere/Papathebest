/* =========================================================================
 * 楊忪霖 健康追蹤本 — 核心邏輯 (main.js)
 * - LocalStorage 增刪查改
 * - 表單送出事件
 * - 模組 B：隨機「愛的鼓勵」彈窗
 * - JSON 匯入 / 匯出備份
 * - 家庭群組匯報文字
 * ====================================================================== */

(function () {
  'use strict';

  // ---------- 常數 ----------
  const STORAGE_KEY = 'yang_health_tracker_v1'; // 所有資料的主鍵

  // 模組 B：溫馨語錄陣列（可自由增補）
  const LOVE_MESSAGES = [
    '爸爸我們都愛你喔～❤️',
    '爸爸是全世界最棒的！👍',
    '今天也準時紀錄了，爸爸太有毅力了！',
    '看到爸爸健康，就是我們最大的幸福！🥰',
    '爸爸辛苦了，有您真好，我們都很驕傲！',
    '每一筆紀錄，都是爸爸愛自己、也愛我們的證明 💛',
    '健康的爸爸，是我們全家的寶藏！',
    '繼續加油，爸爸的努力我們都看在眼裡 ✨',
  ];

  // ---------- 資料層：LocalStorage 增刪查改 ----------
  const Store = {
    /** 讀取完整資料物件（含預設骨架） */
    read() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return Store._empty();
        const data = JSON.parse(raw);
        data.daily_records = data.daily_records || [];
        data.exercise_records = data.exercise_records || [];
        return data;
      } catch (e) {
        console.error('讀取資料失敗，回傳空資料：', e);
        return Store._empty();
      }
    },

    /** 寫回完整資料物件 */
    write(data) {
      data.meta = data.meta || {};
      data.meta.patient = '楊忪霖';
      data.meta.updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },

    /** 新增一筆日常紀錄 */
    addDaily(record) {
      const data = Store.read();
      data.daily_records.push(record);
      Store.write(data);
      return record;
    },

    /** 新增一筆運動紀錄 */
    addExercise(record) {
      const data = Store.read();
      data.exercise_records.push(record);
      Store.write(data);
      return record;
    },

    /** 刪除一筆紀錄（依 id 與型別） */
    remove(kind, id) {
      const data = Store.read();
      if (kind === 'daily') {
        data.daily_records = data.daily_records.filter(r => r.record_id !== id);
      } else {
        data.exercise_records = data.exercise_records.filter(r => r.exercise_id !== id);
      }
      Store.write(data);
    },

    _empty() {
      return {
        meta: { patient: '楊忪霖', version: 1 },
        daily_records: [],
        exercise_records: [],
      };
    },
  };

  // 對外暴露，供 charts.js 取用
  window.HealthStore = Store;

  // ---------- 小工具 ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  function nowLocalInput() {
    // 取得當下時間，格式化成 <input type="datetime-local"> 可用字串
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function numOrNull(v) {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  const MEAL_LABEL = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '點心' };
  const PERIOD_LABEL = { fasting: '空腹', before_meal: '餐前', after_meal_2h: '餐後2h' };

  // ---------- 模組 B：愛的鼓勵彈窗 ----------
  function showLoveToast() {
    const overlay = $('#love-toast');
    const card = $('#love-card');
    const text = $('#love-text');

    text.textContent = LOVE_MESSAGES[Math.floor(Math.random() * LOVE_MESSAGES.length)];

    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    // 重新觸發進場動畫
    card.classList.remove('anim-heart');
    void card.offsetWidth; // 強制 reflow
    card.classList.add('anim-heart');
  }

  function hideLoveToast() {
    const overlay = $('#love-toast');
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
  }

  // ---------- 表單：用藥動態列 ----------
  function makeMedRow() {
    const row = document.createElement('div');
    row.className = 'med-row flex items-center gap-2';
    row.innerHTML = `
      <input type="text" class="field-input med-name" placeholder="藥名（例：Metformin）" />
      <input type="text" class="field-input med-dose" placeholder="劑量（例：500mg）" />
      <label class="flex items-center gap-1.5 text-base text-inkSoft whitespace-nowrap px-2">
        <input type="checkbox" class="med-taken w-5 h-5 accent-sage" checked /> 已服用
      </label>
      <button type="button" class="med-del text-inkSoft hover:text-red-400 text-xl px-1" title="刪除">✕</button>
    `;
    row.querySelector('.med-del').addEventListener('click', () => row.remove());
    return row;
  }

  function collectMeds() {
    return $$('#med-list .med-row')
      .map(row => ({
        name: row.querySelector('.med-name').value.trim(),
        dosage: row.querySelector('.med-dose').value.trim(),
        taken: row.querySelector('.med-taken').checked,
      }))
      .filter(m => m.name !== '');
  }

  // ---------- 表單送出：日常紀錄 ----------
  function handleDailySubmit(e) {
    e.preventDefault();
    const f = e.target;

    const record = {
      record_id: uid('daily'),
      timestamp: f.timestamp.value || new Date().toISOString(),
      type: f.meal_type.value,
      meals: {
        description: f.meal_desc.value.trim(),
        carbs_estimated: (f.carbs.value || 'medium'),
      },
      medication: collectMeds(),
      vitals: {
        blood_sugar: {
          value: numOrNull(f.bs_value.value),
          period: f.bs_period.value,
        },
        blood_pressure: {
          systolic: numOrNull(f.bp_sys.value),
          diastolic: numOrNull(f.bp_dia.value),
        },
        heart_rate: numOrNull(f.heart_rate.value),
      },
    };

    Store.addDaily(record);
    afterSave(f);
  }

  // ---------- 表單送出：運動紀錄 ----------
  function handleExerciseSubmit(e) {
    e.preventDefault();
    const f = e.target;

    const vitals = (p) => ({
      blood_sugar: { value: numOrNull(f[p + '_bs'].value) },
      blood_pressure: {
        systolic: numOrNull(f[p + '_sys'].value),
        diastolic: numOrNull(f[p + '_dia'].value),
      },
      heart_rate: numOrNull(f[p + '_hr'].value),
    });

    const record = {
      exercise_id: uid('ex'),
      timestamp_start: f.ex_start.value || new Date().toISOString(),
      timestamp_end: f.ex_end.value || null,
      type: f.ex_type.value,
      intensity: f.ex_intensity.value,
      vitals_before: vitals('before'),
      vitals_after: vitals('after'),
    };

    Store.addExercise(record);
    afterSave(f);
  }

  /** 儲存成功後的共同動作：彈窗 + 重置 + 重繪 */
  function afterSave(form) {
    showLoveToast();          // 模組 B：愛的鼓勵
    renderRecent();
    resetForm(form);
    // 通知 charts.js 重新繪圖（若已載入）
    if (typeof window.refreshCharts === 'function') window.refreshCharts();
  }

  function resetForm(form) {
    form.reset();
    // 時間欄位重設為現在
    $$('input[type="datetime-local"]', form).forEach(inp => { inp.value = nowLocalInput(); });
    // 用藥列重置成一列
    if (form.id === 'form-daily') {
      const list = $('#med-list');
      list.innerHTML = '';
      list.appendChild(makeMedRow());
    }
  }

  // ---------- 最近紀錄列表 ----------
  function fmtTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    const pad = n => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function renderRecent() {
    const box = $('#recent-list');
    const data = Store.read();

    const items = [
      ...data.daily_records.map(r => ({ kind: 'daily', id: r.record_id, time: r.timestamp, r })),
      ...data.exercise_records.map(r => ({ kind: 'ex', id: r.exercise_id, time: r.timestamp_start, r })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);

    if (items.length === 0) {
      box.innerHTML = '<p class="text-inkSoft py-4 text-center">還沒有紀錄，從上面開始填寫第一筆吧 🌱</p>';
      return;
    }

    box.innerHTML = items.map(it => {
      let summary;
      if (it.kind === 'daily') {
        const r = it.r;
        const bs = r.vitals.blood_sugar.value;
        const bp = r.vitals.blood_pressure;
        const parts = [];
        if (r.meals.description) parts.push(`🍚 ${r.meals.description}`);
        if (bs != null) parts.push(`血糖 ${bs}(${PERIOD_LABEL[r.vitals.blood_sugar.period] || ''})`);
        if (bp.systolic != null) parts.push(`血壓 ${bp.systolic}/${bp.diastolic ?? '—'}`);
        if (r.vitals.heart_rate != null) parts.push(`心跳 ${r.vitals.heart_rate}`);
        summary = `<span class="inline-block px-2 py-0.5 rounded-lg bg-wood/15 text-woodDk text-sm mr-1">${MEAL_LABEL[r.type] || r.type}</span>${parts.join('，') || '（無數值）'}`;
      } else {
        const r = it.r;
        const b = r.vitals_before.blood_sugar.value;
        const a = r.vitals_after.blood_sugar.value;
        let delta = '';
        if (b != null && a != null) delta = `，血糖 ${b}→${a} (${a - b > 0 ? '+' : ''}${a - b})`;
        summary = `<span class="inline-block px-2 py-0.5 rounded-lg bg-sage/20 text-sage text-sm mr-1">🏃 ${r.type}</span>強度${({low:'輕鬆',moderate:'中等',high:'吃力'})[r.intensity]}${delta}`;
      }

      return `
        <div class="flex items-start justify-between gap-2 py-2 border-b border-[#EFE9DF] last:border-0">
          <div class="flex-1">
            <div class="text-sm text-inkSoft">${fmtTime(it.time)}</div>
            <div>${summary}</div>
          </div>
          <button data-kind="${it.kind}" data-id="${it.id}" class="del-btn text-inkSoft hover:text-red-400 text-lg px-1" title="刪除這筆">🗑️</button>
        </div>`;
    }).join('');

    // 綁定刪除
    $$('.del-btn', box).forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('確定要刪除這筆紀錄嗎？')) {
          Store.remove(btn.dataset.kind === 'daily' ? 'daily' : 'ex', btn.dataset.id);
          renderRecent();
          if (typeof window.refreshCharts === 'function') window.refreshCharts();
        }
      });
    });
  }

  // ---------- JSON 匯出 / 匯入 ----------
  function exportJSON() {
    const data = Store.read();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `楊忪霖健康紀錄_${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const incoming = JSON.parse(reader.result);
        if (!incoming || (!incoming.daily_records && !incoming.exercise_records)) {
          alert('檔案格式看起來不正確，請選擇本系統匯出的備份檔。');
          return;
        }
        const merge = confirm('要「合併」到現有資料嗎？\n\n按「確定」＝合併（保留現有資料）\n按「取消」＝完全覆蓋（清掉現有資料）');
        if (merge) {
          const cur = Store.read();
          const seenD = new Set(cur.daily_records.map(r => r.record_id));
          const seenE = new Set(cur.exercise_records.map(r => r.exercise_id));
          (incoming.daily_records || []).forEach(r => { if (!seenD.has(r.record_id)) cur.daily_records.push(r); });
          (incoming.exercise_records || []).forEach(r => { if (!seenE.has(r.exercise_id)) cur.exercise_records.push(r); });
          Store.write(cur);
        } else {
          Store.write({
            meta: incoming.meta || {},
            daily_records: incoming.daily_records || [],
            exercise_records: incoming.exercise_records || [],
          });
        }
        renderRecent();
        if (typeof window.refreshCharts === 'function') window.refreshCharts();
        alert('匯入完成！✅');
      } catch (e) {
        alert('讀取檔案失敗：' + e.message);
      }
    };
    reader.readAsText(file);
  }

  // ---------- 家庭群組匯報文字 ----------
  function buildReport() {
    const data = Store.read();
    const today = new Date().toISOString().slice(0, 10);
    const todays = data.daily_records.filter(r => (r.timestamp || '').slice(0, 10) === today);
    const exToday = data.exercise_records.filter(r => (r.timestamp_start || '').slice(0, 10) === today);

    const lines = [`📋 楊忪霖 健康日報（${today}）`, ''];

    if (todays.length) {
      lines.push('🍚 飲食與數值：');
      todays.forEach(r => {
        const bs = r.vitals.blood_sugar.value;
        let s = `・${fmtTime(r.timestamp)} ${MEAL_LABEL[r.type] || r.type}`;
        if (r.meals.description) s += `：${r.meals.description}`;
        if (bs != null) s += `（血糖 ${bs} ${PERIOD_LABEL[r.vitals.blood_sugar.period] || ''}）`;
        lines.push(s);
      });
      lines.push('');
    }

    if (exToday.length) {
      lines.push('🏃 運動：');
      exToday.forEach(r => {
        const b = r.vitals_before.blood_sugar.value, a = r.vitals_after.blood_sugar.value;
        let s = `・${r.type}`;
        if (b != null && a != null) s += `（血糖 ${b}→${a}）`;
        lines.push(s);
      });
      lines.push('');
    }

    if (!todays.length && !exToday.length) lines.push('今天還沒有紀錄唷～');

    lines.push('— 由家人陪伴記錄 ❤️');
    const text = lines.join('\n');

    // 嘗試複製到剪貼簿
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => alert('已複製到剪貼簿，可直接貼到家庭群組！\n\n' + text),
        () => prompt('複製下面的文字貼到群組：', text)
      );
    } else {
      prompt('複製下面的文字貼到群組：', text);
    }
  }

  // ---------- 截圖匯報（html2canvas → PNG） ----------
  function todaysData() {
    const data = Store.read();
    const today = new Date().toISOString().slice(0, 10);
    return {
      today,
      daily: data.daily_records.filter(r => (r.timestamp || '').slice(0, 10) === today),
      ex: data.exercise_records.filter(r => (r.timestamp_start || '').slice(0, 10) === today),
    };
  }

  function fillReportCard() {
    const { today, daily, ex } = todaysData();
    $('#report-date').textContent = today;
    const body = $('#report-body');
    let html = '';

    if (daily.length) {
      html += '<div><div class="font-bold text-woodDk mb-1">🍚 飲食與數值</div>';
      daily.forEach(r => {
        const bs = r.vitals.blood_sugar.value;
        const bp = r.vitals.blood_pressure;
        let s = `${fmtTime(r.timestamp)}　${MEAL_LABEL[r.type] || r.type}`;
        if (r.meals.description) s += `：${r.meals.description}`;
        const v = [];
        if (bs != null) v.push(`血糖 ${bs}(${PERIOD_LABEL[r.vitals.blood_sugar.period] || ''})`);
        if (bp.systolic != null) v.push(`血壓 ${bp.systolic}/${bp.diastolic ?? '—'}`);
        if (r.vitals.heart_rate != null) v.push(`心跳 ${r.vitals.heart_rate}`);
        if (v.length) s += `（${v.join('，')}）`;
        html += `<div class="pl-1">・${s}</div>`;
      });
      html += '</div>';
    }

    if (ex.length) {
      html += '<div><div class="font-bold text-sage mb-1">🏃 運動</div>';
      ex.forEach(r => {
        const b = r.vitals_before.blood_sugar.value, a = r.vitals_after.blood_sugar.value;
        let s = `${r.type}（強度${({low:'輕鬆',moderate:'中等',high:'吃力'})[r.intensity]}）`;
        if (b != null && a != null) s += `　血糖 ${b}→${a}（${a - b > 0 ? '+' : ''}${a - b}）`;
        html += `<div class="pl-1">・${s}</div>`;
      });
      html += '</div>';
    }

    if (!daily.length && !ex.length) html = '<div class="text-inkSoft text-center py-4">今天還沒有紀錄唷～</div>';
    body.innerHTML = html;
  }

  let _snapBlobUrl = null; // 暫存預覽用的 PNG URL

  function snapshotReport() {
    if (typeof html2canvas !== 'function') {
      alert('截圖元件尚未載入，請確認網路連線後再試一次。');
      return;
    }
    fillReportCard();
    const card = $('#report-card');
    html2canvas(card, { backgroundColor: '#FBF9F5', scale: 2 }).then(canvas => {
      canvas.toBlob(blob => {
        if (_snapBlobUrl) URL.revokeObjectURL(_snapBlobUrl);
        _snapBlobUrl = URL.createObjectURL(blob);
        // 顯示預覽，讓使用者先看一眼再下載
        $('#snap-preview-img').src = _snapBlobUrl;
        const ov = $('#snap-preview');
        ov.classList.remove('hidden');
        ov.classList.add('flex');
      }, 'image/png');
    }).catch(err => alert('截圖失敗：' + err.message));
  }

  function downloadSnapshot() {
    if (!_snapBlobUrl) return;
    const a = document.createElement('a');
    a.href = _snapBlobUrl;
    a.download = `楊忪霖健康日報_${todaysData().today}.png`;
    a.click();
    closeSnapPreview();
  }

  function closeSnapPreview() {
    const ov = $('#snap-preview');
    ov.classList.add('hidden');
    ov.classList.remove('flex');
  }

  // ---------- Tabs 切換 ----------
  function setupTabs() {
    $$('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        $$('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + tab));
        if (tab === 'analytics' && typeof window.refreshCharts === 'function') {
          window.refreshCharts();
        }
      });
    });
  }

  // ---------- 初始化 ----------
  function init() {
    setupTabs();

    // 預填時間
    $$('input[type="datetime-local"]').forEach(inp => { inp.value = nowLocalInput(); });

    // 用藥列：起始一列
    $('#med-list').appendChild(makeMedRow());
    $('#btn-add-med').addEventListener('click', () => $('#med-list').appendChild(makeMedRow()));

    // 表單送出
    $('#form-daily').addEventListener('submit', handleDailySubmit);
    $('#form-exercise').addEventListener('submit', handleExerciseSubmit);

    // 彈窗關閉
    $('#love-close').addEventListener('click', hideLoveToast);
    $('#love-toast').addEventListener('click', (e) => { if (e.target.id === 'love-toast') hideLoveToast(); });

    // 匯出 / 匯入 / 匯報
    $('#btn-export').addEventListener('click', exportJSON);
    $('#file-import').addEventListener('change', (e) => {
      if (e.target.files[0]) importJSON(e.target.files[0]);
      e.target.value = '';
    });
    $('#btn-report').addEventListener('click', buildReport);
    $('#btn-snapshot').addEventListener('click', snapshotReport);
    $('#snap-download').addEventListener('click', downloadSnapshot);
    $('#snap-cancel').addEventListener('click', closeSnapPreview);
    $('#snap-preview').addEventListener('click', (e) => { if (e.target.id === 'snap-preview') closeSnapPreview(); });

    renderRecent();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
