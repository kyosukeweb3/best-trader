export const traders = [
  {
    id:"the-grinder",
    name:"堅実トレードの達人",
    alias:"THE GRINDER",
    address:"0xb4a3349619ff3da514b42bd7a124947aaf2b9210",
    style:"多通貨・積み上げ型",
    description:"複数銘柄を中高頻度で回し、高い勝率と分散した小さな利益を着実に積み上げるスタイル。"
  },
  {
    id:"zec-scalper",
    name:"ZEC刈り取り職人",
    alias:"ZEC SCALPER",
    address:"0xf29c6bc1147a841519b382459a6d7a373c6b9971",
    style:"ZEC・高頻度型",
    description:"ZECを中心に高頻度で売買し、小さな値幅を何度も拾って利益を積み上げるスタイル。"
  },
  {
    id:"hit-rate-king",
    name:"命中率の王",
    alias:"HIT RATE KING",
    address:"0x469e9a7f624b04c24f0e64edf8d8a277e6bf58a5",
    style:"超高勝率型",
    description:"極めて高い勝率を武器に、小さな利確を積み重ねながら勝ち数を伸ばすスタイル。"
  },
  {
    id:"eth-operator",
    name:"ETHの相場師",
    alias:"ETH OPERATOR",
    address:"0x020ca66c30bec2c4fe3861a94e4db4a498a35872",
    style:"ETH・バランス型",
    description:"ETHを中心に、取引頻度・勝率・損益バランスを保ちながら機動的に売買するスタイル。"
  },
  {
    id:"pump-hunter",
    name:"アルトハンター",
    alias:"PUMP HUNTER",
    address:"0x7e1ad5e2bbe30d6d202e7c41036ea0a07c560be9",
    style:"アルト・特化型",
    description:"PUMPなどのアルト銘柄を狙い撃ちし、特定市場のボラティリティから収益機会を探すスタイル。"
  },
  {
    id:"btc-sniper",
    name:"ビットコイン・スナイパー",
    alias:"BTC SNIPER",
    address:"0xec0b9ebf2a304c99cafe85c548c14dd7783cb078",
    style:"BTC・厳選型",
    description:"BTCに取引対象を絞り、低頻度でも大きなリスクリワードを狙って厳選して仕掛けるスタイル。"
  },
] as const;

export type Trader = typeof traders[number];
