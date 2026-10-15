"use server"
import { createClient } from "@supabase/supabase-js"
import { cacheKey, editorialLeads, rankSpirit } from "@/lib/same-spirit"
import { resolveCatalogBook } from "@/lib/book-catalog"
import type { Candidate } from "@/lib/discover-rows"
type Seed = {key:string;seedTitle?:string;seedAuthor?:string}
// Free editorial catalog path only. No provider, budget RPC, secret or database write.
export async function getFreeSpiritCandidates(accessToken:string,requested:Seed[]):Promise<Record<string,Candidate[]>> {
 const out:Record<string,Candidate[]>={}
 if(!accessToken || accessToken.length>10000)return out
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false},global:{headers:{Authorization:`Bearer ${accessToken}`}}})
 const {data:auth,error:authError}=await db.auth.getUser(accessToken)
 if(authError||!auth.user)return out
 const {data,error}=await db.from("books").select("title,author").eq("user_id",auth.user.id).eq("self_rating",5)
 if(error)return out
 const eligible=new Set((data||[]).map(b=>cacheKey(b.title,b.author))),seen=new Set<string>()
 for(const s of (Array.isArray(requested)?requested:[]).slice(0,2)){
  if(!s||typeof s.key!=="string"||!s.seedTitle||!s.seedAuthor)continue
  const key=cacheKey(s.seedTitle,s.seedAuthor)
  if(key.length>700||!eligible.has(key)||seen.has(key))continue
  seen.add(key);out[s.key]=[]
  const seed=(await resolveCatalogBook(s.seedTitle,s.seedAuthor,true)).book
  if(!seed)continue
  const candidates=await Promise.all(editorialLeads(seed.title,seed.author).map(async lead=>{
   const b=(await resolveCatalogBook(lead.title,lead.author,true)).book
   return b?.cover?{...b,description:b.description.slice(0,600),relevanceScore:100,relevanceSource:lead.source}:null
  }))
  out[s.key]=rankSpirit(candidates.filter((b):b is NonNullable<typeof b>=>!!b))
 }
 return out
}
