'use client';

import * as amplitude from '@amplitude/analytics-browser';

let inited = false;

export function initAmplitude() {
  if (inited) return;
  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
  if (!apiKey) return;

  amplitude.init(apiKey, undefined, {
    defaultTracking: true,
  });

  inited = true;
}

export function identify(userId: string, props?: Record<string, any>) {
  initAmplitude();

  const id = String(userId || '').trim();
  if (!id) return;

  amplitude.setUserId(id);

  if (props) {
    const ident = new amplitude.Identify();
    for (const [k, v] of Object.entries(props)) ident.set(k, v as any);
    amplitude.identify(ident);
  }
}

export function track(event: string, props?: Record<string, any>) {
  initAmplitude();
  amplitude.track(event, props);
}
