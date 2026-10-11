import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { RobotHead, robotHeadShapes, robotHeadStates } from "robot-heads";
import "./style.css";

const labels = {
  idle: "待機", thinking: "思考", searching: "搜尋", listening: "聆聽",
  speaking: "說話", working: "工作", happy: "開心", error: "錯誤", sleeping: "休息"
};
const welcome = { role: "assistant", content: "嗨！我是 Mimo 🤖 你可以問我問題，或切換表情來觀察我的動畫。模擬模式不用 API；切換到 Ollama 後，就能用真正的本機語言模型。" };
const exampleAnswers = [
  "我會試著把問題拆成幾個簡單部分，再一步一步說清楚。你可以再問我更深入的問題！",
  "這是有趣的想法！我們可以先做最小可行版本，測試成功後再加入更多互動。",
  "如果要應用在教學，可以讓 AI 的狀態對應到思考、聆聽、回覆，幫助學生掌握互動節奏。"
];
function App(){
  const [messages, setMessages] = useState([welcome]);
  const [input, setInput] = useState("");
  const [state, setState] = useState("idle");
  const [shape, setShape] = useState("rectangle");
  const [color, setColor] = useState("#5478e7");
  const [screenColor, setScreenColor] = useState("#b9f8ea");
  const [mode, setMode] = useState("demo");
  const [models, setModels] = useState([]);
  const [model, setModel] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef(null);
  const bottom = useRef(null);
  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages, busy]);
  useEffect(() => {
    if(mode!=="ollama") return;
    fetch("/api/models").then(async r=>{
      const d=await r.json(); if(!r.ok) throw Error(d.error||"無法取得模型清單");
      const list=(d.models||[]).map(x=>x.name); setModels(list);
      setModel(old=> list.includes(old)?old:(list[0]||""));
      if(!list.length) setError("找不到模型，請先執行 ollama pull qwen3:0.6b");
      else setError("");
    }).catch(e=>setError(e.message));
  },[mode]);

  async function send(e){
    e?.preventDefault();
    const text=input.trim(); if(!text || busy) return;
    const history=[...messages,{role:"user",content:text}];
    setMessages([...history,{role:"assistant",content:""}]);setInput("");setBusy(true);setError("");setState("thinking");
    const controller=new AbortController();abortRef.current=controller;
    const replaceLast=content => setMessages(prev=>prev.map((m,i)=>i===prev.length-1?{role:"assistant",content}:m));
    try{
      if(mode==="demo"){
        await new Promise(resolve=>setTimeout(resolve,700));
        if(controller.signal.aborted) return;
        const answer=exampleAnswers[history.length % exampleAnswers.length];
        setState("speaking");
        for(let i=1;i<=answer.length;i+=2){
          if(controller.signal.aborted) return;
          replaceLast(answer.slice(0,i+1));
          await new Promise(resolve=>setTimeout(resolve,22));
        }
      }else{
        if(!model) throw Error("請先下載 Ollama 模型");
        const r=await fetch("/api/chat",{
          method:"POST",headers:{"Content-Type":"application/json"},
          signal:controller.signal,
          body:JSON.stringify({model,messages:history.map(({role,content})=>({role,content}))})
        });
        if(!r.ok){const d=await r.json();throw Error(d.error||"模型回應失敗");}
        const reader=r.body.getReader();const decoder=new TextDecoder();
        let buffer="";let answer="";
        while(true){
          const {value,done}=await reader.read();if(done)break;
          buffer+=decoder.decode(value,{stream:true});
          const lines=buffer.split("\n");buffer=lines.pop();
          for(const line of lines){
            if(!line.trim())continue;
            const d=JSON.parse(line);
            if(d.error) throw Error(d.error);
            if(d.message?.content){answer+=d.message.content;setState("speaking");replaceLast(answer);}
          }
        }
        if(buffer.trim()){const d=JSON.parse(buffer);if(d.message?.content){answer+=d.message.content;replaceLast(answer);}}
        if(!answer)replaceLast("模型已結束回應，但沒有文字內容。");
      }
      setState("happy");
      setTimeout(()=>setState(s=>s==="happy"?"idle":s),850);
    }catch(err){
      if(err.name!=="AbortError"){
        replaceLast("回覆失敗，請確認 Ollama 是否已啟動。");
        setState("error");setError(err.message);
      }
    }finally{setBusy(false);abortRef.current=null;}
  }
  const stop=()=>{abortRef.current?.abort();setBusy(false);setState("idle");};
  return <div className="app">
    <aside className="sidebar">
      <header className="brand"><span className="brand-mark">M</span><span><strong>MIMO AI</strong><small>Robot Heads Lab</small></span></header>
      <div className="profile">
        <RobotHead shape={shape} state={state} size={185} color={color} trimColor="#a8b8c9" screenColor={screenColor} speed={1} interactive/>
        <h1>嗨，我是 Mimo</h1><p><span className="dot"></span>{labels[state]}中 · 互動機器人</p>
      </div>
      <div className="settings">
        <h2>對話引擎</h2>
        <div className="seg"><button className={mode==="demo"?"active":""} onClick={()=>setMode("demo")}>模擬模式</button><button className={mode==="ollama"?"active":""} onClick={()=>setMode("ollama")}>Ollama AI</button></div>
        {mode==="ollama" && <select value={model} onChange={e=>setModel(e.target.value)}><option value="">選擇模型</option>{models.map(m=><option key={m} value={m}>{m}</option>)}</select>}
        <h2>機器人造型</h2>
        <div className="shapes">{robotHeadShapes.map(s=><button key={s} title={s} className={shape===s?"selected":""} onClick={()=>setShape(s)}>{s}</button>)}</div>
        <div className="colors"><label>機殼 <input aria-label="機殼顏色" type="color" value={color} onChange={e=>setColor(e.target.value)}/></label><label>螢幕 <input aria-label="螢幕顏色" type="color" value={screenColor} onChange={e=>setScreenColor(e.target.value)}/></label></div>
        <h2>測試動畫</h2>
        <div className="states">{robotHeadStates.map(s=><button key={s} className={state===s?"selected":""} onClick={()=>setState(s)}>{labels[s]}</button>)}</div>
      </div>
      <footer>使用 <a href="https://github.com/fayazara/robot-heads" target="_blank" rel="noreferrer">robot-heads</a> 原始套件</footer>
    </aside>
    <main className="main">
      <div className="topbar"><div><b>和 Mimo 聊天</b><span>讓想法從這裡開始</span></div><span className="pill">{mode==="demo"?"模擬對話":"本機 Ollama"}</span></div>
      <div className="conversation" role="log" aria-label="聊天訊息">
        <div className="intro"><span>✦</span><h2>今天想聊些什麼？</h2><p>把你的疑問交給 Mimo，一起找到答案。</p></div>
        {messages.map((m,i)=><div className={"msg "+m.role} key={i}>{m.role==="assistant"&&<div className="avatar">M</div>}<div className="bubble">{m.content || (busy?"正在思考…":"")}</div></div>)}
        {error&&<div className="error">{error}</div>}
        <div ref={bottom}></div>
      </div>
      <form className="composer" onSubmit={send}>
        <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="輸入訊息，或問問 Mimo 可以幫你做什麼…" rows={2}/>
        {busy?<button type="button" onClick={stop} className="send">停止</button>:<button type="submit" className="send" disabled={!input.trim()}>傳送 ➜</button>}
      </form>
      <div className="hint">這是 Demo。模擬模式不使用真正 AI；Ollama 模式需執行伺服器並下載模型。</div>
    </main>
  </div>
}
createRoot(document.getElementById("root")).render(<App/>);
