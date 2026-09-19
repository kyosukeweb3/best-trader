"use client";

import { useEffect, useState } from "react";

const CANDIDATES = [
  { label: "F1", address: "0x03b9a189e2480d1e4c3007080b29f362282130fa", leaderboardPnl: 21693963, accountValue: 70250962, volume: 141771451 },
  { label: "F2", address: "0x634fe24f2f7396f5d967ec3936df04f49a3e6951", leaderboardPnl: 3962816, accountValue: 4040966, volume: 217108458 },
  { label: "F3", address: "0xa516541e599129095d14f7faf8b11ae670c837b0", leaderboardPnl: 3048292, accountValue: 3073390, volume: 77328492 },
  { label: "F4", address: "0x7e1ad5e2bbe30d6d202e7c41036ea0a07c560be9", leaderboardPnl: 3023893, accountValue: 2284844, volume: 410453112 },
  { label: "F5", address: "0x7dacca323e44f168494c779bb5e7483c468ef410", leaderboardPnl: 8296767, accountValue: 34685646, volume: 13967412 },
  { label: "F6", address: "0xbf49647d017805fcc576ac10f33a788e636f4258", leaderboardPnl: 12934646, accountValue: 31313343, volume: 1133066 },
];

type Candidate = (typeof CANDIDATES)[number];

type Quality = {
  status: string;
  fills: { count: number; partial: boolean; pages: number };
  realized: {
    orders: number;
    winRate: number | null;
    profitFactor: number | null;
    netPnl: number;
    drawdown: number;
    net7: number;
    avgWin: number | null;
    avgLoss: number | null;
    top1WinShare: number | null;
    top3WinShare: number | null;
    largestWin: number | null;
    largestLoss: number | null;
    topCoin: string | null;
    topCoinShare: number | null;
  };
};

type Row = {
  candidate: Candidate;
  loading: boolean;
  data?: Quality;
  error?: string;
};

const pct = (x: number | null | undefined) =>
  x == null || !Number.isFinite(x) ? "—" : `${(x * 100).toFixed(1)}%`;

const usd = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const n = Number(value);
  const sign = n < 0 ? "-" : "";
  const x = Math.abs(n);
  if (x >= 1_000_000) return `${sign}$${(x / 1_000_000).toFixed(2)}M`;
  if (x >= 1_000) return `${sign}$${(x / 1_000).toFixed(1)}K`;
  return `${sign}$${x.toFixed(0)}`;
};

const short = (a: string) => `${a.slice(0, 7)}…${a.slice(-5)}`;

const colorFor = (status?: string) => {
  if (!status) return "#9ba6b4";
  if (status.startsWith("PASS")) return "#56e79a";
  if (status.startsWith("REVIEW")) return "#ffd75f";
  if (status === "NO_REALIZED_SAMPLE") return "#9ba6b4";
  return "#ff6875";
};

