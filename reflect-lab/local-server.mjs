/**
 * Mimo 本機版：直接沿用 reflect-lab 的最新網頁與 API。
 * Node.js >=18；只監聽 127.0.0.1，不把 Gemini API Key 放進 HTML。
 * 僅供虛構校園案例研究測試，非正式兒少心理諮商服務。
 */
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {randomBytes} from 'node:crypto';
import reflectHandler from './api/reflect-v2.mjs';
import reviewerHandler from './api/qa-review.mjs';

const base=dirname(fileURLToPath(import.meta.url));
const HOST='127.0.0.1';
const PORT=Number(process.env.MIMO_LOCAL_PORT||8787);
const PUBLIC_BASE='http://'+HOST+':'+PORT;

if(!Number.isInteger(PORT)||PORT<1024||PORT>65535)throw Error('MIMO_LOCAL_PORT must be between 1024 and 65535.');

const keyPath=join(base,'gemini-key.txt');
let key=(process.env.GEMINI_API_KEY||'').trim();
if(!key&&existsSync(keyPath)){
  key=(await readFile(keyPath,'utf8')).replace(/^\uFEFF/,'').trim();
}
const looksLikeKey=key.startsWith('AIza')&&key.length>=28&&!/\s/.test(key);
const hasKey=Boolean(looksLikeKey);
if(hasKey)process.env.GEMINI_API_KEY=key;
else delete process.env.GEMINI_API_KEY;

process.env.MIMO_AI_MODEL='gemini-2.5-flash';
process.env.MIMO_AI_ENABLED=hasKey?'true':'false';
process.env.MIMO_PUBLIC_DEMO_ENABLED=hasKey?'true':'false';
// Server-only random shared code: never stored in static files or served to the browser.
process.env.MIMO_CLASS_CODE=process.env.MIMO_LOCAL_TEACHER_CODE||randomBytes(18).toString('hex');
const teacherSet=Boolean(process.env.MIMO_LOCAL_TEACHER_CODE);

const staticFiles=new Map([
  ['/','index.html'],
  ['/index.html','index.html'],
  ['/chat.js','chat.js'],
  ['/chat.css','chat.css']
]);
const mime={'html':'text/html; charset=utf-8','js':'text/javascript; charset=utf-8','css':'text/css; charset=utf-8'};
const MAX_BODY=13000;

function response(res,status,body,contentType='application/json; charset=utf-8'){
  res.writeHead(status,{
    'Content-Type':contentType,
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'Access-Control-Allow-Origin':PUBLIC_BASE,
    'Cross-Origin-Resource-Policy':'same-origin',
    'Content-Security-Policy':"default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'"
  });
  res.end(typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body));
}
const server=http.createServer(async(req,res)=>{
 try {
  const requestUrl=new URL(req.url,PUBLIC_BASE);
  // Explicit host binding and same-origin POST, to block other websites from consuming local Gemini quota.
  if(req.headers.host!==HOST+':'+PORT)return response(res,403,{error:'BAD_HOST'});
  if(req.method==='GET'&&staticFiles.has(requestUrl.pathname)){
    const fileName=staticFiles.get(requestUrl.pathname);
    const content=await readFile(join(base,fileName));
    return response(res,200,content,mime[fileName.split('.').at(-1)]);
  }
  if(requestUrl.pathname==='/api/reflect-v2'||requestUrl.pathname==='/api/qa-review'){
    if(!['GET','POST'].includes(req.method))return response(res,405,{error:'METHOD'});
    if(req.method==='POST'){
      const origin=req.headers.origin;
      if(origin!==PUBLIC_BASE)return response(res,403,{error:'LOCAL_ORIGIN'});
      // Reject cross-site CSRF even when attackers try using fetch(no-cors).
      if(req.headers['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin')return response(res,403,{error:'CROSS_SITE'});
      if(Number(req.headers['content-length']||0)>MAX_BODY)return response(res,413,{error:'BODY_TOO_LARGE'});
    }
    // Vercel's original handler checks HTTPS production origin; on localhost
    // we validate HTTP origin above, then use a synthetic internal origin for just this handler.
    req.headers.origin='https://'+req.headers.host;
    req.headers['x-forwarded-for']='127.0.0.1';
    return await (requestUrl.pathname==='/api/qa-review'?reviewerHandler:reflectHandler)(req,res);
  }
  return response(res,404,{error:'NOT_FOUND'});
 }catch(err){
  console.error('Mimo local error:',err?.message||String(err));
  if(!res.headersSent)return response(res,500,{error:'LOCAL_SERVER_ERROR'});
  res.end();
 }
});
server.on('error',err=>{
 console.error('無法啟動本機 Mimo：'+(err.code==='EADDRINUSE'?'8787 埠已經被另一個程式占用。':err.message));
 process.exitCode=1;
});
server.listen(PORT,HOST,()=>{
  console.log('\n========================================');
  console.log(' Mimo 心晴之鏡｜本機測試版');
  console.log(' 網址：'+PUBLIC_BASE);
  console.log(' Gemini：'+(hasKey?'已啟用 gemini-2.5-flash':'未啟用（僅固定引導）'));
  if(!hasKey)console.log(' 請在 gemini-key.txt 貼上你自己的 Gemini API Key，儲存後重啟。');
  if(teacherSet)console.log(' 教師／QA 模式：已由本機環境變數設定（不顯示金鑰）。');
  console.log(' 僅限虛構校園故事；切勿輸入真實學生個資。');
  console.log(' 按 Ctrl+C 關閉本機服務。');
  console.log('========================================\n');
});
