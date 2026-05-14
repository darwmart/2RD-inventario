// ─── Monitor de red ────────────────────────────────────────────
// Detecta: online, offline, conexión lenta, reconexión.
// Usa eventos nativos + ping activo para evitar falsos positivos
// (window.navigator.onLine es notoriamente poco confiable).

type NetworkStatus = 'online' | 'offline' | 'slow';
type NetworkListener = (status: NetworkStatus) => void;

interface NetworkState {
  status: NetworkStatus;
  rtt?: number;           // round-trip time en ms
  downlink?: number;      // mbps estimados
  lastOnline?: Date;
  lastOffline?: Date;
}

class NetworkMonitor {
  private listeners = new Set<NetworkListener>();
  private state: NetworkState = { status: 'online' };
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private readonly PING_URL = '/favicon.ico';
  private readonly PING_INTERVAL_MS = 15_000;
  private readonly SLOW_RTT_THRESHOLD_MS = 2_000;

  constructor() {
    this.init();
  }

  private init() {
    // Eventos del navegador (primer nivel de detección)
    window.addEventListener('online',  () => this.handleBrowserOnline());
    window.addEventListener('offline', () => this.setStatus('offline'));

    // Network Information API (Chrome/Android)
    const conn = (navigator as Navigator & { connection?: { effectiveType?: string; rtt?: number; downlink?: number } }).connection;
    if (conn) {
      conn.addEventListener('change', () => this.checkConnectionQuality());
    }

    // Estado inicial
    if (!navigator.onLine) {
      this.setStatus('offline');
    } else {
      this.startActivePing();
    }
  }

  private handleBrowserOnline() {
    // El navegador dice online, pero verificamos con ping real
    this.startActivePing();
    this.ping().then(ok => {
      this.setStatus(ok ? 'online' : 'offline');
    });
  }

  private startActivePing() {
    if (this.pingInterval) return;
    this.pingInterval = setInterval(() => {
      if (!navigator.onLine) return;
      this.ping().then(ok => {
        if (!ok && this.state.status !== 'offline') {
          this.setStatus('offline');
        } else if (ok && this.state.status === 'offline') {
          this.setStatus('online');
        }
      });
    }, this.PING_INTERVAL_MS);
  }

  private async ping(): Promise<boolean> {
    try {
      const t0 = performance.now();
      const res = await fetch(`${this.PING_URL}?_=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(5_000),
      });
      const rtt = Math.round(performance.now() - t0);
      this.state.rtt = rtt;
      if (rtt > this.SLOW_RTT_THRESHOLD_MS) {
        this.setStatus('slow');
        return true;
      }
      return res.ok;
    } catch {
      return false;
    }
  }

  private checkConnectionQuality() {
    const conn = (navigator as Navigator & { connection?: { effectiveType?: string; rtt?: number; downlink?: number } }).connection;
    if (!conn) return;
    this.state.downlink = conn.downlink;
    this.state.rtt = conn.rtt;
    if (conn.effectiveType === '2g' || (conn.rtt ?? 0) > this.SLOW_RTT_THRESHOLD_MS) {
      this.setStatus('slow');
    }
  }

  private setStatus(status: NetworkStatus) {
    if (this.state.status === status) return;

    const prev = this.state.status;
    this.state.status = status;

    if (status === 'online') this.state.lastOnline = new Date();
    if (status === 'offline') this.state.lastOffline = new Date();

    this.listeners.forEach(fn => fn(status));

    // Log para auditoría local
    console.info(`[Network] ${prev} → ${status}`, {
      rtt: this.state.rtt,
      downlink: this.state.downlink,
      at: new Date().toISOString(),
    });
  }

  get isOnline(): boolean {
    return this.state.status !== 'offline';
  }

  get isOffline(): boolean {
    return this.state.status === 'offline';
  }

  get isSlow(): boolean {
    return this.state.status === 'slow';
  }

  get currentState(): NetworkState {
    return { ...this.state };
  }

  subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    // Emitir estado actual inmediatamente
    listener(this.state.status);
    return () => this.listeners.delete(listener);
  }

  destroy() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    window.removeEventListener('online',  this.handleBrowserOnline);
    window.removeEventListener('offline', () => this.setStatus('offline'));
    this.listeners.clear();
  }
}

// Singleton global
export const networkMonitor = new NetworkMonitor();
export type { NetworkStatus, NetworkState };
