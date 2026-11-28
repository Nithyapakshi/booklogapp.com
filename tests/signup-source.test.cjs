const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript')
const read=p=>fs.readFileSync(p,'utf8')
const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(read('lib/signup-source.ts'),{compilerOptions:{module:'commonjs',target:'es2020'}}).outputText)(()=>({track:()=>{}}),mod,mod.exports)
const {landingPath,cleanTag,referrerHost,sourceFromVisit,parseStored,nextStored,signupSourceMetadata,isNewAccount,sourceEventDetail,SOURCE_TTL_MS,NEW_ACCOUNT_MS}=mod.exports
const now=Date.parse('2026-11-25T10:00:00Z')

test('tags are cleaned to short plain words',()=>{
 assert.equal(cleanTag(' LinkedIn '),'linkedin')
 assert.equal(cleanTag('nov27_post'),'nov27_post')
 assert.equal(cleanTag('<script>x'),'scriptx')
 assert.equal(cleanTag('chatgpt.com'),'chatgpt.com')
 assert.equal(cleanTag('a'.repeat(80)).length,40)
 for(const v of ['',null,undefined,5,'!!!'])assert.equal(cleanTag(v),undefined)
})

test('referrer keeps only another site\'s domain',()=>{
 assert.equal(referrerHost('https://www.reddit.com/r/52book/comments/abc?x=1','www.booklogapp.com'),'reddit.com')
 assert.equal(referrerHost('https://www.booklogapp.com/home','www.booklogapp.com'),undefined)
 assert.equal(referrerHost('https://booklog.app/','preview.vercel.app'),undefined)
 assert.equal(referrerHost('not a url','x'),undefined)
 assert.equal(referrerHost('','x'),undefined)
})

test('a tagged visit is remembered; a direct visit is not',()=>{
 assert.deepEqual(sourceFromVisit('?utm_source=linkedin&utm_medium=social&utm_campaign=nov27_post','', 'www.booklogapp.com',now),{t:now,s:'linkedin',m:'social',c:'nov27_post'})
 assert.equal(sourceFromVisit('','', 'www.booklogapp.com',now),null)
 assert.equal(sourceFromVisit('?utm_medium=social','', 'www.booklogapp.com',now),null)
 assert.deepEqual(sourceFromVisit('','https://www.reddit.com/x','www.booklogapp.com',now),{t:now,r:'reddit.com'})
})

test('first visit wins and expires after 30 days',()=>{
 const first={t:now,s:'reddit'},later={t:now,s:'linkedin'}
 assert.equal(nextStored(first,later),null)
 assert.deepEqual(nextStored(null,later),later)
 assert.deepEqual(parseStored(JSON.stringify(first),now+1000),first)
 assert.equal(parseStored(JSON.stringify(first),now+SOURCE_TTL_MS+1),null)
 for(const raw of [null,'','{',JSON.stringify({s:'x'}),JSON.stringify({t:now+3600e3,s:'x'})])assert.equal(parseStored(raw,now),null)
})

test('email signup sends only the values present',()=>{
 assert.deepEqual(signupSourceMetadata(null),{})
 assert.deepEqual(signupSourceMetadata({t:now,s:'reddit',r:'reddit.com'}),{signup_source:'reddit',signup_referrer:'reddit.com'})
 assert.deepEqual(signupSourceMetadata({t:now,s:'linkedin',m:'social',c:'nov27_post'}),{signup_source:'linkedin',signup_medium:'social',signup_campaign:'nov27_post'})
})

test('only accounts under 7 days old are recorded',()=>{
 assert.equal(isNewAccount(new Date(now-3600e3).toISOString(),now),true)
 assert.equal(isNewAccount(new Date(now-NEW_ACCOUNT_MS-1).toISOString(),now),false)
 assert.equal(isNewAccount('2026-10-01T00:00:00Z',now),false)
 assert.equal(isNewAccount('2026-11-24T14:30:00Z',now),false,'created before tracking began (merge, 24 Nov 19:00 Dubai)')
 for(const v of [null,undefined,'','bad'])assert.equal(isNewAccount(v,now),false)
})

