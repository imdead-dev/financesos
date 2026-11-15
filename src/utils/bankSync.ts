import { AssetClass, Transaction, TransactionType } from '../types/finance';

export interface ParsedBankTransaction {
  type: TransactionType;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  categoryName: string;
  externalId: string;
}

export interface ParsedBankInvestment {
  name: string;
  ticker: string;
  assetClass: AssetClass;
  quantity: number;
  investedAmount: number;
  currentAmount: number;
}

export interface ParsedBankSyncResult {
  balance: number | null;
  transactions: ParsedBankTransaction[];
  investments: ParsedBankInvestment[];
}

function normalizeOFXDate(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  return new Date().toISOString().slice(0, 10);
}

function normalizeCSVDate(raw: string): string | null {
  const trimmed = raw.trim().replace(/^"|"$/g, '');
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(trimmed);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }
  return null;
}

function parseLocalizedNumber(raw: string): number {
  let clean = raw.trim().replace(/^"|"$/g, '').replace(/[R$\s]/g, '');
  if (!clean) return NaN;
  if (clean.includes(',') && clean.includes('.')) {
    if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      clean = clean.replace(/,/g, '');
    }
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  }
  return Number(clean);
}

export function parseOFXStatement(rawOFX: string): ParsedBankSyncResult {
  const balMatch = /<BALAMT>\s*([-+]?\d+(?:[.,]\d+)?)/i.exec(rawOFX);
  const balance = balMatch ? parseLocalizedNumber(balMatch[1]) : null;

  const transactions: ParsedBankTransaction[] = [];
  const blocks = rawOFX.split(/<STMTTRN>/i).slice(1);

  for (const block of blocks) {
    const endIdx = block.search(/<\/STMTTRN>/i);
    const body = endIdx >= 0 ? block.slice(0, endIdx) : block;

    const amtMatch = /<TRNAMT>\s*([^\r\n<]+)/i.exec(body);
    const dateMatch = /<DTPOSTED>\s*([^\r\n<]+)/i.exec(body);
    const memoMatch = /<MEMO>\s*([^\r\n<]+)/i.exec(body);
    const nameMatch = /<NAME>\s*([^\r\n<]+)/i.exec(body);
    const idMatch = /<FITID>\s*([^\r\n<]+)/i.exec(body);
    const typeMatch = /<TRNTYPE>\s*([^\r\n<]+)/i.exec(body);

    const rawAmount = amtMatch ? parseLocalizedNumber(amtMatch[1]) : NaN;
    if (!Number.isFinite(rawAmount) || rawAmount === 0) continue;

    const date = dateMatch ? normalizeOFXDate(dateMatch[1]) : new Date().toISOString().slice(0, 10);
    const description = (memoMatch?.[1] || nameMatch?.[1] || 'Movimentação Bancária')
      .trim()
      .slice(0, 160);
    const trnType = (typeMatch?.[1] || '').trim().toUpperCase();
    const type: TransactionType =
      rawAmount > 0 || trnType === 'CREDIT' ? 'income' : 'expense';
    const absAmount = Math.abs(rawAmount);
    const externalId =
      idMatch?.[1]?.trim() || `${date}_${type}_${absAmount.toFixed(2)}_${description}`;

    transactions.push({
      type,
      amount: absAmount,
      description,
      date,
      categoryName: type === 'income' ? 'Outras Receitas' : 'Assinaturas & Serviços',
      externalId,
    });
  }

  return {
    balance: balance !== null && Number.isFinite(balance) ? balance : null,
    transactions,
    investments: [],
  };
}

