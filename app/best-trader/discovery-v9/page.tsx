"use client";

import { useEffect, useState } from "react";

const CANDIDATES = [
  { label: "E1", address: "0xe867fbdad3291530e41530301ecb77693850c78e", leaderboardPnl: 27023104, accountValue: 91429914 },
  { label: "E2", address: "0xea0027b6ea9b6d7d401b5266979cc3b3ca87a918", leaderboardPnl: 17044965, accountValue: 20142085 },
  { label: "E3", address: "0xbf732ea04197942783e34730ed6e0f6099575d58", leaderboardPnl: 11314570, accountValue: 7533044 },
  { label: "E4", address: "0xa2ce501d9c0c5e23d34272f84402cfb7835b3126", leaderboardPnl: 13395300, accountValue: 14479720 },
  { label: "E5", address: "0x152e41f0b83e6cad4b5dc730c1d6279b7d67c9dc", leaderboardPnl: 12938880, accountValue: 22772290 },
  { label: "E6", address: "0x9c6a5b4662c722d2c47f43d6c9813cb080ffa4ed", leaderboardPnl: 11753740, accountValue: 19847770 },
  { label: "E7", address: "0xde8d9e530b0528ffa7b1190f862536c055dd9524", leaderboardPnl: 10407300, accountValue: 21841510 },
  { label: "E8", address: "0xec0b9ebf2a304c99cafe85c548c14dd7783cb078", leaderboardPnl: 9441148, accountValue: 12603370 },
  { label: "E9", address: "0xedcdcaa1f18350c50c10bef860e64daa9785d05a", leaderboardPnl: 9078426, accountValue: 27081090 },
  { label: "E10", address: "0xeadc152ac1014ace57c6b353f89adf5faffe9d55", leaderboardPnl: 8672886, accountValue: 10365780 },
];

type Candidate = (typeof CANDIDATES)[number];
type Data = {
  status: string;
  account: {
    startValue: number | null;
    endValue: number | null;
    avgValue: number | null;
    pnlDelta: number | null;
    capitalEfficiency: number | null;
  };
  ledger: { events: number; types: string[] };
  coverage: { accountValuePoints: number; pnlPoints: number };
};

type Row = { candidate: Candidate; loading: boolean; data?: Data; error?: string };

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

export default function DiscoveryExpansionV9() {
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
            `/api/best-trader/growth?address=${candidate.address}`,
            { cache: "no-store" },
          );
          const body = await res.json();
          if (!res.ok) throw new Error(body.error || "API error");

          if (!cancelled) {
            setRows((prev) =>
              prev.map((row, idx) =>
                idx === i
                  ? { candidate, loading: false, data: body }
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
                      loading: false,
                      error: String((e as Error)?.message || e),
                    }
                  : row,
              ),
            );
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 1800));
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const done = rows.filter((r) => !r.loading).length;
  const promising = rows.filter((r) => r.data?.status === "PROMISING").length;

  return (
    <main style={{ minHeight: "100vh", background: "#090b0d", color: "#f5f7f9" }}>
      <div style={{ width: "min(1320px, calc(100% - 36px))", margin: "0 auto" }}>
        <section style={{ padding: "44px 0 24px" }}>
          <div style={{ color: "#c9ff57", fontSize: 11, fontWeight: 800, letterSpacing: ".16em" }}>
            KYOSUKE LIFE / BEST TRADER / DISCOVERY EXPANSION v0.9
          </div>
          <h1 style={{ fontSize: "clamp(48px, 7vw, 80px)", letterSpacing: "-.055em", margin: "10px 0" }}>
            Find the next four.
          </h1>
          <p style={{ maxWidth: 850, color: "#9ca8b5", lineHeight: 1.7 }}>
            既存4候補の次を探す。ここでは fills を使わず、30D Portfolio PnL と平均口座価値から
            Capital Efficiency Proxy を計算し、Trade Quality 検証へ進める候補だけを絞る。
          </p>
        </section>

        <div style={{ border: "1px solid #29313a", background: "#11151a", padding: "14px 16px", borderRadius: 12, color: "#9aa5b3", fontSize: 12, lineHeight: 1.6 }}>
          Research proxy only. Capital Efficiency = 30D Portfolio PnL / Average positive account value. Cash-flow adjusted returnではないため、公開時のGrowth表示にはまだ使用しない。
        </div>

        <div style={{ display: "flex", gap: 9, margin: "18px 0" }}>
          <span style={pill}>{done} / {rows.length}</span>
          <span style={pill}>Promising: {promising}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(430px, 1fr))", gap: 14, paddingBottom: 70 }}>
          {rows.map(({ candidate, loading, data, error }) => {
            const color =
              data?.status === "PROMISING"
                ? "#56e79a"
                : data?.status === "WEAK"
                  ? "#ff6875"
                  : "#ffd75f";

            return (
              <article key={candidate.address} style={{ border: "1px solid #29313a", background: "#0e1216", borderRadius: 15, padding: 19 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <strong>{candidate.label}</strong>
                    <div style={{ font: "11px ui-monospace, monospace", color: "#748190", marginTop: 4 }}>
                      {short(candidate.address)}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, border: "1px solid #29313a", borderRadius: 8, padding: "6px 8px", color: loading ? "#9ba6b4" : color }}>
                    {loading ? "LOADING" : error ? "ERROR" : data?.status}
                  </span>
                </div>

                {loading && <div style={details}>Fetching portfolio + ledger…</div>}
                {error && <div style={{ ...details, color: "#ff6875" }}>{error}</div>}

                {data && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginTop: 17 }}>
                      <Metric label="CAPITAL EFF. PROXY" value={pct(data.account.capitalEfficiency)} />
                      <Metric label="30D PORTFOLIO PNL" value={usd(data.account.pnlDelta)} />
                      <Metric label="AVG CAPITAL" value={usd(data.account.avgValue)} />
                      <Metric label="END CAPITAL" value={usd(data.account.endValue)} />
                      <Metric label="START CAPITAL" value={usd(data.account.startValue)} />
                      <Metric label="LEDGER EVENTS" value={String(data.ledger.events)} />
                      <Metric label="AV POINTS" value={String(data.coverage.accountValuePoints)} />
                      <Metric label="PNL POINTS" value={String(data.coverage.pnlPoints)} />
                    </div>

                    <div style={details}>
                      Discovery leaderboard PnL {usd(candidate.leaderboardPnl)} · Leaderboard account value{" "}
                      {usd(candidate.accountValue)} · Ledger types: {data.ledger.types.join(", ") || "none"}
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
