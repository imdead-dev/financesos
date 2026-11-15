import { CurrencyCode } from '../types/finance';
import {
  ASSET_CLASS_LABELS,
  formatCurrency,
  formatDateBR,
  formatPercent,
} from './formatters';
import { calculateInvestmentMetrics } from './financeMath';
import { GeneratedFinancialReport } from './reports';

function sanitizePdfLatin1(text: string): string {
  // Replace non-WinAnsi characters (like R$ stays R$, em-dash becomes '-')
  return text
    .replace(/\u00A0/g, ' ')
    .replace(/[—–]/g, '-')
    .replace(/[^\x20-\x7E\xA1-\xFF]/g, '?');
}

function escapePdfString(text: string): string {
  return sanitizePdfLatin1(text)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, Math.max(0, maxLen - 3)) + '...';
}

interface PdfLine {
  text: string;
  size: number;
  bold?: boolean;
  spacingAfter?: number;
}

export function customReportToPDF(
  report: GeneratedFinancialReport,
  currency: CurrencyCode
): Uint8Array {
  const lines: PdfLine[] = [];

  lines.push({ text: 'FINANCE OS - RELATORIO FINANCEIRO PERSONALIZADO', size: 14, bold: true, spacingAfter: 6 });
  lines.push({
    text: `Periodo: ${report.filter.startDate ? formatDateBR(report.filter.startDate) : 'Inicio'} ate ${
      report.filter.endDate ? formatDateBR(report.filter.endDate) : 'Hoje'
    } | Gerado em: ${formatDateBR(report.generatedAt.slice(0, 10))}`,
    size: 9,
    spacingAfter: 14,
  });

  lines.push({ text: 'RESUMO CONSOLIDADO', size: 11, bold: true, spacingAfter: 6 });
  if (report.filter.includeIncome) {
    lines.push({
      text: `Receitas no periodo: ${formatCurrency(report.summary.totalIncome, currency)}`,
      size: 10,
    });
  }
  if (report.filter.includeExpenses) {
    lines.push({
      text: `Despesas no periodo: ${formatCurrency(report.summary.totalExpenses, currency)}`,
      size: 10,
    });
  }
  if (report.filter.includeIncome || report.filter.includeExpenses) {
    lines.push({
      text: `Resultado do periodo: ${formatCurrency(report.summary.periodNet, currency)}`,
      size: 10,
      bold: true,
    });
  }
  if (report.filter.includeInvestments) {
    lines.push({
      text: `Investimentos (Valor Atual): ${formatCurrency(report.summary.investmentsCurrentValue, currency)} | Retorno: ${formatCurrency(report.summary.investmentsReturn, currency)}`,
      size: 10,
    });
  }
  if (report.filter.includeNetWorth) {
    lines.push({
      text: `Patrimonio Total: ${formatCurrency(report.summary.totalNetWorth, currency)} (Saldo: ${formatCurrency(report.summary.availableBalance, currency)} | Reservas: ${formatCurrency(report.summary.totalSaved, currency)})`,
      size: 10,
      bold: true,
    });
  }

  if (report.transactions.length > 0) {
    lines.push({ text: '', size: 8, spacingAfter: 8 });
    lines.push({
      text: `MOVIMENTACOES (${report.transactions.length})`,
      size: 11,
      bold: true,
      spacingAfter: 6,
    });
    lines.push({
      text: 'DATA        TIPO     CATEGORIA             DESCRICAO                 VALOR',
      size: 8,
      bold: true,
      spacingAfter: 4,
    });

    for (const tx of report.transactions) {
      const dateCol = formatDateBR(tx.date).padEnd(12, ' ');
      const typeCol = (tx.type === 'income' ? 'Receita' : 'Despesa').padEnd(9, ' ');
      const catCol = truncateText(tx.categoryName, 20).padEnd(22, ' ');
      const descCol = truncateText(tx.description, 24).padEnd(26, ' ');
      const valCol = formatCurrency(tx.amount, currency);
      lines.push({
        text: `${dateCol}${typeCol}${catCol}${descCol}${valCol}`,
        size: 8,
      });
    }
  }

  if (report.investments.length > 0) {
    lines.push({ text: '', size: 8, spacingAfter: 8 });
    lines.push({
      text: `CARTEIRA DE INVESTIMENTOS (${report.investments.length})`,
      size: 11,
      bold: true,
      spacingAfter: 6,
    });
    lines.push({
      text: 'ATIVO                   CLASSE          INVESTIDO         ATUAL             RETORNO',
      size: 8,
      bold: true,
      spacingAfter: 4,
    });
    for (const inv of report.investments) {
      const m = calculateInvestmentMetrics(inv);
      const nameCol = truncateText(
        inv.ticker ? `${inv.name} (${inv.ticker})` : inv.name,
        22
      ).padEnd(24, ' ');
      const clsCol = truncateText(ASSET_CLASS_LABELS[inv.assetClass], 14).padEnd(16, ' ');
      const invCol = formatCurrency(inv.investedAmount, currency).padEnd(18, ' ');
      const curCol = formatCurrency(inv.currentAmount, currency).padEnd(18, ' ');
      const retCol = formatPercent(m.returnPercent, true);
      lines.push({
        text: `${nameCol}${clsCol}${invCol}${curCol}${retCol}`,
        size: 8,
      });
    }
  }

  if (report.savingsGoals.length > 0) {
    lines.push({ text: '', size: 8, spacingAfter: 8 });
    lines.push({
      text: `METAS DE ECONOMIA (${report.savingsGoals.length})`,
      size: 11,
      bold: true,
      spacingAfter: 6,
    });
    for (const g of report.savingsGoals) {
      const pct = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
      lines.push({
        text: `${truncateText(g.name, 28).padEnd(30, ' ')} ${formatCurrency(g.currentAmount, currency)} / ${formatCurrency(g.targetAmount, currency)} (${formatPercent(pct)})`,
        size: 9,
      });
    }
  }

  // Paginate onto A4 (595 x 842 pt)
  const pageHeight = 842;
  const marginX = 42;
  const topY = pageHeight - 48;
  const bottomY = 48;

  const pagesContent: string[] = [];
  let currentStream: string[] = [];
  let y = topY;

  const flushPage = () => {
    pagesContent.push(currentStream.join('\n'));
    currentStream = [];
    y = topY;
  };

  for (const line of lines) {
    const step = line.size + (line.spacingAfter ?? 4);
    if (y - step < bottomY) {
      flushPage();
    }
    if (line.text) {
      const fontRef = line.bold ? '/F2' : '/F1';
      currentStream.push('BT');
      currentStream.push(`${fontRef} ${line.size} Tf`);
      currentStream.push(`1 0 0 1 ${marginX} ${y} Tm`);
      currentStream.push(`(${escapePdfString(line.text)}) Tj`);
      currentStream.push('ET');
    }
    y -= step;
  }
  if (currentStream.length > 0 || pagesContent.length === 0) {
    flushPage();
  }

  // Assemble PDF 1.4 objects
  const objects: string[] = [];
  const addObj = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const fontRegularId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>');
  const fontBoldId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>');

  const pageIds: number[] = [];
  const pagesRootPlaceholderId = objects.length + 1;
  addObj(''); // placeholder for /Pages

  for (const streamText of pagesContent) {
    const contentId = addObj(
      `<< /Length ${streamText.length} >>\nstream\n${streamText}\nendstream`
    );
    const pageId = addObj(
      `<< /Type /Page /Parent ${pagesRootPlaceholderId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
  }

  objects[pagesRootPlaceholderId - 1] =
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesRootPlaceholderId} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const out = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) {
    out[i] = pdf.charCodeAt(i) & 0xff;
  }
  return out;
}
