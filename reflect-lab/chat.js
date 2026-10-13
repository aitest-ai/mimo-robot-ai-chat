/* Mimo 心晴之鏡 · conversation-first SEL prototype.
   Child-facing: one natural question, persistent robot expressions, no stepper.
   Gemini is OFF by default. Teacher opt-in + fictitious cases only.
   Does not store chat content, credentials or child identities.
 */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const FACES=new Set(["calm","listen","soft","guard","hurt","question"]);
// A safety screen is necessary even when Gemini is offline. It does not replace a real counselor.
const IMMEDIATE=/(自殺|想死|不想活|傷害自己|割腕|性侵|被強迫|有人打我|一直被霸凌|被威脅|家暴|想傷害別人|一直欺負我|被打|性騷擾|想揍|要揍|會揍|想打人|想打(他|她|同學|老師)|忍不住動手|快(要)?動手|想砍|拿刀傷)/u;
const OBJECT_RISK=/(掃下去|掃掉|砸(爛|掉|東西)|摔(東西|書|椅|桌|手機)|翻桌|丟(出去|東西)|踢桌|推倒桌|控制不住.{0,8}(東西|破壞))/u;
const SCHOOL_DISTRESS=/(不(想|要)再?上學|不(想|要)去學校|不去上學|不敢(去|上)學|不敢去學校|每天.{0,6}(被笑|嘲笑|排擠|欺負|笑我|同學笑)|一直(被笑|被嘲笑|被排擠|被欺負|笑我)|每次都.{0,3}(欺負|嘲笑|弄我|笑我|不理我)|老師(都|也)?(偏心|不理我))/u;
const REFUSE_PERSPECTIVE=/(不要.{0,5}(換位|體諒|理解(他|她|對方)|原諒|替(他|她)想)|不想.{0,5}(換位|體諒|理解(他|她|對方)|原諒)|憑什麼.{0,8}(我|只有我).{0,6}(退讓|體諒))/u;
const REFUSE_CALM=/(不要.{0,6}(冷靜|呼吸|忍耐|放鬆)|不想.{0,5}(冷靜|呼吸|放鬆)|不要再問|別再問)/u;
function riskLevel(text){
 const t=String(text||"");
 if(IMMEDIATE.test(t)&&!/(我不想(打|揍|傷害)|我沒有(想|要)(打|揍|傷害))/.test(t))return "immediate";
 if(OBJECT_RISK.test(t))return "objects";
 if(SCHOOL_DISTRESS.test(t))return "school";
 return "none";
}
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
 mirrorReflect:{stage:5,field:"reaction",question:"如果有人用這個表情對你說這句話，你可能有什麼感覺？",goal:"讓孩子想像聽話者可能的感受；允許不知道、不要求道歉"},
 safePause:{stage:2,field:"strategy",question:"你現在能先離開那些容易被打翻的東西嗎？",goal:"暫停內容分析；先與可能摔落的物品保持距離，提供成人協助"},
 supportCheck:{stage:2,field:"strategy",question:"你現在在學校或家裡，是安全的嗎？",goal:"對學校拒絕和持續排擠優先詢問是否安全並提供真人支持，無須換位"}
};
const makeInitial=()=>({phase:"welcome",history:[],data:{},teacher:false,demo:false,manualDisabled:false,code:"",demoCase:"poster",processing:false,turn:0,safe:false,breathing:false,motion:false,breathTimer:null,breathStart:0,lastPrompt:phaseInfo.welcome.question,safetyConcern:"none",returnPhase:"event",declinedMirror:false,needsFollowup:false,supportMode:"listen",lastSkill:"",lastSource:""});
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
function speak(text,expression="listen",question="",record=true){
 face(expression);
 const message=String(text).trim();
 const q=String(question||"").trim();
 $("mimoTalk").textContent=(message+(message&&q?"\n":"")+q).trim()||intro;
 const card=$("speechCard");
 card.classList.remove("flash");void card.offsetWidth;card.classList.add("flash");
 if(!record)return;
 const last=state.history[state.history.length-1];
 if(last?.role==="mimo")last.text=$("mimoTalk").textContent;
 else state.history.push({role:"mimo",text:$("mimoTalk").textContent});
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
 // Listening mode must not quietly turn into an emotion-label worksheet.
 if(state.teacher&&state.supportMode==="listen"&&!["safePause","supportCheck","mirrorQuote","mirrorExpression","mirrorReflect","finish"].includes(phase)){
  return chips([{text:"💬 我還想說",value:"我還想繼續說這件事。"},{text:"☁️ 我還不知道怎麼說",value:"我現在還不知道怎麼說。"},{text:"🍃 想先休息",action:"breathe"},{text:"🙋 找大人",action:"help"}]);
 }
 const shortcuts=[{text:"🌿 我想先休息一下",action:"breathe"}];
 switch(phase){
  case "safePause":return chips([{text:"🪑 我已經退開了",value:"我已經離開桌邊了。"},{text:"🙋 找大人來幫忙",action:"help"},{text:"我還是很激動",value:"我還是很激動，還不想說其他事情。"}]);
  case "supportCheck":return chips([{text:"🌿 我現在安全",value:"我現在是安全的。"},{text:"☁️ 我不太確定",value:"我不太確定現在安不安全。"},{text:"🙋 找可信任的大人",action:"help"}]);
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
 if(current==="safePause")return "settle";
 if(current==="supportCheck")return "action";
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
 if(from==="safePause")return {reply:"你不需要把怒氣壓下去，但可以先讓自己與旁邊的物品保持距離。",face:"listen"};
 if(from==="supportCheck")return {reply:"謝謝你告訴我現在的情況。持續被嘲笑或不想上學的難受，需要有人認真聽見。",face:"listen"};
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
function updatePrompt(next,response,question,allowSilence=false){
 if(state.data.unsafe)return;
 if(state.declinedMirror&&next==="perspective")next="action";
 state.phase=next;
 const candidate=String(question||"").replace(/\s+/g," ").trim().slice(0,105);
 const q=questionValid(candidate)?candidate:(allowSilence?"":phaseInfo[next].question);
 state.lastPrompt=q;
 speak(response.reply,response.face,q);
 suggestions(next);
}
function chooseMove(move,previous,backup){
 const map={stay:previous,emotion:"weather",stabilize:"settle",story:"event",facts:"facts",perspective:"perspective",action:"action",close:"finish",support:"supportCheck"};
 let target=map[move]||backup;
 if(state.declinedMirror&&target==="perspective")target="action";
 if(state.safetyConcern!=="none"&&target==="perspective")target="supportCheck";
 return phaseInfo[target]?target:backup;
}
function selectMode(next,silent=false){
 if(!["listen","clarify","ideas"].includes(next)||state.processing)return;
 state.supportMode=next;
 document.querySelectorAll("#supportModes button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===next)));
 const line={listen:"好，我先聽你說，不急著分析。",clarify:"好，如果你願意，我們一起慢慢釐清。",ideas:"好，需要時我們再一起想一個可行的做法。"}[next];
 if(!silent)speak(line,"soft","",true);
 // Continue where the child left off; changing a preference is NOT an answer.
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
 return {answer:text,history:state.history.slice(-10).filter(m=>m&&m.text).map(m=>({role:m.role,text:String(m.text).slice(0,240)})),context,supportMode:state.supportMode,fictional:true,publicDemo:state.demo,demoCase:state.demoCase};
}
async function replyTo(text){
 const message=String(text||"").trim().slice(0,480);
 if(!message||state.processing)return;
 if(state.data.unsafe){showHelp();return;}
 const phase=state.phase;
 if(phase==="finish"){state.phase="event"}
 addUser(message);$("chatInput").value="";resizeInput();
 const risk=riskLevel(message);
 if(risk==="immediate"){
  state.data.unsafe=true;state.safetyConcern="immediate";stopBreath();
  speak("現在先和可能受傷的人保持距離，放下手邊可能傷人的東西，立刻找老師或可信任的大人到現場幫忙。網站不會替你通知任何人。","listen");
  chips([{text:"🙋 看看怎麼找大人",action:"help"}]);
  showHelp();return;
 }
 if(risk==="objects"){
  state.safetyConcern="objects";state.returnPhase=phase==="safePause"?state.returnPhase:phase;
  state.phase="safePause";stopBreath();
  speak("聽起來你氣到快想把東西掃下去。先不用談誰對誰錯，為了不讓自己或別人受傷，我們先離開桌邊。","listen",phaseInfo.safePause.question);
  suggestions("safePause");return;
 }
 if(risk==="school"&&phase!=="supportCheck"){
  state.safetyConcern="school";state.returnPhase="action";
  state.phase="supportCheck";stopBreath();
  const concern=/上學|學校/.test(message)?"你說現在很不想去學校，這件事值得讓大人認真聽見。":"你說這些讓你難受的事一再發生，我們先不急著判誰對誰錯。";
  speak(concern,"listen",phaseInfo.supportCheck.question);
  suggestions("supportCheck");return;
 }
 if(phase==="safePause"){
  if(/還是|還沒|不能|不行|控制不住|很激動/.test(message)){
   speak("我聽到你現在還很激動。先不用解釋，試著再和桌上的東西拉開距離；如果做不到，請找附近的大人幫忙。","listen","你身邊有能幫忙的大人嗎？");
   suggestions("safePause");return;
  }
  state.phase="settle";state.safetyConcern="none";
  speak("你先保護了自己和旁邊的人。現在不需要硬逼自己變平靜。","soft","你想繼續說，還是先休息一下？");
  suggestions("settle");return;
 }
 if(phase==="supportCheck"){
  if(/不確定|不安全|害怕|有人在|危險/.test(message)&&!/沒有|不會/.test(message)){
   speak("不確定安全的時候，先找現場能保護你的大人比較重要。如果第一個人沒有幫上忙，可以繼續找另一位。","listen","你願意先找一位可信任的大人嗎？");
   chips([{text:"🙋 看看可以找誰",action:"help"},{text:"我現在安全了",value:"我現在安全了"}]);return;
  }
  state.safetyConcern="none";state.phase="action";
  speak("謝謝你告訴我。即使現在安全，這些反覆發生的困擾也值得讓老師或輔導老師知道。","soft","你希望大人先怎麼幫你？");
  chips([{text:"🙋 找大人一起談",action:"help"},{text:"先讓我說完",value:"我希望他們先聽我把話說完。"},{text:"我想想怎麼保護自己",value:"我想先弄清楚自己的界線。"}]);return;
 }
 if(REFUSE_PERSPECTIVE.test(message)){
  state.declinedMirror=true;state.phase="action";
  speak("好，我不會要求你體諒或原諒對方。你自己受到的委屈也重要。","listen","你最希望有人怎麼幫你？");
  suggestions("action");return;
 }
 if(REFUSE_CALM.test(message)){
  state.phase="event";
  speak("你說得很清楚：你現在不想被要求冷靜。我不會逼你呼吸或忍耐。","listen","你最想讓我知道的是哪件事？");
  suggestions("event");return;
 }
 let next=proposeNext(phase,message);
 if(state.declinedMirror&&next==="perspective")next="action";
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
 speak("我在聽，慢慢來。","listen","",false);
 let result=null;
 try{
  const ctl=new AbortController();state.abort=ctl;
  const timeout=setTimeout(()=>ctl.abort(),13500);
  try{
   const headers={"Content-Type":"application/json"};
   if(state.demo)headers["X-Mimo-Demo"]="fictional-practice-v1";
   else headers["X-Mimo-Class-Code"]=state.code;
   const r=await fetch("/api/reflect-v2",{method:"POST",headers,body:JSON.stringify(messageForModel(message,phase,next)),signal:ctl.signal,cache:"no-store"});
   const payload=await r.json();
   if(!r.ok){
    if(r.status===401){state.teacher=false;state.demo=false;state.code="";showAiMode();$("teacherStatus").textContent="Gemini 使用權限失效，已切換為固定引導。";}
    if(payload.error==="PUBLIC_DEMO_NO_PERSONAL_DETAILS"){
      $("teacherStatus").textContent="公開練習不能輸入真實姓名、學校、電話或身分資料，請改用虛構人物。";
      result={reply:"這裡先用虛構人物來練習就好，真實的事情可以找可信任的大人聊。",face:"listen",question:"",move:"stay",skill:"validate_boundary",source:"privacy-rule"};
      throw Error("PRIVATE_DEMO_INPUT");
    }
    throw Error(payload.error||"AI_UNAVAILABLE");
   }
   if(typeof payload.reply!=="string"||!FACES.has(payload.face))throw Error("INVALID_RESPONSE");
   if(payload.needsAdult){state.data.unsafe=true;state.safetyConcern="immediate";state.processing=false;toggleBusy(false);state.teacher=false;state.code="";showAiMode();speak("如果這件事涉及傷害或持續欺負，請先找可信任的大人幫忙。你不需要獨自面對。","listen");showHelp();return}
   result=payload;
  }finally{clearTimeout(timeout)}
 }catch(e){
  if(seq===state.turn&&String(e?.message)!=="PRIVATE_DEMO_INPUT")$("teacherStatus").textContent="Gemini 暫時沒有回應，已切換為固定引導。";
 }finally{if(seq===state.turn){state.processing=false;state.abort=null;toggleBusy(false)}}
 if(seq!==state.turn)return;
 const response=result?{reply:result.reply,face:result.face}:local;
 const mapped=result?chooseMove(result.move,phase,next):next;
 state.lastSkill=result?.skill||"";state.lastSource=result?.source||"fallback";
 updatePrompt(mapped,response,result?.question,!!result);
 if(next==="mirrorReflect"&&FACES.has(message))face(message);
}
function toggleBusy(busy){
 $("chatInput").disabled=busy;$("sendBtn").disabled=busy;
 if(!busy)$("chatInput").focus({preventScroll:true});
 suggestions(state.phase);
}
function resizeInput(){const el=$("chatInput");el.style.height="auto";el.style.height=Math.min(el.scrollHeight,148)+"px"}
function showHelp(){
 const urgent=state.safetyConcern==="immediate";
 const objects=state.safetyConcern==="objects";
 const school=state.safetyConcern==="school";
 const notice=urgent
  ?"如果你擔心自己會動手或有人可能受傷，請先與對方保持距離、放下可能傷人的東西，立刻找現場老師或可信任的大人幫忙。"
  :objects
  ?"如果氣到想摔東西，先遠離可能被打翻的物品，並找一位大人陪你。"
  :school
  ?"如果你一直被笑、被排擠或不想上學，值得讓導師、輔導老師或其他可信任的大人認真聽見。"
  :"如果有人持續欺負、威脅或傷害你，請先找能保護你的大人；你不需要替傷害你的人找理由。";
 $("helpGuidance").textContent=notice;
 const dlg=$("helpDialog");if(!dlg.open)dlg.showModal();
}
function showAiMode(){
 $("aiIndicator").textContent=state.demo?"Gemini 練習中":state.teacher?"Gemini 教師模式":"固定引導";
 $("aiIndicator").classList.toggle("live",state.teacher);
 $("aiDisable").hidden=!state.teacher;
}
async function enablePublicDemo(){
 if(state.teacher||state.manualDisabled)return;
 try{
  const response=await fetch("/api/reflect-v2",{cache:"no-store"});
  if(!response.ok)return;
  const info=await response.json();
  if(info.publicDemoReady&&!state.teacher&&!state.manualDisabled){
   state.demo=true;state.teacher=true;state.code="";
   showAiMode();suggestions(state.phase);
   $("teacherStatus").textContent="Gemini 已預設啟用：只限虛構校園故事。請勿輸入真實姓名、學校或私人經歷。";
  }
 }catch{
  $("teacherStatus").textContent="Gemini 目前不可用，已使用固定引導。";
 }
}
async function enableAI(){
 const code=$("teacherCode").value.trim();
 if(!code||!$("fictionalConsent").checked){$("teacherStatus").textContent="請先填教師測試碼，並確認只用虛構故事。";return}
 $("aiEnable").disabled=true;
 try{
  const r=await fetch("/api/reflect-v2",{cache:"no-store"});
  const d=await r.json();if(!d.ready)throw Error("Gemini 尚未設定完成。請先在 Vercel 加入 GEMINI_API_KEY。");
  state.teacher=true;state.demo=false;state.manualDisabled=false;state.code=code;showAiMode();
  $("teacherStatus").textContent="已啟用 Gemini。只有新的虛構回答會送到 Google 模型。";
 }catch(e){$("teacherStatus").textContent=String(e.message||"無法使用 AI；仍可以本機體驗。");}
 finally{$("aiEnable").disabled=false}
}
function disableAI(){
 state.teacher=false;state.demo=false;state.manualDisabled=true;state.code="";state.turn++;
 state.abort?.abort();state.abort=null;state.processing=false;toggleBusy(false);
 $("teacherCode").value="";showAiMode();$("teacherStatus").textContent="Gemini 已關閉，接下來的文字不會送到模型。";
}
function reset(){
 if(window.confirm?.("重新聊天會清除目前的文字，確定嗎？")===false)return;
 state.abort?.abort();stopBreath();state=makeInitial();
 $("chatInput").value="";$("lastReply").hidden=true;$("history").hidden=true;$("historyToggle").setAttribute("aria-expanded","false");$("teacherCode").value="";$("fictionalConsent").checked=false;
 $("historyItems").replaceChildren();$("mimoHead").dataset.expression="soft";speak(intro,"soft");
 suggestions("welcome");showAiMode();selectMode("listen",true);resizeInput();void enablePublicDemo();
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
 if(state.data.unsafe||state.safetyConcern!=="none")return showHelp();
 if(state.declinedMirror){state.phase="action";speak("你剛才選擇不重演，這個選擇會被尊重。","listen",phaseInfo.action.question);suggestions("action");return;}
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
$("supportModes").addEventListener("click",e=>{const b=e.target.closest("button[data-mode]");if(b)selectMode(b.dataset.mode)});
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
face("soft");suggestions("welcome");showAiMode();selectMode("listen",true);resizeInput();void enablePublicDemo();
})();