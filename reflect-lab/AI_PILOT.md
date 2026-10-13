# Mimo 心晴之鏡：Gemini 2.5 Flash 語意回饋教師試驗

## 目前模型與部署架構

- **學生／教師前端**：Vercel 網頁（`reflect-lab/index.html` 與 `guided.js`）。
- **受控的 API**：同源 Vercel Function `/api/reflect`（`api/reflect.mjs`）。
- **語言模型**：Google Gemini API，正式模型 ID **`gemini-2.5-flash`**，直接呼叫 `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`。
- **Google API 金鑰**：只存在 Vercel Production 環境變數 `GEMINI_API_KEY`。**不可放在 JavaScript、GitHub、測試碼、平板或對話訊息中**。
- **無 Vercel AI Gateway**：不再使用 GPT-5.4 Mini、`AI_GATEWAY_API_KEY` 或 `VERCEL_OIDC_TOKEN` 執行本專案推論。
- **目前串接狀態**：程式已改寫，`GEMINI_API_KEY` 仍須由部署管理員安全設定，尚未完成真實 Gemini 端到端測試。

Google 官方 Gemini 2.5 Flash 模型資料：
https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash

> **存取權限制**：Google 目前限制部分新帳戶存取 2.5 系列模型。模型名稱有效不代表任意新 API Key 一定有權限。若 Google 回傳 403 或 404，請先到 Google AI Studio 確認該專案的模型可用性；本專案**不會擅自改用其他模型**。

## 部署設定

請到 <https://vercel.com/> 找到 `mimo-reflection-lab` 專案，進入 **Settings → Environment Variables**：

| 環境變數 | 設定 | 說明 |
|---|---|---|
| `GEMINI_API_KEY` | **Sensitive**，Production | 從 Google AI Studio 建立，使用伺服器端的 Gemini API 金鑰 |
| `MIMO_AI_ENABLED` | `true` | 教師限定測試模式開關 |
| `MIMO_CLASS_CODE` | 長度充足的隨機教師碼 | 現有公開測試碼已在先前展示中曝光，**真正對外試用前務必更換** |
| `MIMO_AI_MODEL` | `gemini-2.5-flash` | 精確且固定的 Gemini API 模型 ID |

新增或修改環境變數後，**重新觸發一次 Production Deployment**，新設定才會進入 Function 執行環境。

取得自己的 Gemini API Key：<https://aistudio.google.com/apikey>。

## 教師測試步驟（僅限虛構案例）

1. 開啟 https://mimo-reflection-lab.vercel.app/。
2. 展開上方「✦ AI 語意回饋」；輸入教師私下保管的課堂測試碼。
3. 勾選「本次僅使用虛構案例」，按「檢查並啟用 AI 回饋」。
4. 使用虛構的美勞課情境輸入不同敘述，觀察是否出現「✦ Mimo · AI 語意回饋」及隨內容變化的機器人表情。
5. 停用 AI 時仍可繼續使用原本固定的 SEL 引導。

API 健康檢查 `GET /api/reflect` 只回傳 `ready` 等非機密狀態。**`ready: true` 僅表示環境變數齊備，不保證模型可存取或有足夠使用額度。**

## Gemini JSON 回傳契約

後端使用 `generationConfig.responseMimeType="application/json"` 與 `responseSchema` 讓模型輸出：

```json
{
  "reply": "你很在意自己的海報被修改，現在可能有點委屈。我們可以先分清楚你看到什麼、還有哪些不知道的地方。",
  "face": "listen",
  "needsAdult": false
}
```

前端僅接受已驗證的表情 `calm/listen/soft/guard/hurt/question` 與限長繁體中文短句。若模型失敗、回覆格式不合或學生切換題目，會回退固定引導或取消過期請求。

## 隱私、安全與限制

