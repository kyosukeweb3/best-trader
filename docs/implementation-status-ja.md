# Best Trader v0.1 — 初回実装

アップロードされた製品構成ドキュメントに基づき、候補探索から固定6名の観測へ移行する最初の実装です。v0.1 の全公開条件を満たした完成版ではありません。

## 実装済み

- 日本語の `/best-trader` と6名の `/best-trader/[trader]`。トップからリダイレクト。
- 指定された6アドレスのみ取得可能。ユーザーによるウォレット追加はありません。
- Hyperliquid の口座履歴、直近約定、標準市場と追加 perp DEX の現在ポジション取得。
- 7日 / 30日の時間加重平均口座資産を分母とした Return Proxy。REVIEW を保持し、参考値として順位を表示。古い・短い履歴は順位対象外。
- 口座資産と累積損益の切り替え、7日 / 30日 / 90日 / 取得可能全期間。
- REST 観測間の OPEN / ADD / REDUCE / CLOSE。反転は CLOSE と OPEN の2イベント。
- 同サイズのポジションで ROE が5ポイント変わった場合の損益イベント。30分クールダウン。建玉・解消は対象外。
- SQLite のスナップショット・約定・イベント保存。トランザクション、重複防止、取得不完全なポジション一覧の保存拒否。
- 保存済みデータから現在ポジションの含み損益チャートとフィードを表示。解消・方向反転をまたぐ線は描画しない。

## 実行

Node.js 24。`npm ci`、`npm run dev`。`npm test`、`npm run typecheck`、`npm run build` で検証。

継続観測する場合は永続ディスクのある同一ホストで、Web と collector の両方に同じ `TRACKER_DB=/absolute/persistent/path/tracker.sqlite` を設定します。親ディレクトリを先に作成してください。

- Web: `npm run build` 後 `npm start`
- Collector: `npm run collector`
- 1回のみ: `npm run collector -- --once`

collector は1プロセスで運用。30秒を目標にループしますが、取得時間が長い場合は実際の間隔も長くなります。日時とエラーを画面で確認してください。SQLite ファイルと WAL のバックアップ、保持期間の運用は別途必要です。

`TRACKER_DB` 未設定時は現在値だけを REST 取得します。履歴とイベントは空状態を表示し、永続保存されたと誤認させません。Vercel の一時ファイルに SQLite を置いて継続履歴として扱わないでください。Vercel 本番で継続観測するには外部の常駐 collector と共有データベースへの移行が必要です。

## 次の実装・公開前の未完了項目

1. Ledger の完全取得・口座範囲検証と Modified Dietz 接続。計算関数はテスト済みですが、現状のランキングはすべて REVIEW / Proxy です。
2. 常駐 WebSocket userFills 購読、再接続、REST の重複区間補完、切断ギャップの可視化。現在は直近 REST 約定を保存する土台です。高頻度時に2000件を超えるギャップを完全に復旧する保証はまだありません。
3. 約定起点の Position Episode、実際の建玉時刻、決済価格・手数料調整済み実現損益、清算イベント。
4. 30日勝率・PF・平均損益・ドローダウン。API取得上限だけのサンプルを完全な30日統計として出さないため、画面は検証中です。
5. 価格 / 平均建値 / サイズを含むライフサイクルチャート、過去エピソード切替。現状は観測中の含み損益チャートです。
6. 口座資産比1%の損益通知条件、配信先と外部プッシュ通知。現在のイベントはサイト内フィードのみ。
7. 共有DBの本番運用、スケジューラ分離、ランキング履歴、全6名の連続稼働検証、モバイルブラウザでの目視検証。

REST のポジション消失は「解消を観測」と表示し、取得していない決済価格や実現利益は作りません。既存の研究ルートは残しています。新しいプロダクト入口の文案は日本語です。

## API 根拠

- https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint
- https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/websocket/subscriptions

公式仕様では userFills は最新2000件、userFillsByTime は最新10000件まで。これは継続保存と WebSocket の必要性を示すもので、過去の全取引を取得できる保証ではありません。
