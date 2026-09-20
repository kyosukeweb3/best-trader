import {NextResponse} from "next/server";
import {traders} from "@/lib/tracker/traders";
import {liveTrader} from "@/lib/tracker/live";
import {hasNeon,saveNeon} from "@/lib/tracker/neon-store";

export const runtime="nodejs";
export const maxDuration=60;

function authorized(request:Request){
  const secret=process.env.CRON_SECRET;
  if(!secret)return true;
  return request.headers.get("authorization")===`Bearer ${secret}`;
}

export async function GET(
  request:Request,
  {params}:{params:Promise<{trader:string}>}
){
  if(!authorized(request))return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!hasNeon())return NextResponse.json({error:"DATABASE_URL is not configured"},{status:503});

  const {trader}=await params;
  if(!traders.some(t=>t.id===trader)){
    return NextResponse.json({error:"Unknown trader"},{status:404});
  }

  try{
    const data=await liveTrader(trader);
    await saveNeon(data);
    return NextResponse.json({
      ok:true,
      trader,
      updatedAt:data.updatedAt,
      positions:data.positions.length,
      errors:data.errors,
    });
  }catch(e){
    return NextResponse.json(
      {ok:false,trader,error:String((e as Error)?.message||e)},
      {status:502}
    );
  }
}
