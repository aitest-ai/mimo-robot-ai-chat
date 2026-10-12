/* Mimo 心晴之鏡 · conversation-first SEL prototype.
   Child-facing: one natural question, persistent robot expressions, no stepper.
   Gemini is OFF by default. Teacher opt-in + fictitious cases only.
   Does not store chat content, credentials or child identities.
 */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const FACES=new Set(["calm","listen","soft","guard","hurt","question"]);
const DANGER=/(自殺|想死|不想活|傷害自己|割腕|性侵|被強迫|有人打我|一直被霸凌|被威脅|家暴|想傷害別人|一直欺負我|被打|性騷擾)/u;
const WEATHER=["☀️ 晴天","☁️ 多雲","🌧️ 下雨","⛈️ 打雷","🌬️ 風很大","🌫️ 霧霧的"];
const EMOTIONS=["生氣","難過","委屈","擔心","有點亂","說不上來"];
const phaseInfo={
 welcome:{stage:3,field:"story",question:"今天有什麼事情，想找我聊聊嗎？",goal:"自然詢問孩子的感覺或當下想談的事"},
 weather:{stage:1,field:"weather",question:"如果心情是一種天氣，現在比較像哪一種？",goal:"協助孩子說出當下的感覺，問題只問一個"},
 settle:{stage:2,field:"strategy",question:"你想先說說這件事，還是讓自己休息一下？",goal:"由孩子決定要不要安定情緒，不強迫深呼吸"},
 event:{stage:3,field:"story",question:"那時候發生的哪一件事，讓你最在意？",goal:"傾聽一件具體經過，不急著評斷"},
 facts:{stage:4,field:"fact",question:"如果只說你當時看到、聽到的事情，會是什麼？",goal:"以學生自己的說法區分觀察與推測，不宣稱查明真相"},
 thought:{stage:4,field:"guess",question:"你當時覺得，對方為什麼會這樣做？",goal:"協助孩子理解那是對動機的猜測，不當作已確認事實"},
 perspective:{stage:5,field:"perspectiveNote",question:"如果換個角度，這件事還可能有什麼解釋？",goal:"提出不同可能觀點並保留不知道，不替傷害辯解"},
 action:{stage:6,field:"newWords",question:"下次遇到類似的事，你想怎麼照顧自己或表達需要？",goal:"協助形成尊重自己、他人且實際可行的選擇"},
 wrap:{stage:6,field:"nextTime",question:"你想帶走一句什麼提醒，給下次的自己？",goal:"統整孩子自選的可遷移方法，不作心理評分"},
 finish:{stage:6,field:"nextTime",question:"今天先聊到這裡，好嗎？",goal:"溫和結束對話，不要求和解"},
 mirrorQuote:{stage:5,field:"quote",question:"你記得自己當時說了哪一句話嗎？",goal:"只記錄孩子自己願意重現的一句話"},
 mirrorExpression:{stage:5,field:"expression",question:"如果 Mimo 要演出當時的你，你想選哪一種表情？",goal:"由學生選擇可能表情，禁止聲稱偵測真實情緒"},
 mirrorReflect:{stage:5,field:"reaction",question:"如果有人用這個表情對你說這句話，你可能有什麼感覺？",goal:"讓孩子想像聽話者可能的感受；允許不知道、不要求道歉"}
};
const makeInitial=()=>({phase:"welcome",history:[],data:{},teacher:false,code:"",processing:false,turn:0,safe:false,breathing:false,motion:false,breathTimer:null,breathStart:0,lastPrompt:phaseInfo.welcome.question});
let state=makeInitial();
const intro="嗨，我是 Mimo。今天有什麼事情，想找我聊聊嗎？";
const micro=s=>String(s||"").trim().slice(0,70);
const safeContext=()=>{
 const keys=["weather","feeling","strength","story","quote","fact","guess","unknown","reaction","perspective","action"];
 const o={};
 for(const key of keys){if(state.data[key])o[key]=String(state.data[key]).slice(0,240)}
 return o;
};
function face(expression){
 const robot=$("mimoHead");
 if(!FACES.has(expression))expression="listen";
 robot.dataset.expression=expression;
 robot.setAttribute("aria-label","Mimo 的表情："+({calm:"平靜",listen:"認真傾聽",soft:"溫暖",guard:"皺眉",hurt:"難過",question:"正在思考"}[expression]));
 robot.classList.remove("react");void robot.getBoundingClientRect();robot.classList.add("react");
}
function speak(text,expression="listen",question=""){
 face(expression);
 const message=String(text).trim();
 const q=String(question||"").trim();
 $("mimoTalk").textContent=(message+(message&&q?"\n":"")+q).trim()||intro;
 const card=$("speechCard");
 card.classList.remove("flash");void card.offsetWidth;card.classList.add("flash");
 const last=state.history[state.history.length-1];
 if(last?.role==="mimo")return;
 state.history.push({role:"mimo",text:$("mimoTalk").textContent});
 if(state.history.length>24)state.history.shift();
 refreshHistory();
}
function refreshHistory(){
 const box=$("historyItems");box.replaceChildren();
 for(const msg of state.history.slice(-12)){
  const row=document.createElement("div");row.className="history-item "+(msg.role==="user"?"user":"mimo");
  const who=document.createElement("b");who.textContent=msg.role==="user"?"你":"Mimo";
  const span=document.createElement("span");span.textContent=msg.text;
  row.append(who,span);box.appendChild(row);
 }
}
function chips(values){
 const host=$("quickReplies");host.replaceChildren();
 for(const it of values){
  const button=document.createElement("button");
  button.type="button";button.textContent=it.text;button.dataset.value=it.value||it.text;
  if(it.action)button.dataset.action=it.action;
  button.disabled=state.processing;
  host.appendChild(button);
 }
}
function suggestions(phase){
 if(state.processing){chips([]);return}
 const shortcuts=[{text:"🌿 我想先休息一下",action:"breathe"}];
 switch(phase){
  case "welcome":return chips([{text:"🎨 用美勞課的例子",action:"demo"},{text:"💬 同學的事",value:"我想聊聊跟同學發生的事情。"},{text:"🌥️ 心情有點亂",value:"我今天心裡有點亂，不知道怎麼說。"}]);
  case "weather":return chips(WEATHER.map(t=>({text:t})));
  case "settle":return chips([{text:"💬 想繼續說",value:"我想繼續說這件事。"},{text:"🍃 跟著呼吸",action:"breathe"},{text:"🙋 想找大人",action:"help"}]);
  case "event":return chips([{text:"我還不知道怎麼說",value:"我有點不知道怎麼說。"},{text:"🌿 先休息",action:"breathe"}]);
  case "facts":return chips([{text:"📷 我只說看見的",value:"我想先試試只說自己看見的事情。"},{text:"我還不確定",value:"我不太確定當時看到了什麼。"}]);
  case "thought":return chips([{text:"可能有誤會",value:"也許有誤會，但我還不知道。 "},{text:"不確定",value:"我不知道對方到底怎麼想。"}]);
  case "perspective":return chips([{text:"🪞 照照小鏡子",action:"mirror"},{text:"可能是誤會",value:"也許是誤會，但這還沒確認。"},{text:"我還不知道",value:"我現在還不知道其他可能。"}]);
  case "mirrorQuote":return chips([{text:"我忘記了",value:"我不記得當時說了什麼。"},{text:"先不重演",action:"skipMirror"}]);
  case "mirrorExpression":return chips([{text:"😠 生氣",value:"guard"},{text:"😢 難過",value:"hurt"},{text:"😕 疑惑",value:"question"},{text:"😐 平靜",value:"calm"}]);
  case "mirrorReflect":return chips([{text:"有點受傷",value:"有點受傷"},{text:"覺得被誤會",value:"覺得被誤會"},{text:"我不確定",value:"我還不知道" }]);
  case "action":return chips([{text:"🛡️ 說出界線",value:"我想要有禮貌地說出自己的界線。"},{text:"🤝 試著溝通",value:"我想先說出自己的感受，聽聽對方的想法。"},{text:"🙋 找大人",action:"help"}]);
  case "wrap":return chips([{text:"先照顧自己的感受",value:"先照顧自己的感受，再決定怎麼回應。"},{text:"有不懂就先問",value:"不確定對方的意思時，先安全地確認。"},{text:"找可信任的大人",value:"如果一個人處理不了，可以找大人幫忙。"}]);
  case "finish":return chips([{text:"💬 我還想多聊一下",action:"continue"},{text:"✨ 今天先到這裡",action:"finish"}]);
  default:return chips(shortcuts);
 }
}
function proposeNext(current,text){
 const t=String(text);
 if(current==="welcome"){
  if(/(生氣|難過|委屈|很煩|很怕|害怕|傷心|焦慮)/.test(t)&&t.length<18)return "event";
  return "weather";
 }
 if(current==="weather")return /打雷|雷雨|強烈|爆炸|很生氣|受不了|很慌|害怕/.test(t)?"settle":"event";
 if(current==="settle")return "event";
 if(current==="event")return "facts";
 if(current==="facts")return "thought";
 if(current==="thought")return "perspective";
 if(current==="perspective")return "action";
 if(current==="action")return "wrap";
 if(current==="wrap")return "finish";
 if(current==="mirrorQuote")return "mirrorExpression";
 if(current==="mirrorExpression")return "mirrorReflect";
 if(current==="mirrorReflect")return "action";
 return "weather";
}
function fallback(from,text,next){
 const t=micro(text).replace(/\s+/g," ");const concise=t.length>30?t.slice(0,29)+"…":t;
 if(from==="welcome")return {reply:t.length>22?"你提到「"+concise+"」，看起來這件事讓你放在心上。":"嗯，我在聽。我們可以不用急著一次說清楚。",face:"listen"};
 if(from==="weather")return {reply:"原來心情像「"+concise+"」。這只是現在的感覺，不用急著變晴天。",face:/雷|雨|難過/.test(t)?"listen":"soft"};
 if(from==="settle")return {reply:"好，我們照你覺得舒服的速度來。想先休息也是可以的。",face:"soft"};
 if(from==="event")return {reply:"你說到「"+concise+"」。我還不知道現場的全部事情，但我願意陪你整理。",face:"listen"};
 if(from==="facts")return {reply:"我們先把你看到、聽到的內容放在這裡。也許還有一些事情沒被看見。",face:"question"};
 if(from==="thought")return {reply:"「"+concise+"」是當時浮現的想法。對方真正的原因，現在可能還不知道。",face:"question"};
 if(from==="perspective")return {reply:"願意想想其他可能，不代表你的委屈不重要，也不代表對方的行為沒問題。",face:"soft"};
 if(from==="mirrorQuote")return {reply:"我會用你自己提供的句子演練，這不是當時現場的錄影。",face:"listen"};
 if(from==="mirrorExpression")return {reply:"這個表情是你選的假設，不代表我知道你當時的心情。",face:FACES.has(t)?t:"question"};
 if(from==="mirrorReflect")return {reply:"如果聽的人有這樣的感受，或許我們可以想想其他說法；也可能有人有不同反應。",face:"listen"};
 if(from==="action")return {reply:"這是你想試的一種方式。你不需要為了讓所有人開心而放棄自己的界線。",face:"soft"};
 if(from==="wrap")return {reply:"你留給自己的提醒很重要。下次可以試試看，也可以找大人陪你一起處理。",face:"soft"};
 return {reply:"我在這裡，你可以慢慢說。",face:"listen"};
}
function updatePrompt(next,response,question){
 state.phase=next;
 const candidate=String(question||"").replace(/\s+/g," ").trim().slice(0,105);
 const q=questionValid(candidate)?candidate:phaseInfo[next].question;
 state.lastPrompt=q;
 speak(response.reply,response.face,q);
 suggestions(next);
}
function questionValid(q){
 if(!q||q.length<6||q.length>105)return false;
 if(/(真實姓名|完整名字|住址|電話號碼|身分證|學號|學校名稱|班級名稱)/.test(q))return false;
 if((q.match(/[？?]/g)||[]).length>1)return false;
 return true;
}
function addUser(text){
 state.history.push({role:"user",text});
 if(state.history.length>24)state.history.shift();
 $("lastReply").hidden=false;$("lastReplyText").textContent=text;refreshHistory();
}
function messageForModel(text,phase,next){
 const context=safeContext();
 const p=phaseInfo[phase],n=phaseInfo[next];
 if(phase==="weather")context.weather=text;
 if(phase==="welcome"||phase==="event")context.story=text;
 if(phase==="facts")context.fact=text;
 if(phase==="thought")context.guess=text;
 if(phase==="perspective")context.perspective=text;
 if(phase==="mirrorQuote")context.quote=text;
 if(phase==="mirrorReflect")context.reaction=text;
 if(phase==="action")context.action=text;
 return {stage:p.stage,field:p.field,answer:text,chat:true,nextObjective:n.goal,questionHint:n.question,context,fictional:true};
}
async function replyTo(text){
 const message=String(text||"").trim().slice(0,480);
 if(!message||state.processing)return;
 const phase=state.phase;
 if(phase==="finish"){state.phase="event"}
 addUser(message);$("chatInput").value="";resizeInput();
 if(DANGER.test(message)){stopBreath();face("guard");speak("這件事需要能保護你的大人一起處理。你不用一個人面對，也不用先原諒誰。","guard");showHelp();chips([{text:"🙋 再看看可以找誰幫忙",action:"help"}]);return}
 const next=proposeNext(phase,message);
 if(phase==="welcome")state.data.story=message;
 if(phase==="weather")state.data.weather=message;
 if(phase==="event")state.data.story=message;
 if(phase==="facts")state.data.fact=message;
 if(phase==="thought")state.data.guess=message;
 if(phase==="perspective")state.data.perspective=message;
 if(phase==="mirrorQuote")state.data.quote=message;
 if(phase==="mirrorExpression")state.data.expression=message;
 if(phase==="mirrorReflect")state.data.reaction=message;
 if(phase==="action")state.data.action=message;
 if(phase==="wrap")state.data.nextTime=message;
 const local=fallback(phase,message,next);
 if(!state.teacher){
  updatePrompt(next,local);
  if(next==="mirrorReflect"){
   // Expression chosen by child; mimic this only for the imagined role-play.
   if(FACES.has(message))face(message);
  }
  return;
 }
 const seq=++state.turn;
 state.processing=true;toggleBusy(true);
 speak("我在聽，也在想怎麼接住你剛才說的事……","listen");
 let result=null;
 try{
  const ctl=new AbortController();state.abort=ctl;
  const timeout=setTimeout(()=>ctl.abort(),13500);
  try{
   const r=await fetch("/api/reflect",{method:"POST",headers:{"Content-Type":"application/json","X-Mimo-Class-Code":state.code},body:JSON.stringify(messageForModel(message,phase,next)),signal:ctl.signal,cache:"no-store"});
   const payload=await r.json();
   if(!r.ok)throw Error(payload.error||"AI_UNAVAILABLE");
   if(typeof payload.reply!=="string"||!FACES.has(payload.face))throw Error("INVALID_RESPONSE");
   if(payload.needsAdult){state.processing=false;toggleBusy(false);state.teacher=false;state.code="";showAiMode();speak("如果這件事涉及傷害或持續欺負，請先找可信任的大人幫忙。你不需要獨自面對。","guard");showHelp();return}
   result=payload;
  }finally{clearTimeout(timeout)}
 }catch(e){
  if(seq===state.turn)$("teacherStatus").textContent="Gemini 暫時沒有回應，已切換為固定引導。";
 }finally{if(seq===state.turn){state.processing=false;state.abort=null;toggleBusy(false)}}
 if(seq!==state.turn)return;
 const response=result?{reply:result.reply,face:result.face}:local;
 updatePrompt(next,response,result?.question);
 if(next==="mirrorReflect"&&FACES.has(message))face(message);
}
function toggleBusy(busy){
 $("chatInput").disabled=busy;$("sendBtn").disabled=busy;
 if(!busy)$("chatInput").focus({preventScroll:true});
 suggestions(state.phase);
}
function resizeInput(){const el=$("chatInput");el.style.height="auto";el.style.height=Math.min(el.scrollHeight,148)+"px"}
function showHelp(){$("helpDialog").showModal()}
function showAiMode(){$("aiIndicator").textContent=state.teacher?"Gemini 測試":"故事體驗";$("aiIndicator").classList.toggle("live",state.teacher);$("aiDisable").hidden=!state.teacher;}
async function enableAI(){
 const code=$("teacherCode").value.trim();
 if(!code||!$("fictionalConsent").checked){$("teacherStatus").textContent="請先填教師測試碼，並確認只用虛構故事。";return}
 $("aiEnable").disabled=true;
 try{
  const r=await fetch("/api/reflect",{cache:"no-store"});
  const d=await r.json();if(!d.ready)throw Error("Gemini 尚未設定完成。請先在 Vercel 加入 GEMINI_API_KEY。");
  state.teacher=true;state.code=code;showAiMode();
  $("teacherStatus").textContent="已啟用 Gemini。只有新的虛構回答會送到 Google 模型。";
 }catch(e){$("teacherStatus").textContent=String(e.message||"無法使用 AI；仍可以本機體驗。");}
 finally{$("aiEnable").disabled=false}
}
function disableAI(){
 state.teacher=false;state.code="";state.turn++;
 state.abort?.abort();state.abort=null;state.processing=false;toggleBusy(false);
 $("teacherCode").value="";showAiMode();$("teacherStatus").textContent="Gemini 已關閉，接下來的文字不會送到模型。";
}
function reset(){
 if(window.confirm?.("重新聊天會清除目前的文字，確定嗎？")===false)return;
 state.abort?.abort();stopBreath();state=makeInitial();
 $("chatInput").value="";$("lastReply").hidden=true;$("history").hidden=true;$("historyToggle").setAttribute("aria-expanded","false");$("teacherCode").value="";$("fictionalConsent").checked=false;
 $("historyItems").replaceChildren();$("mimoHead").dataset.expression="soft";speak(intro,"soft");
 suggestions("welcome");showAiMode();resizeInput();
}
function demo(){
 // Entirely fictional, and distinguished from real student conflict.
 void replyTo("我們美勞課一起畫海報，小庭沒有先問就把我畫好的部分改掉，我很生氣。");
}
function breathe(){
 stopBreath();
 const area=$("breathingBox");area.hidden=false;
 state.breathing=true;state.motion=!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
 state.breathStart=Date.now();
 $("breathOrb").classList.toggle("active",state.motion);
 $("breathPlay").textContent=state.motion?"暫停":"開始圓圈動畫";
 face("soft");speak("我們先不用急著說。圓圈變大時吸氣，變小時吐氣，不舒服就停下。","soft");
 $("quickReplies").replaceChildren();
 function tick(){
  if(!state.breathing||!state.motion)return;
  const t=(Date.now()-state.breathStart)%8000;
  $("breathStatus").textContent=t<4000?"慢慢吸氣 · "+(Math.floor(t/1000)+1)+"/4":"慢慢吐氣 · "+(Math.floor((t-4000)/1000)+1)+"/4";
 }
 if(state.motion){tick();state.breathTimer=setInterval(tick,200)}
 else $("breathStatus").textContent="已暫停動畫，可自行選擇播放。";
}
function stopBreath(){
 clearInterval(state.breathTimer);state.breathTimer=null;state.breathing=false;state.motion=false;
 $("breathingBox").hidden=true;$("breathOrb").classList.remove("active","force-motion");
}
function finishBreath(){
 stopBreath();
 const phase=state.phase==="settle"?"event":state.phase;
 state.phase=phase;
 const q=phaseInfo[phase].question;
 speak("我們可以照你舒服的速度繼續。"+(phase==="event"?"":""),"soft",q);
 suggestions(phase);
}
function startMirror(){
 if(state.data.unsafe)return showHelp();
 state.phase="mirrorQuote";
 speak("我們可以讓 Mimo 當一面小鏡子。你可以不重演，也不用勉強自己。","question",phaseInfo.mirrorQuote.question);
 suggestions("mirrorQuote");
}
function useAction(action){
 if(action==="help")return showHelp();
 if(action==="breathe")return breathe();
 if(action==="demo")return demo();
 if(action==="mirror")return startMirror();
 if(action==="skipMirror"){state.phase="action";speak("不重演也完全可以。我們繼續想想怎麼保護自己的需要。","soft",phaseInfo.action.question);suggestions("action");return}
 if(action==="continue"){state.phase="event";speak("當然可以，我還在聽。","listen","你還想說說哪件事？");suggestions("event");return}
 if(action==="finish"){speak("好，今天就先到這裡。記得，遇到難處時也可以找可信任的大人。","soft");chips([{text:"✨ 再聊一次",action:"restart"}]);return}
 if(action==="restart")return reset();
}
$("chatForm").addEventListener("submit",e=>{e.preventDefault();void replyTo($("chatInput").value)});
$("chatInput").addEventListener("input",resizeInput);
$("chatInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();$("chatForm").requestSubmit?.()}});
$("quickReplies").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.action)useAction(b.dataset.action);else void replyTo(b.dataset.value)});
$("historyToggle").onclick=()=>{
 const el=$("history");el.hidden=!el.hidden;
 $("historyToggle").setAttribute("aria-expanded",String(!el.hidden));
 $("historyToggle").textContent=el.hidden?"看看我們剛剛聊了什麼":"收起剛剛的對話";
};
$("teacherOpen").onclick=()=>$("teacherDialog").showModal();
$("teacherClose").onclick=()=>$("teacherDialog").close();
$("helpBtn").onclick=showHelp;$("helpClose").onclick=()=>$("helpDialog").close();$("helpDone").onclick=()=>$("helpDialog").close();
$("aiEnable").onclick=()=>{void enableAI()};
$("aiDisable").onclick=disableAI;
$("restart").onclick=reset;
$("breathPlay").onclick=()=>{
 if(!state.breathing)return;
 state.motion=!state.motion;
 clearInterval(state.breathTimer);state.breathTimer=null;
 $("breathOrb").classList.toggle("active",state.motion);
 $("breathOrb").classList.toggle("force-motion",state.motion);
 $("breathPlay").textContent=state.motion?"暫停":"繼續";
 if(state.motion){
  state.breathStart=Date.now();
  state.breathTimer=setInterval(()=>{
   const t=(Date.now()-state.breathStart)%8000;
   $("breathStatus").textContent=t<4000?"慢慢吸氣 · "+(Math.floor(t/1000)+1)+"/4":"慢慢吐氣 · "+(Math.floor((t-4000)/1000)+1)+"/4";
  },200);
 }else $("breathStatus").textContent="圓圈已暫停。";
};
$("breathClose").onclick=finishBreath;
face("soft");suggestions("welcome");showAiMode();resizeInput();
})();