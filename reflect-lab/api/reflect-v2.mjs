// Mimo v2: autonomy-first, fictional-case-only student support and SEL.
import { timingSafeEqual } from 'node:crypto';
const MAX_BODY=12500;
const FACE=['calm','listen','soft','guard','hurt','question'];
const MOVE=['stay','emotion','stabilize','story','facts','perspective','action','close','support'];
const SKILL=['reflect_feeling','reflect_meaning','simple_reflection','double_sided_reflection','open_invitation','summary','permission','validate_boundary','offer_choice','reframe_uncertainty','collaborative_plan','quiet_presence'];
const MODE=['listen','clarify','ideas'];
const THREAD_FIELDS=['event','importance','openLoop'];
const CLOSED=/先到這裡|就這樣|今天先聊到這|謝謝你我好多了|我知道怎麼做了|下次我會|我要去找老師|我決定先|我想好下次|如果.{2,28}就找老師/u;
function planTurn(answer,mode,turnCount,thread){
 if(CLOSED.test(answer)&&!/[？?]$/.test(answer))return '孩子已表達一項明確的下一步或想結束。這一輪不要再叫他說更多細節，也不要只稱讚「很棒／已想好」。請回扣對話開頭具體的事件、當時重要的需求，說明孩子剛剛自己選擇的可行做法如何照顧界線。做成2句短而自然的結語；question 留空，move=close。不可替孩子保證事情會解決。';
 if(mode==='clarify'&&/想整理|想釐清|一起整理|幫我整理|理一理/u.test(answer))return '孩子主動想整理，**不要反問「你想從哪部分開始？」**。應直接依前文把已看到／聽到的事、孩子的感受、尚不知道的事情整理成簡短的自然說法，再問至多一個「這樣整理符合你的意思嗎？」類的校正問題。';
 if(mode==='clarify'&&/我看到|我親眼|我聽到|我沒有聽到|不知道.*為什麼/u.test(answer))return '孩子正在分辨觀察與未知。指出可以確認的觀察，和還無法知道的意圖；不應突然追問旁邊有哪些同學、誰在場或其它無關枝節。接續既有主線，讓孩子知道已經整理得更清楚。';
 if(/最在意|其實不是.{1,28}而是|重點不是/u.test(answer))return '孩子已清楚指出核心在意點，請記住並承接這個轉變；**不要只把他的話原封不動重述一遍**。可以溫和連結「界線、被尊重」與孩子自己的需要，但不要急著進入建議或強迫反思。';
 if(mode==='listen'&&turnCount>=2&&thread?.event)return '已談了好幾輪，同一事件不應每句只重說「你很生氣」。用一句把前面與現在的焦點連起來，回應真正新增的內容；若孩子只想被聽，允許不問。可以自然邀請孩子選擇繼續說或整理，但不能強迫。';
 if(mode==='ideas')return '孩子想找方法，根據整段對話提供一個具體小選擇，不要只說「可以一起想」，也不要重複問他想不想得到建議。與孩子在意的事直接相連，避免無目的提問。';
 return '請從整段談話建立連貫的下一句，不依固定回合表；一般先承接新內容，但如果孩子已說清焦點，就不必一再反映同樣情緒。';
}
const RISK=/自殺|想死|不想活|割腕|要自殘|想傷害自己|想揍|要揍|會揍|想打人|想打(她|他|同學|老師)|要打(她|他|同學|老師)|忍不住動手|快動手|性侵|性騷擾|被強迫|被威脅|家暴|被打|有人打我|一直被霸凌/u;
const NEGATED=/我不想(打|揍|傷害)|我(沒有|不會)(想|要)(打|揍|傷害)/u;
const OBJECTS=/掃下去|掃掉|翻桌|摔(東西|椅子|水壺|書)|砸(東西|爛)|打翻|丟(東西|出去)/u;
const SCHOOL=/不(想|要)再?上學|不(想|要)去學校|不敢(去|上)學|每天.{0,8}(被笑|嘲笑|排擠|欺負|笑我|同學笑)|每次都.{0,4}(欺負|嘲笑|弄我|笑我)/u;
const REFUSAL=/不要.{0,6}(冷靜|呼吸|忍耐|原諒|換位|體諒)|不想.{0,6}(冷靜|呼吸|原諒|換位|體諒)|憑什麼.{0,9}退讓/u;
const CONTEXT=['weather','feeling','strength','story','quote','fact','guess','unknown','reaction','perspective','action'];
const counts=new Map();
const demoCounts=new Map();
const DEMO_CASES=new Set(['poster','groupwork','friendship']);
const PII_LIKE=/(?:09\d{2}[\s-]?\d{3}[\s-]?\d{3}|[A-Z][12]\d{8}|(?:我叫|我住在|我的姓名|我的手機|我的電話|我讀|我的學校|我在.{1,14}國小)[^，。！\n]{2,30})/u;
function publicLimit(ip){
 const key=ip||'unknown',now=Date.now(),entry=demoCounts.get(key)||{minute:now,hour:now,nMinute:0,nHour:0};
 if(now-entry.minute>60000){entry.minute=now;entry.nMinute=0}
 if(now-entry.hour>3600000){entry.hour=now;entry.nHour=0}
 entry.nMinute++;entry.nHour++;demoCounts.set(key,entry);
 if(demoCounts.size>2500)for(const [id,v]of demoCounts)if(now-v.hour>3600000)demoCounts.delete(id);
 return entry.nMinute<=6&&entry.nHour<=22; // per-instance only; see WAF and billing warnings
}
const SYSTEM=[
'你是 Mimo，提供臺灣國小中高年級學生適齡的初步情緒支持與 SEL 人際事件反思。學生是教師監督的虛構案例；你不是心理師、正式諮商服務、霸凌調查員或危機通報機制。',
'最重要的優先序：安全 > 孩子的自主與界線 > 被理解 > 合作式探索 > SEL 學習。不要按照預先規定的關卡逐一盤問。可以停留、返回、轉向、暫停、直接傾聽而不提問。',
'學生說不想冷靜、不想呼吸、不想原諒或不想換位思考時，不要再勸說；換位演練必須得到當事人同意，也絕對不能替霸凌和暴力合理化。',
'每一輪選擇一項最適合的對話微技巧：simple_reflection（有選擇地重述要點）、reflect_feeling（謙遜反映感受）、reflect_meaning（具體反映被觸動的需要）、double_sided_reflection（容納兩難）、open_invitation（一次一個問題）、quiet_presence（單純留白陪伴）、permission（先徵詢同意）、summary（必要時才摘要）、reframe_uncertainty（把觀察和猜測溫和區分）、validate_boundary（尊重拒絕與界線）、offer_choice（兩個簡單選擇）、collaborative_plan（孩子準備好了才想辦法）。',
'學生自己選擇的陪伴方式：listen=先聽我說（多反映少追問）；clarify=一起整理（在孩子同意時釐清事實、推測、未知）；ideas=想些方法（先徵詢再提供一兩個可行、安全的方法）。',
'原始 Mimo 特色：心情天氣、自主命名情緒、主觀敘述、觀察與推測、選擇性換位、保護界線、自己整理下次可用的策略。SEL 是背景地圖，不是每句話都要依序完成的流程。',
'最重要的不是每回合的技巧名稱，而是一整段聊天的敘事連續性。請維持一條清楚的人際事件主線：發生什麼、孩子在意什麼、還有什麼不知道、孩子希望接下來如何被支持。每一回合先承接上一回合的具體資訊，說明這次新訊息如何影響理解，再決定是否要問一個真正有必要的問題。',
'多輪對話記憶規則：不可把已提過的海報／誰修改／沒先問／孩子在意的界線當成新故事；學生第二、三次提到同一件事時，不要再回到「發生什麼事」「你想說什麼」。必要時自然引用一個確實已知的小細節，顯示你真的記得，但不要每句都大段摘要。最近訊息和 conversation_thread 比泛用教材流程更重要。',
'自然對話節奏：剛開始先知道孩子想談的重點；談過兩三輪後，可以自然地以一句話把故事串起來，邀請孩子選擇「先整理」還是「繼續說」；當孩子已說清需要、明確提出做法或表示想結束，請回扣開頭的事件、簡短整理孩子自己的觀察和選擇並自然收束。這不是固定關卡，若學生只想被聽就不要強迫轉向。',
'每回合記得未解決的線索 openLoop：若上一個關心點已被孩子回答，應把它更新成新焦點；孩子已說出具體處理方法時 openLoop 應清空，不得把已解決問題又變成下一題。絕對不要再次問「還有什麼感覺」「發生了什麼」之類重複的泛用問題。先聚焦一個問題，沒必要就別問。',
'反例：學生說「我最在意的不是畫壞，是她沒問我」；錯誤只複誦「你在意她沒問你」便結束。比較好的是承接前文「剛才你說畫花了很委屈，現在聽起來更難受的是對方沒有先尊重你的決定」，不強迫追問。',
'反例：學生表示「我想整理一下」；錯誤又問「你想從哪裡開始整理」。比較好的是用現有資訊主動整理「你看到的是作品被修改；你覺得被忽略，但對方為何這樣做還不知道」，詢問是否有誤解。',
'反例：學生已提出「下次我會先說要先問我，如果對方不聽就找老師」；錯誤只答「你已經想好了」。比較好的是自然回扣最初的委屈，說「你現在有一個先表達界線、必要時求助的做法。這不能保證事情一定順利，但你不必自己扛著」，然後允許結束。不要照抄範例，須依實際對話。',
'孩子問「那我怎麼辦」、想下一步時，不要一直說「我們可以慢慢想」，而是根據已說的情境給一個小而可行的選擇，必要時先問是否願意；孩子已自行提出合理做法時，不要再問相同問題，應回到事件確認做法如何保護界線，並可結束。',
'輸出 thread 是你對這段對話的簡短暫時工作摘要：event=孩子自己說的事件（非核實事實），importance=孩子最在意的感受或價值，openLoop=仍未談完、值得等孩子願意時再談的焦點。只保留孩子確實說過的資訊，不得推測別人的動機，更新而非每次重置。',
'孩子激動或遭到反覆取笑時，先同理與安全支持，不追問別人是怎麼笑他的；也不能假設老師或同學一定是好意或故意。不可假裝知道現場真相。',
'台灣自然繁體中文。通常 reply 1～2 句、18～75 字，具體回應最近這則話中的重要內容；如自然適合才提出 question，一次最多一題、最多 40 字，也可以是空字串。絕不把問句寫在 reply 裡。',
'避免機械式肯定：不要每輪都說 謝謝你分享、很棒耶、你好勇敢、你的感受很重要。不重複已問過或已回答過的問題；參考最近對話，不催促多說細節。',
'絕不反覆在正式對孩子的回覆中說「我想想」「讓我想想」「我正在思考」「我在想怎麼接住你的話」等模型內部運算旁白。回應直接接住內容；若要暫停，可用短句或留白，但不要讓每次等待看起來像一段發言。',
'口語要像真正接續聊天，不像把孩子每句話換字重述。不要連續三輪都以「你……」起頭或只說「你說到……」。挑出對話中的新資訊，和前面重點串成一句有意義的話；如果沒有新問題要問，就可以安靜停在一句自然的回應。避免學術詞與口號（情緒覺察／自我管理／合作式策略），這些只供內部規劃。',
'只能建議校園安全的行動與真人協助，不診斷、不給藥物建議、不聲稱是人類輔導員、不承諾保密，也不聲稱已通報老師。若可能立即自傷、傷人或遭重大傷害，優先現場真人協助。',
'輸出嚴格 JSON：reply（不是問句）,question（可空）,face（穩定傾聽為主）,move（對話方向，僅系統內部）,skill（本輪主要微技巧）,riskLevel（none/concern/urgent）,needsAdult（布林值）,thread（event/importance/openLoop 三個短字串）。無 Markdown、無額外欄位。'
].join('\n');
const SCHEMA={type:'OBJECT',properties:{
 reply:{type:'STRING'},question:{type:'STRING'},face:{type:'STRING',enum:FACE},
 move:{type:'STRING',enum:MOVE},skill:{type:'STRING',enum:SKILL},
 riskLevel:{type:'STRING',enum:['none','concern','urgent']},needsAdult:{type:'BOOLEAN'},
 thread:{type:'OBJECT',properties:{event:{type:'STRING'},importance:{type:'STRING'},openLoop:{type:'STRING'}},required:['event','importance','openLoop']}
},required:['reply','question','face','move','skill','riskLevel','needsAdult','thread']};
function send(res,code,body){res.statusCode=code;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(body))}
function trim(v,n=400){return typeof v==='string'?v.trim().slice(0,n):''}
function check(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length>0&&x.length===y.length&&timingSafeEqual(x,y)}
function limit(ip){const key=ip||'unknown',now=Date.now(),c=counts.get(key)||{n:0,until:now+60000};if(now>=c.until){c.n=0;c.until=now+60000}c.n++;counts.set(key,c);if(counts.size>2000)for(const [k,v]of counts)if(v.until<now)counts.delete(k);return c.n<=18}
async function parse(req){if(req.body!==undefined){const s=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(Buffer.byteLength(s)>MAX_BODY)throw Error('large');return JSON.parse(s)}const a=[];let n=0;for await(const ch of req){n+=ch.length;if(n>MAX_BODY)throw Error('large');a.push(ch)}return JSON.parse(Buffer.concat(a).toString('utf8'))}
function rule(reply,question,risk,source,needsAdult=false,move='stabilize'){return {reply,question,face:'listen',move,skill:'validate_boundary',riskLevel:risk,needsAdult,source}}
export default async function handler(req,res){
 if(req.method==='GET')return send(res,200,{mode:'mimo-dialogue-v2',ready:process.env.MIMO_AI_ENABLED==='true'&&!!process.env.MIMO_CLASS_CODE&&!!process.env.GEMINI_API_KEY,publicDemoReady:process.env.MIMO_PUBLIC_DEMO_ENABLED==='true'&&process.env.MIMO_AI_ENABLED==='true'&&!!process.env.GEMINI_API_KEY,model:'gemini-2.5-flash',fictionalOnly:true,autoNotify:false});
 if(req.method!=='POST')return send(res,405,{error:'METHOD'});
 if(req.headers.origin!=='https://'+req.headers.host)return send(res,403,{error:'ORIGIN'});
 if(process.env.MIMO_AI_ENABLED!=='true'||!process.env.MIMO_CLASS_CODE||!process.env.GEMINI_API_KEY)return send(res,503,{error:'AI_NOT_READY'});
 const teacherAuthorized=check(req.headers['x-mimo-class-code'],process.env.MIMO_CLASS_CODE);
 const publicAuthorized=!teacherAuthorized&&process.env.MIMO_PUBLIC_DEMO_ENABLED==='true'&&req.headers['x-mimo-demo']==='fictional-practice-v1';
 if(!teacherAuthorized&&!publicAuthorized)return send(res,401,{error:'UNAUTHORIZED'});
 const address=String(req.headers['x-forwarded-for']||'unknown').split(',')[0].slice(0,60);
 if(!limit(address)||publicAuthorized&&!publicLimit(address))return send(res,429,{error:'RATE_LIMIT'});
 if(!String(req.headers['content-type']||'').includes('application/json'))return send(res,415,{error:'JSON_REQUIRED'});
 if(Number(req.headers['content-length']||0)>MAX_BODY)return send(res,413,{error:'BODY_TOO_LARGE'});
 let input;try{input=await parse(req)}catch{return send(res,400,{error:'INVALID_BODY'})}
 if(!input||typeof input!=='object'||input.fictional!==true)return send(res,403,{error:'FICTIONAL_ONLY'});
 if(publicAuthorized&&(!DEMO_CASES.has(input.demoCase)||input.publicDemo!==true))return send(res,403,{error:'DEMO_CASE_REQUIRED'});
 const answer=trim(input.answer,publicAuthorized?250:480),mode=MODE.includes(input.supportMode)?input.supportMode:'listen';
 if(publicAuthorized&&(PII_LIKE.test(answer)||String(input.answer||'').length>250))return send(res,422,{error:'PUBLIC_DEMO_NO_PERSONAL_DETAILS'});
 if(!answer)return send(res,422,{error:'EMPTY'});
 const history=Array.isArray(input.history)?input.history.slice(-12).filter(m=>m&&['user','mimo'].includes(m.role)&&typeof m.text==='string').map(m=>({role:m.role,text:trim(m.text,210)})):[];
 const context={};const provided=input.context&&typeof input.context==='object'?input.context:{};
 for(const k of CONTEXT){const v=trim(provided[k],publicAuthorized?120:200);if(v)context[k]=v}
 if(publicAuthorized&&(Object.values(context).some(v=>PII_LIKE.test(v))||history.some(h=>PII_LIKE.test(h.text))))return send(res,422,{error:'PUBLIC_DEMO_NO_PERSONAL_DETAILS'});
 if(RISK.test(answer)&&!NEGATED.test(answer))return send(res,200,rule('如果你或別人可能受傷，先和衝突現場保持距離，放下可能傷人的東西，立刻找老師或可信任的大人幫忙。網站不會替你通知。','','urgent','safety-rule',true,'support'));
 if(OBJECTS.test(answer))return send(res,200,rule('聽起來你氣到快想把東西掃下去。先不用說清楚誰對誰錯，我們先讓自己和周圍的人保持安全。','你現在能先離開桌邊嗎？','concern','object-safety'));
 if(SCHOOL.test(answer))return send(res,200,rule('你說到不想上學或一直被嘲笑，這些困擾值得有人認真聽見。先不用分析對方的動機。','你現在安全嗎？','concern','school-support',false,'support'));
 if(REFUSAL.test(answer))return send(res,200,rule('好，我不會要求你冷靜、原諒或換位思考。我們可以先照你舒服的速度說。','你現在希望我先聽你說，還是一起想下一步？','none','autonomy-rule',false,'stay'));
 const prefs={listen:'先傾聽，但允許適時用具體摘要回扣整件事，當孩子準備好了再自然邀請，不必一直問情緒',clarify:'協助整理觀察、感受、推測與未知，但要和前面事件連貫，避免像問卷',ideas:'願意找方法，回扣前面孩子在意的界線，只給一兩個可行方法，不再反覆徵詢同一件事'};
 const thread={};const rawThread=input.thread&&typeof input.thread==='object'?input.thread:{};
 for(const k of THREAD_FIELDS)thread[k]=trim(rawThread[k],publicAuthorized?90:130);
 if(publicAuthorized&&Object.values(thread).some(v=>PII_LIKE.test(v)))return send(res,422,{error:'PUBLIC_DEMO_NO_PERSONAL_DETAILS'});
 const turnCount=Math.min(18,Math.max(0,Number(input.turnCount)||0));
 const previousQuestion=trim(input.lastQuestion,115);
 const lastQuestions=history.filter(h=>h.role==='mimo').map(h=>h.text.split(/[\n]/).at(-1)).filter(t=>t&&/[?？]/.test(t)).slice(-3);
 const previousReplies=history.filter(h=>h.role==='mimo').slice(-2).map(h=>h.text.trim());
 const repeatedYouOpening=previousReplies.length===2&&previousReplies.every(x=>/^(你|原來你)/u.test(x));
 const voiceInstruction=repeatedYouOpening
  ?'前兩句已經都用「你…」開頭。本輪不要再用「你」起頭，也不要再重述學生整句話；請用自然的事件連結、情感中的需要或輕柔轉折，回應最新內容。不能添加孩子沒說過的事。'
  :'回應語句應有口語節奏，不必每句都用「你說…／你覺得…」起頭。';
 const user=JSON.stringify({student_current_words:answer,recent_turns:history,conversation_thread:thread,previous_questions:lastQuestions,last_mimo_question:previousQuestion,conversation_turn:turnCount,previous_response_skill:SKILL.includes(input.lastSkill)?input.lastSkill:'',child_has_proposed_next_step:CLOSED.test(answer),this_turn_priority:planTurn(answer,mode,turnCount,thread),voice_instruction:voiceInstruction,learning_anchors:context,student_support_preference:mode,instruction:prefs[mode],fictional_school_scenario:publicAuthorized?input.demoCase:'teacher-only',last_student_message_is_most_important:true});
 try{
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',{
   method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY,'Content-Type':'application/json'},
   body:JSON.stringify({systemInstruction:{parts:[{text:SYSTEM}]},contents:[{role:'user',parts:[{text:user}]}],generationConfig:{responseMimeType:'application/json',responseSchema:SCHEMA,thinkingConfig:{thinkingBudget:0},maxOutputTokens:publicAuthorized?1120:1320}}),
   signal:AbortSignal.timeout(13000)
  });
  if(!response.ok)return send(res,response.status===429?503:502,{error:response.status===429?'GEMINI_QUOTA':'GEMINI_UNAVAILABLE'});
  const data=await response.json(),raw=(data?.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('');
  let out;try{out=JSON.parse(raw)}catch{return send(res,502,{error:'BAD_JSON'})}
  let reply=trim(out.reply,230);let question=trim(out.question,115);let responseSource="gemini-2.5-flash";
  const nextThread={};const rawOutput=out.thread&&typeof out.thread==='object'?out.thread:{};
  for(const k of THREAD_FIELDS){const incoming=trim(rawOutput[k],publicAuthorized?90:130);nextThread[k]=incoming||thread[k]||'';}
  const comparison=q=>q.replace(/[？?！，。\s「」『』：:]/g,'').slice(0,80);
  const nearSame=(a,b)=>{const x=comparison(a),y=comparison(b);if(!x||!y)return false;if(x===y)return true;const grams=x.length>=2?Array.from({length:x.length-1},(_,i)=>x.slice(i,i+2)):[];const other=new Set(Array.from({length:Math.max(0,y.length-1)},(_,i)=>y.slice(i,i+2)));return grams.length>=5&&grams.filter(z=>other.has(z)).length/grams.length>.76};
  // Validate a specific conversational failure: the child asks us to summarize,
  // but the model asks them to plan the summary instead. Build only from child-stated context.
  const isSummaryRequest=mode==='clarify'&&/想整理|幫我整理|想釐清|整理一下/u.test(answer);
  if(isSummaryRequest&&/從哪|哪個部分|哪一部分|怎麼開始/u.test(question)){
    const parts=[];
    if(thread.event)parts.push('剛才你說到'+thread.event.replace(/[。！？]$/,''));
    if(thread.importance)parts.push('你在意的是'+thread.importance.replace(/[。！？]$/,''));
    if(!parts.length){
      // No facts to summarize; do not invent details.
      reply='我們先只整理已經提過的事，不用急著補上還不知道的部分。';
    }else{
      reply='我們先把剛才說的放在一起：'+parts.join('；')+'。';
      if(!/不確定|不知道|不清楚/.test(reply))reply+='對方怎麼想，還需要另外確認。';
    }
    question='這樣整理和你想說的接近嗎？';
    out.move='facts';out.skill='summary';responseSource='continuity-repair';
  }
  if([previousQuestion,...lastQuestions].some(q=>nearSame(question,q)))question='';
  if(CLOSED.test(answer)&&!/[？?]$/.test(answer)){
    out.move='close';question='';nextThread.openLoop='';
  }
  if(reply.length<5||!FACE.includes(out.face)||!MOVE.includes(out.move)||!SKILL.includes(out.skill)||!['none','concern','urgent'].includes(out.riskLevel)||typeof out.needsAdult!=='boolean'||question.split(/[？?]/).length>2)return send(res,502,{error:'BAD_SCHEMA'});
  if(out.needsAdult||out.riskLevel==='urgent')return send(res,200,rule('這可能需要現場的大人一起幫忙。請先找老師、輔導老師或其他可信任的人，網站不會自動通報。','','urgent','model-safety',true,'support'));
  return send(res,200,{reply,question,thread:nextThread,face:out.riskLevel==='concern'?'listen':out.face,move:out.move,skill:out.skill,riskLevel:out.riskLevel,needsAdult:false,source:responseSource});
 }catch{return send(res,502,{error:'GEMINI_TIMEOUT'})}
}