import {translate,getLocale,subscribeLocale} from './i18n';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './prototype/App';
import LiveApp from './live/LiveApp';
import './prototype/styles.css';
import './live/styles.css';
class PrototypeBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){if(this.state.failed)return <div style={{padding:60,color:'#d4dee5'}}><h1>{translate("原型状态需要重置")}</h1><p>{translate("可以清除本地原型记录并重新进入；不会影响 EVE 账号。")}</p><button onClick={()=>{localStorage.removeItem('eve-master:prototype:v1');location.reload();}}>{translate("重置并重新进入")}</button></div>;return this.props.children;}
}
function Workspace(){const locale=React.useSyncExternalStore(subscribeLocale,getLocale,getLocale);React.useEffect(()=>{document.documentElement.lang=locale;},[locale]);const [demo,setDemo]=React.useState(new URLSearchParams(location.search).get('mode')==='demo');function mode(value:boolean){const url=new URL(location.href);if(value)url.searchParams.set('mode','demo');else url.searchParams.delete('mode');history.replaceState(null,'',url);setDemo(value);}return demo?<><App/><button className="live-mode-return" onClick={()=>mode(false)}>{translate("切换真实数据 ↗")}</button></>:<LiveApp onDemo={()=>mode(true)}/>;}
createRoot(document.getElementById('root')!).render(<React.StrictMode><PrototypeBoundary><Workspace/></PrototypeBoundary></React.StrictMode>);
