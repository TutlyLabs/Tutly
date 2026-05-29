import type { WebSocket } from "ws";

export interface AgentConn {
  runnerId: string;
  userId: string;
  ws: WebSocket;
  agentVersion: string;
  image?: string;
  language?: string;
  lastPongAt: number;
}

export interface ClientConn {
  clientId: string;
  userId: string;
  runnerId: string;
  ws: WebSocket;
}

class Registry {
  private agents = new Map<string, AgentConn>();
  private clients = new Map<string, ClientConn>();
  private byRunner = new Map<string, Set<string>>();

  registerAgent(conn: AgentConn): void {
    const prev = this.agents.get(conn.runnerId);
    if (prev && prev.ws !== conn.ws) {
      try {
        prev.ws.close(4001, "replaced by new agent connection");
      } catch {
        /* ignore */
      }
    }
    this.agents.set(conn.runnerId, conn);
  }

  agent(runnerId: string): AgentConn | undefined {
    return this.agents.get(runnerId);
  }

  removeAgent(runnerId: string, ws: WebSocket): void {
    const existing = this.agents.get(runnerId);
    if (existing && existing.ws === ws) this.agents.delete(runnerId);
  }

  registerClient(conn: ClientConn): void {
    this.clients.set(conn.clientId, conn);
    let set = this.byRunner.get(conn.runnerId);
    if (!set) {
      set = new Set();
      this.byRunner.set(conn.runnerId, set);
    }
    set.add(conn.clientId);
  }

  client(clientId: string): ClientConn | undefined {
    return this.clients.get(clientId);
  }

  removeClient(clientId: string): void {
    const c = this.clients.get(clientId);
    if (!c) return;
    this.clients.delete(clientId);
    const set = this.byRunner.get(c.runnerId);
    if (set) {
      set.delete(clientId);
      if (set.size === 0) this.byRunner.delete(c.runnerId);
    }
  }

  clientsFor(runnerId: string): string[] {
    return Array.from(this.byRunner.get(runnerId) ?? []);
  }
}

export const registry = new Registry();
