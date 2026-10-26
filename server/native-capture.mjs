import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function createNativeCapture(){
 let busy=false;
 function run(input){
  if(process.platform!=='darwin')throw Object.assign(Error('原生窗口检测当前仅支持 macOS，可改用浏览器共享'),{status:503});
  if(busy)throw Object.assign(Error('原生截图正在处理，请稍后重试'),{status:429});
  busy=true;return new Promise((resolve,reject)=>{let output='',done=false;const child=spawn(process.env.EVE_OCR_PYTHON||path.join(root,'.local-data/ocr-venv/bin/python'),[path.join(root,'scripts/eve-window-capture.py')],{stdio:['pipe','pipe','pipe']});
   const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);busy=false;error?reject(error):resolve(value);};
   const timer=setTimeout(()=>{child.kill('SIGKILL');finish(Error('原生截图超时，请确认 EVE 窗口可见'));},30000);
   child.on('error',()=>finish(Object.assign(Error('原生捕获环境未安装，请运行 npm run setup:ocr'),{status:503})));
   child.stdout.on('data',d=>{output+=d;if(output.length>32_000_000){child.kill('SIGKILL');finish(Error('窗口图像过大'));}});child.stderr.on('data',()=>{});
   child.on('close',code=>{if(code!==0){finish(Error('原生捕获进程失败，请运行 npm run setup:ocr 检查环境'));return;}try{const result=JSON.parse(output);if(result.error)finish(Object.assign(Error(result.error),{status:result.status||503}));else finish(null,result);}catch{finish(Error('原生截图返回无效'));}});
   child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(input));
  });
 }
 return {list:()=>run({action:'list'}),frame(input){if(!Number.isSafeInteger(input.windowId)||input.windowId<=0||!Number.isSafeInteger(input.pid)||input.pid<=0)throw Object.assign(Error('EVE 窗口标识无效'),{status:400});return run({action:'frame',windowId:input.windowId,pid:input.pid});}};
}
