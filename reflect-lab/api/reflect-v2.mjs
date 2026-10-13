// Mimo v2: autonomy-first, fictional-case-only student support and SEL.
import { timingSafeEqual } from 'node:crypto';
const MAX_BODY=12500;
const FACE=['calm','listen','soft','guard','hurt','question'];
const MOVE=['stay','emotion','stabilize','story','facts','perspective','action','close','support'];
const SKILL=['reflect_feeling','reflect_meaning','simple_reflection','double_sided_reflection','open_invitation','summary','permission','validate_boundary','offer_choice','reframe_uncertainty','collaborative_plan','quiet_presence'];
const MODE=['listen','clarify','ideas'];
const THREAD_FIELDS=['event','importance','openLoop'];
const CLOSED=/先到這裡|就這樣|今天先聊到這|謝謝你我好多了|我知道怎麼做了|下次我會|我要去找老師|我決定先/u;
const RISK=/自殺|想死|不想活|割腕|要自殘|想傷害自己|想揍|想打人|會揍|要揍|忍不住動手|快動手|性侵|性騷擾|被強迫|被威脅|家暴|被打|有人打我|一直被霸凌/u;
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
'自然對話節奏：剛開始先知道孩子想談的重點；談過兩三輪後，可以自然地以一句話把故事串起來，邀請孩子選擇「先整理」還是「繼續說」；當孩子已說清需要、明確提出做法或表示想結束，請回扣開頭的事件、簡短整理孩子自己的觀察和選擇並自然收束。這不是固定關卡，若學生只想被聽就不要強迫轉向。',
'每回合記得未解決的線索 openLoop：若上一個關心點已被孩子回答，應把它更新成新焦點，絕對不要再次問「還有什麼感覺」「發生了什麼」之類重複的泛用問題。先聚焦一個問題，沒必要就別問。',
'孩子問「那我怎麼辦」、想下一步時，不要一直說「我們可以慢慢想」，而是根據已說的情境給一個小而可行的選擇，必要時先問是否願意；孩子已自行提出合理做法時，不要再問相同問題，應回到事件確認做法如何保護界線，並可結束。',
'輸出 thread 是你對這段對話的簡短暫時工作摘要：event=孩子自己說的事件（非核實事實），importance=孩子最在意的感受或價值，openLoop=仍未談完、值得等孩子願意時再談的焦點。只保留孩子確實說過的資訊，不得推測別人的動機，更新而非每次重置。',
'孩子激動或遭到反覆取笑時，先同理與安全支持，不追問別人是怎麼笑他的；也不能假設老師或同學一定是好意或故意。不可假裝知道現場真相。',
'台灣自然繁體中文。通常 reply 1～2 句、18～75 字，具體回應最近這則話中的重要內容；如自然適合才提出 question，一次最多一題、最多 40 字，也可以是空字串。絕不把問句寫在 reply 裡。',
'避免機械式肯定：不要每輪都說 謝謝你分享、很棒耶、你好勇敢、你的感受很重要。不重複已問過或已回答過的問題；參考最近對話，不催促多說細節。',
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
 const history=Array.isArray(input.history)?input.history.slice(publicAuthorized?-6:-10).filter(m=>m&&['user','mimo'].includes(m.role)&&typeof m.text==='string').map(m=>({role:m.role,text:trim(m.text,240)})):[];
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
 const user=JSON.stringify({student_current_words:answer,recent_turns:history,conversation_thread:thread,previous_questions:lastQuestions,last_mimo_question:previousQuestion,conversation_turn:turnCount,child_has_proposed_next_step:CLOSED.test(answer),learning_anchors:context,student_support_preference:mode,instruction:prefs[mode],fictional_school_scenario:publicAuthorized?input.demoCase:'teacher-only',last_student_message_is_most_important:true});
 try{
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',{
   method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY,'Content-Type':'application/json'},
   body:JSON.stringify({systemInstruction:{parts:[{text:SYSTEM}]},contents:[{role:'user',parts:[{text:user}]}],generationConfig:{responseMimeType:'application/json',responseSchema:SCHEMA,thinkingConfig:{thinkingBudget:0},maxOutputTokens:publicAuthorized?1120:1320}}),
   signal:AbortSignal.timeout(13000)
  });
  if(!response.ok)return send(res,response.status===429?503:502,{error:response.status===429?'GEMINI_QUOTA':'GEMINI_UNAVAILABLE'});
  const data=await response.json(),raw=(data?.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('');
  let out;try{out=JSON.parse(raw)}catch{return send(res,502,{error:'BAD_JSON'})}
  const reply=trim(out.reply,230);let question=trim(out.question,115);
  const nextThread={};const rawOutput=out.thread&&typeof out.thread==='object'?out.thread:{};
  for(const k of THREAD_FIELDS)nextThread[k]=trim(rawOutput[k],publicAuthorized?90:130);
  const comparison=q=>q.replace(/[？?！，。\s「」『』：:]/g,'').slice(0,80);
  const nearSame=(a,b)=>{const x=comparison(a),y=comparison(b);if(!x||!y)return false;if(x===y)return true;const grams=x.length>=2?Array.from({length:x.length-1},(_,i)=>x.slice(i,i+2)):[];const other=new Set(Array.from({length:Math.max(0,y.length-1)},(_,i)=>y.slice(i,i+2)));return grams.length>=5&&grams.filter(z=>other.has(z)).length/grams.length>.76};
  if([previousQuestion,...lastQuestions].some(q=>nearSame(question,q)))question='';
  if(CLOSED.test(answer)&&mode!=='listen'&&!question)out.move='close';
  if(reply.length<5||!FACE.includes(out.face)||!MOVE.includes(out.move)||!SKILL.includes(out.skill)||!['none','concern','urgent'].includes(out.riskLevel)||typeof out.needsAdult!=='boolean'||question.split(/[？?]/).length>2)return send(res,502,{error:'BAD_SCHEMA'});
  if(out.needsAdult||out.riskLevel==='urgent')return send(res,200,rule('這可能需要現場的大人一起幫忙。請先找老師、輔導老師或其他可信任的人，網站不會自動通報。','','urgent','model-safety',true,'support'));
  return send(res,200,{reply,question,thread:nextThread,face:out.riskLevel==='concern'?'listen':out.face,move:out.move,skill:out.skill,riskLevel:out.riskLevel,needsAdult:false,source:'gemini-2.5-flash'});
 }catch{return send(res,502,{error:'GEMINI_TIMEOUT'})}
}