import {notFound} from "next/navigation";
import Dashboard from "@/components/tracker-dashboard";
import {traders} from "@/lib/tracker/traders";
export default async function Page({params}:{params:Promise<{trader:string}>}){
  const {trader}=await params;if(!traders.some(t=>t.id===trader))notFound();
  return <Dashboard selected={trader}/>;
}
