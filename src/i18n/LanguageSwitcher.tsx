import {useSyncExternalStore} from 'react';
import {getLocale,setLocale,subscribeLocale,type Locale} from './index';
export default function LanguageSwitcher(){
 const locale=useSyncExternalStore(subscribeLocale,getLocale,getLocale);
 return <label className="language-switcher"><span aria-hidden="true">文 / A</span><select aria-label="Language / 语言" value={locale} onChange={event=>setLocale(event.target.value as Locale)}><option value="zh-CN">中文</option><option value="en">English</option></select></label>;
}
