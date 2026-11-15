import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deduplicateImportedTransactions,
  parseBankCSVStatement,
  parseOFXStatement,
  parseOpenFinanceJSON,
} from './bankSync';
import { Transaction } from '../types/finance';

test('parseOFXStatement extracts balance and transactions', () => {
  const ofx = `
    <OFX>
      <BANKMSGSRSV1>
        <STMTTRNRS>
          <STMTRS>
            <BANKTRANLIST>
              <STMTTRN>
                <TRNTYPE>CREDIT
                <DTPOSTED>20261110000000
                <TRNAMT>4200.50
                <FITID>1001
                <MEMO>TED SALARIO
              </STMTTRN>
              <STMTTRN>
                <TRNTYPE>DEBIT
                <DTPOSTED>20261112000000
                <TRNAMT>-185.90
                <FITID>1002
                <MEMO>SUPERMERCADO CENTRAL
              </STMTTRN>
            </BANKTRANLIST>
            <LEDGERBAL>
              <BALAMT>9850.25
            </LEDGERBAL>
          </STMTRS>
        </STMTTRNRS>
      </BANKMSGSRSV1>
    </OFX>
  `;
  const parsed = parseOFXStatement(ofx);
  assert.equal(parsed.balance, 9850.25);
  assert.equal(parsed.transactions.length, 2);
  assert.equal(parsed.transactions[0].type, 'income');
  assert.equal(parsed.transactions[0].amount, 4200.5);
  assert.equal(parsed.transactions[0].date, '2026-11-10');
  assert.equal(parsed.transactions[1].type, 'expense');
  assert.equal(parsed.transactions[1].amount, 185.9);
});

test('parseBankCSVStatement handles Brazilian semicolon CSV statements', () => {
  const csv = `Data;Descrição;Valor;Categoria\n10/11/2026;Pagamento Fornecedor;-350,75;Serviços\n11/11/2026;Recebimento PIX;1.250,00;Receitas`;
  const parsed = parseBankCSVStatement(csv);
  assert.equal(parsed.transactions.length, 2);
  assert.equal(parsed.transactions[0].type, 'expense');
  assert.equal(parsed.transactions[0].amount, 350.75);
  assert.equal(parsed.transactions[1].type, 'income');
  assert.equal(parsed.transactions[1].amount, 1250);
});

test('parseOpenFinanceJSON and deduplicateImportedTransactions prevent duplicates', () => {
  const json = {
    balance: 15000,
    transactions: [
      { id: '1', date: '2026-11-10', type: 'income', amount: 1000, description: 'PIX Recebido' },
      { id: '2', date: '2026-11-11', type: 'expense', amount: 250, description: 'Energia' },
    ],
    investments: [
      { name: 'CDB 110% CDI', ticker: 'CDB110', assetClass: 'fixed_income', quantity: 1, investedAmount: 5000, currentAmount: 5300 },
    ],
  };
  const parsed = parseOpenFinanceJSON(json);
  assert.equal(parsed.balance, 15000);
  assert.equal(parsed.investments.length, 1);

  const existing: Transaction[] = [
    {
      id: 't1',
      userId: 'u1',
      type: 'income',
      amount: 1000,
      description: 'PIX Recebido',
      date: '2026-11-10',
      categoryId: 'c1',
      categoryName: 'Outras Receitas',
      isRecurring: false,
      recurrenceFrequency: 'none',
      notes: '',
    },
  ];

  const deduped = deduplicateImportedTransactions(parsed.transactions, existing);
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].description, 'Energia');
});
