// Mimo SEL AI — optional, teacher-controlled research API.
// Vercel Node Function. Never log student submissions. No database.
import { timingSafeEqual } from 'node:crypto';

const MAX_BYTES = 7500;
const FACES = new Set(['calm','listen','soft','guard','hurt','question']);
const STAGES = ['安全確認','辨識心情','情緒調節','表達主觀經驗','釐清觀察與推測','換位與界線','學習遷移'];
const FIELDS = new Set(['safety','weather','strength','feeling','strategy','after','breath','story','quote','fact','guess','unknown','expression','reaction','perspective','perspectiveNote','action','newWords','nextTime','end']);
const CONTEXT = ['weather','feeling','strength','story','quote','fact','guess','unknown','reaction','perspective','action'];
// Layered safety rules run before the language model. They are not a clinical assessment.
const SENSITIVE = /(?:自殺|想死|不想活|傷害自己|割腕|性侵|被強迫|有人打我|一直被霸凌|被威脅|家暴|性騷擾|想揍|要揍|會揍|想打人|想打(她|他|同學|老師)|忍不住動手|快(要)?動手|想砍|拿刀傷)/u;
const OBJECTS = /(?:掃下去|掃掉|砸(爛|掉|東西)|摔(東西|書|椅|桌|手機)|翻桌|丟(出去|東西)|踢桌|推倒桌)/u;
const SCHOOL = /(?:不想再?上學|不敢(去|上)學|不想去學校|不敢去學校|每天被(笑|排擠|欺負)|一直(被笑|被排擠|被欺負)|每次都(欺負|嘲笑|弄我)|老師(都|也)?(偏心|不理我))/u;
const CONFLICT_REFUSAL = /(?:不要.{0,5}(換位|體諒|理解(他|她|對方)|原諒)|不想.{0,5}(換位|體諒|理解(他|她|對方)|原諒)|不要.{0,6}(冷靜|呼吸|忍耐|放鬆))/u;
const hits = new Map(); // best-effort per-function-instance safeguard only, not distributed rate limit.

