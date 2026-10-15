"use client"
import {useState} from "react"
import {useTheme} from "next-themes"
import {BookDetailsDialog} from "@/components/book-details-dialog"
import {Button} from "@/components/ui/button"
export default function Fixture(){const [open,setOpen]=useState(false);const {setTheme}=useTheme();return <main className="p-8"><h1>Test-only cover and reason fixture</h1><p>Fixed public catalog data. No AI calls or saved books. Do not merge this branch.</p><Button onClick={()=>setTheme("light")}>Light</Button><Button onClick={()=>setTheme("dark")}>Dark</Button><Button onClick={()=>setOpen(true)}>Open recommendation details</Button><BookDetailsDialog book={{id:"fixture-only-idiot",title:"The Idiot",author:"Fyodor Dostoevsky",cover:"https://covers.openlibrary.org/b/id/14985202-M.jpg",description:"Prince Myshkin returns to Russia and becomes entangled in difficult relationships.",publishedYear:"1869",genre:"Fiction"}} open={open} onClose={()=>setOpen(false)} mode="add" reason="TEST_REASON_SENTINEL: this reason must not render in the modal."/></main>}
