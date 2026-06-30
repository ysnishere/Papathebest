# 楊忪霖 健康追蹤本 🌿

家庭式「健康追蹤與運動關聯性分析」純前端網頁。記錄飲食、用藥、血糖、血壓、心跳與運動，並自動分析「不同運動對身體數值的關聯性」。所有資料儲存在瀏覽器 LocalStorage，可匯出/匯入 JSON 備份，適合直接部署到 **GitHub Pages**。

> 記錄對象：**楊忪霖**，主要由本人操作，可一鍵產生家庭群組匯報文字。

---

## ✨ 功能特色

- **長輩友善 UI**：Muji 日系極簡 × Apple 乾淨風格，大字體、大按鈕、柔和米色木質調。
- **數據輸入面版**：飲食/用藥/血糖(空腹·餐前·餐後2h)/血壓/心跳；運動可同時記錄「運動前 / 運動後」數值。
- **愛的鼓勵彈窗** ❤️：每次成功儲存隨機跳出一句對爸爸的鼓勵小語，搭配愛心淡入動畫。
- **健康分析圖表**：
  - 血糖 × 有氧運動折線圖（標記「超慢跑」與「散步」時間點）
  - 阻力訓練（重訓/深蹲）vs 伸展的血壓、心跳變化對比
  - 自動化洞察小卡（例：超慢跑後血糖平均下降 X mg/dL，效果優於散步 Y mg/dL）
- **資料備份**：JSON 匯出 / 匯入（可合併或覆蓋），不依賴任何伺服器。

---

## 📁 專案結構

```
health-tracker/
├── index.html        # 主頁面（Tailwind CSS + Chart.js CDN、Tabs 佈局）
├── src/
│   ├── main.js       # 核心邏輯：LocalStorage 增刪查改、表單、愛的鼓勵彈窗、匯入匯出、匯報
│   └── charts.js     # 資料分析與 Chart.js 圖表渲染、洞察小卡
└── README.md
```

無需安裝套件，Tailwind 與 Chart.js 皆透過 CDN 載入。

---

## 🚀 本機預覽

直接用瀏覽器打開 `index.html` 即可（純靜態）。若瀏覽器對本機檔案有限制，可起一個簡單伺服器：

```bash
# Python 3
python -m http.server 8080
# 然後打開 http://localhost:8080
```

---

## 🌐 部署到 GitHub Pages

1. 在 GitHub 建立一個新倉庫（例如 `health-tracker`）。
2. 把本資料夾所有檔案上傳（保持 `index.html` 在根目錄、`src/` 子資料夾）：
   ```bash
   git init
   git add .
   git commit -m "init: 楊忪霖 健康追蹤本"
   git branch -M main
   git remote add origin https://github.com/<你的帳號>/health-tracker.git
   git push -u origin main
   ```
3. 進入倉庫 **Settings → Pages**。
4. **Source** 選擇 `Deploy from a branch`，Branch 選 `main`、資料夾選 `/ (root)`，按 Save。
5. 等待約 1 分鐘，頁面會出現在：
   `https://<你的帳號>.github.io/health-tracker/`

> ⚠️ 路徑大小寫要一致：HTML 內以相對路徑 `src/main.js`、`src/charts.js` 載入，GitHub Pages 區分大小寫。

---

## 💾 資料格式（LocalStorage 主鍵：`yang_health_tracker_v1`）

```jsonc
{
  "meta": { "patient": "楊忪霖", "version": 1, "updated_at": "..." },
  "daily_records": [
    {
      "record_id": "daily_...",
      "timestamp": "2026-06-30T08:00",
      "type": "breakfast",                 // breakfast|lunch|dinner|snack
      "meals": { "description": "燕麥片一碗、水煮蛋", "carbs_estimated": "low" },
      "medication": [{ "name": "Metformin", "dosage": "500mg", "taken": true }],
      "vitals": {
        "blood_sugar": { "value": 110, "period": "fasting" },  // fasting|before_meal|after_meal_2h
        "blood_pressure": { "systolic": 128, "diastolic": 80 },
        "heart_rate": 72
      }
    }
  ],
  "exercise_records": [
    {
      "exercise_id": "ex_...",
      "timestamp_start": "2026-06-30T09:00",
      "timestamp_end": "2026-06-30T09:30",
      "type": "超慢跑",                      // 散步|超慢跑|伸展|深蹲|重訓
      "intensity": "moderate",              // low|moderate|high
      "vitals_before": { "blood_sugar": { "value": 160 }, "blood_pressure": { "systolic": 135, "diastolic": 85 }, "heart_rate": 78 },
      "vitals_after":  { "blood_sugar": { "value": 132 }, "blood_pressure": { "systolic": 128, "diastolic": 82 }, "heart_rate": 95 }
    }
  ]
}
```

---

## 🛟 備份提醒

LocalStorage 綁定瀏覽器，清除瀏覽資料會一併刪除紀錄。請定期用右上角 **⬇️ 匯出備份** 下載 JSON 檔保存；換裝置或重灌時用 **⬆️ 匯入** 還原。

---

❤️ 願爸爸健康平安，全家一起加油。
