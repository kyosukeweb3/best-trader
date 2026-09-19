export const traders = [
  {id:"the-grinder",name:"THE GRINDER",address:"0xb4a3349619ff3da514b42bd7a124947aaf2b9210",style:"多通貨・積み上げ型",description:"多通貨を継続的に売買し、小さな優位性を積み重ねる。"},
  {id:"zec-scalper",name:"ZEC SCALPER",address:"0xf29c6bc1147a841519b382459a6d7a373c6b9971",style:"ZEC・短期売買",description:"ZEC を中心に、高頻度の取引を行う。"},
  {id:"hit-rate-king",name:"HIT RATE KING",address:"0x469e9a7f624b04c24f0e64edf8d8a277e6bf58a5",style:"勝率重視型",description:"勝率を重視する取引スタイルを観測する。"},
  {id:"eth-operator",name:"ETH OPERATOR",address:"0x020ca66c30bec2c4fe3861a94e4db4a498a35872",style:"ETH・アクティブ",description:"ETH を中心としたアクティブな取引。"},
  {id:"pump-hunter",name:"PUMP HUNTER",address:"0x7e1ad5e2bbe30d6d202e7c41036ea0a07c560be9",style:"アルト特化型",description:"PUMP などのアルト市場を集中的に取引する。"},
  {id:"btc-sniper",name:"BTC SNIPER",address:"0xec0b9ebf2a304c99cafe85c548c14dd7783cb078",style:"BTC・厳選型",description:"BTC を中心に、取引機会を絞ってリスクとリターンを追求する。"},
] as const;
export type Trader = typeof traders[number];
