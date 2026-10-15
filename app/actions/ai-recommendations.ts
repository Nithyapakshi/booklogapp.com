"use server"
import { resolveCatalogBook } from '@/lib/book-catalog'
import { authenticatedClient } from '@/lib/ai-budget'
// Isolated test branch only. No model or budget call; never merge this fixture.
export async function getAIBookRecommendations(query:string,exclude:string[]=[],count:number=5,accessToken:string="") {
 await authenticatedClient(accessToken)
 for(const [title,author] of [['The Goldfinch','Donna Tartt'],['The Great Believers','Rebecca Makkai']]) {
  const start=Date.now(); const result=await resolveCatalogBook(title,author,true)
  console.info('Fixed catalog probe',{title,reason:result.reason,elapsed:Date.now()-start,book:result.book?{id:result.book.id,title:result.book.title,author:result.book.author,hasCover:!!result.book.cover,descriptionLength:result.book.description.length}:null})
 }
 return []
}
