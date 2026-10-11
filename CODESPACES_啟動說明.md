# 在 GitHub Codespaces 玩 Mimo AI Chat + Ollama

本版本將原本的 Mimo 動態 AI 聊天室改成 **GitHub Codespaces 可啟動專案**。
注意：只有儲存程式碼在 GitHub repository 不會啟動 AI。按 `Code > Codespaces > Create codespace on main` 開啟 Codespace 後，才會執行安裝和下載模型。

## 最少操作流程

1. 建立一個 **私人 GitHub repository**，例如 `mimo-ai-chat`，將本專案所有內容上傳至該 repository 的**根目錄**，包括隱藏的 `.devcontainer/` 資料夾。
2. 在 GitHub repository 點 `Code` → `Codespaces` → `Create codespace on main`。
3. Codespaces 首次建立會自動執行 `.devcontainer/setup.sh`：安裝 Ollama、啟動服務、`ollama pull qwen3:0.6b`，並在建立完成後啟動聊天室。
4. 開啟 Codespaces 的 `Ports` 分頁，開啟 `3000` 埠所顯示的連結。**不要把這個埠改成 Public**。
5. 在 Mimo 聊天室右側將模式改成「Ollama 本機 AI」，從模型清單選 `qwen3:0.6b`，即可真正與模型聊天。

### 如果模型沒有自動啟動

在 Codespaces 終端機輸入：

```bash
bash .devcontainer/setup.sh
bash .devcontainer/start.sh
```

查看模型：

```bash
ollama list
```

如果想換模型（速度更慢、需要更多 RAM）：

```bash
OLLAMA_MODELS="$PWD/.ollama-models" ollama pull qwen3:1.7b
```

### 為什麼不是 GitHub Pages？

GitHub Pages 只能放前端靜態網頁，不能長期執行 Ollama；Codespaces 才能暫時提供可以執行程式的雲端電腦。Codespaces 預設閒置約 30 分鐘會暫停，並有免費資源額度；因此適合 Demo，但不是可永久上線的 AI 服務。

### 安全性與成本

- 本版 `.devcontainer/devcontainer.json` 將聊天埠 `3000` 設為 private，Ollama 的 `11434` 只監聽本機，不對外轉送。
- API 沒有對一般使用者加上驗證與速率限制，因此不要公開轉送連接埠。
- 下載的模型約 523MB，存在 repository 工作目錄下 `.ollama-models/`，透過 `.gitignore` 不會上傳到 GitHub；Codespaces 儲存空間仍可能計費。
- `postCreateCommand` 會執行官方 Ollama 安裝腳本。若安全要求較高，請先審查腳本，或改成固定版本安裝。
- 這是供測試的環境，Codespaces 停止或刪除後，對話服務就會停止。已停止的 Codespace 可以重新啟動。

## 部署給其他人長期使用

建議將靜態聊天室部署至 GitHub Pages，而伺服器 API 另部署到 Vercel 等主機，再串接 Ollama Cloud API。雲端 API 需要自己的帳號、金鑰與服務額度；金鑰只能放在後端的環境變數，不能寫入前端網頁或 GitHub repository。

## 檔案

- `.devcontainer/devcontainer.json`：Codespaces 自動配置
- `.devcontainer/setup.sh`：首次安裝 Ollama 與下載模型
- `.devcontainer/start-ollama.sh`：啟動本機 Ollama 服務
- `.devcontainer/start.sh`：啟動 Ollama 和 Mimo 聊天室
- `server.mjs`：先前做好的 Node.js Ollama 對話代理
- `index.html`：動態聊天室前端
- `official-react/`：可選擇整合原作者 `robot-heads` React 元件的版本