const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),ts=require('typescript')
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:'commonjs',target:'es2020'}}).outputText
const pure=new Module('pure');pure._compile(compile(fs.readFileSync('lib/same-spirit.ts','utf8')),'pure.js')
async function run({eligible=true,auth=true,matching=true,cover=true,unknown=false}={}){
 const seed={key:'rated:life',seedTitle:unknown?'Unknown Seed':'A Little Life',seedAuthor:'Hanya Yanagihara'},seen=[]
 const db={auth:{getUser:async()=>({data:{user:auth?{id:'synthetic'}:null},error:null})},from:t=>({select:c=>({eq:(field,value)=>{seen.push([field,value]);return {eq:async(f,v)=>{seen.push([f,v]);return {data:eligible?[{title:seed.seedTitle,author:seed.seedAuthor}]:[],error:null}}}}})})}
 const cat={resolveCatalogBook:async(title,author)=>({book:matching?{id:title,title,author,cover:cover?'https://example.invalid/c.jpg':'',description:'Bound public catalog description'}:null})}
 const old=Module._load,m=new Module('free');Module._load=(req,...r)=>req==='@supabase/supabase-js'?{createClient:()=>db}:req==='@/lib/same-spirit'?pure.exports:req==='@/lib/book-catalog'?cat:old(req,...r)
 try{m._compile(compile(fs.readFileSync('app/actions/free-spirit.ts','utf8')),'free.js');return {out:await m.exports.getFreeSpiritCandidates('synthetic-token',[seed]),seen}}finally{Module._load=old}
}
test('free action authenticates five-star ownership and returns catalog-bound editorial lead',async()=>{const {out,seen}=await run();assert.equal(out['rated:life'][0].title,'Shuggie Bain');assert.equal(out['rated:life'][0].relevanceScore,100);assert.deepEqual(seen,[['user_id','synthetic'],['self_rating',5]])})
test('invalid auth, unowned seed, wrong catalog identity, missing cover and unknown pair never get popularity substitutes',async()=>{for(const option of [{auth:false},{eligible:false},{matching:false},{cover:false},{unknown:true}]){const {out}=await run(option);assert.equal(Object.values(out).flat().length,0)}})
test('release action has no paid or database-write dependency',()=>{const s=fs.readFileSync('app/actions/free-spirit.ts','utf8');assert.doesNotMatch(s,/budgetedMessage|aiRpc|Anthropic|\.insert\(|\.update\(|\.delete\(|BOOKLOG_AI/);assert.match(s,/auth\.getUser/);assert.match(s,/self_rating/);assert.match(fs.readFileSync('lib/discover-rows.ts','utf8'),/spirit-min3-loved-v6/);assert.match(fs.readFileSync('app/actions/discover-rows.ts','utf8'),/if \(s\.kind === "rated"\) return \[\]/)})
