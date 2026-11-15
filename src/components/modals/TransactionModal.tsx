import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { useFinance } from '../../context/FinanceContext';
import { RecurrenceFrequency, Transaction, TransactionType } from '../../types/finance';
import { getTodayISO } from '../../utils/formatters';

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  editing?: Transaction | null;
}

export function TransactionModal({ open, onClose, editing }: TransactionModalProps) {
  const { categories, addTransaction, updateTransaction, palette } = useFinance();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [categoryId, setCategoryId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('monthly');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === type);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setType(editing.type);
      setAmount(String(editing.amount));
      setDescription(editing.description);
      setDate(editing.date);
      setCategoryId(editing.categoryId);
      setIsRecurring(editing.isRecurring);
      setRecurrenceFrequency(
        editing.recurrenceFrequency === 'none' ? 'monthly' : editing.recurrenceFrequency
      );
      setNotes(editing.notes || '');
    } else {
      setType('expense');
      setAmount('');
      setDescription('');
      setDate(getTodayISO());
      const firstCat = categories.find((c) => c.type === 'expense');
      setCategoryId(firstCat?.id ?? '');
      setIsRecurring(false);
      setRecurrenceFrequency('monthly');
      setNotes('');
    }
  }, [open, editing, categories]);

  useEffect(() => {
    if (!open || editing) return;
    if (!filteredCategories.some((c) => c.id === categoryId)) {
      setCategoryId(filteredCategories[0]?.id ?? '');
    }
  }, [type, filteredCategories, categoryId, open, editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount.replace(',', '.'));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Informe um valor maior que zero.');
      return;
    }
    if (!description.trim()) {
      setError('Informe uma descrição para a movimentação.');
      return;
    }
    if (!date) {
      setError('Selecione uma data válida.');
      return;
    }

    const selectedCat = categories.find((c) => c.id === categoryId);
    setSaving(true);
    try {
      const payload = {
        type,
        amount: numericAmount,
        description: description.trim(),
        date,
        categoryId: selectedCat?.id ?? 'general',
        categoryName: selectedCat?.name ?? 'Geral',
        isRecurring,
        recurrenceFrequency: isRecurring ? recurrenceFrequency : ('none' as const),
        notes: notes.trim(),
      };
      if (editing) {
        await updateTransaction(editing.id, payload);
      } else {
        await addTransaction(payload);
      }
      onClose();
    } catch {
      setError('Erro ao salvar movimentação. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar Movimentação' : 'Nova Movimentação'}
      subtitle="Registre receitas ou despesas com atualização imediata de saldo."
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div
          className="grid grid-cols-2 gap-2 p-1 border"
          style={{
            backgroundColor: palette.surfaceMutedColor,
            borderColor: palette.borderColor,
            borderRadius: palette.radiusSmPx,
          }}
        >
          <button
            type="button"
            onClick={() => setType('expense')}
            className="py-2 text-xs font-semibold transition-colors min-h-[38px]"
            style={{
              borderRadius: palette.radiusSmPx,
              backgroundColor: type === 'expense' ? palette.negativeColor : 'transparent',
              color: type === 'expense' ? '#FFFFFF' : palette.textSecondary,
            }}
          >
            Despesa (Saída)
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className="py-2 text-xs font-semibold transition-colors min-h-[38px]"
            style={{
              borderRadius: palette.radiusSmPx,
              backgroundColor: type === 'income' ? palette.positiveColor : 'transparent',
              color: type === 'income' ? '#04120B' : palette.textSecondary,
            }}
          >
            Receita (Entrada)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="tx-amount" className="block text-xs font-medium mb-1">
              Valor
            </label>
            <input
              id="tx-amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
            />
          </div>

          <div>
            <label htmlFor="tx-date" className="block text-xs font-medium mb-1">
              Data
            </label>
            <input
              id="tx-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="tx-desc" className="block text-xs font-medium mb-1">
            Descrição
          </label>
          <input
            id="tx-desc"
            type="text"
            maxLength={160}
            required
            placeholder="Ex.: Salário Mensal, Aluguel, Mercado"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full fos-input px-3 py-2 text-sm min-h-[42px]"
          />
        </div>

        <div>
          <label htmlFor="tx-category" className="block text-xs font-medium mb-1">
            Categoria
          </label>
          <select
            id="tx-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full fos-input px-3 py-2 text-sm min-h-[42px]"
          >
            {filteredCategories.length === 0 && <option value="general">Geral</option>}
            {filteredCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div
          className="p-3 border space-y-3"
          style={{
            borderColor: palette.borderColor,
            borderRadius: palette.radiusSmPx,
            backgroundColor: palette.surfaceMutedColor,
          }}
        >
          <label className="flex items-center justify-between gap-3 cursor-pointer text-xs font-medium">
            <span>Movimentação recorrente</span>
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 accent-current"
            />
          </label>
          {isRecurring && (
            <div>
              <label htmlFor="tx-freq" className="block text-xs mb-1" style={{ color: palette.textSecondary }}>
                Frequência
              </label>
              <select
                id="tx-freq"
                value={recurrenceFrequency}
                onChange={(e) => setRecurrenceFrequency(e.target.value as RecurrenceFrequency)}
                className="w-full fos-input px-3 py-2 text-xs min-h-[38px]"
              >
                <option value="monthly">Mensal</option>
                <option value="weekly">Semanal</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="tx-notes" className="block text-xs font-medium mb-1">
            Observações (opcional)
          </label>
          <textarea
            id="tx-notes"
            rows={2}
            maxLength={400}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalhes adicionais..."
            className="w-full fos-input px-3 py-2 text-xs"
          />
        </div>

        {error && (
          <p className="text-xs font-medium" role="alert" style={{ color: palette.negativeColor }}>
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="fos-btn-secondary px-4 py-2 text-xs font-medium min-h-[40px]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="fos-btn-primary px-5 py-2 text-xs font-semibold min-h-[40px]"
          >
            {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Registrar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
