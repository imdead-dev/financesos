import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  AssetClass,
  BankConnection,
  Category,
  ConnectionStatus,
  ContributionEntryType,
  FinanceBackupPayload,
  InvestmentAsset,
  InvestmentContribution,
  RecurrenceFrequency,
  SavingsDeposit,
  SavingsGoal,
  SyncMethod,
  Transaction,
  TransactionType,
  UserPreferences,
} from '../types/finance';
import {
  DEFAULT_PREFERENCES,
  EffectivePalette,
  applyThemeToDocument,
  resolveEffectivePalette,
} from '../utils/themes';
import {
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
} from '../firebase/firebaseClient';
import { getTodayISO } from '../utils/formatters';
import { verifyAdminCredentials } from '../utils/adminAuth';
import {
  ParsedBankSyncResult,
  deduplicateImportedTransactions,
} from '../utils/bankSync';
import {
  SafeLocalUser,
  authenticateLocalUser,
  clearActiveLocalUser,
  getActiveLocalUser,
  getWorkspaceKeyForAccount,
  registerLocalUser,
} from '../utils/userAuth';

type StorageMode = 'unauthenticated' | 'cloud' | 'local';

interface LocalWorkspaceData {
  preferences: UserPreferences;
  categories: Category[];
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  savingsDeposits: SavingsDeposit[];
  investments: InvestmentAsset[];
  investmentContributions: InvestmentContribution[];
  bankConnections: BankConnection[];
}

const LOCAL_PREFS_KEY = 'finance_os_prefs_v1';
const ADMIN_SESSION_KEY = 'finance_os_admin_v1';

const DEFAULT_CATEGORIES_SEED: Array<{ name: string; type: TransactionType; color: string }> = [
  { name: 'Salário', type: 'income', color: '#10B981' },
  { name: 'Pró-labore / Freelance', type: 'income', color: '#38BDF8' },
  { name: 'Dividendos & Rendimentos', type: 'income', color: '#34D399' },
  { name: 'Outras Receitas', type: 'income', color: '#A3E635' },
  { name: 'Moradia', type: 'expense', color: '#F59E0B' },
  { name: 'Alimentação', type: 'expense', color: '#EF4444' },
  { name: 'Transporte', type: 'expense', color: '#818CF8' },
  { name: 'Saúde', type: 'expense', color: '#EC4899' },
  { name: 'Assinaturas & Serviços', type: 'expense', color: '#A855F7' },
  { name: 'Lazer & Educação', type: 'expense', color: '#06B6D4' },
];

function createId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

