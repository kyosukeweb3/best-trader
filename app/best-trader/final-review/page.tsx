"use client";

const candidates = [
  {
    id: "D2",
    address: "0xb4a3349619ff3da514b42bd7a124947aaf2b9210",
    group: "CORE",
    status: "PASS",
    winRate: "74.6%",
    pf: "1.73",
    realized: "$40.5K",
    orders: "126",
    dd: "-$37.7K",
    topWin: "15.0%",
    top3: "—",
    topCoin: "NEAR 39.7%",
    note: "样本完整、盈利分散。当前最干净的候选之一。"
  },
  {
    id: "D4",
    address: "0xf29c6bc1147a841519b382459a6d7a373c6b9971",
    group: "CORE",
    status: "PASS_PARTIAL",
    winRate: "88.8%",
    pf: "3.67",
    realized: "$1.21M",
    orders: "596",
    dd: "-$403.4K",
    topWin: "3.4%",
    top3: "—",
    topCoin: "ZEC 63.3%",
    note: "质量强，但 10K fills 截断；统计为可见样本。"
  },
  {
    id: "D5",
    address: "0x469e9a7f624b04c24f0e64edf8d8a277e6bf58a5",
    group: "CORE",
    status: "PASS_PARTIAL",
    winRate: "97.8%",
    pf: "11.12",
    realized: "$3.51M",
    orders: "89",
    dd: "-$343.4K",
    topWin: "17.3%",
    top3: "—",
    topCoin: "ZEC 28.4%",
    note: "强盈利，但 Avg W/L 约 0.26，偏高胜率小赚/低频大亏结构。"
  },
  {
    id: "Machi",
    address: "0x020ca66c30bec2c4fe3861a94e4db4a498a35872",
    group: "CORE",
    status: "PASS_PARTIAL",
    winRate: "84.0%",
    pf: "4.04",
    realized: "$581.9K",
    orders: "219",
    dd: "-$183.5K",
    topWin: "2.9%",
    top3: "—",
    topCoin: "ETH 55.8%",
    note: "盈利分布很分散；目前很适合继续保留。"
  },
  {
    id: "F4",
    address: "0x7e1ad5e2bbe30d6d202e7c41036ea0a07c560be9",
    group: "CORE",
    status: "PASS_PARTIAL",
    winRate: "92.0%",
    pf: "6.27",
    realized: "$1.05M",
    orders: "137",
    dd: "-$197.5K",
    topWin: "17.7%",
    top3: "38.1%",
    topCoin: "PUMP 57.6%",
    note: "新一轮里最像可用候选之一；10K fills 截断。"
  },
  {
    id: "E8",
    address: "0xec0b9ebf2a304c99cafe85c548c14dd7783cb078",
    group: "REVIEW",
    status: "REVIEW_LOW_SAMPLE",
    winRate: "70.0%",
    pf: "22.88",
    realized: "$2.02M",
    orders: "10",
    dd: "-$92.1K",
    topWin: "22.1%",
    top3: "60.3%",
    topCoin: "BTC 83.9%",
    note: "质量看起来强，但仅 10 个 realized orders；BTC 集中度较高。"
  },
  {
    id: "F5",
    address: "0x7dacca323e44f168494c779bb5e7483c468ef410",
    group: "REVIEW",
    status: "PASS",
    winRate: "100.0%",
    pf: "—",
    realized: "$2.70M",
    orders: "6,046",
    dd: "$0",
    topWin: "0.1%",
    top3: "0.3%",
    topCoin: "@107 100%",
    note: "数字极强但行为非常异常：单一市场、100% 胜率、0 DD。需要确认是否属于我们想展示的“交易员”。"
  },
  {
    id: "E4",
    address: "0xa2ce501d9c0c5e23d34272f84402cfb7835b3126",
    group: "REVIEW",
    status: "REVIEW_LOW_SAMPLE",
    winRate: "100.0%",
    pf: "—",
    realized: "$3.80M",
    orders: "8",
    dd: "$0",
    topWin: "28.2%",
    top3: "65.6%",
    topCoin: "ZEC 59.4%",
    note: "8 笔样本，不足以判断稳定性；绝对盈利很高。"
  },
  {
    id: "E2",
    address: "0xea0027b6ea9b6d7d401b5266979cc3b3ca87a918",
    group: "REVIEW",
    status: "REVIEW_CONCENTRATED",
    winRate: "83.3%",
    pf: "546939.72",
    realized: "$2.85M",
    orders: "6",
    dd: "-$5",
    topWin: "54.4%",
    top3: "93.2%",
    topCoin: "ZEC 89.4%",
    note: "低样本且前三笔贡献 93.2%，不宜直接当稳定型交易员。"
  },
  {
    id: "F2",
    address: "0x634fe24f2f7396f5d967ec3936df04f49a3e6951",
    group: "BORDERLINE",
    status: "REVIEW_CONCENTRATED",
    winRate: "38.5%",
    pf: "1.28",
    realized: "$153.1K",
    orders: "13",
    dd: "-$490.3K",
    topWin: "74.1%",
    top3: "96.6%",
    topCoin: "ETH 56.7%",
    note: "盈利主要来自少数大单，且 DD 明显高于净已实现 PnL。"
  },
  {
    id: "F3",
    address: "0xa516541e599129095d14f7faf8b11ae670c837b0",
    group: "BORDERLINE",
    status: "REVIEW_CONCENTRATED",
    winRate: "36.4%",
    pf: "7.44",
    realized: "$3.23M",
    orders: "11",
    dd: "-$470.3K",
    topWin: "92.5%",
    top3: "99.7%",
    topCoin: "ZEC 81.5%",
    note: "几乎全部盈利来自单笔/少数交易，策略稳定性不足。"
  }
];

