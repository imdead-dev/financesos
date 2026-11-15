import React, { useMemo, useState } from 'react';
import { Edit3, Plus, Search, Trash2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Transaction, TransactionType } from '../../types/finance';
import {
  formatCurrency,
  formatDateBR,
  getCurrentMonthKey,
  RECURRENCE_LABELS,
} from '../../utils/formatters';
import { SurfaceCard } from '../ui/SurfaceCard';
import { EmptyState } from '../ui/EmptyState';
import { TransactionModal } from '../modals/TransactionModal';

type PeriodFilter = 'month' | 'quarter' | 'year' | 'all' | 'custom';

export function TransactionsView() {
  const { transactions, categories, deleteTransaction, preferences, palette } = useFinance();

  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const currentMonth = getCurrentMonthKey();
  const currentYear = currentMonth.slice(0, 4);

  const filtered = useMemo(() => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      .toISOString()
      .slice(0, 10);

    return transactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && tx.categoryId !== categoryFilter && tx.categoryName !== categoryFilter) {
        return false;
      }
      if (recurringOnly && !tx.isRecurring) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const match =
          tx.description.toLowerCase().includes(q) ||
          tx.categoryName.toLowerCase().includes(q) ||
          tx.notes.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (period === 'month' && !tx.date.startsWith(currentMonth)) return false;
      if (period === 'quarter' && tx.date < threeMonthsAgo) return false;
      if (period === 'year' && !tx.date.startsWith(currentYear)) return false;
      if (period === 'custom') {
        if (customStart && tx.date < customStart) return false;
        if (customEnd && tx.date > customEnd) return false;
      }
      return true;
    });
  }, [
    transactions,
    typeFilter,
    categoryFilter,
    recurringOnly,
    search,
    period,
    customStart,
    customEnd,
    currentMonth,
    currentYear,
  ]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let recurringCount = 0;
    for (const tx of filtered) {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
      if (tx.isRecurring) recurringCount++;
    }
    return { income, expense, net: income - expense, recurringCount };
  }, [filtered]);

  const handleOpenCreate = () => {
    setEditingTx(null);
    setModalOpen(true);
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteTransaction(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <SurfaceCard>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ['all', 'Todo o Período'],
                ['month', 'Este Mês'],
                ['quarter', 'Últimos 3 Meses'],
                ['year', 'Este Ano'],
                ['custom', 'Personalizado'],
              ] as Array<[PeriodFilter, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className="px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 min-h-[36px] border transition-colors"
                style={{
                  borderRadius: palette.radiusSmPx,
                  borderColor: period === key ? palette.accentColor : palette.borderColor,
                  backgroundColor:
                    period === key ? palette.surfaceMutedColor : 'transparent',
                  color: period === key ? palette.accentColor : palette.textSecondary,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="fos-btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Movimentação</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: palette.textSecondary }}
            />
            <input
              type="search"
              aria-label="Buscar movimentações"
              placeholder="Buscar descrição ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full fos-input pl-9 pr-3 py-2 text-xs min-h-[40px]"
            />
          </div>

          <select
            aria-label="Filtrar por tipo"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | TransactionType)}
            className="w-full fos-input px-3 py-2 text-xs min-h-[40px]"
          >
            <option value="all">Todos os tipos</option>
            <option value="income">Somente Receitas</option>
            <option value="expense">Somente Despesas</option>
          </select>

          <select
            aria-label="Filtrar por categoria"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full fos-input px-3 py-2 text-xs min-h-[40px]"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.type === 'income' ? 'Receita' : 'Despesa'})
              </option>
            ))}
          </select>

          <label
            className="flex items-center justify-between gap-2 px-3 py-2 border text-xs cursor-pointer min-h-[40px]"
            style={{
              borderColor: palette.borderColor,
              borderRadius: palette.radiusSmPx,
              backgroundColor: palette.surfaceMutedColor,
            }}
          >
            <span>Apenas recorrentes</span>
            <input
              type="checkbox"
              checked={recurringOnly}
              onChange={(e) => setRecurringOnly(e.target.checked)}
              className="w-4 h-4 accent-current"
            />
          </label>
        </div>

        {period === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label htmlFor="filter-start" className="block text-[11px] mb-1" style={{ color: palette.textSecondary }}>
                Data inicial
              </label>
              <input
                id="filter-start"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full fos-input px-3 py-2 text-xs font-num min-h-[40px]"
              />
            </div>
            <div>
              <label htmlFor="filter-end" className="block text-[11px] mb-1" style={{ color: palette.textSecondary }}>
                Data final
              </label>
              <input
                id="filter-end"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full fos-input px-3 py-2 text-xs font-num min-h-[40px]"
              />
            </div>
          </div>
        )}
      </SurfaceCard>

      {/* Period Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SurfaceCard padding="compact">
          <p className="text-[11px]" style={{ color: palette.textSecondary }}>
            Entradas no Filtro
          </p>
          <p className="text-base font-semibold font-num mt-1" style={{ color: palette.positiveColor }}>
            {formatCurrency(totals.income, preferences.currency)}
          </p>
        </SurfaceCard>
        <SurfaceCard padding="compact">
          <p className="text-[11px]" style={{ color: palette.textSecondary }}>
            Saídas no Filtro
          </p>
          <p className="text-base font-semibold font-num mt-1" style={{ color: palette.negativeColor }}>
            {formatCurrency(totals.expense, preferences.currency)}
          </p>
        </SurfaceCard>
        <SurfaceCard padding="compact">
          <p className="text-[11px]" style={{ color: palette.textSecondary }}>
            Saldo do Filtro
          </p>
          <p
            className="text-base font-semibold font-num mt-1"
            style={{ color: totals.net >= 0 ? palette.positiveColor : palette.negativeColor }}
          >
            {totals.net > 0 ? '+' : ''}
            {formatCurrency(totals.net, preferences.currency)}
          </p>
        </SurfaceCard>
        <SurfaceCard padding="compact">
          <p className="text-[11px]" style={{ color: palette.textSecondary }}>
            Registros / Recorrentes
          </p>
          <p className="text-base font-semibold font-num mt-1">
            {filtered.length} · {totals.recurringCount} rec.
          </p>
        </SurfaceCard>
      </div>

      {/* Transactions Ledger */}
      <SurfaceCard>
        {filtered.length === 0 ? (
          <EmptyState
            title="Nenhuma movimentação encontrada"
            description={
              transactions.length === 0
                ? 'Registre suas receitas e despesas para manter seu histórico financeiro atualizado.'
                : 'Nenhum registro corresponde aos filtros selecionados.'
            }
            actionLabel="Nova Movimentação"
            onAction={handleOpenCreate}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" data-testid="transactions-table">
              <thead>
                <tr
                  className="border-b text-[11px]"
                  style={{ borderColor: palette.borderColor, color: palette.textSecondary }}
                >
                  <th className="py-2.5 pr-3 font-medium">Data</th>
                  <th className="py-2.5 pr-3 font-medium">Descrição</th>
                  <th className="py-2.5 pr-3 font-medium">Categoria</th>
                  <th className="py-2.5 pr-3 font-medium">Recorrência</th>
                  <th className="py-2.5 pr-3 text-right font-medium">Valor</th>
                  <th className="py-2.5 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b last:border-b-0 text-xs"
                    style={{ borderColor: palette.borderColor, height: 'var(--fos-row-h)' }}
                  >
                    <td
                      className="py-2 pr-3 font-num whitespace-nowrap"
                      style={{ color: palette.textSecondary }}
                    >
                      {formatDateBR(tx.date)}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="font-medium">{tx.description}</div>
                      {tx.notes && (
                        <div className="text-[11px] truncate max-w-xs" style={{ color: palette.textSecondary }}>
                          {tx.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap" style={{ color: palette.textSecondary }}>
                      {tx.categoryName}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap" style={{ color: palette.textSecondary }}>
                      {tx.isRecurring ? RECURRENCE_LABELS[tx.recurrenceFrequency] : 'Única'}
                    </td>
                    <td
                      className="py-2 pr-3 text-right font-num font-semibold whitespace-nowrap"
                      style={{
                        color:
                          tx.type === 'income' ? palette.positiveColor : palette.negativeColor,
                      }}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatCurrency(tx.amount, preferences.currency)}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      {confirmDeleteId === tx.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleDelete(tx.id)}
                            className="px-2 py-1 text-[11px] font-semibold"
                            style={{
                              backgroundColor: palette.negativeColor,
                              color: '#FFFFFF',
                              borderRadius: palette.radiusSmPx,
                            }}
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-[11px] border"
                            style={{
                              borderColor: palette.borderColor,
                              borderRadius: palette.radiusSmPx,
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(tx)}
                            aria-label={`Editar '${tx.description}'`}
                            className="p-1.5 min-w-[34px] min-h-[34px] inline-flex items-center justify-center border"
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
                            onClick={() => setConfirmDeleteId(tx.id)}
                            aria-label={`Excluir '${tx.description}'`}
                            className="p-1.5 min-w-[34px] min-h-[34px] inline-flex items-center justify-center border"
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SurfaceCard>

      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editingTx}
      />
    </div>
  );
}
