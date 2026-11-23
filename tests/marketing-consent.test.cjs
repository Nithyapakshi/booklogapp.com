const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript')
const read=p=>fs.readFileSync(p,'utf8')
const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(read('lib/marketing-consent.ts'),{compilerOptions:{module:'commonjs',target:'es2020'}}).outputText)(()=>({}),mod,mod.exports)
const {CONSENT_TEXT,CONSENT_VERSION,signupConsentMetadata,parsePreference,isNewGoogleAccount,promptToShow,surveyShowsEmailChoice,WELCOME_STEP_AFTER}=mod.exports
const sql=read('supabase/migrations/20261123_marketing_consent.sql')
const after=new Date(Date.parse(WELCOME_STEP_AFTER)+3600e3).toISOString()
const before=new Date(Date.parse(WELCOME_STEP_AFTER)-3600e3).toISOString()
const ask={subscribed:false,ask:true}

test('browser words match the words the server records for v1',()=>{
 assert.equal(CONSENT_VERSION,'v1')
 assert.equal(CONSENT_TEXT,'Get book recommendations and new features by email. Unsubscribe anytime.')
 assert.ok(sql.includes(`when 'v1' then '${CONSENT_TEXT}'`))
})

test('signup sends only the choice and version; an untouched box is a no',()=>{
 assert.deepEqual(signupConsentMetadata(false),{marketing_opt_in:'false',consent_version:'v1'})
 assert.deepEqual(signupConsentMetadata(true),{marketing_opt_in:'true',consent_version:'v1'})
 for(const v of [undefined,null,'true',1])assert.equal(signupConsentMetadata(v).marketing_opt_in,'false')
})

test('signup checkbox starts unticked and is not required',()=>{
 const page=read('app/signup/page.tsx')
 assert.match(page,/setMarketingOptIn\] = useState\(false\)/)
 assert.match(page,/signupConsentMetadata\(marketingOptIn\)/)
 assert.doesNotMatch(page,/id="marketing-opt-in"[^>]*required/)
 assert.doesNotMatch(page,/defaultChecked/)
})

test('preference parsing is strict',()=>{
 assert.deepEqual(parsePreference({subscribed:true,ask:false}),{subscribed:true,ask:false})
 for(const bad of [null,undefined,'x',{},{subscribed:'true',ask:false},{subscribed:true}])assert.equal(parsePreference(bad),null)
})

test('only new Google accounts who have not chosen get the checkbox in the welcome survey',()=>{
 assert.equal(isNewGoogleAccount({created_at:after,app_metadata:{provider:'google'}}),true)
 assert.equal(isNewGoogleAccount({created_at:before,app_metadata:{provider:'google'}}),false)
 assert.equal(isNewGoogleAccount({created_at:after,app_metadata:{provider:'email'}}),false)
 assert.equal(isNewGoogleAccount(null),false)
 const g={created_at:after,app_metadata:{provider:'google'}}
 assert.equal(surveyShowsEmailChoice(ask,g),true)
 assert.equal(surveyShowsEmailChoice({subscribed:false,ask:false},g),false)
 assert.equal(surveyShowsEmailChoice(null,g),false)
 assert.equal(surveyShowsEmailChoice(ask,{created_at:after,app_metadata:{provider:'email'}}),false)
})

test('card shows once asked is needed, on My Books, with no other popup pending',()=>{
 const user={created_at:before,app_metadata:{provider:'email'}}
 assert.equal(promptToShow({pref:ask,user,onMyBooks:true,otherPopupPending:false}),'login_prompt')
 assert.equal(promptToShow({pref:ask,user:{created_at:after,app_metadata:{provider:'google'}},onMyBooks:true,otherPopupPending:false}),'login_prompt')
 // A stored yes or no, a dismissal or an unsubscribe all come back as ask=false: never asked again.
 assert.equal(promptToShow({pref:{subscribed:false,ask:false},user,onMyBooks:true,otherPopupPending:false}),null)
 assert.equal(promptToShow({pref:{subscribed:true,ask:false},user,onMyBooks:true,otherPopupPending:false}),null)
 // Never stacks on the welcome survey or another dialog, never off My Books, never without a read.
 assert.equal(promptToShow({pref:ask,user,onMyBooks:true,otherPopupPending:true}),null)
 assert.equal(promptToShow({pref:ask,user,onMyBooks:false,otherPopupPending:false}),null)
 assert.equal(promptToShow({pref:null,user,onMyBooks:true,otherPopupPending:false}),null)
})

