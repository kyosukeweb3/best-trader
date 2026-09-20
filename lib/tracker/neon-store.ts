import {neon} from "@neondatabase/serverless";
import {reconcile,type Position,type TrackerEvent} from "./engine.ts";
import type {LiveTrader} from "./live.ts";

type Persisted = Omit<LiveTrader,"fills"> & {
  history:{time:number;positions:Position[]}[];
  events:TrackerEvent[];
  persistent:true;
};

let schemaReady:Promise<void>|null=null;

function connectionString(){
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || "";
}

function client(){
  const url=connectionString();
  if(!url)throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

function parsed<T>(value:unknown):T{
  if(typeof value==="string")return JSON.parse(value) as T;
  return value as T;
}

async function ensureSchema(){
  if(schemaReady)return schemaReady;
  schemaReady=(async()=>{
    const sql=client();
    await sql`
      CREATE TABLE IF NOT EXISTS bt_snapshots(
        trader TEXT NOT NULL,
        time BIGINT NOT NULL,
        data JSONB NOT NULL,
        PRIMARY KEY(trader,time)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS bt_events(
        trader TEXT NOT NULL,
        id TEXT NOT NULL,
        time BIGINT NOT NULL,
        data JSONB NOT NULL,
        PRIMARY KEY(trader,id)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS bt_fills(
        trader TEXT NOT NULL,
        id TEXT NOT NULL,
        time BIGINT NOT NULL,
        data JSONB NOT NULL,
        PRIMARY KEY(trader,id)
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS bt_snapshots_trader_time_idx ON bt_snapshots(trader,time DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS bt_events_trader_time_idx ON bt_events(trader,time DESC)`;
    await sql`
      CREATE TABLE IF NOT EXISTS bt_collector_lock(
        id INTEGER PRIMARY KEY,
        token TEXT NOT NULL,
        lease_until BIGINT NOT NULL
      )
    `;
  })().catch(e=>{schemaReady=null;throw e});
  return schemaReady;
}

export function hasNeon(){
  return Boolean(connectionString());
}

export async function saveNeon(data:LiveTrader){
  if(!data.positionsComplete)return false;
  await ensureSchema();
  const sql=client();

  const old=await sql`
    SELECT data FROM bt_snapshots
    WHERE trader=${data.trader.id}
    ORDER BY time DESC
    LIMIT 1
  `;
  const previous=old[0]?.data ? parsed<LiveTrader>(old[0].data) : null;
  if(previous && previous.updatedAt>=data.updatedAt)return false;

  const alertRows=await sql`
    SELECT data FROM bt_events
    WHERE trader=${data.trader.id}
      AND time>${data.updatedAt-1800000}
  `;
  const alerts:Record<string,number>={};
  for(const row of alertRows){
    const e=parsed<TrackerEvent>(row.data);
    if(e.type.startsWith("PNL_"))alerts[e.coin]=Math.max(alerts[e.coin]||0,e.time);
  }

  const events=reconcile(previous?.positions??null,data.positions,data.updatedAt,alerts);
  for(const e of events){
    const payload=JSON.stringify(e);
    await sql`
      INSERT INTO bt_events(trader,id,time,data)
      VALUES(${data.trader.id},${e.id},${e.time},CAST(${payload} AS JSONB))
      ON CONFLICT(trader,id) DO NOTHING
    `;
  }

  for(const f of data.fills){
    const fillId=`${f.coin}:${f.tid??String(f.hash||"")+":"+String(f.oid||"")+":"+String(f.time||"")}`;
    const payload=JSON.stringify(f);
    await sql`
      INSERT INTO bt_fills(trader,id,time,data)
      VALUES(${data.trader.id},${fillId},${Number(f.time)||data.updatedAt},CAST(${payload} AS JSONB))
      ON CONFLICT(trader,id) DO NOTHING
    `;
  }

  const snapshot=JSON.stringify({...data,fills:[]});
  await sql`
    INSERT INTO bt_snapshots(trader,time,data)
    VALUES(${data.trader.id},${data.updatedAt},CAST(${snapshot} AS JSONB))
    ON CONFLICT(trader,time) DO NOTHING
  `;

  return true;
}

export async function readNeon(id:string):Promise<Persisted|null>{
  await ensureSchema();
  const sql=client();
  const latest=await sql`
    SELECT data FROM bt_snapshots
    WHERE trader=${id}
    ORDER BY time DESC
    LIMIT 1
  `;
  if(!latest[0]?.data)return null;

  const historyRows=await sql`
    SELECT time,data FROM bt_snapshots
    WHERE trader=${id}
    ORDER BY time DESC
    LIMIT 2880
  `;
  const eventRows=await sql`
    SELECT data FROM bt_events
    WHERE trader=${id}
    ORDER BY time DESC
    LIMIT 100
  `;

  const base=parsed<Omit<LiveTrader,"fills">>(latest[0].data);
  const history=historyRows
    .map(row=>{
      const snap=parsed<Omit<LiveTrader,"fills">>(row.data);
      return {time:Number(row.time),positions:snap.positions};
    })
    .reverse();
  const events=eventRows.map(row=>parsed<TrackerEvent>(row.data));

  return {...base,history,events,persistent:true};
}


export async function acquireCollectorLease(ttlMs=240000){
  await ensureSchema();
  const sql=client();
  const token=crypto.randomUUID();
  const now=Date.now();
  const leaseUntil=now+ttlMs;
  const rows=await sql`
    INSERT INTO bt_collector_lock(id,token,lease_until)
    VALUES(1,${token},${leaseUntil})
    ON CONFLICT(id) DO UPDATE
      SET token=EXCLUDED.token, lease_until=EXCLUDED.lease_until
      WHERE bt_collector_lock.lease_until < ${now}
    RETURNING token
  `;
  return rows[0]?.token===token ? token : null;
}

export async function releaseCollectorLease(token:string){
  await ensureSchema();
  const sql=client();
  await sql`
    UPDATE bt_collector_lock
    SET lease_until=0
    WHERE id=1 AND token=${token}
  `;
}
