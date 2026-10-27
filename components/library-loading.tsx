export function LibraryLoading() {
  return <section role="status" aria-live="polite" aria-busy="true" className="mt-6" style={{fontFamily:"'DM Sans', sans-serif"}}>
    <p className="text-sm" style={{color:"var(--bl-6b5c42)"}}>Loading your library...</p>
    <p className="text-xs mt-2" style={{color:"var(--bl-8a7560)"}}>Your books will appear here when loading finishes.</p>
    <div aria-hidden="true" className="flex flex-col gap-3 mt-8">
      {[0,1,2].map(i=><div key={i} className="flex items-center gap-4 rounded-lg px-4 py-3" style={{background:"var(--bl-f0ebe2)"}}>
        <div className="w-7 h-10 shrink-0 rounded" style={{background:"var(--bl-e8e0d5)"}}/>
        <div className="flex-1"><div className="h-2.5 rounded max-w-72 w-3/4" style={{background:"var(--bl-ddd5c8)"}}/><div className="h-2 rounded mt-3 max-w-40 w-1/2" style={{background:"var(--bl-e8e0d5)"}}/></div>
      </div>)}
    </div>
  </section>
}
