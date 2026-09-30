"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { AxiosInstance } from "axios"
import { createGuestClient, GuestApiError } from "./api"
import type { GuestSession, SessionView } from "./types"

/** A closed session is still shown (receipt) for this long after closing. */
const CLOSED_SESSION_GRACE_MS = 30 * 60 * 1000

type Phase = "loading" | "ready" | "invalid" | "error"

type TableSessionValue = {
  phase: Phase
  errorMessage: string | null
  tenantSlug: string
  tableToken: string
  guest: GuestSession | null
  client: AxiosInstance
  /** Base path of this table's pages, e.g. /order/demo/abc123. */
  basePath: string
  /** Opens (or rejoins) the table's live session, replacing the cached one. */
  reopen: () => Promise<void>
}

const TableSessionContext = createContext<TableSessionValue | null>(null)

const storageKey = (tableToken: string) => `dio_table_session:${tableToken}`

/**
 * Current guest token per table token. Kept outside React so the axios client
 * (created once) always sends the latest token without re-rendering.
 */
const guestTokens = new Map<string, string>()

function readStored(tableToken: string): GuestSession | null {
  try {
    const raw = localStorage.getItem(storageKey(tableToken))
    return raw ? (JSON.parse(raw) as GuestSession) : null
  } catch {
    return null
  }
}

function writeStored(tableToken: string, session: GuestSession | null) {
  try {
    if (session) localStorage.setItem(storageKey(tableToken), JSON.stringify(session))
    else localStorage.removeItem(storageKey(tableToken))
  } catch {
    // Private mode / storage disabled: the session just won't survive a reload.
  }
}

/**
 * Binds this device to the table's session. A cached guest token (localStorage,
 * per table token) is reused so a refresh keeps the same session — and still
 * shows the receipt right after paying. Otherwise the QR token opens or joins
 * the live session.
 */
export function TableSessionProvider({
  tenantSlug,
  tableToken,
  children,
}: {
  tenantSlug: string
  tableToken: string
  children: React.ReactNode
}) {
  const [phase, setPhase] = useState<Phase>("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [guest, setGuest] = useState<GuestSession | null>(null)
  const client = useMemo(
    () => createGuestClient(() => guestTokens.get(tableToken) ?? null),
    [tableToken],
  )

  const adopt = useCallback(
    (session: GuestSession) => {
      guestTokens.set(tableToken, session.guestToken)
      writeStored(tableToken, session)
      setGuest(session)
      setPhase("ready")
    },
    [tableToken],
  )

  const open = useCallback(async () => {
    try {
      const session = await client.post<GuestSession, GuestSession>(
        `/public/tables/${encodeURIComponent(tableToken)}/session`,
      )
      adopt(session)
    } catch (error) {
      const e = error as GuestApiError
      if (e.status === 404) {
        setPhase("invalid")
      } else {
        setErrorMessage(e.message)
        setPhase("error")
      }
    }
  }, [adopt, client, tableToken])

  const reopen = useCallback(async () => {
    writeStored(tableToken, null)
    guestTokens.delete(tableToken)
    setPhase("loading")
    await open()
  }, [open, tableToken])

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      const stored = readStored(tableToken)
      if (stored) {
        guestTokens.set(tableToken, stored.guestToken)
        try {
          const view = await client.get<SessionView, SessionView>(
            `/public/sessions/${stored.sessionId}`,
          )
          const closedAt = view.session.closedAt ? Date.parse(view.session.closedAt) : 0
          const staleClosed =
            view.session.status === "closed" && Date.now() - closedAt > CLOSED_SESSION_GRACE_MS
          if (!staleClosed) {
            if (!cancelled)
              adopt({
                ...stored,
                tenant: view.tenant ?? stored.tenant,
                table: view.table ?? stored.table,
              })
            return
          }
        } catch {
          // Expired/invalid token or unknown session: fall through and rejoin.
        }
      }
      if (!cancelled) await open()
    }
    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [adopt, client, open, tableToken])

  const value = useMemo<TableSessionValue>(
    () => ({
      phase,
      errorMessage,
      tenantSlug,
      tableToken,
      guest,
      client,
      basePath: `/order/${tenantSlug}/${tableToken}`,
      reopen,
    }),
    [phase, errorMessage, tenantSlug, tableToken, guest, client, reopen],
  )

  return <TableSessionContext.Provider value={value}>{children}</TableSessionContext.Provider>
}

export function useTableSession() {
  const ctx = useContext(TableSessionContext)
  if (!ctx) throw new Error("useTableSession must be used inside TableSessionProvider")
  return ctx
}

/** For components rendered only once the session is ready. */
export function useGuest() {
  const ctx = useTableSession()
  if (!ctx.guest) throw new Error("Guest session not ready")
  return { ...ctx, guest: ctx.guest }
}
