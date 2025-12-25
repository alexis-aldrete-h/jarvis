import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native'
import { Transaction, TransactionType, ExpenseCategory } from '@jarvis/shared'
import { useFinances } from '../hooks/useFinances'
import { formatDate } from '@jarvis/shared'

const categoryColors: Record<ExpenseCategory, string> = {
  food: '#f97316',
  transportation: '#3b82f6',
  entertainment: '#a855f7',
  shopping: '#ec4899',
  bills: '#ef4444',
  healthcare: '#10b981',
  education: '#6366f1',
  travel: '#eab308',
  other: '#6b7280',
}

export default function FinancesScreen() {
  const {
    transactions,
    budgets,
    addTransaction,
    deleteTransaction,
    getFinancialSummary,
  } = useFinances()

  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [transactionForm, setTransactionForm] = useState({
    type: 'expense' as TransactionType,
    amount: '',
    description: '',
    category: 'other' as ExpenseCategory,
    date: new Date().toISOString().split('T')[0],
  })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const summary = getFinancialSummary(monthStart, monthEnd)

  const handleAddTransaction = async () => {
    if (!transactionForm.amount || !transactionForm.description) {
      Alert.alert('Error', 'Please fill in all required fields')
      return
    }

    await addTransaction({
      type: transactionForm.type,
      amount: parseFloat(transactionForm.amount),
      description: transactionForm.description,
      category: transactionForm.category,
      date: transactionForm.date,
    })

    setTransactionForm({
      type: 'expense',
      amount: '',
      description: '',
      category: 'other',
      date: new Date().toISOString().split('T')[0],
    })
    setShowTransactionForm(false)
  }

  const handleDelete = (id: string) => {
    Alert.alert('Delete Transaction', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(id) },
    ])
  }

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.incomeCard]}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={styles.summaryAmount}>
              ${summary.totalIncome.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.summaryCard, styles.expenseCard]}>
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={styles.summaryAmount}>
              ${summary.totalExpenses.toFixed(2)}
            </Text>
          </View>
        </View>
        <View style={[styles.summaryCard, styles.balanceCard]}>
          <Text style={styles.summaryLabel}>Balance</Text>
          <Text
            style={[
              styles.summaryAmount,
              summary.balance >= 0 ? styles.positiveBalance : styles.negativeBalance,
            ]}
          >
            ${summary.balance.toFixed(2)}
          </Text>
        </View>

        {/* Recent Transactions */}
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {recentTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          recentTransactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              onDelete={() => handleDelete(transaction.id)}
            />
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowTransactionForm(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={showTransactionForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTransactionForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Transaction</Text>
            <TextInput
              style={styles.input}
              placeholder="Amount"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={transactionForm.amount}
              onChangeText={(text) => setTransactionForm({ ...transactionForm, amount: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Description"
              placeholderTextColor="#94a3b8"
              value={transactionForm.description}
              onChangeText={(text) => setTransactionForm({ ...transactionForm, description: text })}
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.typeButton, transactionForm.type === 'income' && styles.typeButtonActive]}
                onPress={() => setTransactionForm({ ...transactionForm, type: 'income' })}
              >
                <Text style={styles.typeButtonText}>Income</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, transactionForm.type === 'expense' && styles.typeButtonActive]}
                onPress={() => setTransactionForm({ ...transactionForm, type: 'expense' })}
              >
                <Text style={styles.typeButtonText}>Expense</Text>
              </TouchableOpacity>
            </View>
            {transactionForm.type === 'expense' && (
              <Text style={styles.label}>Category</Text>
            )}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowTransactionForm(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleAddTransaction}
              >
                <Text style={styles.buttonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function TransactionItem({
  transaction,
  onDelete,
}: {
  transaction: Transaction
  onDelete: () => void
}) {
  return (
    <View style={styles.transactionCard}>
      <View style={styles.transactionContent}>
        <View style={styles.transactionIcon}>
          <Text style={styles.transactionIconText}>
            {transaction.type === 'income' ? '↑' : '↓'}
          </Text>
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>{transaction.description}</Text>
          <View style={styles.transactionMeta}>
            {transaction.category && (
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: categoryColors[transaction.category] },
                ]}
              >
                <Text style={styles.categoryText}>{transaction.category}</Text>
              </View>
            )}
            <Text style={styles.transactionDate}>
              {formatDate(new Date(transaction.date))}
            </Text>
          </View>
        </View>
        <View style={styles.transactionAmount}>
          <Text
            style={[
              styles.amountText,
              transaction.type === 'income' ? styles.incomeAmount : styles.expenseAmount,
            ]}
          >
            {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
          </Text>
          <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
            <Text style={styles.deleteText}>×</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
  },
  incomeCard: {
    backgroundColor: '#10b981',
  },
  expenseCard: {
    backgroundColor: '#ef4444',
  },
  balanceCard: {
    backgroundColor: '#1e293b',
    marginBottom: 24,
  },
  summaryLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.9,
  },
  summaryAmount: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  positiveBalance: {
    color: '#10b981',
  },
  negativeBalance: {
    color: '#ef4444',
  },
  sectionTitle: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  transactionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionIconText: {
    fontSize: 20,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  transactionDate: {
    color: '#94a3b8',
    fontSize: 12,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  incomeAmount: {
    color: '#10b981',
  },
  expenseAmount: {
    color: '#ef4444',
  },
  deleteButton: {
    padding: 4,
  },
  deleteText: {
    color: '#ef4444',
    fontSize: 20,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  fabText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    color: '#f1f5f9',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#f1f5f9',
    fontSize: 16,
    marginBottom: 12,
  },
  label: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#0ea5e9',
  },
  typeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#475569',
  },
  submitButton: {
    backgroundColor: '#10b981',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

