# Mimo 語音人際練習｜部署與驗收

此專案已使用 GitHub 作為程式原始碼中心，並將 `social-lab/` 作為 Vercel 網站根目錄。

- **學生網站（已建立且 Vercel 回報 READY）**：https://mimo-school-social-lab.vercel.app/
- **GitHub 程式碼**：https://github.com/aitest-ai/mimo-robot-ai-chat
- **Vercel 專案**：https://vercel.com/tests-projects-abe7fd9e/mimo-school-social-lab
- **模型狀態**：Modal/Cloudflare 尚未部署；目前語音辨識不可用，文字互動可先試玩。

## 架構與實際狀態

```
學生 iPad / Android 平板
    │ HTTPS
    ▼
Vercel：social-lab/index.html + voice.js + voice.css
    │ 學生主動送出一段語音後
    ▼
Cloudflare Worker：voice-api/cloudflare/src/index.js
    │ 校驗來源與課堂測試碼，限制檔案大小與請求頻率
    ▼
Modal：voice-api/modal/app.py
    │ SenseVoiceSmall 語音辨識及模型音訊標籤
    ▼
回傳文字 → 學生檢查／修正 → 由本機情境引擎提供不同角色反應
```

**尚未完成**：Cloudflare 與 Modal 帳號授權、Secrets、真實 SenseVoice 執行、跨平板瀏覽器錄音驗收、臺灣兒童語音準確率驗證，以及學校實際導入的資訊安全／隱私流程。

## 目前可立刻體驗的功能

1. 從 Vercel 開啟六個校園小劇場，觀看四幕情節和簡單動畫。
2. 故事進入「輪到你說話」時，點擊 **🎙 我想直接說出來（試用版）**。
3. 可以直接輸入一句話，查看虛構同學的三種可能反應。
4. 也可以點麥克風錄一小段音訊（最多 12 秒）；**尚未設定 Cloudflare/Modal 時，只能完成本機錄音，無法由 AI 轉成文字**。
5. 關閉視窗或按清除可捨棄尚未送出的錄音。頁面程式不使用 localStorage 保存音檔、課堂測試碼或辨識結果。

## 需要老師授權的雲端部署工作

### A. Modal（語音推論）

1. 連接或建立 Modal 帳號，開啟計費限制及帳戶預算；請先用測試用非兒童音檔驗證。
2. 在 Modal 建立名為 `mimo-voice-secrets` 的 Secret，內含 `BACKEND_TOKEN`（長度足夠的隨機值）。
3. 在已連接 Modal 的安全開發環境中執行：

   ```bash
   pip install modal
   modal setup
   modal deploy voice-api/modal/app.py
   ```

4. 複製 Modal 顯示的 **HTTPS 推論服務根網址**，供下一步設定 Cloudflare `MODAL_ENDPOINT`。請勿公開 `BACKEND_TOKEN`。
5. 原型使用 CPU 進行推論；啟動、模型下載可能很慢。測試前先從教師端預熱並確認速度。

### B. Cloudflare Worker（API 與流量保護）

1. 建立／連接 Cloudflare 帳號，在 `voice-api/cloudflare` 資料夾安裝依賴並部署：

   ```bash
   npm install
   npx wrangler login
   npx wrangler secret put BACKEND_TOKEN
   npx wrangler secret put MODAL_ENDPOINT
   npx wrangler secret put CLASS_CODE
   npx wrangler deploy
   ```

2. `BACKEND_TOKEN` 必須和 Modal 的 Secret **一致**；`MODAL_ENDPOINT` 是 HTTPS 根網址；`CLASS_CODE` 是短期試課用測試碼，請勿放到 GitHub 或前端程式碼中。
3. `wrangler.jsonc` 已將 Vercel 與 GitHub Pages 網域加入允許清單。正式網域若更動，要同步修改。
4. Cloudflare Rate Limiting API 保護配額，但**不是身分驗證或帳務上限**，上課前仍應設定雲端預算與安全防護。原型的共享班級碼不適用於正式規模化部署。
5. 老師可從 `https://<your-worker>.workers.dev/api/health` 檢查服務是否完成設定（僅允許的網頁來源可以讀取）。

### C. 平板連線

1. 透過學生平板開啟 Vercel 網站，開始一個校園小劇場。
2. 點「🎙 我想直接說出來」，展開「老師設定」。
3. 輸入 Worker HTTPS 網址與 `CLASS_CODE`，按「檢查語音服務」。
4. 按麥克風錄音；錄完會停在本機。按「送出語音辨識」才會上傳。
5. 檢查 ASR 文字並可更正，然後點「看看同學可能怎麼回答」。

> 目前每台平板需輸入設定，這是教師監督下的技術試作；正式上課前應建立統一設定派送與學生帳號／匿名課堂憑證。不可將共用班級碼當成完整的兒少資料存取控制。

## 隱私、安全與教育研究限制

- **不要先拿真實學生錄音來驗收未經審核的模型服務。** 請先用成年測試者、非真實學生的合成或有適當使用授權的測試音檔。
- 音訊是在學生**按下送出**後才傳輸；本程式沒有資料庫，也不主動將錄音或逐字稿寫入 GitHub。雲端平台仍可能保留執行紀錄／請求中繼資料，導入前要審查服務條款和資料處理要求。
- SenseVoice 標示的 `ANGRY`、`SAD` 等是**不確定的聲學線索**，不可等同學生真實情緒，不可用於心理診斷、學生評分、懲戒或霸凌判定。
- 目前虛擬同學的回答是**固定劇情分支**，不是 LLM 依學生用詞產生自由對話，也沒有把音訊標籤當成「語言是否傷人」的判準。
- 無後端成功請求時，網站仍可使用固定腳本的文字模式，不需 AI 帳號。
- 正式教育測試前需監護人／學校依法必要之同意、研究倫理審查（若適用）、保留與刪除政策、登入權限、人工支援 SOP、兒童語音實測。

## 程式驗收紀錄

- GitHub：`social-lab/index.html`、`social-lab/voice.js` 與 `voice.css` 已提交。
- Vercel：已建立與 GitHub 的連線，部署報告 `READY`，正式網域不要求 Vercel 登入（預覽版本維持保護）。
- JavaScript：已檢查語法、以模擬 DOM 測試故事選擇、語音視窗開關、輸入文字、虛擬角色分支及不支援麥克風時的替代流程。
- **未驗證**：真實裝置麥克風、音訊格式、Cloudflare/Modal 網路往返，以及兒童語音模型準確率。
