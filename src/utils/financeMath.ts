import {
  AssetClass,
  FinanceBackupPayload,
  InvestmentAsset,
  InvestmentContribution,
  SavingsDeposit,
  SavingsGoal,
  Transaction,
} from '../types/finance';

export interface DashboardSummary {
  availableBalance: number;
  totalSaved: number;
  totalInvested: number;
  totalInvestedCost: number;
  totalNetWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyNet: number;
  savingsRate: number;
  recurringMonthlyExpenses: number;
}

export function calculateDashboardSummary(
  transactions: Transaction[],
  savingsGoals: SavingsGoal[],
  investments: InvestmentAsset[],
  referenceMonth: string
): DashboardSummary {
  let allIncome = 0;
  let allExpenses = 0;
  let monthlyIncome = 0;
  let monthlyExpenses = 0;
  let recurringMonthlyExpenses = 0;

  for (const tx of transactions) {
    const amount = Number.isFinite(tx.amount) ? tx.amount : 0;
    if (tx.type === 'income') {
      allIncome += amount;
      if (tx.date.startsWith(referenceMonth)) {
        monthlyIncome += amount;
      }
    } else {
      allExpenses += amount;
      if (tx.date.startsWith(referenceMonth)) {
        monthlyExpenses += amount;
      }
      if (tx.isRecurring) {
        if (tx.recurrenceFrequency === 'weekly') {
          recurringMonthlyExpenses += amount * 4.33;
        } else if (tx.recurrenceFrequency === 'yearly') {
          recurringMonthlyExpenses += amount / 12;
        } else {
          recurringMonthlyExpenses += amount;
        }
      }
    }
  }

  const availableBalance = allIncome - allExpenses;
  const totalSaved = savingsGoals.reduce(
    (sum, g) => sum + (Number.isFinite(g.currentAmount) ? g.currentAmount : 0),
    0
  );
  const totalInvested = investments.reduce(
    (sum, a) => sum + (Number.isFinite(a.currentAmount) ? a.currentAmount : 0),
    0
  );
  const totalInvestedCost = investments.reduce(
    (sum, a) => sum + (Number.isFinite(a.investedAmount) ? a.investedAmount : 0),
    0
  );
  const totalNetWorth = availableBalance + totalSaved + totalInvested;
  const monthlyNet = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (monthlyNet / monthlyIncome) * 100 : 0;

  return {
    availableBalance,
    totalSaved,
    totalInvested,
    totalInvestedCost,
    totalNetWorth,
    monthlyIncome,
    monthlyExpenses,
    monthlyNet,
    savingsRate,
    recurringMonthlyExpenses,
  };
}

export interface MonthlyCashFlowPoint {
  month: string; // YYYY-MM
  income: number;
  expenses: number;
  net: number;
}

export function buildCashFlowSeries(
  transactions: Transaction[],
  limitMonths = 6
): MonthlyCashFlowPoint[] {
  const byMonth = new Map<string, { income: number; expenses: number }>();

  for (const tx of transactions) {
    if (!tx.date || tx.date.length < 7) continue;
    const month = tx.date.slice(0, 7);
    const current = byMonth.get(month) ?? { income: 0, expenses: 0 };
    if (tx.type === 'income') {
      current.income += tx.amount;
    } else {
      current.expenses += tx.amount;
    }
    byMonth.set(month, current);
  }

  const sortedMonths = Array.from(byMonth.keys()).sort();
  const sliced = limitMonths > 0 ? sortedMonths.slice(-limitMonths) : sortedMonths;

  return sliced.map((month) => {
    const row = byMonth.get(month)!;
    return {
      month,
      income: row.income,
      expenses: row.expenses,
      net: row.income - row.expenses,
    };
  });
}

export interface WealthSeriesPoint {
  period: string;
  label: string;
  cashCumulative: number;
  savingsCumulative: number;
  investmentsValue: number;
  totalWealth: number;
}

