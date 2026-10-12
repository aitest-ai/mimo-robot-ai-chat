// Mimo SEL AI — optional, teacher-controlled research API.
// Vercel Node Function. Never log student submissions. No database.
import { timingSafeEqual } from 'node:crypto';

const MAX_BYTES = 7500;
const FACES = new Set(['calm','listen','soft','guard','hurt','question']);
const STAGES = ['安全確認','辨識心情','情緒調節','表達主觀經驗','釐清觀察與推測','換位與界線','學習遷移'];
const FIELDS = new Set(['safety','weather','strength','feeling','strategy','after','breath','story','quote','fact','guess','unknown','expression','reaction','perspective','perspectiveNote','action','newWords','nextTime','end']);
const CONTEXT = ['weather','feeling','strength','story','quote','fact','guess','unknown','reaction','perspective','action'];
const SENSITIVE = /(?:自殺|想死|不想活|傷害自己|割腕|性侵|被強迫|有人打我|一直被霸凌|被威脅|家暴)/u;
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
    return json(res,200,{mode:'research-pilot',ready:process.env.MIMO_AI_ENABLED==='true'&&Boolean(process.env.MIMO_CLASS_CODE)&&Boolean(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN||req.headers['x-vercel-oidc-token']),privacy:'fictional-test-only',autoNotify:false});
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
  if(!Number.isInteger(stage)||stage<0||stage>6||!FIELDS.has(field)||!answer)return json(res,422,{error:'INVALID_INPUT'});
  if(field==='safety'&&answer==='unsafe')return json(res,200,{reply:'如果有人威脅、傷害或持續欺負你，請先找可信任的大人。這個網站不會通知任何人。',face:'guard',needsAdult:true,source:'safety-rule'});
  const context={};
  const userContext=incoming.context&&typeof incoming.context==='object'?incoming.context:{};
  for(const key of CONTEXT){const v=clean(userContext[key],240);if(v)context[key]=v}
  if(SENSITIVE.test(answer)||Object.values(context).some(v=>SENSITIVE.test(v))){
    return json(res,200,{reply:'如果你可能正受到傷害，這件事需要可信任的大人一起處理。你不用一個人面對，也不用勉強換位思考。',face:'listen',needsAdult:true,source:'safety-rule'});
  }
  const token=process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN||req.headers['x-vercel-oidc-token'];
  if(!token)return json(res,503,{error:'GATEWAY_NOT_CONFIGURED'});
  // No identity or original recording is sent; this still transmits user-entered text to an AI provider.
  const system=[
    '你是臺灣國小四至六年級的社會情緒學習 SEL 引導助教 Mimo，處理的是經教師監督的**虛構案例**，不是心理師、調查員或診斷工具。',
    '孩子此刻只需要在一個問題的回答後獲得有溫度的簡短回饋，不要再提出新問題；不急著教訓或套用一模一樣的安慰話。',
    '必須具體回應使用者實際選的詞、說的事件或提到的需要；若只有一個情緒標籤，簡短承接即可，不編造經過。',
    '不假定任何人故意做壞事；孩子說的事實仍未被獨立驗證；對他人立場僅使用「可能」「也許」，不替欺負、歧視與暴力辯護。',
    '尊重自我界線，不要求孩子道歉、原諒或和好；可選擇求助。不描述 AI 已看見現場或辨識真正情緒。',
    '階段 1-2 專注情緒覺察與自我調節，階段 3 先傾聽，階段 4 才談觀察與推測，階段 5 提供換位假設，階段 6 協助可執行的下一步。',
    '同一句話不要反覆用「謝謝你分享」。使用繁體中文、臺灣國小孩子聽得懂的語句，1–2 句，總長約 30–75 字。',
    '嚴格只輸出 JSON 物件，格式為 {"reply":"文字","face":"calm|listen|soft|guard|hurt|question","needsAdult":false}，不可增加別的欄位。needsAdult 視情境可能為 true。不得輸出 Markdown。',
    '如果孩子描述急迫危險、自傷、他傷、持續霸凌或性／身體傷害，不進行換位模擬，needsAdult=true，先建議立即找可信任大人與正式協助。不要承諾自動通知。',
  ].join('\n');
  const user=JSON.stringify({learning_stage:STAGES[stage],stage,question_field:field,student_answer:answer,student_confirmed_context:context},null,0);
  try{
    const api=await fetch('https://ai-gateway.vercel.sh/v1/chat/completions',{
      method:'POST',
      headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:process.env.MIMO_AI_MODEL||'openai/gpt-5.4-mini',
        messages:[{role:'system',content:system},{role:'user',content:user}],
        temperature:0.35,max_tokens:220,stream:false,
        response_format:{type:'json_object'}
      }),
      signal:AbortSignal.timeout(12000),
    });
    if(!api.ok)return json(res,502,{error:'GATEWAY_UNAVAILABLE'});
    const result=await api.json();
    const message=result?.choices?.[0]?.message?.content;
    const raw=typeof message==='string'?message:'';
    let output;
    try{output=JSON.parse(raw)}catch{return json(res,502,{error:'INVALID_MODEL_OUTPUT'})}
    const reply=clean(output.reply,220);
    if(reply.length<8||reply.length>220||!FACES.has(output.face)||typeof output.needsAdult!=='boolean'){
      return json(res,502,{error:'INVALID_MODEL_OUTPUT'});
    }
    return json(res,200,{reply,face:output.face,needsAdult:output.needsAdult,source:'ai-gateway'});
  }catch{
    return json(res,502,{error:'AI_TEMPORARILY_UNAVAILABLE'});
  }
}
