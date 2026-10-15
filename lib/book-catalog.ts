// Public catalog corroboration. Model text never establishes title/author identity.
export type CatalogBook = {id:string;title:string;author:string;cover:string;description:string;genre?:string}
export type CatalogResult = {book:CatalogBook|null;reason:string}
const norm = (s:string) => String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()
const base = (s:string) => norm(String(s||'').split(':')[0].replace(/\([^)]*\)/g,''))
const text = (v:any) => typeof v==='string'?v:typeof v?.value==='string'?v.value:''
export async function resolveCatalogBook(title:string,author:string,requireDescription=false):Promise<CatalogResult>{
 if(!title||!author||title.length>250||author.length>250)return {book:null,reason:'invalid_input'}
 const words=norm(author).split(' ').filter(w=>w.length>2)
 if(!words.length)return {book:null,reason:'invalid_author'}
 const authorMatches=(s:string)=>words.every(w=>norm(s).split(' ').includes(w))
 const clean=(s:string)=>s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,2000)
 const deadline=Date.now()+6500;let requests=0
 const read=async(url:string):Promise<{data:any;status:number;failure?:string}>=>{
  if(++requests>12||Date.now()>=deadline)return {data:null,status:0,failure:'deadline'}
  try{const r=await fetch(url,{signal:AbortSignal.timeout(Math.max(1,Math.min(2500,deadline-Date.now())))});return {data:r.ok?await r.json():null,status:r.status}}catch{return {data:null,status:0,failure:'network'}}
 }
 const query=new URLSearchParams({q:`intitle:"${title.replace(/"/g,'')}" inauthor:"${author.replace(/"/g,'')}"`,maxResults:'10',langRestrict:'en',printType:'books',key:process.env.GOOGLE_BOOKS_SERVER_KEY||process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY||''})
 const google=await read(`https://www.googleapis.com/books/v1/volumes?${query}`)
 const items=Array.isArray(google.data?.items)?google.data.items:[]
 let reason=google.failure?`google_${google.failure}`:google.status!==200?`google_http_${google.status}`:!items.length?'google_empty':'google_no_identity'
 for(const item of items){const v=item.volumeInfo||{}
  if(base(v.title)!==base(title)||!(v.authors||[]).some(authorMatches)||v.language!=='en'||typeof item.id!=='string')continue
  const description=clean(text(v.description));if(requireDescription&&!description){reason='google_no_description';continue}
  return {book:{id:item.id,title:String(v.title),author:v.authors.join(', '),cover:String(v.imageLinks?.thumbnail||'').replace(/^http:/,'https:'),description,genre:v.categories?.[0]},reason:'google_verified'}
 }
 const authors=new Map<string,Promise<boolean>>()
 const authorKeyMatches=(key:string):Promise<boolean>=>{
  if(!/^\/authors\/OL\d+A$/.test(key))return Promise.resolve(false)
  if(!authors.has(key))authors.set(key,read(`https://openlibrary.org${key}.json`).then(({data:a})=>!!a&&[a.name,...(Array.isArray(a.alternate_names)?a.alternate_names:[])].some(n=>typeof n==='string'&&authorMatches(n))))
  return authors.get(key)!
 }
 const fields='key,title,author_name,author_key,editions,editions.key,editions.title,editions.language,editions.cover_i'
 const params=new URLSearchParams({title,author,lang:'en',limit:'5',fields})
 let search=await read(`https://openlibrary.org/search.json?${params}`)
 let docs=Array.isArray(search.data?.docs)?search.data.docs:[]
 // Try without the search author restriction to resolve canonical aliases, never without author verification.
 if(!docs.length){params.delete('author');search=await read(`https://openlibrary.org/search.json?${params}`);docs=Array.isArray(search.data?.docs)?search.data.docs:[]}
 for(const d of docs.slice(0,5)){
  if(!/^\/works\/OL\d+W$/.test(d.key))continue
  const bound=(d.author_name||[]).some(authorMatches)||(await Promise.all((d.author_key||[]).slice(0,4).map((k:string)=>authorKeyMatches(`/authors/${k}`)))).some(Boolean)
  if(!bound)continue
  const work=await read(`https://openlibrary.org${d.key}.json`)
  let editions=(d.editions?.docs||[]).slice(0,5)
  if(!editions.some((e:any)=>base(e.title)===base(title)&&e.language?.includes('eng'))){const full=await read(`https://openlibrary.org${d.key}/editions.json?limit=100`);editions=full.data?.entries||[]}
  for(const nested of editions.slice(0,100)){
   if(base(nested.title)!==base(title)||!/^\/books\/OL\d+M$/.test(nested.key))continue
   const edition=await read(`https://openlibrary.org${nested.key}.json`);const e=edition.data
   if(!e||base(e.title)!==base(title)||!e.languages?.some((l:any)=>l?.key==='/languages/eng'))continue
   // A work description is evidence only when the verified edition links back to that work.
   const sameWork=Array.isArray(e.works)&&e.works.some((w:any)=>w?.key===d.key)
   const ids=(e.authors?.length?e.authors:work.data?.authors||[]).slice(0,4).map((a:any)=>a?.key||a?.author?.key)
   if(!ids.length||!(await Promise.all(ids.map(authorKeyMatches))).some(Boolean))continue
   const description=clean(text(e.description)||(sameWork?text(work.data?.description):''))
   if(requireDescription&&!description){reason='openlibrary_no_description';continue}
   const cover=(e.covers||[]).find((n:any)=>Number.isSafeInteger(n)&&n>0)
   return {book:{id:e.key,title:String(e.title),author,cover:cover?`https://covers.openlibrary.org/b/id/${cover}-M.jpg`:'',description},reason:`${reason};openlibrary_verified`}
  }
 }
 return {book:null,reason:`${reason};openlibrary_${search.failure|| (search.status!==200?`http_${search.status}`:'unverified')}`}
}
