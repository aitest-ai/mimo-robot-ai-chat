# Mimo 心晴之鏡｜不等 Vercel，也能在自己電腦試玩

這份程式位於 GitHub 最新主分支的 `reflect-lab/`。**不是另一套仿製版**：前端沿用同一份 `index.html`、`chat.js`、`chat.css`；後端直接執行相同的 `api/reflect-v2.mjs`，因此包含 GitHub 最新的 Gemini 對話、短期故事線、自然結束與安全守門修改，不用等待 Vercel 部署額度。

## 方式一：直接開 HTML（不用安裝、不需要 API Key）

在 `reflect-lab` 資料夾直接雙擊 **`index.html`**。保留 `chat.css`、`chat.js` 在相同資料夾，它們是網頁正常顯示所需的檔案。

✅ 看介面、角色、表情、按鈕、固定引導。

❌ 不能呼叫 Gemini、不能測最新的 AI 故事記憶與回饋（`file://` 無伺服器，系統會回退到固定引導）。**不要把 API Key 寫到 HTML 或 chat.js**。

## 方式二：Windows 雙擊啟動（推薦，完整 Gemini）

1. 從 [GitHub 下載最新原始碼 ZIP](https://github.com/aitest-ai/mimo-robot-ai-chat/archive/refs/heads/main.zip)，解壓縮後進入 `mimo-robot-ai-chat-main\reflect-lab`。
2. 確認電腦已安裝 **Node.js 20 或以上**（只要裝一次）。如果沒安裝，啟動檔會幫忙打開 https://nodejs.org/en/download 。
3. 雙擊 **`點我啟動_Mimo.bat`**。第一次會打開 `gemini-key.txt`；請將自己的 Gemini API Key 貼進去，存檔並關閉記事本。金鑰可到 https://aistudio.google.com/apikey 取得。請自行確認 Google 模型額度與計費設定。
4. 等待幾秒，瀏覽器會開啟 **http://127.0.0.1:8787/**。畫面顯示「Gemini 練習中」，代表 Gemini 預設開啟；不需 Vercel 部署，也不需輸入教師測試碼。
5. 測試完關閉黑色命令列視窗（或按 Ctrl+C）。下次雙擊啟動檔即可。

**想換 API Key？** 關閉視窗，用記事本重新開啟 `gemini-key.txt`，改好存檔後重新啟動。這個檔案已列入 Git 忽略清單。不要上傳、寄送或貼到聊天室。

**若只有固定引導：** 檢查 `gemini-key.txt` 是否是有效 Gemini API Key、網路是否可連接 Google AI Studio，及是否被 Google 配額限制。終端會明確列出 Gemini 是否啟用。若能啟用但 Gemini 無回應，可能是模型限額或網路問題，並非可以繞過的設定。

## 方式三：在 GitHub Codespaces 線上啟動（非雙擊 HTML）

如果電腦不方便裝 Node.js，可以用 GitHub Codespaces 開啟同一份 repo，在終端執行：

```bash
cd reflect-lab
printf '%s' "$GEMINI_API_KEY" > gemini-key.txt
node local-server.mjs
```

請先在 Codespaces Secrets 安全設定 `GEMINI_API_KEY`，**不要把金鑰寫進命令歷史或公開程式碼**。在 Codespaces Ports 中，轉送 8787 埠並保持 **Private**。注意：本機伺服器預設只綁定 `127.0.0.1`，若 Codespaces 轉送無法使用，請改用 Windows 本機方式；不建議為了公開預覽將測試服務開放到 Internet。

## 私隱與研究限制

- 本機伺服器只監聽 `127.0.0.1`、拒絕跨網站 POST，Gemini API Key 存放本機文字檔，不會加入網頁程式碼。
- 如果已配置自己的 API Key，學生文字仍會透過**你的電腦 → Google Gemini API** 傳送到 Google；不是完全離線模型。
- 目前只能用**虛構校園案例**進行系統開發驗證，不得輸入真實學生姓名、學校、霸凌事件或敏感心理資料。
- 公開示範會有基本單執行個體速率與識別資料字串檢查；無法保證偵測所有隱私或危險情境，不是實際兒童諮商、危機通報或正式校園介入系統。
- 本機測試不代表透過真人心理師／諮商師審核；Task-to-Task 評審工具仍需要獨立驗收。

## 疑難排解

| 顯示／錯誤 | 處理方式 |
|---|---|
| 需要 Node.js | 到官網安裝 Node.js 20+，關閉並重新開啟啟動檔 |
| `Gemini：未啟用` | 確認 API Key 已貼到 `gemini-key.txt` 並存檔 |
| `8787 埠已占用` | 關閉舊的 Mimo 啟動視窗後再試 |
| 網頁開不起來 | 直接手動開啟 http://127.0.0.1:8787/ ，確認黑色視窗尚未關閉 |
| `Gemini 暫時沒有回應` | 檢查網路、金鑰模型權限與用量／計費限制 |
| 直接打開 HTML 沒有 Gemini | 這是預期行為；想測真 AI 請雙擊 `點我啟動_Mimo.bat` |
