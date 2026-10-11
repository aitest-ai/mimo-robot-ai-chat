import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||3000);
const ollama=process.env.OLLAMA_URL||'http://127.0.0.1:11434';
const host=process.env.HOST||'127.0.0.1';
const systemMessage={role:'system',content:'你是一個名叫 Mimo 的友善 AI 助手。請依使用者使用的語言回覆。若使用者以繁體中文提問，使用臺灣繁體中文與臺灣用詞。內容應正確、有條理、不過度冗長；遇到不確定的事情請坦承。你正在一個配備動畫機器人頭部的聊天網頁中。'};
const json=(res,status,payload)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(payload));};
function body(req,maxBytes=256_000){return new Promise((resolve,reject)=>{let raw='',size=0;req.on('data',chunk=>{size+=chunk.length;if(size>maxBytes){reject(new Error('訊息長度超過限制'));req.destroy();return}raw+=chunk.toString('utf8')});req.on('end',()=>{try{resolve(JSON.parse(raw))}catch{reject(new Error('JSON 格式錯誤'))}});req.on('error',reject)})}
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&(u.pathname==='/'||u.pathname==='/index.html')){
  try{const html=await readFile(join(here,'index.html'));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(html)}catch{json(res,500,{error:'讀取網頁失敗'})}return;
 }
 if(req.method==='GET'&&u.pathname==='/api/models'){
  try{const upstream=await fetch(ollama+'/api/tags',{signal:AbortSignal.timeout(9000)});if(!upstream.ok)throw Error('Ollama HTTP '+upstream.status);const data=await upstream.json();json(res,200,{models:(data.models||[]).map(({name,model})=>({name:name||model,model}))})}
  catch(err){json(res,502,{error:'Ollama 尚未啟動，或無法連線：'+err.message})}return;
 }
 if(req.method==='POST'&&u.pathname==='/api/chat'){
  let payload;try{payload=await body(req)}catch(err){if(!res.destroyed)json(res,400,{error:err.message});return}
  const messages=payload?.messages;const model=payload?.model;
  if(typeof model!=='string'||!model||model.length>120||!Array.isArray(messages)||messages.length>30||messages.length<1||!messages.every(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string'&&m.content.length<=6000)){
   json(res,400,{error:'請先選擇有效模型，並確認對話訊息格式'});return;
  }
  const controller=new AbortController();res.on('close',()=>{if(!res.writableEnded)controller.abort()});
  try{
   const upstream=await fetch(ollama+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,messages:[systemMessage,...messages],stream:true}),signal:controller.signal});
   if(!upstream.ok){const detail=(await upstream.text()).slice(0,200);json(res,502,{error:'Ollama '+upstream.status+'：'+detail});return}
   res.writeHead(200,{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
   for await(const chunk of upstream.body){if(res.destroyed)break;res.write(chunk)}
   res.end();
  }catch(err){if(!res.headersSent){if(!res.destroyed)json(res,502,{error:'Ollama 連線失敗：'+err.message})}else if(!res.destroyed){res.write(JSON.stringify({error:err.message})+'\n');res.end()}}
  return;
 }
 json(res,404,{error:'找不到這個路徑'});
});
server.listen(port,host,()=>{
 console.log(`\nMIMO 聊天室已啟動：http://${host}:${port}`);
 console.log('不用 API 即可在「模擬聊天」模式操作。');
 console.log(`Ollama 代理：${ollama}（僅在選擇 Ollama 模式時使用）\n`);
});
