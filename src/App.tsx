import React, { useEffect, useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { AppView } from './types/finance';
import { AuthScreen } from './components/views/AuthScreen';
import { AppShell } from './components/layout/AppShell';
import { DashboardView } from './components/views/DashboardView';
import { TransactionsView } from './components/views/TransactionsView';
import { SavingsView } from './components/views/SavingsView';
import { InvestmentsView } from './components/views/InvestmentsView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { CalculatorView } from './components/views/CalculatorView';
import { ThemesView } from './components/views/ThemesView';
import { SettingsView } from './components/views/SettingsView';
import { BankSyncView } from './components/views/BankSyncView';
import { ReportsView } from './components/views/ReportsView';
import { TransactionModal } from './components/modals/TransactionModal';
import { AdminLoginModal } from './components/modals/AdminLoginModal';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-950 text-zinc-100">
          <div className="max-w-md border border-zinc-800 bg-zinc-900 p-6 space-y-3">
            <h1 className="text-base font-semibold">Erro inesperado no FINANCE OS</h1>
            <p className="text-xs text-zinc-400 break-words">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-semibold bg-amber-500 text-zinc-950"
            >
              Recarregar Terminal
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function FinanceOSAppContent() {
  const { storageMode, authReady, dataLoading, palette } = useFinance();
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [quickTxOpen, setQuickTxOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setAdminModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!authReady) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-xs font-num"
        style={{ backgroundColor: palette.backgroundColor, color: palette.textSecondary }}
      >
        Inicializando FINANCE OS...
      </div>
    );
  }

  return (
    <>
      {storageMode === 'unauthenticated' ? (
        <AuthScreen />
      ) : (
        <AppShell
          activeView={activeView}
          onNavigate={setActiveView}
          onQuickTransaction={() => setQuickTxOpen(true)}
        >
          {dataLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-24 border animate-pulse"
                    style={{
                      backgroundColor: palette.surfaceColor,
                      borderColor: palette.borderColor,
                      borderRadius: palette.radiusPx,
                    }}
                  />
                ))}
              </div>
              <div
                className="h-64 border animate-pulse"
                style={{
                  backgroundColor: palette.surfaceColor,
                  borderColor: palette.borderColor,
                  borderRadius: palette.radiusPx,
                }}
              />
            </div>
          ) : (
            <>
              {activeView === 'dashboard' && (
                <DashboardView
                  onNavigate={setActiveView}
                  onNewTransaction={() => setQuickTxOpen(true)}
                />
              )}
              {activeView === 'transactions' && <TransactionsView />}
              {activeView === 'savings' && <SavingsView />}
              {activeView === 'investments' && <InvestmentsView />}
              {activeView === 'bank_sync' && <BankSyncView />}
              {activeView === 'analytics' && <AnalyticsView onNavigate={setActiveView} />}
              {activeView === 'reports' && <ReportsView />}
              {activeView === 'calculator' && <CalculatorView />}
              {activeView === 'themes' && <ThemesView />}
              {activeView === 'settings' && <SettingsView onNavigate={setActiveView} />}
            </>
          )}
        </AppShell>
      )}

      <TransactionModal open={quickTxOpen} onClose={() => setQuickTxOpen(false)} />
      <AdminLoginModal open={adminModalOpen} onClose={() => setAdminModalOpen(false)} />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <FinanceProvider>
        <FinanceOSAppContent />
      </FinanceProvider>
    </ErrorBoundary>
  );
}
