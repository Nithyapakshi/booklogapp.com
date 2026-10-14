// TEST ONLY. No Anthropic or RPC/DB calls. Never merge.
import 'server-only'
const cache=new Map<string,any>(),claims=new Map<string,string>()
export async function authenticatedClient(accessToken:string){
 if(!accessToken)throw new Error('No session')
 return {userId:'synthetic',db:{from:(_table:string)=>({select:(_columns:string)=>({eq:(_field:string,_value:unknown)=>({eq:async(_field:string,_value:unknown)=>({data:[{title:'Fixture Seed One',author:'Fixture Author One'},{title:'Fixture Seed Two',author:'Fixture Author Two'},{title:'Fixture Cap One',author:'Fixture Author One'},{title:'Fixture Cap Two',author:'Fixture Author Two'},{title:'Fixture Thin One',author:'Fixture Author One'},{title:'Fixture Thin Two',author:'Fixture Author Two'}],error:null})})})})}}
}
export async function aiRpc(op:string,args:any):Promise<any>{
 if(process.env.VERCEL_ENV!=='preview')throw new Error('Fixture preview only')
 if(op==='lookup')return cache.has(args.key)?{hit:true,payload:cache.get(args.key)}:{hit:false}
 if(op==='claim'){if(claims.has(args.key))return {ok:false};claims.set(args.key,args.claim);return {ok:true}}
 if(op==='publish'){if(claims.get(args.key)!==args.claim)return {ok:false};cache.set(args.key,args.payload);claims.delete(args.key);return {ok:true}}
 if(op==='fail'){if(claims.get(args.key)===args.claim)claims.delete(args.key);return {ok:true}}
 return {ok:true}
}
export async function budgetedMessage(input:any):Promise<any>{
 if(process.env.VERCEL_ENV!=='preview')throw new Error('Fixture preview only')
 if(input.prompt.includes('Fixture Cap'))throw new Error('Fixture budget exhausted')
 const n=input.prompt.includes('Fixture Thin')?2:6
 const payload=[0,1].map(index=>({index,books:Array.from({length:n},(_,i)=>({title:`Fixture Candidate ${index}-${i}`,author:`Fixture Writer ${index}-${i}`,themes:['grief','isolation'],tone_match:true,style_match:true,explanation:'Specific grief and isolation themes recur in both works with a restrained narrative style.'})).concat([{title:'Catalog mismatch',author:'Fake',themes:['grief','isolation'],tone_match:true,style_match:true,explanation:'This is a deliberately nonexistent catalog candidate for filtering proof.'}])}))
 return {content:[{type:'text',text:JSON.stringify(payload)}]}
}
