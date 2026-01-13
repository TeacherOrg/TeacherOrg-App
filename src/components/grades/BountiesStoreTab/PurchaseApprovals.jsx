import React from 'react';
import { Check, X, Clock, Coins, Loader2, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * PurchaseApprovals - View and approve/reject student purchases
 */
export default function PurchaseApprovals({ storeManager, students = [] }) {
  const {
    pendingPurchases = [],
    allPurchases = [],
    approvePurchase,
    rejectPurchase,
    isLoading
  } = storeManager || {};

  // Get student name by ID
  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student?.name || 'Unbekannt';
  };

  const handleApprove = async (purchase) => {
    try {
      await approvePurchase(purchase.id);
      toast.success(`Kauf genehmigt: ${purchase.item_name}`);
    } catch (error) {
      toast.error('Fehler beim Genehmigen');
    }
  };

  const handleReject = async (purchase) => {
    const reason = window.prompt('Grund für Ablehnung (optional):');
    try {
      await rejectPurchase(purchase.id, reason || '');
      toast.success('Kauf abgelehnt');
    } catch (error) {
      toast.error('Fehler beim Ablehnen');
    }
  };

  // Recent purchases (last 20)
  const recentPurchases = allPurchases
    .filter(p => p.status !== 'pending')
    .sort((a, b) => new Date(b.reviewed_at || b.requested_at) - new Date(a.reviewed_at || a.requested_at))
    .slice(0, 20);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Purchases */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-500" />
          Ausstehende Anfragen ({pendingPurchases.length})
        </h3>

        {pendingPurchases.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-slate-500">
              Keine ausstehenden Kaufanfragen
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
            {pendingPurchases.map(purchase => (
              <Card key={purchase.id} className="border-yellow-200 dark:border-yellow-900/50 bg-yellow-50/50 dark:bg-yellow-900/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{purchase.item_icon || '?'}</span>
                      <div>
                        <div className="font-semibold">{getStudentName(purchase.student_id)}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          möchte <span className="font-medium">{purchase.item_name}</span> kaufen
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Coins className="w-4 h-4 text-amber-500" />
                            {purchase.cost} Punkte
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(purchase.requested_at).toLocaleDateString('de-DE', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleReject(purchase)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Ablehnen
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleApprove(purchase)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Genehmigen
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent History */}
      {recentPurchases.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-slate-600">
            <History className="w-5 h-5" />
            Letzte Entscheidungen
          </h3>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y dark:divide-slate-700 max-h-[35vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                {recentPurchases.map(purchase => {
                  const isApproved = purchase.status === 'approved';
                  const StatusIcon = isApproved ? Check : X;

                  return (
                    <div key={purchase.id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{purchase.item_icon || '?'}</span>
                        <div>
                          <span className="font-medium">{getStudentName(purchase.student_id)}</span>
                          <span className="text-slate-500"> - {purchase.item_name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500">
                          {purchase.reviewed_at && new Date(purchase.reviewed_at).toLocaleDateString('de-DE', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </span>
                        <div className={`
                          flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                          ${isApproved
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }
                        `}>
                          <StatusIcon className="w-3 h-3" />
                          {isApproved ? 'Genehmigt' : 'Abgelehnt'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