function getIsoWeekKey(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-S${String(weekNo).padStart(2, '0')}`;
}

export function buildNetWorthEvolution(
  transactions: Transaction[],
  savingsDeposits: SavingsDeposit[],
  savingsGoals: SavingsGoal[],
  investments: InvestmentAsset[],
  investmentContributions: InvestmentContribution[],
  granularity: 'daily' | 'weekly' | 'monthly' | 'annual' = 'monthly'
): WealthSeriesPoint[] {
  const keyFn = (date: string) => {
    if (granularity === 'daily') return date;
    if (granularity === 'weekly') return getIsoWeekKey(date);
    if (granularity === 'annual') return date.slice(0, 4);
    return date.slice(0, 7);
  };

  const cashDeltaByPeriod = new Map<string, number>();
  const savingsDeltaByPeriod = new Map<string, number>();
  const investDeltaByPeriod = new Map<string, number>();

  for (const tx of transactions) {
    if (!tx.date || tx.date.length < 10) continue;
    const key = keyFn(tx.date);
    const delta = tx.type === 'income' ? tx.amount : -tx.amount;
    cashDeltaByPeriod.set(key, (cashDeltaByPeriod.get(key) ?? 0) + delta);
  }

  for (const dep of savingsDeposits) {
    if (!dep.date || dep.date.length < 10) continue;
    const key = keyFn(dep.date);
    savingsDeltaByPeriod.set(key, (savingsDeltaByPeriod.get(key) ?? 0) + dep.amount);
  }

  for (const entry of investmentContributions) {
    if (!entry.date || entry.date.length < 10) continue;
    const key = keyFn(entry.date);
    const delta =
      entry.entryType === 'withdrawal'
        ? -entry.amount
        : entry.entryType === 'contribution'
          ? entry.amount
          : 0;
    investDeltaByPeriod.set(key, (investDeltaByPeriod.get(key) ?? 0) + delta);
  }

  const allKeys = new Set<string>([
    ...cashDeltaByPeriod.keys(),
    ...savingsDeltaByPeriod.keys(),
    ...investDeltaByPeriod.keys(),
  ]);

  const sortedKeys = Array.from(allKeys).sort();
  const totalCurrentSavings = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
  const totalCurrentInvestments = investments.reduce((s, a) => s + a.currentAmount, 0);

  if (sortedKeys.length === 0) {
    if (totalCurrentSavings === 0 && totalCurrentInvestments === 0) {
      return [];
    }
    const nowKey = keyFn(new Date().toISOString().slice(0, 10));
    return [
      {
        period: nowKey,
        label: nowKey,
        cashCumulative: 0,
        savingsCumulative: totalCurrentSavings,
        investmentsValue: totalCurrentInvestments,
        totalWealth: totalCurrentSavings + totalCurrentInvestments,
      },
    ];
  }

  // Reconcile baseline if goals/assets were created with initial balances not logged as deposits
  const totalLoggedSavings = Array.from(savingsDeltaByPeriod.values()).reduce((a, b) => a + b, 0);
  const totalLoggedInvest = Array.from(investDeltaByPeriod.values()).reduce((a, b) => a + b, 0);
  const savingsBaseOffset = Math.max(0, totalCurrentSavings - totalLoggedSavings);
  const investValuationOffset = totalCurrentInvestments - totalLoggedInvest;

  let runningCash = 0;
  let runningSavings = savingsBaseOffset;
  let runningInvest = 0;

  return sortedKeys.map((period, idx) => {
    runningCash += cashDeltaByPeriod.get(period) ?? 0;
    runningSavings += savingsDeltaByPeriod.get(period) ?? 0;
    runningInvest += investDeltaByPeriod.get(period) ?? 0;

    // Distribute market appreciation smoothly up to latest point
    const progress = sortedKeys.length > 1 ? idx / (sortedKeys.length - 1) : 1;
    const adjustedInvest = Math.max(0, runningInvest + investValuationOffset * progress);

    return {
      period,
      label: period,
      cashCumulative: runningCash,
      savingsCumulative: runningSavings,
      investmentsValue: adjustedInvest,
      totalWealth: runningCash + runningSavings + adjustedInvest,
    };
  });
}

export interface GoalCompletionEstimate {
  percent: number;
  remainingAmount: number;
  avgMonthlyDeposit: number;
  estimatedMonths: number | null;
  status: 'completed' | 'on_track' | 'needs_pace';
}

export function estimateGoalCompletion(
  goal: SavingsGoal,
  deposits: SavingsDeposit[]
): GoalCompletionEstimate {
  const target = Math.max(0.01, goal.targetAmount);
  const current = Math.max(0, goal.currentAmount);
  const percent = Math.min(100, (current / target) * 100);
  const remainingAmount = Math.max(0, target - current);

  if (remainingAmount === 0) {
    return {
      percent: 100,
      remainingAmount: 0,
      avgMonthlyDeposit: 0,
      estimatedMonths: 0,
      status: 'completed',
    };
  }

  const goalDeposits = deposits.filter((d) => d.goalId === goal.id && d.amount > 0);
  const uniqueMonths = new Set(goalDeposits.map((d) => d.date.slice(0, 7)));
  const totalPositiveDeposits = goalDeposits.reduce((s, d) => s + d.amount, 0);
  const monthCount = Math.max(1, uniqueMonths.size);
  const avgMonthlyDeposit =
    goalDeposits.length > 0 ? totalPositiveDeposits / monthCount : 0;

  const estimatedMonths =
    avgMonthlyDeposit > 0 ? Math.ceil(remainingAmount / avgMonthlyDeposit) : null;

  return {
    percent,
    remainingAmount,
    avgMonthlyDeposit,
    estimatedMonths,
    status: estimatedMonths !== null ? 'on_track' : 'needs_pace',
  };
}

export interface InvestmentMetrics {
  returnAmount: number;
  returnPercent: number;
  unitCost: number;
  currentUnitPrice: number;
}

export function calculateInvestmentMetrics(asset: InvestmentAsset): InvestmentMetrics {
  const returnAmount = asset.currentAmount - asset.investedAmount;
  const returnPercent =
    asset.investedAmount > 0 ? (returnAmount / asset.investedAmount) * 100 : 0;
  const unitCost = asset.quantity > 0 ? asset.investedAmount / asset.quantity : 0;
  const currentUnitPrice = asset.quantity > 0 ? asset.currentAmount / asset.quantity : 0;

  return {
    returnAmount,
    returnPercent,
    unitCost,
    currentUnitPrice,
  };
}

export interface AnalyticsReport {
  savingsRate: number;
  avgMonthlyIncome: number;
  avgMonthlyExpense: number;
  avgDailyExpense: number;
  monthOverMonthIncomeDelta: number | null;
  monthOverMonthExpenseDelta: number | null;
  recurringMonthlyExpenses: number;
  assetDistribution: Array<{ assetClass: AssetClass; value: number; share: number }>;
  wealthDistribution: Array<{ key: string; label: string; value: number; share: number }>;
  projection12Months: Array<{ monthIndex: number; label: string; projectedNetWorth: number }>;
}

export function calculateAnalyticsReport(
  transactions: Transaction[],
  savingsGoals: SavingsGoal[],
  investments: InvestmentAsset[],
  referenceMonth: string
): AnalyticsReport {
  const summary = calculateDashboardSummary(transactions, savingsGoals, investments, referenceMonth);
  const cashFlow = buildCashFlowSeries(transactions, 12);

  const activeMonths = Math.max(1, cashFlow.length);
  const totalIncomePeriod = cashFlow.reduce((s, c) => s + c.income, 0);
  const totalExpensePeriod = cashFlow.reduce((s, c) => s + c.expenses, 0);

  const avgMonthlyIncome = cashFlow.length > 0 ? totalIncomePeriod / activeMonths : 0;
  const avgMonthlyExpense = cashFlow.length > 0 ? totalExpensePeriod / activeMonths : 0;
  const avgDailyExpense = avgMonthlyExpense / 30;

  let monthOverMonthIncomeDelta: number | null = null;
  let monthOverMonthExpenseDelta: number | null = null;

  if (cashFlow.length >= 2) {
    const prev = cashFlow[cashFlow.length - 2];
    const curr = cashFlow[cashFlow.length - 1];
    if (prev.income > 0) {
      monthOverMonthIncomeDelta = ((curr.income - prev.income) / prev.income) * 100;
    }
    if (prev.expenses > 0) {
      monthOverMonthExpenseDelta = ((curr.expenses - prev.expenses) / prev.expenses) * 100;
    }
  }

  const classTotals = new Map<AssetClass, number>();
  for (const asset of investments) {
    classTotals.set(
      asset.assetClass,
      (classTotals.get(asset.assetClass) ?? 0) + Math.max(0, asset.currentAmount)
    );
  }
  const totalInv = Math.max(0, summary.totalInvested);
  const assetDistribution = Array.from(classTotals.entries())
    .map(([assetClass, value]) => ({
      assetClass,
      value,
      share: totalInv > 0 ? (value / totalInv) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const positiveCash = Math.max(0, summary.availableBalance);
  const positiveSavings = Math.max(0, summary.totalSaved);
  const positiveInvest = Math.max(0, summary.totalInvested);
  const totalPositiveWealth = positiveCash + positiveSavings + positiveInvest;

  const wealthDistribution = [
    {
      key: 'cash',
      label: 'Saldo Disponível',
      value: positiveCash,
      share: totalPositiveWealth > 0 ? (positiveCash / totalPositiveWealth) * 100 : 0,
    },
    {
      key: 'savings',
      label: 'Reservas & Metas',
      value: positiveSavings,
      share: totalPositiveWealth > 0 ? (positiveSavings / totalPositiveWealth) * 100 : 0,
    },
    {
      key: 'investments',
      label: 'Investimentos',
      value: positiveInvest,
      share: totalPositiveWealth > 0 ? (positiveInvest / totalPositiveWealth) * 100 : 0,
    },
  ];

  // Projection 12 months based strictly on historical average monthly net savings
  const avgMonthlyNet = avgMonthlyIncome - avgMonthlyExpense;
  const projection12Months = Array.from({ length: 13 }, (_, idx) => ({
    monthIndex: idx,
    label: idx === 0 ? 'Atual' : `+${idx}m`,
    projectedNetWorth: summary.totalNetWorth + avgMonthlyNet * idx,
  }));

  return {
    savingsRate: summary.savingsRate,
    avgMonthlyIncome,
    avgMonthlyExpense,
    avgDailyExpense,
    monthOverMonthIncomeDelta,
    monthOverMonthExpenseDelta,
    recurringMonthlyExpenses: summary.recurringMonthlyExpenses,
    assetDistribution,
    wealthDistribution,
    projection12Months,
  };
}

export interface CompoundSchedulePoint {
  month: number;
  totalInvested: number;
  totalBalance: number;
  interestEarned: number;
}

export interface CompoundSimulationResult {
  finalAmount: number;
  totalInvested: number;
  totalInterest: number;
  schedule: CompoundSchedulePoint[];
}

export function simulateCompoundInterest(params: {
  initialCapital: number;
  monthlyContribution: number;
  annualRatePercent: number;
  months: number;
}): CompoundSimulationResult {
  const initial = Math.max(0, params.initialCapital);
  const contribution = Math.max(0, params.monthlyContribution);
  const months = Math.max(1, Math.min(600, Math.round(params.months)));
  const monthlyRate = Math.pow(1 + Math.max(0, params.annualRatePercent) / 100, 1 / 12) - 1;

  let balance = initial;
  let invested = initial;
  const schedule: CompoundSchedulePoint[] = [
    {
      month: 0,
      totalInvested: initial,
      totalBalance: initial,
      interestEarned: 0,
    },
  ];

  for (let m = 1; m <= months; m++) {
    balance = balance * (1 + monthlyRate) + contribution;
    invested += contribution;
    schedule.push({
      month: m,
      totalInvested: invested,
      totalBalance: balance,
      interestEarned: balance - invested,
    });
  }

  return {
    finalAmount: balance,
    totalInvested: invested,
    totalInterest: balance - invested,
    schedule,
  };
}

export function simulateGoalTarget(params: {
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  annualRatePercent: number;
}): {
  monthsRequired: number | null;
  yearsRequired: number | null;
  schedule: CompoundSchedulePoint[];
} {
  const target = Math.max(0, params.targetAmount);
  const current = Math.max(0, params.currentAmount);
  const contribution = Math.max(0, params.monthlyContribution);
  const monthlyRate = Math.pow(1 + Math.max(0, params.annualRatePercent) / 100, 1 / 12) - 1;

  if (current >= target) {
    return {
      monthsRequired: 0,
      yearsRequired: 0,
      schedule: [{ month: 0, totalInvested: current, totalBalance: current, interestEarned: 0 }],
    };
  }

  if (contribution === 0 && monthlyRate === 0) {
    return { monthsRequired: null, yearsRequired: null, schedule: [] };
  }

  let balance = current;
  let invested = current;
  const schedule: CompoundSchedulePoint[] = [
    { month: 0, totalInvested: current, totalBalance: current, interestEarned: 0 },
  ];

  for (let m = 1; m <= 600; m++) {
    balance = balance * (1 + monthlyRate) + contribution;
    invested += contribution;
    schedule.push({
      month: m,
      totalInvested: invested,
      totalBalance: balance,
      interestEarned: balance - invested,
    });
    if (balance >= target) {
      return {
        monthsRequired: m,
        yearsRequired: Number((m / 12).toFixed(1)),
        schedule,
      };
    }
  }

  return { monthsRequired: null, yearsRequired: null, schedule };
}

export function calculateProfitability(params: {
  investedAmount: number;
  finalAmount: number;
  months: number;
}): {
  nominalGain: number;
  totalReturnPercent: number;
  monthlyEquivalentPercent: number;
  annualizedCagrPercent: number;
} {
  const invested = Math.max(0, params.investedAmount);
  const finalVal = Math.max(0, params.finalAmount);
  const months = Math.max(1, params.months);

  const nominalGain = finalVal - invested;
  const totalReturnPercent = invested > 0 ? (nominalGain / invested) * 100 : 0;

  if (invested <= 0 || finalVal <= 0) {
    return {
      nominalGain,
      totalReturnPercent,
      monthlyEquivalentPercent: 0,
      annualizedCagrPercent: 0,
    };
  }

  const ratio = finalVal / invested;
  const monthlyEquivalentPercent = (Math.pow(ratio, 1 / months) - 1) * 100;
  const annualizedCagrPercent = (Math.pow(ratio, 12 / months) - 1) * 100;

  return {
    nominalGain,
    totalReturnPercent,
    monthlyEquivalentPercent,
    annualizedCagrPercent,
  };
}

export function transactionsToCSV(transactions: Transaction[]): string {
  const escape = (val: string | number | boolean) => {
    const str = String(val ?? '');
    if (str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Recorrente', 'Frequência', 'Observações'];
  const rows = transactions.map((tx) =>
    [
      escape(tx.date),
      escape(tx.type === 'income' ? 'Receita' : 'Despesa'),
      escape(tx.description),
      escape(tx.categoryName),
      escape(tx.amount.toFixed(2).replace('.', ',')),
      escape(tx.isRecurring ? 'Sim' : 'Não'),
      escape(tx.recurrenceFrequency),
      escape(tx.notes),
    ].join(';')
  );

  return '\uFEFF' + [headers.join(';'), ...rows].join('\n');
}

export function parseBackupJSON(raw: string): FinanceBackupPayload | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray(parsed.transactions) || !Array.isArray(parsed.savingsGoals)) {
      return null;
    }
    return parsed as FinanceBackupPayload;
  } catch {
    return null;
  }
}
