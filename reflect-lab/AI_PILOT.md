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
