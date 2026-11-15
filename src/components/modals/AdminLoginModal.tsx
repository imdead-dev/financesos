import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useFinance } from '../../context/FinanceContext';

interface AdminLoginModalProps {
  open: boolean;
  onClose: () => void;
}

export function AdminLoginModal({ open, onClose }: AdminLoginModalProps) {
  const { loginAsAdmin, palette } = useFinance();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setError(null);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Informe o e-mail e a senha administrativa.');
      return;
    }

    setSubmitting(true);
    try {
      const valid = await loginAsAdmin(email, password);
      if (!valid) {
        setError('Credenciais administrativas inválidas.');
        return;
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Acesso Administrativo"
      subtitle="Autenticação de administrador acionada via Ctrl + Shift + A."
      maxWidthClass="max-w-md"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label htmlFor="admin-email" className="block text-xs font-medium mb-1">
            E-mail do Administrador
          </label>
          <input
            id="admin-email"
            type="email"
            required
            autoFocus
            autoComplete="username"
            placeholder="admin@dominio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full fos-input px-3 py-2 text-sm min-h-[42px]"
          />
        </div>

        <div>
          <label htmlFor="admin-password" className="block text-xs font-medium mb-1">
            Senha
          </label>
          <div className="relative">
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full fos-input pl-3 pr-11 py-2 text-sm font-num min-h-[42px]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2"
              style={{ color: palette.textSecondary }}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
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
            disabled={submitting}
            className="fos-btn-primary px-5 py-2 text-xs font-semibold flex items-center gap-1.5 min-h-[40px]"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{submitting ? 'Verificando...' : 'Entrar como Administrador'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
