/**
 * Utility functions for managing browser extension connections
 */

// Add Chrome extension types
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        connect: (options: { name: string }) => {
          onDisconnect: {
            addListener: (callback: () => void) => void;
          };
          onMessage: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            addListener: (callback: (message: any) => void) => void;
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          postMessage: (message: any) => void;
        };
      };
    };
  }
}

interface ExtensionPort {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  port: any | null;
  isConnected: boolean;
  reconnectAttempts: number;
  lastConnected: number;
  connectionId: string;
}

interface ConnectionState {
  isConnected: boolean;
  lastConnected: number;
  connectionId: string;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const CONNECTION_STATE_KEY = 'extension_connection_state';

// Helper function to check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

class ExtensionConnectionManager {
  private static instance: ExtensionConnectionManager;
  private ports: Map<string, ExtensionPort> = new Map();
  private isPageHidden: boolean = false;
  private connectionStates: Map<string, ConnectionState> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    if (isBrowser) {
      this.initializeEventListeners();
      this.loadConnectionStates();
    }
  }

  private initializeEventListeners(): void {
    if (isBrowser) {
      // Handle page visibility changes
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
      
      // Handle bfcache events
      window.addEventListener('pageshow', this.handleBFCache.bind(this));
      window.addEventListener('pagehide', this.handlePageHide.bind(this));
      
      // Handle beforeunload
      window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    }
  }

  private loadConnectionStates(): void {
    if (!isBrowser) return;

    try {
      const savedStates = localStorage.getItem(CONNECTION_STATE_KEY);
      if (savedStates) {
        const states = JSON.parse(savedStates);
        Object.entries(states).forEach(([name, state]) => {
          this.connectionStates.set(name, state as ConnectionState);
        });
      }
    } catch (error) {
      console.warn('Failed to load connection states:', error);
    }
  }

  private saveConnectionStates(): void {
    if (!isBrowser) return;

    try {
      const states = Object.fromEntries(this.connectionStates);
      localStorage.setItem(CONNECTION_STATE_KEY, JSON.stringify(states));
    } catch (error) {
      console.warn('Failed to save connection states:', error);
    }
  }

  private handleVisibilityChange(): void {
    if (!isBrowser) return;
    
    this.isPageHidden = document.hidden;
    if (!this.isPageHidden) {
      this.restoreConnections();
    }
  }

  private handleBFCache(event: PageTransitionEvent): void {
    if (!isBrowser) return;
    
    if (event.persisted) {
      console.log('Page restored from bfcache, restoring connections...');
      // Use a small delay to ensure the page is fully restored
      setTimeout(() => this.restoreConnections(), 100);
    }
  }

  private handlePageHide(): void {
    if (!isBrowser) return;
    
    // Clean up any pending reconnection attempts
    this.reconnectTimeouts.forEach((timeout, name) => {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(name);
    });
  }

  private handleBeforeUnload(): void {
    if (!isBrowser) return;
    
    // Save connection states before page unload
    this.saveConnectionStates();
  }

  private calculateReconnectDelay(attempt: number): number {
    // Exponential backoff with jitter
    const delay = Math.min(
      BASE_RECONNECT_DELAY * Math.pow(2, attempt - 1),
      MAX_RECONNECT_DELAY
    );
    // Add random jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  private async restoreConnections(): Promise<void> {
    if (!isBrowser) return;

    for (const [name, state] of this.connectionStates) {
      if (!state.isConnected && this.ports.has(name)) {
        const port = this.ports.get(name);
        if (port && port.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          await this.reconnect(name);
        }
      }
    }
  }

  private async reconnect(name: string): Promise<void> {
    if (!isBrowser) return;

    const port = this.ports.get(name);
    if (!port) return;

    // Clear any existing reconnection timeout
    const existingTimeout = this.reconnectTimeouts.get(name);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.reconnectTimeouts.delete(name);
    }

