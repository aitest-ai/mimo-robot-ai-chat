// Deterministic long-session memory regression tests. No model calls, no secrets.
import handler from '../api/reflect-v2.mjs';
Object.assign(process.env,{MIMO_AI_ENABLED:'true',MIMO_PUBLIC_DEMO_ENABLED:'true',MIMO_CLASS_CODE:'qa-local-only',GEMINI_API_KEY:'not-a-real-key'});
let upstream=0,lastPayload=null,reply={
 reply:'我記得你後來更正，故事裡的海報是綠色月亮，而你最在意的是沒先被問過。',
 question:'',face:'listen',move:'stay',skill:'reflect_meaning',riskLevel:'none',needsAdult:false,
 thread:{event:'畫著綠色月亮的海報被修改',importance:'沒先問過',openLoop:''},
 memory:{summary:'虛構故事：綠色月亮海報被人未經同意修改，孩子最在意事前沒有被問過。',
 facts:['海報畫的是綠色月亮。'],uncertainties:['不知道同學真正的想法。'],
 boundaries:['孩子不希望被要求換位思考。'],plans:['如果有需要會找老師協助。'],milestones:['海報未先徵求同意就被修改。']}
};
globalThis.fetch=async(_,options)=>{
 upstream++;lastPayload=JSON.parse(options.body);
 return{ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(reply)}]}}]})};
};
let counter=0;async function call(answer,extra={},teacher=false){
 const req={method:'POST',headers:{host:'mimo-reflection-lab.vercel.app',origin:'https://mimo-reflection-lab.vercel.app','content-type':'application/json','x-forwarded-for':'192.0.2.'+(++counter),...(teacher?{'x-mimo-class-code':'qa-local-only'}:{'x-mimo-demo':'fictional-practice-v1'})},
 body:{fictional:true,answer,publicDemo:!teacher,demoCase:'poster',supportMode:'listen',history:[],memory:{summary:'',facts:[],uncertainties:[],boundaries:[],plans:[],milestones:[]},thread:{},...extra}};
 const res={statusCode:200,setHeader(){},end(body){this.body=JSON.parse(body)}};
 await handler(req,res);return{status:res.statusCode,body:res.body};
}
const tests=[];const check=(name,pass,info)=>tests.push({name,pass:Boolean(pass),info});
const oldMemory={summary:'很久以前：孩子在虛構美勞課畫的是綠色月亮，最在意沒先被問。',facts:['海報上有綠色月亮。'],uncertainties:[],boundaries:['不要換位思考。'],plans:[],milestones:['畫了綠色月亮海報。']};
const history=Array.from({length:20},(_,i)=>({role:i%2?'mimo':'user',text:'另一段虛構對話第'+i+'則，討論如何整理桌面。'}));
const initial=await call('很久以前的海報畫的是什麼？我在意什麼？',{memory:oldMemory,history,turnCount:31});
check('Long memory provided even when initial turn outside recent sixteen',initial.status===200&&lastPayload.contents[0].parts[0].text.includes('綠色月亮'),initial.body);
const input=JSON.parse(lastPayload.contents[0].parts[0].text);
check('Recent sixteen capped',input.recent_turns.length===16,input.recent_turns.length);
check('Prior boundary sent back',input.long_memory.boundaries.includes('不要換位思考。'),input.long_memory.boundaries);
check('Updated memory returned in same response',initial.body.memory?.facts?.[0]?.includes('綠色月亮'),initial.body.memory);
const before=upstream;
const refusal=await call('我不要再換位思考，也不想體諒對方。',{memory:oldMemory});
check('Rule-based refusal preserved to long memory',refusal.status===200&&refusal.body.memory.boundaries.some(x=>x.includes('換位')),refusal.body.memory?.boundaries);
check('Rule-based refusal needs no model',upstream===before,upstream);
const pii=await call('我只是想說說故事。',{memory:{...oldMemory,summary:'我叫王小明，我住在某個地方。'}});
check('Server rejects PII-like long memory',pii.status===422&&pii.body.error==='PUBLIC_DEMO_NO_PERSONAL_DETAILS',pii);
const danger=await call('我快忍不住動手了，我想揍他。',{memory:oldMemory});
check('Safety still has priority over long memory',danger.status===200&&danger.body.needsAdult===true, danger);
console.log('MEMORY_SMOKE '+JSON.stringify({passed:tests.filter(t=>t.pass).length,total:tests.length,tests}));
if(tests.some(t=>!t.pass))process.exitCode=1;
