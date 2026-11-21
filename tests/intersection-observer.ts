/**
 * Fake `IntersectionObserver` for the notes-stick-bounce tests (jsdom has
 * none). `report(targets)` calls the callback as the browser would when those
 * targets enter the root, in the order given.
 */

export interface FakeObserver {
  options: IntersectionObserverInit | undefined;
  observed: Set<Element>;
  disconnected: boolean;
  report(targets: Element[]): void;
}

export function fakeIntersectionObservers() {
  const created: FakeObserver[] = [];

  class FakeIntersectionObserver {
    private readonly state: FakeObserver;

    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      const self = this as unknown as IntersectionObserver;
      this.state = {
        options,
        observed: new Set(),
        disconnected: false,
        report: (targets) => {
          const entries = targets.map((target) => ({ target, isIntersecting: true }) as IntersectionObserverEntry);
          callback(entries, self);
        },
      };
      created.push(this.state);
    }

    observe(target: Element) {
      this.state.observed.add(target);
    }

    unobserve(target: Element) {
      this.state.observed.delete(target);
    }

    disconnect() {
      this.state.disconnected = true;
      this.state.observed.clear();
    }

    takeRecords() {
      return [];
    }
  }

  return { created, IntersectionObserver: FakeIntersectionObserver as unknown as typeof IntersectionObserver };
}
