const test=require('node:test'),assert=require('node:assert'),fs=require('node:fs'),Module=require('node:module'),path=require('node:path'),ts=require('typescript')
function load({valid=true,count=100,input=100,output=50,reserve=true,fail=false,settle=true}={}){
 const seen=[];const orig=Module._load;const m=new Module('budget');m.paths=Module._nodeModulePaths(__dirname)
 Module._load=(req,...r)=>{
  if(req==='server-only')return {}
  if(req==='@supabase/supabase-js')return {createClient:()=>({
   auth:{getUser:async()=>({data:{user:valid?{id:'synthetic'}:null},error:null})},
   rpc:async(name,args)=>{seen.push(['rpc',args]);return {data:{ok:args.p_op==='reserve'?reserve:settle},error:null}}
  })}
  if(req==='@anthropic-ai/sdk')return {__esModule:true,default:class {
   constructor(opts){
    seen.push(['client',opts])
    this.messages={
     countTokens:async a=>{seen.push(['count',a]);return {input_tokens:count}},
     create:async a=>{seen.push(['create',a]);if(fail)throw Error('timeout');return {usage:{input_tokens:input,output_tokens:output},content:[{type:'text',text:'[]'}]}}
    }
   }
  }}
  return orig(req,...r)
 }
 process.env.BOOKLOG_AI_RPC_SECRET='mock-only-12345678901234567890123456789012';process.env.NEXT_PUBLIC_SUPABASE_URL='https://synthetic.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='mock';process.env.ANTHROPIC_API_KEY='mock'
 try{m._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/ai-budget.ts'),'utf8'),{compilerOptions:{module:'commonjs',target:'es2020',esModuleInterop:true}}).outputText,'budget.js')}finally{Module._load=orig}
 return {mod:m.exports,seen}
}
const request={accessToken:'mock',purpose:'ask',system:'s',prompt:'p'}
test('invalid session never counts or spends',async()=>{const {mod,seen}=load({valid:false});await assert.rejects(mod.budgetedMessage(request));assert.equal(seen.length,0)})
test('provider count precedes reservation and exact create, retry disabled',async()=>{const {mod,seen}=load();await mod.budgetedMessage(request);assert.equal(seen[0][1].maxRetries,0);assert.deepEqual(seen.map(x=>x[0]),['client','count','rpc','create','rpc']);assert.equal(seen[2][1].p_args.input_tokens,100);assert.equal(seen[3][1].max_tokens,2048);assert.deepEqual(seen[1][1].messages,seen[3][1].messages)})
test('cap refusal and oversized input never start paid call',async()=>{for(const options of [{reserve:false},{count:4097}]){const {mod,seen}=load(options);await assert.rejects(mod.budgetedMessage(request));assert.equal(seen.filter(x=>x[0]==='create').length,0)}})
test('unknown failed call retains reservation with no refund or retry',async()=>{const {mod,seen}=load({fail:true});await assert.rejects(mod.budgetedMessage(request));assert.equal(seen.filter(x=>x[0]==='create').length,1);assert.deepEqual(seen.filter(x=>x[0]==='rpc').map(x=>x[1].p_op),['reserve'])})
test('same-spirit passes its exact claimed seeds and output bound',async()=>{const {mod,seen}=load();await mod.budgetedMessage({...request,purpose:'same-spirit',claimId:'claim',cacheKeys:['key1','key2']});const reservation=seen.find(x=>x[0]==='rpc')[1].p_args;assert.equal(reservation.id,'claim');assert.deepEqual(reservation.cache_keys,['key1','key2']);assert.equal(reservation.output_limit,4096)})
