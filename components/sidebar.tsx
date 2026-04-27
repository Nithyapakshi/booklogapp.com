"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import Link from "next/link"
import { BookOpen, Sparkles, Heart, ChevronLeft, ChevronRight } from "lucide-react"

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState("")
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showPopover, setShowPopover] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false)
      }
    }
    if (showPopover) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showPopover])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return
      const supabase = createClientSupabaseClient()
      const { data } = await supabase
        .from("profiles")
        .select("name, username")
        .eq("user_id", user.id)
        .single()
      if (data?.name) setDisplayName(data.name)
      else if (data?.username) setDisplayName(data.username)
      else setDisplayName(user.email?.split("@")[0] || "")
    }
    fetchProfile()
  }, [user])

  const firstName = displayName.split(" ")[0] || displayName

  const libraryItems = [
    { id: "my-books",    label: "My Books",           icon: BookOpen },
    { id: "recommended", label: "My Recommendations",  icon: Heart    },
  ]

  const exploreItems = [
    { id: "discover",    label: "Discover",            icon: Sparkles },
  ]

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={`
          hidden md:flex flex-col flex-shrink-0 transition-all duration-250 relative
          ${collapsed ? "w-[60px]" : "w-[240px]"}
        `}
        style={{
          minHeight: "100vh",
          background: "#faf7f2",
          borderRight: "1px solid #e8e0d5",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 overflow-hidden"
          style={{ padding: "22px 20px 18px", minHeight: "68px" }}
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}>
              <rect x="3" y="17" width="22" height="5" rx="1.5" fill="#c17f3e" />
              <rect x="3" y="10.5" width="17" height="5" rx="1.5" fill="#c17f3e" opacity="0.62" />
              <rect x="3" y="4" width="12" height="5" rx="1.5" fill="#c17f3e" opacity="0.32" />
            </svg>
          {!collapsed && (
            <span
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "17px",
                fontWeight: "700",
                color: "#2d2416",
                whiteSpace: "nowrap",
              }}
            >
              BookLog
            </span>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute z-10 flex items-center justify-center"
          style={{
            top: "22px",
            right: "-12px",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: "#f0ebe2",
            border: "1px solid #ddd5c8",
            color: "#888",
            fontSize: "10px",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* Nav */}
        <nav className="flex-1 overflow-hidden" style={{ paddingTop: "16px" }}>

          {/* Library section */}
          {!collapsed && (
            <div
              style={{
                fontSize: "10px",
                fontWeight: "600",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#b8a898",
                padding: "0 20px 6px",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Library
            </div>
          )}
          {collapsed && <div style={{ height: "22px" }} />}

          {libraryItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className="w-full flex items-center overflow-hidden"
                style={{
                  gap: "11px",
                  padding: "10px 20px",
                  borderLeft: `2.5px solid ${isActive ? "#c17f3e" : "transparent"}`,
                  background: isActive ? "rgba(193,127,62,0.08)" : "transparent",
                  color: isActive ? "#c17f3e" : "#6b5c4e",
                  fontWeight: isActive ? "600" : "500",
                  fontSize: "13px",
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  textAlign: "left",
                  transition: "background 0.15s",
                }}
              >
                <Icon size={15} style={{ flexShrink: 0, width: "18px" }} />
                {!collapsed && <span>{label}</span>}
              </button>
            )
          })}

          {/* Divider */}
          <div style={{ height: "1px", background: "#ede6dc", margin: "10px 0" }} />

          {/* Explore section */}
          {!collapsed && (
            <div
              style={{
                fontSize: "10px",
                fontWeight: "600",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#b8a898",
                padding: "6px 20px 6px",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Explore
            </div>
          )}

          {exploreItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className="w-full flex items-center overflow-hidden"
                style={{
                  gap: "11px",
                  padding: "10px 20px",
                  borderLeft: `2.5px solid ${isActive ? "#c17f3e" : "transparent"}`,
                  background: isActive ? "rgba(193,127,62,0.08)" : "transparent",
                  color: isActive ? "#c17f3e" : "#6b5c4e",
                  fontWeight: isActive ? "600" : "500",
                  fontSize: "13px",
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  textAlign: "left",
                  transition: "background 0.15s",
                }}
              >
                <Icon size={15} style={{ flexShrink: 0, width: "18px" }} />
                {!collapsed && <span>{label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Settings nav item */}
        <div style={{ borderTop: "1px solid #ede6dc" }}>
          <Link
            href="/settings"
            className="w-full flex items-center overflow-hidden"
            style={{
              gap: "11px",
              padding: "10px 20px",
              color: "#6b5c4e",
              fontWeight: "500",
              fontSize: "13px",
              fontFamily: "'DM Sans', sans-serif",
              textDecoration: "none",
              borderLeft: "2.5px solid transparent",
              display: "flex",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            {!collapsed && <span>Settings</span>}
          </Link>
        </div>

        {/* Profile — popover with sign out */}
        <div ref={popoverRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowPopover(!showPopover)}
            className="flex items-center overflow-hidden w-full"
            style={{
              gap: "10px",
              padding: "14px 20px",
              background: "transparent",
              border: "none",
              borderTop: "1px solid #ede6dc",
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "#c17f3e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: "700",
                color: "white",
                flexShrink: 0,
              }}
            >
              {mounted && firstName ? firstName[0].toUpperCase() : "?"}
            </div>
            {!collapsed && (
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#8a7060",
                  whiteSpace: "nowrap",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {mounted ? firstName : ""}
              </span>
            )}
          </button>
          {showPopover && (
            <div style={{
              position: "absolute",
              bottom: "56px",
              left: "16px",
              background: "#fff",
              border: "0.5px solid #e0d5c4",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              overflow: "hidden",
              minWidth: "140px",
              zIndex: 50,
            }}>
              <button
                onClick={() => { setShowPopover(false); signOut() }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "10px 16px",
                  fontSize: "13px",
                  color: "#6b5c42",
                  fontFamily: "'DM Sans', sans-serif",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex z-50"
        style={{
          background: "#faf7f2",
          borderTop: "1px solid #e8e0d5",
        }}
      >
        {[...libraryItems, ...exploreItems].map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          const shortLabel = id === "recommended" ? "Picks" : label
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className="flex-1 flex flex-col items-center"
              style={{
                gap: "3px",
                padding: "8px 0 16px",
                fontSize: "10px",
                fontWeight: "500",
                color: isActive ? "#c17f3e" : "#b8a898",
                fontFamily: "'DM Sans', sans-serif",
                cursor: "pointer",
                background: "transparent",
                border: "none",
              }}
            >
              <Icon size={20} />
              <span>{shortLabel}</span>
            </button>
          )
        })}
        <Link
          href="/settings"
          className="flex-1 flex flex-col items-center"
          style={{
            gap: "3px",
            padding: "8px 0 16px",
            fontSize: "10px",
            fontWeight: "500",
            color: "#b8a898",
            fontFamily: "'DM Sans', sans-serif",
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: "#c17f3e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "9px",
              fontWeight: "700",
              color: "white",
            }}
          >
            {mounted && firstName ? firstName[0].toUpperCase() : "?"}
          </div>
          <span>{mounted ? firstName : ""}</span>
        </Link>
      </nav>
    </>
  )
}
