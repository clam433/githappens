type LiveEvent = {
  ts: number; // Date.now()
  event_type: string;
  user_id?: string;
  device_id?: string;
  event_properties?: Record<string, any>;
  user_properties?: Record<string, any>;
};

const MAX_EVENTS = 5000; // cap memory
const TTL_MS = 60 * 60 * 1000; // keep 1 hour of events

const g = globalThis as any;
if (!g.__LIVE_EVENTS__) g.__LIVE_EVENTS__ = [] as LiveEvent[];

function prune(now = Date.now()) {
  const arr: LiveEvent[] = g.__LIVE_EVENTS__;
  const cutoff = now - TTL_MS;

  // drop old
  let i = 0;
  while (i < arr.length && arr[i].ts < cutoff) i++;
  if (i > 0) arr.splice(0, i);

  // cap size
  if (arr.length > MAX_EVENTS) {
    arr.splice(0, arr.length - MAX_EVENTS);
  }
}

export function addLiveEvent(e: LiveEvent) {
  const arr: LiveEvent[] = g.__LIVE_EVENTS__;
  prune();
  arr.push(e);
  prune();
}

export function getLiveEventsSince(msAgo: number) {
  const now = Date.now();
  prune(now);
  const cutoff = now - msAgo;
  const arr: LiveEvent[] = g.__LIVE_EVENTS__;
  // newest not guaranteed, but we keep it mostly ordered, filter anyway
  return arr.filter((e) => e.ts >= cutoff);
}
