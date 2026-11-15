import React, { useRef, useState } from 'react';
import {
  Download,
  Palette,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { AppView, CurrencyCode, TransactionType } from '../../types/finance';
import { parseBackupJSON, transactionsToCSV } from '../../utils/financeMath';
import { listSafeLocalUsers } from '../../utils/userAuth';
import { SurfaceCard } from '../ui/SurfaceCard';

interface SettingsViewProps {
  onNavigate: (view: AppView) => void;
}

export function SettingsView({ onNavigate }: SettingsViewProps) {
  const {
    storageMode,
    user,
    localUser,
    isAdmin,
    adminEmail,
    exitAdminSession,
    signInWithGoogle,
    preferences,
    updatePreferences,
    categories,
    addCategory,
    deleteCategory,
    transactions,
    savingsGoals,
    savingsDeposits,
    investments,
    investmentContributions,
    bankConnections,
    restoreBackup,
    clearAllData,
    palette,
  } = useFinance();

  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<TransactionType>('expense');
  const [catColor, setCatColor] = useState('#10B981');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    await addCategory({ name: catName.trim(), type: catType, color: catColor });
    setCatName('');
    setStatusMessage('Categoria adicionada.');
  };

  const handleExportCSV = () => {
    const csv = transactionsToCSV(transactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-os-movimentacoes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Arquivo CSV exportado.');
  };

  const handleExportBackup = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      preferences,
      categories,
      transactions,
      savingsGoals,
      savingsDeposits,
      investments,
      investmentContributions,
      bankConnections,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Backup JSON completo gerado.');
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseBackupJSON(text);
    if (!parsed) {
      setStatusMessage('Arquivo de backup inválido.');
      return;
    }
    await restoreBackup(parsed);
    setStatusMessage('Backup restaurado com sucesso.');
    e.target.value = '';
  };

  const handleClearAll = async () => {
    await clearAllData();
    setConfirmReset(false);
    setStatusMessage('Todos os registros financeiros foram removidos.');
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {statusMessage && (
        <div
          className="px-4 py-2.5 border text-xs font-medium"
          role="status"
          style={{
            backgroundColor: palette.surfaceMutedColor,
            borderColor: palette.accentColor,
            borderRadius: palette.radiusSmPx,
            color: palette.textPrimary,
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Account & Persistence */}
      <SurfaceCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold font-display">
              Conta & Armazenamento
            </h2>
            <p className="text-xs mt-1" style={{ color: palette.textSecondary }}>
              {storageMode === 'cloud'
                ? `Conectado como ${user?.email ?? 'usuário autenticado'} · Sincronização ativa no Cloud Firestore.`
                : localUser
                  ? `Conta local ativa: ${localUser.name} (${localUser.email}) · Dados isolados no navegador.`
                  : 'Operando em Modo Local persistente no navegador.'}
            </p>
          </div>
          {storageMode === 'local' && (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="fos-btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-2 min-h-[40px]"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Conectar Conta Google</span>
            </button>
          )}
        </div>
      </SurfaceCard>

      {isAdmin && (
        <SurfaceCard>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold font-display" style={{ color: palette.accentColor }}>
                Sessão Administrativa
              </h2>
              <p className="text-xs mt-0.5" style={{ color: palette.textSecondary }}>
                Autenticado como {adminEmail}
              </p>
            </div>
            <button
              type="button"
              onClick={exitAdminSession}
              className="fos-btn-secondary px-3 py-1.5 text-xs font-medium min-h-[36px]"
            >
              Encerrar Modo Admin
            </button>
          </div>

          <div className="text-xs space-y-2 border-t pt-3" style={{ borderColor: palette.borderColor }}>
            <p className="font-medium" style={{ color: palette.textSecondary }}>
              Contas de Usuário Registradas Localmente ({listSafeLocalUsers().length})
            </p>
            {listSafeLocalUsers().length === 0 ? (
              <p style={{ color: palette.textSecondary }}>
                Nenhuma conta local cadastrada neste navegador.
              </p>
            ) : (
              <div className="space-y-1.5">
                {listSafeLocalUsers().map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 border"
                    style={{
                      borderColor: palette.borderColor,
                      borderRadius: palette.radiusSmPx,
                      backgroundColor: palette.surfaceMutedColor,
                    }}
                  >
                    <span className="font-medium">{u.name}</span>
                    <span className="font-num" style={{ color: palette.textSecondary }}>
                      {u.email}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SurfaceCard>
      )}

      {/* Currency & Theme Shortcut */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SurfaceCard>
          <h2 className="text-sm font-semibold font-display mb-1">
            Moeda & Formatação
          </h2>
          <p className="text-xs mb-3" style={{ color: palette.textSecondary }}>
            Padrão brasileiro (BRL R$) configurado por padrão.
          </p>
          <label htmlFor="settings-currency" className="block text-xs font-medium mb-1">
            Moeda Principal
          </label>
          <select
            id="settings-currency"
            value={preferences.currency}
            onChange={(e) =>
              void updatePreferences({ currency: e.target.value as CurrencyCode })
            }
            className="w-full fos-input px-3 py-2 text-sm min-h-[42px]"
          >
            <option value="BRL">BRL (R$) — Real Brasileiro</option>
            <option value="USD">USD ($) — Dólar Americano</option>
            <option value="EUR">EUR (€) — Euro</option>
          </select>
        </SurfaceCard>

        <SurfaceCard>
          <h2 className="text-sm font-semibold font-display mb-1">
            Aparência & Temas
          </h2>
          <p className="text-xs mb-3" style={{ color: palette.textSecondary }}>
            Tema atual: <strong style={{ color: palette.textPrimary }}>{palette.preset.name}</strong>
          </p>
          <button
            type="button"
            onClick={() => onNavigate('themes')}
            className="fos-btn-secondary px-4 py-2 text-xs font-semibold flex items-center gap-2 min-h-[42px]"
          >
            <Palette className="w-4 h-4" />
            <span>Abrir Estúdio de Temas</span>
          </button>
        </SurfaceCard>
      </div>

      {/* Category Management */}
      <SurfaceCard>
        <h2 className="text-sm font-semibold font-display mb-1">
          Gerenciamento de Categorias
        </h2>
        <p className="text-xs mb-4" style={{ color: palette.textSecondary }}>
          Adicione categorias personalizadas para classificar suas receitas e despesas.
        </p>

        <form onSubmit={(e) => void handleAddCategory(e)} className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            maxLength={60}
            required
            aria-label="Nome da nova categoria"
            placeholder="Nome da categoria..."
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            className="flex-1 min-w-[180px] fos-input px-3 py-2 text-xs min-h-[40px]"
          />
          <select
            aria-label="Tipo da categoria"
            value={catType}
            onChange={(e) => setCatType(e.target.value as TransactionType)}
            className="fos-input px-3 py-2 text-xs min-h-[40px]"
          >
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </select>
          <input
            type="color"
            aria-label="Cor da categoria"
            value={catColor}
            onChange={(e) => setCatColor(e.target.value)}
            className="w-10 h-10 p-0 border cursor-pointer bg-transparent"
            style={{ borderColor: palette.borderColor, borderRadius: palette.radiusSmPx }}
          />
          <button
            type="submit"
            className="fos-btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 min-h-[40px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar</span>
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between gap-2 px-3 py-2 border text-xs"
              style={{
                borderColor: palette.borderColor,
                borderRadius: palette.radiusSmPx,
                backgroundColor: palette.surfaceMutedColor,
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 shrink-0"
                  style={{ backgroundColor: cat.color, borderRadius: '2px' }}
                />
                <span className="font-medium truncate">{cat.name}</span>
                <span style={{ color: palette.textSecondary }}>
                  · {cat.type === 'income' ? 'Receita' : 'Despesa'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void deleteCategory(cat.id)}
                aria-label={`Excluir categoria '${cat.name}'`}
                className="p-1"
                style={{ color: palette.negativeColor }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </SurfaceCard>

      {/* Export, Backup & Restore */}
      <SurfaceCard>
        <h2 className="text-sm font-semibold font-display mb-1">
          Exportação, Backup & Restauração
        </h2>
        <p className="text-xs mb-4" style={{ color: palette.textSecondary }}>
          Exporte planilhas CSV para análise externa ou gere uma cópia completa em JSON.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="fos-btn-secondary px-4 py-2 text-xs font-medium flex items-center gap-2 min-h-[40px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Movimentações (CSV)</span>
          </button>
          <button
            type="button"
            onClick={handleExportBackup}
            className="fos-btn-secondary px-4 py-2 text-xs font-medium flex items-center gap-2 min-h-[40px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Gerar Backup Completo (JSON)</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="fos-btn-secondary px-4 py-2 text-xs font-medium flex items-center gap-2 min-h-[40px]"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Restaurar Backup (JSON)</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={(e) => void handleRestoreFile(e)}
            className="hidden"
          />
        </div>
      </SurfaceCard>

      {/* Danger Zone */}
      <SurfaceCard>
        <h2 className="text-sm font-semibold font-display mb-1" style={{ color: palette.negativeColor }}>
          Apagar Todos os Registros
        </h2>
        <p className="text-xs mb-3" style={{ color: palette.textSecondary }}>
          Remove todas as movimentações, metas de economia e investimentos registrados. Suas
          preferências visuais e categorias são mantidas.
        </p>

        {confirmReset ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleClearAll()}
              className="px-4 py-2 text-xs font-semibold min-h-[40px]"
              style={{
                backgroundColor: palette.negativeColor,
                color: '#FFFFFF',
                borderRadius: palette.radiusSmPx,
              }}
            >
              Confirmar Exclusão Permanente
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="fos-btn-secondary px-4 py-2 text-xs font-medium min-h-[40px]"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="px-4 py-2 text-xs font-semibold border min-h-[40px]"
            style={{
              borderColor: palette.negativeColor,
              color: palette.negativeColor,
              borderRadius: palette.radiusSmPx,
            }}
          >
            Limpar Base de Dados
          </button>
        )}
      </SurfaceCard>
    </div>
  );
}
