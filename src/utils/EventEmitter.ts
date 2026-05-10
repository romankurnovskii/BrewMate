type Listener<T = any> = (payload: T) => void;

export interface Subscription {
  unsubscribe: () => void;
}

export class EventEmitter {
  private listeners: Map<string, Set<Listener>> = new Map();

  on<T = any>(event: string, listener: Listener<T>): Subscription {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener);
    return {
      unsubscribe: () => {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(event);
        }
      },
    };
  }

  off(event: string, listener: Listener): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  once<T = any>(event: string, listener: Listener<T>): Subscription {
    const wrapper = (payload: T) => {
      listener(payload);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  emit<T = any>(event: string, payload?: T): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const listener of set) {
        try {
          listener(payload);
        } catch (err) {
          console.error(`[EventEmitter] Error in listener for "${event}":`, err);
        }
      }
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  listenerCount(event: string): number {
    const set = this.listeners.get(event);
    return set ? set.size : 0;
  }
}

export const appEvents = new EventEmitter();