function json(res,status,obj) {
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  return res.end(JSON.stringify(obj));
}
function equals(a,b) {
  const x=Buffer.from(String(a??'')),y=Buffer.from(String(b??''));
  return x.length>0&&x.length===y.length&&timingSafeEqual(x,y);
}
function clean(t,n=300) {
  if(typeof t==='number')return String(t).slice(0,n);
  return typeof t==='string'?t.trim().slice(0,n):'';
}
function checkLimit(ip) {
  const now=Date.now(), old=hits.get(ip)||{count:0,until:now+60_000};
  if(now>old.until){old.until=now+60_000;old.count=0}
  old.count++;hits.set(ip,old);
  if(hits.size>2000){for(const [k,v]of hits){if(v.until<now)hits.delete(k)}}
  return old.count<=15;
}
async function bodyFrom(req) {
  if(req.body!==undefined){
    const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);
    if(Buffer.byteLength(raw,'utf8')>MAX_BYTES)throw Error('oversize');
    return JSON.parse(raw);
  }
  const chunks=[];let total=0;
  for await(const chunk of req){total+=chunk.length;if(total>MAX_BYTES)throw Error('oversize');chunks.push(chunk)}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export default async function handler(req,res) {
  if(req.method==='GET'){
    return json(res,200,{mode:'research-pilot',ready:process.env.MIMO_AI_ENABLED==='true'&&Boolean(process.env.MIMO_CLASS_CODE)&&Boolean(process.env.GEMINI_API_KEY),privacy:'fictional-test-only',autoNotify:false});
  }
  if(req.method!=='POST')return json(res,405,{error:'METHOD_NOT_ALLOWED'});
  const origin=String(req.headers.origin||'');
  const host=String(req.headers.host||'');
  if(!host||origin!=='https://'+host)return json(res,403,{error:'ORIGIN_NOT_ALLOWED'});
  if(process.env.MIMO_AI_ENABLED!=='true'||!process.env.MIMO_CLASS_CODE)return json(res,503,{error:'AI_NOT_CONFIGURED'});
  if(!equals(req.headers['x-mimo-class-code'],process.env.MIMO_CLASS_CODE))return json(res,401,{error:'UNAUTHORIZED'});
  const ip=String(req.headers['x-forwarded-for']||'unknown').split(',')[0].trim().slice(0,60);
  if(!checkLimit(ip))return json(res,429,{error:'RATE_LIMITED'});
  if(!String(req.headers['content-type']||'').includes('application/json'))return json(res,415,{error:'JSON_REQUIRED'});
  if(Number(req.headers['content-length']||0)>MAX_BYTES)return json(res,413,{error:'BODY_TOO_LARGE'});
  let incoming;
  try{incoming=await bodyFrom(req)}catch{return json(res,400,{error:'INVALID_BODY'})}
  if(!incoming||typeof incoming!=='object'||incoming.fictional!==true)return json(res,403,{error:'FICTIONAL_CASES_ONLY'});
  const stage=Number(incoming.stage),field=clean(incoming.field,30),answer=clean(incoming.answer,480);
  const chatMode=incoming.chat===true;
  const nextObjective=chatMode?clean(incoming.nextObjective,180):'';
  const questionHint=chatMode?clean(incoming.questionHint,150):'';
  if(!Number.isInteger(stage)||stage<0||stage>6||!FIELDS.has(field)||!answer)return json(res,422,{error:'INVALID_INPUT'});
  if(field==='safety'&&answer==='unsafe')return json(res,200,{reply:'如果有人威脅、傷害或持續欺負你，請先找可信任的大人。這個網站不會通知任何人。',question:'',face:'listen',needsAdult:true,source:'safety-rule'});
  const context={};
  const userContext=incoming.context&&typeof incoming.context==='object'?incoming.context:{};
  for(const key of CONTEXT){const v=clean(userContext[key],240);if(v)context[key]=v}
  const nonThreat = /(?:我不想(打|揍|傷害)|我沒有(想|要)(打|揍|傷害))/.test(answer);
  const immediate = !nonThreat && (SENSITIVE.test(answer)||Object.values(context).some(v=>SENSITIVE.test(v)));
  if(immediate){
    return json(res,200,{reply:'現在先和可能受傷的人保持距離，放下手邊可能傷人的東西，立刻找現場老師或可信任的大人協助。網站不會自動通知任何人。',question:'',face:'guard',needsAdult:true,source:'safety-rule'});
  }
  if(OBJECTS.test(answer)){
    return json(res,200,{reply:'聽起來你非常生氣。先不用解釋事情，為了不讓自己或別人受傷，可以先退離桌邊和那些容易被打翻的東西。',question:chatMode?'你現在能先離開桌邊嗎？':'',face:'listen',needsAdult:false,source:'safety-pause'});
  }
  if(SCHOOL.test(answer)){
    return json(res,200,{reply:'你說不想上學，或是一直被嘲笑。這很值得被認真聽見；先不用替任何人找理由，也不急著追問細節。',question:chatMode?'你現在在學校或家裡，是安全的嗎？':'',face:'hurt',needsAdult:false,source:'support-check'});
  }
  if(CONFLICT_REFUSAL.test(answer)){
    return json(res,200,{reply:'好，我不會逼你冷靜、原諒或換位思考。你的感覺和界線仍然很重要。',question:chatMode?'你希望我先怎麼陪你？':'',face:'listen',needsAdult:false,source:'refusal-respected'});
  }
  const geminiKey=process.env.GEMINI_API_KEY;
  if(!geminiKey)return json(res,503,{error:'GEMINI_NOT_CONFIGURED'});
  const model=process.env.MIMO_AI_MODEL||'gemini-2.5-flash';
  if(model!=='gemini-2.5-flash')return json(res,503,{error:'UNSUPPORTED_GEMINI_MODEL'});
  // Only fictional, teacher-approved context is sent to Google's Gemini API.
  // Never return or log the secret API key.
  const system=[
    '你是臺灣國小四至六年級的社會情緒學習 SEL 引導助教 Mimo，處理的是經教師監督的**虛構案例**，不是心理師、調查員或診斷工具。',
    '孩子回答後要收到有溫度的具體回饋，不急著教訓或套用一模一樣的安慰話。',
    '孩子情緒升高、說不想上學或持續被排擠時，先確認支持與安全，不追問嘲笑的細節。孩子拒絕冷靜、原諒、換位時，尊重選擇並詢問他希望得到的協助。',
    '必須具體回應使用者實際選的詞、說的事件或提到的需要；若只有一個情緒標籤，簡短承接即可，不編造經過。',
    '不假定任何人故意做壞事；孩子說的事實仍未被獨立驗證；對他人立場僅使用「可能」「也許」，不替欺負、歧視與暴力辯護。',
    '尊重自我界線，不要求孩子道歉、原諒或和好；可選擇求助。不描述 AI 已看見現場或辨識真正情緒。',
    '階段 1-2 專注情緒覺察與自我調節，階段 3 先傾聽，階段 4 才談觀察與推測，階段 5 提供換位假設，階段 6 協助可執行的下一步。',
    '同一句話不要反覆用「謝謝你分享」。使用繁體中文、臺灣國小孩子聽得懂的語句，1–2 句，總長約 30–75 字。',
    '嚴格只輸出 JSON 物件，包含 reply、question、face、needsAdult 四個欄位；reply 是回應且不能包含提問，question 最多一個短問題（非聊天模式為空字串），face 為 calm/listen/soft/guard/hurt/question，needsAdult 為布林值。不得輸出 Markdown。',
    '如果孩子描述急迫危險、自傷、他傷、持續霸凌或性／身體傷害，不進行換位模擬，needsAdult=true，先建議立即找可信任大人與正式協助。不要承諾自動通知。',
  ].join('\n');
  const modeInstruction=chatMode?
    '你正在陪國小孩子一對一談話。學生已經回答上一句。先用 reply 具體接住內容，然後依「下一個小目標」寫唯一一個生活化、自然、短的 question。不能提前追問其他事情，也不可暗示已掌握事實。不必先告訴孩子學習階段。避免套話。若下個目標是告一段落，可讓 question 為「今天先聊到這裡，好嗎？」。':
    '不是聊天模式：reply 是簡短回饋，question 必須是空字串。';
  const systemPrompt=system+'\\n'+modeInstruction;
  const user=JSON.stringify({learning_stage:STAGES[stage],stage,question_field:field,student_answer:answer,student_confirmed_context:context,chat_mode:chatMode,next_objective:nextObjective,example_question:questionHint},null,0);
  try {
    const api=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{
      method:'POST',
      headers:{
        'x-goog-api-key':geminiKey,
        'Content-Type':'application/json',
      },
      body:JSON.stringify({
        systemInstruction:{parts:[{text:systemPrompt}]},
        contents:[{role:'user',parts:[{text:user}]}],
        generationConfig:{
          responseMimeType:'application/json',
          responseSchema:{
            type:'OBJECT',
            properties:{
              reply:{type:'STRING'},
              question:{type:'STRING'},
              face:{type:'STRING',enum:['calm','listen','soft','guard','hurt','question']},
              needsAdult:{type:'BOOLEAN'},
            },
            required:['reply','question','face','needsAdult'],
          },
          thinkingConfig:{thinkingBudget:0},
          maxOutputTokens:1100,
        },
      }),
      signal:AbortSignal.timeout(12000),
    });
    if(!api.ok){
      if(api.status===429)return json(res,503,{error:'GEMINI_QUOTA_EXCEEDED'});
      if(api.status===403||api.status===404)return json(res,503,{error:'GEMINI_MODEL_ACCESS_UNAVAILABLE'});
      return json(res,502,{error:'GEMINI_UNAVAILABLE'});
    }
    const result=await api.json();
    const parts=result?.candidates?.[0]?.content?.parts;
    const raw=Array.isArray(parts)?parts.filter(x=>typeof x?.text==='string').map(x=>x.text).join(''):'';
    let output;
    try{output=JSON.parse(raw)}catch{return json(res,502,{error:'INVALID_MODEL_OUTPUT',reason:raw?'unparsable_json':'empty_content',finishReason:result?.candidates?.[0]?.finishReason||'unknown'})}
    const reply=clean(output.reply,220),question=chatMode?clean(output.question,140):'';
    if(reply.length<8||reply.length>220||!FACES.has(output.face)||typeof output.needsAdult!=='boolean'||(chatMode&&(!question||question.length>140||(question.match(/[?？]/g)||[]).length>1))){
      return json(res,502,{error:'INVALID_MODEL_OUTPUT',reason:'invalid_structure',replyLength:reply.length,faceValid:FACES.has(output.face),adultFlagValid:typeof output.needsAdult==='boolean'});
    }
    return json(res,200,{reply,question,face:output.face,needsAdult:output.needsAdult,source:'gemini-2.5-flash'});
  }catch{
    return json(res,502,{error:'AI_TEMPORARILY_UNAVAILABLE'});
  }
}
