export type ThemeId =
  | 'bloomberg'
  | 'tradingview'
  | 'apple_finance'
  | 'cyberpunk'
  | 'monochrome'
  | 'emerald'
  | 'midnight_blue'
  | 'light_professional'
  | 'glassmorphism'
  | 'amoled';

export type ThemeMode = 'dark' | 'light';
export type UiDensity = 'compact' | 'comfortable' | 'spacious';
export type CardStyle = 'flat' | 'bordered' | 'elevated' | 'glass';
export type BorderRadiusStyle = 'sharp' | 'subtle' | 'rounded' | 'pill';
export type NavStyle = 'sidebar' | 'compact_rail' | 'topbar';
export type CurrencyCode = 'BRL' | 'USD' | 'EUR';

export interface UserPreferences {
  themeId: ThemeId;
  mode: ThemeMode;
  accentColor: string;
  backgroundColor: string;
  chartColors: string[];
  density: UiDensity;
  cardStyle: CardStyle;
  borderRadius: BorderRadiusStyle;
  navStyle: NavStyle;
  currency: CurrencyCode;
}

export interface ThemePreset {
  id: ThemeId;
  name: string;
  tagline: string;
  description: string;
  mode: ThemeMode;
  backgroundColor: string;
  surfaceColor: string;
  surfaceMutedColor: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
  accentForeground: string;
  positiveColor: string;
  negativeColor: string;
  warningColor: string;
  chartColors: string[];
  density: UiDensity;
  cardStyle: CardStyle;
  borderRadius: BorderRadiusStyle;
  navStyle: NavStyle;
  fontDisplay: 'mono' | 'outfit' | 'jakarta';
  fontBody: 'mono' | 'jakarta';
  headingStyle: 'terminal' | 'editorial' | 'clean';
  chartLineStyle: 'stepped' | 'sharp' | 'smooth';
  glassBlur: boolean;
}

export type TransactionType = 'income' | 'expense';
export type RecurrenceFrequency = 'none' | 'weekly' | 'monthly' | 'yearly';

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: TransactionType;
  color: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  categoryId: string;
  categoryName: string;
  isRecurring: boolean;
  recurrenceFrequency: RecurrenceFrequency;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD or ''
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SavingsDeposit {
  id: string;
  userId: string;
  goalId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  note: string;
  createdAt?: unknown;
}

export type AssetClass = 'crypto' | 'fixed_income' | 'fii' | 'stocks' | 'other';
export type ContributionEntryType = 'contribution' | 'withdrawal' | 'valuation';

export interface InvestmentAsset {
  id: string;
  userId: string;
  name: string;
  ticker: string;
  assetClass: AssetClass;
  quantity: number;
  investedAmount: number;
  currentAmount: number;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface InvestmentContribution {
  id: string;
  userId: string;
  investmentId: string;
  entryType: ContributionEntryType;
  amount: number;
  quantityDelta: number;
  date: string; // YYYY-MM-DD
  note: string;
  createdAt?: unknown;
}

export type SyncMethod = 'statement' | 'open_finance_api';
export type ConnectionStatus = 'connected' | 'pending' | 'error';

export interface BankConnection {
  id: string;
  userId: string;
  institutionName: string;
  accountLabel: string;
  syncMethod: SyncMethod;
  endpointUrl: string;
  syncedBalance: number;
  autoSync: boolean;
  lastSyncedAt: string;
  status: ConnectionStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type AppView =
  | 'dashboard'
  | 'transactions'
  | 'savings'
  | 'investments'
  | 'bank_sync'
  | 'analytics'
  | 'reports'
  | 'calculator'
  | 'themes'
  | 'settings';

export interface FinanceBackupPayload {
  version: number;
  exportedAt: string;
  preferences: UserPreferences;
  categories: Category[];
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  savingsDeposits: SavingsDeposit[];
  investments: InvestmentAsset[];
  investmentContributions: InvestmentContribution[];
  bankConnections?: BankConnection[];
}
