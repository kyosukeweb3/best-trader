import {NextResponse} from "next/server";
import {hasNeon,readNeon} from "@/lib/tracker/neon-store";
import {traders} from "@/lib/tracker/traders";

export const runtime="nodejs";
export const maxDuration=30;

export async function GET(){
  if(!hasNeon()){
    return NextResponse.json({ok:false,database:"not_configured"},{status:503});
  }
  try{
    const latest=await Promise.all(
      traders.map(async trader=>{
        const row=await readNeon(trader.id);
        return {id:trader.id,lastSnapshot:row?.updatedAt??null,persistent:Boolean(row)};
      })
    );
    return NextResponse.json({ok:true,database:"neon",traders:latest});
  }catch(e){
    return NextResponse.json(
      {ok:false,database:"error",message:String((e as Error)?.message||e)},
      {status:500}
    );
  }
}
