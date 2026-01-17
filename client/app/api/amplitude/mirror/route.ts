import { NextResponse } from 'next/server';
import { addLiveEvent } from '@/lib/amplitude/liveStore';

type MirrorReq = {
  event_type: string;
  user_id?: string;
  device_id?: string;
  event_properties?: Record<string, any>;
  user_properties?: Record<string, any>;
  ts?: number;
};

export async function POST(req: Request) {
  const body = (await req.json()) as MirrorReq;

  const event_type = String(body.event_type || '').trim();
  if (!event_type) {
    return NextResponse.json({ ok: false, error: 'Missing event_type' }, { status: 400 });
  }

  addLiveEvent({
    ts: typeof body.ts === 'number' ? body.ts : Date.now(),
    event_type,
    user_id: body.user_id ? String(body.user_id) : undefined,
    device_id: body.device_id ? String(body.device_id) : undefined,
    event_properties: body.event_properties || undefined,
    user_properties: body.user_properties || undefined,
  });

  return NextResponse.json({ ok: true });
}
