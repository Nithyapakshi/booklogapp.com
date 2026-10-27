"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"

export function useNextRead(userId?: string) {
  const [state, setState] = useState<{owner?: string; id: string | null; loading: boolean; error: boolean}>({id:null, loading:true, error:false})
  const owner = useRef(userId)
  const generation = useRef(0)
  const epoch = useRef(0)
  const saving = useRef(false)
  if (owner.current !== userId) { owner.current=userId; ++epoch.current; ++generation.current; saving.current=false }
  const read = useCallback(async () => {
    if (!userId) { setState({owner:userId,id:null,loading:false,error:false}); return }
    if (saving.current) return
    const version = ++generation.current
    setState(prev => ({...prev,id:prev.owner===userId?prev.id:null,owner:userId,loading:true,error:false}))
    try {
      const {data,error} = await createClientSupabaseClient().from("next_read").select("book_id").eq("user_id",userId).maybeSingle()
      if (owner.current !== userId || version !== generation.current) return
      if (error) throw error
      setState({owner:userId,id:data?.book_id ?? null,loading:false,error:false})
    } catch { if (owner.current === userId && version === generation.current) setState(prev=>({...prev,owner:userId,loading:false,error:true})) }
  },[userId])
  useEffect(() => { void read() },[read])
  // Reconcile choices made on another device when returning to this page.
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") void read() }
    window.addEventListener("focus",refresh)
    return () => window.removeEventListener("focus",refresh)
  },[read])
  const save = async (id: string) => {
    if (!userId || owner.current !== userId) throw new Error("Sign in again to save your next read")
    const operationEpoch = epoch.current
    ++generation.current
    saving.current = true
    try {
      const {error} = await createClientSupabaseClient().from("next_read").upsert({user_id:userId,book_id:id})
      if (error) throw error
      if (owner.current === userId && epoch.current === operationEpoch) setState({owner:userId,id,loading:false,error:false})
    } catch (error) {
      if (owner.current === userId && epoch.current === operationEpoch) setState(prev=>({...prev,loading:false,error:true}))
      throw error
    } finally {
      if (owner.current === userId && epoch.current === operationEpoch) {++generation.current;saving.current=false}
    }
  }

  const forgetLocally = () => { ++generation.current; if (owner.current === userId) setState({owner:userId,id:null,loading:false,error:false}) }
  return {id:state.owner===userId?state.id:null,loading:state.owner!==userId||state.loading,error:state.owner===userId&&state.error,read,save,forgetLocally}
}