test('source comes from the account, then the browser, else unknown; a referrer never sets it',()=>{
 const g={app_metadata:{provider:'google'},user_metadata:{full_name:'X'}}
 const e={app_metadata:{provider:'email'},user_metadata:{signup_source:'linkedin',signup_medium:'social',signup_campaign:'nov27_post'}}
 assert.deepEqual(sourceEventDetail(e,{t:now,s:'reddit'}),{source:'linkedin',via:'account',provider:'email',medium:'social',campaign:'nov27_post'})
 assert.deepEqual(sourceEventDetail(g,{t:now,s:'reddit',m:'social'}),{source:'reddit',via:'browser',provider:'google',medium:'social'})
 assert.deepEqual(sourceEventDetail(g,{t:now,r:'reddit.com'}),{source:'unknown',via:'browser',provider:'google',referrer:'reddit.com'})
 assert.deepEqual(sourceEventDetail({app_metadata:{provider:'email'},user_metadata:{signup_referrer:'reddit.com'}},null),{source:'unknown',via:'account',provider:'email',referrer:'reddit.com'})
 assert.deepEqual(sourceEventDetail(g,null),{source:'unknown',via:'none',provider:'google'})
 assert.deepEqual(sourceEventDetail(null,null),{source:'unknown',via:'none',provider:'unknown'})
 const d=JSON.stringify(sourceEventDetail(g,{t:now,s:'reddit'}))
 assert.doesNotMatch(d,/full_name|email"|X"/)
})

test('wired in: every page captures, email signup sends it, My Books records it once',()=>{
 assert.match(read('app/layout.tsx'),/<SourceCapture \/>/)
 assert.match(read('app/signup/page.tsx'),/\.\.\.signupConsentMetadata\(marketingOptIn\), \.\.\.signupSourceMetadata\(readStoredSource\(\)\)/)
 assert.match(read('app/books/page.tsx'),/recordSignupSource\(user\)/)
 const lib=read('lib/signup-source.ts')
 assert.match(lib,/track(WithCountry)?\("account\.source"/)
 assert.ok(/^[a-z_]+\.[a-z_]+$/.test('account.source'))
})

test('privacy notice mentions how you found BookLog',()=>{
 assert.match(read('app/privacy/page.tsx'),/record how you found BookLog/)
})

test('landing page is kept as a plain path, only with a tag or referrer',()=>{
 assert.equal(landingPath('/goodreads-alternative'),'/goodreads-alternative')
 assert.equal(landingPath('/home?utm_source=x#top'),'/home')
 for(const v of [null,'','home','https://x.com/a','/a b','/'+'x'.repeat(80)])assert.equal(landingPath(v),undefined)
 assert.deepEqual(sourceFromVisit('?utm_source=reddit','','www.booklogapp.com',now,'/goodreads-alternative'),{t:now,s:'reddit',l:'/goodreads-alternative'})
 assert.equal(sourceFromVisit('','','www.booklogapp.com',now,'/goodreads-alternative'),null)
 assert.deepEqual(signupSourceMetadata({t:now,s:'reddit',l:'/goodreads-alternative'}),{signup_source:'reddit',signup_landing:'/goodreads-alternative'})
 assert.equal(sourceEventDetail({app_metadata:{provider:'email'},user_metadata:{signup_source:'reddit',signup_landing:'/goodreads-alternative'}},null).landing,'/goodreads-alternative')
 assert.equal(sourceEventDetail({app_metadata:{provider:'google'}},{t:now,r:'alternativeto.net',l:'/goodreads-alternative'}).landing,'/goodreads-alternative')
})

test('Goodreads-alternative page is public, listed for crawlers, and leads to signup',()=>{
 const p=read('app/goodreads-alternative/page.tsx')
 assert.match(p,/canonical: `\$\{PUBLIC_ORIGIN\}\/goodreads-alternative`/)
 assert.match(p,/href="\/signup" className=\{home\.cta\}>Import from Goodreads/)
 assert.doesNotMatch(p,/20\d\d reading year/)
 assert.match(read('app/robots.ts'),/allow: \["\/", "\/home", "\/goodreads-alternative", "\/privacy"\]/)
})
