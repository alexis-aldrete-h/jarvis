export type TransactionType = 'income' | 'expense' | 'transfer';

export type ExpenseCategory =
  | 'food'
  | 'transportation'
  | 'entertainment'
  | 'shopping'
  | 'bills'
  | 'healthcare'
  | 'education'
  | 'travel'
  | 'other';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category?: ExpenseCategory;
  date: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  tags?: string[];
}

export interface Budget {
  id: string;
  category: ExpenseCategory;
  limit: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: Date | string;
  endDate?: Date | string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  period: {
    start: Date | string;
    end: Date | string;
  };
}

export type Currency = 'MXN' | 'USD';

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  accountType: 'checking' | 'savings' | 'credit-card';
  balanceMXN: number;
  balanceUSD: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Cash {
  id: string;
  name: string;
  type: 'pesos' | 'dollars';
  amountMXN: number;
  amountUSD: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type InvestmentType = 'etf' | 'stock' | 'crypto' | '401k' | 'other';

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  quantity?: number; // Number of shares
  pricePerShare?: number; // Price per share in USD
  valueMXN: number;
  valueUSD: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type DebtType = 'owed-to-me' | 'i-owe';

export interface Debt {
  id: string;
  name: string;
  type: DebtType;
  amountMXN: number;
  amountUSD: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface RetirementAccount {
  id: string;
  name: string;
  type: 'afore' | 'infonavit' | '401k' | 'ira' | 'other';
  valueMXN: number;
  valueUSD: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface NetWorthSummary {
  totalCashMXN: number;
  totalCashUSD: number;
  totalBanksMXN: number;
  totalBanksUSD: number;
  totalSavingsMXN: number;
  totalSavingsUSD: number;
  totalInvestmentsMXN: number;
  totalInvestmentsUSD: number;
  totalDebtOwedMXN: number;
  totalDebtOwedUSD: number;
  totalDebtOwedToMeMXN: number;
  totalDebtOwedToMeUSD: number;
  netDebtMXN: number;
  netDebtUSD: number;
  netWorthFromSavingsMXN: number;
  netWorthFromSavingsUSD: number;
  netWorthWithInvestmentsMXN: number;
  netWorthWithInvestmentsUSD: number;
  totalRetirementMXN: number;
  totalRetirementUSD: number;
  totalNetWorthMXN: number;
  totalNetWorthUSD: number;
}

