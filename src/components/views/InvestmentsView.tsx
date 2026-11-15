import React, { useMemo, useState } from 'react';
import { Briefcase, Edit3, Plus, Trash2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { AssetClass, ContributionEntryType, InvestmentAsset } from '../../types/finance';
import { calculateInvestmentMetrics } from '../../utils/financeMath';
import {
  ASSET_CLASS_LABELS,
  formatCurrency,
  formatDateBR,
  formatNumber,
  formatPercent,
  getTodayISO,
} from '../../utils/formatters';
import { SurfaceCard } from '../ui/SurfaceCard';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { AreaTrendChart, DonutBreakdownChart } from '../charts/FinanceCharts';

export function InvestmentsView() {
  const {
    investments,
    investmentContributions,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    addInvestmentContribution,
    preferences,
    palette,
  } = useFinance();

  const [classFilter, setClassFilter] = useState<'all' | AssetClass>('all');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<InvestmentAsset | null>(null);
  const [contribModalAsset, setContribModalAsset] = useState<InvestmentAsset | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Asset form
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [assetClass, setAssetClass] = useState<AssetClass>('fixed_income');
  const [quantity, setQuantity] = useState('1');
  const [investedAmount, setInvestedAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Contribution form
  const [entryType, setEntryType] = useState<ContributionEntryType>('contribution');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryQtyDelta, setEntryQtyDelta] = useState('0');
  const [entryDate, setEntryDate] = useState(getTodayISO());
  const [entryNote, setEntryNote] = useState('');

  const filteredAssets = useMemo(
    () =>
      investments.filter((a) => (classFilter === 'all' ? true : a.assetClass === classFilter)),
    [investments, classFilter]
  );

  const selectedAsset = useMemo(
    () =>
      investments.find((a) => a.id === selectedAssetId) ??
      filteredAssets[0] ??
      null,
    [investments, filteredAssets, selectedAssetId]
  );

  const portfolioSummary = useMemo(() => {
    const totalInvested = investments.reduce((s, a) => s + a.investedAmount, 0);
    const totalCurrent = investments.reduce((s, a) => s + a.currentAmount, 0);
    const totalReturn = totalCurrent - totalInvested;
    const totalReturnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

    const byClass = new Map<AssetClass, number>();
    for (const a of investments) {
      byClass.set(a.assetClass, (byClass.get(a.assetClass) ?? 0) + a.currentAmount);
    }
    const allocation = Array.from(byClass.entries()).map(([cls, val]) => ({
      key: cls,
      label: ASSET_CLASS_LABELS[cls],
      value: val,
      share: totalCurrent > 0 ? (val / totalCurrent) * 100 : 0,
    }));

    return { totalInvested, totalCurrent, totalReturn, totalReturnPct, allocation };
  }, [investments]);

  const selectedAssetHistory = useMemo(() => {
    if (!selectedAsset) return { logs: [], chartSeries: [] };
    const logs = investmentContributions
      .filter((c) => c.investmentId === selectedAsset.id)
      .sort((a, b) => a.date.localeCompare(b.date));

    let runningValue = 0;
    const chartSeries = logs.map((c) => {
      if (c.entryType === 'contribution') runningValue += c.amount;
      else if (c.entryType === 'withdrawal') runningValue = Math.max(0, runningValue - c.amount);
      else if (c.entryType === 'valuation') runningValue = c.amount;
      return {
        label: formatDateBR(c.date),
        value: runningValue,
      };
    });

    if (chartSeries.length === 0 && selectedAsset.currentAmount > 0) {
      chartSeries.push({ label: 'Posição Atual', value: selectedAsset.currentAmount });
    } else if (
      chartSeries.length > 0 &&
      chartSeries[chartSeries.length - 1].value !== selectedAsset.currentAmount
    ) {
      chartSeries.push({ label: 'Atual', value: selectedAsset.currentAmount });
    }

    return { logs: [...logs].reverse(), chartSeries };
  }, [selectedAsset, investmentContributions]);

  const openCreateAsset = () => {
    setEditingAsset(null);
    setName('');
    setTicker('');
    setAssetClass('fixed_income');
    setQuantity('1');
    setInvestedAmount('');
    setCurrentAmount('');
    setNotes('');
    setFormError(null);
    setAssetModalOpen(true);
  };

  const openEditAsset = (asset: InvestmentAsset) => {
    setEditingAsset(asset);
    setName(asset.name);
    setTicker(asset.ticker);
    setAssetClass(asset.assetClass);
    setQuantity(String(asset.quantity));
    setInvestedAmount(String(asset.investedAmount));
    setCurrentAmount(String(asset.currentAmount));
    setNotes(asset.notes);
    setFormError(null);
    setAssetModalOpen(true);
  };

  const openContribModal = (asset: InvestmentAsset) => {
    setContribModalAsset(asset);
    setEntryType('contribution');
    setEntryAmount('');
    setEntryQtyDelta('0');
    setEntryDate(getTodayISO());
    setEntryNote('');
    setFormError(null);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity.replace(',', '.'));
    const inv = Number(investedAmount.replace(',', '.'));
    const cur = Number((currentAmount || investedAmount).replace(',', '.'));

    if (!name.trim()) {
      setFormError('Informe o nome do ativo.');
      return;
    }
    if (!Number.isFinite(qty) || qty < 0) {
      setFormError('Quantidade inválida.');
      return;
    }
    if (!Number.isFinite(inv) || inv < 0 || !Number.isFinite(cur) || cur < 0) {
      setFormError('Valores investido e atual devem ser não-negativos.');
      return;
    }

    const payload = {
      name: name.trim(),
      ticker: ticker.trim(),
      assetClass,
      quantity: qty,
      investedAmount: inv,
      currentAmount: cur,
      notes: notes.trim(),
    };
    if (editingAsset) {
      await updateInvestment(editingAsset.id, payload);
    } else {
      await addInvestment(payload);
    }
    setAssetModalOpen(false);
  };

  const handleSaveContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribModalAsset) return;
    const amt = Number(entryAmount.replace(',', '.'));
    const qDelta = Number(entryQtyDelta.replace(',', '.')) || 0;
    if (!Number.isFinite(amt) || amt < 0) {
      setFormError('Informe um valor válido.');
      return;
    }

    await addInvestmentContribution({
      investmentId: contribModalAsset.id,
      entryType,
      amount: amt,
      quantityDelta: qDelta,
      date: entryDate,
      note:
        entryNote.trim() ||
        (entryType === 'contribution'
          ? 'Aporte adicional'
          : entryType === 'withdrawal'
            ? 'Resgate parcial'
            : 'Atualização de valor'),
      newCurrentValuation: entryType === 'valuation' ? amt : undefined,
    });
    setContribModalAsset(null);
  };

  return (
    <div className="space-y-5">
      {/* Manual Tracking Disclaimer */}
      <div
        className="px-4 py-2.5 border text-xs flex flex-wrap items-center justify-between gap-2"
        style={{
          backgroundColor: palette.surfaceMutedColor,
          borderColor: palette.borderColor,
          borderRadius: palette.radiusSmPx,
          color: palette.textSecondary,
        }}
      >
        <span>
          Módulo de acompanhamento manual de ativos. O FINANCE OS não executa ordens financeiras
          nem fornece recomendações de compra ou venda.
        </span>
        <button
          type="button"
          onClick={openCreateAsset}
          className="fos-btn-primary px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[36px]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Adicionar Ativo</span>
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <SurfaceCard padding="compact">
          <p className="text-xs" style={{ color: palette.textSecondary }}>
            Valor Total Investido
          </p>
          <p className="text-xl font-bold font-num mt-1">
            {formatCurrency(portfolioSummary.totalInvested, preferences.currency)}
          </p>
        </SurfaceCard>
        <SurfaceCard padding="compact">
          <p className="text-xs" style={{ color: palette.textSecondary }}>
            Posição Atual Consolidada
          </p>
          <p className="text-xl font-bold font-num mt-1">
            {formatCurrency(portfolioSummary.totalCurrent, preferences.currency)}
          </p>
        </SurfaceCard>
        <SurfaceCard padding="compact">
          <p className="text-xs" style={{ color: palette.textSecondary }}>
            Rentabilidade Acumulada
          </p>
          <p
            className="text-xl font-bold font-num mt-1"
            style={{
              color:
                portfolioSummary.totalReturn >= 0
                  ? palette.positiveColor
                  : palette.negativeColor,
            }}
          >
            {portfolioSummary.totalReturn >= 0 ? '+' : ''}
            {formatCurrency(portfolioSummary.totalReturn, preferences.currency)} (
            {formatPercent(portfolioSummary.totalReturnPct, true)})
          </p>
        </SurfaceCard>
      </div>

      {investments.length === 0 ? (
        <SurfaceCard>
          <EmptyState
            title="Nenhum ativo registrado na carteira"
            description="Cadastre manualmente seus ativos de renda fixa, ações, FIIs, criptomoedas ou outros investimentos para acompanhar rentabilidade e histórico de aportes."
            actionLabel="Cadastrar Primeiro Ativo"
            onAction={openCreateAsset}
            icon={<Briefcase className="w-6 h-6" />}
          />
        </SurfaceCard>
      ) : (
        <>
          {/* Class Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setClassFilter('all')}
              className="px-3 py-1.5 text-xs font-medium border whitespace-nowrap shrink-0 min-h-[36px]"
              style={{
                borderRadius: palette.radiusSmPx,
                borderColor:
                  classFilter === 'all' ? palette.accentColor : palette.borderColor,
                backgroundColor:
                  classFilter === 'all' ? palette.surfaceMutedColor : 'transparent',
                color:
                  classFilter === 'all' ? palette.accentColor : palette.textSecondary,
              }}
            >
              Todos ({investments.length})
            </button>
            {(Object.keys(ASSET_CLASS_LABELS) as AssetClass[]).map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => setClassFilter(cls)}
                className="px-3 py-1.5 text-xs font-medium border whitespace-nowrap shrink-0 min-h-[36px]"
                style={{
                  borderRadius: palette.radiusSmPx,
                  borderColor:
                    classFilter === cls ? palette.accentColor : palette.borderColor,
                  backgroundColor:
                    classFilter === cls ? palette.surfaceMutedColor : 'transparent',
                  color:
                    classFilter === cls ? palette.accentColor : palette.textSecondary,
                }}
              >
                {ASSET_CLASS_LABELS[cls]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            {/* Asset Table */}
            <SurfaceCard className="xl:col-span-7">
              <h2 className="text-sm font-semibold font-display mb-3">
                Ativos Acompanhados
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr
                      className="border-b text-[11px]"
                      style={{ borderColor: palette.borderColor, color: palette.textSecondary }}
                    >
                      <th className="py-2 pr-3 font-medium">Ativo</th>
                      <th className="py-2 pr-3 font-medium text-right">Qtd.</th>
                      <th className="py-2 pr-3 font-medium text-right">Investido</th>
                      <th className="py-2 pr-3 font-medium text-right">Atual</th>
                      <th className="py-2 pr-3 font-medium text-right">Retorno</th>
                      <th className="py-2 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((asset) => {
                      const m = calculateInvestmentMetrics(asset);
                      const isSel = selectedAsset?.id === asset.id;
                      return (
                        <tr
                          key={asset.id}
                          onClick={() => setSelectedAssetId(asset.id)}
                          className="border-b last:border-b-0 text-xs cursor-pointer transition-colors"
                          style={{
                            borderColor: palette.borderColor,
                            backgroundColor: isSel ? palette.surfaceMutedColor : 'transparent',
                            height: 'var(--fos-row-h)',
                          }}
                        >
                          <td className="py-2 pr-3">
                            <div className="font-semibold">
                              {asset.name}{' '}
                              {asset.ticker && (
                                <span className="font-num text-[11px]" style={{ color: palette.accentColor }}>
                                  {asset.ticker}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px]" style={{ color: palette.textSecondary }}>
                              {ASSET_CLASS_LABELS[asset.assetClass]}
                            </div>
                          </td>
                          <td className="py-2 pr-3 text-right font-num">
                            {formatNumber(asset.quantity)}
                          </td>
                          <td className="py-2 pr-3 text-right font-num" style={{ color: palette.textSecondary }}>
                            {formatCurrency(asset.investedAmount, preferences.currency)}
                          </td>
                          <td className="py-2 pr-3 text-right font-num font-semibold">
                            {formatCurrency(asset.currentAmount, preferences.currency)}
                          </td>
                          <td
                            className="py-2 pr-3 text-right font-num font-semibold whitespace-nowrap"
                            style={{
                              color:
                                m.returnAmount >= 0
                                  ? palette.positiveColor
                                  : palette.negativeColor,
                            }}
                          >
                            {formatPercent(m.returnPercent, true)}
                          </td>
                          <td
                            className="py-2 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {confirmDeleteId === asset.id ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    void deleteInvestment(asset.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2 py-1 text-[11px] font-semibold"
                                  style={{
                                    backgroundColor: palette.negativeColor,
                                    color: '#FFF',
                                    borderRadius: palette.radiusSmPx,
                                  }}
                                >
                                  Excluir
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
                                  Não
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openContribModal(asset)}
                                  title="Registrar aporte ou atualização"
                                  aria-label={`Aporte em '${asset.name}'`}
                                  className="px-2 py-1 text-[11px] font-medium border"
                                  style={{
                                    borderColor: palette.borderColor,
                                    borderRadius: palette.radiusSmPx,
                                    color: palette.accentColor,
                                  }}
                                >
                                  + Aporte
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditAsset(asset)}
                                  aria-label={`Editar '${asset.name}'`}
                                  className="p-1.5 border"
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
                                  onClick={() => setConfirmDeleteId(asset.id)}
                                  aria-label={`Excluir '${asset.name}'`}
                                  className="p-1.5 border"
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SurfaceCard>

            {/* Allocation Donut */}
            <SurfaceCard className="xl:col-span-5">
              <h2 className="text-sm font-semibold font-display mb-3">
                Distribuição por Classe
              </h2>
              <DonutBreakdownChart segments={portfolioSummary.allocation} />
            </SurfaceCard>
          </div>

          {/* Selected Asset Evolution & Contribution History */}
          {selectedAsset && (
            <SurfaceCard>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-semibold font-display">
                    Detalhamento: {selectedAsset.name}{' '}
                    {selectedAsset.ticker ? `(${selectedAsset.ticker})` : ''}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: palette.textSecondary }}>
                    Evolução e histórico manual de aportes e avaliações
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openContribModal(selectedAsset)}
                  className="fos-btn-secondary px-3 py-1.5 text-xs font-medium min-h-[36px]"
                >
                  Registrar Aporte / Atualizar Valor
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-7">
                  <AreaTrendChart
                    data={selectedAssetHistory.chartSeries}
                    primaryLabel={selectedAsset.ticker || selectedAsset.name}
                    height={200}
                  />
                </div>
                <div className="lg:col-span-5">
                  <h3 className="text-xs font-semibold mb-2" style={{ color: palette.textSecondary }}>
                    Histórico de Lançamentos
                  </h3>
                  {selectedAssetHistory.logs.length === 0 ? (
                    <p className="text-xs py-4" style={{ color: palette.textSecondary }}>
                      Sem registros históricos além da posição inicial.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
                      {selectedAssetHistory.logs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between gap-2 py-2 border-b last:border-b-0 text-xs"
                          style={{ borderColor: palette.borderColor }}
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {log.entryType === 'contribution'
                                ? 'Aporte'
                                : log.entryType === 'withdrawal'
                                  ? 'Resgate'
                                  : 'Atualização de Valor'}
                            </p>
                            <p className="text-[11px] truncate" style={{ color: palette.textSecondary }}>
                              {formatDateBR(log.date)} · {log.note}
                            </p>
                          </div>
                          <div className="text-right font-num shrink-0">
                            <div className="font-semibold">
                              {formatCurrency(log.amount, preferences.currency)}
                            </div>
                            {log.quantityDelta !== 0 && (
                              <div className="text-[11px]" style={{ color: palette.textSecondary }}>
                                {log.quantityDelta > 0 ? '+' : ''}
                                {formatNumber(log.quantityDelta)} un.
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </SurfaceCard>
          )}
        </>
      )}

      {/* Asset Create/Edit Modal */}
      <Modal
        open={assetModalOpen}
        onClose={() => setAssetModalOpen(false)}
        title={editingAsset ? 'Editar Ativo' : 'Novo Ativo'}
        subtitle="Acompanhamento manual de posição patrimonial."
      >
        <form onSubmit={(e) => void handleSaveAsset(e)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="asset-name" className="block text-xs font-medium mb-1">
                Nome do Ativo
              </label>
              <input
                id="asset-name"
                type="text"
                required
                maxLength={100}
                placeholder="Ex.: Tesouro Selic 2029, Bitcoin, HGLG11"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm min-h-[42px]"
              />
            </div>
            <div>
              <label htmlFor="asset-ticker" className="block text-xs font-medium mb-1">
                Código / Ticker
              </label>
              <input
                id="asset-ticker"
                type="text"
                maxLength={24}
                placeholder="Ex.: BTC, HGLG11"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num uppercase min-h-[42px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="asset-class" className="block text-xs font-medium mb-1">
                Classe do Ativo
              </label>
              <select
                id="asset-class"
                value={assetClass}
                onChange={(e) => setAssetClass(e.target.value as AssetClass)}
                className="w-full fos-input px-3 py-2 text-sm min-h-[42px]"
              >
                {(Object.keys(ASSET_CLASS_LABELS) as AssetClass[]).map((cls) => (
                  <option key={cls} value={cls}>
                    {ASSET_CLASS_LABELS[cls]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="asset-qty" className="block text-xs font-medium mb-1">
                Quantidade
              </label>
              <input
                id="asset-qty"
                type="number"
                step="any"
                min="0"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="asset-invested" className="block text-xs font-medium mb-1">
                Valor Investido
              </label>
              <input
                id="asset-invested"
                type="number"
                step="0.01"
                min="0"
                required
                value={investedAmount}
                onChange={(e) => setInvestedAmount(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
            <div>
              <label htmlFor="asset-current" className="block text-xs font-medium mb-1">
                Valor Atual
              </label>
              <input
                id="asset-current"
                type="number"
                step="0.01"
                min="0"
                required
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="asset-notes" className="block text-xs font-medium mb-1">
              Observações
            </label>
            <textarea
              id="asset-notes"
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
              onClick={() => setAssetModalOpen(false)}
              className="fos-btn-secondary px-4 py-2 text-xs font-medium min-h-[40px]"
            >
              Cancelar
            </button>
            <button type="submit" className="fos-btn-primary px-5 py-2 text-xs font-semibold min-h-[40px]">
              Salvar Ativo
            </button>
          </div>
        </form>
      </Modal>

      {/* Contribution / Valuation Modal */}
      <Modal
        open={Boolean(contribModalAsset)}
        onClose={() => setContribModalAsset(null)}
        title={`Lançamento: ${contribModalAsset?.name ?? ''}`}
      >
        <form onSubmit={(e) => void handleSaveContribution(e)} className="space-y-4">
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                ['contribution', 'Novo Aporte'],
                ['withdrawal', 'Resgate'],
                ['valuation', 'Atualizar Valor'],
              ] as Array<[ContributionEntryType, string]>
            ).map(([t, label]) => (
              <button
                key={t}
                type="button"
                onClick={() => setEntryType(t)}
                className="py-2 text-xs font-semibold border min-h-[38px]"
                style={{
                  borderRadius: palette.radiusSmPx,
                  borderColor: entryType === t ? palette.accentColor : palette.borderColor,
                  backgroundColor:
                    entryType === t ? palette.surfaceMutedColor : 'transparent',
                  color: entryType === t ? palette.accentColor : palette.textSecondary,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ic-amount" className="block text-xs font-medium mb-1">
                {entryType === 'valuation' ? 'Novo Valor Total Atual' : 'Valor da Movimentação'}
              </label>
              <input
                id="ic-amount"
                type="number"
                step="0.01"
                min="0"
                required
                value={entryAmount}
                onChange={(e) => setEntryAmount(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>

            <div>
              <label htmlFor="ic-date" className="block text-xs font-medium mb-1">
                Data
              </label>
              <input
                id="ic-date"
                type="date"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
          </div>

          {entryType !== 'valuation' && (
            <div>
              <label htmlFor="ic-qty" className="block text-xs font-medium mb-1">
                Variação de Quantidade (cotas/unidades)
              </label>
              <input
                id="ic-qty"
                type="number"
                step="any"
                value={entryQtyDelta}
                onChange={(e) => setEntryQtyDelta(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
          )}

          <div>
            <label htmlFor="ic-note" className="block text-xs font-medium mb-1">
              Observação
            </label>
            <input
              id="ic-note"
              type="text"
              maxLength={200}
              value={entryNote}
              onChange={(e) => setEntryNote(e.target.value)}
              placeholder="Ex.: Aporte mensal, marcação de mercado"
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
              onClick={() => setContribModalAsset(null)}
              className="fos-btn-secondary px-4 py-2 text-xs font-medium min-h-[40px]"
            >
              Cancelar
            </button>
            <button type="submit" className="fos-btn-primary px-5 py-2 text-xs font-semibold min-h-[40px]">
              Registrar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
