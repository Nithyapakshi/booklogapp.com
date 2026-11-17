const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript')
const read=p=>fs.readFileSync(p,'utf8')
const origin={exports:{}};origin.exports.PUBLIC_ORIGIN='https://www.booklogapp.com'
const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(read('lib/email-unsubscribe.ts'),{compilerOptions:{module:'commonjs',target:'es2020'}}).outputText)(()=>origin.exports,mod,mod.exports)
const {isUnsubscribeToken,unsubscribePageUrl,unsubscribeOneClickUrl,unsubscribeHeaders}=mod.exports
const token='12345678-1234-4234-9234-123456789abc'

test('only a uuid token is accepted',()=>{
 assert.equal(isUnsubscribeToken(token),true)
 for(const bad of ['',null,undefined,'abc',token+'x',"' or 1=1 --",'00000000000000000000000000000000'])assert.equal(isUnsubscribeToken(bad),false)
})

test('links carry only the token, on the production origin',()=>{
 assert.equal(unsubscribePageUrl(token),`https://www.booklogapp.com/unsubscribe?t=${token}`)
 assert.equal(unsubscribeOneClickUrl(token),`https://www.booklogapp.com/api/unsubscribe?t=${token}`)
 const h=unsubscribeHeaders(token)
 assert.equal(h['List-Unsubscribe'],`<https://www.booklogapp.com/api/unsubscribe?t=${token}>`)
 assert.equal(h['List-Unsubscribe-Post'],'List-Unsubscribe=One-Click')
})

test('migration is additive, locked down and token-only',()=>{
 const sql=read('supabase/migrations/20261113_email_preferences.sql')
 assert.doesNotMatch(sql,/drop |alter table public\.(books|profiles|usage_events)|delete from|truncate/i)
 assert.match(sql,/enable row level security/)
 assert.match(sql,/revoke all on public.email_preferences from public, anon, authenticated/)
 assert.doesNotMatch(sql,/create policy/i)
 assert.match(sql,/security definer set search_path = ''/)
 assert.match(sql,/where unsubscribe_token = p_token/)
 assert.match(sql,/grant execute on function public.unsubscribe_email\(uuid\) to anon, authenticated/)
 assert.match(sql,/'email\.unsubscribed'/)
 assert.match(sql,/on conflict do nothing/)
})

test('opening the page never unsubscribes; only the button or a mail-app POST does',()=>{
 const page=read('app/unsubscribe/page.tsx')
 assert.doesNotMatch(page,/unsubscribeFromEmails\(/)
 assert.match(page,/index: false/)
 assert.match(read('components/unsubscribe-button.tsx'),/onClick=\{unsubscribe\}/)
 const route=read('app/api/unsubscribe/route.ts')
 assert.match(route,/export async function POST/)
 assert.doesNotMatch(route,/export async function GET/)
})

test('server action uses only the exact-token RPC, never tables or a service key',()=>{
 const a=read('app/actions/unsubscribe.ts')
 assert.match(a,/rpc\("unsubscribe_email", \{ p_token: token \}\)/)
 assert.doesNotMatch(a,/\.from\(|SERVICE_ROLE|email_preferences/)
 assert.match(a,/if \(!isUnsubscribeToken\(token\)\) return "invalid"/)
})
