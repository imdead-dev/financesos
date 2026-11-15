import React, { useMemo, useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import {
  calculateDashboardSummary,
  calculateProfitability,
  simulateCompoundInterest,
  simulateGoalTarget,
} from '../../utils/financeMath';
import { formatCurrency, formatPercent, getCurrentMonthKey } from '../../utils/formatters';
import { SurfaceCard } from '../ui/SurfaceCard';
import { AreaTrendChart } from '../charts/FinanceCharts';

type CalcTab = 'compound' | 'goal' | 'profitability' | 'projection';

export function CalculatorView() {
  const { transactions, savingsGoals, investments, preferences, palette } = useFinance();
  const [activeTab, setActiveTab] = useState<CalcTab>('compound');

  const summary = useMemo(
    () => calculateDashboardSummary(transactions, savingsGoals, investments, getCurrentMonthKey()),
    [transactions, savingsGoals, investments]
  );

  // 1. Compound Interest & Recurring Contributions
  const [initialCap, setInitialCap] = useState('5000');
  const [monthlyContrib, setMonthlyContrib] = useState('1000');
  const [annualRate, setAnnualRate] = useState('10.5');
  const [months, setMonths] = useState('60');

  const compoundResult = useMemo(
    () =>
      simulateCompoundInterest({
        initialCapital: Number(initialCap) || 0,
        monthlyContribution: Number(monthlyContrib) || 0,
        annualRatePercent: Number(annualRate) || 0,
        months: Number(months) || 12,
      }),
    [initialCap, monthlyContrib, annualRate, months]
  );

  // 2. Goal Target Simulation
  const [goalTarget, setGoalTarget] = useState('100000');
  const [goalCurrent, setGoalCurrent] = useState('10000');
  const [goalMonthly, setGoalMonthly] = useState('1500');
  const [goalRate, setGoalRate] = useState('10');

  const goalResult = useMemo(
    () =>
      simulateGoalTarget({
        targetAmount: Number(goalTarget) || 0,
        currentAmount: Number(goalCurrent) || 0,
        monthlyContribution: Number(goalMonthly) || 0,
        annualRatePercent: Number(goalRate) || 0,
      }),
    [goalTarget, goalCurrent, goalMonthly, goalRate]
  );

  // 3. Profitability Calculator
  const [profInvested, setProfInvested] = useState('10000');
  const [profFinal, setProfFinal] = useState('13500');
  const [profMonths, setProfMonths] = useState('24');

  const profResult = useMemo(
    () =>
      calculateProfitability({
        investedAmount: Number(profInvested) || 0,
        finalAmount: Number(profFinal) || 0,
        months: Number(profMonths) || 1,
      }),
    [profInvested, profFinal, profMonths]
  );

  // 4. Future Net Worth Projection
  const [projBase, setProjBase] = useState(() =>
    String(Math.max(0, Math.round(summary.totalNetWorth)))
  );
  const [projMonthly, setProjMonthly] = useState(() =>
    String(Math.max(500, Math.round(summary.monthlyNet > 0 ? summary.monthlyNet : 1000)))
  );
  const [projRate, setProjRate] = useState('10');
  const [projYears, setProjYears] = useState('10');

  const projResult = useMemo(
    () =>
      simulateCompoundInterest({
        initialCapital: Number(projBase) || 0,
        monthlyContribution: Number(projMonthly) || 0,
        annualRatePercent: Number(projRate) || 0,
        months: Math.max(1, Math.round((Number(projYears) || 1) * 12)),
      }),
    [projBase, projMonthly, projRate, projYears]
  );

  return (
    <div className="space-y-5">
      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(
          [
            ['compound', 'Juros Compostos & Aportes'],
            ['goal', 'Simulação de Metas'],
            ['profitability', 'Cálculo de Rentabilidade'],
            ['projection', 'Projeção Patrimonial'],
          ] as Array<[CalcTab, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className="px-3.5 py-2 text-xs font-semibold border whitespace-nowrap shrink-0 min-h-[40px] transition-colors"
            style={{
              borderRadius: palette.radiusSmPx,
              borderColor: activeTab === id ? palette.accentColor : palette.borderColor,
              backgroundColor:
                activeTab === id ? palette.surfaceMutedColor : palette.surfaceColor,
              color: activeTab === id ? palette.accentColor : palette.textSecondary,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'compound' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <SurfaceCard className="xl:col-span-4 space-y-4">
            <h2 className="text-sm font-semibold font-display">
              Parâmetros da Simulação
            </h2>
            <div>
              <label htmlFor="calc-init" className="block text-xs mb-1">
                Capital Inicial ({preferences.currency})
              </label>
              <input
                id="calc-init"
                type="number"
                min="0"
                step="100"
                value={initialCap}
                onChange={(e) => setInitialCap(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
            <div>
              <label htmlFor="calc-monthly" className="block text-xs mb-1">
                Aporte Mensal Recorrente
              </label>
              <input
                id="calc-monthly"
                type="number"
                min="0"
                step="50"
                value={monthlyContrib}
                onChange={(e) => setMonthlyContrib(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
            <div>
              <label htmlFor="calc-rate" className="block text-xs mb-1">
                Taxa de Retorno Anual (% a.a.)
              </label>
              <input
                id="calc-rate"
                type="number"
                min="0"
                max="200"
                step="0.1"
                value={annualRate}
                onChange={(e) => setAnnualRate(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
            <div>
              <label htmlFor="calc-months" className="block text-xs mb-1">
                Prazo (meses)
              </label>
              <input
                id="calc-months"
                type="number"
                min="1"
                max="600"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
          </SurfaceCard>

          <SurfaceCard className="xl:col-span-8 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                className="p-3 border"
                style={{
                  borderColor: palette.borderColor,
                  borderRadius: palette.radiusSmPx,
                  backgroundColor: palette.surfaceMutedColor,
                }}
              >
                <p className="text-[11px]" style={{ color: palette.textSecondary }}>
                  Montante Final
                </p>
                <p
                  data-testid="calc-final-amount"
                  className="text-lg font-bold font-num mt-1"
                  style={{ color: palette.accentColor }}
                >
                  {formatCurrency(compoundResult.finalAmount, preferences.currency)}
                </p>
              </div>
              <div
                className="p-3 border"
                style={{
                  borderColor: palette.borderColor,
                  borderRadius: palette.radiusSmPx,
                  backgroundColor: palette.surfaceMutedColor,
                }}
              >
                <p className="text-[11px]" style={{ color: palette.textSecondary }}>
                  Total Aportado
                </p>
                <p className="text-lg font-bold font-num mt-1">
                  {formatCurrency(compoundResult.totalInvested, preferences.currency)}
                </p>
              </div>
              <div
                className="p-3 border"
                style={{
                  borderColor: palette.borderColor,
                  borderRadius: palette.radiusSmPx,
                  backgroundColor: palette.surfaceMutedColor,
                }}
              >
                <p className="text-[11px]" style={{ color: palette.textSecondary }}>
                  Juros Compostos
                </p>
                <p
                  className="text-lg font-bold font-num mt-1"
                  style={{ color: palette.positiveColor }}
                >
                  +{formatCurrency(compoundResult.totalInterest, preferences.currency)}
                </p>
              </div>
            </div>

            <AreaTrendChart
              data={compoundResult.schedule
                .filter(
                  (p, i, arr) =>
                    arr.length <= 24 ||
                    i % Math.ceil(arr.length / 24) === 0 ||
                    i === arr.length - 1
                )
                .map((p) => ({
                  label: `M${p.month}`,
                  value: p.totalBalance,
                  secondaryValue: p.totalInvested,
                }))}
              primaryLabel="Montante Total"
              secondaryLabel="Total Investido"
              height={250}
            />
          </SurfaceCard>
        </div>
      )}

      {activeTab === 'goal' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <SurfaceCard className="xl:col-span-4 space-y-4">
            <h2 className="text-sm font-semibold font-display">
              Simulador de Conclusão de Meta
            </h2>
            <div>
              <label htmlFor="goal-sim-target" className="block text-xs mb-1">
                Valor da Meta
              </label>
              <input
                id="goal-sim-target"
                type="number"
                min="1"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
            <div>
              <label htmlFor="goal-sim-cur" className="block text-xs mb-1">
                Valor Já Acumulado
              </label>
              <input
                id="goal-sim-cur"
                type="number"
                min="0"
                value={goalCurrent}
                onChange={(e) => setGoalCurrent(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
            <div>
              <label htmlFor="goal-sim-month" className="block text-xs mb-1">
                Aporte Mensal Planejado
              </label>
              <input
                id="goal-sim-month"
                type="number"
                min="0"
                value={goalMonthly}
                onChange={(e) => setGoalMonthly(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
            <div>
              <label htmlFor="goal-sim-rate" className="block text-xs mb-1">
                Rentabilidade Anual Estimada (%)
              </label>
              <input
                id="goal-sim-rate"
                type="number"
                min="0"
                step="0.1"
                value={goalRate}
                onChange={(e) => setGoalRate(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
          </SurfaceCard>

          <SurfaceCard className="xl:col-span-8 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                className="p-4 border"
                style={{
                  borderColor: palette.borderColor,
                  borderRadius: palette.radiusSmPx,
                  backgroundColor: palette.surfaceMutedColor,
                }}
              >
                <p className="text-xs" style={{ color: palette.textSecondary }}>
                  Tempo Estimado para Atingir
                </p>
                <p className="text-2xl font-bold font-num mt-1" style={{ color: palette.accentColor }}>
                  {goalResult.monthsRequired === null
                    ? 'Acima de 50 anos'
                    : `${goalResult.monthsRequired} meses`}
                </p>
              </div>
              <div
                className="p-4 border"
                style={{
                  borderColor: palette.borderColor,
                  borderRadius: palette.radiusSmPx,
                  backgroundColor: palette.surfaceMutedColor,
                }}
              >
                <p className="text-xs" style={{ color: palette.textSecondary }}>
                  Equivalente em Anos
                </p>
                <p className="text-2xl font-bold font-num mt-1">
                  {goalResult.yearsRequired === null ? '—' : `${goalResult.yearsRequired} anos`}
                </p>
              </div>
            </div>

            <AreaTrendChart
              data={goalResult.schedule
                .filter(
                  (p, i, arr) =>
                    arr.length <= 24 ||
                    i % Math.ceil(arr.length / 24) === 0 ||
                    i === arr.length - 1
                )
                .map((p) => ({
                  label: `M${p.month}`,
                  value: p.totalBalance,
                  secondaryValue: Number(goalTarget) || 0,
                }))}
              primaryLabel="Saldo Projetado"
              secondaryLabel="Alvo"
              height={240}
            />
          </SurfaceCard>
        </div>
      )}

      {activeTab === 'profitability' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <SurfaceCard className="lg:col-span-5 space-y-4">
            <h2 className="text-sm font-semibold font-display">
              Cálculo de Rentabilidade Realizada
            </h2>
            <div>
              <label htmlFor="prof-inv" className="block text-xs mb-1">
                Valor Aplicado Inicial
              </label>
              <input
                id="prof-inv"
                type="number"
                min="0"
                value={profInvested}
                onChange={(e) => setProfInvested(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
            <div>
              <label htmlFor="prof-fin" className="block text-xs mb-1">
                Valor Final Atual
              </label>
              <input
                id="prof-fin"
                type="number"
                min="0"
                value={profFinal}
                onChange={(e) => setProfFinal(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
            <div>
              <label htmlFor="prof-months" className="block text-xs mb-1">
                Período Decorrente (meses)
              </label>
              <input
                id="prof-months"
                type="number"
                min="1"
                value={profMonths}
                onChange={(e) => setProfMonths(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
          </SurfaceCard>

          <SurfaceCard className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
            <div
              className="p-4 border"
              style={{
                borderColor: palette.borderColor,
                borderRadius: palette.radiusSmPx,
                backgroundColor: palette.surfaceMutedColor,
              }}
            >
              <p className="text-xs" style={{ color: palette.textSecondary }}>
                Ganho / Perda Nominal
              </p>
              <p
                className="text-xl font-bold font-num mt-1"
                style={{
                  color:
                    profResult.nominalGain >= 0
                      ? palette.positiveColor
                      : palette.negativeColor,
                }}
              >
                {profResult.nominalGain >= 0 ? '+' : ''}
                {formatCurrency(profResult.nominalGain, preferences.currency)}
              </p>
            </div>
            <div
              className="p-4 border"
              style={{
                borderColor: palette.borderColor,
                borderRadius: palette.radiusSmPx,
                backgroundColor: palette.surfaceMutedColor,
              }}
            >
              <p className="text-xs" style={{ color: palette.textSecondary }}>
                Rentabilidade Total
              </p>
              <p
                className="text-xl font-bold font-num mt-1"
                style={{
                  color:
                    profResult.totalReturnPercent >= 0
                      ? palette.positiveColor
                      : palette.negativeColor,
                }}
              >
                {formatPercent(profResult.totalReturnPercent, true)}
              </p>
            </div>
            <div
              className="p-4 border"
              style={{
                borderColor: palette.borderColor,
                borderRadius: palette.radiusSmPx,
                backgroundColor: palette.surfaceMutedColor,
              }}
            >
              <p className="text-xs" style={{ color: palette.textSecondary }}>
                Taxa Equivalente Mensal
              </p>
              <p className="text-xl font-bold font-num mt-1">
                {formatPercent(profResult.monthlyEquivalentPercent, true)} / mês
              </p>
            </div>
            <div
              className="p-4 border"
              style={{
                borderColor: palette.borderColor,
                borderRadius: palette.radiusSmPx,
                backgroundColor: palette.surfaceMutedColor,
              }}
            >
              <p className="text-xs" style={{ color: palette.textSecondary }}>
                Rentabilidade Anualizada (CAGR)
              </p>
              <p className="text-xl font-bold font-num mt-1" style={{ color: palette.accentColor }}>
                {formatPercent(profResult.annualizedCagrPercent, true)} / ano
              </p>
            </div>
          </SurfaceCard>
        </div>
      )}

      {activeTab === 'projection' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <SurfaceCard className="xl:col-span-4 space-y-4">
            <h2 className="text-sm font-semibold font-display">
              Projeção de Patrimônio Futuro
            </h2>
            <p className="text-xs" style={{ color: palette.textSecondary }}>
              Inicializada com seu patrimônio atual (
              {formatCurrency(summary.totalNetWorth, preferences.currency)}).
            </p>
            <div>
              <label htmlFor="proj-base" className="block text-xs mb-1">
                Patrimônio Base
              </label>
              <input
                id="proj-base"
                type="number"
                min="0"
                value={projBase}
                onChange={(e) => setProjBase(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
            <div>
              <label htmlFor="proj-monthly" className="block text-xs mb-1">
                Capacidade de Aporte Mensal
              </label>
              <input
                id="proj-monthly"
                type="number"
                min="0"
                value={projMonthly}
                onChange={(e) => setProjMonthly(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
            <div>
              <label htmlFor="proj-rate" className="block text-xs mb-1">
                Retorno Médio Anual (%)
              </label>
              <input
                id="proj-rate"
                type="number"
                min="0"
                step="0.1"
                value={projRate}
                onChange={(e) => setProjRate(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
            <div>
              <label htmlFor="proj-years" className="block text-xs mb-1">
                Horizonte (anos)
              </label>
              <input
                id="proj-years"
                type="number"
                min="1"
                max="50"
                value={projYears}
                onChange={(e) => setProjYears(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
          </SurfaceCard>

          <SurfaceCard className="xl:col-span-8 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                className="p-3 border"
                style={{
                  borderColor: palette.borderColor,
                  borderRadius: palette.radiusSmPx,
                  backgroundColor: palette.surfaceMutedColor,
                }}
              >
                <p className="text-[11px]" style={{ color: palette.textSecondary }}>
                  Patrimônio em {projYears} anos
                </p>
                <p className="text-lg font-bold font-num mt-1" style={{ color: palette.accentColor }}>
                  {formatCurrency(projResult.finalAmount, preferences.currency)}
                </p>
              </div>
              <div
                className="p-3 border"
                style={{
                  borderColor: palette.borderColor,
                  borderRadius: palette.radiusSmPx,
                  backgroundColor: palette.surfaceMutedColor,
                }}
              >
                <p className="text-[11px]" style={{ color: palette.textSecondary }}>
                  Capital Próprio Acumulado
                </p>
                <p className="text-lg font-bold font-num mt-1">
                  {formatCurrency(projResult.totalInvested, preferences.currency)}
                </p>
              </div>
              <div
                className="p-3 border"
                style={{
                  borderColor: palette.borderColor,
                  borderRadius: palette.radiusSmPx,
                  backgroundColor: palette.surfaceMutedColor,
                }}
              >
                <p className="text-[11px]" style={{ color: palette.textSecondary }}>
                  Rendimento Composto
                </p>
                <p className="text-lg font-bold font-num mt-1" style={{ color: palette.positiveColor }}>
                  +{formatCurrency(projResult.totalInterest, preferences.currency)}
                </p>
              </div>
            </div>

            <AreaTrendChart
              data={projResult.schedule
                .filter((p) => p.month % 12 === 0 || p.month === projResult.schedule.length - 1)
                .map((p) => ({
                  label: `Ano ${(p.month / 12).toFixed(0)}`,
                  value: p.totalBalance,
                  secondaryValue: p.totalInvested,
                }))}
              primaryLabel="Patrimônio Projetado"
              secondaryLabel="Total Aportado"
              height={250}
            />
          </SurfaceCard>
        </div>
      )}
    </div>
  );
}
