import React, { useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  Briefcase,
  Calculator,
  FileSpreadsheet,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  PiggyBank,
  Plus,
  Settings,
  X,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { AppView } from '../../types/finance';

interface NavItem {
  id: AppView;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Painel', icon: LayoutDashboard },
  { id: 'transactions', label: 'Receitas & Despesas', shortLabel: 'Fluxo', icon: ArrowLeftRight },
  { id: 'savings', label: 'Economias & Metas', shortLabel: 'Metas', icon: PiggyBank },
  { id: 'investments', label: 'Investimentos', shortLabel: 'Ativos', icon: Briefcase },
  { id: 'bank_sync', label: 'Sincronização Bancária', shortLabel: 'Bancos', icon: Landmark },
  { id: 'analytics', label: 'Analytics', shortLabel: 'Análises', icon: BarChart3 },
  { id: 'reports', label: 'Relatórios', shortLabel: 'Relatórios', icon: FileSpreadsheet },
  { id: 'calculator', label: 'Calculadoras', shortLabel: 'Simular', icon: Calculator },
  { id: 'themes', label: 'Personalização', shortLabel: 'Temas', icon: Palette },
  { id: 'settings', label: 'Configurações', shortLabel: 'Ajustes', icon: Settings },
];

interface AppShellProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onQuickTransaction: () => void;
  children: React.ReactNode;
}