function loadInitialPrefs(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(LOCAL_PREFS_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function createEmptyLocalWorkspace(prefs: UserPreferences): LocalWorkspaceData {
  const categories: Category[] = DEFAULT_CATEGORIES_SEED.map((c, idx) => ({
    id: `cat_default_${idx + 1}`,
    userId: 'local',
    name: c.name,
    type: c.type,
    color: c.color,
  }));
  return {
    preferences: prefs,
    categories,
    transactions: [],
    savingsGoals: [],
    savingsDeposits: [],
    investments: [],
    investmentContributions: [],
    bankConnections: [],
  };
}

function loadLocalWorkspace(accountId: string | null = null): LocalWorkspaceData {
  const prefs = loadInitialPrefs();
  if (typeof window === 'undefined') return createEmptyLocalWorkspace(prefs);
  try {
    const key = getWorkspaceKeyForAccount(accountId);
    const raw = localStorage.getItem(key);
    if (!raw) return createEmptyLocalWorkspace(prefs);
    const parsed = JSON.parse(raw) as Partial<LocalWorkspaceData>;
    return {
      preferences: { ...DEFAULT_PREFERENCES, ...(parsed.preferences ?? prefs) },
      categories:
        Array.isArray(parsed.categories) && parsed.categories.length > 0
          ? parsed.categories
          : createEmptyLocalWorkspace(prefs).categories,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      savingsGoals: Array.isArray(parsed.savingsGoals) ? parsed.savingsGoals : [],
      savingsDeposits: Array.isArray(parsed.savingsDeposits) ? parsed.savingsDeposits : [],
      investments: Array.isArray(parsed.investments) ? parsed.investments : [],
      investmentContributions: Array.isArray(parsed.investmentContributions)
        ? parsed.investmentContributions
        : [],
      bankConnections: Array.isArray(parsed.bankConnections) ? parsed.bankConnections : [],
    };
  } catch {
    return createEmptyLocalWorkspace(prefs);
  }
}

export interface FinanceContextValue {
  storageMode: StorageMode;
  authReady: boolean;
  dataLoading: boolean;
  user: User | null;
  localUser: SafeLocalUser | null;
  isAdmin: boolean;
  adminEmail: string | null;
  authError: string | null;
  preferences: UserPreferences;
  palette: EffectivePalette;
  categories: Category[];
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  savingsDeposits: SavingsDeposit[];
  investments: InvestmentAsset[];
  investmentContributions: InvestmentContribution[];
  bankConnections: BankConnection[];
  signInWithGoogle: () => Promise<void>;
  loginLocalUser: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  registerUser: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  loginAsAdmin: (email: string, password: string) => Promise<boolean>;
  exitAdminSession: () => void;
  enterLocalWorkspace: () => void;
  logout: () => Promise<void>;
  updatePreferences: (next: Partial<UserPreferences>) => Promise<void>;
  addCategory: (input: { name: string; type: TransactionType; color: string }) => Promise<void>;
  updateCategory: (id: string, input: { name: string; type: TransactionType; color: string }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addTransaction: (input: {
    type: TransactionType;
    amount: number;
    description: string;
    date: string;
    categoryId: string;
    categoryName: string;
    isRecurring: boolean;
    recurrenceFrequency: RecurrenceFrequency;
    notes: string;
  }) => Promise<void>;
  updateTransaction: (
    id: string,
    input: {
      type: TransactionType;
      amount: number;
      description: string;
      date: string;
      categoryId: string;
      categoryName: string;
      isRecurring: boolean;
      recurrenceFrequency: RecurrenceFrequency;
      notes: string;
    }
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addSavingsGoal: (input: {
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    notes: string;
  }) => Promise<void>;
  updateSavingsGoal: (
    id: string,
    input: {
      name: string;
      targetAmount: number;
      currentAmount: number;
      targetDate: string;
      notes: string;
    }
  ) => Promise<void>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  addSavingsDeposit: (input: {
    goalId: string;
    amount: number;
    date: string;
    note: string;
  }) => Promise<void>;
  addInvestment: (input: {
    name: string;
    ticker: string;
    assetClass: AssetClass;
    quantity: number;
    investedAmount: number;
    currentAmount: number;
    notes: string;
  }) => Promise<void>;
  updateInvestment: (
    id: string,
    input: {
      name: string;
      ticker: string;
      assetClass: AssetClass;
      quantity: number;
      investedAmount: number;
      currentAmount: number;
      notes: string;
    }
  ) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  addInvestmentContribution: (input: {
    investmentId: string;
    entryType: ContributionEntryType;
    amount: number;
    quantityDelta: number;
    date: string;
    note: string;
    newCurrentValuation?: number;
  }) => Promise<void>;
  addBankConnection: (input: {
    institutionName: string;
    accountLabel: string;
    syncMethod: SyncMethod;
    endpointUrl: string;
    autoSync: boolean;
  }) => Promise<string>;
  updateBankConnection: (
    id: string,
    input: Partial<{
      institutionName: string;
      accountLabel: string;
      syncMethod: SyncMethod;
      endpointUrl: string;
      syncedBalance: number;
      autoSync: boolean;
      lastSyncedAt: string;
      status: ConnectionStatus;
    }>
  ) => Promise<void>;
  deleteBankConnection: (id: string) => Promise<void>;
  syncBankPayload: (
    connectionId: string,
    parsed: ParsedBankSyncResult
  ) => Promise<{ importedTransactions: number; updatedInvestments: number }>;
  restoreBackup: (payload: FinanceBackupPayload) => Promise<void>;
  clearAllData: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [localUser, setLocalUser] = useState<SafeLocalUser | null>(() =>
    typeof window !== 'undefined' ? getActiveLocalUser() : null
  );
  const [adminEmail, setAdminEmail] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(ADMIN_SESSION_KEY) : null
  );
  const isAdmin = Boolean(adminEmail);

  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<StorageMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (
        params.get('autostart') === '1' ||
        localStorage.getItem('finance_os_local_active') === '1' ||
        getActiveLocalUser() !== null ||
        localStorage.getItem(ADMIN_SESSION_KEY) !== null
      ) {
        return 'local';
      }
    }
    return 'unauthenticated';
  });

  const [localData, setLocalData] = useState<LocalWorkspaceData>(() =>
    loadLocalWorkspace(typeof window !== 'undefined' ? getActiveLocalUser()?.id ?? null : null)
  );
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudPrefs, setCloudPrefs] = useState<UserPreferences | null>(null);
  const [cloudCategories, setCloudCategories] = useState<Category[]>([]);
  const [cloudTransactions, setCloudTransactions] = useState<Transaction[]>([]);
  const [cloudGoals, setCloudGoals] = useState<SavingsGoal[]>([]);
  const [cloudDeposits, setCloudDeposits] = useState<SavingsDeposit[]>([]);
  const [cloudInvestments, setCloudInvestments] = useState<InvestmentAsset[]>([]);
  const [cloudContributions, setCloudContributions] = useState<InvestmentContribution[]>([]);
  const [cloudBankConnections, setCloudBankConnections] = useState<BankConnection[]>([]);

  const preferences = useMemo(
    () => (storageMode === 'cloud' && cloudPrefs ? cloudPrefs : localData.preferences),
    [storageMode, cloudPrefs, localData.preferences]
  );

  const palette = useMemo(() => resolveEffectivePalette(preferences), [preferences]);

  useEffect(() => {
    applyThemeToDocument(preferences);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(preferences));
    }
  }, [preferences]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = getWorkspaceKeyForAccount(localUser?.id ?? null);
      localStorage.setItem(key, JSON.stringify(localData));
    }
  }, [localData, localUser?.id]);

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (firebaseUser) {
        setStorageMode('cloud');
        localStorage.removeItem('finance_os_local_active');
        try {
          await setDoc(
            doc(db, 'users', firebaseUser.uid, 'private', 'profile'),
            {
              userId: firebaseUser.uid,
              email: firebaseUser.email ?? 'user@finance.os',
              displayName: firebaseUser.displayName ?? 'Usuário FINANCE OS',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch {
          // Ignore if profile doc already exists with immutable createdAt; update only displayName/email
          try {
            await updateDoc(doc(db, 'users', firebaseUser.uid, 'private', 'profile'), {
              email: firebaseUser.email ?? 'user@finance.os',
              displayName: firebaseUser.displayName ?? 'Usuário FINANCE OS',
              updatedAt: serverTimestamp(),
            });
          } catch {
            // Non-blocking
          }
        }
      } else {
        setStorageMode((prev) => (prev === 'cloud' ? 'unauthenticated' : prev));
      }
    });
    return () => unsub();
  }, []);

  // Firestore real-time listeners when authenticated
  useEffect(() => {
    if (!authReady || !user || storageMode !== 'cloud') return;
    setCloudLoading(true);
    const uid = user.uid;

    const unsubPrefs = onSnapshot(
      doc(db, 'users', uid, 'settings', 'preferences'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<UserPreferences>;
          setCloudPrefs({ ...DEFAULT_PREFERENCES, ...data });
        } else {
          // Seed initial preferences doc for new cloud user
          void setDoc(doc(db, 'users', uid, 'settings', 'preferences'), {
            userId: uid,
            ...localData.preferences,
            updatedAt: serverTimestamp(),
          }).catch((err) =>
            handleFirestoreError(err, OperationType.WRITE, `users/${uid}/settings/preferences`)
          );
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}/settings/preferences`)
    );

    const unsubCats = onSnapshot(
      query(collection(db, 'users', uid, 'categories'), where('userId', '==', uid)),
      (snap) => {
        if (snap.empty && !localStorage.getItem(`fos_seeded_cats_${uid}`)) {
          localStorage.setItem(`fos_seeded_cats_${uid}`, '1');
          const batch = writeBatch(db);
          DEFAULT_CATEGORIES_SEED.forEach((cat, idx) => {
            const catId = `cat_std_${idx + 1}`;
            batch.set(doc(db, 'users', uid, 'categories', catId), {
              userId: uid,
              name: cat.name,
              type: cat.type,
              color: cat.color,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          });
          void batch.commit().catch((err) =>
            handleFirestoreError(err, OperationType.WRITE, `users/${uid}/categories`)
          );
          return;
        }
        setCloudCategories(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/categories`)
    );

    const unsubTx = onSnapshot(
      query(collection(db, 'users', uid, 'transactions'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Transaction, 'id'>),
        }));
        list.sort((a, b) => b.date.localeCompare(a.date));
        setCloudTransactions(list);
        setCloudLoading(false);
      },
      (err) => {
        setCloudLoading(false);
        handleFirestoreError(err, OperationType.LIST, `users/${uid}/transactions`);
      }
    );

    const unsubGoals = onSnapshot(
      query(collection(db, 'users', uid, 'savingsGoals'), where('userId', '==', uid)),
      (snap) => {
        setCloudGoals(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SavingsGoal, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/savingsGoals`)
    );

    const unsubDeposits = onSnapshot(
      query(collection(db, 'users', uid, 'savingsDeposits'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<SavingsDeposit, 'id'>),
        }));
        list.sort((a, b) => b.date.localeCompare(a.date));
        setCloudDeposits(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/savingsDeposits`)
    );

    const unsubInvestments = onSnapshot(
      query(collection(db, 'users', uid, 'investments'), where('userId', '==', uid)),
      (snap) => {
        setCloudInvestments(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<InvestmentAsset, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/investments`)
    );

    const unsubContribs = onSnapshot(
      query(collection(db, 'users', uid, 'investmentContributions'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<InvestmentContribution, 'id'>),
        }));
        list.sort((a, b) => b.date.localeCompare(a.date));
        setCloudContributions(list);
      },
      (err) =>
        handleFirestoreError(err, OperationType.LIST, `users/${uid}/investmentContributions`)
    );

    const unsubBanks = onSnapshot(
      query(collection(db, 'users', uid, 'bankConnections'), where('userId', '==', uid)),
      (snap) => {
        setCloudBankConnections(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BankConnection, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/bankConnections`)
    );

    return () => {
      unsubPrefs();
      unsubCats();
      unsubTx();
      unsubGoals();
      unsubDeposits();
      unsubInvestments();
      unsubContribs();
      unsubBanks();
    };
  }, [authReady, user, storageMode]);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Não foi possível concluir a autenticação.';
      setAuthError(message);
    }
  };

  const loginLocalUser = async (email: string, password: string) => {
    setAuthError(null);
    const res = await authenticateLocalUser({ email, password });
    if (!res.ok) {
      return { ok: false, error: res.error };
    }
    setLocalUser(res.user);
    setLocalData(loadLocalWorkspace(res.user.id));
    localStorage.setItem('finance_os_local_active', '1');
    setStorageMode('local');
    return { ok: true };
  };

  const registerUser = async (name: string, email: string, password: string) => {
    setAuthError(null);
    const res = await registerLocalUser({ name, email, password });
    if (!res.ok) {
      return { ok: false, error: res.error };
    }
    setLocalUser(res.user);
    setLocalData(loadLocalWorkspace(res.user.id));
    localStorage.setItem('finance_os_local_active', '1');
    setStorageMode('local');
    return { ok: true };
  };

  const loginAsAdmin = async (email: string, password: string) => {
    const ok = await verifyAdminCredentials(email, password);
    if (!ok) return false;
    const normalized = email.trim().toLowerCase();
    localStorage.setItem(ADMIN_SESSION_KEY, normalized);
    setAdminEmail(normalized);
    if (storageMode === 'unauthenticated') {
      localStorage.setItem('finance_os_local_active', '1');
      setStorageMode('local');
    }
    return true;
  };

  const exitAdminSession = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setAdminEmail(null);
  };

  const enterLocalWorkspace = () => {
    setAuthError(null);
    clearActiveLocalUser();
    setLocalUser(null);
    setLocalData(loadLocalWorkspace(null));
    localStorage.setItem('finance_os_local_active', '1');
    setStorageMode('local');
  };

  const logout = async () => {
    if (user) {
      await signOut(auth);
    }
    clearActiveLocalUser();
    setLocalUser(null);
    localStorage.removeItem('finance_os_local_active');
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setAdminEmail(null);
    setStorageMode('unauthenticated');
  };

  const updatePreferences = async (next: Partial<UserPreferences>) => {
    const merged: UserPreferences = { ...preferences, ...next };
    setLocalData((prev) => ({ ...prev, preferences: merged }));

    if (storageMode === 'cloud' && user) {
      const path = `users/${user.uid}/settings/preferences`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), {
          userId: user.uid,
          themeId: merged.themeId,
          mode: merged.mode,
          accentColor: merged.accentColor,
          backgroundColor: merged.backgroundColor,
          chartColors: merged.chartColors.slice(0, 8),
          density: merged.density,
          cardStyle: merged.cardStyle,
          borderRadius: merged.borderRadius,
          navStyle: merged.navStyle,
          currency: merged.currency,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  };

  const addCategory = async (input: { name: string; type: TransactionType; color: string }) => {
    const name = input.name.trim().slice(0, 60);
    if (!name) return;
    const id = createId('cat');
    if (storageMode === 'cloud' && user) {
      const path = `users/${user.uid}/categories/${id}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'categories', id), {
          userId: user.uid,
          name,
          type: input.type,
          color: input.color,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      return;
    }
    setLocalData((prev) => ({
      ...prev,
      categories: [
        ...prev.categories,
        { id, userId: 'local', name, type: input.type, color: input.color },
      ],
    }));
  };

  const updateCategory = async (
    id: string,
    input: { name: string; type: TransactionType; color: string }
  ) => {
    const name = input.name.trim().slice(0, 60);
    if (!name) return;
    if (storageMode === 'cloud' && user) {
      const path = `users/${user.uid}/categories/${id}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'categories', id), {
          name,
          type: input.type,
          color: input.color,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
      return;
    }
    setLocalData((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === id ? { ...c, name, type: input.type, color: input.color } : c
      ),
    }));
  };

  const deleteCategory = async (id: string) => {
    if (storageMode === 'cloud' && user) {
      const path = `users/${user.uid}/categories/${id}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'categories', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
      return;
    }
    setLocalData((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
    }));
  };

  const addTransaction = async (input: {
    type: TransactionType;
    amount: number;
    description: string;
    date: string;
    categoryId: string;
    categoryName: string;
    isRecurring: boolean;
    recurrenceFrequency: RecurrenceFrequency;
    notes: string;
  }) => {
    const id = createId('tx');
    const clean = {
      type: input.type,
      amount: Math.max(0.01, Number(input.amount)),
      description: input.description.trim().slice(0, 160),
      date: input.date,
      categoryId: input.categoryId.slice(0, 128),
      categoryName: input.categoryName.trim().slice(0, 60) || 'Geral',
      isRecurring: Boolean(input.isRecurring),
      recurrenceFrequency: input.isRecurring ? input.recurrenceFrequency : ('none' as const),
      notes: input.notes.trim().slice(0, 400),
    };
    if (storageMode === 'cloud' && user) {
      const path = `users/${user.uid}/transactions/${id}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'transactions', id), {
          userId: user.uid,
          ...clean,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      return;
    }
    setLocalData((prev) => ({
      ...prev,
      transactions: [{ id, userId: 'local', ...clean }, ...prev.transactions].sort((a, b) =>
        b.date.localeCompare(a.date)
      ),
    }));
  };

  const updateTransaction = async (
    id: string,
    input: {
      type: TransactionType;
      amount: number;
      description: string;
      date: string;
      categoryId: string;
      categoryName: string;
      isRecurring: boolean;
      recurrenceFrequency: RecurrenceFrequency;
      notes: string;
    }
  ) => {
    const clean = {
      type: input.type,
      amount: Math.max(0.01, Number(input.amount)),
      description: input.description.trim().slice(0, 160),
      date: input.date,
      categoryId: input.categoryId.slice(0, 128),
      categoryName: input.categoryName.trim().slice(0, 60) || 'Geral',
      isRecurring: Boolean(input.isRecurring),
      recurrenceFrequency: input.isRecurring ? input.recurrenceFrequency : ('none' as const),
      notes: input.notes.trim().slice(0, 400),
    };
    if (storageMode === 'cloud' && user) {
      const path = `users/${user.uid}/transactions/${id}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'transactions', id), {
          ...clean,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
      return;
    }
    setLocalData((prev) => ({
      ...prev,
      transactions: prev.transactions
        .map((t) => (t.id === id ? { ...t, ...clean } : t))
        .sort((a, b) => b.date.localeCompare(a.date)),
    }));
  };

  const deleteTransaction = async (id: string) => {
    if (storageMode === 'cloud' && user) {
      const path = `users/${user.uid}/transactions/${id}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'transactions', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
      return;
    }
    setLocalData((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));
  };

  const addSavingsGoal = async (input: {
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    notes: string;
  }) => {
    const id = createId('goal');
    const clean = {
      name: input.name.trim().slice(0, 100),
      targetAmount: Math.max(0.01, Number(input.targetAmount)),
      currentAmount: Math.max(0, Number(input.currentAmount)),
      targetDate: input.targetDate || '',
      notes: input.notes.trim().slice(0, 400),
    };
    if (storageMode === 'cloud' && user) {
      const batch = writeBatch(db);
      const goalRef = doc(db, 'users', user.uid, 'savingsGoals', id);
      batch.set(goalRef, {
        userId: user.uid,
        ...clean,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (clean.currentAmount > 0) {
        const depId = createId('dep');
        batch.set(doc(db, 'users', user.uid, 'savingsDeposits', depId), {
          userId: user.uid,
          goalId: id,
          amount: clean.currentAmount,
          date: getTodayISO(),
          note: 'Saldo inicial da meta',
          createdAt: serverTimestamp(),
        });
      }
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/savingsGoals/${id}`);
      }
      return;
    }
    const newDeposit: SavingsDeposit[] =
      clean.currentAmount > 0
        ? [
            {
              id: createId('dep'),
              userId: 'local',
              goalId: id,
              amount: clean.currentAmount,
              date: getTodayISO(),
              note: 'Saldo inicial da meta',
            },
          ]
        : [];
    setLocalData((prev) => ({
      ...prev,
      savingsGoals: [...prev.savingsGoals, { id, userId: 'local', ...clean }],
      savingsDeposits: [...newDeposit, ...prev.savingsDeposits],
    }));
  };

  const updateSavingsGoal = async (
    id: string,
    input: {
      name: string;
      targetAmount: number;
      currentAmount: number;
      targetDate: string;
      notes: string;
    }
  ) => {
    const clean = {
      name: input.name.trim().slice(0, 100),
      targetAmount: Math.max(0.01, Number(input.targetAmount)),
      currentAmount: Math.max(0, Number(input.currentAmount)),
      targetDate: input.targetDate || '',
      notes: input.notes.trim().slice(0, 400),
    };
    if (storageMode === 'cloud' && user) {
      const path = `users/${user.uid}/savingsGoals/${id}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'savingsGoals', id), {
          ...clean,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
      return;
    }
    setLocalData((prev) => ({
      ...prev,
      savingsGoals: prev.savingsGoals.map((g) => (g.id === id ? { ...g, ...clean } : g)),
    }));
  };

  const deleteSavingsGoal = async (id: string) => {
    if (storageMode === 'cloud' && user) {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', user.uid, 'savingsGoals', id));
      cloudDeposits
        .filter((d) => d.goalId === id)
        .forEach((d) => batch.delete(doc(db, 'users', user.uid, 'savingsDeposits', d.id)));
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/savingsGoals/${id}`);
      }
      return;
    }
    setLocalData((prev) => ({
      ...prev,
      savingsGoals: prev.savingsGoals.filter((g) => g.id !== id),
      savingsDeposits: prev.savingsDeposits.filter((d) => d.goalId !== id),
    }));
  };

  const addSavingsDeposit = async (input: {
    goalId: string;
    amount: number;
    date: string;
    note: string;
  }) => {
    const goal = (storageMode === 'cloud' ? cloudGoals : localData.savingsGoals).find(
      (g) => g.id === input.goalId
    );
    if (!goal || input.amount === 0) return;
    const nextCurrent = Math.max(0, goal.currentAmount + input.amount);
    const depId = createId('dep');
    const cleanNote = input.note.trim().slice(0, 200);

    if (storageMode === 'cloud' && user) {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', user.uid, 'savingsDeposits', depId), {
        userId: user.uid,
        goalId: input.goalId,
        amount: input.amount,
        date: input.date,
        note: cleanNote,
        createdAt: serverTimestamp(),
      });
      batch.update(doc(db, 'users', user.uid, 'savingsGoals', input.goalId), {
        currentAmount: nextCurrent,
        updatedAt: serverTimestamp(),
      });
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.WRITE,
          `users/${user.uid}/savingsDeposits/${depId}`
        );
      }
      return;
    }

    setLocalData((prev) => ({
      ...prev,
      savingsGoals: prev.savingsGoals.map((g) =>
        g.id === input.goalId ? { ...g, currentAmount: nextCurrent } : g
      ),
      savingsDeposits: [
        {
          id: depId,
          userId: 'local',
          goalId: input.goalId,
          amount: input.amount,
          date: input.date,
          note: cleanNote,
        },
        ...prev.savingsDeposits,
      ].sort((a, b) => b.date.localeCompare(a.date)),
    }));
  };

  const addInvestment = async (input: {
    name: string;
    ticker: string;
    assetClass: AssetClass;
    quantity: number;
    investedAmount: number;
    currentAmount: number;
    notes: string;
  }) => {
    const id = createId('inv');
    const clean = {
      name: input.name.trim().slice(0, 100),
      ticker: input.ticker.trim().toUpperCase().slice(0, 24),
      assetClass: input.assetClass,
      quantity: Math.max(0, Number(input.quantity)),
      investedAmount: Math.max(0, Number(input.investedAmount)),
      currentAmount: Math.max(0, Number(input.currentAmount)),
      notes: input.notes.trim().slice(0, 400),
    };

    if (storageMode === 'cloud' && user) {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', user.uid, 'investments', id), {
        userId: user.uid,
        ...clean,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (clean.investedAmount > 0 || clean.currentAmount > 0) {
        const contribId = createId('ic');
        batch.set(doc(db, 'users', user.uid, 'investmentContributions', contribId), {
          userId: user.uid,
          investmentId: id,
          entryType: 'contribution',
          amount: clean.investedAmount,
          quantityDelta: clean.quantity,
          date: getTodayISO(),
          note: 'Posição inicial registrada',
          createdAt: serverTimestamp(),
        });
      }
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/investments/${id}`);
      }
      return;
    }

    const initialContrib: InvestmentContribution[] =
      clean.investedAmount > 0 || clean.currentAmount > 0
        ? [
            {
              id: createId('ic'),
              userId: 'local',
              investmentId: id,
              entryType: 'contribution',
              amount: clean.investedAmount,
              quantityDelta: clean.quantity,
              date: getTodayISO(),
              note: 'Posição inicial registrada',
            },
          ]
        : [];

    setLocalData((prev) => ({
      ...prev,
      investments: [...prev.investments, { id, userId: 'local', ...clean }],
      investmentContributions: [...initialContrib, ...prev.investmentContributions],
    }));
  };

  const updateInvestment = async (
    id: string,
    input: {
      name: string;
      ticker: string;
      assetClass: AssetClass;
      quantity: number;
      investedAmount: number;
      currentAmount: number;
      notes: string;
    }
  ) => {
    const clean = {
      name: input.name.trim().slice(0, 100),
      ticker: input.ticker.trim().toUpperCase().slice(0, 24),
      assetClass: input.assetClass,
      quantity: Math.max(0, Number(input.quantity)),
      investedAmount: Math.max(0, Number(input.investedAmount)),
      currentAmount: Math.max(0, Number(input.currentAmount)),
      notes: input.notes.trim().slice(0, 400),
    };
    if (storageMode === 'cloud' && user) {
      const path = `users/${user.uid}/investments/${id}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'investments', id), {
          ...clean,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
      return;
    }
    setLocalData((prev) => ({
      ...prev,
      investments: prev.investments.map((inv) => (inv.id === id ? { ...inv, ...clean } : inv)),
    }));
  };

  const deleteInvestment = async (id: string) => {
    if (storageMode === 'cloud' && user) {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', user.uid, 'investments', id));
      cloudContributions
        .filter((c) => c.investmentId === id)
        .forEach((c) =>
          batch.delete(doc(db, 'users', user.uid, 'investmentContributions', c.id))
        );
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/investments/${id}`);
      }
      return;
    }
    setLocalData((prev) => ({
      ...prev,
      investments: prev.investments.filter((inv) => inv.id !== id),
      investmentContributions: prev.investmentContributions.filter(
        (c) => c.investmentId !== id
      ),
    }));
  };

  const addInvestmentContribution = async (input: {
    investmentId: string;
    entryType: ContributionEntryType;
    amount: number;
    quantityDelta: number;
    date: string;
    note: string;
    newCurrentValuation?: number;
  }) => {
    const asset = (storageMode === 'cloud' ? cloudInvestments : localData.investments).find(
      (a) => a.id === input.investmentId
    );
    if (!asset) return;

    let nextInvested = asset.investedAmount;
    let nextCurrent = asset.currentAmount;
    let nextQty = asset.quantity;

    if (input.entryType === 'contribution') {
      nextInvested = Math.max(0, asset.investedAmount + input.amount);
      nextCurrent = Math.max(0, asset.currentAmount + input.amount);
      nextQty = Math.max(0, asset.quantity + input.quantityDelta);
    } else if (input.entryType === 'withdrawal') {
      nextInvested = Math.max(0, asset.investedAmount - input.amount);
      nextCurrent = Math.max(0, asset.currentAmount - input.amount);
      nextQty = Math.max(0, asset.quantity - Math.abs(input.quantityDelta));
    } else if (input.entryType === 'valuation') {
      nextCurrent = Math.max(
        0,
        input.newCurrentValuation !== undefined ? input.newCurrentValuation : input.amount
      );
    }

    const contribId = createId('ic');
    const cleanNote = input.note.trim().slice(0, 200);

    if (storageMode === 'cloud' && user) {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', user.uid, 'investmentContributions', contribId), {
        userId: user.uid,
        investmentId: input.investmentId,
        entryType: input.entryType,
        amount: Math.max(0, input.amount),
        quantityDelta: input.quantityDelta,
        date: input.date,
        note: cleanNote,
        createdAt: serverTimestamp(),
      });
      batch.update(doc(db, 'users', user.uid, 'investments', input.investmentId), {
        quantity: nextQty,
        investedAmount: nextInvested,
        currentAmount: nextCurrent,
        updatedAt: serverTimestamp(),
      });
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.WRITE,
          `users/${user.uid}/investmentContributions/${contribId}`
        );
      }
      return;
    }

    setLocalData((prev) => ({
      ...prev,
      investments: prev.investments.map((inv) =>
        inv.id === input.investmentId
          ? {
              ...inv,
              quantity: nextQty,
              investedAmount: nextInvested,
              currentAmount: nextCurrent,
            }
          : inv
      ),
      investmentContributions: [
        {
          id: contribId,
          userId: 'local',
          investmentId: input.investmentId,
          entryType: input.entryType,
          amount: Math.max(0, input.amount),
          quantityDelta: input.quantityDelta,
          date: input.date,
          note: cleanNote,
        },
        ...prev.investmentContributions,
      ].sort((a, b) => b.date.localeCompare(a.date)),
    }));
  };

  const addBankConnection = async (input: {
    institutionName: string;
    accountLabel: string;
    syncMethod: SyncMethod;
    endpointUrl: string;
    autoSync: boolean;
  }): Promise<string> => {
    const id = createId('bank');
    const clean = {
      institutionName: input.institutionName.trim().slice(0, 80),
      accountLabel: input.accountLabel.trim().slice(0, 80),
      syncMethod: input.syncMethod,
      endpointUrl: input.endpointUrl.trim().slice(0, 300),
      syncedBalance: 0,
      autoSync: Boolean(input.autoSync),
      lastSyncedAt: '',
      status: 'pending' as ConnectionStatus,
    };

    if (storageMode === 'cloud' && user) {
      const path = `users/${user.uid}/bankConnections/${id}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'bankConnections', id), {
          userId: user.uid,
          ...clean,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      return id;
    }

    setLocalData((prev) => ({
      ...prev,
      bankConnections: [...prev.bankConnections, { id, userId: 'local', ...clean }],
    }));
    return id;
  };

  const updateBankConnection = async (
    id: string,
    input: Partial<{
      institutionName: string;
      accountLabel: string;
      syncMethod: SyncMethod;
      endpointUrl: string;
      syncedBalance: number;
      autoSync: boolean;
      lastSyncedAt: string;
      status: ConnectionStatus;
    }>
  ) => {
    if (storageMode === 'cloud' && user) {
      const path = `users/${user.uid}/bankConnections/${id}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'bankConnections', id), {
          ...input,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
      return;
    }

    setLocalData((prev) => ({
      ...prev,
      bankConnections: prev.bankConnections.map((b) => (b.id === id ? { ...b, ...input } : b)),
    }));
  };

  const deleteBankConnection = async (id: string) => {
    if (storageMode === 'cloud' && user) {
      const path = `users/${user.uid}/bankConnections/${id}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'bankConnections', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
      return;
    }

    setLocalData((prev) => ({
      ...prev,
      bankConnections: prev.bankConnections.filter((b) => b.id !== id),
    }));
  };

  const syncBankPayload = async (
    connectionId: string,
    parsed: ParsedBankSyncResult
  ): Promise<{ importedTransactions: number; updatedInvestments: number }> => {
    const activeConnections =
      storageMode === 'cloud' ? cloudBankConnections : localData.bankConnections;
    const conn = activeConnections.find((b) => b.id === connectionId);
    const activeTxs = storageMode === 'cloud' ? cloudTransactions : localData.transactions;
    const activeCats = storageMode === 'cloud' ? cloudCategories : localData.categories;
    const activeInvestments =
      storageMode === 'cloud' ? cloudInvestments : localData.investments;

    const freshTxs = deduplicateImportedTransactions(parsed.transactions, activeTxs);
    const nowIso = new Date().toISOString();
    const nextBalance =
      parsed.balance !== null && Number.isFinite(parsed.balance)
        ? parsed.balance
        : conn?.syncedBalance ?? 0;

    const findCategory = (name: string, type: TransactionType): Category | undefined => {
      const norm = name.trim().toLowerCase();
      return (
        activeCats.find((c) => c.type === type && c.name.toLowerCase() === norm) ??
        activeCats.find((c) => c.type === type)
      );
    };

    if (storageMode === 'cloud' && user) {
      const uid = user.uid;
      const batch = writeBatch(db);
      for (const tx of freshTxs) {
        const txId = createId('tx');
        const matchedCat = findCategory(tx.categoryName, tx.type);
        batch.set(doc(db, 'users', uid, 'transactions', txId), {
          userId: uid,
          type: tx.type,
          amount: Math.max(0.01, Number(tx.amount)),
          description: tx.description.slice(0, 160),
          date: tx.date,
          categoryId: matchedCat?.id ?? 'general',
          categoryName: matchedCat?.name ?? tx.categoryName,
          isRecurring: false,
          recurrenceFrequency: 'none',
          notes: conn ? `Sincronizado de ${conn.institutionName}` : 'Sincronização bancária',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const inv of parsed.investments) {
        const existing = activeInvestments.find(
          (a) =>
            (inv.ticker && a.ticker.toUpperCase() === inv.ticker.toUpperCase()) ||
            a.name.toLowerCase() === inv.name.toLowerCase()
        );
        if (existing) {
          batch.update(doc(db, 'users', uid, 'investments', existing.id), {
            quantity: inv.quantity,
            investedAmount: inv.investedAmount,
            currentAmount: inv.currentAmount,
            updatedAt: serverTimestamp(),
          });
        } else {
          const invId = createId('inv');
          batch.set(doc(db, 'users', uid, 'investments', invId), {
            userId: uid,
            name: inv.name,
            ticker: inv.ticker,
            assetClass: inv.assetClass,
            quantity: inv.quantity,
            investedAmount: inv.investedAmount,
            currentAmount: inv.currentAmount,
            notes: conn ? `Sincronizado de ${conn.institutionName}` : 'Sincronização bancária',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      if (conn) {
        batch.update(doc(db, 'users', uid, 'bankConnections', conn.id), {
          syncedBalance: nextBalance,
          lastSyncedAt: nowIso,
          status: 'connected',
          updatedAt: serverTimestamp(),
        });
      }

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}/bankConnections`);
      }

      return {
        importedTransactions: freshTxs.length,
        updatedInvestments: parsed.investments.length,
      };
    }

    const mappedTxs: Transaction[] = freshTxs.map((tx) => {
      const matchedCat = findCategory(tx.categoryName, tx.type);
      return {
        id: createId('tx'),
        userId: 'local',
        type: tx.type,
        amount: Math.max(0.01, Number(tx.amount)),
        description: tx.description.slice(0, 160),
        date: tx.date,
        categoryId: matchedCat?.id ?? 'general',
        categoryName: matchedCat?.name ?? tx.categoryName,
        isRecurring: false,
        recurrenceFrequency: 'none',
        notes: conn ? `Sincronizado de ${conn.institutionName}` : 'Sincronização bancária',
      };
    });

    setLocalData((prev) => {
      const nextInvestments = [...prev.investments];
      for (const inv of parsed.investments) {
        const idx = nextInvestments.findIndex(
          (a) =>
            (inv.ticker && a.ticker.toUpperCase() === inv.ticker.toUpperCase()) ||
            a.name.toLowerCase() === inv.name.toLowerCase()
        );
        if (idx >= 0) {
          nextInvestments[idx] = {
            ...nextInvestments[idx],
            quantity: inv.quantity,
            investedAmount: inv.investedAmount,
            currentAmount: inv.currentAmount,
          };
        } else {
          nextInvestments.push({
            id: createId('inv'),
            userId: 'local',
            name: inv.name,
            ticker: inv.ticker,
            assetClass: inv.assetClass,
            quantity: inv.quantity,
            investedAmount: inv.investedAmount,
            currentAmount: inv.currentAmount,
            notes: conn ? `Sincronizado de ${conn.institutionName}` : 'Sincronização bancária',
          });
        }
      }

      return {
        ...prev,
        transactions: [...mappedTxs, ...prev.transactions].sort((a, b) =>
          b.date.localeCompare(a.date)
        ),
        investments: nextInvestments,
        bankConnections: prev.bankConnections.map((b) =>
          b.id === connectionId
            ? {
                ...b,
                syncedBalance: nextBalance,
                lastSyncedAt: nowIso,
                status: 'connected',
              }
            : b
        ),
      };
    });

    return {
      importedTransactions: mappedTxs.length,
      updatedInvestments: parsed.investments.length,
    };
  };

  const restoreBackup = async (payload: FinanceBackupPayload) => {
    const nextPrefs = { ...DEFAULT_PREFERENCES, ...(payload.preferences ?? {}) };
    if (storageMode === 'cloud' && user) {
      const uid = user.uid;
      await clearAllData();
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', uid, 'settings', 'preferences'), {
        ...nextPrefs,
        userId: uid,
        updatedAt: serverTimestamp(),
      });
      (payload.categories ?? []).forEach((c) => {
        const id = c.id && /^[a-zA-Z0-9_-]+$/.test(c.id) ? c.id : createId('cat');
        batch.set(doc(db, 'users', uid, 'categories', id), {
          userId: uid,
          name: c.name.slice(0, 60),
          type: c.type,
          color: c.color,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      (payload.transactions ?? []).forEach((t) => {
        const id = t.id && /^[a-zA-Z0-9_-]+$/.test(t.id) ? t.id : createId('tx');
        batch.set(doc(db, 'users', uid, 'transactions', id), {
          userId: uid,
          type: t.type,
          amount: Math.max(0.01, Number(t.amount)),
          description: String(t.description).slice(0, 160),
          date: t.date,
          categoryId: t.categoryId || 'general',
          categoryName: t.categoryName || 'Geral',
          isRecurring: Boolean(t.isRecurring),
          recurrenceFrequency: t.recurrenceFrequency || 'none',
          notes: String(t.notes ?? '').slice(0, 400),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      (payload.savingsGoals ?? []).forEach((g) => {
        const id = g.id && /^[a-zA-Z0-9_-]+$/.test(g.id) ? g.id : createId('goal');
        batch.set(doc(db, 'users', uid, 'savingsGoals', id), {
          userId: uid,
          name: String(g.name).slice(0, 100),
          targetAmount: Math.max(0.01, Number(g.targetAmount)),
          currentAmount: Math.max(0, Number(g.currentAmount)),
          targetDate: g.targetDate || '',
          notes: String(g.notes ?? '').slice(0, 400),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      (payload.savingsDeposits ?? []).forEach((d) => {
        const id = d.id && /^[a-zA-Z0-9_-]+$/.test(d.id) ? d.id : createId('dep');
        batch.set(doc(db, 'users', uid, 'savingsDeposits', id), {
          userId: uid,
          goalId: d.goalId,
          amount: Number(d.amount),
          date: d.date,
          note: String(d.note ?? '').slice(0, 200),
          createdAt: serverTimestamp(),
        });
      });
      (payload.investments ?? []).forEach((inv) => {
        const id = inv.id && /^[a-zA-Z0-9_-]+$/.test(inv.id) ? inv.id : createId('inv');
        batch.set(doc(db, 'users', uid, 'investments', id), {
          userId: uid,
          name: String(inv.name).slice(0, 100),
          ticker: String(inv.ticker ?? '').slice(0, 24),
          assetClass: inv.assetClass,
          quantity: Math.max(0, Number(inv.quantity)),
          investedAmount: Math.max(0, Number(inv.investedAmount)),
          currentAmount: Math.max(0, Number(inv.currentAmount)),
          notes: String(inv.notes ?? '').slice(0, 400),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      (payload.investmentContributions ?? []).forEach((c) => {
        const id = c.id && /^[a-zA-Z0-9_-]+$/.test(c.id) ? c.id : createId('ic');
        batch.set(doc(db, 'users', uid, 'investmentContributions', id), {
          userId: uid,
          investmentId: c.investmentId,
          entryType: c.entryType,
          amount: Math.max(0, Number(c.amount)),
          quantityDelta: Number(c.quantityDelta),
          date: c.date,
          note: String(c.note ?? '').slice(0, 200),
          createdAt: serverTimestamp(),
        });
      });
      (payload.bankConnections ?? []).forEach((b) => {
        const id = b.id && /^[a-zA-Z0-9_-]+$/.test(b.id) ? b.id : createId('bank');
        batch.set(doc(db, 'users', uid, 'bankConnections', id), {
          userId: uid,
          institutionName: String(b.institutionName).slice(0, 80),
          accountLabel: String(b.accountLabel).slice(0, 80),
          syncMethod: b.syncMethod,
          endpointUrl: String(b.endpointUrl ?? '').slice(0, 300),
          syncedBalance: Number(b.syncedBalance ?? 0),
          autoSync: Boolean(b.autoSync),
          lastSyncedAt: b.lastSyncedAt || '',
          status: b.status || 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      return;
    }

    setLocalData({
      preferences: nextPrefs,
      categories:
        Array.isArray(payload.categories) && payload.categories.length > 0
          ? payload.categories
          : createEmptyLocalWorkspace(nextPrefs).categories,
      transactions: payload.transactions ?? [],
      savingsGoals: payload.savingsGoals ?? [],
      savingsDeposits: payload.savingsDeposits ?? [],
      investments: payload.investments ?? [],
      investmentContributions: payload.investmentContributions ?? [],
      bankConnections: payload.bankConnections ?? [],
    });
  };

  const clearAllData = async () => {
    if (storageMode === 'cloud' && user) {
      const uid = user.uid;
      const batch = writeBatch(db);
      cloudTransactions.forEach((t) =>
        batch.delete(doc(db, 'users', uid, 'transactions', t.id))
      );
      cloudDeposits.forEach((d) =>
        batch.delete(doc(db, 'users', uid, 'savingsDeposits', d.id))
      );
      cloudGoals.forEach((g) =>
        batch.delete(doc(db, 'users', uid, 'savingsGoals', g.id))
      );
      cloudContributions.forEach((c) =>
        batch.delete(doc(db, 'users', uid, 'investmentContributions', c.id))
      );
      cloudInvestments.forEach((i) =>
        batch.delete(doc(db, 'users', uid, 'investments', i.id))
      );
      cloudBankConnections.forEach((b) =>
        batch.delete(doc(db, 'users', uid, 'bankConnections', b.id))
      );
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
      }
      return;
    }
    setLocalData((prev) => ({
      ...prev,
      transactions: [],
      savingsGoals: [],
      savingsDeposits: [],
      investments: [],
      investmentContributions: [],
      bankConnections: [],
    }));
  };

  const value: FinanceContextValue = {
    storageMode,
    authReady,
    dataLoading: storageMode === 'cloud' && cloudLoading,
    user,
    localUser,
    isAdmin,
    adminEmail,
    authError,
    preferences,
    palette,
    categories: storageMode === 'cloud' ? cloudCategories : localData.categories,
    transactions: storageMode === 'cloud' ? cloudTransactions : localData.transactions,
    savingsGoals: storageMode === 'cloud' ? cloudGoals : localData.savingsGoals,
    savingsDeposits: storageMode === 'cloud' ? cloudDeposits : localData.savingsDeposits,
    investments: storageMode === 'cloud' ? cloudInvestments : localData.investments,
    investmentContributions:
      storageMode === 'cloud' ? cloudContributions : localData.investmentContributions,
    bankConnections: storageMode === 'cloud' ? cloudBankConnections : localData.bankConnections,
    signInWithGoogle,
    loginLocalUser,
    registerUser,
    loginAsAdmin,
    exitAdminSession,
    enterLocalWorkspace,
    logout,
    updatePreferences,
    addCategory,
    updateCategory,
    deleteCategory,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    addSavingsDeposit,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    addInvestmentContribution,
    addBankConnection,
    updateBankConnection,
    deleteBankConnection,
    syncBankPayload,
    restoreBackup,
    clearAllData,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used inside FinanceProvider');
  return ctx;
}
