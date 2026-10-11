/* Mimo 心晴之鏡 · SEL conflict-reflection prototype
   Important: This is a deterministic, local, child-safety-focused DEMO.
   It uses NO LLM, NO API, NO localStorage, NO analytics.
   Fictional situations only; do not upload or type identifying details. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const stages=[
 ["安全小提醒","先看看，這件事需不需要大人幫忙"],
 ["心情天氣","我現在，心裡是什麼天氣？"],
 ["給自己一點空間","我可以先照顧自己的感覺"],
 ["我的故事","先說說我看到的那一面"],
 ["事實放大鏡","把發生的事和心裡的猜測分開"],
 ["換位小鏡子","聽一聽自己說過的話"],
 ["帶走一個小方法","下次遇到相似的事，我可以怎麼做"]
];
const weathers=[
 {id:"sunny",icon:"☀️",name:"晴天",hint:"開心、輕鬆"},
 {id:"cloudy",icon:"☁️",name:"多雲",hint:"悶悶的、煩"},
 {id:"rainy",icon:"🌧️",name:"雨天",hint:"難過、想哭"},
 {id:"stormy",icon:"⛈️",name:"雷雨",hint:"生氣、委屈"},
 {id:"windy",icon:"🌬️",name:"大風",hint:"緊張、擔心"},
 {id:"foggy",icon:"🌫️",name:"起霧",hint:"亂亂的、不確定"}
];
const emotions=["生氣","委屈","難過","失望","害怕","緊張","尷尬","孤單","困惑","不確定"];
const expressions=[
 {id:"guard",icon:"😠",name:"有點生氣",desc:"也許眉頭皺起來"},
 {id:"hurt",icon:"😢",name:"有點難過",desc:"也許低下頭"},
 {id:"question",icon:"😕",name:"不太明白",desc:"也許停一下"},
 {id:"calm",icon:"😐",name:"平靜但認真",desc:"也許語氣平穩"}
];
const feelReplies=["有點受傷","覺得被誤會","感到不公平","想要被聽見","可能沒什麼感覺","不確定"];
const planOptions=[
 {id:"explain",icon:"💬",name:"清楚說出我的感受",hint:"描述發生的事與自己的需要"},
 {id:"boundary",icon:"🛡️",name:"有禮貌地說不",hint:"拒絕不合理的要求"},
 {id:"pause",icon:"🌿",name:"先離開、冷靜一下",hint:"等準備好再談"},
 {id:"repair",icon:"🤝",name:"修復我造成的傷害",hint:"為特定行為負責，而不是否定自己"},
 {id:"adult",icon:"🙋",name:"請大人一起幫忙",hint:"遇到困難、害怕或不安全時很重要"}
];
const state={
 step:0,safety:null,weather:"cloudy",intensity:3,emotion:"委屈",emotions:["委屈"],ground:"listen",beforeIntensity:3,
 subjective:"",whatSaid:"",fact:"",guess:"",unknown:"",otherMay:"",seenFrom:"me",
 mirrorExpr:"guard",mirrorFeeling:null,mirrorReflection:"",plan:"explain",request:"",nextTime:"",afterIntensity:3,fictional:false
};
const demo={
 subjective:"美勞課分組時，小庭把我的畫改掉，沒有先問我。我覺得她根本不尊重我，氣得大叫。",
 whatSaid:"你很煩耶！為什麼每次都亂動我的東西？",
 fact:"小庭在沒有先問我的情況下，修改了我畫的海報。我當時提高音量說了一句話。",
 guess:"她一定故意不尊重我。",
 unknown:"小庭為什麼修改？她是不是以為我已經同意？",
 otherMay:"小庭也許是想趕快做完，或以為大家可以一起修改。但只有問她才知道。",
 request:"我剛剛有點生氣，因為我很在意自己畫的部分。下次修改前，可以先問我嗎？",
 nextTime:"先告訴對方我在意什麼，聽聽她的原因，再討論要怎麼分工。"
};
const safeText=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const val=s=>safeText(s).replace(/\n/g," ");
const btn=(name,key,selected,icon,hint="")=>'<button type="button" class="choice-card'+(selected===key?" chosen":"")+'" data-select="'+key+'" data-field="'+name+'" aria-pressed="'+(selected===key)+'"><span class="choice-icon">'+icon+'</span><span><strong>'+safeText(key)+"</strong>"+(hint?"<small>"+safeText(hint)+"</small>":"")+"</span></button>";
function header(title,desc,kicker="心晴練習"){return '<div class="intro-chip">'+safeText(kicker)+'</div><h1>'+title+'</h1><p class="lead">'+desc+'</p>'}
function setMimo(expr,text){
 $("mimoHead").dataset.expression=expr;
 $("mimoHead").setAttribute("aria-label","Mimo 表情："+({calm:"平靜",listen:"專心傾聽",soft:"溫柔微笑",hurt:"難過",guard:"皺眉",question:"困惑"}[expr]||"平靜"));
 $("mimoMessage").textContent=text;
}
function sidebar(){
 $("path").innerHTML=stages.map((t,i)=>{
 const cls=(i===state.step?"active":i<state.step?"done":"");
 return '<button type="button" class="path-item '+cls+'" '+(i>state.step?"disabled":"")+' data-jump="'+i+'" aria-current="'+(i===state.step?"step":"false")+'"><span class="path-dot">'+(i<state.step?"✓":(i+1))+'</span><span>'+t[0]+'</span></button>';
 }).join("");
 $("stepCounter").textContent="STEP "+String(state.step+1).padStart(2,"0")+" / 07";
 $("progressFill").style.width=((state.step+1)/7*100)+"%";
 $("backBtn").disabled=state.step===0;
 $("nextBtn").textContent=state.step===6?"重新體驗 ↺":"下一步 →";
}
function render0(){
 setMimo("listen","如果有誰讓你害怕或受傷，找大人幫忙，比做完練習更重要。");
 return header("先確認，你現在安全嗎？","你可以只選一個接近的答案。不需要把自己的秘密告訴這個網站。","FIRST, STAY SAFE")+
 '<div class="choice-grid">'+[
 ['normal',"一般的爭執","例如意見不同、誤會或吵架","🌿"],
 ['unsure',"我不太確定","心裡有點怕，還不知道怎麼辦","☁️"],
 ['unsafe',"有人受傷或持續欺負我","例如威脅、排擠、毆打或讓人害怕","🛟"]
 ].map(x=>'<button type="button" class="choice-card'+(state.safety===x[0]?" chosen":"")+'" data-safety="'+x[0]+'" aria-pressed="'+(state.safety===x[0])+'"><span class="choice-icon">'+x[3]+'</span><span><strong>'+x[1]+'</strong><small>'+x[2]+'</small></span></button>').join("")+'</div>'+
 (state.safety==="unsafe"?'<div class="notice alert"><strong>這件事不能只靠自己換位思考解決。</strong> 請先找能保護你的大人；你不需要替持續傷害你的人找理由。這個原型不會自動通知老師。<p><button type="button" class="secondary-action" data-help="1">看看可以找誰幫忙 →</button></p></div>':
 state.safety==="unsure"?'<div class="notice warm">不確定也沒關係。如果有持續被欺負、害怕或受傷，請先找大人協助。你可以先用虛構故事練習。</div>':
 '<div class="notice">每個人的感受都值得被尊重。生氣沒有錯，重要的是認識感受、保護自己並學習更好的表達。</div>')+
 '<p class="micro">建議先使用虛構例子操作；本系統不是輔導老師，也不會監看或求救通報。</p>';
}
function render1(){
 setMimo("listen","你的心情沒有標準答案。如果同時有幾種感覺也很正常。");
 const active=weathers.find(w=>w.id===state.weather)||weathers[1];
 return header("你的心裡，現在是什麼天氣？","每種天氣都會經過。這不是成績，只是讓我們更容易把感覺說出來。","NOTICE · 情緒覺察")+
 '<div class="weather-grid">'+weathers.map(w=>'<button type="button" class="weather" data-weather="'+w.id+'" aria-pressed="'+(state.weather===w.id)+'"><span>'+w.icon+'</span><b>'+w.name+'</b><small>'+w.hint+'</small></button>').join("")+'</div>'+
 '<div class="slider-line"><b>這個感覺有多強烈？</b><span class="intensity-bubble" id="intensityValue">'+state.intensity+' / 5</span></div>'+
 '<input id="intensity" type="range" class="intensity" min="1" max="5" step="1" value="'+state.intensity+'" aria-label="情緒強度"><div class="minmax"><span>一點點</span><span>非常強烈</span></div>'+
 '<label class="input-label">你想把它叫做什麼感覺？（可以同時選 1–3 種）</label>'+ 
 '<div class="emotion-pills">'+emotions.map(e=>'<button type="button" data-emotion="'+e+'" class="pill'+(state.emotions.includes(e)?" chosen":"")+'" aria-pressed="'+(state.emotions.includes(e))+'">'+e+'</button>').join("")+'</div>'+
 '<div class="notice">你的天氣：<strong>'+active.icon+' '+active.name+'</strong>。心情不是身分標籤，天氣會變，你也不必一定讓自己立刻變晴天。</div>';
}
function render2(){
 const weather=weathers.find(w=>w.id===state.weather)||weathers[1];
 setMimo("soft","你可以先照顧自己，等準備好了再繼續。");
 return header("先留一點空間給自己。","感覺很強烈時，不急著分析誰對誰錯。你可以選一種舒服、安全的方法。","PAUSE · 情緒調節")+
 '<div class="choice-grid">'+[
 ["listen","有人好好聽我說","我想先被理解","👂"],
 ["breathe","慢慢呼吸","讓肩膀放鬆、吐一口氣","🍃"],
 ["space","先休息一下","喝水、坐好、找舒服的位置","🪑"],
 ["adult","想找大人說","有時候，一個人真的很難處理","🙋"]
 ].map(x=>'<button type="button" class="choice-card'+(state.ground===x[0]?" chosen":"")+'" data-ground="'+x[0]+'" aria-pressed="'+(state.ground===x[0])+'"><span class="choice-icon">'+x[3]+'</span><span><strong>'+x[1]+'</strong><small>'+x[2]+'</small></span></button>').join("")+'</div>'+
 (state.ground==="breathe"?'<div class="grounding"><div class="breath-orb" aria-hidden="true"></div><div class="breath-caption">跟著圓圈，慢慢吸氣、慢慢吐氣。<br>如果這樣做不舒服，隨時停止。</div></div>':
 state.ground==="space"?'<div class="notice">你可以喝幾口水、把腳輕放在地上，看看周圍三樣東西。先讓身體知道現在在哪裡。</div>':
 state.ground==="adult"?'<div class="notice warm">找老師或家人說「我現在有點難受，可以聽我說一下嗎？」是一種很有力量的方法。<p><button type="button" class="secondary-action" data-help="1">看看求助方式</button></p></div>':
 '<div class="notice">我聽見了。你可以先有自己的感受，不用急著證明自己對，也不用急著替別人找藉口。</div>')+
 '<div class="slider-line"><b>現在的感覺強度呢？</b><span class="intensity-bubble" id="afterGroundValue">'+state.afterIntensity+' / 5</span></div>'+
 '<input id="afterGround" class="intensity" type="range" min="1" max="5" value="'+state.afterIntensity+'" aria-label="練習調節後的情緒強度">'+
 '<p class="form-hint">沒有降低也沒關係，不需要假裝心情變好了。若感覺仍很強烈，可以先停在這一頁。</p>';
}
function render3(){
 setMimo("listen","先講你的版本就好。我不會急著說你有錯，也不會認定另一個人有錯。");
 return header("這件事，從你的眼睛看起來怎麼樣？","先自由說，再慢慢整理。我們只需要虛構範例就能體驗，不需要輸入真實同學姓名。","EXPRESS · 主觀敘事")+
 '<div class="notice warm"><strong>為了保護自己：</strong>這個公開原型請用虛構事件測試，不要輸入真實姓名、班級、學校或可以辨認他人的細節。</div>'+
 '<button class="secondary-action" type="button" data-demo="1">✨ 使用美勞課的虛構故事示範</button>'+
 '<label class="input-label" for="subjective">先讓你的心情說話：你覺得發生了什麼？</label>'+
 '<textarea id="subjective" class="big-input" maxlength="650" placeholder="例如：我畫好的東西被同學改掉，我真的很生氣！">'+safeText(state.subjective)+'</textarea>'+
 '<p class="form-hint">可以說委屈、生氣，也可以說不知道。你的感受值得被聽見。</p>'+
 '<label class="input-label" for="whatSaid">如果記得，你當時說了哪一句話？</label>'+
 '<textarea id="whatSaid" class="big-input" maxlength="180" placeholder="例如：你很煩耶！為什麼亂動我的東西？">'+safeText(state.whatSaid)+'</textarea>'+
 '<p class="form-hint">忘記了就留白，不必編造。這句話只有你自己選擇，才會進入後面的模擬鏡子。</p>';
}
function render4(){
 setMimo("question","我會陪你分清楚『真的看到了什麼』，和『我們猜測了什麼』。兩種都可以理解，但不一樣。");
 return header("如果有一臺攝影機，它拍得到什麼？","我們常把「我看到的」和「我覺得他故意的」混在一起。現在把它們分開，就能看到更多可能。","CLARIFY · 事實與推測")+
 '<div class="visual-guide"><div><span class="tag">攝影機拍得到</span><h4>可以觀察的事實</h4><p>「同學拿起我的筆，沒有先問我。」</p></div><div><span class="tag unknown">腦中可能的猜測</span><h4>還沒確認的解釋</h4><p>「他一定是故意惹我生氣。」</p></div></div>'+
 '<label class="input-label" for="fact">你看見、聽見了什麼？</label><textarea class="big-input" id="fact" maxlength="400" placeholder="例如：她修改了海報，我說話變大聲。">'+safeText(state.fact)+'</textarea>'+
 '<label class="input-label" for="guess">你當時心裡怎麼想？</label><textarea class="big-input" id="guess" maxlength="400" placeholder="例如：她根本不尊重我的努力。">'+safeText(state.guess)+'</textarea>'+
 '<label class="input-label" for="unknown">還有什麼，是現在不知道的？</label><textarea class="big-input" id="unknown" maxlength="400" placeholder="例如：她為什麼改？以前是否有討論過？">'+safeText(state.unknown)+'</textarea>'+
 '<div class="notice info">溫柔提醒：<strong>把猜測換成可能性，不代表否定你的委屈。</strong> 系統不能只聽一邊的說法就知道真相，也不會替事件判定責任。</div>';
}
function render5(){
 const quoted=state.whatSaid.trim();const d=expressions.find(x=>x.id===state.mirrorExpr)||expressions[0];
 const inner=quoted?"「"+val(quoted)+"」":"（你還沒有輸入當時說過的話，可以先返回上一頁或用虛構故事體驗。）";
 if(state.safety==="unsafe"){
 setMimo("listen","如果有人正在傷害你，你不需要先原諒或理解他，才有資格求助。");
 return header("有些事情，不需要勉強換位思考。","如果這是持續欺負、威脅或讓你不安全的情況，我們先把保護自己放在第一位。","SAFETY · 保護自己的界線")+
 '<div class="notice alert">你不需要扮演傷害你的人，也不需要替他的行為找理由。你可以選擇先找可信任的大人。</div>'+
 '<button class="main-action" type="button" data-help="1">看看可以找誰幫忙</button>';
 }
 setMimo(state.mirrorExpr,"這是你選擇的可能表情，不是我真的知道你當時的情緒。");
 return header("現在，讓 Mimo 當一面小鏡子。","試著看見你說出的話，再換成「聽到這句話的人」的角度。這只是演練，不是還原現場。","MIRROR · 換位反思")+
 '<div class="mirror"><span class="tag">當時的我 · 虛構重演</span><div class="mirror-quote">'+inner+'</div><div class="mirror-explain">Mimo 會顯示你自己選擇的「可能表情」，不是 AI 偵測或推斷出的真實情緒。</div></div>'+
 '<div class="check-question">你覺得自己當時的表情或語氣，可能接近哪一種？</div>'+
 '<div class="mirror-traits">'+expressions.map(x=>'<button type="button" data-expression="'+x.id+'" class="'+(state.mirrorExpr===x.id?"active":"")+'" aria-pressed="'+(state.mirrorExpr===x.id)+'">'+x.icon+' '+x.name+'</button>').join("")+'</div>'+
 '<hr class="section-divide"><div class="check-question">換個位置想：如果有人用這句話、這種表情對你說，你可能感覺怎麼樣？</div>'+
 '<div class="reflection-choices">'+feelReplies.map(x=>'<button type="button" data-reflectfeel="'+x+'" class="'+(state.mirrorFeeling===x?"active":"")+'" aria-pressed="'+(state.mirrorFeeling===x)+'">'+x+'</button>').join("")+'</div>'+
 '<label class="input-label" for="mirrorReflection">除了這些選項，你還想到什麼？</label>'+
 '<textarea id="mirrorReflection" class="big-input" maxlength="400" placeholder="例如：如果我是他，可能會覺得自己被罵；但也可能不知道發生什麼事。">'+safeText(state.mirrorReflection)+'</textarea>'+
 '<hr class="section-divide"><div class="check-question">讓故事不只剩下「我的版本」</div>'+
 '<div class="reflection-choices">'+[
 ["me","我這邊"],["them","對方可能"],["observer","在旁邊的人"]
 ].map(x=>'<button data-view="'+x[0]+'" type="button" class="'+(state.seenFrom===x[0]?"active":"")+'" aria-pressed="'+(state.seenFrom===x[0])+'">'+x[1]+'</button>').join("")+'</div>'+
 '<div class="turn-card" id="perspectiveText">'+perspectiveHTML()+'</div>'+
 '<label class="input-label" for="otherMay">對方可能有什麼不同的想法？（只是可能，不是事實）</label>'+
 '<textarea id="otherMay" class="big-input" maxlength="400" placeholder="例如：她也許只是想快點做完海報，或以為我同意。">'+safeText(state.otherMay)+'</textarea>'+
 '<div class="notice info">沒有誰能靠一句話或一個表情讀心。如果可能，理解別人的最佳方法仍是安全地詢問；如果有威脅或霸凌，不必勉強與對方對話。</div>';
}
function perspectiveHTML(){
 if(state.seenFrom==="them")return "<strong>對方可能看到的是……</strong><p>也許對方聽見了很大的聲音，感覺被責怪；也可能只是覺得困惑。這些是假設，不能當作對方真正的感受。</p>";
 if(state.seenFrom==="observer")return "<strong>路過的同學可能看到的是……</strong><p>兩個同學在爭執，卻不一定知道爭吵前發生了什麼。旁觀者可能只看到片段。</p>";
 return "<strong>從你的角度看……</strong><p>你有自己的感受，也可能有想保護的東西。理解他人，不代表要否定自己的需要。</p>";
}
function render6(){
 setMimo("soft","你已經願意換個角度看事情了。下次可以慢慢試，不需要一次就做得完美。");
 const s=weathers.find(w=>w.id===state.weather)||weathers[1];const plan=planOptions.find(x=>x.id===state.plan)||planOptions[0];
 return header("下一次，我想怎麼照顧自己和別人？","理解一件事，不代表一定要和好。你可以選擇溝通、設界線、先休息，或尋求大人協助。","TAKE AWAY · 學習遷移")+
 '<div class="choice-grid">'+planOptions.map(x=>'<button type="button" class="choice-card'+(state.plan===x.id?" chosen":"")+'" data-plan="'+x.id+'" aria-pressed="'+(state.plan===x.id)+'"><span class="choice-icon">'+x.icon+'</span><span><strong>'+x.name+'</strong><small>'+x.hint+'</small></span></button>').join("")+'</div>'+
 '<label class="input-label" for="request">試著寫一句新的說法（可以先想，不必現在就說）</label>'+
 '<textarea id="request" class="big-input" maxlength="420" placeholder="例如：當你沒問我就修改作品，我會生氣，因為我很在意我的畫。我希望你下次先問我。">'+safeText(state.request)+'</textarea>'+
 '<label class="input-label" for="nextTime">如果下一次又發生類似的事，我想提醒自己……</label>'+
 '<textarea id="nextTime" class="big-input" maxlength="300" placeholder="例如：先確認發生什麼事，感覺太激動就先休息，必要時找老師。">'+safeText(state.nextTime)+'</textarea>'+
 '<div class="slider-line"><b>回頭看看，現在的心情強度呢？</b><span class="intensity-bubble" id="finalIntensityValue">'+state.afterIntensity+' / 5</span></div>'+
 '<input class="intensity" id="finalIntensity" type="range" min="1" max="5" value="'+state.afterIntensity+'" aria-label="最後的情緒強度"><div class="minmax"><span>一點點</span><span>非常強烈</span></div>'+
 '<section class="card-result"><span class="tag">MY LITTLE GROWTH CARD · 不會自動儲存</span><h2>我的心情成長卡 ✨</h2>'+
 '<div class="summary-item"><b>我的心情天氣</b><p>'+s.icon+' '+s.name+' · '+safeText(state.emotion)+' · 一開始 '+state.intensity+'/5，現在 '+state.afterIntensity+'/5</p></div>'+
 '<div class="summary-item"><b>我看見的事實</b><p>'+safeText(state.fact.trim()||"我還沒有寫；沒關係，這是可以慢慢練習的能力。")+'</p></div>'+
 '<div class="summary-item"><b>我當時的一種猜測</b><p>'+safeText(state.guess.trim()||"我還不確定。")+'</p></div>'+
 '<div class="summary-item"><b>我可以嘗試的方向</b><p>'+plan.icon+' '+plan.name+'</p></div>'+
 '<div class="summary-item"><b>下一次提醒自己</b><p id="cardNextTime">'+safeText(state.nextTime.trim()||"先照顧情緒，再決定怎麼回應。")+'</p></div>'+
 '<p class="micro">沒有分數，也不需要讓每個人都滿意。這張卡只存在於這個瀏覽器頁面，重新整理就會消失。</p></section>'+
 '<div class="notice">🌱 你不必每次都說對話，但可以慢慢學會看見更多角度。若這件事仍令你不舒服，找大人談談也很重要。</div>';
}
const views=[render0,render1,render2,render3,render4,render5,render6];
function render(){
 $("stepContent").innerHTML=views[state.step]();
 $("mimoSky").dataset.weather=state.weather;
 sidebar();
 $("nextBtn").disabled=state.step===0&&!state.safety;
 if(state.step===0&&state.safety==="unsafe")$("nextBtn").textContent="先找大人幫忙";
 window.scrollTo?.({top:0,behavior:"instant"});
}
function next(){
 if(state.step===0){
  if(!state.safety)return;
  if(state.safety==="unsafe"){showHelp();return;}
 }
 if(state.step===6){reset();return;}
 if(state.step===1)state.afterIntensity=state.intensity;
 state.step=Math.min(6,state.step+1);
 render();
}
function previous(){if(state.step<=0)return;state.step--;render()}
function reset(){
 const ok=window.confirm?.("重新開始後，頁面中的文字會清除，而且無法恢復。確定要重新開始嗎？");
 if(ok===false)return;
 const original={step:0,safety:null,weather:"cloudy",intensity:3,emotion:"委屈",emotions:["委屈"],ground:"listen",beforeIntensity:3,subjective:"",whatSaid:"",fact:"",guess:"",unknown:"",otherMay:"",seenFrom:"me",mirrorExpr:"guard",mirrorFeeling:null,mirrorReflection:"",plan:"explain",request:"",nextTime:"",afterIntensity:3,fictional:false};
 Object.assign(state,original);render();
}
function showHelp(){const dlg=$("helpDialog");dlg.showModal?.()}
$("helpBtn").onclick=showHelp;
$("helpClose").onclick=()=>{$("helpDialog").close?.()};
$("restart").onclick=reset;
$("backBtn").onclick=previous;
$("nextBtn").onclick=next;
$("path").addEventListener("click",e=>{
 const jump=e.target.closest("[data-jump]");if(!jump)return;
 const i=Number(jump.dataset.jump);
 if(i>=0&&i<=state.step){state.step=i;render()}
});
$("stepContent").addEventListener("click",e=>{
 const b=e.target.closest("button");
 if(!b)return;
 if(b.dataset.help){showHelp();return}
 if(b.dataset.demo){
 Object.assign(state,demo,{fictional:true});render();return;
 }
 if(b.dataset.safety){state.safety=b.dataset.safety;render();return}
 if(b.dataset.weather){state.weather=b.dataset.weather;render();return}
 if(b.dataset.emotion){const e=b.dataset.emotion;let a=state.emotions.includes(e)?state.emotions.filter(x=>x!==e):[...state.emotions,e];if(a.length>3)a=a.slice(1);if(!a.length)a=[e];state.emotions=a;state.emotion=a[0];render();return}
 if(b.dataset.ground){state.ground=b.dataset.ground;render();return}
 if(b.dataset.expression){
   // User chooses a hypothetical expression; do not infer emotion from text.
   state.mirrorExpr=b.dataset.expression;render();return;
 }
 if(b.dataset.reflectfeel){state.mirrorFeeling=b.dataset.reflectfeel;render();return}
 if(b.dataset.view){state.seenFrom=b.dataset.view;render();return}
 if(b.dataset.plan){state.plan=b.dataset.plan;render();return}
});
$("stepContent").addEventListener("input",e=>{
 const id=e.target.id;
 const fields=["subjective","whatSaid","fact","guess","unknown","otherMay","mirrorReflection","request","nextTime"];
 if(fields.includes(id)){state[id]=e.target.value;if(id==="nextTime"&&$("cardNextTime"))$("cardNextTime").textContent=state.nextTime.trim()||"先照顧情緒，再決定怎麼回應。";}
 if(id==="intensity"){
  state.intensity=Number(e.target.value);$("intensityValue").textContent=state.intensity+" / 5";
 }
 if(id==="afterGround"||id==="finalIntensity"){
  state.afterIntensity=Number(e.target.value);
  const elm=$(id==="afterGround"?"afterGroundValue":"finalIntensityValue");
  if(elm)elm.textContent=state.afterIntensity+" / 5";
  if(id==="finalIntensity"&&state.step===6){
    // Update summary strength without stealing focus from the slider.
    const p=document.querySelector(".card-result .summary-item p");
    if(p){const w=weathers.find(x=>x.id===state.weather);p.textContent=(w?.icon||"☁️")+" "+(w?.name||"多雲")+" · "+state.emotions.join('、')+" · 一開始 "+state.intensity+"/5，現在 "+state.afterIntensity+"/5";}
  }
 }
});
render();
})();