- **尚未開放真實學生事件**。僅以虛構案例驗證介面與教學流程；正式使用須完成學校、兒少安全、隱私與輔導專業審查。
- 只有教師明確啟用且勾選虛構情境，當題答覆才會連同有限的前文經 Vercel API 傳至 Google Gemini；未啟用時不會發送文字給 Google。
- Mimo 只能提出候選的情緒反映與事件觀點，**不能確定學生或同學真正的心情、責任或動機**；不能強迫受害者同理霸凌者，也不是心理師或緊急求助服務。
- 遇到持續欺負、暴力、自傷／傷人風險，固定安全規則優先導向可信任大人。現有關鍵字安全檢查仍可能漏判，不能當成正式風險辨識系統。
- Function 不主動把學生輸入寫入資料庫或程式 log；雲端供應商仍可能依其資料政策處理請求與中繼資料。
- 現有教師測試碼只是研究原型門檻，不是正式的登入／學生授權機制。共用測試碼曾展示於聊天中，應於正式開放前輪替。
- 請在 **Google AI Studio** 監控 Gemini API 使用量與額度，並在 Google Cloud／相關服務配置可用的配額、預算警示和成本管理。Vercel Function 可能另有執行成本。
- Vercel Function 的單執行個體計數不是分散式限流；正式班級測試需要更完整的身分驗證和跨執行個體流量限制。

官方文件：
- https://ai.google.dev/gemini-api/docs/generate-content/get-started
- https://ai.google.dev/gemini-api/docs/generate-content/structured-output
- https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash

## v2 回饋端點更新

新網站已使用 `POST /api/reflect-v2`（現行 Gemini API），取代舊版 `/api/reflect` 的「每題固定下一個教材目標」。

只在教師已啟用虛構情境測試模式時，送出 `{fictional:true,answer,supportMode,history,context}`，其中 `supportMode` 為 `listen|clarify|ideas`，最近對話最多十則（每則 240 字），情境欄位限制長度。伺服器使用 Gemini 的結構化回覆，輸出對話微技巧與建議互動方向。回應可能沒有問題，不能由前端強行補上固定問題。

安全仍由前端和伺服器規則先行處理。學生資料傳送到 Google Gemini；不能宣稱資料不出校、已通知學校或真正完成心理諮商。詳細設計請見 [MIMO_FEEDBACK_FRAMEWORK_v2.md](./MIMO_FEEDBACK_FRAMEWORK_v2.md)。

## 2026-10-13：Gemini 預設啟用（僅公開虛構演練）

目前正式網址 https://mimo-reflection-lab.vercel.app/ **開啟後自動啟用 Gemini 2.5 Flash**，公開體驗不再需要教師測試碼。前端使用 `GET /api/reflect-v2` 確認 `publicDemoReady=true`，然後以 `X-Mimo-Demo: fictional-practice-v1` 標記虛構練習請求；`GEMINI_API_KEY` 仍只在 Vercel 伺服器端，不會回傳至瀏覽器。

- 伺服器開關：`MIMO_PUBLIC_DEMO_ENABLED=true`（Vercel Production）。如需立即禁止免登入的模型呼叫，將它設為 `false` 並重新部署。
- 公開請求必須聲明 `fictional=true`、`publicDemo=true` 與系統允許的示範情境 `demoCase`，並使用簡短內容；後端會拒絕部分可辨識的電話、身分資料、真名或校名句型。但**字串檢查無法保證識別所有個資，也無法確認事件真的虛構**。
- 公開版增加**每執行個體**每來源約 6 次／分鐘與 22 次／小時的保守請求限制（原有 API 亦有限制）。**這不是跨執行個體的全站限流，無法保證防濫用或控制總花費**。
- 曾嘗試新增 Vercel Firewall IP 限流規則，但目前專案 API 回報 `Seawall Config not found`，未成功部署分散式 WAF 限流。正式大規模開放前請完成 Firewall／共享儲存限流、身分驗證及 Google API 用量／預算監測。
- 右上角設定仍可使用教師測試碼切換教師模式，也可以按「關閉 AI」改用固定引導。重新整理預設恢復公開虛構練習模式。
- **不能拿來收集真實學生的敏感衝突、心理健康或可識別個資**；不具備真正的校園通報及危機介入能力，學校試驗需先完成兒少隱私與輔導專業審核。

已完成真實 Chrome/Chromium 瀏覽器驗收：預設啟用、無測試碼、免登入 Gemini 真回覆、固定引導關閉切換及無 JS 錯誤，共 7/7 項通過。