export function AppShell({
  activeView,
  onNavigate,
  onQuickTransaction,
  children,
}: AppShellProps) {
  const {
    preferences,
    palette,
    storageMode,
    user,
    localUser,
    isAdmin,
    adminEmail,
    logout,
  } = useFinance();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navStyle = preferences.navStyle;
  const activeNav = NAV_ITEMS.find((n) => n.id === activeView) ?? NAV_ITEMS[0];
  const isTerminal = palette.preset.headingStyle === 'terminal';

  const accountLabel =
    storageMode === 'cloud'
      ? user?.email ?? 'Conta Google'
      : localUser
        ? `${localUser.name} (${localUser.email})`
        : isAdmin
          ? `Admin: ${adminEmail}`
          : 'Armazenamento Local';

  const handleSelectView = (view: AppView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row"
      style={{
        backgroundColor: palette.backgroundColor,
        color: palette.textPrimary,
      }}
    >
      {/* Desktop Sidebar or Compact Rail */}
      {navStyle !== 'topbar' && (
        <aside
          aria-label="Navegação principal"
          className={`hidden lg:flex flex-col shrink-0 border-r sticky top-0 h-screen transition-all duration-150 ${
            navStyle === 'compact_rail' ? 'w-[76px]' : 'w-[248px]'
          }`}
          style={{
            backgroundColor: palette.surfaceColor,
            borderColor: palette.borderColor,
          }}
        >
          <div
            className={`h-16 flex items-center border-b shrink-0 ${
              navStyle === 'compact_rail' ? 'justify-center px-2' : 'justify-between px-5'
            }`}
            style={{ borderColor: palette.borderColor }}
          >
            <button
              type="button"
              onClick={() => handleSelectView('dashboard')}
              className="font-display font-bold tracking-tight text-left whitespace-nowrap shrink-0"
              style={{ color: palette.textPrimary }}
            >
              {navStyle === 'compact_rail' ? (
                <span className="text-sm font-num" style={{ color: palette.accentColor }}>
                  FOS
                </span>
              ) : (
                <span className="text-base">
                  FINANCE <span style={{ color: palette.accentColor }}>OS</span>
                </span>
              )}
            </button>
          </div>

          <nav className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectView(item.id)}
                  title={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 min-h-[40px] transition-colors text-xs font-medium whitespace-nowrap ${
                    navStyle === 'compact_rail' ? 'justify-center px-2' : 'px-3'
                  }`}
                  style={{
                    borderRadius: palette.radiusSmPx,
                    backgroundColor: isActive ? palette.surfaceMutedColor : 'transparent',
                    color: isActive ? palette.accentColor : palette.textSecondary,
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {navStyle !== 'compact_rail' && (
                    <span className="truncate">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>

          <div
            className="p-3 border-t space-y-2 shrink-0"
            style={{ borderColor: palette.borderColor }}
          >
            {navStyle !== 'compact_rail' && (
              <div className="px-2 py-1 text-[11px] truncate" style={{ color: palette.textSecondary }}>
                {accountLabel}
              </div>
            )}
            <button
              type="button"
              onClick={() => void logout()}
              title="Sair da sessão"
              aria-label="Sair da sessão"
              className={`w-full flex items-center gap-2.5 min-h-[40px] text-xs font-medium transition-colors whitespace-nowrap ${
                navStyle === 'compact_rail' ? 'justify-center px-2' : 'px-3'
              }`}
              style={{
                borderRadius: palette.radiusSmPx,
                color: palette.textSecondary,
              }}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {navStyle !== 'compact_rail' && <span>Encerrar Sessão</span>}
            </button>
          </div>
        </aside>
      )}

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header
          className="h-14 lg:h-16 border-b px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-30"
          style={{
            backgroundColor: palette.surfaceColor,
            borderColor: palette.borderColor,
            backdropFilter: palette.preset.glassBlur ? 'blur(12px)' : undefined,
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu de navegação"
              className="lg:hidden min-w-[44px] min-h-[44px] -ml-2 flex items-center justify-center"
              style={{ color: palette.textPrimary }}
            >
              <Menu className="w-5 h-5" />
            </button>

            {navStyle === 'topbar' && (
              <button
                type="button"
                onClick={() => handleSelectView('dashboard')}
                className="hidden lg:block font-display font-bold text-base mr-4 whitespace-nowrap shrink-0"
              >
                FINANCE <span style={{ color: palette.accentColor }}>OS</span>
              </button>
            )}

            <h1
              className={`font-display font-semibold truncate ${
                isTerminal ? 'text-sm tracking-wider uppercase' : 'text-base'
              }`}
            >
              {activeNav.label}
            </h1>
          </div>

          {navStyle === 'topbar' && (
            <nav
              aria-label="Navegação superior"
              className="hidden lg:flex items-center gap-1 overflow-x-auto"
            >
              {NAV_ITEMS.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectView(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className="px-3 py-2 text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
                    style={{
                      borderRadius: palette.radiusSmPx,
                      backgroundColor: isActive ? palette.surfaceMutedColor : 'transparent',
                      color: isActive ? palette.accentColor : palette.textSecondary,
                    }}
                  >
                    {item.shortLabel}
                  </button>
                );
              })}
            </nav>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSelectView('themes')}
              aria-label="Personalizar tema"
              className="hidden sm:flex fos-btn-secondary px-3 py-2 text-xs font-medium items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>{palette.preset.name}</span>
            </button>

            <button
              type="button"
              onClick={onQuickTransaction}
              className="fos-btn-primary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Movimentação</span>
              <span className="sm:hidden">Lançar</span>
            </button>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main
          className="flex-1 w-full max-w-[1440px] mx-auto px-4 lg:px-6 py-5 lg:py-6"
          style={{ gap: 'var(--fos-gap)' }}
        >
          {children}
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside
            aria-label="Menu móvel"
            className="relative w-72 max-w-[82vw] h-full border-r flex flex-col z-10"
            style={{
              backgroundColor: palette.mode === 'dark' ? '#0E1015' : '#FFFFFF',
              borderColor: palette.borderColor,
            }}
          >
            <div
              className="h-14 px-4 border-b flex items-center justify-between"
              style={{ borderColor: palette.borderColor }}
            >
              <span className="font-display font-bold text-base">
                FINANCE <span style={{ color: palette.accentColor }}>OS</span>
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fechar menu"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectView(item.id)}
                    className="w-full flex items-center gap-3 px-3 min-h-[44px] text-sm font-medium whitespace-nowrap"
                    style={{
                      borderRadius: palette.radiusSmPx,
                      backgroundColor: isActive ? palette.surfaceMutedColor : 'transparent',
                      color: isActive ? palette.accentColor : palette.textPrimary,
                    }}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div
              className="p-3 border-t"
              style={{ borderColor: palette.borderColor }}
            >
              <button
                type="button"
                onClick={() => void logout()}
                className="w-full flex items-center gap-3 px-3 min-h-[44px] text-sm font-medium"
                style={{ color: palette.textSecondary }}
              >
                <LogOut className="w-4 h-4" />
                <span>Encerrar Sessão</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
