import {traders} from "./traders.ts";
import {performance,type Position} from "./engine.ts";
export async function info(type:string,user?:string,extra:Record<string,unknown>={}):Promise<any>{
  const r=await fetch("https://api.hyperliquid.xyz/info",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type,...(user?{user}:{}),...extra}),signal:AbortSignal.timeout(12000),cache:"no-store"});
  if(!r.ok)throw new Error(`Hyperliquid ${r.status}`);
  return r.json();
}
export async function liveTrader(id:string){
  const trader=traders.find(t=>t.id===id);if(!trader)throw new Error("Unknown trader");
  const [portfolioResult,dexResult,fillsResult]=await Promise.allSettled([info("portfolio",trader.address),info("perpDexs"),info("userFills",trader.address)]);
  const errors:string[]=[];
  const portfolio=portfolioResult.status==="fulfilled"?portfolioResult.value:[];if(portfolioResult.status==="rejected")errors.push("収益履歴を取得できません");
  const dexes=dexResult.status==="fulfilled"&&Array.isArray(dexResult.value)?["",...dexResult.value.filter(Boolean).map((d:any)=>d.name).filter(Boolean)]:[""];
  if(dexResult.status==="rejected")errors.push("追加市場の一覧を取得できません");
  const positions:Position[]=[];
  // Keep concurrency low across builder-deployed markets.
  for(let i=0;i<dexes.length;i+=3){
    const states=await Promise.allSettled(dexes.slice(i,i+3).map(dex=>info("clearinghouseState",trader.address,{dex})));
    for(const state of states){
      if(state.status==="rejected"){errors.push("一部市場の持ち高を取得できません");continue}
      if(!Array.isArray(state.value?.assetPositions)){errors.push("持ち高データの形式を確認できません");continue}
      for(const {position:p} of state.value.assetPositions){
        const size=Number(p.szi);if(!Number.isFinite(size)||!size)continue;
        positions.push({coin:p.coin,size,entry:Number(p.entryPx),mark:Number(p.positionValue)/Math.abs(size),notional:Number(p.positionValue),pnl:Number(p.unrealizedPnl),roe:Number(p.returnOnEquity),leverage:Number(p.leverage?.value)});
      }
    }
  }
  const fills=fillsResult.status==="fulfilled"&&Array.isArray(fillsResult.value)?fillsResult.value:[];if(fillsResult.status==="rejected")errors.push("直近の約定を取得できません");
  const perps=fills.filter((f:any)=>!/^[@#]|\//.test(f.coin));
  return {trader,updatedAt:Date.now(),positions:positions.sort((a,b)=>b.notional-a.notional),positionsComplete:!errors.some(e=>e.includes("市場")||e.includes("持ち高")),performance:{week:performance(portfolio,"week"),month:performance(portfolio,"month"),all:performance(portfolio,"allTime")},lastActivity:perps.length?Math.max(...perps.map((f:any)=>Number(f.time))):null,errors:[...new Set(errors)],fills:perps};
}
export type LiveTrader = Awaited<ReturnType<typeof liveTrader>>;
