const test=require('node:test'),assert=require('node:assert'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript')
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:'commonjs',target:'es2020'}}).outputText
const catalog=new Module('catalog');catalog._compile(compile(fs.readFileSync(path.join(__dirname,'../lib/book-catalog.ts'),'utf8')),'catalog.js')
const pure=new Module('pure');pure._compile(compile(fs.readFileSync(path.join(__dirname,'../lib/same-spirit.ts'),'utf8')),'pure.js')
async function run({eligible=true,hit=false,busy=false,budget=false,matching=true,weak=false}={}){
 const seen=[],rpcCalls=[],seeds=[{key:'rated:seed1',seedTitle:'Seed One',seedAuthor:'Author One'},{key:'rated:seed2',seedTitle:'Seed Two',seedAuthor:'Author Two'}]
 const model=JSON.stringify(seeds.map((s,index)=>({index,books:[{title:'Candidate '+index,author:'Writer '+index,themes:weak?['their elite','college students']:['grief','isolation'],tone_match:true,style_match:true,explanation:'These novels share sustained grief and isolation with a restrained narrative style.'}]})))
 const mockBudget={authenticatedClient:async()=>({userId:'synthetic',db:{from:()=>({select:()=>({eq:()=>({eq:async()=>({data:eligible?seeds.map(s=>({title:s.seedTitle,author:s.seedAuthor})):[],error:null})})})})}}),aiRpc:async(op,args)=>{
  rpcCalls.push([op,args]);if(op==='lookup')return hit?{hit:true,payload:[{id:'cached',title:'Cached',author:'Writer',cover:'https://example.invalid/c.jpg'}]}:{hit:false};return {ok:op==='claim'?!busy:true}
 },budgetedMessage:async(input)=>{seen.push(input);if(budget)throw Error('cap');return {content:[{type:'text',text:model}]}}}
 const oldLoad=Module._load,oldFetch=global.fetch;const m=new Module('action');m.paths=Module._nodeModulePaths(__dirname)
 Module._load=(req,...r)=>req==='@/lib/ai-budget'?mockBudget:req==='@/lib/same-spirit'?pure.exports:req==='@/lib/book-catalog'?catalog.exports:oldLoad(req,...r)
 global.fetch=async url=>{const q=new URL(url).searchParams.get('q'),title=q.match(/intitle:"([^"]+)"/)[1],author=q.match(/inauthor:"([^"]+)"/)[1];return {ok:true,json:async()=>({items:[{id:title,volumeInfo:{title:matching?title:'Wrong Hit',authors:[author],language:'en',description:weak?'Their elite college students live in their city.':'Grief and isolation follow these families through their lives.',imageLinks:{thumbnail:'https://example.invalid/c.jpg'}}}]})}}
 delete process.env.VERCEL_ENV
 try{m._compile(compile(fs.readFileSync(path.join(__dirname,'../app/actions/same-spirit.ts'),'utf8')),'action.js');const out=await m.exports.getSameSpiritCandidates('mock',seeds);return {out,seen,rpcCalls}}finally{Module._load=oldLoad;global.fetch=oldFetch}
}
test('two eligible misses batch once and publish isolated shared candidates',async()=>{const {out,seen,rpcCalls}=await run();assert.equal(seen.length,1);assert.equal(seen[0].cacheKeys.length,2);assert.equal(Object.values(out).flat().length,2);assert.equal(rpcCalls.filter(x=>x[0]==='publish').length,2);assert.ok(!JSON.stringify(rpcCalls).includes('five stars'));assert.ok(!JSON.stringify(rpcCalls).includes('self_rating'))})
test('shared hits require no paid generation',async()=>{const {out,seen}=await run({hit:true});assert.equal(seen.length,0);assert.equal(Object.values(out).flat().length,2)})
test('unowned seeds, busy claims, missing catalog identity never spend',async()=>{for(const options of [{eligible:false},{busy:true},{matching:false}]){const {out,seen}=await run(options);assert.equal(seen.length,0);assert.equal(Object.values(out).flat().length,0)}})
test('cap failure hides rows and cools claimed seeds, no popularity fallback',async()=>{const {out,rpcCalls}=await run({budget:true});assert.equal(Object.values(out).flat().length,0);assert.equal(rpcCalls.filter(x=>x[0]==='publish').length,0);assert.equal(rpcCalls.filter(x=>x[0]==='fail').length,2)})

test('self-labelled tone/style cannot override shallow generic overlap',async()=>{
 const {out,seen,rpcCalls}=await run({weak:true});assert.equal(seen.length,1);assert.equal(Object.values(out).flat().length,0)
 assert.ok(rpcCalls.filter(x=>x[0]==='publish').every(x=>x[1].payload.length===0))
})
