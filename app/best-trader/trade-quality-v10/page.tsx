"use client";

import { useEffect, useState } from "react";

const CANDIDATES = [
  { label: "E2", address: "0xea0027b6ea9b6d7d401b5266979cc3b3ca87a918", growthProxy: 1.672, portfolioPnl: 17250000 },
  { label: "E4", address: "0xa2ce501d9c0c5e23d34272f84402cfb7835b3126", growthProxy: 1.545, portfolioPnl: 12770000 },
  { label: "E5", address: "0x152e41f0b83e6cad4b5dc730c1d6279b7d67c9dc", growthProxy: 1.207, portfolioPnl: 9730000 },
  { label: "E6", address: "0x9c6a5b4662c722d2c47f43d6c9813cb080ffa4ed", growthProxy: 2.224, portfolioPnl: 13500000 },
  { label: "E7", address: "0xde8d9e530b0528ffa7b1190f862536c055dd9524", growthProxy: 1.398, portfolioPnl: 10110000 },
  { label: "E8", address: "0xec0b9ebf2a304c99cafe85c548c14dd7783cb078", growthProxy: 1.719, portfolioPnl: 6670000 },
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

export default function TradeQualityV10() {
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
  const survived = rows.filter(
    (r) =>
      r.data?.status === "PASS" ||
      r.data?.status === "PASS_PARTIAL" ||
      r.data?.status === "REVIEW_CONCENTRATED",
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
            KYOSUKE LIFE / BEST TRADER / TRADE QUALITY v1.0
          </div>

          <h1
            style={{
              fontSize: "clamp(48px, 7vw, 80px)",
              letterSpacing: "-.055em",
              margin: "10px 0",
            }}
          >
            Six new candidates.
          </h1>

          <p style={{ maxWidth: 860, color: "#9ca8b5", lineHeight: 1.7 }}>
            Discovery v0.9 から、資本効率・30D PnL・Ledger の複雑さを見て
            E2 / E4 / E5 / E6 / E7 / E8 を Trade Quality 検証へ進める。
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
          Gate: Orders ≥ 20 · Net Realized PnL &gt; 0 · PF ≥ 1.2.
          Top-1 winner &gt; 55% → REVIEW_CONCENTRATED. 10,000 fills → PARTIAL.
          Realized / Portfolio は coverage の差を見るための参考値。
        </div>

        <div style={{ display: "flex", gap: 9, margin: "18px 0" }}>
          <span style={pill}>{done} / {rows.length}</span>
          <span style={pill}>Survived: {survived}</span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(430px, 1fr))",
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

            const realizedCapture =
              r && candidate.portfolioPnl > 0
                ? r.netPnl / candidate.portfolioPnl
                : null;

            const notes = r
              ? [
                  data?.fills.partial ? "PARTIAL FILLS" : null,
                  r.orders >= 50 ? "HIGH SAMPLE" : r.orders < 20 ? "LOW SAMPLE" : null,
                  r.top1WinShare != null && r.top1WinShare > 0.55
                    ? "ONE-WIN CONCENTRATED"
                    : null,
                  r.topCoinShare != null && r.topCoinShare > 0.7
                    ? "HIGH MARKET CONC."
                    : null,
                ].filter(Boolean)
              : [];

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
                {error && <div style={{ ...details, color: "#ff6875" }}>{error}</div>}

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
                        value={r.profitFactor == null ? "—" : r.profitFactor.toFixed(2)}
                      />
                      <Metric label="REALIZED PNL" value={usd(r.netPnl)} />
                      <Metric label="ORDERS" value={String(r.orders)} />
                      <Metric label="REALIZED DD" value={usd(r.drawdown)} />
                      <Metric label="7D PNL" value={usd(r.net7)} />
                      <Metric label="TOP WIN SHARE" value={pct(r.top1WinShare)} />
                      <Metric
                        label="TOP COIN"
                        value={`${r.topCoin || "—"} ${pct(r.topCoinShare)}`}
                      />
                      <Metric
                        label="REALIZED / PORTFOLIO"
                        value={pct(realizedCapture)}
                      />
                      <Metric
                        label="AVG W/L"
                        value={
                          r.avgWin && r.avgLoss
                            ? (r.avgWin / r.avgLoss).toFixed(2)
                            : "—"
                        }
                      />
                      <Metric
                        label="GROWTH PROXY"
                        value={pct(candidate.growthProxy)}
                      />
                      <Metric
                        label="RAW FILLS"
                        value={`${data?.fills.count.toLocaleString()}${data?.fills.partial ? "*" : ""}`}
                      />
                    </div>

                    <div style={details}>
                      Portfolio PnL {usd(candidate.portfolioPnl)} · Top-3 win share{" "}
                      {pct(r.top3WinShare)}
                      {notes.length ? " · " + notes.join(" · ") : ""}
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
