// Symbol to Company Name Mapping
export const SYMBOL_TO_COMPANY: Record<string, string> = {
  // Tech Giants
  AAPL: 'Apple Inc.',
  GOOGL: 'Alphabet Inc.',
  MSFT: 'Microsoft Corporation',
  AMZN: 'Amazon.com Inc.',
  META: 'Meta Platforms Inc.',
  TSLA: 'Tesla, Inc.',
  NVDA: 'NVIDIA Corporation',
  INTC: 'Intel Corporation',
  AMD: 'Advanced Micro Devices',
  ORCL: 'Oracle Corporation',
  IBM: 'IBM',
  CSCO: 'Cisco Systems',
  ADBE: 'Adobe Inc.',
  CRM: 'Salesforce Inc.',
  NFLX: 'Netflix Inc.',
  PYPL: 'PayPal Holdings',
  UBER: 'Uber Technologies',
  LYFT: 'Lyft Inc.',
  SNAP: 'Snap Inc.',
  TWTR: 'Twitter Inc.',
  SQ: 'Square Inc.',
  SHOP: 'Shopify Inc.',
  SPOT: 'Spotify Technology',
  ZM: 'Zoom Video',
  DOCU: 'DocuSign Inc.',

  // Finance
  JPM: 'JPMorgan Chase & Co.',
  BAC: 'Bank of America',
  WFC: 'Wells Fargo',
  GS: 'Goldman Sachs',
  MS: 'Morgan Stanley',
  C: 'Citigroup Inc.',
  AXP: 'American Express',
  V: 'Visa Inc.',
  MA: 'Mastercard Inc.',
  'BRK.A': 'Berkshire Hathaway',
  'BRK.B': 'Berkshire Hathaway',

  // Healthcare
  JNJ: 'Johnson & Johnson',
  PFE: 'Pfizer Inc.',
  UNH: 'UnitedHealth Group',
  CVS: 'CVS Health',
  MRK: 'Merck & Co.',
  ABBV: 'AbbVie Inc.',
  TMO: 'Thermo Fisher Scientific',
  ABT: 'Abbott Laboratories',
  DHR: 'Danaher Corporation',
  MDT: 'Medtronic plc',

  // Consumer
  WMT: 'Walmart Inc.',
  HD: 'The Home Depot',
  DIS: 'The Walt Disney Company',
  NKE: 'Nike Inc.',
  MCD: "McDonald's Corporation",
  SBUX: 'Starbucks Corporation',
  KO: 'The Coca-Cola Company',
  PEP: 'PepsiCo Inc.',
  PG: 'Procter & Gamble',
  COST: 'Costco Wholesale',
  TGT: 'Target Corporation',

  // Energy
  XOM: 'Exxon Mobil',
  CVX: 'Chevron Corporation',
  COP: 'ConocoPhillips',
  SLB: 'Schlumberger',
  OXY: 'Occidental Petroleum',

  // Industrial
  BA: 'Boeing Company',
  CAT: 'Caterpillar Inc.',
  GE: 'General Electric',
  MMM: '3M Company',
  HON: 'Honeywell International',
  UPS: 'United Parcel Service',
  FDX: 'FedEx Corporation',
  LMT: 'Lockheed Martin',
  RTX: 'Raytheon Technologies',

  // Telecommunications
  T: 'AT&T Inc.',
  VZ: 'Verizon Communications',
  TMUS: 'T-Mobile US',

  // Real Estate
  AMT: 'American Tower',
  PLD: 'Prologis Inc.',
  CCI: 'Crown Castle',
  EQIX: 'Equinix Inc.',

  // Materials
  LIN: 'Linde plc',
  APD: 'Air Products and Chemicals',
  ECL: 'Ecolab Inc.',
  SHW: 'Sherwin-Williams',
  NEM: 'Newmont Corporation',

  // ETFs
  SPY: 'SPDR S&P 500 ETF',
  QQQ: 'Invesco QQQ Trust',
  IWM: 'iShares Russell 2000 ETF',
  DIA: 'SPDR Dow Jones Industrial Average ETF',
  VOO: 'Vanguard S&P 500 ETF',
  VTI: 'Vanguard Total Stock Market ETF',
}

export function getCompanyName(symbol: string): string {
  return SYMBOL_TO_COMPANY[symbol.toUpperCase()] || symbol
}
