import React, { useRef, useState } from 'react';
import {
  FileText,
  Landmark,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { BankConnection, SyncMethod } from '../../types/finance';
import {
  parseBankCSVStatement,
  parseOFXStatement,
  parseOpenFinanceJSON,
} from '../../utils/bankSync';
import { formatCurrency, formatDateBR } from '../../utils/formatters';
import { SurfaceCard } from '../ui/SurfaceCard';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';

export function BankSyncView() {
  const {
    bankConnections,
    addBankConnection,
    updateBankConnection,
    deleteBankConnection,
    syncBankPayload,
    preferences,
    palette,
  } = useFinance();

  const [connectOpen, setConnectOpen] = useState(false);
  const [institutionName, setInstitutionName] = useState('');
  const [accountLabel, setAccountLabel] = useState('');
  const [syncMethod, setSyncMethod] = useState<SyncMethod>('statement');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [autoSync, setAutoSync] = useState(true);

  const [pasteModalConn, setPasteModalConn] = useState<BankConnection | null>(null);
  const [rawStatementText, setRawStatementText] = useState('');
  const [bearerTokens, setBearerTokens] = useState<Record<string, string>>({});
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const totalSyncedBalance = bankConnections.reduce((s, b) => s + (b.syncedBalance || 0), 0);
  const autoSyncCount = bankConnections.filter((b) => b.autoSync).length;

  const handleCreateConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionName.trim() || !accountLabel.trim()) return;
    if (syncMethod === 'open_finance_api' && !endpointUrl.trim()) return;
    await addBankConnection({
      institutionName: institutionName.trim(),
      accountLabel: accountLabel.trim(),
      syncMethod,
      endpointUrl: syncMethod === 'open_finance_api' ? endpointUrl.trim() : '',
      autoSync,
    });
    setInstitutionName('');
    setAccountLabel('');
    setEndpointUrl('');
    setSyncMethod('statement');
    setAutoSync(true);
    setConnectOpen(false);
    setFeedback({ kind: 'ok', text: 'Instituição conectada. Selecione um extrato ou sincronize o endpoint para importar os dados.' });
  };

  const processRawContent = async (conn: BankConnection, raw: string, filename = '') => {
    setFeedback(null);
    setSyncingId(conn.id);
    try {
      const lower = filename.toLowerCase();
      const trimmed = raw.trim();
      let parsed;
      if (lower.endsWith('.json') || trimmed.startsWith('{')) {
        parsed = parseOpenFinanceJSON(JSON.parse(trimmed));
      } else if (lower.endsWith('.ofx') || /<OFX>|<STMTTRN>/i.test(trimmed)) {
        parsed = parseOFXStatement(trimmed);
      } else {
        parsed = parseBankCSVStatement(trimmed);
      }

      if (
        parsed.balance === null &&
        parsed.transactions.length === 0 &&
        parsed.investments.length === 0
      ) {
        setFeedback({
          kind: 'err',
          text: 'Nenhuma movimentação, saldo ou investimento válido encontrado no arquivo enviado.',
        });
        return;
      }

      const result = await syncBankPayload(conn.id, parsed);
      setFeedback({
        kind: 'ok',
        text: `${conn.institutionName}: ${result.importedTransactions} nova(s) movimentação(ões) e ${result.updatedInvestments} ativo(s) sincronizado(s).`,
      });
    } catch (err) {
      setFeedback({
        kind: 'err',
        text:
          err instanceof Error
            ? `Falha ao processar extrato: ${err.message}`
            : 'Formato de arquivo inválido.',
      });
    } finally {
      setSyncingId(null);
    }
  };

  const handleFileSelected = async (
    conn: BankConnection,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await processRawContent(conn, text, file.name);
    e.target.value = '';
  };

  const handleSyncEndpoint = async (conn: BankConnection) => {
    if (!conn.endpointUrl) return;
    setFeedback(null);
    setSyncingId(conn.id);
    try {
      const token = bearerTokens[conn.id]?.trim();
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(conn.endpointUrl, { headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: unknown = await res.json();
      const parsed = parseOpenFinanceJSON(data);
      const result = await syncBankPayload(conn.id, parsed);
      setFeedback({
        kind: 'ok',
        text: `${conn.institutionName}: ${result.importedTransactions} lançamento(s) e ${result.updatedInvestments} investimento(s) importado(s) via API.`,
      });
    } catch (err) {
      await updateBankConnection(conn.id, { status: 'error' });
      setFeedback({
        kind: 'err',
        text: `Não foi possível sincronizar com ${conn.endpointUrl}: ${
          err instanceof Error ? err.message : 'erro de rede'
        }`,
      });
    } finally {
      setSyncingId(null);
    }
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteModalConn || !rawStatementText.trim()) return;
    await processRawContent(pasteModalConn, rawStatementText);
    setRawStatementText('');
    setPasteModalConn(null);
  };

  return (
    <div className="space-y-5">
      {/* Header & Primary Action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold font-display">
            Conexões Bancárias & Open Finance
          </h2>
          <p className="text-xs mt-0.5" style={{ color: palette.textSecondary }}>
            Conecte instituições via Open Finance (JSON) ou importe extratos OFX/CSV com
            deduplicação automática de lançamentos e ativos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConnectOpen(true)}
          className="fos-btn-primary px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap min-h-[42px]"
        >
          <Plus className="w-4 h-4" />
          <span>Conectar Instituição</span>
        </button>
      </div>

      {feedback && (
        <div
          role={feedback.kind === 'err' ? 'alert' : 'status'}
          className="px-4 py-3 border text-xs font-medium"
          style={{
            backgroundColor: palette.surfaceMutedColor,
            borderColor:
              feedback.kind === 'err' ? palette.negativeColor : palette.positiveColor,
            color: feedback.kind === 'err' ? palette.negativeColor : palette.positiveColor,
            borderRadius: palette.radiusSmPx,
          }}
        >
          {feedback.text}
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <SurfaceCard padding="compact">
          <p className="text-xs" style={{ color: palette.textSecondary }}>
            Instituições Conectadas
          </p>
          <p className="text-xl font-bold font-num mt-1">{bankConnections.length}</p>
        </SurfaceCard>
        <SurfaceCard padding="compact">
          <p className="text-xs" style={{ color: palette.textSecondary }}>
            Saldo Bancário Informado
          </p>
          <p className="text-xl font-bold font-num mt-1">
            {formatCurrency(totalSyncedBalance, preferences.currency)}
          </p>
        </SurfaceCard>
        <SurfaceCard padding="compact">
          <p className="text-xs" style={{ color: palette.textSecondary }}>
            Rotina Automática Ativa
          </p>
          <p className="text-xl font-bold font-num mt-1">{autoSyncCount}</p>
        </SurfaceCard>
      </div>

      {/* Connections List or Empty State */}
      {bankConnections.length === 0 ? (
        <SurfaceCard>
          <EmptyState
            title="Nenhuma conta bancária conectada"
            description="Adicione sua primeira instituição financeira para importar extratos OFX/CSV ou conectar um endpoint Open Finance compatível e manter saldo, transações e ativos atualizados."
            actionLabel="Conectar Primeira Instituição"
            onAction={() => setConnectOpen(true)}
            icon={<Landmark className="w-6 h-6" />}
          />
        </SurfaceCard>
      ) : (
        <div className="space-y-3.5">
          {bankConnections.map((conn) => {
            const isSyncing = syncingId === conn.id;
            const statusText =
              conn.status === 'connected'
                ? 'Sincronizado'
                : conn.status === 'error'
                  ? 'Falha na última sync'
                  : 'Aguardando importação';
            const statusColor =
              conn.status === 'connected'
                ? palette.positiveColor
                : conn.status === 'error'
                  ? palette.negativeColor
                  : palette.warningColor;

            return (
              <SurfaceCard key={conn.id}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold font-display">
                        {conn.institutionName}
                      </h3>
                      <span className="text-xs" style={{ color: palette.textSecondary }}>
                        · {conn.accountLabel}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: palette.textSecondary }}>
                      <span style={{ color: statusColor }} className="font-medium">
                        {statusText}
                      </span>
                      {' · '}
                      <span>
                        {conn.syncMethod === 'open_finance_api'
                          ? 'API Open Finance'
                          : 'Extrato OFX / CSV / JSON'}
                      </span>
                      {conn.lastSyncedAt && (
                        <>
                          {' · '}
                          <span className="font-num">
                            Última atualização: {formatDateBR(conn.lastSyncedAt.slice(0, 10))}
                          </span>
                        </>
                      )}
                    </p>
                    {conn.endpointUrl && (
                      <p
                        className="text-[11px] font-num truncate max-w-xl"
                        style={{ color: palette.textSecondary }}
                      >
                        {conn.endpointUrl}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-left lg:text-right mr-2">
                      <p className="text-[11px]" style={{ color: palette.textSecondary }}>
                        Saldo Informado
                      </p>
                      <p className="text-base font-bold font-num">
                        {formatCurrency(conn.syncedBalance || 0, preferences.currency)}
                      </p>
                    </div>

                    <input
                      ref={(el) => {
                        fileInputRefs.current[conn.id] = el;
                      }}
                      type="file"
                      accept=".ofx,.csv,.json,text/csv,application/json"
                      className="hidden"
                      onChange={(e) => void handleFileSelected(conn, e)}
                    />

                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => fileInputRefs.current[conn.id]?.click()}
                      className="fos-btn-secondary px-3 py-2 text-xs font-medium flex items-center gap-1.5 min-h-[38px]"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Importar OFX / CSV</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => {
                        setPasteModalConn(conn);
                        setRawStatementText('');
                      }}
                      className="fos-btn-secondary px-3 py-2 text-xs font-medium flex items-center gap-1.5 min-h-[38px]"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Colar Extrato</span>
                    </button>

                    {conn.syncMethod === 'open_finance_api' && (
                      <button
                        type="button"
                        disabled={isSyncing}
                        onClick={() => void handleSyncEndpoint(conn)}
                        className="fos-btn-primary px-3 py-2 text-xs font-semibold flex items-center gap-1.5 min-h-[38px]"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar API'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      aria-label={`Remover conexão ${conn.institutionName}`}
                      onClick={() => void deleteBankConnection(conn.id)}
                      className="p-2 border min-w-[38px] min-h-[38px] flex items-center justify-center"
                      style={{
                        borderColor: palette.borderColor,
                        borderRadius: palette.radiusSmPx,
                        color: palette.negativeColor,
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div
                  className="mt-3 pt-3 border-t flex flex-wrap items-center justify-between gap-3"
                  style={{ borderColor: palette.borderColor }}
                >
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={conn.autoSync}
                      onChange={(e) =>
                        void updateBankConnection(conn.id, { autoSync: e.target.checked })
                      }
                    />
                    <span style={{ color: palette.textSecondary }}>
                      Sincronização automática habilitada para esta conta
                    </span>
                  </label>

                  {conn.syncMethod === 'open_finance_api' && (
                    <input
                      type="password"
                      placeholder="Bearer Token opcional para API"
                      aria-label={`Token Open Finance para ${conn.institutionName}`}
                      value={bearerTokens[conn.id] ?? ''}
                      onChange={(e) =>
                        setBearerTokens((prev) => ({ ...prev, [conn.id]: e.target.value }))
                      }
                      className="fos-input px-3 py-1.5 text-xs w-full sm:w-64 min-h-[34px]"
                    />
                  )}
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      )}

      {/* Connect Institution Modal */}
      <Modal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        title="Conectar Instituição Financeira"
        subtitle="Configure uma conta bancária ou corretora para importação automática e deduplicada."
      >
        <form onSubmit={(e) => void handleCreateConnection(e)} className="space-y-4">
          <div>
            <label htmlFor="bank-institution" className="block text-xs font-medium mb-1">
              Nome da Instituição
            </label>
            <input
              id="bank-institution"
              type="text"
              required
              placeholder="Ex: Nubank, Itaú, BTG Pactual, XP"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              className="w-full fos-input px-3 py-2 text-sm min-h-[42px]"
            />
          </div>

          <div>
            <label htmlFor="bank-label" className="block text-xs font-medium mb-1">
              Identificação da Conta
            </label>
            <input
              id="bank-label"
              type="text"
              required
              placeholder="Ex: Conta Corrente Principal, Cartão Black"
              value={accountLabel}
              onChange={(e) => setAccountLabel(e.target.value)}
              className="w-full fos-input px-3 py-2 text-sm min-h-[42px]"
            />
          </div>

          <div>
            <label htmlFor="bank-method" className="block text-xs font-medium mb-1">
              Método de Sincronização
            </label>
            <select
              id="bank-method"
              value={syncMethod}
              onChange={(e) => setSyncMethod(e.target.value as SyncMethod)}
              className="w-full fos-input px-3 py-2 text-sm min-h-[42px]"
            >
              <option value="statement">Extrato Bancário (OFX / CSV / JSON)</option>
              <option value="open_finance_api">Endpoint Open Finance (JSON API)</option>
            </select>
          </div>

          {syncMethod === 'open_finance_api' && (
            <div>
              <label htmlFor="bank-endpoint" className="block text-xs font-medium mb-1">
                URL do Endpoint JSON
              </label>
              <input
                id="bank-endpoint"
                type="url"
                required
                placeholder="https://api.seubanco.com.br/open-finance/sync"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>
          )}

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
            />
            <span>Habilitar sincronização automática e deduplicação de lançamentos</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setConnectOpen(false)}
              className="fos-btn-secondary px-4 py-2 text-xs font-medium min-h-[40px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="fos-btn-primary px-5 py-2 text-xs font-semibold min-h-[40px]"
            >
              Conectar Conta
            </button>
          </div>
        </form>
      </Modal>

      {/* Paste Statement Modal */}
      <Modal
        open={Boolean(pasteModalConn)}
        onClose={() => setPasteModalConn(null)}
        title={`Importar Extrato — ${pasteModalConn?.institutionName ?? ''}`}
        subtitle="Cole o conteúdo OFX, CSV bancário brasileiro ou JSON Open Finance."
      >
        <form onSubmit={(e) => void handlePasteSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="raw-statement" className="block text-xs font-medium mb-1">
              Conteúdo do Extrato (OFX, CSV ou JSON)
            </label>
            <textarea
              id="raw-statement"
              rows={7}
              required
              placeholder={'Data;Descrição;Valor\n15/05/2025;Salário Empresa;7500,00\n16/05/2025;Supermercado;-420,50'}
              value={rawStatementText}
              onChange={(e) => setRawStatementText(e.target.value)}
              className="w-full fos-input p-3 text-xs font-num"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPasteModalConn(null)}
              className="fos-btn-secondary px-4 py-2 text-xs font-medium min-h-[40px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="fos-btn-primary px-5 py-2 text-xs font-semibold min-h-[40px]"
            >
              Processar e Sincronizar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
