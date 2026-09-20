import {NextResponse} from "next/server";
import {traders} from "@/lib/tracker/traders";
import {liveTrader} from "@/lib/tracker/live";
import {hasNeon,readNeon,saveNeon} from "@/lib/tracker/neon-store";

export const runtime="nodejs";
export const maxDuration=60;

const cache=new Map<string,{time:number;value:unknown}>();
const pending=new Map<string,Promise<unknown>>();

export async function GET(_:Request,{params}:{params:Promise<{trader:string}>}){
  const {trader}=await params;
  if(!traders.some(t=>t.id===trader)){
    return NextResponse.json({error:"トレーダーが見つかりません"},{status:404});
  }

  try{
    if(hasNeon()){
      try{
        const stored=await readNeon(trader);
        if(stored && Date.now()-stored.updatedAt<30000){
          return NextResponse.json(stored,{headers:{"Cache-Control":"no-store"}});
        }

        try{
          const fresh=await liveTrader(trader);
          await saveNeon(fresh);
          const value=await readNeon(trader);
          if(value)return NextResponse.json(value,{headers:{"Cache-Control":"no-store"}});
        }catch(e){
          if(stored){
            return NextResponse.json(
              {...stored,errors:[...stored.errors,"最新データの取得に失敗したため、保存済みデータを表示しています。"]},
              {headers:{"Cache-Control":"no-store"}}
            );
          }
          throw e;
        }
      }catch(e){
        console.error("Neon tracker unavailable",e);
      }
    }

    if(process.env.TRACKER_DB){
      const {openStore}=await import("@/lib/tracker/store");
      const store=openStore(process.env.TRACKER_DB);
      try{
        const value=store.read(trader);
        if(value)return NextResponse.json(value,{headers:{"Cache-Control":"no-store"}});
      }finally{
        store.close();
      }
    }

    const cached=cache.get(trader);
    if(cached&&Date.now()-cached.time<30000)return NextResponse.json(cached.value);

    let job=pending.get(trader);
    if(!job){
      job=liveTrader(trader)
        .then(({fills,...value})=>{
          const output={...value,history:[],events:[],persistent:false};
          cache.set(trader,{time:Date.now(),value:output});
          return output;
        })
        .finally(()=>pending.delete(trader));
      pending.set(trader,job);
    }

    return NextResponse.json(await job);
  }catch{
    return NextResponse.json(
      {error:"データを取得できません。しばらくしてから再試行してください。"},
      {status:502}
    );
  }
}
