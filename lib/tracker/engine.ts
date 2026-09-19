export type Position = {coin:string;size:number;entry:number;mark:number;notional:number;pnl:number;roe:number;leverage:number};
export type TrackerEvent = {id:string;coin:string;type:string;time:number;importance:"HIGH"|"MEDIUM"|"LOW";before:Position|null;after:Position|null;source:"REST";};
// A REST observation is not an execution: close price / realized PnL stay unknown.
export function reconcile(previous:Position[]|null,current:Position[],time:number,lastAlerts:Record<string,number>={}):TrackerEvent[]{
  if(previous===null)return [];
  const events:TrackerEvent[]=[];
  const emit=(coin:string,type:string,before:Position|null,after:Position|null,importance:TrackerEvent["importance"])=>events.push({id:`${time}:${coin}:${type}`,coin,type,time,importance,before,after,source:"REST"});
  for(const coin of new Set([...previous,...current].map(p=>p.coin))){
    const a=previous.find(p=>p.coin===coin)||null,b=current.find(p=>p.coin===coin)||null;
    if(!a&&b){emit(coin,"OPEN",null,b,"HIGH");continue}
    if(a&&!b){emit(coin,"CLOSE",a,null,"HIGH");continue}
    if(!a||!b)continue;
    if(Math.sign(a.size)!==Math.sign(b.size)){emit(coin,"CLOSE",a,null,"HIGH");emit(coin,"OPEN",null,b,"HIGH");continue}
    const delta=Math.abs(b.size)-Math.abs(a.size);
    if(Math.abs(delta)>1e-9)emit(coin,delta>0?"ADD":"REDUCE",a,b,Math.abs(delta)/Math.abs(a.size)>=.5?"MEDIUM":"LOW");
    else if(Math.abs(b.roe-a.roe)>=.05&&time-(lastAlerts[coin]||0)>=1800000)emit(coin,b.pnl>a.pnl?"PNL_SURGE":"PNL_DROP",a,b,"HIGH");
  }
  return events;
}
type Point=[number,number];
export function performance(raw:unknown,key:string,now=Date.now()){
  const bucket=Array.isArray(raw)?raw.find(x=>Array.isArray(x)&&x[0]===key)?.[1]:null;
  const pairs=(x:unknown):Point[]=>Array.isArray(x)?x.map(p=>[Number(p[0]),Number(p[1])] as Point).filter(p=>p.every(Number.isFinite)).sort((a,b)=>a[0]-b[0]):[];
  const values=pairs(bucket?.accountValueHistory),pnl=pairs(bucket?.pnlHistory);
  const days=key==="week"?7:key==="month"?30:0;
  const duration=values.length>1?values.at(-1)![0]-values[0][0]:0;
  const fresh=values.length>1&&now-values.at(-1)![0]<86400000&&values.at(-1)![0]<=now+60000;
  const covered=fresh&&pnl.length>1&&Math.abs(pnl[0][0]-values[0][0])<3600000&&Math.abs(pnl.at(-1)![0]-values.at(-1)![0])<3600000&&duration>=(days-.3)*86400000;
  let area=0;for(let i=1;i<values.length;i++)area+=(values[i][0]-values[i-1][0])*(values[i][1]+values[i-1][1])/2;
  const average=duration>0?area/duration:0;
  const gain=pnl.length>1?pnl.at(-1)![1]-pnl[0][1]:null;
  return {values,pnl,accountValue:values.at(-1)?.[1]??null,gain,returnProxy:covered&&average>0&&gain!==null?gain/average:null,quality:"REVIEW" as const,covered};
}
// Only use after the caller has validated ledger completeness and account scope.
export function modifiedDietz(start:number,end:number,from:number,to:number,flows:{time:number;amount:number}[],verified:boolean){
  if(!verified||to<=from||!Number.isFinite(start)||!Number.isFinite(end)||flows.some(f=>!Number.isFinite(f.amount)||f.time<from||f.time>to))return null;
  const capital=start+flows.reduce((s,f)=>s+f.amount*(to-f.time)/(to-from),0);
  return capital>0?(end-start-flows.reduce((s,f)=>s+f.amount,0))/capital:null;
}
