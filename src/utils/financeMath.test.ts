import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCashFlowSeries,
  buildNetWorthEvolution,
  calculateAnalyticsReport,
  calculateDashboardSummary,
  calculateInvestmentMetrics,
  calculateProfitability,
  estimateGoalCompletion,
  parseBackupJSON,
  simulateCompoundInterest,
  simulateGoalTarget,
  transactionsToCSV,
} from './financeMath';
import { InvestmentAsset, SavingsDeposit, SavingsGoal, Transaction } from '../types/finance';

const sampleTx: Transaction[] = [
  {
    id: 't1',
    userId: 'u1',
    type: 'income',
    amount: 5000,
    description: 'Salário',
    date: '2026-10-05',
    categoryId: 'c1',
    categoryName: 'Salário',
    isRecurring: true,
    recurrenceFrequency: 'monthly',
    notes: '',
  },
  {
    id: 't2',
    userId: 'u1',
    type: 'expense',
    amount: 1500,
    description: 'Aluguel',
    date: '2026-10-10',
    categoryId: 'c2',
    categoryName: 'Moradia',
    isRecurring: true,
    recurrenceFrequency: 'monthly',
    notes: '',
  },
  {
    id: 't3',
    userId: 'u1',
    type: 'income',
    amount: 6000,
    description: 'Salário',
    date: '2026-11-05',
    categoryId: 'c1',
    categoryName: 'Salário',
    isRecurring: true,
    recurrenceFrequency: 'monthly',
    notes: '',
  },
  {
    id: 't4',
    userId: 'u1',
    type: 'expense',
    amount: 2000,
    description: 'Despesas Gerais',
    date: '2026-11-12',
    categoryId: 'c3',
    categoryName: 'Alimentação',
    isRecurring: false,
    recurrenceFrequency: 'none',
    notes: '',
  },
];

const sampleGoals: SavingsGoal[] = [
  {
    id: 'g1',
    userId: 'u1',
    name: 'Reserva',
    targetAmount: 20000,
    currentAmount: 5000,
    targetDate: '2027-12-31',
    notes: '',
  },
];

const sampleDeposits: SavingsDeposit[] = [
  { id: 'd1', userId: 'u1', goalId: 'g1', amount: 2500, date: '2026-10-15', note: '' },
  { id: 'd2', userId: 'u1', goalId: 'g1', amount: 2500, date: '2026-11-15', note: '' },
];

const sampleInvestments: InvestmentAsset[] = [
  {
    id: 'i1',
    userId: 'u1',
    name: 'Tesouro Selic',
    ticker: 'SELIC29',
    assetClass: 'fixed_income',
    quantity: 10,
    investedAmount: 10000,
    currentAmount: 11200,
    notes: '',
  },
];

test('calculateDashboardSummary computes net worth, balances, and monthly totals accurately', () => {
  const summary = calculateDashboardSummary(sampleTx, sampleGoals, sampleInvestments, '2026-11');
  // All income: 11000, All expenses: 3500 => availableBalance: 7500
  assert.equal(summary.availableBalance, 7500);
  assert.equal(summary.totalSaved, 5000);
  assert.equal(summary.totalInvested, 11200);
  assert.equal(summary.totalNetWorth, 23700);
  assert.equal(summary.monthlyIncome, 6000);
  assert.equal(summary.monthlyExpenses, 2000);
  assert.equal(summary.monthlyNet, 4000);
  assert.ok(Math.abs(summary.savingsRate - 66.6667) < 0.01);
});

test('calculateDashboardSummary returns zeros cleanly for empty data', () => {
  const summary = calculateDashboardSummary([], [], [], '2026-11');
  assert.equal(summary.totalNetWorth, 0);
  assert.equal(summary.savingsRate, 0);
  assert.equal(summary.monthlyNet, 0);
});

test('buildCashFlowSeries sorts chronologically and aggregates monthly net', () => {
  const series = buildCashFlowSeries(sampleTx, 6);
  assert.equal(series.length, 2);
  assert.equal(series[0].month, '2026-10');
  assert.equal(series[0].net, 3500);
  assert.equal(series[1].month, '2026-11');
  assert.equal(series[1].net, 4000);
});

test('estimateGoalCompletion computes percentage and months from deposit pace', () => {
  const est = estimateGoalCompletion(sampleGoals[0], sampleDeposits);
  assert.equal(est.percent, 25);
  assert.equal(est.remainingAmount, 15000);
  assert.equal(est.avgMonthlyDeposit, 2500);
  assert.equal(est.estimatedMonths, 6);
  assert.equal(est.status, 'on_track');
});

test('calculateInvestmentMetrics computes return amount and percentage', () => {
  const metrics = calculateInvestmentMetrics(sampleInvestments[0]);
  assert.equal(metrics.returnAmount, 1200);
  assert.equal(metrics.returnPercent, 12);
  assert.equal(metrics.unitCost, 1000);
  assert.equal(metrics.currentUnitPrice, 1120);
});

test('simulateCompoundInterest matches compound growth math', () => {
  const sim = simulateCompoundInterest({
    initialCapital: 1000,
    monthlyContribution: 500,
    annualRatePercent: 12,
    months: 12,
  });
  assert.equal(sim.totalInvested, 7000);
  assert.ok(sim.finalAmount > 7400);
  assert.equal(sim.schedule.length, 13);
});

test('simulateGoalTarget finds required months to reach target', () => {
  const res = simulateGoalTarget({
    targetAmount: 10000,
    currentAmount: 4000,
    monthlyContribution: 1000,
    annualRatePercent: 0,
  });
  assert.equal(res.monthsRequired, 6);
});

test('calculateProfitability computes total return and annualized CAGR', () => {
  const prof = calculateProfitability({
    investedAmount: 10000,
    finalAmount: 12100,
    months: 24,
  });
  assert.equal(prof.nominalGain, 2100);
  assert.ok(Math.abs(prof.totalReturnPercent - 21) < 0.001);
  assert.ok(Math.abs(prof.annualizedCagrPercent - 10) < 0.001);
});

test('buildNetWorthEvolution and calculateAnalyticsReport handle multi-period history', () => {
  const evo = buildNetWorthEvolution(
    sampleTx,
    sampleDeposits,
    sampleGoals,
    sampleInvestments,
    [],
    'monthly'
  );
  assert.equal(evo.length, 2);
  assert.equal(evo[1].totalWealth, 23700);

  const report = calculateAnalyticsReport(sampleTx, sampleGoals, sampleInvestments, '2026-11');
  assert.equal(report.assetDistribution.length, 1);
  assert.equal(report.projection12Months.length, 13);
});

test('transactionsToCSV and parseBackupJSON serialize and validate safely', () => {
  const csv = transactionsToCSV(sampleTx);
  assert.ok(csv.includes('Salário'));
  assert.ok(csv.includes('Aluguel'));

  assert.equal(parseBackupJSON('not json'), null);
  assert.equal(parseBackupJSON('{"foo": 1}'), null);
  const valid = parseBackupJSON(JSON.stringify({ transactions: sampleTx, savingsGoals: sampleGoals }));
  assert.ok(valid !== null);
  assert.equal(valid!.transactions.length, 4);
});
