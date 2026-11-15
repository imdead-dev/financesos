import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { completePasswordReset, requestPasswordReset } from '../../utils/userAuth';

type AuthMode = 'login' | 'register' | 'recovery';

export function AuthScreen() {
  const {
    signInWithGoogle,
    loginLocalUser,
    registerUser,
    enterLocalWorkspace,
    authError,
    palette,
  } = useFinance();

  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Password recovery state
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'confirm'>('request');
  const [recoveryCodeIssued, setRecoveryCodeIssued] = useState<string | null>(null);
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setFormError(null);
    setFormSuccess(null);
    if (next === 'recovery') {
      setRecoveryStep('request');
      setRecoveryCodeIssued(null);
      setRecoveryCodeInput('');
      setNewPassword('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const res = await loginLocalUser(email, password);
        if (!res.ok) setFormError(res.error ?? 'Erro ao autenticar.');
      } else if (mode === 'register') {
        const res = await registerUser(name, email, password);
        if (!res.ok) setFormError(res.error ?? 'Erro ao criar conta.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    const res = requestPasswordReset(email);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    setRecoveryCodeIssued(res.code);
    setRecoveryStep('confirm');
  };

  const handleConfirmRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);
    try {
      const res = await completePasswordReset({
        email,
        code: recoveryCodeInput,
        newPassword,
      });
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      setMode('login');
      setPassword('');
      setRecoveryCodeIssued(null);
      setRecoveryCodeInput('');
      setNewPassword('');
      setFormSuccess('Senha redefinida com sucesso. Entre com sua nova senha.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = formError || authError;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ backgroundColor: palette.backgroundColor, color: palette.textPrimary }}
    >
      <div
        className="w-full max-w-md border p-7 sm:p-8"
        style={{
          backgroundColor: palette.surfaceColor,
          borderColor: palette.borderColor,
          borderRadius: palette.radiusPx,
        }}
      >
        <div className="mb-6">
          <p className="text-xs font-num tracking-wider" style={{ color: palette.accentColor }}>
            FINANCE OS
          </p>
          <h1 className="text-2xl font-bold font-display mt-1.5 leading-tight">
            Terminal Financeiro Pessoal
          </h1>
          <p className="text-xs sm:text-sm mt-1.5 leading-relaxed" style={{ color: palette.textSecondary }}>
            Acesse sua conta para manter patrimônio, metas e fluxo de caixa sincronizados e
            protegidos.
          </p>
        </div>

        {/* Auth Mode Tabs: Entrar | Criar Conta */}
        {mode !== 'recovery' ? (
          <div
            className="grid grid-cols-2 gap-1.5 p-1 border mb-5"
            role="tablist"
            aria-label="Modo de autenticação"
            style={{
              backgroundColor: palette.surfaceMutedColor,
              borderColor: palette.borderColor,
              borderRadius: palette.radiusSmPx,
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => switchMode('login')}
              className="py-2 text-xs font-semibold min-h-[38px] transition-colors"
              style={{
                borderRadius: palette.radiusSmPx,
                backgroundColor: mode === 'login' ? palette.surfaceColor : 'transparent',
                color: mode === 'login' ? palette.accentColor : palette.textSecondary,
              }}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => switchMode('register')}
              className="py-2 text-xs font-semibold min-h-[38px] transition-colors"
              style={{
                borderRadius: palette.radiusSmPx,
                backgroundColor: mode === 'register' ? palette.surfaceColor : 'transparent',
                color: mode === 'register' ? palette.accentColor : palette.textSecondary,
              }}
            >
              Criar Conta
            </button>
          </div>
        ) : (
          <div className="mb-4 flex items-center justify-between border-b pb-3" style={{ borderColor: palette.borderColor }}>
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4" style={{ color: palette.accentColor }} />
              <span className="text-xs font-semibold font-display">Recuperação de Senha</span>
            </div>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-xs flex items-center gap-1 hover:opacity-80 min-h-[36px] px-2"
              style={{ color: palette.textSecondary }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
          </div>
        )}

        {formSuccess && (
          <div
            className="p-2.5 border text-xs mb-3.5"
            role="status"
            style={{
              borderColor: palette.positiveColor,
              color: palette.positiveColor,
              borderRadius: palette.radiusSmPx,
              backgroundColor: palette.surfaceMutedColor,
            }}
          >
            {formSuccess}
          </div>
        )}

        {mode !== 'recovery' ? (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name" className="block text-xs font-medium mb-1">
                  Nome Completo
                </label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  minLength={2}
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full fos-input px-3 py-2 text-sm min-h-[42px]"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium mb-1">
                E-mail
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm min-h-[42px]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="auth-password" className="block text-xs font-medium">
                  Senha
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('recovery')}
                    className="text-[11px] font-medium hover:underline"
                    style={{ color: palette.accentColor }}
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full fos-input pl-3 pr-11 py-2 text-sm min-h-[42px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2"
                  style={{ color: palette.textSecondary }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {displayError && (
              <div
                className="p-2.5 border text-xs"
                role="alert"
                style={{
                  borderColor: palette.negativeColor,
                  color: palette.negativeColor,
                  borderRadius: palette.radiusSmPx,
                  backgroundColor: palette.surfaceMutedColor,
                }}
              >
                {displayError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full fos-btn-primary px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 min-h-[44px]"
            >
              {mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{submitting ? 'Autenticando...' : 'Entrar na Conta'}</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>{submitting ? 'Criando Conta...' : 'Criar Conta e Acessar'}</span>
                </>
              )}
            </button>
          </form>
        ) : recoveryStep === 'request' ? (
          <form onSubmit={handleRequestRecovery} className="space-y-3.5">
            <p className="text-xs leading-relaxed" style={{ color: palette.textSecondary }}>
              Informe o e-mail da conta cadastrada para gerar um código temporário de redefinição.
              Para contas Google, utilize a recuperação oficial da sua Conta Google.
            </p>
            <div>
              <label htmlFor="rec-email" className="block text-xs font-medium mb-1">
                E-mail Cadastrado
              </label>
              <input
                id="rec-email"
                type="email"
                required
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm min-h-[42px]"
              />
            </div>

            {displayError && (
              <div
                className="p-2.5 border text-xs"
                role="alert"
                style={{
                  borderColor: palette.negativeColor,
                  color: palette.negativeColor,
                  borderRadius: palette.radiusSmPx,
                  backgroundColor: palette.surfaceMutedColor,
                }}
              >
                {displayError}
              </div>
            )}

            <button
              type="submit"
              className="w-full fos-btn-primary px-4 py-2.5 text-sm font-semibold min-h-[44px]"
            >
              Gerar Código de Recuperação
            </button>
          </form>
        ) : (
          <form onSubmit={(e) => void handleConfirmRecovery(e)} className="space-y-3.5">
            {recoveryCodeIssued && (
              <div
                className="p-3 border text-xs space-y-1"
                style={{
                  borderColor: palette.accentColor,
                  borderRadius: palette.radiusSmPx,
                  backgroundColor: palette.surfaceMutedColor,
                }}
              >
                <p style={{ color: palette.textSecondary }}>
                  Código de verificação emitido para <strong style={{ color: palette.textPrimary }}>{email}</strong>:
                </p>
                <p className="text-base font-bold font-num tracking-widest" style={{ color: palette.accentColor }}>
                  {recoveryCodeIssued}
                </p>
              </div>
            )}

            <div>
              <label htmlFor="rec-code" className="block text-xs font-medium mb-1">
                Código de 6 dígitos
              </label>
              <input
                id="rec-code"
                type="text"
                required
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={recoveryCodeInput}
                onChange={(e) => setRecoveryCodeInput(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm font-num min-h-[42px]"
              />
            </div>

            <div>
              <label htmlFor="rec-new-pass" className="block text-xs font-medium mb-1">
                Nova Senha
              </label>
              <input
                id="rec-new-pass"
                type="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full fos-input px-3 py-2 text-sm min-h-[42px]"
              />
            </div>

            {displayError && (
              <div
                className="p-2.5 border text-xs"
                role="alert"
                style={{
                  borderColor: palette.negativeColor,
                  color: palette.negativeColor,
                  borderRadius: palette.radiusSmPx,
                  backgroundColor: palette.surfaceMutedColor,
                }}
              >
                {displayError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full fos-btn-primary px-4 py-2.5 text-sm font-semibold min-h-[44px]"
            >
              {submitting ? 'Redefinindo...' : 'Confirmar Nova Senha'}
            </button>
          </form>
        )}

        <div className="my-5 flex items-center gap-3 text-[11px]" style={{ color: palette.textSecondary }}>
          <div className="flex-1 h-px" style={{ backgroundColor: palette.borderColor }} />
          <span>ou acesse via</span>
          <div className="flex-1 h-px" style={{ backgroundColor: palette.borderColor }} />
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="w-full fos-btn-secondary px-4 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 min-h-[42px]"
          >
            <ShieldCheck className="w-4 h-4" style={{ color: palette.accentColor }} />
            <span>Entrar com Google (Nuvem Segura)</span>
          </button>

          <button
            type="button"
            onClick={enterLocalWorkspace}
            className="w-full px-4 py-2 text-xs font-medium flex items-center justify-center gap-1.5 min-h-[38px] transition-opacity hover:opacity-85"
            style={{ color: palette.textSecondary }}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Continuar sem conta (Modo Local)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
