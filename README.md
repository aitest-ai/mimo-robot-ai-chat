# MIMO — 動態 AI 聊天室 Demo

## 🌤️ Mimo 心晴之鏡｜情緒與衝突反思實驗室

**獨立網站：** https://mimo-reflection-lab.vercel.app/

七階段 SEL 情緒辨識、情緒強度、安定策略、主觀敘事、事實與推論、學生選擇表情的角色換位、下次行動與成長卡。

- [獨立程式](./reflect-lab/) · [設計與兒少安全規範](./reflect-lab/DESIGN.md)
- AI 功能目前**僅有規劃，沒有連接到 LLM 或上傳任何個資**。請只用虛構故事試玩，不是正式諮商或危機服務。
- AI 專用開發分支：`feature/mimo-sel-reflection-ai`；不影響原本 `social-lab/`。

---

## 🎒 Mimo 校園人際練習室｜Vercel 已部署

**線上試玩：** https://mimo-school-social-lab.vercel.app/

目前提供六個臺灣國小校園小故事、簡單 SVG 動畫、文字互動練習，以及平板麥克風介面。語音辨識後端程式已放在 `voice-api/`，但 **Cloudflare / Modal 尚未連接與啟動，所以目前真正的 SenseVoice 語音辨識不可用**。

- 學生端原始碼：[social-lab/](./social-lab)
- 語音模型和部署指南：[voice-api/README.md](./voice-api/README.md)
- 雲端網站由 Vercel 連接 GitHub main 自動更新。原先 Ollama / Codespaces 專案保留不變。

---


## 🚀 GitHub Codespaces 一鍵啟動 Ollama

1. 在 GitHub 專案按 **Code → Codespaces → Create codespace on main**。
2. 第一次啟動會透過 `.devcontainer/setup.sh` 安裝 Ollama 並下載小型模型 `qwen3:0.6b`。
3. 稍後開啟自動轉送的 **3000 埠**，即可進入聊天室。
4. 在聊天室切換成 **Ollama 本機 AI** 模式並選擇下載的模型，就能真正對話。

> 注意：Codespaces 閒置時會停止，首次安裝與模型下載可能耗用運算／儲存配額；這不是永久公開的 AI 託管服務。轉送埠維持 **Private**，不要將無驗證的模型 API 直接開放給所有人。完整操作請見 [CODESPACES 啟動說明](./CODESPACES_啟動說明.md)。

---

這是一個能直接操作的 AI 聊天室原型，介面參考 Robot Heads 的 AI 動態狀態概念。**此單檔版本的機器人由我們用原生 SVG/CSS 重新繪製，不是原作者的 `robot-heads` npm 元件。** 這讓頁面完全無外部套件、不需要網路就能預覽。若要使用原版 React 動畫，請依照下方範例替換。

## 玩法 A：立刻玩（不需要安裝）

直接雙擊 `index.html` 開啟。預設的聊天回覆由少數規則和預先撰寫的範例組成，**不是真正 AI 模型**。你可以測試：

- 發送訊息：聆聽 → 思考 → 說話 → 開心 → 待機。
- 右方九種表情預覽、四種外殼造型、五種配色。
- 聊天紀錄保留在瀏覽器 localStorage，支援切換、清空和匯出 Markdown。
- 支援 Enter 傳送、Shift + Enter 換行、手機版、減少動態效果設定。
- 當回應生成中，送出鍵會變成停止鍵；可以取消。

## 玩法 B：串接真正的本機 AI（Ollama）

這一版**不需要任何付費 API**，但你電腦上要先裝好 [Ollama](https://ollama.com/)，下載一個合適的模型。參考指令：

```bash
ollama pull qwen3:4b
ollama serve
```

在另一個終端機，進入本專案資料夾，執行：

```bash
node server.mjs
```

瀏覽 `http://127.0.0.1:3000/`，右側「對話引擎」切換到 **Ollama 本機 AI**，並選擇已下載模型。這時候送出訊息會連接真實模型，使用串流產生回答。

**備註：** 有些作業系統的 Ollama 已在背景啟動。若 `ollama serve` 提示埠已經被使用，通常不需要再啟動第二次。模型名稱、可用性與硬體需求依你的 Ollama 版本和電腦而異；`qwen3:4b` 僅是示例。

可用環境變數：

```bash
PORT=3000 OLLAMA_URL=http://127.0.0.1:11434 node server.mjs
```

預設伺服器只綁定 `127.0.0.1`，避免將本機 AI 對話介面開放給外部網路。若要部署上線，需要另外加上使用者驗證、限流與安全性設計。

## 玩法 C：使用原作者的 React 元件（官方動畫）

ZIP 另外提供 `official-react/`：整合原作者 `robot-heads` 元件的 React 聊天室原始碼，也能透過根目錄的 Node 伺服器連接 Ollama。

在根目錄開啟一個終端機（只有真正 AI 模式需要）：

```bash
node server.mjs
```

在另一個終端機：

```bash
cd official-react
npm install
npm run dev
```

瀏覽終端機顯示的位址，通常是 `http://127.0.0.1:5173/`。

React 版已通過 JSX 語法解析檢查，但因製作環境無法連上 npm，尚未完成依賴安裝與瀏覽器驗收。單檔免安裝版已完成 Chromium 桌面與手機互動驗收。

## 如果要用 **原始 robot-heads 套件**

原始專案：<https://github.com/fayazara/robot-heads>。在 React 專案中執行：

```bash
npm install robot-heads
```

然後使用：

```jsx
import { RobotHead } from 'robot-heads';

export default function AssistantAvatar({ status = 'idle' }) {
  return (
    <RobotHead
      shape="rectangle"
      state={status}
      size={230}
      color="#6c83ed"
      trimColor="#a8b8c9"
      screenColor="#b7ffed"
      interactive
    />
  );
}
```

將聊天室狀態 `status` 串接到 `state` 即可；不必為每一種表情重新繪製資產。

這個專案的 HTML 版不依賴 `robot-heads` npm，與原作者沒有官方合作關係。以上引用需遵循原專案授權條款。

## 技術與限制

- `index.html`：所有前端介面、自製 SVG 機器人、動畫及聊天流程。
- `server.mjs`：純 Node.js 本機 HTTP 伺服器與 Ollama 串流反向代理，Node.js 20+，無 npm 相依套件。
- `package.json`：`npm start` 等同於 `node server.mjs`。
- 文字回答**不會**與嘴型逐字對應，這是動畫回饋示意。
- 模擬模式只是關鍵字回覆；若要有真正語意理解，請切換 Ollama 並啟動本機模型。
- 目前沒有語音辨識、語音合成、檔案上傳、伺服器端聊天紀錄庫等功能。