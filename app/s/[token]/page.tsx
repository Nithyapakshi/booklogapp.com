import { SharedBook } from "@/components/shared-book"
export const metadata={title:"A book shared with you - BookLog",robots:{index:false,follow:false}}
export default async function SharedPage({params}:{params:Promise<{token:string}>}) {
  const {token}=await params
  return <SharedBook token={token}/>
}
