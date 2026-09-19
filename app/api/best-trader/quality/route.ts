import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const API = "https://api.hyperliquid.xyz/info";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const num = (x: unknown) => {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
};

async function post(body: Record<string, unknown>) {
  let last: unknown;
  for (let i = 0; i < 7; i++) {
    try {
      const r = await fetch(API, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (r.status === 429) {
        last = new Error("HL 429");
        await sleep(1500 * Math.pow(1.8, i));
        continue;
      }
      if (!r.ok) throw new Error(`HL ${r.status}`);
      return await r.json();
    } catch (e) {
      last = e;
      if (i < 6) await sleep(900 * Math.pow(1.7, i));
    }
  }
  throw last || new Error("Hyperliquid request failed");
}

type Fill = {
  time?: number;
  tid?: string | number;
  oid?: string | number;
  coin?: string;
  side?: string;
  sz?: string | number;
  px?: string | number;
  closedPnl?: string | number;
  startPosition?: string | number;
  fee?: string | number;
};

async function fills30(user: string, start: number, end: number) {
  let cur = start;
  let pages = 0;
  const out: Fill[] = [];
  const seen = new Set<string>();

  while (cur <= end && out.length < 10000 && pages < 7) {
    const rows = (await post({
      type: "userFillsByTime",
      user,
      startTime: cur,
      endTime: end,
      aggregateByTime: false,
    })) as Fill[];

    pages++;
    if (!Array.isArray(rows) || !rows.length) break;

    let max = cur;
    let added = 0;
    for (const f of rows) {
      max = Math.max(max, Number(f.time) || cur);
      const key = [f.tid, f.oid, f.time, f.coin, f.side, f.sz, f.px].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(f);
      added++;
      if (out.length >= 10000) break;
    }

    if (rows.length < 2000) break;
    cur = max <= cur && added === 0 ? cur + 1 : max + 1;
    await sleep(500);
  }

  out.sort((a, b) => Number(a.time) - Number(b.time));
  return { rows: out, partial: out.length >= 10000, pages };
}

function buildStats(fills: Fill[], start: number) {
  const grouped = new Map<
    string,
    { coin: string; oid: string; time: number; pnl: number; fee: number }
  >();

  for (const f of fills) {
    const t = Number(f.time);
    if (t < start) continue;

    const closedPnl = num(f.closedPnl);
    const startPosition = num(f.startPosition);
    const size = Math.abs(num(f.sz));
    const signed = f.side === "B" ? 1 : -1;
    const after = startPosition + signed * size;

    const closeQty =
      Math.sign(startPosition) !== 0
        ? Math.sign(startPosition) !== Math.sign(after)
          ? Math.abs(startPosition)
          : Math.max(0, Math.abs(startPosition) - Math.abs(after))
        : 0;

    const allocatedFee = num(f.fee) * (size > 0 ? Math.min(1, closeQty / size) : 0);
    if (Math.abs(closedPnl) < 1e-12 && allocatedFee === 0) continue;

    const key = `${String(f.coin)}|${String(f.oid)}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        coin: String(f.coin),
        oid: String(f.oid),
        time: t,
        pnl: 0,
        fee: 0,
      });
    }

    const order = grouped.get(key)!;
    order.time = Math.max(order.time, t);
    order.pnl += closedPnl;
    order.fee += allocatedFee;
  }

  const orders = [...grouped.values()]
    .map((o) => ({ ...o, net: o.pnl - o.fee }))
    .filter((o) => Math.abs(o.net) > 1e-9)
    .sort((a, b) => a.time - b.time);

  const wins = orders.filter((o) => o.net > 0);
  const losses = orders.filter((o) => o.net < 0);
  const grossProfit = wins.reduce((s, o) => s + o.net, 0);
  const grossLoss = -losses.reduce((s, o) => s + o.net, 0);
  const netPnl = orders.reduce((s, o) => s + o.net, 0);

  let cumulative = 0;
  let peak = 0;
  let drawdown = 0;
  for (const o of orders) {
    cumulative += o.net;
    peak = Math.max(peak, cumulative);
    drawdown = Math.min(drawdown, cumulative - peak);
  }

  const sortedWins = [...wins].sort((a, b) => b.net - a.net);
  const top1WinShare =
    grossProfit > 0 ? (sortedWins[0]?.net || 0) / grossProfit : null;
  const top3WinShare =
    grossProfit > 0
      ? sortedWins.slice(0, 3).reduce((s, o) => s + o.net, 0) / grossProfit
      : null;

  const cutoff7 = Date.now() - 7 * 864e5;
  const net7 = orders
    .filter((o) => o.time >= cutoff7)
    .reduce((s, o) => s + o.net, 0);

  const coinMap: Record<string, number> = {};
  for (const o of orders) {
    coinMap[o.coin] = (coinMap[o.coin] || 0) + Math.abs(o.net);
  }
  const totalAbs = Object.values(coinMap).reduce((a, b) => a + b, 0);
  const topCoin = Object.entries(coinMap).sort((a, b) => b[1] - a[1])[0] || null;

  return {
    orders: orders.length,
    winRate:
      wins.length + losses.length ? wins.length / (wins.length + losses.length) : null,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : null,
    netPnl,
    drawdown,
    net7,
    avgWin: wins.length ? grossProfit / wins.length : null,
    avgLoss: losses.length ? grossLoss / losses.length : null,
    top1WinShare,
    top3WinShare,
    largestWin: sortedWins[0]?.net || null,
    largestLoss: losses.length ? Math.min(...losses.map((o) => o.net)) : null,
    topCoin: topCoin ? topCoin[0] : null,
    topCoinShare: topCoin && totalAbs > 0 ? topCoin[1] / totalAbs : null,
  };
}

export async function GET(req: NextRequest) {
  const user = String(req.nextUrl.searchParams.get("address") || "").toLowerCase();

  if (!/^0x[a-f0-9]{40}$/.test(user)) {
    return NextResponse.json({ error: "bad address" }, { status: 400 });
  }

  const end = Date.now();
  const start = end - 30 * 864e5;

  try {
    const fills = await fills30(user, start, end);
    const stats = buildStats(fills.rows, start);

    let status = "PASS";

    if (stats.orders === 0) {
      status = "NO_REALIZED_SAMPLE";
    } else if (
      stats.netPnl <= 0 ||
      (stats.profitFactor != null && stats.profitFactor < 1.0)
    ) {
      status = "FAIL";
    } else if (
      (stats.top1WinShare != null && stats.top1WinShare > 0.55) ||
      (stats.top3WinShare != null && stats.top3WinShare > 0.85)
    ) {
      status = "REVIEW_CONCENTRATED";
    } else if (stats.orders < 20) {
      status = "REVIEW_LOW_SAMPLE";
    } else if (
      stats.profitFactor != null &&
      stats.profitFactor < 1.2
    ) {
      status = "REVIEW_WEAK_EDGE";
    } else if (fills.partial) {
      status = "PASS_PARTIAL";
    }

    return NextResponse.json({
      address: user,
      status,
      window: { start, end },
      fills: {
        count: fills.rows.length,
        partial: fills.partial,
        pages: fills.pages,
      },
      realized: stats,
    });
  } catch (e) {
    return NextResponse.json(
      {
        address: user,
        error: String((e as Error)?.message || e),
      },
      { status: 502 },
    );
  }
}
