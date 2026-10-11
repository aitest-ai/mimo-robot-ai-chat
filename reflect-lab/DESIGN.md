# Mimo 心晴之鏡｜設計依據、AI 分工與兒少保護

**定位**：國小四至六年級的社會情緒學習（SEL）與人際衝突反思輔助系統。不是心理師、心理治療、心理診斷、霸凌調查或可以獨立處理危機的 AI 諮商服務。

## 核心區別

- `social-lab/`：虛構校園短劇，人際說話技巧練習。
- `reflect-lab/`：從孩子自己的感受出發，釐清經驗，學習不同可能的觀點與下次行動。
- 不應引導孩子推論「我一定做錯了」；也不可強迫受欺負、威脅或傷害的孩子替對方找藉口。

## 七階段教學對應

| 階段 | 核心能力與理論 | 互動設計 |
|---|---|---|
| 0 安全先行 | 兒童保障、輔導倫理 | 持續欺負、威脅、傷害時不進入換位表演，優先找真人 |
| 1 天氣與強度 | CASEL 自我覺察；RULER Recognizing / Labeling | 選天氣、情緒詞、1–5 強度；不強求晴天 |
| 2 安定一下 | CASEL 自我管理；RULER Meta-Moment；Emotion Coaching | 先接納情緒，再由孩子選擇呼吸、休息或求助 |
| 3 我的版本 | 情緒驗證、敘事外化、同理式傾聽 | 孩子先完整表達，不急著糾正 |
| 4 事實放大鏡 | 認知彈性、事件－想法－感受區分 | 分開學生聲稱的可觀察事、推論及未知 |
| 5 換位小鏡子 | CASEL 社會覺察；RULER Blueprint | 自願重播原話和由孩子選的可能表情，思考不同立場 |
| 6 成長卡 | CASEL 關係技巧、負責任決策 | 具體練習說明、界線、暫停、修復或求助，建立下次行動 |

參照：https://casel.org/what-is-sel/ ; https://medicine.yale.edu/childstudy/services/community-and-schools-programs/center-for-emotional-intelligence/ruler/ ; https://rulerapproach.org/about/what-is-ruler/ ; https://educationendowmentfoundation.org.uk/projects-and-evaluation/promising-programmes/emotion-coaching

## 機制設計：三面鏡子

**情緒鏡**：例如孩子覺得被搶了作品，可能同時有生氣、委屈、難過，也可能沒有辦法立刻辨識；先承認感受的正當性。

**事件鏡**：將『我看到他改海報』和『他一定是故意讓我難堪』分離。後者是孩子當下的推論，不代表它一定錯，也不代表已獲客觀證實。

**換位鏡**：由學生選擇是否模擬自己的原話與可能表情；假設如果有人這樣對自己說，自己可能感受到什麼。除了可能受傷，也可顯示困惑、想了解、沒什麼感覺等反應，不能宣稱知道現實中的對方真正怎麼想。

## AI 功能分工（預定；目前原型沒有連接 AI）

1. **Emotion Companion**：同理反映，不貼標籤，不替孩子判責。
2. **Fact Lens**：從學生的敘事提出候選『看到／聽到／猜想／不知道』，所有內容都要由孩子確認。不能把單方面陳述稱為現場已驗證事實。
3. **Perspective Engine**：在安全情境中生成至少兩種不同、合理且可修正的觀點；一定保留『不知道』。不能為霸凌、歧視、暴力或強迫行為辯護。
4. **Mirror Actor**：只重現孩子同意的文字；動畫表情由孩子確認，合成語音不得模仿學生本人，不重播持續辱罵、歧視與威脅內容。
5. **Repair / Boundary Coach**：以具體可行的句型支持孩子表達感受、設立界線、道歉修復、暫停或找大人。**不把讓所有人開心或立刻和好當成唯一答案**。

### 模型輸出規格與可追溯性

建議以分階段 JSON schema 傳輸，欄位例子：

```json
{
  "mode": "fact_lens",
  "observations": [{"text": "學生表示同學修改了海報", "source": "student_report", "verified": false}],
  "interpretations": [{"text": "對方可能是故意的", "source": "student_report", "verified": false}],
  "unknowns": ["對方為什麼修改海報"],
  "possible_perspectives": [
    {"role": "other_student", "thought": "可能想趕快完成", "uncertainty": "不能確定"},
    {"role": "observer", "thought": "可能只看見爭執的片段", "uncertainty": "不能確定"}
  ],
  "suggestions": ["可以先問對方為什麼改作品", "可以說出自己希望先被詢問的界線"],
  "student_confirmation_required": true,
  "human_support_available": true
}
```

系統必須驗證 schema、輸入長度、輸出類別、來源註記及兒少安全限制；把 AI 回答當成**可選擇的假設與提問**，不是事實裁定。

### 特別重要：安全與風險分流

- 使用者主動點『找大人』必須隨時可使用；不要只倚賴 LLM 或關鍵字偵測。
- 如果涉及持續霸凌、威脅、家暴、性侵、虐待、自傷或傷人風險：停止角色模擬，優先引導可信任成年人、學校輔導與正式通報。
- 現有 Demo **不能自動通知老師或家長**；不可向孩子暗示已通報。正式上線需配合校園通報及危機 SOP。臺灣《校園霸凌防制準則》：https://edu.law.moe.gov.tw/LawContent.aspx?id=GL000683
- AI 不應自行診斷或判斷霸凌責任，也不能把孩子不願意原諒說成錯誤。
- 讓孩子確認 ASR 辨識文字；聲音模型推測的『生氣』不能等同真正情緒，也不能生成羞辱性的視覺內容。
- 資料蒐集以最小化為原則：原型僅前端記憶體運作，不使用 localStorage、資料庫或追蹤；導入真實學生前要依法完成必要學校及監護人同意、隱私告知、保存刪除、權限與供應商審查。

參照：https://www.schoolcounselor.org/Standards-Positions/Position-Statements/ASCA-Position-Statements/The-School-Counselor-and-Student-Mental-Health ; https://www.schoolcounselor.org/Standards-Positions/Position-Statements/ASCA-Position-Statements/The-School-Counselor-and-Confidentiality ; https://www.unicef.org/innocenti/reports/policy-guidance-ai-children

## 驗收與教育研究方向

- 教師／輔導專家先評估題目適切性、心理安全、危機導流與語氣。
- 以虛構的標準化情境測『情緒詞的精細度』、『事實 vs. 推論分類』、『合理觀點替代數』、『安全界線』與『行動可執行性』。
- 追蹤是否出現負向效果：自責增加、過度討好、不敢求助、覺得應該替他人不當行為找理由。
- 若做準實驗，宜比較固定引導、AI 事實澄清及 AI 換位模擬；加延宕的新情境測驗檢查是否能遷移，不能只依模型自己生成的話評分。

## 本次完成

- 以 `reflect-lab/index.html`、`style.css`、`app.js` 建立七步驟可操作的獨立互動原型。
- 六種天氣、十種情緒詞、強度滑桿、安定策略、敘事／事實／推論、視角選擇、模擬表情、自我感受反思及成長卡。
- 特殊風險選項優先啟動真人求助入口，跳過角色換位演出。
- **真正 LLM、SenseVoice、學校帳號與資料庫均未接入。** 此版請僅用虛構事件做介面與教學流程試玩。