export function parseBankCSVStatement(rawCSV: string): ParsedBankSyncResult {
  const lines = rawCSV
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { balance: null, transactions: [], investments: [] };
  }

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const splitRow = (row: string) =>
    row.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ''));

  const headers = splitRow(lines[0]).map((h) => h.toLowerCase());
  const dateIdx = headers.findIndex((h) => h.includes('data') || h.includes('date'));
  const descIdx = headers.findIndex(
    (h) => h.includes('descri') || h.includes('hist') || h.includes('memo') || h.includes('title')
  );
  const amtIdx = headers.findIndex(
    (h) => h.includes('valor') || h.includes('amount') || h.includes('quantia')
  );
  const typeIdx = headers.findIndex((h) => h.includes('tipo') || h.includes('type'));
  const catIdx = headers.findIndex((h) => h.includes('categ'));

  if (dateIdx === -1 || amtIdx === -1) {
    return { balance: null, transactions: [], investments: [] };
  }

  const transactions: ParsedBankTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitRow(lines[i]);
    const date = normalizeCSVDate(cols[dateIdx] ?? '');
    const rawAmt = parseLocalizedNumber(cols[amtIdx] ?? '');
    if (!date || !Number.isFinite(rawAmt) || rawAmt === 0) continue;

    const rawType = typeIdx >= 0 ? (cols[typeIdx] ?? '').toLowerCase() : '';
    let type: TransactionType = rawAmt > 0 ? 'income' : 'expense';
    if (rawType.includes('desp') || rawType.includes('déb') || rawType.includes('deb')) {
      type = 'expense';
    } else if (rawType.includes('rec') || rawType.includes('créd') || rawType.includes('cred')) {
      type = 'income';
    }

    const description = ((descIdx >= 0 ? cols[descIdx] : '') || 'Lançamento Importado')
      .trim()
      .slice(0, 160);
    const absAmount = Math.abs(rawAmt);
    const categoryName =
      (catIdx >= 0 ? cols[catIdx] : '') ||
      (type === 'income' ? 'Outras Receitas' : 'Outras Despesas');

    transactions.push({
      type,
      amount: absAmount,
      description,
      date,
      categoryName: categoryName.slice(0, 60),
      externalId: `${date}_${type}_${absAmount.toFixed(2)}_${description}`,
    });
  }

  return { balance: null, transactions, investments: [] };
}

export function parseOpenFinanceJSON(payload: unknown): ParsedBankSyncResult {
  if (!payload || typeof payload !== 'object') {
    return { balance: null, transactions: [], investments: [] };
  }
  const obj = payload as Record<string, unknown>;
  const balance =
    typeof obj.balance === 'number' && Number.isFinite(obj.balance) ? obj.balance : null;

  const transactions: ParsedBankTransaction[] = Array.isArray(obj.transactions)
    ? obj.transactions
        .filter((t): t is Record<string, unknown> => Boolean(t && typeof t === 'object'))
        .map((t) => {
          const rawAmt = Number(t.amount ?? 0);
          const type: TransactionType =
            t.type === 'income' || (t.type !== 'expense' && rawAmt > 0)
              ? 'income'
              : 'expense';
          const date =
            typeof t.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.date)
              ? t.date
              : new Date().toISOString().slice(0, 10);
          const description = String(t.description ?? 'Sincronização Open Finance').slice(0, 160);
          const absAmount = Math.abs(rawAmt);
          return {
            type,
            amount: absAmount,
            description,
            date,
            categoryName: String(
              t.category ?? (type === 'income' ? 'Outras Receitas' : 'Assinaturas & Serviços')
            ).slice(0, 60),
            externalId: String(
              t.id ?? `${date}_${type}_${absAmount.toFixed(2)}_${description}`
            ),
          };
        })
        .filter((t) => Number.isFinite(t.amount) && t.amount > 0)
    : [];

  const investments: ParsedBankInvestment[] = Array.isArray(obj.investments)
    ? obj.investments
        .filter((a): a is Record<string, unknown> => Boolean(a && typeof a === 'object'))
        .map((a) => ({
          name: String(a.name ?? 'Ativo Sincronizado').slice(0, 100),
          ticker: String(a.ticker ?? '').toUpperCase().slice(0, 24),
          assetClass: (['crypto', 'fixed_income', 'fii', 'stocks', 'other'].includes(
            String(a.assetClass)
          )
            ? String(a.assetClass)
            : 'other') as AssetClass,
          quantity: Math.max(0, Number(a.quantity ?? 0)),
          investedAmount: Math.max(0, Number(a.investedAmount ?? 0)),
          currentAmount: Math.max(0, Number(a.currentAmount ?? 0)),
        }))
    : [];

  return { balance, transactions, investments };
}

export function deduplicateImportedTransactions(
  incoming: ParsedBankTransaction[],
  existing: Transaction[]
): ParsedBankTransaction[] {
  const seen = new Set(
    existing.map(
      (t) =>
        `${t.date}_${t.type}_${t.amount.toFixed(2)}_${t.description.trim().toLowerCase()}`
    )
  );
  const result: ParsedBankTransaction[] = [];
  for (const tx of incoming) {
    const sig = `${tx.date}_${tx.type}_${tx.amount.toFixed(2)}_${tx.description.trim().toLowerCase()}`;
    if (!seen.has(sig)) {
      seen.add(sig);
      result.push(tx);
    }
  }
  return result;
}
