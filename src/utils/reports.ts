import {
  CurrencyCode,
  InvestmentAsset,
  SavingsGoal,
  Transaction,
} from '../types/finance';
import {
  ASSET_CLASS_LABELS,
  formatCurrency,
  formatDateBR,
  formatPercent,
} from './formatters';
import { calculateDashboardSummary, calculateInvestmentMetrics } from './financeMath';

export interface CustomReportFilter {
  startDate: string;
  endDate: string;
  categoryIds: string[]; // empty means all categories
  includeIncome: boolean;
  includeExpenses: boolean;
  includeInvestments: boolean;
  includeNetWorth: boolean;
}

export interface GeneratedFinancialReport {
  generatedAt: string;
  filter: CustomReportFilter;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    periodNet: number;
    totalInvested: number;
    investmentsCurrentValue: number;
    investmentsReturn: number;
    totalNetWorth: number;
    availableBalance: number;
    totalSaved: number;
  };
  transactions: Transaction[];
  investments: InvestmentAsset[];
  savingsGoals: SavingsGoal[];
}

export function buildCustomReport(
  params: {
    transactions: Transaction[];
    savingsGoals: SavingsGoal[];
    investments: InvestmentAsset[];
  },
  filter: CustomReportFilter
): GeneratedFinancialReport {
  const filteredTransactions = params.transactions
    .filter((tx) => {
      if (filter.startDate && tx.date < filter.startDate) return false;
      if (filter.endDate && tx.date > filter.endDate) return false;
      if (tx.type === 'income' && !filter.includeIncome) return false;
      if (tx.type === 'expense' && !filter.includeExpenses) return false;
      if (
        filter.categoryIds.length > 0 &&
        !filter.categoryIds.includes(tx.categoryId) &&
        !filter.categoryIds.includes(tx.categoryName)
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  let totalIncome = 0;
  let totalExpenses = 0;
  for (const tx of filteredTransactions) {
    if (tx.type === 'income') totalIncome += tx.amount;
    else totalExpenses += tx.amount;
  }

  const includedInvestments = filter.includeInvestments ? params.investments : [];
  const totalInvested = includedInvestments.reduce((s, a) => s + a.investedAmount, 0);
  const investmentsCurrentValue = includedInvestments.reduce((s, a) => s + a.currentAmount, 0);
  const investmentsReturn = investmentsCurrentValue - totalInvested;

  const globalSummary = calculateDashboardSummary(
    params.transactions,
    params.savingsGoals,
    params.investments,
    new Date().toISOString().slice(0, 7)
  );

  return {
    generatedAt: new Date().toISOString(),
    filter,
    summary: {
      totalIncome,
      totalExpenses,
      periodNet: totalIncome - totalExpenses,
      totalInvested,
      investmentsCurrentValue,
      investmentsReturn,
      totalNetWorth: globalSummary.totalNetWorth,
      availableBalance: globalSummary.availableBalance,
      totalSaved: globalSummary.totalSaved,
    },
    transactions: filteredTransactions,
    investments: includedInvestments,
    savingsGoals: filter.includeNetWorth ? params.savingsGoals : [],
  };
}

export function customReportToCSV(
  report: GeneratedFinancialReport,
  currency: CurrencyCode
): string {
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return s.includes(';') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const lines: string[] = [];
  lines.push('FINANCE OS — Relatório Financeiro Personalizado');
  lines.push(
    `Período;${esc(report.filter.startDate || 'Início')} até ${esc(report.filter.endDate || 'Hoje')}`
  );
  lines.push('');

  lines.push('RESUMO');
  if (report.filter.includeIncome) {
    lines.push(`Total de Receitas;${esc(formatCurrency(report.summary.totalIncome, currency))}`);
  }
  if (report.filter.includeExpenses) {
    lines.push(`Total de Despesas;${esc(formatCurrency(report.summary.totalExpenses, currency))}`);
  }
  if (report.filter.includeIncome || report.filter.includeExpenses) {
    lines.push(`Saldo do Período;${esc(formatCurrency(report.summary.periodNet, currency))}`);
  }
  if (report.filter.includeInvestments) {
    lines.push(
      `Investimentos (Valor Atual);${esc(formatCurrency(report.summary.investmentsCurrentValue, currency))}`
    );
    lines.push(
      `Retorno de Investimentos;${esc(formatCurrency(report.summary.investmentsReturn, currency))}`
    );
  }
  if (report.filter.includeNetWorth) {
    lines.push(`Patrimônio Total;${esc(formatCurrency(report.summary.totalNetWorth, currency))}`);
    lines.push(`Saldo Disponível;${esc(formatCurrency(report.summary.availableBalance, currency))}`);
    lines.push(`Total Economizado;${esc(formatCurrency(report.summary.totalSaved, currency))}`);
  }

  if (report.transactions.length > 0) {
    lines.push('');
    lines.push('MOVIMENTAÇÕES');
    lines.push('Data;Tipo;Descrição;Categoria;Valor');
    for (const tx of report.transactions) {
      lines.push(
        [
          esc(formatDateBR(tx.date)),
          esc(tx.type === 'income' ? 'Receita' : 'Despesa'),
          esc(tx.description),
          esc(tx.categoryName),
          esc(formatCurrency(tx.amount, currency)),
        ].join(';')
      );
    }
  }

  if (report.investments.length > 0) {
    lines.push('');
    lines.push('INVESTIMENTOS');
    lines.push('Ativo;Ticker;Classe;Quantidade;Valor Investido;Valor Atual;Rentabilidade');
    for (const inv of report.investments) {
      const m = calculateInvestmentMetrics(inv);
      lines.push(
        [
          esc(inv.name),
          esc(inv.ticker),
          esc(ASSET_CLASS_LABELS[inv.assetClass]),
          esc(inv.quantity),
          esc(formatCurrency(inv.investedAmount, currency)),
          esc(formatCurrency(inv.currentAmount, currency)),
          esc(formatPercent(m.returnPercent, true)),
        ].join(';')
      );
    }
  }

  return '\uFEFF' + lines.join('\n');
}
