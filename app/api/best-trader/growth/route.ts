import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const API = "https://api.hyperliquid.xyz/info";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const num = (x: unknown) => {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
};

async function post(body: Record<string, unknown>) {
  let last: unknown;
  for (let i = 0; i < 6; i++) {
    try {
      const r = await fetch(API, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (r.status === 429) {
        last = new Error("HL 429");
        await sleep(1200 * Math.pow(1.8, i));
        continue;
      }
      if (!r.ok) throw new Error("HL " + r.status);
      return await r.json();
    } catch (e) {
      last = e;
      if (i < 5) await sleep(700 * Math.pow(1.7, i));
    }
  }
  throw last || new Error("Hyperliquid request failed");
}

function pairs(x: unknown) {
  if (!Array.isArray(x)) return [] as [number, number][];
  return x
    .map((v: any) => [Number(v?.[0]), num(v?.[1])] as [number, number])
    .filter((v) => Number.isFinite(v[0]));
}

function pickMonth(portfolio: unknown) {
  const rows = Array.isArray(portfolio) ? portfolio : [];
  const map = Object.fromEntries(rows as any[]);
  return map.perpMonth || map.month || null;
}

async function ledger(user: string, start: number, end: number) {
  let cur = start;
  const out: any[] = [];
  const seen = new Set<string>();
  let pages = 0;

  while (cur <= end && pages < 5) {
    const rows = (await post({
      type: "userNonFundingLedgerUpdates",
      user,
      startTime: cur,
      endTime: end,
    })) as any[];

    pages++;
    if (!Array.isArray(rows) || !rows.length) break;

    let max = cur;
    let added = 0;
    for (const row of rows) {
      max = Math.max(max, Number(row?.time) || cur);
      const key = [
        row?.hash,
        row?.time,
        row?.delta?.type,
        JSON.stringify(row?.delta || {}),
      ].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(row);
      added++;
    }

    if (rows.length < 500) break;
    cur = max <= cur && added === 0 ? cur + 1 : max + 1;
    await sleep(200);
  }

  return { rows: out, pages };
}

export async function GET(req: NextRequest) {
  const user = String(req.nextUrl.searchParams.get("address") || "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(user)) {
    return NextResponse.json({ error: "bad address" }, { status: 400 });
  }

  const end = Date.now();
  const start = end - 30 * 864e5;

  try {
    const portfolio = await post({ type: "portfolio", user });
    await sleep(250);
    const led = await ledger(user, start, end);

    const month = pickMonth(portfolio);
    const av = pairs(month?.accountValueHistory).filter(
      ([t]) => t >= start - 2 * 864e5 && t <= end + 1e6,
    );
    const pnl = pairs(month?.pnlHistory).filter(
      ([t]) => t >= start - 2 * 864e5 && t <= end + 1e6,
    );

    const startValue = av.length ? av[0][1] : null;
    const endValue = av.length ? av[av.length - 1][1] : null;
    const positive = av.map((x) => x[1]).filter((x) => x > 0);
    const avgValue = positive.length
      ? positive.reduce((a, b) => a + b, 0) / positive.length
      : null;

    const pnlDelta = pnl.length ? pnl[pnl.length - 1][1] - pnl[0][1] : null;
    const capitalEfficiency =
      pnlDelta != null && avgValue != null && avgValue > 0
        ? pnlDelta / avgValue
        : null;

    const types = [
      ...new Set(
        led.rows.map((x) => String(x?.delta?.type || "")).filter(Boolean),
      ),
    ];

    let status = "REVIEW";
    if (pnlDelta != null && pnlDelta <= 0) status = "WEAK";
    else if (
      capitalEfficiency != null &&
      capitalEfficiency >= 0.25 &&
      pnlDelta != null &&
      pnlDelta >= 100000 &&
      (endValue || 0) >= 50000
    ) {
      status = "PROMISING";
    }

    return NextResponse.json({
      address: user,
      status,
      window: { start, end },
      account: {
        startValue,
        endValue,
        avgValue,
        pnlDelta,
        capitalEfficiency,
      },
      ledger: {
        events: led.rows.length,
        pages: led.pages,
        types,
      },
      coverage: {
        accountValuePoints: av.length,
        pnlPoints: pnl.length,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { address: user, error: String((e as Error)?.message || e) },
      { status: 502 },
    );
  }
}