const groupLabel: Record<string,string> = {
  CORE: "Core candidates",
  REVIEW: "Need judgment",
  BORDERLINE: "Borderline"
};

export default function FinalReview() {
  return (
    <main style={{minHeight:"100vh",background:"#090b0d",color:"#f5f7f9"}}>
      <div style={{width:"min(1500px, calc(100% - 36px))",margin:"0 auto",padding:"42px 0 70px"}}>
        <div style={{color:"#c9ff57",fontSize:11,fontWeight:800,letterSpacing:".16em"}}>
          KYOSUKE LIFE / BEST TRADER / CONSOLIDATED REVIEW
        </div>
        <h1 style={{fontSize:"clamp(48px,7vw,82px)",letterSpacing:"-.055em",margin:"10px 0"}}>
          All surviving addresses.
        </h1>
        <p style={{maxWidth:900,color:"#9ca8b5",lineHeight:1.7}}>
          把前几轮仍有研究价值的地址合并到一页。这里不做最终自动排名，只把样本量、盈利质量、集中度和异常结构放在一起，方便人工决定最终 8 个。
        </p>

        {["CORE","REVIEW","BORDERLINE"].map(group => {
          const rows = candidates.filter(c=>c.group===group);
          return (
            <section key={group} style={{marginTop:30}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <h2 style={{fontSize:22,margin:0}}>{groupLabel[group]}</h2>
                <span style={{fontSize:11,color:"#8995a3",border:"1px solid #29313a",borderRadius:999,padding:"4px 8px"}}>
                  {rows.length}
                </span>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(440px,1fr))",gap:14}}>
                {rows.map(c=>(
                  <article key={c.address} style={{border:"1px solid #29313a",background:"#0e1216",borderRadius:15,padding:18}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
                      <div>
                        <strong style={{fontSize:18}}>{c.id}</strong>
                        <div style={{font:"11px ui-monospace,monospace",color:"#748190",marginTop:4}}>{c.address}</div>
                      </div>
                      <span style={{fontSize:10,border:"1px solid #29313a",borderRadius:8,padding:"6px 8px",color:c.group==="CORE"?"#56e79a":c.group==="REVIEW"?"#ffd75f":"#ff9b6a"}}>
                        {c.status}
                      </span>
                    </div>

                    <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:8,marginTop:16}}>
                      <Metric label="WIN RATE" value={c.winRate}/>
                      <Metric label="PF" value={c.pf}/>
                      <Metric label="REALIZED PNL" value={c.realized}/>
                      <Metric label="ORDERS" value={c.orders}/>
                      <Metric label="DD" value={c.dd}/>
                      <Metric label="TOP WIN" value={c.topWin}/>
                      <Metric label="TOP-3 WIN" value={c.top3}/>
                      <Metric label="TOP COIN" value={c.topCoin}/>
                    </div>

                    <div style={{borderTop:"1px solid #29313a",marginTop:14,paddingTop:10,color:"#9aa5b3",fontSize:12,lineHeight:1.65}}>
                      {c.note}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function Metric({label,value}:{label:string;value:string}) {
  return (
    <div style={{borderTop:"1px solid #29313a",paddingTop:8}}>
      <small style={{display:"block",color:"#718090",fontSize:9}}>{label}</small>
      <strong style={{display:"block",marginTop:5,fontSize:16}}>{value}</strong>
    </div>
  );
}
