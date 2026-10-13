// Offline regression for conversational craftsmanship; no real Gemini calls.
import handler from '../api/reflect-v2.mjs';
Object.assign(process.env,{MIMO_AI_ENABLED:'true',MIMO_CLASS_CODE:'ephemeral-test-only',GEMINI_API_KEY:'mock'});
let seen=null;
globalThis.fetch=async(_url,options)=>{
 seen=JSON.parse(options.body);
 const reply={reply:'你很在意這段相處，現在想慢慢整理。',question:'你想從哪裡開始整理呢？',face:'listen',move:'story',skill:'simple_reflection',riskLevel:'none',needsAdult:false,thread:{event:'同學未經同意修改孩子畫的海報',importance:'作品沒被尊重',openLoop:'同學動機不明'}};
 return{ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(reply)}]}}]})};
};
const previous=[{role:'user',text:'同學修改我的海報。'},{role:'mimo',text:'你很在意自己的海報。'},{role:'user',text:'我花了很多時間完成。'},{role:'mimo',text:'你花了很多時間完成它。'}];
const req={method:'POST',headers:{origin:'https://mimo-reflection-lab.vercel.app',host:'mimo-reflection-lab.vercel.app','x-mimo-class-code':'ephemeral-test-only','content-type':'application/json','x-forwarded-for':'192.0.2.54'},body:{fictional:true,answer:'我想整理一下，因為她沒有先問我。',supportMode:'clarify',history:previous,thread:{event:'同學未經同意修改孩子畫的海報',importance:'作品沒被尊重',openLoop:'不知道為什麼修改'},turnCount:3}};
const res={statusCode:200,setHeader(){},end(s){this.result=JSON.parse(s)}};
await handler(req,res);
const modelPayload=JSON.parse(seen.contents[0].parts[0].text);
const tests=[
 {test:'varied opener instruction',pass:/不要再用/.test(modelPayload.voice_instruction)},
 {test:'no generic restart question',pass:!res.result.question?.includes('從哪')},
 {test:'grounded summary',pass:res.result.reply.includes('海報')&&res.result.reply.includes('尊重')},
 {test:'continuity repair labeled',pass:res.result.source==='continuity-repair'},
 {test:'student autonomy preserved',pass:res.result.needsAdult===false}
];
console.log('CONVERSATION_GATE '+JSON.stringify({passed:tests.filter(x=>x.pass).length,total:tests.length,tests,reply:res.result.reply,question:res.result.question}));
if(tests.some(x=>!x.pass))process.exitCode=1;
