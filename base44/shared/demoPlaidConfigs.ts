/**
 * Demo Mode Plaid Sandbox custom-user configs (Sandbox Studio-compatible).
 *
 * Each demo profile can be connected as a Plaid Sandbox custom user:
 * /sandbox/public_token/create is called with override_username 'user_custom'
 * and override_password set to this JSON config, so the resulting Item
 * carries exactly these simulated accounts and transactions through the real
 * Sandbox flow. Income amounts are negative (money in), expenses positive.
 *
 * Dates are generated relative to "now" so the scenario always looks live.
 * These scenario numbers intentionally mirror src/services/demoProfiles.js —
 * that module is the Avera-owned local fallback dataset, always labeled
 * 'Sample data'; records imported through this connection are labeled
 * 'Plaid Sandbox' because that is genuinely where they came from.
 */

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The last `count` calendar months including the current one, oldest first. */
function recentMonths(today, count) {
  const out = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    out.push({ y: d.getFullYear(), m: d.getMonth(), i: count - 1 - i });
  }
  return out;
}

function pastDay(y, m, d, today) {
  const last = new Date(y, m + 1, 0).getDate();
  const date = `${y}-${pad(m + 1)}-${pad(Math.min(d, last))}`;
  return date <= isoDate(today) ? date : null;
}

function txn(date, amount, description) {
  if (!date) return null;
  return { date_transacted: date, date_posted: date, amount, description, currency: 'USD' };
}

function account(type, subtype, name, startingBalance, transactions) {
  return {
    type,
    subtype,
    starting_balance: startingBalance,
    meta: { name, official_name: name },
    transactions: transactions.filter(Boolean),
  };
}

const INSTITUTION_ID = 'ins_109508';
const INSTITUTION_NAME = 'First Platypus Bank (demo)';

export function demoSandboxConfig(profileKey, today = new Date()) {
  const months = recentMonths(today, 4);

  if (profileKey === 'early_career') {
    const diner = [31, 27, 36, 29];
    const checking = [];
    for (const { y, m, i } of months) {
      checking.push(
        txn(pastDay(y, m, 1, today), -3400, 'Alder & Co. payroll'),
        txn(pastDay(y, m, 3, today), 1250, 'Maple Court Rent'),
        txn(pastDay(y, m, 5, today), 310, 'AES Student Loan Payment'),
        txn(pastDay(y, m, 7, today), 95, 'Metro Transit Pass'),
        txn(pastDay(y, m, 8, today), 165, 'Hearthway Grocers'),
        txn(pastDay(y, m, 10, today), 78, 'City Power & Water'),
        txn(pastDay(y, m, 12, today), 60, 'PicoTel Internet'),
        txn(pastDay(y, m, 14, today), diner[i], 'Sagebrush Diner'),
        txn(pastDay(y, m, 15, today), 55, 'Byte Mobile'),
        txn(pastDay(y, m, 18, today), 45, 'Flux Fitness'),
        txn(pastDay(y, m, 21, today), 85, 'Corner Market'),
        txn(pastDay(y, m, 22, today), 15.99, 'Streamly')
      );
    }
    return {
      institution_id: INSTITUTION_ID,
      institution_name: INSTITUTION_NAME,
      products: ['transactions'],
      accounts: [
        account('depository', 'checking', 'Alder Checking', 1860, checking),
        account('depository', 'savings', 'Alder Savings', 2400, []),
      ],
    };
  }

  if (profileKey === 'multi_income') {
    const freelance = [640, 910, 780, 1020];
    const checking = [];
    for (const { y, m, i } of months) {
      checking.push(
        txn(pastDay(y, m, 1, today), -3100, 'Harbor Design payroll'),
        txn(pastDay(y, m, 1, today), 600, 'Bright Kids Daycare'),
        txn(pastDay(y, m, 5, today), 1860, 'Fairview Mortgage payment'),
        txn(pastDay(y, m, 5, today), 990, 'Maple Street rental mortgage'),
        txn(pastDay(y, m, 8, today), 385, 'AutoNation loan payment'),
        txn(pastDay(y, m, 9, today), 320, 'Hearthway Grocers'),
        txn(pastDay(y, m, 10, today), 165, 'City Power & Water'),
        txn(pastDay(y, m, 12, today), 80, 'PicoTel Internet'),
        txn(pastDay(y, m, 15, today), -3100, 'Harbor Design payroll'),
        txn(pastDay(y, m, 16, today), 86, 'Shell Fuel'),
        txn(pastDay(y, m, 17, today), 132, 'StateShield Auto insurance'),
        txn(pastDay(y, m, 20, today), -freelance[i], 'Weekend client payment'),
        txn(pastDay(y, m, 23, today), 210, 'Corner Market'),
        txn(pastDay(y, m, 25, today), 54, 'Sagebrush Family Dinner')
      );
    }
    return {
      institution_id: INSTITUTION_ID,
      institution_name: INSTITUTION_NAME,
      products: ['transactions'],
      accounts: [
        account('depository', 'checking', 'Harbor Checking', 6240, checking),
        account('depository', 'savings', 'Harbor Savings', 11380, []),
      ],
    };
  }

  if (profileKey === 'financial_improvement') {
    const irregular = [
      [
        { day: 4, amount: 1450, description: 'Contract cleaning client' },
        { day: 19, amount: 700, description: 'Warehouse shift pay' },
      ],
      [
        { day: 9, amount: 980, description: 'Contract cleaning client' },
        { day: 21, amount: 415, description: 'Delivery app earnings' },
      ],
      [
        { day: 6, amount: 1620, description: 'Warehouse shift pay' },
        { day: 21, amount: 520, description: 'Delivery app earnings' },
      ],
      [{ day: 3, amount: 1120, description: 'Contract cleaning client' }],
    ];
    const checking = [];
    for (const { y, m, i } of months) {
      checking.push(txn(pastDay(y, m, 1, today), -320, 'State benefits deposit'));
      for (const deposit of irregular[i]) {
        checking.push(txn(pastDay(y, m, deposit.day, today), -deposit.amount, deposit.description));
      }
      checking.push(
        txn(pastDay(y, m, 3, today), 1450, 'Larkspur Apartments Rent'),
        txn(pastDay(y, m, 8, today), 340, 'AutoNation loan payment'),
        txn(pastDay(y, m, 9, today), 110, 'Hearthway Grocers'),
        txn(pastDay(y, m, 10, today), 185, 'City Power & Water'),
        txn(pastDay(y, m, 12, today), 165, 'StateShield Auto insurance'),
        txn(pastDay(y, m, 14, today), 220, 'Apex Card minimum payment'),
        txn(pastDay(y, m, 15, today), 65, 'PicoTel Internet'),
        txn(pastDay(y, m, 16, today), 45, 'Ridgeway Fuel Co-op'),
        txn(pastDay(y, m, 18, today), 70, 'Byte Mobile'),
        txn(pastDay(y, m, 20, today), 55, 'SecureSpace Storage'),
        txn(pastDay(y, m, 24, today), 70, 'Corner Market'),
        txn(pastDay(y, m, 26, today), 18, 'Sagebrush Diner')
      );
    }
    return {
      institution_id: INSTITUTION_ID,
      institution_name: INSTITUTION_NAME,
      products: ['transactions'],
      accounts: [
        account('depository', 'checking', 'Ridgeway Checking', 620, checking),
        account('depository', 'savings', 'Ridgeway Savings', 350, []),
      ],
    };
  }

  throw new Error('Unknown demo profile');
}