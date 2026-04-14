// Simple pubsub implementation - replace with Redis in production
import { EventEmitter } from "events";

class SimplePubSub {
  private emitter = new EventEmitter();

  publish(triggerName: string, payload: unknown): boolean {
    this.emitter.emit(triggerName, payload);
    return true;
  }

  asyncIterator<T>(triggers: string | string[]): AsyncIterator<T> {
    const triggerArray = Array.isArray(triggers) ? triggers : [triggers];
    const emitter = this.emitter;
    
    return {
      async next(): Promise<IteratorResult<T>> {
        return new Promise((resolve) => {
          const handler = (data: T) => {
            triggerArray.forEach(t => emitter.removeListener(t, handler));
            resolve({ value: data, done: false } as IteratorResult<T>);
          };
          triggerArray.forEach(t => emitter.once(t, handler));
        });
      },
      async return(): Promise<IteratorResult<T>> {
        return { done: true, value: undefined } as IteratorResult<T>;
      },
      async throw(e: unknown): Promise<IteratorResult<T>> {
        throw e;
      },
    };
  }
}

export const pubsub = new SimplePubSub();