test('server: never asked again after yes, no, close or unsubscribe',()=>{
 assert.match(sql,/'ask', r\.marketing_opt_in is null and r\.marketing_prompt_dismissed_at is null and r\.unsubscribed_at is null/)
 assert.match(sql,/'subscribed', coalesce\(r\.marketing_opt_in, false\) and r\.unsubscribed_at is null/)
})

test('server: words come from the server, readers cannot touch the tables or forge a signup choice',()=>{
 assert.match(sql,/v_text text := public\.marketing_consent_text\(p_version\)/)
 assert.match(sql,/revoke all on public\.email_consent_log from public, anon, authenticated/)
 assert.doesNotMatch(sql,/create policy/i)
 assert.match(sql,/revoke all on function public\.marketing_record_choice\(uuid, boolean, text, text\) from public, anon, authenticated/)
 assert.match(sql,/if auth\.uid\(\) is null or p_source = 'signup' then return false/)
 for(const f of ['set_marketing_preference(boolean, text, text)','dismiss_marketing_prompt(text)','get_marketing_preference()'])
  assert.ok(sql.includes(`grant execute on function public.${f} to authenticated`),f)
 assert.doesNotMatch(sql,/to anon/)
})

test('server: every choice is logged with source, and signup can never fail because of it',()=>{
 assert.match(sql,/insert into public\.email_consent_log \(user_id, choice, consent_text, consent_version, source\)/)
 assert.match(sql,/check \(source in \('signup', 'login_prompt', 'welcome_step', 'settings'\)\)/)
 assert.match(sql,/exception when others then\n    null;\n  end;\n  return new;/)
 assert.match(sql,/after insert on auth\.users/)
})

test('migration is additive only',()=>{
 assert.doesNotMatch(sql,/drop table|drop column|delete from|truncate|alter table public\.(books|profiles|usage_events|survey_events)/i)
 assert.doesNotMatch(sql,/handle_new_user|unsubscribe_email/)
})

test('the send list needs an explicit yes, not just no unsubscribe',()=>{
 const recipients=read('scripts/reader-update/recipients.sql')
 assert.match(recipients,/and ep\.marketing_opt_in is true\n  and ep\.unsubscribed_at is null/)
})

test('prompt and Settings: yes is never pre-selected; a failed yes never looks saved',()=>{
 const prompt=read('components/email-preference-prompt.tsx')
 assert.match(prompt,/if \(\(rpcError \|\| data !== true\) && choice\) \{ setError\("This was not saved\. Try again\."\); return \}/)
 assert.match(prompt,/rpc\("dismiss_marketing_prompt"/)
 const setting=read('components/email-preference-setting.tsx')
 assert.match(setting,/role="switch"/)
 assert.match(setting,/p_source: "settings"/)
 const page=read('app/books/page.tsx')
 assert.match(page,/otherPopupPending: !surveyChecked \|\| surveyOpen \|\| surveyWillShow \|\| surveyAskedRef\.current \|\| !!linkedBook/)
 assert.match(page,/\{emailPrompt && !surveyOpen && <EmailPreferencePrompt/)
})

test('welcome survey: checkbox off by default, unticked, saved only with Show my books, after the answers',()=>{
 const c=read('components/first-run-survey.tsx')
 assert.match(c,/emailChoice = false \}/)
 assert.match(c,/const showEmailChoice = emailChoice === true && !editMode/)
 assert.match(c,/const \[emailOptIn, setEmailOptIn\] = useState\(false\)/)
 assert.match(c,/\{showEmailChoice && \(/)
 // Answers are written and checked first; the email choice is fire-and-forget after that, only on completed.
 const ins=c.indexOf('.from("survey_events").insert(row)'),err=c.indexOf('if (writeError && outcome === "completed")'),rpc=c.indexOf('rpc("set_marketing_preference"'),fin=c.lastIndexOf('onFinished(outcome)\n    } catch')
 assert.ok(ins>0&&err>ins&&rpc>err&&fin>rpc,'order: insert, error check, email choice, close')
 assert.match(c,/if \(outcome === "completed" && showEmailChoice\)/)
 assert.match(c,/p_source: "welcome_step"/)
 assert.doesNotMatch(c,/await supabase\.rpc\("set_marketing_preference"/)
 const page=read('app/books/page.tsx')
 assert.match(page,/emailChoice=\{surveyShowsEmailChoice\(marketingPref, user\)\}/)
 // The edit-answers survey on Discover never gets the checkbox.
 assert.match(page,/<FirstRunSurvey userId=\{discoverUser\.id\} initial=\{surveyAnswers\} onFinished=\{\(\) => \{ setSurveyEditOpen\(false\); setSurveyReload\(n => n \+ 1\) \}\} \/>/)
})
