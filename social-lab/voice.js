/* Mimo Voice Lab — short opt-in tablet audio and manual reflection. No localStorage. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const v = {rec:null, stream:null, blob:null, mime:"", clock:null, started:0, emotion:"UNKNOWN", fromModel:false};
const tones={
 HAPPY:"模型猜測聲音可能較輕快。",
 SAD:"模型猜測聲音可能有低落的線索。",
 ANGRY:"模型猜測聲音可能較激動或急促。",
 NEUTRAL:"模型沒有辨識到明顯情緒類別。",
 FEARFUL:"模型猜測聲音可能有緊張的線索。",
 SURPRISED:"模型猜測聲音可能有驚訝的線索。",
 DISGUSTED:"模型猜測聲音可能有不舒服的線索。",
 UNKNOWN:"聲音線索不足。這很正常。"
};
const replies={
 team:["我很努力啊……你可以說清楚你擔心什麼嗎？","好啊！我們可以分工做完。","你是想叫我畫快一點嗎？"],
 joke:["我的作業本濕掉了，我很在意……","謝謝你！可以幫我拿衛生紙嗎？","你剛剛是在開玩笑嗎？"],
 boundary:["我拿你的東西之前應該先問。","好，下次我會先問你。","你想我現在還你嗎？"],
 ball:["我也只是想一起玩……","我可以等下一回合再加入！","你們怎麼分隊呢？"],
 clean:["我剛剛一直在擦窗臺呢。","好，我們一起倒垃圾。","我們先看看剩下什麼？"],
 lunch:["我只是問一下啦……","好吧，我去隊伍後面。","可以告訴我為什麼嗎？"]
};
const markup = [
'<dialog id="voiceDialog" class="mimo-voice-dialog" aria-labelledby="voiceHeading">',
'<div class="voice-top"><div><small>MIMO · 一句話練習</small><h2 id="voiceHeading">換你開口說！</h2>',
'<p>可以用聲音，也可以打字。說不好也沒關係。</p></div>',
'<button class="voice-close" id="voiceClose" type="button" aria-label="關閉">×</button></div>',
'<div class="voice-scene"><b id="voiceSceneTitle"></b><span id="voiceOpening"></span></div>',
'<div class="voice-advice">🔒 只有按下麥克風才會錄音，錄完仍要自行按「送出辨識」才會上傳。沒有雲端服務，也能打字練習。</div>',
'<div class="voice-rec"><button id="voiceRec" type="button" class="voice-recbtn" aria-label="開始錄音">🎙</button>',
'<div><b id="voiceRecText">按一下，試著說一句話</b><small>最多 12 秒；按第二次結束。</small><span id="voiceSeconds" hidden>00:00</span></div></div>',
'<div class="voice-buttons"><button id="voiceSend" disabled type="button" class="voice-primary">送出語音辨識</button><button id="voiceClear" type="button">清除錄音</button></div>',
'<details class="voice-settings" id="voiceSettings"><summary>老師設定｜連接語音模型</summary>',
'<label>Cloudflare Worker HTTPS 網址<input id="voiceApi" type="url" placeholder="https://….workers.dev" autocomplete="off" spellcheck="false"></label>',
'<label>課堂測試碼<input id="voiceCode" type="password" placeholder="由老師提供" autocomplete="off"></label>',
'<button type="button" id="voiceHealth">檢查語音服務</button><small id="voiceHealthText"></small>',
'<p>目前是研究試作。測試碼不是正式學生帳號或身分驗證，不能直接用於校園正式蒐集。</p></details>',
'<label class="voice-label" for="voiceWords">你想說的話（辨識後可修改）</label>',
'<textarea id="voiceWords" maxlength="220" placeholder="例如：我也很著急，我們可以一起想辦法嗎？"></textarea>',
'<div id="voiceClue" class="voice-clue" hidden></div>',
'<div id="voiceStatus" class="voice-status" role="status" aria-live="polite">直接打字就能練習；錄音辨識要等老師部署雲端模型。</div>',
'<div class="voice-buttons"><button id="voiceSimulate" type="button" class="voice-primary">看看同學可能怎麼回答 →</button>',
'<button id="voiceBack" type="button">先回故事</button></div>',
'<p class="voice-foot">這裡不能讀心，聲音模型也無法判斷誰是好學生或壞學生。角色反應只是劇情的不同可能。</p></dialog>'
].join('');
document.body.insertAdjacentHTML("beforeend",markup);
const dialog=$("voiceDialog");
const status=(s,bad=false)=>{$("voiceStatus").textContent=s;$("voiceStatus").style.color=bad?"#b14d54":"#527b67"};
function stopMedia() {
 const rec=v.rec;
 if(rec?.state==="recording"){try{rec.stop()}catch(_){}}
 if(v.stream){v.stream.getTracks().forEach(t=>t.stop());v.stream=null}
 clearInterval(v.clock);v.clock=null;
 $("voiceRec").classList.remove("active");$("voiceRec").textContent="🎙";
 $("voiceRec").setAttribute("aria-label","開始錄音");$("voiceSeconds").hidden=true;
}
function clearAudio() {stopMedia();v.blob=null;v.mime="";$("voiceSend").disabled=true;$("voiceRecText").textContent="按一下，試著說一句話";}
function close(){clearAudio();if(dialog.open)dialog.close();}
function open(){
 clearAudio();v.emotion="UNKNOWN";v.fromModel=false;
 const d=window.mimoVoiceScene?.()||{name:"同學",title:"校園小劇場",opening:"你會怎麼說？",id:"team"};
 $("voiceSceneTitle").textContent=d.title;
 $("voiceOpening").textContent=d.name+"說：「"+d.opening+"」";
 $("voiceWords").value="";$("voiceClue").hidden=true;
 status("你可以直接打字；模型還沒部署時，不會真的把語音轉成文字。");
 if(typeof dialog.showModal==="function")dialog.showModal();
 else status("瀏覽器尚不支援這個視窗，請更新 Chrome 或 Safari。",true);
}
async function startRecord(){
 if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){
  status("無法在這個瀏覽器錄音，可以用文字練習。",true);return;
 }
 clearAudio();v.fromModel=false;$("voiceClue").hidden=true;
 try {
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
  v.stream=stream;
  if(!dialog.open){clearAudio();return}
  const type=["audio/webm;codecs=opus","audio/mp4","audio/webm","audio/ogg"].find(x=>MediaRecorder.isTypeSupported(x));
  const rec=new MediaRecorder(stream,type?{mimeType:type}:{});
  v.rec=rec;const chunks=[];
  rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
  rec.onstop=()=>{
   if(v.rec!==rec)return;
   const mime=(rec.mimeType||type||"audio/mp4").split(";")[0];
   stopMedia();if(!dialog.open)return;
   const blob=new Blob(chunks,{type:mime});
   if(blob.size<100||blob.size>2500000){status("檔案大小不適合，請錄短一點。",true);return}
   v.blob=blob;v.mime=mime;$("voiceSend").disabled=false;
   $("voiceRecText").textContent="錄好了！你可以選擇是否送出辨識。";
   status("音訊只在這一頁的記憶體裡，尚未上傳。");
  };
  rec.start();v.started=Date.now();
  $("voiceRec").classList.add("active");$("voiceRec").textContent="■";
  $("voiceRec").setAttribute("aria-label","停止錄音");
  $("voiceRecText").textContent="錄音中……再點一次停止";
  $("voiceSeconds").hidden=false;status("錄音中。按「送出辨識」前不會上傳。");
  v.clock=setInterval(()=>{
   let n=Math.min(12,Math.floor((Date.now()-v.started)/1000));
   $("voiceSeconds").textContent="00:"+String(n).padStart(2,"0");
   if(Date.now()-v.started>=12000&&rec.state==="recording")rec.stop();
  },200);
 } catch {clearAudio();status("無法取得麥克風權限。請改用文字。",true);}
}
function workerOrigin(){
 const u=new URL($("voiceApi").value.trim().replace(/\/+$/,""));
 if(u.protocol!=="https:"||u.pathname!=="/"||u.search||u.hash||u.username||u.password)throw Error("請填入正確的 HTTPS Worker 網址");
 return u.origin;
}
async function sendAudio(){
 if(!v.blob)return status("請先錄好一句話。",true);
 const code=$("voiceCode").value.trim();
 if(!code){$("voiceSettings").open=true;return status("老師尚未設定課堂測試碼。",true)}
 let origin;try{origin=workerOrigin()}catch{$("voiceSettings").open=true;return status("請填入正確的 HTTPS Worker 網址。",true)}
 $("voiceSend").disabled=true;status("正在辨識，雲端模型首次啟動可能比較慢……");
 try{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),85000);
  let response;try{
   response=await fetch(origin+"/api/transcribe",{
     method:"POST",headers:{"Content-Type":v.mime,"X-Mimo-Class-Code":code},
     body:v.blob,signal:controller.signal,cache:"no-store"
   });
  } finally {clearTimeout(timeout);}
  const data=await response.json();
  if(!response.ok)throw Error(data.error||"辨識服務暫時無法使用");
  if(!dialog.open)return;
  $("voiceWords").value=String(data.text||"").slice(0,220);
  v.emotion=String(data.emotion||"UNKNOWN").toUpperCase();v.fromModel=true;
  $("voiceClue").hidden=false;
  $("voiceClue").textContent=(tones[v.emotion]||tones.UNKNOWN)+" 這只是模型估計，並不代表你一定有這樣的感覺。";
  clearAudio();status("語音辨識完成，請檢查是否有聽錯的字。");
 }catch(e){$("voiceSend").disabled=false;status("無法辨識："+(e.name==="AbortError"?"等待逾時":String(e.message).slice(0,110))+"。可以改用文字。",true);}
}
async function checkHealth(){
 $("voiceHealthText").textContent="檢查中……";
 try{
  const r=await fetch(workerOrigin()+"/api/health",{cache:"no-store"});
  const data=await r.json();
  $("voiceHealthText").textContent=r.ok&&data.configured?"已找到雲端語音閘道。":"閘道尚未完成設定。";
 }catch{$("voiceHealthText").textContent="目前連不上語音閘道。";}
}
function tryWords(){
 const words=$("voiceWords").value.trim();
 if(!words)return status("請先說出或打出一句話。",true);
 const d=window.mimoVoiceScene?.()||{id:"team",name:"同學"};
 const cue=v.fromModel?(tones[v.emotion]||tones.UNKNOWN):"本次為文字練習，沒有分析學生聲音。";
 close();
 $("storyboard").hidden=true;$("choices").hidden=true;
 $("playerLine").hidden=false;$("playerQuote").textContent=words;
 $("step").textContent="STEP 03 · 另一種可能";
 $("prompt").textContent="同一句話，對方也許會有不同反應！";
 $("response").hidden=false;
 $("response").innerHTML=[
  '<span class="mini">你自己的說法</span><h3>你剛才想說的是什麼？</h3>',
  '<p id="voiceReplay"></p><p id="voiceCue"></p>',
  '<div class="moment-card">我們不能從表情猜出別人的真正想法。請選一種可能，看看故事如何發展：</div>',
  '<div class="voice-branches"><button id="voicePath0" type="button">😟 如果他有點受傷</button>',
  '<button id="voicePath1" type="button">🙂 如果他願意合作</button>',
  '<button id="voicePath2" type="button">😕 如果他沒聽懂</button></div>',
  '<div id="voiceHypothesis" class="voice-hypothesis" hidden></div>',
  '<div class="buttons"><button class="btn-primary" id="voiceAgain" type="button">再說一次</button>',
  '<button class="btn-secondary" id="voiceReturn" type="button">重新看故事</button></div>'
 ].join("");
 $("voiceReplay").textContent="「"+words+"」";
 $("voiceCue").textContent=cue;
 for(let k=0;k<3;k++)$("voicePath"+k).onclick=()=>{
  const choices=replies[d.id]||replies.team;
  $("voiceHypothesis").hidden=false;
  $("voiceHypothesis").textContent=d.name+"可能會說：「"+choices[k]+"」";
 };
 $("voiceAgain").onclick=open;
 $("voiceReturn").onclick=()=>{const nav=document.querySelector('[data-scene][aria-current="true"]');if(nav)nav.click()};
 $("response").scrollIntoView?.({behavior:"smooth",block:"nearest"});
}
$("choices").addEventListener("click",e=>{if(e.target.closest("#voiceOpen"))open()});
$("voiceClose").onclick=close;$("voiceBack").onclick=close;
dialog.addEventListener("close",clearAudio);
$("voiceRec").onclick=()=>v.rec?.state==="recording"?v.rec.stop():startRecord();
$("voiceClear").onclick=()=>{clearAudio();status("錄音已清除，可以再試。")};
$("voiceSend").onclick=sendAudio;
$("voiceHealth").onclick=checkHealth;
$("voiceSimulate").onclick=tryWords;
})();