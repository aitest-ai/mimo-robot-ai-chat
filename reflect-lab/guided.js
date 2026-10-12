/* Mimo 心晴之鏡 · v0.2 one-question-at-a-time learning guide.
 * Fixed educational scaffolds only; NO AI model, audio recording, data storage or external request.
 * Personal stories should not be submitted to this public prototype.
 */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const stageTitles=["先確認安全","我的心情天氣","慢慢照顧自己","說出我的故事","事實放大鏡","換位小鏡子","我的心情成長卡"];
const weather=[
 {id:"sunny",icon:"☀️",label:"晴天",help:"輕鬆或開心",reply:"原來心裡有一點陽光。其他感受也可以同時存在。",face:"soft"},
 {id:"cloudy",icon:"☁️",label:"多雲",help:"有點煩、悶悶的",reply:"悶悶的感覺也值得被聽見，我會陪你慢慢整理。",face:"listen"},
 {id:"rainy",icon:"🌧️",label:"雨天",help:"難過、想哭",reply:"難過的時候可以慢慢說，你不需要立刻變開心。",face:"listen"},
 {id:"stormy",icon:"⛈️",label:"雷雨",help:"生氣、委屈",reply:"心裡像打雷一樣也沒關係，我們先照顧這個感覺。",face:"guard"},
 {id:"windy",icon:"🌬️",label:"大風",help:"緊張、擔心",reply:"緊張的時候，先讓自己覺得安全，比急著回答更重要。",face:"listen"},
 {id:"foggy",icon:"🌫️",label:"起霧",help:"亂亂的、不確定",reply:"現在說不上來也沒關係，想清楚需要一點時間。",face:"question"}
];
const feelings=["生氣","委屈","難過","失望","害怕","緊張","尷尬","孤單","困惑","說不上來"];
const strategies=[
 {id:"listen",icon:"👂",label:"先被好好聽見",help:"我想先把話說完",reply:"我會先聽你的版本，不會急著判斷誰對誰錯。",face:"listen"},
 {id:"breathe",icon:"🍃",label:"跟著圓圈呼吸",help:"我想放慢一下",reply:"你選擇先讓自己舒服一點。我們可以照自己的節奏來。",face:"soft"},
 {id:"rest",icon:"🪑",label:"先休息一下",help:"喝水、看看周圍",reply:"願意讓自己休息一下，也是在好好照顧自己。",face:"calm"},
 {id:"adult",icon:"🙋",label:"找可信任的大人",help:"我希望有人幫忙",reply:"你不需要一個人面對。找老師或家人幫忙是勇敢的選擇。",face:"soft"}
];
const expressions=[
 {id:"guard",icon:"😠",label:"皺眉、語氣比較重",help:"只是可能的樣子",reply:"我會用這個表情演練，但它不代表你當時真的有這樣的情緒。",face:"guard"},
 {id:"hurt",icon:"😢",label:"難過、快哭的樣子",help:"只是可能的樣子",reply:"這是你選擇的假設表情，不表示我知道當時發生什麼。",face:"hurt"},
 {id:"question",icon:"😕",label:"疑惑、沒想清楚",help:"只是可能的樣子",reply:"原來你想看看困惑的表情。我們保留其他可能。",face:"question"},
 {id:"calm",icon:"😐",label:"平靜、認真地說",help:"只是可能的樣子",reply:"平靜說話也可能讓人難過，重要的還有話的內容與情境。",face:"calm"}
];
const reactions=["有點受傷","覺得被誤會","覺得不公平","想先聽原因","可能沒什麼感覺","我不確定"];
const perspectives=[
 {id:"self",icon:"🌱",label:"回到我的位置",help:"我在意什麼？",reply:"你的感受和界線仍然重要。理解不同角度，不用否定自己。",face:"listen"},
 {id:"other",icon:"🧩",label:"站在對方可能的位置",help:"但不能假裝知道對方心情",reply:"對方也許有沒說出口的原因，也可能真的做錯了。只有安全地詢問才可能知道更多。",face:"question"},
 {id:"observer",icon:"👀",label:"站在旁觀同學的位置",help:"他可能只看見一部分",reply:"旁人可能只看見吵起來的那一幕，而不知道前面發生什麼。",face:"question"}
];
const actions=[
 {id:"explain",icon:"💬",label:"說清楚我的感受",help:"把事情、感受與需要說出來",reply:"說清楚自己在意什麼，可以讓別人更了解你。",face:"soft"},
 {id:"boundary",icon:"🛡️",label:"保護自己的界線",help:"可以有禮貌地說不",reply:"即使對方失望，你仍然可以尊重地保護自己的界線。",face:"calm"},
 {id:"pause",icon:"🌿",label:"先離開、等一下再說",help:"不用立刻把話說完",reply:"先暫停是個方法，等雙方安全且準備好了再談。",face:"listen"},
 {id:"repair",icon:"🤝",label:"修復我造成的影響",help:"對具體的行為負責",reply:"如果自己有傷到別人，可以針對那個行為道歉，不代表整個人都不好。",face:"soft"},
 {id:"adult",icon:"🙋",label:"請老師或家人幫忙",help:"不需要自己承擔所有事",reply:"願意求助不是失敗，很多衝突需要大人一起處理。",face:"soft"}
];
const defaultData=()=>({safety:"",weather:"",strength:3,feeling:"",strategy:"",after:3,story:"",quote:"",fact:"",guess:"",unknown:"",expression:"",reaction:"",perspective:"",perspectiveNote:"",action:"",newWords:"",nextTime:"",end:3});
let data=defaultData(), at=0, answered={},feedback="",breathTimer=null,breathStart=0,breathActive=false,breathMotion=true;
const questions=[
 {stage:0,type:"choice",field:"safety",headline:"這件事，讓你覺得安全嗎？",desc:"先確認是不是適合自己練習的衝突。",options:[
  {id:"normal",icon:"🌿",label:"一般的爭執或誤會",help:"例如意見不同、吵了一架",face:"listen",reply:"謝謝你告訴我。我們先照顧你的感受，再慢慢看整件事。"},
  {id:"unsure",icon:"☁️",label:"我不太確定",help:"有點害怕，不知道怎麼辦",face:"question",reply:"不確定也沒關係。如果你不安全，找大人幫忙永遠是第一選擇。"},
  {id:"unsafe",icon:"🛟",label:"有人威脅、傷害或一直欺負我",help:"例如被威脅、打人或持續排擠",face:"guard",reply:"這不是要你自己解決的事。請先找能保護你的大人，我不會要求你替傷害你的人找理由。"}
 ]},
 {stage:1,type:"choice",field:"weather",headline:"你現在的心情，像什麼天氣？",desc:"選一個最接近的就好；心情不一定只有一種。",options:weather},
 {stage:1,type:"range",field:"strength",headline:"剛剛那個感覺，有多強烈？",desc:"1 是一點點，5 是非常強烈。沒有正確答案。"},
 {stage:1,type:"choice",field:"feeling",headline:"你想把這個感覺叫做什麼？",desc:"先挑一個最想說的感受，之後還能再想其他的。",options:feelings.map(f=>({id:f,label:f,icon:"◌",reply:"謝謝你告訴我，原來這個感覺對你很重要。",face:"listen"}))},
 {stage:2,type:"choice",field:"strategy",headline:"現在，你想怎麼照顧自己？",desc:"不是一定要冷靜才能往下走，選對你舒服的方法。",options:strategies},
 {stage:2,type:"breath",field:"breath",headline:"要不要跟著圓圈，慢慢呼吸一次？",desc:"圓圈變大時吸氣，縮小時吐氣。如果不舒服，請按停止。"},
 {stage:2,type:"range",field:"after",headline:"現在，你的心情強度是多少？",desc:"比剛剛強、比較弱或一樣，都沒有關係。"},
 {stage:3,type:"text",field:"story",headline:"如果從你的眼睛看，發生了什麼？",desc:"可以先說自己的委屈。這裡沒有要急著判誰對誰錯。",placeholder:"例如：小庭改了我畫的海報，我覺得很不被尊重。"},
 {stage:3,type:"text",field:"quote",headline:"你記得自己當時說了哪句話嗎？",desc:"如果忘記了，不用編造，可以按「略過」。",placeholder:"例如：你很煩耶！為什麼每次都亂動我的東西？"},
 {stage:4,type:"text",field:"fact",headline:"如果攝影機在現場，它能拍到什麼？",desc:"只寫看得見、聽得見的事，不需要猜測別人心裡的想法。",placeholder:"例如：她拿起畫筆修改了海報。我當時說話變大聲。"},
 {stage:4,type:"text",field:"guess",headline:"你當時猜測對方在想什麼？",desc:"這是你的推測，可能很有道理，但還不代表已確認。",placeholder:"例如：我覺得她故意不尊重我。"},
 {stage:4,type:"text",field:"unknown",headline:"這件事還有哪一點，你現在不知道？",desc:"不知道的事也可以留下來，不用勉強猜答案。",placeholder:"例如：她為什麼要改海報？"},
 {stage:5,type:"choice",field:"expression",headline:"如果要重演當時的你，表情可能接近哪一種？",desc:"你來選，Mimo 不會猜你的真正情緒。",options:expressions},
 {stage:5,type:"choice",field:"reaction",headline:"如果有人這樣對你說，你可能會有什麼感覺？",desc:"換到聽這句話的人那一邊。這只是一種可能。",options:reactions.map(f=>({id:f,label:f,icon:"♡",face:"listen",reply:"謝謝你的想像。每個人感受到的可能不一樣，我們不把這當成唯一答案。"}))},
 {stage:5,type:"choice",field:"perspective",headline:"接著，你想試著看看哪一個角度？",desc:"換位思考不等於同意他人的不當行為。",options:perspectives},
 {stage:5,type:"text",field:"perspectiveNote",headline:"從那個角度，你想到另一種可能嗎？",desc:"不用替任何人找藉口，也可以回答「還不知道」。",placeholder:"例如：他也許怕來不及；也可能只是沒有先問。我還需要了解。"},
 {stage:6,type:"choice",field:"action",headline:"如果下次又遇到類似的事，你想試哪一種做法？",desc:"你有權利設界線、暫停或找大人幫忙。",options:actions},
 {stage:6,type:"text",field:"newWords",headline:"如果再說一次，你想怎麼表達？",desc:"不必一直當好好先生，清楚表達需要、尊重自己與別人就可以。",placeholder:"例如：我很在意自己畫的部分，下次修改前，可以先問我嗎？"},
 {stage:6,type:"text",field:"nextTime",headline:"下次碰到類似的事情，你想提醒自己什麼？",desc:"留下一句以後真的用得上的小提醒。",placeholder:"例如：先確認事實、再說出感受；太生氣就先休息。"},
 {stage:6,type:"range",field:"end",headline:"回頭看看，現在的心情強度是多少？",desc:"感受可以改變，也可以沒有改變。不需要假裝變好。"},
 {stage:6,type:"result",headline:"這是你帶走的小小成長卡。",desc:"這不是成績；是你自己整理出來的一種選擇。"}
];
const esc=t=>String(t??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const current=()=>questions[at];
function available(i){return i!==5||data.strategy==="breathe"}
function stageFirst(s){return questions.findIndex((q,i)=>q.stage===s&&available(i))}
function nextIndex(start,delta){for(let i=start+delta;i>=0&&i<questions.length;i+=delta)if(available(i))return i;return start}
function shownAnswer(q){return answered[at]===true}
function robot(expr,sentence){
 const head=$("mimoHead");
 head.dataset.expression=expr;
 head.setAttribute("aria-label","Mimo 的表情："+({calm:"平靜",listen:"認真傾聽",soft:"溫柔",hurt:"難過",guard:"皺眉",question:"疑惑"}[expr]||"傾聽"));
 $("mimoMessage").textContent=sentence;
 const speech=document.querySelector(".companion-speech");
 if(speech){speech.classList.remove("feedback-animate");void speech.offsetWidth;speech.classList.add("feedback-animate");}
}
function qHtml(q){
 const common='<div class="intro-chip">第 '+(at+1)+' 個小練習 · '+stageTitles[q.stage]+'</div><h1>'+q.headline+'</h1><p class="lead">'+q.desc+'</p>';
 if(q.type==="choice"){
  const c=q.options.map(o=>'<button type="button" data-option="'+esc(o.id)+'" class="guide-option '+(data[q.field]===o.id?"picked":"")+'" aria-pressed="'+(data[q.field]===o.id)+'"><span class="guide-opt-icon">'+esc(o.icon||"●")+'</span><span><strong>'+esc(o.label)+'</strong>'+(o.help?'<small>'+esc(o.help)+'</small>':"")+'</span></button>').join("");
  const extra=q.field==="expression"?'<div class="mirror-stage"><span class="mirror-label">你的話 · 假設情境重現</span><p>'+esc(data.quote||"（如果不記得原話，仍可以探索不同表情。）")+'</p><small>表情由你選擇，不代表 AI 知道當時的情緒。</small></div>':"";
  return common+extra+'<div class="guide-options '+(q.field==="weather"?"guide-weather":"")+'">'+c+"</div>";
 }
 if(q.type==="range"){
  const number=Number(data[q.field]);
  return common+'<div class="guide-range"><div class="range-display"><span>一點點</span><strong id="rangeText">'+number+' / 5</strong><span>非常強烈</span></div><input id="guideRange" type="range" min="1" max="5" value="'+number+'" aria-label="'+esc(q.headline)+'" step="1">'+
   '<div class="guide-range-bubbles">'+[1,2,3,4,5].map(n=>'<span class="'+(n===number?"selected":"")+'">'+n+'</span>').join("")+'</div></div>'+
   '<button id="sendAnswer" type="button" class="send-answer">這就是我的感覺 ✓</button>';
 }
 if(q.type==="text"){
  const sample=at===7?'<button type="button" id="useExample" class="example-btn">✨ 用虛構的美勞課故事試玩</button>':"";
  return common+sample+'<label class="sr-only" for="guideInput">'+esc(q.headline)+'</label>'+
   '<textarea id="guideInput" class="guide-input" maxlength="480" rows="4" placeholder="'+esc(q.placeholder||"可以寫簡單一點，也可以略過。")+'">'+esc(data[q.field])+'</textarea>'+
   '<div class="guide-small-note">公開原型請只用虛構故事，不要輸入真實同學的姓名或個資。</div>'+
   '<button id="sendAnswer" class="send-answer" type="button">告訴 Mimo →</button>';
 }
 if(q.type==="breath")return common+
   '<div class="breath-playground"><div id="breathOrb" class="breath-disk active-pulse" aria-hidden="true"><span>✳</span></div>'+
   '<div id="breathPhase" class="breath-phase" role="status" aria-live="off">吸氣 · 1 / 4</div>'+
   '<p>圓圈變大時吸氣 4 秒，變小時吐氣 4 秒。<br>不要憋氣，也可以隨時休息。</p>'+
   '<div class="breath-controls"><button id="breathToggle" type="button" class="send-answer">暫停動畫</button><button id="breathDone" type="button" class="example-btn">我準備好繼續了</button></div></div>';
 return common+'<section class="guide-growth-card">'+
  '<span class="tag">MY LITTLE GROWTH CARD</span><h2>今天，我更了解自己的心情了 🌱</h2>'+
  '<div class="growth-row"><b>一開始的天氣</b><p>'+esc((weather.find(w=>w.id===data.weather)||{}).icon||"☁️")+' '+esc((weather.find(w=>w.id===data.weather)||{}).label||"還不知道")+' · '+esc(data.feeling||"說不上來")+'</p></div>'+
  '<div class="growth-row"><b>我知道的事</b><p>'+esc(data.fact||"這個部分還沒有寫，也沒關係。")+'</p></div>'+
  '<div class="growth-row"><b>我還不確定</b><p>'+esc(data.unknown||"可以繼續慢慢了解。")+'</p></div>'+
  '<div class="growth-row"><b>我想試的下一步</b><p>'+esc((actions.find(o=>o.id===data.action)||{}).label||"先照顧自己")+'</p></div>'+
  '<div class="growth-row"><b>下次提醒自己</b><p>'+esc(data.nextTime||"先照顧自己，再決定下一步。")+'</p></div>'+
  '<p class="growth-reminder">一開始的強度：'+data.strength+'/5　　現在：'+data.end+'/5。<br>心情沒有變好也沒關係。這張卡不會自動儲存。</p>'+
  '<button id="restartFromCard" type="button" class="send-answer">再練習一個故事 ↺</button></section>';
}
function replyFor(q,value,skip=false){
 if(skip)return {face:"listen",text:"沒關係，你可以先不說。想好了再回來也可以。"};
 if(q.field==="safety")return q.options.find(o=>o.id===value)||{face:"listen",reply:"謝謝你告訴我。"};
 if(q.type==="choice"){
  const o=q.options.find(o=>o.id===value);
  return {face:o?.face||"listen",text:o?.reply||"謝謝你告訴我，我正在聽。"};
 }
 if(q.field==="strength"||q.field==="after"||q.field==="end"){
  const n=Number(value);
  return {face:n>=4?"listen":"soft",text:n>=4?"這個感覺可能很強烈。你不需要急著想清楚，我們慢慢來。":"謝謝你留意自己的感覺，無論有沒有變輕都可以。"};
 }
 if(q.field==="story")return {face:"listen",text:"謝謝你願意說自己的版本。我聽見這件事對你很重要。接下來我們不急著判斷。"};
 if(q.field==="quote")return {face:"question",text:"這是你記得的話。等一下可以從不同角度聽聽看，不代表誰一定有錯。"};
 if(q.field==="fact")return {face:"calm",text:"你正在練習描述可以看見、聽見的事情。這仍是你的敘述，還不是已確認的全部事實。"};
 if(q.field==="guess")return {face:"question",text:"我們常常會猜別人的意思。這是一種想法，但還需要更多資訊才能確認。"};
 if(q.field==="unknown")return {face:"question",text:"願意留下「我還不知道」，是看清楚事情的重要一步。"};
 if(q.field==="perspectiveNote")return {face:"soft",text:"你試著看見另一種可能，同時仍可以保護自己的感受與界線。"};
 if(q.field==="newWords")return {face:"soft",text:"你正在練習用新的方式表達自己。你可以選擇真的要不要說出來。"};
 if(q.field==="nextTime")return {face:"soft",text:"這句提醒是你自己想出的。希望下次能陪你停一下、做選擇。"};
 return {face:"listen",text:"謝謝你願意回答，我們可以慢慢繼續。"};
}
function updateNav(){
 const q=current();
 $("stepCounter").textContent="STEP "+String(q.stage+1).padStart(2,"0")+" / 07";
 $("progressFill").style.width=((at+1)/questions.length*100)+"%";
 $("backBtn").disabled=at===0;
 if(q.type==="result"){$("nextBtn").hidden=true;return;}
 $("nextBtn").hidden=false;
 const has=shownAnswer(q);
 $("nextBtn").disabled=!has;
 if(q.field==="safety"&&data.safety==="unsafe"&&has)$("nextBtn").textContent="先看看可以找誰幫忙";
 else $("nextBtn").textContent=has?"下一題 →":"先回答這一題";
}
function sideNav(){
 const q=current();
 $("path").innerHTML=stageTitles.map((label,s)=>{
  const active=s===q.stage;
  const previous=stageFirst(s)<at;
  const icon=previous&&!active?"✓":s+1;
  return '<button type="button" data-stage="'+s+'" class="path-item '+(active?"active":previous?"done":"")+'" '+(stageFirst(s)>at?"disabled":"")+' aria-current="'+(active?"step":"false")+'"><span class="path-dot">'+icon+'</span><span>'+label+'</span></button>';
 }).join("");
}
function render(resetSpeech=true){
 stopBreathing();
 const q=current();
 $("stepContent").innerHTML=qHtml(q);
 $("mimoSky").dataset.weather=data.weather||"cloudy";
 sideNav();updateNav();
 let intro="我們一次只聊一件事。我會在你回答後再說話。";
 if(q.stage===4)intro="先說一件你觀察到的事。不急著猜誰是故意的。";
 if(q.stage===5)intro="換個位置看看，但不必替傷害你的行為找藉口。";
 if(q.stage===6)intro="這是你的選擇，沒有一定要和好的規定。";
 if(resetSpeech)robot("calm",intro);
 if(shownAnswer(q))showFeedback(false);
 if(q.type==="breath")startBreathing();
 if(q.type==="result")robot("soft","你走到最後了！能認識自己、保護自己，就是很重要的學習。");
}
function showFeedback(updateRobot=true){
 const q=current(),value=data[q.field];
 const v=answered[at]==="skipped" ? replyFor(q,value,true):replyFor(q,value);
 const v2=q.field==="safety"&&data.safety==="unsafe"?{face:"guard",text:"如果有人持續欺負、威脅或傷害你，請先找大人。這個網站不會自動通報。"}:v;
 const face= v2.face || "listen",message=v2.text || v2.reply || "謝謝你告訴我。";
 if(updateRobot)robot(face,message);
 const box=document.createElement("div");
 box.id="answerFeedback";box.className="guide-feedback";box.setAttribute("role","status");
 box.innerHTML='<strong>✳ Mimo 的回應</strong><p>'+esc(message)+'</p>';
 const old=$("answerFeedback");old?.remove?.();
 $("stepContent").appendChild(box);
 updateNav();
}
function selectAnswer(value){
 const q=current();data[q.field]=value;answered[at]=true;
 if(q.field==="safety"&&value==="unsafe")$("nextBtn").textContent="先看看可以找誰幫忙";
 if(q.field==="expression"){
  // Student selects hypothetical expression, then Mimo holds this face through the reply.
 }
 render(false);
 showFeedback();
}
function submitCurrent(skip=false){
 const q=current();
 if(q.type==="breath"){
  answered[at]=true;stopBreathing();robot("soft","謝謝你給自己一點時間。如果還不舒服，也可以先休息。");showFeedback();return;
 }
 if(q.type==="text"){
  const field=$("guideInput");if(field)data[q.field]=field.value.trim().slice(0,480);
  if(!skip&&!data[q.field]){field?.focus();return;}
 }
 if(q.type==="range"){
  data[q.field]=Number($("guideRange")?.value??data[q.field]);
 }
 answered[at]=skip?"skipped":true;
 showFeedback();
}
function advance(){
 if(!shownAnswer(current()))return;
 if(at===0&&data.safety==="unsafe"){showHelp();return;}
 if(at===questions.length-1){restart();return;}
 at=nextIndex(at,1);render();
 window.scrollTo?.({top:0,behavior:"instant"});
}
function rewind(){
 if(at===0)return;
 at=nextIndex(at,-1);
 render();
}
function restart(){
 if(window.confirm?.("要重新開始嗎？這一頁的所有回答都會消失。")===false)return;
 stopBreathing();data=defaultData();answered={};at=0;render();
}
function showHelp(){$("helpDialog").showModal?.()}
function stopBreathing(){if(breathTimer!==null)clearInterval(breathTimer);breathTimer=null;breathActive=false;}
function startBreathing(force=false){
 const orb=$("breathOrb");if(!orb)return;
 const reduce=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
 // Respect accessibility settings until the child explicitly chooses to play motion.
 if(reduce&&!force){
  breathActive=false;orb.classList.remove("active-pulse");
  $("breathPhase").textContent="已尊重裝置的減少動態設定。按「開始動畫」可自行播放。";
  $("breathToggle").textContent="開始動畫";
  return;
 }
 breathActive=true;breathStart=Date.now();
 orb.classList.add("active-pulse");
 $("breathToggle").textContent="暫停動畫";
 function tick(){
  if(!breathActive)return;
  const elapsed=(Date.now()-breathStart)%8000;
  const inhale=elapsed<4000,part=Math.floor(elapsed/1000)%4+1;
  const phase=$("breathPhase");if(phase)phase.textContent=(inhale?"慢慢吸氣":"慢慢吐氣")+" · "+part+" / 4";
 }
 tick();
 breathTimer=setInterval(tick,200);
}
function toggleBreathing(){
 const orb=$("breathOrb");if(!orb)return;
 if(breathActive){
  stopBreathing();orb.classList.remove("active-pulse");
  $("breathPhase").textContent="已暫停。可以先休息一下。";
  $("breathToggle").textContent="繼續動畫";
 }else startBreathing(true);
}
const example={story:"美勞課分組時，小庭把我畫的海報改掉了。我非常生氣，覺得自己的努力沒有被尊重。",quote:"你很煩耶！為什麼亂動我的東西？",fact:"小庭在沒有先問我的情況下修改了海報。我提高音量說了一句話。",guess:"她一定故意不尊重我的努力。",unknown:"小庭為什麼修改？她是不是以為我們已經同意一起修改？",perspectiveNote:"她可能怕時間不夠，也可能真的沒先尊重我。現在還不能確定。",newWords:"我很在意自己畫的部分，下次修改之前可以先問我嗎？",nextTime:"先停一下，說出我看到的事和感受；需要時請老師幫忙。"};
function applyExample(){
 // Only used for fictional demo; leave the child's selected mood untouched.
 Object.assign(data,example);
 for(const [i,q]of questions.entries()){if(Object.hasOwn(example,q.field))delete answered[i];}
 $("guideInput").value=data.story;
 robot("soft","這是虛構的美勞課故事，適合測試這個練習。我們可以從這裡開始。");
}
$("helpBtn").onclick=showHelp;
$("helpClose").onclick=()=>$("helpDialog").close?.();
$("restart").onclick=restart;
$("backBtn").onclick=rewind;
$("nextBtn").onclick=advance;
$("path").addEventListener("click",e=>{
 const b=e.target.closest("[data-stage]");if(!b)return;
 const p=stageFirst(Number(b.dataset.stage));if(p<0||p>at)return;
 at=p;render();
});
$("stepContent").addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.option){selectAnswer(b.dataset.option);return;}
 if(b.id==="sendAnswer"){submitCurrent();return;}
 if(b.id==="skipQuestion"){submitCurrent(true);return;}
 if(b.id==="useExample"){applyExample();return;}
 if(b.id==="breathToggle"){toggleBreathing();return;}
 if(b.id==="breathDone"){submitCurrent();return;}
 if(b.id==="restartFromCard"){restart();return;}
 if(b.dataset.help){showHelp();return;}
});
$("stepContent").addEventListener("input",e=>{
 const q=current();
 if(q.type==="text"&&e.target.id==="guideInput"){
  data[q.field]=e.target.value.slice(0,480);
  if(shownAnswer(q)){delete answered[at];$("answerFeedback")?.remove?.();updateNav();}
 }
 if(q.type==="range"&&e.target.id==="guideRange"){
  data[q.field]=Number(e.target.value);
  $("rangeText").textContent=data[q.field]+" / 5";
  document.querySelectorAll(".guide-range-bubbles span").forEach((el,i)=>el.classList.toggle("selected",i+1===data[q.field]));
  if(shownAnswer(q)){delete answered[at];$("answerFeedback")?.remove?.();updateNav();}
 }
});
render();
})();