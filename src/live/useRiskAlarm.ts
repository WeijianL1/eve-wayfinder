import {useEffect,useRef,useState} from 'react';
import {createAlarmTracker,type AlarmPlayer} from './risk-alarm';
const key='eve-master:local:alarm-enabled';
export function useRiskAlarm(players:AlarmPlayer[]){
 const [enabled,setEnabled]=useState(()=>{try{return localStorage.getItem(key)!=='false';}catch{return true;}}),[ready,setReady]=useState(false),[message,setMessage]=useState(''),[audioError,setAudioError]=useState('');
 const context=useRef<AudioContext|null>(null),nodes=useRef<OscillatorNode[]>([]),tracker=useRef(createAlarmTracker()),mounted=useRef(true);
 function silence(){for(const node of nodes.current){try{node.stop();}catch{}node.disconnect();}nodes.current=[];}
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;silence();void context.current?.close();context.current=null;};},[]);
 async function prepare(){if(!enabled)return false;try{if(!context.current)context.current=new AudioContext();await context.current.resume();if(!mounted.current)return false;const running=context.current.state==='running';setReady(running);setAudioError(running?'':'浏览器暂停了音频，请点击试听警报');return running;}catch{if(mounted.current){setReady(false);setAudioError('音频不可用，请检查浏览器声音权限；风险颜色仍正常显示。');}return false;}}
 function tone(critical:boolean){const c=context.current;if(!c||c.state!=='running')return false;silence();const start=c.currentTime;for(let i=0;i<(critical?4:3);i++){const oscillator=c.createOscillator(),gain=c.createGain(),at=start+i*.24;oscillator.type='sine';oscillator.frequency.setValueAtTime(critical?(i%2?980:740):660,at);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.13,at+.015);gain.gain.exponentialRampToValueAtTime(.001,at+.17);oscillator.connect(gain);gain.connect(c.destination);oscillator.start(at);oscillator.stop(at+.19);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();nodes.current=nodes.current.filter(n=>n!==oscillator);};nodes.current.push(oscillator);}return true;}
 const signature=JSON.stringify(players);
 useEffect(()=>{if(!enabled||!ready||context.current?.state!=='running')return;const events=tracker.current.next(players);if(!events.length)return;const critical=events.some(p=>p.tone==='critical');if(tone(critical))setMessage(`${critical?'很高':'高'}风险警报已触发：${events.slice(0,3).map(p=>p.name).join('、')}${events.length>3?` 等 ${events.length} 人`:''}`);},[signature,enabled,ready]);
 function toggle(value:boolean){setEnabled(value);try{localStorage.setItem(key,String(value));}catch{}if(!value){silence();setMessage('声音已静音');}else{tracker.current.clear();try{if(!context.current)context.current=new AudioContext();void context.current.resume().then(()=>{if(mounted.current)setReady(context.current?.state==='running');}).catch(()=>{if(mounted.current)setAudioError('请点击试听警报启用浏览器声音');});}catch{setAudioError('此浏览器无法播放警报');}}}
 async function test(){if(!enabled)return;if(await prepare())if(tone(true))setMessage('已触发试听警报');}
 return {enabled,ready,message,audioError,prepare,toggle,test,silence};
}
