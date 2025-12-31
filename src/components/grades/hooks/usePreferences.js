// src/components/grades/hooks/usePreferences.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { UserPreferences, User } from '@/api/entities';
import debounce from "lodash/debounce";
import pb from '@/api/pb';

export const usePreferences = (activeClassId) => {
  const [expandedLeistungenRows, setExpandedLeistungenRows] = useState(new Set());
  const [expandedUeberfachlichHistories, setExpandedUeberfachlichHistories] = useState(new Set());
  const [expandedUeberfachlichCompetencies, setExpandedUeberfachlichCompetencies] = useState(new Set());
  const [tab, setTab] = useState('diagramme');
  const [isLoading, setIsLoading] = useState(true);

  // Refs für aktuelle State-Werte (Bug 6 Fix: Debounce mit aktuellen Werten)
  const expandedLeistungenRowsRef = useRef(expandedLeistungenRows);
  const expandedUeberfachlichHistoriesRef = useRef(expandedUeberfachlichHistories);
  const expandedUeberfachlichCompetenciesRef = useRef(expandedUeberfachlichCompetencies);
  const tabRef = useRef(tab);
  const activeClassIdRef = useRef(activeClassId);

  // Bug 7 Fix: Symbol-basierte Request-IDs für robustere Überprüfung
  const activeRequestRef = useRef(null);

  // Bug 5 Fix: Spezifische Subscription-Referenz statt global unsubscribe
  const subscriptionUnsubscribeRef = useRef(null);

  // Refs aktuell halten
  useEffect(() => { expandedLeistungenRowsRef.current = expandedLeistungenRows; }, [expandedLeistungenRows]);
  useEffect(() => { expandedUeberfachlichHistoriesRef.current = expandedUeberfachlichHistories; }, [expandedUeberfachlichHistories]);
  useEffect(() => { expandedUeberfachlichCompetenciesRef.current = expandedUeberfachlichCompetencies; }, [expandedUeberfachlichCompetencies]);
  useEffect(() => { tabRef.current = tab; }, [tab]);
  useEffect(() => { activeClassIdRef.current = activeClassId; }, [activeClassId]);

  // Bug 6 Fix: Debounce mit Refs statt Closures
  const savePreferences = useCallback(
    debounce(async (customData = null) => {
      const currentActiveClassId = activeClassIdRef.current;
      if (!currentActiveClassId) {
        console.warn('No activeClassId provided, skipping savePreferences');
        return;
      }

      const user = User.current();
      if (!user || !user.id) {
        console.warn('No user found for saving preferences');
        return;
      }

      // Bug 7 Fix: Symbol-basierte Request-ID
      const requestId = Symbol('save-request');
      activeRequestRef.current = requestId;
      const cancelKey = `save-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      try {
        // Bug 6 Fix: Aktuelle Werte aus Refs lesen
        const currentPreferences = {
          expandedLeistungenRows: Array.from(expandedLeistungenRowsRef.current),
          expandedUeberfachlichHistories: Array.from(expandedUeberfachlichHistoriesRef.current),
          expandedUeberfachlichCompetencies: Array.from(expandedUeberfachlichCompetenciesRef.current),
          performanceTab: tabRef.current
        };

        const preferencesToSave = customData || currentPreferences;

        if (process.env.NODE_ENV === 'development') {
          console.log('savePreferences - Saving:', preferencesToSave);
        }

        const preference = await UserPreferences.findOne({
          user_id: user.id,
          class_id: currentActiveClassId,
          $cancelKey: cancelKey
        });

        // Bug 7 Fix: Request-Überprüfung mit Symbol
        if (activeRequestRef.current !== requestId) {
          console.log('savePreferences - Request superseded, skipping');
          return;
        }

        if (preference) {
          await UserPreferences.update(preference.id, {
            preferences: preferencesToSave
          }, { $cancelKey: cancelKey });
        } else {
          await UserPreferences.create({
            user_id: user.id,
            class_id: currentActiveClassId,
            preferences: preferencesToSave
          }, { $cancelKey: cancelKey });
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('savePreferences - Success');
        }
      } catch (error) {
        if (!error.message?.includes('autocancelled')) {
          console.error('savePreferences - Error:', error);
        }
      }
    }, 500),
    [] // Bug 6 Fix: Keine Dependencies nötig, da Refs verwendet werden
  );

  const loadPreferences = useCallback(async () => {
    if (!activeClassId) {
      console.warn('No activeClassId provided, skipping loadPreferences');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Bug 7 Fix: Symbol-basierte Request-ID
    const requestId = Symbol('load-request');
    activeRequestRef.current = requestId;
    const cancelKey = `load-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log('=== LOAD PREFERENCES START ===');
    console.log('activeClassId:', activeClassId);

    try {
      const user = User.current();
      if (!user || !user.id) {
        console.warn('No user found for loading preferences');
        setTab('diagramme');
        setIsLoading(false);
        return;
      }

      console.log('Loading preferences for user:', user.id, 'class:', activeClassId);

      const preference = await UserPreferences.findOne({
        user_id: user.id,
        class_id: activeClassId,
        $cancelKey: cancelKey
      });

      // Bug 7 Fix: Request-Überprüfung mit Symbol
      if (activeRequestRef.current !== requestId) {
        console.log('loadPreferences - Request superseded, skipping');
        setIsLoading(false);
        return;
      }

      if (preference?.preferences) {
        console.log('Found preference:', preference.id, 'Data:', preference.preferences);

        setExpandedLeistungenRows(new Set(
          Array.isArray(preference.preferences.expandedLeistungenRows)
            ? preference.preferences.expandedLeistungenRows
            : []
        ));
        setExpandedUeberfachlichHistories(new Set(
          Array.isArray(preference.preferences.expandedUeberfachlichHistories)
            ? preference.preferences.expandedUeberfachlichHistories
            : []
        ));
        setExpandedUeberfachlichCompetencies(new Set(
          Array.isArray(preference.preferences.expandedUeberfachlichCompetencies)
            ? preference.preferences.expandedUeberfachlichCompetencies
            : []
        ));

        // Bug 2 Fix: Gespeicherten Tab respektieren statt 'diagramme' zu erzwingen
        const savedTab = preference.preferences.performanceTab;
        const validTabs = ['diagramme', 'leistungen', 'ueberfachlich'];
        const initialTab = validTabs.includes(savedTab) ? savedTab : 'diagramme';
        console.log('Loading saved tab:', initialTab);
        setTab(initialTab);

        // Bug 2 Fix: ENTFERNT - Keine Tab-Korrektur mehr auf 'diagramme'
      } else {
        console.log('No preferences found, creating with defaults');
        const defaultPreferences = {
          expandedLeistungenRows: [],
          expandedUeberfachlichHistories: [],
          expandedUeberfachlichCompetencies: [],
          performanceTab: 'diagramme'
        };

        await UserPreferences.create({
          user_id: user.id,
          class_id: activeClassId,
          preferences: defaultPreferences
        }, { $cancelKey: `create-default-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` });

        setTab('diagramme');
        setExpandedLeistungenRows(new Set());
        setExpandedUeberfachlichHistories(new Set());
        setExpandedUeberfachlichCompetencies(new Set());
      }
    } catch (error) {
      if (!error.message?.includes('autocancelled')) {
        console.error('Error loading preferences:', error);
        setTab('diagramme');
        setExpandedLeistungenRows(new Set());
        setExpandedUeberfachlichHistories(new Set());
        setExpandedUeberfachlichCompetencies(new Set());
      }
    } finally {
      setIsLoading(false);
      // Bug 10 Fix: Stale tab-Wert aus Log entfernt
      console.log('=== LOAD PREFERENCES END ===');
    }
  }, [activeClassId]);

  useEffect(() => {
    if (activeClassId) {
      loadPreferences();
    }
  }, [loadPreferences]);

  // Subscription Effect
  useEffect(() => {
    if (!activeClassId) return;
    const user = User.current();
    if (!user || !user.id) return;

    // Bug 8 Fix: Refs für Werte die in der Callback verwendet werden
    const userIdRef = user.id;

    const filter = `user_id = '${user.id}' && class_id = '${activeClassId}'`;
    let lastProcessedRecordId = null;

    // Bug 5 Fix: Subscription mit Promise für spezifischen unsubscribe
    const subscriptionPromise = pb.collection('user_preferences').subscribe('*', async (e) => {
      // Bug 8 Fix: Aktuelle Werte aus Refs lesen statt Closure
      const currentActiveClassId = activeClassIdRef.current;

      if (e.record.user_id !== userIdRef || e.record.class_id !== currentActiveClassId || e.record.id === lastProcessedRecordId) {
        return;
      }

      lastProcessedRecordId = e.record.id;

      // Bug 7 Fix: Symbol-basierte Request-ID
      const requestId = Symbol('realtime-request');
      activeRequestRef.current = requestId;
      const cancelKey = `realtime-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      try {
        const updated = await UserPreferences.findOne({
          user_id: userIdRef,
          class_id: currentActiveClassId,
          $cancelKey: cancelKey
        });

        // Bug 7 Fix: Request-Überprüfung mit Symbol
        if (activeRequestRef.current !== requestId) {
          console.log('Realtime load - Request superseded, skipping');
          return;
        }

        console.log('Realtime Subscription - Raw preferences:', updated?.preferences);

        if (updated?.preferences) {
          const preferences = {
            expandedLeistungenRows: Array.isArray(updated.preferences.expandedLeistungenRows)
              ? updated.preferences.expandedLeistungenRows
              : [],
            expandedUeberfachlichHistories: Array.isArray(updated.preferences.expandedUeberfachlichHistories)
              ? updated.preferences.expandedUeberfachlichHistories
              : [],
            expandedUeberfachlichCompetencies: Array.isArray(updated.preferences.expandedUeberfachlichCompetencies)
              ? updated.preferences.expandedUeberfachlichCompetencies
              : [],
            performanceTab: updated.preferences.performanceTab && ['diagramme', 'leistungen', 'ueberfachlich'].includes(updated.preferences.performanceTab)
              ? updated.preferences.performanceTab
              : 'diagramme'
          };

          console.log('Realtime Subscription - Processing:', preferences);

          setExpandedLeistungenRows(new Set(preferences.expandedLeistungenRows));
          setExpandedUeberfachlichHistories(new Set(preferences.expandedUeberfachlichHistories));
          setExpandedUeberfachlichCompetencies(new Set(preferences.expandedUeberfachlichCompetencies));

          // Tab nur aktualisieren wenn sich der Wert geändert hat
          const currentTab = tabRef.current;
          if (preferences.performanceTab !== currentTab) {
            setTab(preferences.performanceTab);
            console.log('Realtime Subscription - Updated tab to:', preferences.performanceTab);
          }

          // Bug 2 Fix: ENTFERNT - Keine automatische Tab-Korrektur mehr
        } else {
          console.log('Realtime: Invalid preferences, setting defaults');
          setExpandedLeistungenRows(new Set());
          setExpandedUeberfachlichHistories(new Set());
          setExpandedUeberfachlichCompetencies(new Set());
          setTab('diagramme');
        }
      } catch (error) {
        if (!error.message?.includes('autocancelled')) {
          console.error('Realtime Subscription - Error:', error);
        }
      }
    }, { filter });

    // Bug 5 Fix: Spezifischen unsubscribe speichern
    subscriptionPromise.then(unsubscribe => {
      subscriptionUnsubscribeRef.current = unsubscribe;
    }).catch(err => {
      console.error('Subscription error:', err);
    });

    // Bug 5 Fix: Spezifischen unsubscribe aufrufen statt global
    return () => {
      if (subscriptionUnsubscribeRef.current) {
        subscriptionUnsubscribeRef.current();
        subscriptionUnsubscribeRef.current = null;
        console.log('Unsubscribed specific subscription');
      }
    };
  }, [activeClassId]); // Bug 1 Fix: 'tab' aus Dependencies entfernt

  const setValidTab = useCallback((newTab) => {
    const validTabs = ['diagramme', 'leistungen', 'ueberfachlich'];
    if (validTabs.includes(newTab)) {
      setTab(newTab);
      savePreferences({
        expandedLeistungenRows: Array.from(expandedLeistungenRowsRef.current),
        expandedUeberfachlichHistories: Array.from(expandedUeberfachlichHistoriesRef.current),
        expandedUeberfachlichCompetencies: Array.from(expandedUeberfachlichCompetenciesRef.current),
        performanceTab: newTab
      });
    } else {
      console.warn('Invalid tab attempted:', newTab);
      setTab('diagramme');
      savePreferences({
        expandedLeistungenRows: Array.from(expandedLeistungenRowsRef.current),
        expandedUeberfachlichHistories: Array.from(expandedUeberfachlichHistoriesRef.current),
        expandedUeberfachlichCompetencies: Array.from(expandedUeberfachlichCompetenciesRef.current),
        performanceTab: 'diagramme'
      });
    }
  }, [savePreferences]);

  const resetAllExpansions = useCallback(() => {
    setExpandedLeistungenRows(new Set());
    setExpandedUeberfachlichHistories(new Set());
    setExpandedUeberfachlichCompetencies(new Set());
    savePreferences({
      expandedLeistungenRows: [],
      expandedUeberfachlichHistories: [],
      expandedUeberfachlichCompetencies: [],
      performanceTab: tabRef.current
    });
  }, [savePreferences]);

  return {
    tab,
    setTab: setValidTab,
    expandedLeistungenRows,
    setExpandedLeistungenRows,
    expandedUeberfachlichHistories,
    setExpandedUeberfachlichHistories,
    expandedUeberfachlichCompetencies,
    setExpandedUeberfachlichCompetencies,
    savePreferences,
    resetAllExpansions,
    isLoading
  };
};
