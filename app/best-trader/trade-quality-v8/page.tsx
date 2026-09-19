"use client";

import { useEffect, useState } from "react";

const CANDIDATES = [
  { label: "D2", address: "0xb4a3349619ff3da514b42bd7a124947aaf2b9210", growthProxy: 5.547, portfolioPnl: 349400 },
  { label: "D3", address: "0xa9b95f2a2e7ef219021efc5c04c32761b8553bbd", growthProxy: 1.826, portfolioPnl: 5490000 },
  { label: "D4", address: "0xf29c6bc1147a841519b382459a6d7a373c6b9971", growthProxy: 1.535, portfolioPnl: 8860000 },
  { label: "D5", address: "0x469e9a7f624b04c24f0e64edf8d8a277e6bf58a5", growthProxy: 1.099, portfolioPnl: 8670000 },
  { label: "Machi", address: "0x020ca66c30bec2c4fe3861a94e4db4a498a35872", growthProxy: 0.46, portfolioPnl: 2610000 },
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

export default function TradeQualityV8() {
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

        await new Promise((resolve) => setTimeout(resolve, 2800));
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  const done = rows.filter((r) => !r.loading).length;
  const pass = rows.filter(
    (r) => r.data?.status === "PASS" || r.data?.status === "PASS_PARTIAL",
  ).length;

  return (
    <main style={{ minHeight: "100vh", background: "#090b0d", color: "#f5f7f9" }}>
      <div style={{ width: "min(1320px, calc(100% - 36px))", margin: "0 auto" }}>
        <section style={{ padding: "44px 0 24px" }}>
          <div
            style={{
              color: "#c9ff57",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: ".16em",
            }}
          >
            KYOSUKE LIFE / BEST TRADER / TRADE QUALITY v0.8
          </div>

          <h1
            style={{
              fontSize: "clamp(48px, 7vw, 80px)",
              letterSpacing: "-.055em",
              margin: "10px 0",
            }}
          >
            Shortlist quality check.
          </h1>

          <p style={{ maxWidth: 850, color: "#9ca8b5", lineHeight: 1.7 }}>
            30D 高增长候选的 Realized Order 质量验证。增长负责发现，fills
            负责判断盈利是不是持续、分散、可解释。
          </p>
        </section>

        <div
          style={{
            border: "1px solid #29313a",
            background: "#11151a",
            padding: "14px 16px",
            borderRadius: 12,
            color: "#9aa5b3",
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          Gate: Orders ≥ 20 · Net PnL &gt; 0 · PF ≥ 1.2 · Top-1 winning order
          &gt; 55% → REVIEW_CONCENTRATED · 10,000 fills → PARTIAL, not reject.
        </div>

        <div style={{ display: "flex", gap: 9, margin: "18px 0" }}>
          <span style={pill}>{done} / {rows.length}</span>
          <span style={pill}>Pass: {pass}</span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
            gap: 14,
            paddingBottom: 70,
          }}
        >
          {rows.map(({ candidate, data, loading, error }) => {
            const r = data?.realized;
            const statusColor =
              data?.status?.startsWith("PASS")
                ? "#56e79a"
                : data?.status?.startsWith("REVIEW")
                  ? "#ffd75f"
                  : "#ff6875";

            return (
              <article
                key={candidate.address}
                style={{
                  border: "1px solid #29313a",
                  background: "#0e1216",
                  borderRadius: 15,
                  padding: 19,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <strong>{candidate.label}</strong>
                    <div
                      style={{
                        font: "11px ui-monospace, monospace",
                        color: "#748190",
                        marginTop: 4,
                      }}
                    >
                      {short(candidate.address)}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 10,
                      border: "1px solid #29313a",
                      borderRadius: 8,
                      padding: "6px 8px",
                      color: loading ? "#9ba6b4" : statusColor,
                    }}
                  >
                    {loading ? "LOADING" : error ? "ERROR" : data?.status}
                  </span>
                </div>

                {loading && <div style={details}>Fetching 30D fills…</div>}
                {error && (
                  <div style={{ ...details, color: "#ff6875" }}>{error}</div>
                )}

                {r && (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                        gap: 8,
                        marginTop: 17,
                      }}
                    >
                      <Metric label="WIN RATE" value={pct(r.winRate)} />
                      <Metric
                        label="PROFIT FACTOR"
                        value={
                          r.profitFactor == null
                            ? "—"
                            : r.profitFactor.toFixed(2)
                        }
                      />
                      <Metric label="REALIZED PNL" value={usd(r.netPnl)} />
                      <Metric label="ORDERS" value={String(r.orders)} />
                      <Metric label="REALIZED DD" value={usd(r.drawdown)} />
                      <Metric label="7D PNL" value={usd(r.net7)} />
                      <Metric
                        label="TOP WIN SHARE"
                        value={pct(r.top1WinShare)}
                      />
                      <Metric
                        label="TOP COIN"
                        value={`${r.topCoin || "—"} ${pct(r.topCoinShare)}`}
                      />
                    </div>

                    <div style={details}>
                      Growth proxy {pct(candidate.growthProxy)} · Portfolio PnL{" "}
                      {usd(candidate.portfolioPnl)} · Raw fills{" "}
                      {data?.fills.count.toLocaleString()}
                      {data?.fills.partial ? " (PARTIAL)" : ""} · Avg W/L{" "}
                      {r.avgWin && r.avgLoss
                        ? (r.avgWin / r.avgLoss).toFixed(2)
                        : "—"}
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
      <small style={{ display: "block", color: "#718090", fontSize: 9 }}>
        {label}
      </small>
      <strong style={{ display: "block", marginTop: 5, fontSize: 17 }}>
        {value}
      </strong>
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
