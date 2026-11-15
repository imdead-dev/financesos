import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCustomReport, customReportToCSV } from './reports';
import { customReportToPDF } from './pdfExport';
import { InvestmentAsset, SavingsGoal, Transaction } from '../types/finance';

const txList: Transaction[] = [
  {
    id: 't1',
    userId: 'u1',
    type: 'income',
    amount: 7000,
    description: 'Salário',
    date: '2026-11-05',
    categoryId: 'cat1',
    categoryName: 'Salário',
    isRecurring: true,
    recurrenceFrequency: 'monthly',
    notes: '',
  },
  {
    id: 't2',
    userId: 'u1',
    type: 'expense',
    amount: 1200,
    description: 'Aluguel',
    date: '2026-11-10',
    categoryId: 'cat2',
    categoryName: 'Moradia',
    isRecurring: true,
    recurrenceFrequency: 'monthly',
    notes: '',
  },
  {
    id: 't3',
    userId: 'u1',
    type: 'expense',
    amount: 400,
    description: 'Supermercado',
    date: '2026-10-15',
    categoryId: 'cat3',
    categoryName: 'Alimentação',
    isRecurring: false,
    recurrenceFrequency: 'none',
    notes: '',
  },
];

const goals: SavingsGoal[] = [
  {
    id: 'g1',
    userId: 'u1',
    name: 'Reserva',
    targetAmount: 10000,
    currentAmount: 4000,
    targetDate: '',
    notes: '',
  },
];

const assets: InvestmentAsset[] = [
  {
    id: 'i1',
    userId: 'u1',
    name: 'Tesouro IPCA',
    ticker: 'IPCA35',
    assetClass: 'fixed_income',
    quantity: 5,
    investedAmount: 5000,
    currentAmount: 5600,
    notes: '',
  },
];

test('buildCustomReport filters by date range, categories, and data types', () => {
  const report = buildCustomReport(
    { transactions: txList, savingsGoals: goals, investments: assets },
    {
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      categoryIds: [],
      includeIncome: true,
      includeExpenses: true,
      includeInvestments: true,
      includeNetWorth: true,
    }
  );
  assert.equal(report.transactions.length, 2);
  assert.equal(report.summary.totalIncome, 7000);
  assert.equal(report.summary.totalExpenses, 1200);
  assert.equal(report.summary.periodNet, 5800);
  assert.equal(report.summary.investmentsCurrentValue, 5600);

  const csv = customReportToCSV(report, 'BRL');
  assert.ok(csv.includes('Salário'));
  assert.ok(csv.includes('Tesouro IPCA'));

  const pdfBytes = customReportToPDF(report, 'BRL');
  const pdfText = new TextDecoder('latin1').decode(pdfBytes);
  assert.ok(pdfText.startsWith('%PDF-1.4'));
  assert.ok(pdfText.endsWith('%%EOF'));
  assert.ok(pdfText.includes('FINANCE OS'));
  assert.ok(pdfText.includes('Tesouro IPCA'));
});
