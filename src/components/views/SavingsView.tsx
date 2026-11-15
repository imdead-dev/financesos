import React, { useMemo, useState } from 'react';
import { Edit3, PiggyBank, Plus, Trash2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { SavingsGoal } from '../../types/finance';
import { estimateGoalCompletion } from '../../utils/financeMath';
import { formatCurrency, formatDateBR, formatPercent, getTodayISO } from '../../utils/formatters';
import { SurfaceCard } from '../ui/SurfaceCard';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { AreaTrendChart } from '../charts/FinanceCharts';

export function SavingsView() {
  const {
    savingsGoals,
    savingsDeposits,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    addSavingsDeposit,
    preferences,
    palette,
  } = useFinance();

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [depositModalGoal, setDepositModalGoal] = useState<SavingsGoal | null>(null);

  // Goal form state
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');

  // Deposit form state
  const [depositType, setDepositType] = useState<'deposit' | 'withdraw'>('deposit');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState(getTodayISO());
  const [depositNote, setDepositNote] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const consolidated = useMemo(() => {
    const totalSaved = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
    const totalTarget = savingsGoals.reduce((s, g) => s + g.targetAmount, 0);
    const pct = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;
    return { totalSaved, totalTarget, pct };
  }, [savingsGoals]);

  const evolutionSeries = useMemo(() => {
    if (savingsDeposits.length === 0) return [];
    const sorted = [...savingsDeposits].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    const byDate = new Map<string, number>();
    for (const d of sorted) {
      running = Math.max(0, running + d.amount);
      byDate.set(d.date, running);
    }
    return Array.from(byDate.entries()).map(([date, val]) => ({
      label: formatDateBR(date),
      value: val,
    }));
  }, [savingsDeposits]);

  const openCreateGoal = () => {
    setEditingGoal(null);
    setName('');
    setTargetAmount('');
    setCurrentAmount('0');
    setTargetDate('');
    setNotes('');
    setFormError(null);
    setGoalModalOpen(true);
  };

  const openEditGoal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setTargetAmount(String(goal.targetAmount));
    setCurrentAmount(String(goal.currentAmount));
    setTargetDate(goal.targetDate);
    setNotes(goal.notes);
    setFormError(null);
    setGoalModalOpen(true);
  };

  const openDepositModal = (goal: SavingsGoal) => {
    setDepositModalGoal(goal);
    setDepositType('deposit');
    setDepositAmount('');
    setDepositDate(getTodayISO());
    setDepositNote('');
    setFormError(null);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const tgt = Number(targetAmount.replace(',', '.'));
    const cur = Number(currentAmount.replace(',', '.')) || 0;
    if (!name.trim()) {
      setFormError('Informe um nome para a meta.');
      return;
    }
    if (!Number.isFinite(tgt) || tgt <= 0) {
      setFormError('O valor desejado deve ser maior que zero.');
      return;
    }
    const payload = {
      name: name.trim(),
      targetAmount: tgt,
      currentAmount: Math.max(0, cur),
      targetDate,
      notes: notes.trim(),
    };
    if (editingGoal) {
      await updateSavingsGoal(editingGoal.id, payload);
    } else {
      await addSavingsGoal(payload);
    }
    setGoalModalOpen(false);
  };

  const handleSaveDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositModalGoal) return;
    const rawAmt = Number(depositAmount.replace(',', '.'));
    if (!Number.isFinite(rawAmt) || rawAmt <= 0) {
      setFormError('Informe um valor maior que zero.');
      return;
    }
    const signed = depositType === 'deposit' ? rawAmt : -rawAmt;
    await addSavingsDeposit({
      goalId: depositModalGoal.id,
      amount: signed,
      date: depositDate,
      note: depositNote.trim() || (depositType === 'deposit' ? 'Depósito na meta' : 'Resgate da meta'),
    });
    setDepositModalGoal(null);
  };

  return (
    <div className="space-y-5">
      {/* Header Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <SurfaceCard padding="compact">
          <p className="text-xs" style={{ color: palette.textSecondary }}>
            Total Economizado
          </p>
          <p className="text-xl font-bold font-num mt-1">
            {formatCurrency(consolidated.totalSaved, preferences.currency)}
          </p>
        </SurfaceCard>

        <SurfaceCard padding="compact">
          <p className="text-xs" style={{ color: palette.textSecondary }}>
            Soma dos Objetivos
          </p>
          <p className="text-xl font-bold font-num mt-1">
            {formatCurrency(consolidated.totalTarget, preferences.currency)}
          </p>
        </SurfaceCard>

        <SurfaceCard padding="compact">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs" style={{ color: palette.textSecondary }}>
                Progresso Global
              </p>
              <p className="text-xl font-bold font-num mt-1" style={{ color: palette.accentColor }}>
                {formatPercent(consolidated.pct)}
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateGoal}
              className="fos-btn-primary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Meta</span>
            </button>
          </div>
        </SurfaceCard>
      </div>

      {/* Goals Grid */}
      {savingsGoals.length === 0 ? (
        <SurfaceCard>
          <EmptyState
            title="Nenhuma meta de economia criada"
            description="Defina objetivos financeiros, registre depósitos periódicos e acompanhe o progresso percentual e a previsão de conclusão."
            actionLabel="Criar Primeira Meta"
            onAction={openCreateGoal}
            icon={<PiggyBank className="w-6 h-6" />}
          />
        </SurfaceCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savingsGoals.map((goal) => {
            const est = estimateGoalCompletion(goal, savingsDeposits);
            return (
              <SurfaceCard key={goal.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold font-display truncate">{goal.name}</h3>
                    <p className="text-[11px] mt-0.5" style={{ color: palette.textSecondary }}>
                      {goal.targetDate
                        ? `Prazo alvo: ${formatDateBR(goal.targetDate)}`
                        : 'Sem prazo fixado'}
                      {est.estimatedMonths !== null && est.estimatedMonths > 0
                        ? ` · Conclusão est.: ~${est.estimatedMonths} ${est.estimatedMonths === 1 ? 'mês' : 'meses'}`
                        : est.status === 'completed'
                          ? ' · Objetivo atingido'
                          : ' · Registre depósitos para estimar prazo'}
                    </p>
                  </div>
                  <span
                    className="text-sm font-bold font-num shrink-0"
                    style={{
                      color:
                        est.status === 'completed'
                          ? palette.positiveColor
                          : palette.accentColor,
                    }}
                  >
                    {formatPercent(est.percent)}
                  </span>
                </div>

                <div
                  className="w-full h-2.5 my-3 overflow-hidden"
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

                <div className="grid grid-cols-3 gap-2 text-xs font-num py-2 border-y" style={{ borderColor: palette.borderColor }}>
                  <div>
                    <span className="block text-[10px] font-sans" style={{ color: palette.textSecondary }}>
                      Acumulado
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(goal.currentAmount, preferences.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-sans" style={{ color: palette.textSecondary }}>
                      Desejado
                    </span>
                    <span>{formatCurrency(goal.targetAmount, preferences.currency)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-sans" style={{ color: palette.textSecondary }}>
                      Faltante
                    </span>
                    <span>{formatCurrency(est.remainingAmount, preferences.currency)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => openDepositModal(goal)}
                    className="fos-btn-primary px-3 py-1.5 text-xs font-semibold min-h-[36px]"
                  >
                    Registrar Depósito
                  </button>

                  {confirmDeleteId === goal.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          void deleteSavingsGoal(goal.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold"
                        style={{
                          backgroundColor: palette.negativeColor,
                          color: '#FFF',
                          borderRadius: palette.radiusSmPx,
                        }}
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1.5 text-xs border"
                        style={{ borderColor: palette.borderColor, borderRadius: palette.radiusSmPx }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditGoal(goal)}
                        aria-label={`Editar meta '${goal.name}'`}
                        className="p-2 border min-w-[36px] min-h-[36px] flex items-center justify-center"
                        style={{
                          borderColor: palette.borderColor,
                          borderRadius: palette.radiusSmPx,
                          color: palette.textSecondary,
                        }}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(goal.id)}
                        aria-label={`Excluir meta '${goal.name}'`}
                        className="p-2 border min-w-[36px] min-h-[36px] flex items-center justify-center"
                        style={{
                          borderColor: palette.borderColor,
                          borderRadius: palette.radiusSmPx,
                          color: palette.negativeColor,
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      )}

      {/* Savings Evolution Chart + Deposit History */}
      {savingsGoals.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <SurfaceCard className="xl:col-span-7">
            <h2 className="text-sm font-semibold font-display mb-1">
              Evolução das Economias
            </h2>
            <p className="text-xs mb-4" style={{ color: palette.textSecondary }}>
              Crescimento acumulado com base nos depósitos registrados
            </p>
            <AreaTrendChart
              data={evolutionSeries}
              primaryLabel="Total Economizado"
              height={220}
              emptyText="Registre depósitos nas metas para visualizar a curva de evolução."
            />
          </SurfaceCard>

          <SurfaceCard className="xl:col-span-5">
            <h2 className="text-sm font-semibold font-display mb-3">
              Histórico de Depósitos
            </h2>
            {savingsDeposits.length === 0 ? (
              <p className="text-xs py-6 text-center" style={{ color: palette.textSecondary }}>
                Nenhum depósito registrado até o momento.
              </p>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {savingsDeposits.slice(0, 15).map((dep) => {
                  const goal = savingsGoals.find((g) => g.id === dep.goalId);
                  return (
                    <div
                      key={dep.id}
                      className="flex items-center justify-between gap-2 py-2 border-b last:border-b-0 text-xs"
                      style={{ borderColor: palette.borderColor }}
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{goal?.name ?? 'Meta'}</p>
                        <p className="text-[11px] truncate" style={{ color: palette.textSecondary }}>
                          {formatDateBR(dep.date)} · {dep.note}
                        </p>
                      </div>
                      <span
                        className="font-num font-semibold shrink-0"
                        style={{
                          color: dep.amount >= 0 ? palette.positiveColor : palette.negativeColor,
                        }}
                      >
                        {dep.amount >= 0 ? '+' : ''}
                        {formatCurrency(dep.amount, preferences.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </SurfaceCard>
        </div>
      )}

      {/* Goal Create/Edit Modal */}
      <Modal
        open={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        title={editingGoal ? 'Editar Meta Financeira' : 'Nova Meta de Economia'}
      >
        <form onSubmit={(e) => void handleSaveGoal(e)} className="space-y-4">
          <div>
            <label htmlFor="goal-name" className="block text-xs font-medium mb-1">
              Nome da Meta
            </label>
            <input
              id="goal-name"
              type="text"
              required
              maxLength={100}
              placeholder="Ex.: Reserva de Emergência"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full fos-input px-3 py-2 text-sm min-h-[42px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="goal-target" className="block text-xs font-medium mb-1">
                Valor Desejado
              </label>
              <input
                id="goal-target"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>

            <div>
              <label htmlFor="goal-current" className="block text-xs font-medium mb-1">
                Valor Inicial / Atual
              </label>
              <input
                id="goal-current"
                type="number"
                step="0.01"
                min="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="goal-date" className="block text-xs font-medium mb-1">
              Data Alvo (opcional)
            </label>
            <input
              id="goal-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
            />
          </div>

          <div>
            <label htmlFor="goal-notes" className="block text-xs font-medium mb-1">
              Observações
            </label>
            <textarea
              id="goal-notes"
              rows={2}
              maxLength={400}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full fos-input px-3 py-2 text-xs"
            />
          </div>

          {formError && (
            <p className="text-xs font-medium" role="alert" style={{ color: palette.negativeColor }}>
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setGoalModalOpen(false)}
              className="fos-btn-secondary px-4 py-2 text-xs font-medium min-h-[40px]"
            >
              Cancelar
            </button>
            <button type="submit" className="fos-btn-primary px-5 py-2 text-xs font-semibold min-h-[40px]">
              Salvar Meta
            </button>
          </div>
        </form>
      </Modal>

      {/* Deposit Modal */}
      <Modal
        open={Boolean(depositModalGoal)}
        onClose={() => setDepositModalGoal(null)}
        title={`Movimentar: ${depositModalGoal?.name ?? ''}`}
      >
        <form onSubmit={(e) => void handleSaveDeposit(e)} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDepositType('deposit')}
              className="py-2 text-xs font-semibold border min-h-[38px]"
              style={{
                borderRadius: palette.radiusSmPx,
                borderColor:
                  depositType === 'deposit' ? palette.positiveColor : palette.borderColor,
                backgroundColor:
                  depositType === 'deposit' ? palette.positiveColor : 'transparent',
                color: depositType === 'deposit' ? '#04120B' : palette.textSecondary,
              }}
            >
              Depósito (+)
            </button>
            <button
              type="button"
              onClick={() => setDepositType('withdraw')}
              className="py-2 text-xs font-semibold border min-h-[38px]"
              style={{
                borderRadius: palette.radiusSmPx,
                borderColor:
                  depositType === 'withdraw' ? palette.negativeColor : palette.borderColor,
                backgroundColor:
                  depositType === 'withdraw' ? palette.negativeColor : 'transparent',
                color: depositType === 'withdraw' ? '#FFFFFF' : palette.textSecondary,
              }}
            >
              Resgate (-)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="dep-amount" className="block text-xs font-medium mb-1">
                Valor
              </label>
              <input
                id="dep-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>

            <div>
              <label htmlFor="dep-date" className="block text-xs font-medium mb-1">
                Data
              </label>
              <input
                id="dep-date"
                type="date"
                required
                value={depositDate}
                onChange={(e) => setDepositDate(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="dep-note" className="block text-xs font-medium mb-1">
              Descrição
            </label>
            <input
              id="dep-note"
              type="text"
              maxLength={200}
              placeholder="Ex.: Aporte mensal"
              value={depositNote}
              onChange={(e) => setDepositNote(e.target.value)}
              className="w-full fos-input px-3 py-2 text-sm min-h-[42px]"
            />
          </div>

          {formError && (
            <p className="text-xs font-medium" role="alert" style={{ color: palette.negativeColor }}>
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDepositModalGoal(null)}
              className="fos-btn-secondary px-4 py-2 text-xs font-medium min-h-[40px]"
            >
              Cancelar
            </button>
            <button type="submit" className="fos-btn-primary px-5 py-2 text-xs font-semibold min-h-[40px]">
              Confirmar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