export default function TradeQualityV11() {
  const [rows, setRows] = useState<Row[]>(
    CANDIDATES.map((candidate) => ({ candidate, loading: true })),
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      for (let i = 0; i < CANDIDATES.length; i++) {
        const candidate = CANDIDATES[i];

        try {
          const res = await fetch(
            `/api/best-trader/quality?address=${candidate.address}`,
            { cache: "no-store" },
          );
          const body = await res.json();
          if (!res.ok) throw new Error(body.error || "API error");

          if (!cancelled) {
            setRows((prev) =>
              prev.map((row, idx) =>
                idx === i
                  ? { candidate, data: body, loading: false }
                  : row,
              ),
            );
          }
        } catch (e) {
          if (!cancelled) {
            setRows((prev) =>
              prev.map((row, idx) =>
                idx === i
                  ? {
                      candidate,
                      error: String((e as Error)?.message || e),
                      loading: false,
                    }
                  : row,
              ),
            );
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const done = rows.filter((r) => !r.loading).length;
  const strong = rows.filter(
    (r) => r.data?.status === "PASS" || r.data?.status === "PASS_PARTIAL",
  ).length;
  const review = rows.filter((r) => r.data?.status?.startsWith("REVIEW")).length;

  return (
    <main style={{ minHeight: "100vh", background: "#090b0d", color: "#f5f7f9" }}>
      <div style={{ width: "min(1320px, calc(100% - 36px))", margin: "0 auto" }}>
        <section style={{ padding: "44px 0 24px" }}>
          <div style={{ color: "#c9ff57", fontSize: 11, fontWeight: 800, letterSpacing: ".16em" }}>
            KYOSUKE LIFE / BEST TRADER / TRADE QUALITY v1.1
          </div>
          <h1 style={{ fontSize: "clamp(48px, 7vw, 80px)", letterSpacing: "-.055em", margin: "10px 0" }}>
            Expand the survivor pool.
          </h1>
          <p style={{ maxWidth: 880, color: "#9ca8b5", lineHeight: 1.7 }}>
            前回の6候補はサンプル不足が多かったため、Discovery pool から
            取引量と絶対PnLが比較的大きい6アドレスを追加検証する。
          </p>
        </section>

        <div style={{ border: "1px solid #29313a", background: "#11151a", padding: "14px 16px", borderRadius: 12, color: "#9aa5b3", fontSize: 12, lineHeight: 1.6 }}>
          Status logic updated: 0 realized orders = NO_REALIZED_SAMPLE · positive but &lt;20 orders = REVIEW_LOW_SAMPLE · concentration = REVIEW_CONCENTRATED · only negative/poor edge = FAIL · 10,000 fills remains PARTIAL.
        </div>

        <div style={{ display: "flex", gap: 9, margin: "18px 0", flexWrap: "wrap" }}>
          <span style={pill}>{done} / {rows.length}</span>
          <span style={pill}>Strong: {strong}</span>
          <span style={pill}>Review: {review}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(430px, 1fr))", gap: 14, paddingBottom: 70 }}>
          {rows.map(({ candidate, data, loading, error }) => {
            const r = data?.realized;
            const top3 = r?.top3WinShare;
            const realizedVsLeaderboard =
              r && candidate.leaderboardPnl > 0
                ? r.netPnl / candidate.leaderboardPnl
                : null;

            return (
              <article key={candidate.address} style={{ border: "1px solid #29313a", background: "#0e1216", borderRadius: 15, padding: 19 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <strong>{candidate.label}</strong>
                    <div style={{ font: "11px ui-monospace, monospace", color: "#748190", marginTop: 4 }}>
                      {short(candidate.address)}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, border: "1px solid #29313a", borderRadius: 8, padding: "6px 8px", color: loading ? "#9ba6b4" : colorFor(data?.status) }}>
                    {loading ? "LOADING" : error ? "ERROR" : data?.status}
                  </span>
                </div>

                {loading && <div style={details}>Fetching 30D fills…</div>}
                {error && <div style={{ ...details, color: "#ff6875" }}>{error}</div>}

                {r && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginTop: 17 }}>
                      <Metric label="WIN RATE" value={pct(r.winRate)} />
                      <Metric label="PROFIT FACTOR" value={r.profitFactor == null ? "—" : r.profitFactor.toFixed(2)} />
                      <Metric label="REALIZED PNL" value={usd(r.netPnl)} />
                      <Metric label="ORDERS" value={String(r.orders)} />
                      <Metric label="REALIZED DD" value={usd(r.drawdown)} />
                      <Metric label="7D PNL" value={usd(r.net7)} />
                      <Metric label="TOP WIN SHARE" value={pct(r.top1WinShare)} />
                      <Metric label="TOP-3 WIN SHARE" value={pct(top3)} />
                      <Metric label="TOP COIN" value={`${r.topCoin || "—"} ${pct(r.topCoinShare)}`} />
                      <Metric label="AVG W/L" value={r.avgWin && r.avgLoss ? (r.avgWin / r.avgLoss).toFixed(2) : "—"} />
                      <Metric label="RAW FILLS" value={`${data?.fills.count.toLocaleString()}${data?.fills.partial ? "*" : ""}`} />
                      <Metric label="REALIZED / LB PNL" value={pct(realizedVsLeaderboard)} />
                    </div>

                    <div style={details}>
                      Discovery PnL {usd(candidate.leaderboardPnl)} · Account value {usd(candidate.accountValue)} · Volume {usd(candidate.volume)}
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ borderTop: "1px solid #29313a", paddingTop: 9 }}>
      <small style={{ display: "block", color: "#718090", fontSize: 9 }}>{label}</small>
      <strong style={{ display: "block", marginTop: 5, fontSize: 17 }}>{value}</strong>
    </div>
  );
}

const pill = {
  border: "1px solid #29313a",
  borderRadius: 9,
  padding: "8px 11px",
  color: "#9ba6b4",
  fontSize: 12,
};

const details = {
  borderTop: "1px solid #29313a",
  marginTop: 14,
  paddingTop: 10,
  color: "#8995a3",
  fontSize: 11,
  lineHeight: 1.65,
};
