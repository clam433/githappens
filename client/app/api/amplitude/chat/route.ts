import { NextResponse } from 'next/server';
import { getLiveEventsSince } from '@/lib/amplitude/liveStore';

type ChatReq = { message: string };

function basicAuthHeader(key: string, secret: string) {
  const token = Buffer.from(`${key}:${secret}`).toString('base64');
  return `Basic ${token}`;
}

function looksLikeUsers(msg: string) {
  return /who.*users|users.*site|active users|recent users/i.test(msg);
}

function looksLikeEvents(msg: string) {
  return /events|what happened|recent activity|live events|what are people doing/i.test(msg);
}

function hourFmt(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}`;
}

function floorToHour(d: Date) {
  const x = new Date(d);
  x.setUTCMinutes(0, 0, 0);
  return x;
}

async function exportLines(start: Date, end: Date) {
  const apiKey = process.env.AMPLITUDE_API_KEY;
  const secretKey = process.env.AMPLITUDE_SECRET_KEY;

  if (!apiKey || !secretKey) throw new Error('Missing AMPLITUDE_API_KEY or AMPLITUDE_SECRET_KEY');

  const url = `https://amplitude.com/api/2/export?start=${hourFmt(start)}&end=${hourFmt(end)}`;
  const res = await fetch(url, {
    headers: { Authorization: basicAuthHeader(apiKey, secretKey) },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 404) return []; // no raw data files for that range
    throw new Error(`Export failed (${res.status}). ${body.slice(0, 200)}`);
  }

  const text = await res.text();
  return text.split('\n').filter(Boolean).slice(0, 20000);
}

function parseMinutesFromMessage(message: string, fallback: number) {
  const m = message.match(/last\s+(\d+)\s*(min|mins|minute|minutes)/i);
  if (!m) return fallback;
  const val = Number(m[1]);
  if (!Number.isFinite(val)) return fallback;
  return Math.max(1, Math.min(120, val));
}

export async function POST(req: Request) {
  const body = (await req.json()) as ChatReq;
  const message = (body.message || '').trim();

  const now = new Date();

  const askUsers = looksLikeUsers(message);
  const askEvents = looksLikeEvents(message) || !askUsers;

  const minsMatch = message.match(/last\s+(\d+)\s*(sec|secs|second|seconds|min|mins|minute|minutes)/i);
  let windowMs = 15 * 60 * 1000;

  if (minsMatch) {
    const n = Math.max(1, Math.min(120, Number(minsMatch[1])));
    const unit = minsMatch[2].toLowerCase();
    windowMs = unit.startsWith('sec') ? n * 1000 : n * 60 * 1000;
  }

  // Live buffer first (instant)
  const live = getLiveEventsSince(windowMs);

  if (askUsers) {
    const users = new Set<string>();
    for (const e of live) {
      if (e.user_id) users.add(e.user_id);
      else if (e.device_id) users.add(`device:${e.device_id}`);
    }
    const sample = Array.from(users).slice(0, 10);
    return NextResponse.json({
      answer: `Live active in last ${Math.round(windowMs / 60000)} minutes: ${users.size} unique users/devices.\nSample: ${sample.join(', ')}${
        users.size > sample.length ? ' ...' : ''
      }`,
    });
  }

  if (askEvents) {
    const counts = new Map<string, number>();
    for (const e of live) {
      counts.set(e.event_type, (counts.get(e.event_type) || 0) + 1);
    }

    const top = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    if (top.length === 0) {
      return NextResponse.json({
        answer: `No live events found in the last ${Math.round(windowMs / 60000)} minutes.`,
      });
    }

    return NextResponse.json({
      answer: `Live top events in the last ${Math.round(windowMs / 60000)} minutes:\n${top
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n')}`,
    });
  }

  try {
    // Pull last 2 hours (hour-granularity) then filter by event_time
    const windowStart = floorToHour(new Date(now.getTime() - 24 * 60 * 60 * 1000));
    const windowEnd = floorToHour(new Date(now.getTime() + 60 * 60 * 1000));


    const lines = await exportLines(windowStart, windowEnd);

    if (askUsers) {
      const minutes = parseMinutesFromMessage(message, 30);
      const cutoff = Date.now() - minutes * 60 * 1000;

      const users = new Set<string>();
      for (const line of lines) {
        try {
          const evt = JSON.parse(line);
          const t = typeof evt.event_time === 'number' ? evt.event_time : Date.parse(evt.event_time);
          if (!Number.isFinite(t) || t < cutoff) continue;

          if (evt.user_id) users.add(String(evt.user_id));
          else if (evt.device_id) users.add(`device:${String(evt.device_id)}`);
        } catch {}
      }

      const sample = Array.from(users).slice(0, 10);
      return NextResponse.json({
        answer: `Active in last ${minutes} minutes: ${users.size} unique users/devices.\nSample: ${sample.join(', ')}${
          users.size > sample.length ? ' ...' : ''
        }`,
      });
    }

    if (askEvents) {
      const minutes = parseMinutesFromMessage(message, 15);
      const cutoff = Date.now() - minutes * 60 * 1000;

      const counts = new Map<string, number>();
      for (const line of lines) {
        try {
          const evt = JSON.parse(line);
          const t = typeof evt.event_time === 'number' ? evt.event_time : Date.parse(evt.event_time);
          if (!Number.isFinite(t) || t < cutoff) continue;

          const name = evt.event_type ? String(evt.event_type) : 'unknown_event';
          counts.set(name, (counts.get(name) || 0) + 1);
        } catch {}
      }

      const top = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

      if (top.length === 0) {
        return NextResponse.json({ answer: `No events found in the last ${minutes} minutes.` });
      }

      return NextResponse.json({
        answer: `Top events in the last ${minutes} minutes:\n${top.map(([k, v]) => `- ${k}: ${v}`).join('\n')}`,
      });
    }

    return NextResponse.json({ answer: 'Ask about recent events or active users.' });
  } catch (e: any) {
    return NextResponse.json({ answer: `Server error: ${e?.message || 'unknown error'}` }, { status: 500 });
  }
}
