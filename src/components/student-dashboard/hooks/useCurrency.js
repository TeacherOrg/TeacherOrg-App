import { useState, useEffect, useCallback } from 'react';
import { StudentCurrency, CurrencyTransaction } from '@/api/entities';

/**
 * Hook for managing student currency
 * @param {string} studentId - The student's ID
 * @returns {Object} Currency data and functions
 */
export function useCurrency(studentId) {
  const [currencyData, setCurrencyData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load currency data
  const loadCurrencyData = useCallback(async () => {
    if (!studentId) {
      setIsLoading(false);
      return;
    }

    try {
      // Try to find existing currency record
      let currency = await StudentCurrency.findOne({
        student_id: studentId,
        $cancelKey: `load_currency_${studentId}`
      });

      // If no currency record exists, create one with 0 balance
      if (!currency) {
        currency = await StudentCurrency.create({
          student_id: studentId,
          balance: 0,
          lifetime_earned: 0,
          lifetime_spent: 0,
          $cancelKey: `create_currency_${studentId}`
        });
      }

      setCurrencyData(currency);

      // Load recent transactions
      const txns = await CurrencyTransaction.list({
        student_id: studentId,
        $cancelKey: `load_txns_${studentId}`
      });
      // Sort by created descending (most recent first)
      const sortedTxns = txns.sort((a, b) =>
        new Date(b.created) - new Date(a.created)
      );
      setTransactions(sortedTxns);
    } catch (error) {
      // Ignore auto-cancellation errors
      if (error?.message?.includes('autocancelled')) {
        return;
      }
      console.error('Error loading currency data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadCurrencyData();
  }, [loadCurrencyData]);

  /**
   * Award currency to the student
   * @param {number} amount - Amount to award (positive number)
   * @param {string} type - Transaction type: 'goal' | 'achievement' | 'bounty' | 'adjustment'
   * @param {string} referenceId - ID of the source (goal, achievement, bounty)
   * @param {string} description - Human-readable description
   */
  const awardCurrency = useCallback(async (amount, type, referenceId, description) => {
    if (!studentId || !currencyData || amount <= 0) return null;

    // Generate unique key to prevent auto-cancellation
    const uniqueKey = `${type}_${referenceId}_${Date.now()}`;

    try {
      // Create transaction record
      const transaction = await CurrencyTransaction.create({
        student_id: studentId,
        amount: amount,
        type: type,
        reference_type: type === 'goal' ? 'competency_goal' :
                        type === 'achievement' ? 'achievement' :
                        type === 'bounty' ? 'bounty' : 'manual',
        reference_id: referenceId || '',
        description: description || '',
        $cancelKey: `txn_create_${uniqueKey}`
      });

      // Update currency balance
      const newBalance = (currencyData.balance || 0) + amount;
      const newLifetimeEarned = (currencyData.lifetime_earned || 0) + amount;

      const updatedCurrency = await StudentCurrency.update(currencyData.id, {
        balance: newBalance,
        lifetime_earned: newLifetimeEarned,
        $cancelKey: `currency_update_${uniqueKey}`
      });

      setCurrencyData(updatedCurrency);
      setTransactions(prev => [transaction, ...prev]);

      return transaction;
    } catch (error) {
      // Ignore auto-cancellation errors
      if (error?.message?.includes('autocancelled')) {
        return null;
      }
      console.error('Error awarding currency:', error);
      throw error;
    }
  }, [studentId, currencyData]);

  /**
   * Spend currency (for purchases)
   * @param {number} amount - Amount to spend (positive number)
   * @param {string} itemId - ID of the store item
   * @param {string} description - Human-readable description
   */
  const spendCurrency = useCallback(async (amount, itemId, description) => {
    if (!studentId || !currencyData || amount <= 0) return null;
    if ((currencyData.balance || 0) < amount) {
      throw new Error('Insufficient currency balance');
    }

    try {
      // Create transaction record (negative amount for spending)
      const transaction = await CurrencyTransaction.create({
        student_id: studentId,
        amount: -amount,
        type: 'purchase',
        reference_type: 'store_item',
        reference_id: itemId || '',
        description: description || ''
      });

      // Update currency balance
      const newBalance = (currencyData.balance || 0) - amount;
      const newLifetimeSpent = (currencyData.lifetime_spent || 0) + amount;

      const updatedCurrency = await StudentCurrency.update(currencyData.id, {
        balance: newBalance,
        lifetime_spent: newLifetimeSpent
      });

      setCurrencyData(updatedCurrency);
      setTransactions(prev => [transaction, ...prev]);

      return transaction;
    } catch (error) {
      console.error('Error spending currency:', error);
      throw error;
    }
  }, [studentId, currencyData]);

  /**
   * Manually adjust currency (for teacher corrections)
   * @param {number} amount - Amount to adjust (can be positive or negative)
   * @param {string} reason - Reason for adjustment
   */
  const adjustCurrency = useCallback(async (amount, reason) => {
    if (!studentId || !currencyData) return null;

    try {
      const transaction = await CurrencyTransaction.create({
        student_id: studentId,
        amount: amount,
        type: 'adjustment',
        reference_type: 'manual',
        reference_id: '',
        description: reason || 'Manuelle Anpassung'
      });

      const newBalance = Math.max(0, (currencyData.balance || 0) + amount);
      const updates = { balance: newBalance };

      if (amount > 0) {
        updates.lifetime_earned = (currencyData.lifetime_earned || 0) + amount;
      } else {
        updates.lifetime_spent = (currencyData.lifetime_spent || 0) + Math.abs(amount);
      }

      const updatedCurrency = await StudentCurrency.update(currencyData.id, updates);

      setCurrencyData(updatedCurrency);
      setTransactions(prev => [transaction, ...prev]);

      return transaction;
    } catch (error) {
      console.error('Error adjusting currency:', error);
      throw error;
    }
  }, [studentId, currencyData]);

  return {
    // Data
    balance: currencyData?.balance || 0,
    lifetimeEarned: currencyData?.lifetime_earned || 0,
    lifetimeSpent: currencyData?.lifetime_spent || 0,
    transactions,
    isLoading,
    currencyRecord: currencyData,

    // Actions
    awardCurrency,
    spendCurrency,
    adjustCurrency,
    refresh: loadCurrencyData
  };
}

/**
 * Hook for teachers to view all students' currency
 * @param {string} classId - Optional class ID to filter by
 */
export function useAllStudentsCurrency(classId) {
  const [currencyData, setCurrencyData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAllCurrency = useCallback(async () => {
    try {
      const allCurrency = await StudentCurrency.list(classId ? { class_id: classId } : {});
      setCurrencyData(allCurrency);
    } catch (error) {
      console.error('Error loading all currency data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadAllCurrency();
  }, [loadAllCurrency]);

  return {
    currencyData,
    isLoading,
    refresh: loadAllCurrency
  };
}

export default useCurrency;
