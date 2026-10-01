import { Global, Injectable, Module } from "@nestjs/common";
import { filter, type Observable, Subject } from "rxjs";

export type SessionEventType =
  | "order.updated"
  | "bill.updated"
  | "payment.updated"
  | "session.closed"
  | "service_request.created"
  // Staff moved the party to another table / merged it into another tab.
  | "session.moved"
  | "session.merged"
  // Tenant-wide (sessionId null): reach every open guest menu of the tenant.
  | "menu.updated"
  | "tenant.updated";

export interface SessionEvent {
  type: SessionEventType;
  tenantId: string;
  /** null = broadcast to every session of the tenant. */
  sessionId: string | null;
  data?: Record<string, unknown>;
}

/**
 * In-process event bus for table-session changes, consumed by the guest SSE
 * stream. It only reaches listeners in the same process: with more than one
 * API instance (or on serverless) swap this for Postgres LISTEN/NOTIFY or Redis
 * pub/sub. Guests poll as a fallback, so a missed event only delays an update.
 */
@Injectable()
export class SessionEventsService {
  private readonly events$ = new Subject<SessionEvent>();

  emit(event: SessionEvent) {
    this.events$.next(event);
  }

  /** Tell every guest of a tenant that the menu or restaurant changed. */
  notifyTenant(tenantId: string, type: "menu.updated" | "tenant.updated") {
    this.emit({ type, tenantId, sessionId: null });
  }

  /** A guest's stream: their session's events plus tenant-wide broadcasts. */
  forGuest(sessionId: string, tenantId: string): Observable<SessionEvent> {
    return this.events$.pipe(
      filter(
        (e) =>
          e.sessionId === sessionId ||
          (e.sessionId === null && e.tenantId === tenantId),
      ),
    );
  }
}

@Global()
@Module({
  providers: [SessionEventsService],
  exports: [SessionEventsService],
})
export class RealtimeModule {}
