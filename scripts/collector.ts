import {openStore} from "../lib/tracker/store.ts";
import {liveTrader} from "../lib/tracker/live.ts";
import {traders} from "../lib/tracker/traders.ts";
if(!process.env.TRACKER_DB)throw new Error("Set TRACKER_DB to a persistent SQLite path");
const store=openStore(process.env.TRACKER_DB);
let running=true;
process.on("SIGINT",()=>{running=false});process.on("SIGTERM",()=>{running=false});
while(running){
  const started=Date.now();
  for(const trader of traders){
    if(!running)break;
    try{const data=await liveTrader(trader.id);store.save(data);console.log(trader.id,data.positionsComplete?"saved":"incomplete",data.errors.join("; "))}
    catch(e){console.error(trader.id,String(e))}
  }
  if(process.argv.includes("--once"))break;
  await new Promise(r=>setTimeout(r,Math.max(1000,30000-(Date.now()-started))));
}
store.close();
