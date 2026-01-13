import { useState, useEffect, useCallback } from 'react';
import { StoreItem, StorePurchase } from '@/api/entities';
import pb from '@/api/pb';

/**
 * Hook for managing store items and purchases (Student view)
 * @param {string} studentId - The student's ID
 */
export function useStore(studentId) {
  const [items, setItems] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [pendingPurchases, setPendingPurchases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load store data
  const loadStoreData = useCallback(async () => {
    try {
      // Load all active store items
      const allItems = await StoreItem.list({ is_active: true });
      // Sort by sort_order, then by cost
      const sortedItems = allItems.sort((a, b) => {
        if (a.sort_order !== b.sort_order) return (a.sort_order || 0) - (b.sort_order || 0);
        return (a.cost || 0) - (b.cost || 0);
      });
      setItems(sortedItems);

      // Load student's purchases if studentId provided
      if (studentId) {
        const studentPurchases = await StorePurchase.list({ student_id: studentId });
        setPurchases(studentPurchases);
        setPendingPurchases(studentPurchases.filter(p => p.status === 'pending'));
      }
    } catch (error) {
      console.error('Error loading store data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadStoreData();
  }, [loadStoreData]);

  /**
   * Request to purchase an item (creates pending purchase)
   * @param {string} itemId - The store item ID
   * @returns {Object} The created purchase record
   */
  const requestPurchase = useCallback(async (itemId) => {
    if (!studentId) throw new Error('No student ID provided');

    const item = items.find(i => i.id === itemId);
    if (!item) throw new Error('Item not found');

    try {
      const purchase = await StorePurchase.create({
        student_id: studentId,
        item_id: itemId,
        status: 'pending',
        cost: item.cost,
        requested_at: new Date().toISOString()
      });

      setPurchases(prev => [...prev, purchase]);
      setPendingPurchases(prev => [...prev, purchase]);

      return purchase;
    } catch (error) {
      console.error('Error requesting purchase:', error);
      throw error;
    }
  }, [studentId, items]);

  /**
   * Check if student has a pending purchase for an item
   */
  const hasPendingPurchase = useCallback((itemId) => {
    return pendingPurchases.some(p => p.item_id === itemId);
  }, [pendingPurchases]);

  /**
   * Get purchase history for an item
   */
  const getPurchaseHistory = useCallback((itemId) => {
    return purchases.filter(p => p.item_id === itemId && p.status === 'approved');
  }, [purchases]);

  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    const category = item.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  return {
    items,
    itemsByCategory,
    purchases,
    pendingPurchases,
    isLoading,
    requestPurchase,
    hasPendingPurchase,
    getPurchaseHistory,
    refresh: loadStoreData
  };
}

/**
 * Hook for managing store (Teacher view)
 */
export function useStoreManager() {
  const [items, setItems] = useState([]);
  const [allPurchases, setAllPurchases] = useState([]);
  const [pendingPurchases, setPendingPurchases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      // Load all items (including inactive)
      const allItems = await StoreItem.list();
      const sortedItems = allItems.sort((a, b) => {
        if (a.sort_order !== b.sort_order) return (a.sort_order || 0) - (b.sort_order || 0);
        return (a.cost || 0) - (b.cost || 0);
      });
      setItems(sortedItems);

      // Load all purchases
      const purchases = await StorePurchase.list();
      setAllPurchases(purchases);
      setPendingPurchases(purchases.filter(p => p.status === 'pending'));
    } catch (error) {
      console.error('Error loading store manager data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Create a new store item
   */
  const createItem = useCallback(async (itemData) => {
    try {
      const newItem = await StoreItem.create({
        ...itemData,
        is_active: itemData.is_active !== false,
        sort_order: itemData.sort_order || items.length
      });
      setItems(prev => [...prev, newItem]);
      return newItem;
    } catch (error) {
      console.error('Error creating store item:', error);
      throw error;
    }
  }, [items.length]);

  /**
   * Update a store item
   */
  const updateItem = useCallback(async (itemId, updates) => {
    try {
      const updated = await StoreItem.update(itemId, updates);
      setItems(prev => prev.map(item => item.id === itemId ? updated : item));
      return updated;
    } catch (error) {
      console.error('Error updating store item:', error);
      throw error;
    }
  }, []);

  /**
   * Delete a store item
   */
  const deleteItem = useCallback(async (itemId) => {
    try {
      await StoreItem.delete(itemId);
      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting store item:', error);
      throw error;
    }
  }, []);

  /**
   * Approve a purchase
   * @param {string} purchaseId - Purchase ID
   * @param {Function} spendCurrencyFn - Function to deduct currency from student
   */
  const approvePurchase = useCallback(async (purchaseId, spendCurrencyFn) => {
    try {
      const purchase = allPurchases.find(p => p.id === purchaseId);
      if (!purchase) throw new Error('Purchase not found');

      // Deduct currency from student
      if (spendCurrencyFn) {
        await spendCurrencyFn(purchase.cost, purchase.item_id, `Kauf: ${purchase.item_name}`);
      }

      // Update purchase status
      const updated = await StorePurchase.update(purchaseId, {
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: pb.authStore.model?.id
      });

      setAllPurchases(prev => prev.map(p => p.id === purchaseId ? updated : p));
      setPendingPurchases(prev => prev.filter(p => p.id !== purchaseId));

      return updated;
    } catch (error) {
      console.error('Error approving purchase:', error);
      throw error;
    }
  }, [allPurchases]);

  /**
   * Reject a purchase
   */
  const rejectPurchase = useCallback(async (purchaseId, reason) => {
    try {
      const updated = await StorePurchase.update(purchaseId, {
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: pb.authStore.model?.id,
        rejection_reason: reason || ''
      });

      setAllPurchases(prev => prev.map(p => p.id === purchaseId ? updated : p));
      setPendingPurchases(prev => prev.filter(p => p.id !== purchaseId));

      return updated;
    } catch (error) {
      console.error('Error rejecting purchase:', error);
      throw error;
    }
  }, []);

  /**
   * Update sort order for items
   */
  const updateSortOrder = useCallback(async (orderedIds) => {
    try {
      const updates = orderedIds.map((id, index) => ({
        id,
        sort_order: index
      }));

      await Promise.all(updates.map(({ id, sort_order }) =>
        StoreItem.update(id, { sort_order })
      ));

      setItems(prev => {
        const itemMap = new Map(prev.map(item => [item.id, item]));
        return orderedIds.map((id, index) => ({
          ...itemMap.get(id),
          sort_order: index
        }));
      });
    } catch (error) {
      console.error('Error updating sort order:', error);
      throw error;
    }
  }, []);

  return {
    items,
    allPurchases,
    pendingPurchases,
    isLoading,
    createItem,
    updateItem,
    deleteItem,
    approvePurchase,
    rejectPurchase,
    updateSortOrder,
    refresh: loadData
  };
}

export default useStore;
