import {DatabaseSync} from "node:sqlite";
import {reconcile,type Position,type TrackerEvent} from "./engine.ts";
import type {LiveTrader} from "./live.ts";
export function openStore(path:string){
  const db=new DatabaseSync(path);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  db.exec(`CREATE TABLE IF NOT EXISTS snapshots(trader TEXT,time INTEGER,data TEXT,PRIMARY KEY(trader,time));
  CREATE TABLE IF NOT EXISTS events(trader TEXT,id TEXT,time INTEGER,data TEXT,PRIMARY KEY(trader,id));
  CREATE TABLE IF NOT EXISTS fills(trader TEXT,id TEXT,time INTEGER,data TEXT,PRIMARY KEY(trader,id));`);
  return {
    save(data:LiveTrader){
      if(!data.positionsComplete)return;
      db.exec("BEGIN IMMEDIATE");
      try{
        const old=db.prepare("SELECT data FROM snapshots WHERE trader=? ORDER BY time DESC LIMIT 1").get(data.trader.id) as {data:string}|undefined;
        const previous=old?JSON.parse(old.data) as LiveTrader:null;
        if(previous&&previous.updatedAt>=data.updatedAt){db.exec("ROLLBACK");return}
        const alertRows=db.prepare("SELECT data FROM events WHERE trader=? AND time>?").all(data.trader.id,data.updatedAt-1800000) as {data:string}[];
        const alerts:Record<string,number>={};
        for(const row of alertRows){const e=JSON.parse(row.data) as TrackerEvent;if(e.type.startsWith("PNL_"))alerts[e.coin]=Math.max(alerts[e.coin]||0,e.time)}
        for(const e of reconcile(previous?.positions??null,data.positions,data.updatedAt,alerts))db.prepare("INSERT OR IGNORE INTO events VALUES(?,?,?,?)").run(data.trader.id,e.id,e.time,JSON.stringify(e));
        for(const f of data.fills)db.prepare("INSERT OR IGNORE INTO fills VALUES(?,?,?,?)").run(data.trader.id,`${f.coin}:${f.tid??f.hash+":"+f.oid+":"+f.time}`,f.time,JSON.stringify(f));
        db.prepare("INSERT OR IGNORE INTO snapshots VALUES(?,?,?)").run(data.trader.id,data.updatedAt,JSON.stringify({...data,fills:[]}));
        db.exec("COMMIT");
      }catch(e){db.exec("ROLLBACK");throw e}
    },
    read(id:string){
      const row=db.prepare("SELECT data FROM snapshots WHERE trader=? ORDER BY time DESC LIMIT 1").get(id) as {data:string}|undefined;
      if(!row)return null;
      const history=db.prepare("SELECT time,data FROM snapshots WHERE trader=? ORDER BY time DESC LIMIT 2880").all(id) as {time:number;data:string}[];
      const events=db.prepare("SELECT data FROM events WHERE trader=? ORDER BY time DESC LIMIT 100").all(id) as {data:string}[];
      return {...JSON.parse(row.data),history:history.reverse().map(r=>({time:r.time,positions:JSON.parse(r.data).positions as Position[]})),events:events.map(e=>JSON.parse(e.data)),persistent:true};
    },
    close(){db.close()}
  };
}
