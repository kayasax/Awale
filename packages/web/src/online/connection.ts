// Minimal WebSocket client wrapper for online multiplayer (draft)
export interface OnlineConfig {
  url: string; // ws or wss endpoint (e.g. wss://example/ws)
}

export type Listener = (evt: any) => void;

export class OnlineClient {
  private ws: WebSocket | null = null;
  private pending: any[] = [];
  private listeners: Set<Listener> = new Set();
  private url: string;
  private reconnectAttempts = 0;
  private manualClose = false;

  constructor(cfg: OnlineConfig){
    this.url = cfg.url;
  }

  connect() {
    this.manualClose = false;
    console.log('🔌 Connecting to WebSocket:', this.url);
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => {
      console.log('✅ WebSocket connected');
      this.reconnectAttempts = 0;
      // flush
      while (this.pending.length && this.ws?.readyState === WebSocket.OPEN) {
        const msg = this.pending.shift();
        console.log('📤 Sending pending message:', msg);
        this.ws.send(JSON.stringify(msg));
      }
    };
    this.ws.onmessage = (e) => {
      try { 
        const msg = JSON.parse(e.data); 
        console.log('📥 WebSocket received:', msg);
        this.listeners.forEach(l => l(msg)); 
      } catch {/*ignore*/}
    };
    this.ws.onclose = () => {
      console.log('🔌 WebSocket closed, manualClose:', this.manualClose);
      if (this.manualClose) return;
      // basic exponential backoff reconnection skeleton (future token usage)
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15000);
      this.reconnectAttempts++;
      setTimeout(()=> this.connect(), delay);
    };
  }

  close(){ this.manualClose = true; this.ws?.close(); }

  send(obj: any) {
    console.log('📤 Sending message:', obj);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
    else {
      console.log('⏳ WebSocket not ready, queuing message');
      this.pending.push(obj);
    }
  }

  on(listener: Listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
}
