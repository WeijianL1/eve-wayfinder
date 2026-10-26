import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let busy=false;
export function recognizeLocal(image){
 if(busy)return Promise.reject(Object.assign(Error('OCR 正在处理上一帧，请稍后重试'),{status:429}));
 if(typeof image!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(image)||image.length>4000000)return Promise.reject(Object.assign(Error('请提供不超过 3MB 的 PNG 名单截图'),{status:400}));
 if(process.platform!=='darwin')return Promise.reject(Object.assign(Error('本地 OCR 当前需要 macOS Vision'),{status:503}));
 busy=true;return new Promise((resolve,reject)=>{
 const child=spawn(process.env.EVE_OCR_PYTHON||path.join(root,'.local-data/ocr-venv/bin/python'),[path.join(root,'scripts/ocr-local.py')],{stdio:['pipe','pipe','pipe']});let output='',errors='',done=false;
 const finish=(err,value)=>{if(done)return;done=true;clearTimeout(timer);busy=false;if(err)reject(err);else resolve(value);};
 const timer=setTimeout(()=>{child.kill('SIGKILL');finish(Error('本地 OCR 超时'));},20000);
 child.on('error',()=>finish(Object.assign(Error('OCR 环境未安装，请运行 npm run setup:ocr'),{status:503})));
 child.stdout.on('data',d=>{output+=d;if(output.length>200000){child.kill('SIGKILL');finish(Error('OCR 输出过大'));}});child.stderr.on('data',d=>{if(errors.length<2000)errors+=d;});
 child.on('close',code=>{if(code!==0){finish(Error('本地 OCR 失败，请检查图片和 OCR 环境'));return;}try{finish(null,JSON.parse(output));}catch{finish(Error('OCR 返回格式无效'));}});
 child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify({image:image.split(',')[1]}));
 });
}
export function localNameCandidates(lines){
 const seen=new Set();return lines.filter(l=>{const name=l.text.trim().replace(/\s+/g,' ');if(l.confidence<.2||name.length<3||name.length>37||!/[A-Za-z]/.test(name)||! /^[A-Za-z0-9 '|\-]+$/.test(name)||/^(local|corp|alliance|fleet|channel|members|eve system|no scan results)$/i.test(name)||seen.has(name.toLowerCase()))return false;seen.add(name.toLowerCase());l.text=name;return true;}).slice(0,50).map(l=>({name:l.text,confidence:l.confidence,needsReview:/\b[Il1]{2,}\b|\|/.test(l.text)}));
}
