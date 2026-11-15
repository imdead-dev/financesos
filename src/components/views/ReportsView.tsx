import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  ASSET_CLASS_LABELS,
  formatCurrency,
  formatDateBR,
  formatPercent,
  getTodayISO,
} from '../../utils/formatters';
import { calculateInvestmentMetrics } from '../../utils/financeMath';
import { buildCustomReport, customReportToCSV } from '../../utils/reports';
import { customReportToPDF } from '../../utils/pdfExport';
import { SurfaceCard } from '../ui/SurfaceCard';
import { EmptyState } from '../ui/EmptyState';

export function ReportsView() {
  const {
    transactions,
    savingsGoals,
    investments,
    categories,
    preferences,
    palette,
  } = useFinance();

  const today = getTodayISO();
  const monthStart = `${today.slice(0, 7)}-01`;

  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [includeIncome, setIncludeIncome] = useState(true);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [includeInvestments, setIncludeInvestments] = useState(true);
  const [includeNetWorth, setIncludeNetWorth] = useState(true);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const report = useMemo(
    () =>
      buildCustomReport(
        { transactions, savingsGoals, investments },
        {
          startDate,
          endDate,
          categoryIds: selectedCategories,
          includeIncome,
          includeExpenses,
          includeInvestments,
          includeNetWorth,
        }
      ),
    [
      transactions,
      savingsGoals,
      investments,
      startDate,
      endDate,
      selectedCategories,
      includeIncome,
      includeExpenses,
      includeInvestments,
      includeNetWorth,
    ]
  );

  const applyPreset = (preset: 'month' | 'quarter' | 'year' | 'all') => {
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }
    if (preset === 'month') {
      setStartDate(`${end.slice(0, 7)}-01`);
      setEndDate(end);
      return;
    }
    if (preset === 'quarter') {
      const q = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      setStartDate(q.toISOString().slice(0, 10));
      setEndDate(end);
      return;
    }
    setStartDate(`${now.getFullYear()}-01-01`);
    setEndDate(end);
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleExportCSV = () => {
    const csv = customReportToCSV(report, preferences.currency);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-os-relatorio-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNotice('Relatório exportado em CSV.');
  };

  const handleExportPDF = () => {
    const bytes = customReportToPDF(report, preferences.currency);
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-os-relatorio-${today}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNotice('Relatório exportado em PDF.');
  };

  const hasAnySelection =
    includeIncome || includeExpenses || includeInvestments || includeNetWorth;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold font-display">
            Gerador de Relatórios Personalizados
          </h2>
          <p className="text-xs mt-0.5" style={{ color: palette.textSecondary }}>
            Selecione o período, categorias e blocos de dados para visualizar e exportar em CSV ou PDF.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!hasAnySelection}
            onClick={handleExportCSV}
            className="fos-btn-secondary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 min-h-[40px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
          <button
            type="button"
            disabled={!hasAnySelection}
            onClick={handleExportPDF}
            className="fos-btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 min-h-[40px]"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {exportNotice && (
        <div
          role="status"
          className="px-4 py-2.5 border text-xs font-medium"
          style={{
            backgroundColor: palette.surfaceMutedColor,
            borderColor: palette.accentColor,
            borderRadius: palette.radiusSmPx,
          }}
        >
          {exportNotice}
        </div>
      )}

      {/* Filter Controls */}
      <SurfaceCard>
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
              <div>
                <label htmlFor="rep-start" className="block text-xs font-medium mb-1">
                  Data Inicial
                </label>
                <input
                  id="rep-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full fos-input px-3 py-2 text-xs font-num min-h-[40px]"
                />
              </div>
              <div>
                <label htmlFor="rep-end" className="block text-xs font-medium mb-1">
                  Data Final
                </label>
                <input
                  id="rep-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full fos-input px-3 py-2 text-xs font-num min-h-[40px]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ['month', 'Este Mês'],
                  ['quarter', 'Últimos 3 Meses'],
                  ['year', 'Este Ano'],
                  ['all', 'Todo o Período'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className="fos-btn-secondary px-3 py-1.5 text-xs font-medium min-h-[36px]"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div
            className="pt-3 border-t grid grid-cols-1 lg:grid-cols-2 gap-4"
            style={{ borderColor: palette.borderColor }}
          >
            <div>
              <p className="text-xs font-medium mb-2">Tipos de Dados no Relatório</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer min-h-[32px]">
                  <input
                    type="checkbox"
                    checked={includeIncome}
                    onChange={(e) => setIncludeIncome(e.target.checked)}
                  />
                  <span>Receitas</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer min-h-[32px]">
                  <input
                    type="checkbox"
                    checked={includeExpenses}
                    onChange={(e) => setIncludeExpenses(e.target.checked)}
                  />
                  <span>Despesas</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer min-h-[32px]">
                  <input
                    type="checkbox"
                    checked={includeInvestments}
                    onChange={(e) => setIncludeInvestments(e.target.checked)}
                  />
                  <span>Investimentos</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer min-h-[32px]">
                  <input
                    type="checkbox"
                    checked={includeNetWorth}
                    onChange={(e) => setIncludeNetWorth(e.target.checked)}
                  />
                  <span>Patrimônio & Reservas</span>
                </label>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium">Categorias de Movimentação</p>
                {selectedCategories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategories([])}
                    className="text-[11px] hover:underline"
                    style={{ color: palette.accentColor }}
                  >
                    Limpar filtro ({selectedCategories.length})
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategories([])}
                  className="px-2.5 py-1.5 text-xs border min-h-[32px]"
                  style={{
                    borderRadius: palette.radiusSmPx,
                    borderColor:
                      selectedCategories.length === 0
                        ? palette.accentColor
                        : palette.borderColor,
                    backgroundColor:
                      selectedCategories.length === 0
                        ? palette.surfaceMutedColor
                        : 'transparent',
                    color:
                      selectedCategories.length === 0
                        ? palette.accentColor
                        : palette.textSecondary,
                  }}
                >
                  Todas
                </button>
                {categories.map((c) => {
                  const active = selectedCategories.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCategory(c.id)}
                      className="px-2.5 py-1.5 text-xs border min-h-[32px]"
                      style={{
                        borderRadius: palette.radiusSmPx,
                        borderColor: active ? palette.accentColor : palette.borderColor,
                        backgroundColor: active ? palette.surfaceMutedColor : 'transparent',
                        color: active ? palette.accentColor : palette.textSecondary,
                      }}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </SurfaceCard>

      {/* Report Preview */}
      {!hasAnySelection ? (
        <SurfaceCard>
          <EmptyState
            title="Selecione ao menos um tipo de dado"
            description="Marque Receitas, Despesas, Investimentos ou Patrimônio & Reservas acima para gerar a prévia e habilitar a exportação."
            icon={<FileSpreadsheet className="w-6 h-6" />}
          />
        </SurfaceCard>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
            {includeIncome && (
              <SurfaceCard padding="compact">
                <p className="text-xs" style={{ color: palette.textSecondary }}>
                  Receitas Filtradas
                </p>
                <p
                  className="text-lg sm:text-xl font-bold font-num mt-1"
                  style={{ color: palette.positiveColor }}
                >
                  {formatCurrency(report.summary.totalIncome, preferences.currency)}
                </p>
              </SurfaceCard>
            )}
            {includeExpenses && (
              <SurfaceCard padding="compact">
                <p className="text-xs" style={{ color: palette.textSecondary }}>
                  Despesas Filtradas
                </p>
                <p
                  className="text-lg sm:text-xl font-bold font-num mt-1"
                  style={{ color: palette.negativeColor }}
                >
                  {formatCurrency(report.summary.totalExpenses, preferences.currency)}
                </p>
              </SurfaceCard>
            )}
            {(includeIncome || includeExpenses) && (
              <SurfaceCard padding="compact">
                <p className="text-xs" style={{ color: palette.textSecondary }}>
                  Resultado do Período
                </p>
                <p
                  className="text-lg sm:text-xl font-bold font-num mt-1"
                  style={{
                    color:
                      report.summary.periodNet >= 0
                        ? palette.positiveColor
                        : palette.negativeColor,
                  }}
                >
                  {formatCurrency(report.summary.periodNet, preferences.currency)}
                </p>
              </SurfaceCard>
            )}
            {includeNetWorth && (
              <SurfaceCard padding="compact">
                <p className="text-xs" style={{ color: palette.textSecondary }}>
                  Patrimônio Total Atual
                </p>
                <p
                  className="text-lg sm:text-xl font-bold font-num mt-1"
                  style={{ color: palette.accentColor }}
                >
                  {formatCurrency(report.summary.totalNetWorth, preferences.currency)}
                </p>
              </SurfaceCard>
            )}
          </div>

          {(includeIncome || includeExpenses) && (
            <SurfaceCard>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold font-display">
                  Movimentações no Relatório ({report.transactions.length})
                </h3>
              </div>
              {report.transactions.length === 0 ? (
                <p className="text-xs py-4" style={{ color: palette.textSecondary }}>
                  Nenhuma movimentação encontrada para o intervalo e categorias selecionados.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr
                        className="border-b text-left"
                        style={{
                          borderColor: palette.borderColor,
                          color: palette.textSecondary,
                        }}
                      >
                        <th className="py-2 pr-3 font-medium">Data</th>
                        <th className="py-2 pr-3 font-medium">Tipo</th>
                        <th className="py-2 pr-3 font-medium">Categoria</th>
                        <th className="py-2 pr-3 font-medium">Descrição</th>
                        <th className="py-2 text-right font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.transactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="border-b last:border-b-0"
                          style={{ borderColor: palette.borderColor }}
                        >
                          <td className="py-2.5 pr-3 font-num whitespace-nowrap">
                            {formatDateBR(tx.date)}
                          </td>
                          <td className="py-2.5 pr-3 whitespace-nowrap">
                            {tx.type === 'income' ? 'Receita' : 'Despesa'}
                          </td>
                          <td className="py-2.5 pr-3 whitespace-nowrap">
                            {tx.categoryName}
                          </td>
                          <td className="py-2.5 pr-3">{tx.description}</td>
                          <td
                            className="py-2.5 text-right font-num font-semibold whitespace-nowrap"
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
          )}

          {includeInvestments && (
            <SurfaceCard>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold font-display">
                  Carteira de Investimentos ({report.investments.length})
                </h3>
                <span className="text-xs font-num" style={{ color: palette.textSecondary }}>
                  Total atual: {formatCurrency(report.summary.investmentsCurrentValue, preferences.currency)}
                </span>
              </div>
              {report.investments.length === 0 ? (
                <p className="text-xs py-4" style={{ color: palette.textSecondary }}>
                  Nenhum investimento registrado para incluir no relatório.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr
                        className="border-b text-left"
                        style={{
                          borderColor: palette.borderColor,
                          color: palette.textSecondary,
                        }}
                      >
                        <th className="py-2 pr-3 font-medium">Ativo</th>
                        <th className="py-2 pr-3 font-medium">Classe</th>
                        <th className="py-2 pr-3 text-right font-medium">Investido</th>
                        <th className="py-2 pr-3 text-right font-medium">Valor Atual</th>
                        <th className="py-2 text-right font-medium">Retorno</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.investments.map((inv) => {
                        const m = calculateInvestmentMetrics(inv);
                        return (
                          <tr
                            key={inv.id}
                            className="border-b last:border-b-0"
                            style={{ borderColor: palette.borderColor }}
                          >
                            <td className="py-2.5 pr-3 font-medium">
                              {inv.name} {inv.ticker ? `(${inv.ticker})` : ''}
                            </td>
                            <td className="py-2.5 pr-3" style={{ color: palette.textSecondary }}>
                              {ASSET_CLASS_LABELS[inv.assetClass]}
                            </td>
                            <td className="py-2.5 pr-3 text-right font-num">
                              {formatCurrency(inv.investedAmount, preferences.currency)}
                            </td>
                            <td className="py-2.5 pr-3 text-right font-num font-semibold">
                              {formatCurrency(inv.currentAmount, preferences.currency)}
                            </td>
                            <td
                              className="py-2.5 text-right font-num font-semibold"
                              style={{
                                color:
                                  m.returnPercent >= 0
                                    ? palette.positiveColor
                                    : palette.negativeColor,
                              }}
                            >
                              {formatPercent(m.returnPercent, true)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </SurfaceCard>
          )}
        </>
      )}
    </div>
  );
}
