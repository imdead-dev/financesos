import React, { useMemo } from 'react';
import { ArrowRight, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { AppView } from '../../types/finance';
import {
  buildCashFlowSeries,
  buildNetWorthEvolution,
  calculateDashboardSummary,
  estimateGoalCompletion,
} from '../../utils/financeMath';
import {
  formatCurrency,
  formatDateBR,
  formatMonthLabel,
  formatPercent,
  getCurrentMonthKey,
  RECURRENCE_LABELS,
} from '../../utils/formatters';
import { SurfaceCard } from '../ui/SurfaceCard';
import { EmptyState } from '../ui/EmptyState';
import { AreaTrendChart, BarComparisonChart } from '../charts/FinanceCharts';

interface DashboardViewProps {
  onNavigate: (view: AppView) => void;
  onNewTransaction: () => void;
}

export function DashboardView({ onNavigate, onNewTransaction }: DashboardViewProps) {
  const {
    transactions,
    savingsGoals,
    savingsDeposits,
    investments,
    investmentContributions,
    preferences,
    palette,
  } = useFinance();

  const currentMonth = getCurrentMonthKey();

  const summary = useMemo(
    () => calculateDashboardSummary(transactions, savingsGoals, investments, currentMonth),
    [transactions, savingsGoals, investments, currentMonth]
  );

  const cashFlowSeries = useMemo(
    () =>
      buildCashFlowSeries(transactions, 6).map((p) => ({
        label: formatMonthLabel(p.month),
        income: p.income,
        expense: p.expenses,
      })),
    [transactions]
  );

  const wealthSeries = useMemo(() => {
    const monthly = buildNetWorthEvolution(
      transactions,
      savingsDeposits,
      savingsGoals,
      investments,
      investmentContributions,
      'monthly'
    );
    const chosen =
      monthly.length <= 1
        ? buildNetWorthEvolution(
            transactions,
            savingsDeposits,
            savingsGoals,
            investments,
            investmentContributions,
            'daily'
          )
        : monthly;

    return chosen.map((p) => ({
      label: /^\d{4}-\d{2}$/.test(p.label)
        ? formatMonthLabel(p.label)
        : /^\d{4}-\d{2}-\d{2}$/.test(p.label)
          ? formatDateBR(p.label).slice(0, 5)
          : p.label,
      value: p.totalWealth,
    }));
  }, [transactions, savingsDeposits, savingsGoals, investments, investmentContributions]);

  const recentTransactions = useMemo(() => transactions.slice(0, 6), [transactions]);
  const isEmpty =
    transactions.length === 0 && savingsGoals.length === 0 && investments.length === 0;

  const isTerminal = palette.preset.headingStyle === 'terminal';

  return (
    <div className="space-y-5">
      {/* KPI Strip: Primary Net Worth & Balances */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <SurfaceCard>
          <p
            className={`text-[11px] sm:text-xs font-medium ${isTerminal ? 'uppercase tracking-wider' : ''}`}
            style={{ color: palette.textSecondary }}
          >
            Patrimônio Total
          </p>
          <p
            data-testid="kpi-net-worth"
            className="text-lg sm:text-2xl font-bold font-num mt-1.5 truncate"
            style={{ color: palette.textPrimary }}
          >
            {formatCurrency(summary.totalNetWorth, preferences.currency)}
          </p>
          <p className="text-[11px] mt-1.5 hidden sm:block" style={{ color: palette.textSecondary }}>
            Saldo + Reservas + Investimentos
          </p>
        </SurfaceCard>

        <SurfaceCard>
          <p
            className={`text-[11px] sm:text-xs font-medium ${isTerminal ? 'uppercase tracking-wider' : ''}`}
            style={{ color: palette.textSecondary }}
          >
            Saldo Disponível
          </p>
          <p
            data-testid="kpi-available-balance"
            className="text-lg sm:text-2xl font-bold font-num mt-1.5 truncate"
            style={{
              color:
                summary.availableBalance < 0 ? palette.negativeColor : palette.textPrimary,
            }}
          >
            {formatCurrency(summary.availableBalance, preferences.currency)}
          </p>
          <p className="text-[11px] mt-1.5 hidden sm:block" style={{ color: palette.textSecondary }}>
            Receitas menos despesas acumuladas
          </p>
        </SurfaceCard>

        <SurfaceCard>
          <p
            className={`text-[11px] sm:text-xs font-medium ${isTerminal ? 'uppercase tracking-wider' : ''}`}
            style={{ color: palette.textSecondary }}
          >
            Total Economizado
          </p>
          <p
            data-testid="kpi-total-saved"
            className="text-lg sm:text-2xl font-bold font-num mt-1.5 truncate"
            style={{ color: palette.textPrimary }}
          >
            {formatCurrency(summary.totalSaved, preferences.currency)}
          </p>
          <p className="text-[11px] mt-1.5 hidden sm:block" style={{ color: palette.textSecondary }}>
            {savingsGoals.length}{' '}
            {savingsGoals.length === 1 ? 'meta ativa' : 'metas ativas'}
          </p>
        </SurfaceCard>

        <SurfaceCard>
          <p
            className={`text-[11px] sm:text-xs font-medium ${isTerminal ? 'uppercase tracking-wider' : ''}`}
            style={{ color: palette.textSecondary }}
          >
            Total Investido
          </p>
          <p
            data-testid="kpi-total-invested"
            className="text-lg sm:text-2xl font-bold font-num mt-1.5 truncate"
            style={{ color: palette.textPrimary }}
          >
            {formatCurrency(summary.totalInvested, preferences.currency)}
          </p>
          <p className="text-[11px] mt-1.5 hidden sm:block" style={{ color: palette.textSecondary }}>
            {investments.length}{' '}
            {investments.length === 1 ? 'ativo acompanhado' : 'ativos acompanhados'}
          </p>
        </SurfaceCard>
      </div>

      {/* Monthly P&L Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <SurfaceCard padding="compact">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs" style={{ color: palette.textSecondary }}>
              Receitas do Mês
            </span>
            <TrendingUp className="w-3.5 h-3.5" style={{ color: palette.positiveColor }} />
          </div>
          <p
            data-testid="kpi-monthly-income"
            className="text-lg font-semibold font-num mt-1"
            style={{ color: palette.positiveColor }}
          >
            {formatCurrency(summary.monthlyIncome, preferences.currency)}
          </p>
        </SurfaceCard>

        <SurfaceCard padding="compact">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs" style={{ color: palette.textSecondary }}>
              Despesas do Mês
            </span>
            <TrendingDown className="w-3.5 h-3.5" style={{ color: palette.negativeColor }} />
          </div>
          <p
            data-testid="kpi-monthly-expenses"
            className="text-lg font-semibold font-num mt-1"
            style={{ color: palette.negativeColor }}
          >
            {formatCurrency(summary.monthlyExpenses, preferences.currency)}
          </p>
        </SurfaceCard>

        <SurfaceCard padding="compact">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs" style={{ color: palette.textSecondary }}>
              Resultado Mensal ({summary.monthlyNet >= 0 ? 'Lucro' : 'Prejuízo'})
            </span>
            <span className="text-xs font-num" style={{ color: palette.textSecondary }}>
              {formatPercent(summary.savingsRate)}
            </span>
          </div>
          <p
            data-testid="kpi-monthly-net"
            className="text-lg font-semibold font-num mt-1"
            style={{
              color:
                summary.monthlyNet >= 0 ? palette.positiveColor : palette.negativeColor,
            }}
          >
            {summary.monthlyNet > 0 ? '+' : ''}
            {formatCurrency(summary.monthlyNet, preferences.currency)}
          </p>
        </SurfaceCard>
      </div>

      {isEmpty ? (
        <SurfaceCard>
          <EmptyState
            title="Seu terminal financeiro está pronto"
            description="Ainda não há movimentações, metas ou ativos registrados. Adicione sua primeira receita, despesa, meta de economia ou investimento para gerar indicadores e gráficos automaticamente."
            actionLabel="Registrar Primeira Movimentação"
            onAction={onNewTransaction}
            icon={<Plus className="w-6 h-6" />}
          />
        </SurfaceCard>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <SurfaceCard className="xl:col-span-7">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-semibold font-display">
                    Evolução Patrimonial
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: palette.textSecondary }}>
                    Consolidação mensal de saldo, reservas e carteira
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('analytics')}
                  className="text-xs font-medium flex items-center gap-1 whitespace-nowrap shrink-0"
                  style={{ color: palette.accentColor }}
                >
                  <span>Ver Análises</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <AreaTrendChart
                data={wealthSeries}
                primaryLabel="Patrimônio"
                height={230}
                emptyText="Registre movimentações ou ativos para visualizar a curva patrimonial."
              />
            </SurfaceCard>

            <SurfaceCard className="xl:col-span-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-semibold font-display">
                    Receitas vs. Despesas
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: palette.textSecondary }}>
                    Fluxo mensal comparativo
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('transactions')}
                  className="text-xs font-medium flex items-center gap-1 whitespace-nowrap shrink-0"
                  style={{ color: palette.accentColor }}
                >
                  <span>Fluxo Completo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <BarComparisonChart data={cashFlowSeries} height={230} />
            </SurfaceCard>
          </div>

          {/* Bottom Row: Recent Transactions & Savings Goals Progress */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <SurfaceCard className="xl:col-span-7">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-sm font-semibold font-display">
                  Últimas Movimentações
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('transactions')}
                  className="text-xs font-medium whitespace-nowrap shrink-0"
                  style={{ color: palette.accentColor }}
                >
                  Ver todas
                </button>
              </div>

              {recentTransactions.length === 0 ? (
                <EmptyState
                  title="Nenhuma movimentação registrada"
                  description="Lance suas entradas e saídas para acompanhar seu fluxo mensal."
                  actionLabel="Adicionar Movimentação"
                  onAction={onNewTransaction}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr
                        className="border-b text-[11px]"
                        style={{
                          borderColor: palette.borderColor,
                          color: palette.textSecondary,
                        }}
                      >
                        <th className="py-2 pr-3 font-medium">Data</th>
                        <th className="py-2 pr-3 font-medium">Descrição</th>
                        <th className="py-2 pr-3 font-medium">Categoria</th>
                        <th className="py-2 text-right font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="border-b last:border-b-0 text-xs"
                          style={{
                            borderColor: palette.borderColor,
                            height: 'var(--fos-row-h)',
                          }}
                        >
                          <td
                            className="py-2 pr-3 font-num whitespace-nowrap"
                            style={{ color: palette.textSecondary }}
                          >
                            {formatDateBR(tx.date)}
                          </td>
                          <td className="py-2 pr-3 font-medium max-w-[200px] truncate">
                            {tx.description}
                          </td>
                          <td
                            className="py-2 pr-3 whitespace-nowrap"
                            style={{ color: palette.textSecondary }}
                          >
                            {tx.categoryName}
                            {tx.isRecurring && (
                              <span> · {RECURRENCE_LABELS[tx.recurrenceFrequency]}</span>
                            )}
                          </td>
                          <td
                            className="py-2 text-right font-num font-semibold whitespace-nowrap"
                            style={{
                              color:
                                tx.type === 'income'
                                  ? palette.positiveColor
                                  : palette.negativeColor,
                            }}
                          >
                            {tx.type === 'income' ? '+' : '-'}
                            {formatCurrency(tx.amount, preferences.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SurfaceCard>

            <SurfaceCard className="xl:col-span-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-sm font-semibold font-display">
                  Progresso das Metas
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('savings')}
                  className="text-xs font-medium whitespace-nowrap shrink-0"
                  style={{ color: palette.accentColor }}
                >
                  Gerenciar metas
                </button>
              </div>

              {savingsGoals.length === 0 ? (
                <EmptyState
                  title="Sem metas financeiras"
                  description="Crie metas para reservas de emergência, viagens ou objetivos de médio prazo."
                  actionLabel="Criar Meta"
                  onAction={() => onNavigate('savings')}
                />
              ) : (
                <div className="space-y-4">
                  {savingsGoals.slice(0, 4).map((goal) => {
                    const est = estimateGoalCompletion(goal, savingsDeposits);
                    return (
                      <div key={goal.id} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium truncate">{goal.name}</span>
                          <span className="font-num shrink-0" style={{ color: palette.textSecondary }}>
                            {formatPercent(est.percent)}
                          </span>
                        </div>
                        <div
                          className="w-full h-2 overflow-hidden"
                          style={{
                            backgroundColor: palette.surfaceMutedColor,
                            borderRadius: palette.radiusSmPx,
                          }}
                        >
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, est.percent)}%`,
                              backgroundColor:
                                est.status === 'completed'
                                  ? palette.positiveColor
                                  : palette.accentColor,
                            }}
                          />
                        </div>
                        <div
                          className="flex items-center justify-between text-[11px] font-num"
                          style={{ color: palette.textSecondary }}
                        >
                          <span>{formatCurrency(goal.currentAmount, preferences.currency)}</span>
                          <span>Alvo: {formatCurrency(goal.targetAmount, preferences.currency)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SurfaceCard>
          </div>
        </>
      )}
    </div>
  );
}
