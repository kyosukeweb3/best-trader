export const traders = [
  {id:"the-grinder",name:"堅実トレードの達人",alias:"THE GRINDER",address:"0xb4a3349619ff3da514b42bd7a124947aaf2b9210",style:"多通貨・積み上げ型",description:"複数の銘柄をこまめに売買し、小さな利益を着実に積み重ねるスタイル。"},
  {id:"zec-scalper",name:"ZECハーベスター",alias:"ZEC SCALPER",address:"0xf29c6bc1147a841519b382459a6d7a373c6b9971",style:"ZEC・短期売買",description:"ZECを中心に短期売買を繰り返し、小さな値動きから利益を狙うスタイル。"},
  {id:"hit-rate-king",name:"命中率の王",alias:"HIT RATE KING",address:"0x469e9a7f624b04c24f0e64edf8d8a277e6bf58a5",style:"勝率重視型",description:"勝率を重視し、勝ちを積み重ねることを狙うスタイル。"},
  {id:"eth-operator",name:"イーサの相場師",alias:"ETH OPERATOR",address:"0x020ca66c30bec2c4fe3861a94e4db4a498a35872",style:"ETH・アクティブ",description:"ETHを中心に相場の変化を捉え、機動的に売買するスタイル。"},
  {id:"pump-hunter",name:"アルトハンター",alias:"PUMP HUNTER",address:"0x7e1ad5e2bbe30d6d202e7c41036ea0a07c560be9",style:"アルト特化型",description:"PUMPなどのアルト銘柄に狙いを絞り、値動きのチャンスを追うスタイル。"},
  {id:"btc-sniper",name:"ビットコイン・スナイパー",alias:"BTC SNIPER",address:"0xec0b9ebf2a304c99cafe85c548c14dd7783cb078",style:"BTC・厳選型",description:"BTCの取引機会を厳選し、リスクに対して大きなリターンを狙うスタイル。"},
] as const;
export type Trader = typeof traders[number];
