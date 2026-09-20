import {NextResponse} from "next/server";
import {traders} from "@/lib/tracker/traders";
import {liveTrader} from "@/lib/tracker/live";
import {hasNeon,saveNeon} from "@/lib/tracker/neon-store";

export const runtime="nodejs";
export const maxDuration=300;

function authorized(request:Request){
  const secret=process.env.CRON_SECRET;
  if(!secret)return true;
  return request.headers.get("authorization")===`Bearer ${secret}`;
}

export async function GET(request:Request){
  if(!authorized(request))return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!hasNeon())return NextResponse.json({error:"DATABASE_URL is not configured"},{status:503});

  const results:{id:string;ok:boolean;message?:string}[]=[];
  for(const trader of traders){
    try{
      const data=await liveTrader(trader.id);
      await saveNeon(data);
      results.push({id:trader.id,ok:true});
    }catch(e){
      results.push({id:trader.id,ok:false,message:String((e as Error)?.message||e)});
    }
  }

  const ok=results.every(r=>r.ok);
  return NextResponse.json({ok,updatedAt:Date.now(),results},{status:ok?200:207});
}
