const test=require('node:test'),assert=require('node:assert'),fs=require('node:fs'),Module=require('module'),ts=require('typescript'),path=require('path')
const m=new Module('spirit');m._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/same-spirit.ts'),'utf8'),{compilerOptions:{module:'commonjs',target:'es2020'}}).outputText,'spirit.js');const {sharedEvidence,cacheKey,parseGroups}=m.exports
test('cache keys use full author/title and fixed prompt/model, not private data',()=>{assert.notEqual(cacheKey('Night','Elie Wiesel'),cacheKey('Night','Someone Wiesel'));assert.match(cacheKey('Night','Elie Wiesel'),/spirit-v5-20\|claude-haiku/);assert.equal(cacheKey('NIGHT','Elie Wiesel'),cacheKey('Night','Elie Wiesel'))})
test('generic genre claims do not corroborate relevance',()=>assert.equal(sharedEvidence('A dark literary fiction novel','A dark fiction novel',['dark','fiction']),false))
test('specific themes require distinct evidence in both catalog descriptions',()=>{assert.equal(sharedEvidence('Grief and isolation shape friendship','Isolation and grief divide a family',['grief','isolation']),true);assert.equal(sharedEvidence('Grief and isolation','A cheerful comedy',['grief','isolation']),false);assert.equal(sharedEvidence('Grief and isolation','Grief and isolation',['grief','grief']),false)})
test('unbounded or invalid model groups rejected',()=>{assert.throws(()=>parseGroups('{}'));assert.throws(()=>parseGroups('[{},{},{}]'));assert.equal(parseGroups('```json\n[{"index":0,"books":[]}]\n```').length,1)})

test('pronouns, author names and settings alone never establish themes',()=>{
 for(const [description,themes] of [
  ['Their lives belong to their elite college in Glasgow',['their lives','elite college']],
  ['Hanya Yanagihara and Donna Tartt explore their front college',['Hanya Yanagihara','Donna Tartt']],
  ['Harvard students in New York share secrets',['Harvard New York','students secrets']],
 ]) assert.equal(sharedEvidence(description,description,themes),false)
})
test('two aliases of the same concept are not two themes',()=>{
 assert.equal(sharedEvidence('Loneliness and alienation','Isolation and alienation',['loneliness','alienation']),false)
})
test('ordinary thematic wording differences corroborate two distinct concepts',()=>{
 assert.equal(sharedEvidence('Bereavement and loneliness haunt the narrator','Grief and isolation shape the survivor',['grief','loneliness']),true)
})
test('thematic title/author tokens cannot supply independent evidence',()=>{
 assert.equal(sharedEvidence('Grief Isolation is a famous writer','Grief Isolation is a famous writer',['grief','isolation'],['Grief Isolation']),false)
 assert.equal(sharedEvidence('The Secret History has ambition and grief','Ambition and grief devastate a family',['secret','ambition'],['The Secret History']),false)
})
test('unknown themes and substring coincidences fail closed',()=>{
 assert.equal(sharedEvidence('Atmospheric lyrical college students','Atmospheric lyrical college students',['atmospheric','lyrical']),false)
 assert.equal(sharedEvidence('Deathly grief-stricken atmosphere','Deathly grief-stricken atmosphere',['mortality','grief']),false)
})

test('reviewed editorial leads are seed/author-bound, never generic',()=>{
 assert.equal(m.exports.editorialLeads('A Little Life','Hanya Yanagihara')[0].title,'Shuggie Bain')
 assert.equal(m.exports.editorialLeads('The Secret History','Donna Tartt')[0].title,'If We Were Villains')
 assert.equal(m.exports.editorialLeads('A Little Life','Wrong Author').length,0)
})
test('one concept is weaker evidence, no concepts do not become relevance',()=>{
 assert.equal(m.exports.evidenceCount('Grief and elite college','Grief and elite college',['grief','elite college']),1)
 assert.equal(m.exports.evidenceCount('Their elite college','Their elite college',['their','elite college']),0)
})
test('gradient orders strongest first and keeps one best edition identity',()=>{
 const list=m.exports.rankSpirit([{title:'Weak',author:'A',relevanceScore:25},{title:'Best',author:'B',relevanceScore:100},{title:'Weak',author:'A',relevanceScore:50}]);assert.deepEqual(list.map(x=>x.relevanceScore),[100,50])
})
