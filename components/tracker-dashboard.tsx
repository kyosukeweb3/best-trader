"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {traders} from "@/lib/tracker/traders";
import type {LiveTrader} from "@/lib/tracker/live";
import type {Position,TrackerEvent} from "@/lib/tracker/engine";
import "./tracker.css";
type Data=Omit<LiveTrader,"fills">&{persistent:boolean;history:{time:number;positions:Position[]}[];events:TrackerEvent[]};
const money=(n:number|null|undefined)=>n==null||!Number.isFinite(n)?"—":new Intl.NumberFormat("ja-JP",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);
const pct=(n:number|null|undefined)=>n==null||!Number.isFinite(n)?"—":(n>=0?"+":"")+(n*100).toFixed(2)+"%";
const date=(n:number|null)=>n?new Date(n).toLocaleString("ja-JP",{timeZone:"Asia/Tokyo",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})+" JST":"未取得";
const names:Record<string,string>={OPEN:"新規建玉を観測",CLOSE:"ポジション解消を観測",ADD:"ポジション増加",REDUCE:"ポジション減少",PNL_SURGE:"含み益が拡大",PNL_DROP:"含み損益が低下"};
function Chart({points,label}:{points:[number,number][];label:string}){
  if(points.length<2)return <div className="chart-empty">履歴を収集中です。データが蓄積すると表示されます。</div>;
  const min=Math.min(...points.map(p=>p[1])),max=Math.max(...points.map(p=>p[1])),start=points[0][0],end=points.at(-1)![0];
  const line=points.map(([t,v])=>`${20+(t-start)/(end-start||1)*960},${180-(v-min)/(max-min||1)*150}`).join(" ");
  return <div className="chart"><div className="chart-caption"><span>{label}</span><strong>{money(points.at(-1)![1])}</strong></div><svg viewBox="0 0 1000 210" role="img" aria-label={label}><path d="M20 60H980 M20 120H980 M20 180H980" stroke="#27332f" strokeDasharray="4 6"/><polyline points={line} fill="none" stroke="#c7f679" strokeWidth="3" vectorEffect="non-scaling-stroke"/></svg><div className="chart-axis"><span>{date(start)}</span><span>{date(end)}</span></div></div>;
}
export default function Dashboard({selected}:{selected?:string}){
  const [data,setData]=useState<Record<string,Data>>({}),[errors,setErrors]=useState<Record<string,string>>({}),[period,setPeriod]=useState<"week"|"month">("week");
  const [range,setRange]=useState("30"),[metric,setMetric]=useState<"pnl"|"values">("pnl"),[coin,setCoin]=useState("");
  useEffect(()=>{
    let stopped=false;const controllers=new Set<AbortController>();let timer:ReturnType<typeof setTimeout>;
    async function refresh(){
      const wanted=selected?traders.filter(t=>t.id===selected):traders;
      for(const t of wanted){if(stopped)break;const c=new AbortController();controllers.add(c);try{
        const r=await fetch("/api/best-trader/live/"+t.id,{signal:c.signal});const d=await r.json();if(!r.ok)throw new Error(d.error);
        if(!stopped){setData(prev=>({...prev,[t.id]:d}));setErrors(prev=>({...prev,[t.id]:""}))}
      }catch(e){if(!stopped)setErrors(prev=>({...prev,[t.id]:(e as Error).message}))}finally{controllers.delete(c)}}
      if(!stopped)timer=setTimeout(refresh,30000);
    }
    refresh();return()=>{stopped=true;clearTimeout(timer);controllers.forEach(c=>c.abort())};
  },[selected]);
  const ranked=[...traders].sort((a,b)=>(data[b.id]?.performance[period].returnProxy??-Infinity)-(data[a.id]?.performance[period].returnProxy??-Infinity));
  const current=selected?data[selected]:null;
  const trader=traders.find(t=>t.id===selected);
  const activity=(selected?(current?.events||[]):Object.values(data).flatMap(d=>d.events.map(e=>({...e,traderName:d.trader.name})))).sort((a,b)=>b.time-a.time).slice(0,20);
  const chosen=coin||current?.positions[0]?.coin;
  const lifecycle:[number,number][]=[];
  let priorSign=0;
  for(const h of current?.history||[]){
    const p=h.positions.find(p=>p.coin===chosen);
    if(!p){lifecycle.length=0;priorSign=0;continue}
    if(priorSign&&Math.sign(p.size)!==priorSign)lifecycle.length=0;
    priorSign=Math.sign(p.size);lifecycle.push([h.time,p.pnl]);
  }
  const performance=current?.performance[range==="7"?"week":range==="30"?"month":"all"];
  const chartPoints=(performance?.[metric]||[]).filter(p=>range!=="90"||p[0]>Date.now()-90*86400000).map(([t,v],i,a)=>[t,metric==="pnl"?v-a[0][1]:v] as [number,number]);
  return <div className="bt"><header className="bt-nav"><Link href="/best-trader" className="brand">KYOSUKE LIFE <span>/ BEST TRADER</span></Link><span className="nav-status"><i/> 6人のトレーダーを観測</span></header><main>
    <div className="eyebrow">HYPERLIQUID · トレーダーリサーチ</div>
    {trader?<><Link href="/best-trader" className="back">← ランキングに戻る</Link><h1>{trader.name}</h1><p className="intro">{trader.description}</p><p className="address">{trader.address}</p></>:<><h1>実力を、追跡する。</h1><p className="intro">直近の収益から、今この瞬間のポジションまで。<br/>選定した6人の取引を、ひとつの場所で。</p></>}
    <div className="section-top"><h2>{selected?"パフォーマンス":"トレーダーランキング"}</h2>{!selected&&<div className="segmented">{(["week","month"] as const).map(p=><button key={p} aria-pressed={p===period} onClick={()=>setPeriod(p)}>{p==="week"?"7日間":"30日間"}</button>)}</div>}</div>
    <p className="notice">収益率は参考値です。期間損益 ÷ 時間加重平均資産で計算しています。入出金の検証が完了するまでは、資金移動調整済み収益率とは区別します。</p>
    {!selected?<div className="ranking">{ranked.map((t,i)=>{
      const d=data[t.id],p=d?.positions[0],value=d?.performance[period].returnProxy,stale=d&&Date.now()-d.updatedAt>120000;
      return <Link href={"/best-trader/"+t.id} className="trader-card" key={t.id}><div className="card-top"><span className="rank">{value!=null?String(i+1).padStart(2,"0"):"—"}</span><span className="style">{t.style}</span><span>↗</span></div><h3>{t.name}</h3><div className="return-label">{period==="week"?"7日":"30日"}収益率 <span>参考値</span></div><div className={"return "+((value??0)<0?"negative":"")}>{pct(value)}</div><div className="pnl-line"><span>期間損益</span><b>{money(d?.performance[period].gain)}</b></div><div className="position-mini"><small>最大ポジション</small><strong>{p?p.coin+" · "+(p.size>0?"ロング":"ショート"):d?.positionsComplete?"ポジションなし":"取得中"}</strong><span>{p?money(p.notional):"—"}</span></div><div className="pnl-line"><span>含み損益</span><b>{d?money(d.positions.reduce((s,p)=>s+p.pnl,0)):"—"}</b></div><div className="pnl-line"><span>30日勝率</span><b>履歴を検証中</b></div><footer>{errors[t.id]||d?.errors[0]||(stale?"更新が遅れています":d?"最終取引 "+date(d.lastActivity):"データを取得しています…")}</footer></Link>;
    })}</div>:current?<><div className="stats"><div><small>7日収益率・参考値</small><b>{pct(current.performance.week.returnProxy)}</b></div><div><small>30日損益</small><b>{money(current.performance.month.gain)}</b></div><div><small>口座資産</small><b>{money(current.performance.month.accountValue)}</b></div><div><small>最終更新</small><b className="small">{date(current.updatedAt)}</b></div></div>
    {current.errors.length>0&&<p role="status" className="notice">{current.errors.join(" / ")}</p>}
    <section className="panel"><div className="section-top"><h2>口座パフォーマンス</h2><div className="segmented">{["7","30","90","all"].map(r=><button key={r} aria-pressed={range===r} onClick={()=>setRange(r)}>{r==="all"?"取得可能な全期間":r+"日"}</button>)}</div></div><div className="segmented"><button aria-pressed={metric==="pnl"} onClick={()=>setMetric("pnl")}>累積損益</button><button aria-pressed={metric==="values"} onClick={()=>setMetric("values")}>口座資産</button></div><Chart points={chartPoints} label={metric==="pnl"?"期間内の累積損益":"口座資産"}/></section>
    <section><div className="section-top"><h2>現在のポジション</h2><span>{current.positions.length} ポジション</span></div><div className="positions">{current.positions.map(p=><article className="panel" key={p.coin}><div className="section-top"><h3>{p.coin}</h3><span className={p.size>0?"badge":"badge short"}>{p.size>0?"ロング":"ショート"}</span></div><div className="position-grid">{[["建玉額",money(p.notional)],["含み損益",money(p.pnl)],["平均建値",money(p.entry)],["マーク価格",money(p.mark)],["証拠金収益率",pct(p.roe)],["レバレッジ",p.leverage+"×"]].map(([k,v])=><div key={k}><small>{k}</small><strong>{v}</strong></div>)}</div></article>)}</div>{!current.positions.length&&<p className="notice">{current.positionsComplete?"現在、確認できる建玉はありません。":"持ち高を取得できていません。"}</p>}</section>
    <section className="panel"><div className="section-top"><h2>ポジションの損益推移</h2><select aria-label="ポジションを選択" value={chosen||""} onChange={e=>setCoin(e.target.value)}>{current.positions.map(p=><option key={p.coin}>{p.coin}</option>)}</select></div><Chart label={(chosen||"")+" 含み損益"} points={lifecycle}/>{!current.persistent&&<p className="notice">継続観測の履歴はまだ接続されていません。現在の持ち高のみ表示しています。</p>}</section></>:<div className="panel" role="status">{errors[selected]||"トレーダーのデータを取得しています…"}</div>}
    <section className="activity"><div className="section-top"><h2>最近のアクティビティ</h2><span>観測イベント</span></div>{activity.length?activity.map((e,i)=><div className="activity-row" key={e.id+i}><span className="event-icon">↗</span><div><strong>{"traderName" in e?String(e.traderName):trader?.name}</strong><p>{e.coin} · {names[e.type]||e.type}</p></div><time>{date(e.time)}</time></div>):<div className="panel empty">まだ観測イベントはありません。継続観測の開始後に、新規建玉・増減・解消を記録します。</div>}</section>
    <footer className="bt-footer"><span>KYOSUKE LIFE / BEST TRADER v0.1</span><span>リサーチ専用 · データ提供 Hyperliquid</span></footer>
  </main></div>;
}
