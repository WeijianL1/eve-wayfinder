import english from './en.json' with {type:'json'};
export type Locale='zh-CN'|'en';
const storageKey='eve-wayfinder:locale';
let locale:Locale='zh-CN';
try{if(globalThis.localStorage?.getItem(storageKey)==='en')locale='en';}catch{/* Storage is optional. */}
const listeners=new Set<()=>void>();
export const getLocale=()=>locale;
export const localeTag=()=>locale==='en'?'en-US':'zh-CN';
export function setLocale(value:Locale){
 if(value!=='en'&&value!=='zh-CN')return;
 locale=value;try{globalThis.localStorage?.setItem(storageKey,value);}catch{/* Keep this tab working. */}
 if(typeof document!=='undefined')document.documentElement.lang=value;
 listeners.forEach(notify=>notify());
}
export function subscribeLocale(notify:()=>void){listeners.add(notify);return()=>{listeners.delete(notify);};}
const dictionary:Record<string,string>=english;
const escape=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const phrases=Object.keys(dictionary).sort((a,b)=>b.length-a.length);
const pattern=new RegExp(phrases.map(escape).join('|'),'g');
const cache=new Map<string,string>();
function englishText(value:string){
 if(Object.hasOwn(dictionary,value))return dictionary[value];
 const cached=cache.get(value);if(cached!==undefined)return cached;
 const parts:string[]=[];let end=0;
 for(const match of value.matchAll(pattern)){parts.push(value.slice(end,match.index),dictionary[match[0]]);end=match.index+match[0].length;}
 parts.push(value.slice(end));
 const result=parts.filter(Boolean).reduce((text,part)=>text+(/[A-Za-z0-9]$/.test(text)&&/^[A-Za-z0-9]/.test(part)?' ':'')+part,'');
 if(cache.size>=2048)cache.clear();cache.set(value,result);return result;
}
// Translate presentation values only; objects, API payloads and business identifiers stay intact.
export function translate<T>(value:T):T{
 if(locale!=='en')return value;
 if(Array.isArray(value))return value.map(translate) as T;
 if(typeof value!=='string')return value;
 return englishText(value) as T;
}