    try {
      console.log(`Attempting to reconnect to extension ${name} (Attempt ${port.reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
      
      // Create new connection
      const newPort = window.chrome?.runtime?.connect({ name });
      if (!newPort) throw new Error('Failed to create new connection');

      // Set up event listeners
      newPort.onDisconnect.addListener(() => {
        console.log(`Extension port ${name} disconnected`);
        port.isConnected = false;
        this.updateConnectionState(name, false);
        
        // Attempt to reconnect if we haven't exceeded max attempts
        if (port.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          port.reconnectAttempts++;
          const delay = this.calculateReconnectDelay(port.reconnectAttempts);
          const timeout = setTimeout(() => this.reconnect(name), delay);
          this.reconnectTimeouts.set(name, timeout);
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      newPort.onMessage.addListener((message: any) => {
        console.log(`Received message from ${name}:`, message);
      });

      // Update port and connection state
      port.port = newPort;
      port.isConnected = true;
      port.lastConnected = Date.now();
      this.updateConnectionState(name, true);

      console.log(`Successfully reconnected to extension ${name}`);
    } catch (error) {
      console.warn(`Failed to reconnect to extension ${name}:`, error);
      port.isConnected = false;
      this.updateConnectionState(name, false);
      
      // Schedule next reconnection attempt
      if (port.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        port.reconnectAttempts++;
        const delay = this.calculateReconnectDelay(port.reconnectAttempts);
        const timeout = setTimeout(() => this.reconnect(name), delay);
        this.reconnectTimeouts.set(name, timeout);
      }
    }
  }

  private updateConnectionState(name: string, isConnected: boolean): void {
    if (!isBrowser) return;

    const state = this.connectionStates.get(name) || {
      isConnected: false,
      lastConnected: 0,
      connectionId: Math.random().toString(36).substring(7)
    };

    state.isConnected = isConnected;
    if (isConnected) {
      state.lastConnected = Date.now();
    }

    this.connectionStates.set(name, state);
    this.saveConnectionStates();
  }

  public static getInstance(): ExtensionConnectionManager {
    if (!ExtensionConnectionManager.instance) {
      ExtensionConnectionManager.instance = new ExtensionConnectionManager();
    }
    return ExtensionConnectionManager.instance;
  }

  public connect(name: string): void {
    if (!isBrowser || !window.chrome?.runtime?.connect) {
      console.warn('Browser environment or Chrome extension API not available');
      return;
    }

    try {
      const port = window.chrome.runtime.connect({ name });
      const connectionId = Math.random().toString(36).substring(7);
      
      const extensionPort: ExtensionPort = {
        port,
        isConnected: true,
        reconnectAttempts: 0,
        lastConnected: Date.now(),
        connectionId
      };

      port.onDisconnect.addListener(() => {
        console.log(`Extension port ${name} disconnected`);
        extensionPort.isConnected = false;
        this.updateConnectionState(name, false);
        
        // Attempt to reconnect if we haven't exceeded max attempts
        if (extensionPort.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          extensionPort.reconnectAttempts++;
          const delay = this.calculateReconnectDelay(extensionPort.reconnectAttempts);
          const timeout = setTimeout(() => this.reconnect(name), delay);
          this.reconnectTimeouts.set(name, timeout);
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      port.onMessage.addListener((message: any) => {
        console.log(`Received message from ${name}:`, message);
      });

      this.ports.set(name, extensionPort);
      this.updateConnectionState(name, true);
    } catch (error) {
      console.warn(`Failed to connect to extension ${name}:`, error);
      this.updateConnectionState(name, false);
    }
  }

  public disconnect(name: string): void {
    if (!isBrowser) return;

    const port = this.ports.get(name);
    if (port?.port) {
      try {
        // Clear any pending reconnection attempts
        const timeout = this.reconnectTimeouts.get(name);
        if (timeout) {
          clearTimeout(timeout);
          this.reconnectTimeouts.delete(name);
        }

        port.port.postMessage({ type: 'disconnect' });
        this.ports.delete(name);
        this.connectionStates.delete(name);
        this.saveConnectionStates();
      } catch (error) {
        console.warn(`Failed to disconnect from extension ${name}:`, error);
      }
    }
  }

  public disconnectAll(): void {
    if (!isBrowser) return;
    this.ports.forEach((_, name) => this.disconnect(name));
  }

  public isConnected(name: string): boolean {
    if (!isBrowser) return false;
    return this.ports.get(name)?.isConnected ?? false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getPort(name: string): any | null {
    if (!isBrowser) return null;
    return this.ports.get(name)?.port ?? null;
  }
}

export const extensionConnection = ExtensionConnectionManager.getInstance(); 