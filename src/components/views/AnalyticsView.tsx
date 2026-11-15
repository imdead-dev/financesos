import React, { useMemo, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { AppView } from '../../types/finance';
import {
  buildCashFlowSeries,
  buildNetWorthEvolution,
  calculateAnalyticsReport,
  calculateDashboardSummary,
  transactionsToCSV,
} from '../../utils/financeMath';
import {
  ASSET_CLASS_LABELS,
  formatCurrency,
  formatMonthLabel,
  formatPercent,
  getCurrentMonthKey,
} from '../../utils/formatters';
import { SurfaceCard } from '../ui/SurfaceCard';
import { EmptyState } from '../ui/EmptyState';
import {
  AreaTrendChart,
  BarComparisonChart,
  DonutBreakdownChart,
} from '../charts/FinanceCharts';

interface AnalyticsViewProps {
  onNavigate: (view: AppView) => void;
}

export function AnalyticsView({ onNavigate }: AnalyticsViewProps) {
  const {
    transactions,
    savingsGoals,
    savingsDeposits,
    investments,
    investmentContributions,
    preferences,
    palette,
  } = useFinance();

  const [granularity, setGranularity] = useState<'weekly' | 'monthly' | 'annual'>('monthly');
  const currentMonth = getCurrentMonthKey();

  const summary = useMemo(
    () => calculateDashboardSummary(transactions, savingsGoals, investments, currentMonth),
    [transactions, savingsGoals, investments, currentMonth]
  );

  const report = useMemo(
    () => calculateAnalyticsReport(transactions, savingsGoals, investments, currentMonth),
    [transactions, savingsGoals, investments, currentMonth]
  );

  const wealthEvolution = useMemo(
    () =>
      buildNetWorthEvolution(
        transactions,
        savingsDeposits,
        savingsGoals,
        investments,
        investmentContributions,
        granularity
      ).map((p) => ({
        label: /^\d{4}-\d{2}$/.test(p.label) ? formatMonthLabel(p.label) : p.label,
        value: p.totalWealth,
      })),
    [
      transactions,
      savingsDeposits,
      savingsGoals,
      investments,
      investmentContributions,
      granularity,
    ]
  );

  const investmentEvolution = useMemo(
    () =>
      buildNetWorthEvolution(
        transactions,
        savingsDeposits,
        savingsGoals,
        investments,
        investmentContributions,
        'monthly'
      ).map((p) => ({
        label: /^\d{4}-\d{2}$/.test(p.label) ? formatMonthLabel(p.label) : p.label,
        value: p.investmentsValue,
      })),
    [transactions, savingsDeposits, savingsGoals, investments, investmentContributions]
  );

  const cashFlow = useMemo(
    () =>
      buildCashFlowSeries(transactions, 12).map((p) => ({
        label: formatMonthLabel(p.month),
        income: p.income,
        expense: p.expenses,
      })),
    [transactions]
  );

  const projectionSeries = useMemo(
    () =>
      report.projection12Months.map((p) => ({
        label: p.label,
        value: p.projectedNetWorth,
      })),
    [report]
  );

  const handleExportReportCSV = () => {
    const csv = transactionsToCSV(transactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-os-relatorio-${currentMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasData =
    transactions.length > 0 || savingsGoals.length > 0 || investments.length > 0;

  if (!hasData) {
    return (
      <SurfaceCard>
        <EmptyState
          title="Central Analítica aguardando dados"
          description="Registre suas receitas, despesas, metas ou investimentos para desbloquear gráficos semanais, mensais e anuais, taxa de economia e projeções automáticas."
          actionLabel="Ir para Receitas & Despesas"
          onAction={() => onNavigate('transactions')}
          icon={<BarChart3 className="w-6 h-6" />}
        />
      </SurfaceCard>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Analytical KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <SurfaceCard padding="compact">
          <p className="text-xs" style={{ color: palette.textSecondary }}>
            Taxa de Economia (Mês)
          </p>
          <p
            className="text-xl font-bold font-num mt-1"
            style={{
              color:
                report.savingsRate >= 0 ? palette.positiveColor : palette.negativeColor,
            }}
          >
            {formatPercent(report.savingsRate)}
          </p>
          <p className="text-[11px] mt-1" style={{ color: palette.textSecondary }}>
            Parcela retida da receita mensal
          </p>
        </SurfaceCard>

        <SurfaceCard padding="compact">
          <p className="text-xs" style={{ color: palette.textSecondary }}>
            Média Mensal de Gastos
          </p>
          <p className="text-xl font-bold font-num mt-1">
            {formatCurrency(report.avgMonthlyExpense, preferences.currency)}
          </p>
          <p className="text-[11px] mt-1 font-num" style={{ color: palette.textSecondary }}>
            ~{formatCurrency(report.avgDailyExpense, preferences.currency)} / dia
          </p>
        </SurfaceCard>

        <SurfaceCard padding="compact">
          <p className="text-xs" style={{ color: palette.textSecondary }}>
            Comprometimento Recorrente
          </p>
          <p className="text-xl font-bold font-num mt-1">
            {formatCurrency(report.recurringMonthlyExpenses, preferences.currency)}
          </p>
          <p className="text-[11px] mt-1" style={{ color: palette.textSecondary }}>
            Despesas fixas estimadas / mês
          </p>
        </SurfaceCard>

        <SurfaceCard padding="compact">
          <p className="text-xs" style={{ color: palette.textSecondary }}>
            Variação de Despesas (M/M)
          </p>
          <p
            className="text-xl font-bold font-num mt-1"
            style={{
              color:
                report.monthOverMonthExpenseDelta === null
                  ? palette.textPrimary
                  : report.monthOverMonthExpenseDelta <= 0
                    ? palette.positiveColor
                    : palette.negativeColor,
            }}
          >
            {report.monthOverMonthExpenseDelta === null
              ? '—'
              : formatPercent(report.monthOverMonthExpenseDelta, true)}
          </p>
          <p className="text-[11px] mt-1" style={{ color: palette.textSecondary }}>
            Comparado ao mês anterior
          </p>
        </SurfaceCard>
      </div>

      {/* Net Worth Evolution with Granularity Toggle */}
      <SurfaceCard>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold font-display">
              Evolução Patrimonial
            </h2>
            <p className="text-xs mt-0.5" style={{ color: palette.textSecondary }}>
              Histórico consolidado por período selecionado
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {(
              [
                ['weekly', 'Semanal'],
                ['monthly', 'Mensal'],
                ['annual', 'Anual'],
              ] as Array<['weekly' | 'monthly' | 'annual', string]>
            ).map(([g, label]) => (
              <button
                key={g}
                type="button"
                onClick={() => setGranularity(g)}
                className="px-3 py-1.5 text-xs font-medium border whitespace-nowrap min-h-[36px]"
                style={{
                  borderRadius: palette.radiusSmPx,
                  borderColor: granularity === g ? palette.accentColor : palette.borderColor,
                  backgroundColor:
                    granularity === g ? palette.surfaceMutedColor : 'transparent',
                  color: granularity === g ? palette.accentColor : palette.textSecondary,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <AreaTrendChart
          data={wealthEvolution}
          primaryLabel="Patrimônio Total"
          height={250}
        />
      </SurfaceCard>

      {/* Month Comparison & Wealth Distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <SurfaceCard className="xl:col-span-7">
          <h2 className="text-sm font-semibold font-display mb-1">
            Comparação Entre Meses
          </h2>
          <p className="text-xs mb-4" style={{ color: palette.textSecondary }}>
            Receitas versus despesas registradas mês a mês
          </p>
          <BarComparisonChart data={cashFlow} height={240} />
        </SurfaceCard>

        <SurfaceCard className="xl:col-span-5">
          <h2 className="text-sm font-semibold font-display mb-1">
            Distribuição do Patrimônio
          </h2>
          <p className="text-xs mb-4" style={{ color: palette.textSecondary }}>
            Alocação atual entre liquidez, reservas e carteira
          </p>
          <DonutBreakdownChart segments={report.wealthDistribution} />
        </SurfaceCard>
      </div>

      {/* Investment Evolution & 12-Month Projection */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <SurfaceCard className="xl:col-span-6">
          <h2 className="text-sm font-semibold font-display mb-1">
            Evolução dos Investimentos
          </h2>
          <p className="text-xs mb-4" style={{ color: palette.textSecondary }}>
            Série histórica da carteira manualmente acompanhada
          </p>
          <AreaTrendChart
            data={investmentEvolution}
            primaryLabel="Investimentos"
            colorIndex={1}
            height={210}
            emptyText="Cadastre ativos em Investimentos para acompanhar esta curva."
          />
        </SurfaceCard>

        <SurfaceCard className="xl:col-span-6">
          <h2 className="text-sm font-semibold font-display mb-1">
            Projeção de 12 Meses (Base Histórica)
          </h2>
          <p className="text-xs mb-4" style={{ color: palette.textSecondary }}>
            Estimativa linear usando seu superávit médio mensal registrado (
            {formatCurrency(
              report.avgMonthlyIncome - report.avgMonthlyExpense,
              preferences.currency
            )}
            /mês)
          </p>
          <AreaTrendChart
            data={projectionSeries}
            primaryLabel="Patrimônio Projetado"
            colorIndex={2}
            height={210}
          />
        </SurfaceCard>
      </div>

      {/* Financial Report Table */}
      <SurfaceCard>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold font-display">
              Relatório Financeiro Consolidado
            </h2>
            <p className="text-xs mt-0.5" style={{ color: palette.textSecondary }}>
              Resumo executivo derivado exclusivamente dos seus registros reais
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="fos-btn-primary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap min-h-[38px]"
            >
              <span>Relatório Personalizado (CSV / PDF)</span>
            </button>
            <button
              type="button"
              onClick={handleExportReportCSV}
              className="fos-btn-secondary px-3.5 py-2 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap min-h-[38px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b" style={{ borderColor: palette.borderColor }}>
              <span style={{ color: palette.textSecondary }}>Patrimônio Total Atual</span>
              <span className="font-num font-semibold">
                {formatCurrency(summary.totalNetWorth, preferences.currency)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b" style={{ borderColor: palette.borderColor }}>
              <span style={{ color: palette.textSecondary }}>Média Mensal de Receitas</span>
              <span className="font-num font-semibold" style={{ color: palette.positiveColor }}>
                {formatCurrency(report.avgMonthlyIncome, preferences.currency)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b" style={{ borderColor: palette.borderColor }}>
              <span style={{ color: palette.textSecondary }}>Média Mensal de Despesas</span>
              <span className="font-num font-semibold" style={{ color: palette.negativeColor }}>
                {formatCurrency(report.avgMonthlyExpense, preferences.currency)}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span style={{ color: palette.textSecondary }}>Projeção em 12 Meses</span>
              <span className="font-num font-semibold" style={{ color: palette.accentColor }}>
                {formatCurrency(
                  report.projection12Months[report.projection12Months.length - 1]
                    ?.projectedNetWorth ?? 0,
                  preferences.currency
                )}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-semibold mb-1" style={{ color: palette.textSecondary }}>
              Composição da Carteira de Investimentos
            </p>
            {report.assetDistribution.length === 0 ? (
              <p style={{ color: palette.textSecondary }}>
                Nenhum ativo cadastrado na carteira.
              </p>
            ) : (
              report.assetDistribution.map((row) => (
                <div
                  key={row.assetClass}
                  className="flex justify-between py-2 border-b last:border-b-0"
                  style={{ borderColor: palette.borderColor }}
                >
                  <span>{ASSET_CLASS_LABELS[row.assetClass]}</span>
                  <span className="font-num">
                    {formatCurrency(row.value, preferences.currency)} ({formatPercent(row.share)})
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
