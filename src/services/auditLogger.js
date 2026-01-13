import pb from '@/api/pb';

/**
 * Audit Logger Service
 *
 * Dokumentiert alle sicherheitsrelevanten Aktionen gemäß nDSG-Anforderungen:
 * - Benutzer-Login/Logout
 * - Zugriff auf personenbezogene Daten (Schüler, Noten)
 * - Änderungen an personenbezogenen Daten
 * - Datenexporte
 * - Fehlgeschlagene Authentifizierungsversuche
 */

class AuditLogger {
  /**
   * Zentrale Log-Methode
   * @param {string} action - Art der Aktion (z.B. 'login', 'view_student', 'update_grade')
   * @param {Object} options - Zusätzliche Informationen
   * @param {string} options.userId - ID des handelnden Benutzers
   * @param {string} options.targetType - Typ des betroffenen Objekts (z.B. 'student', 'grade')
   * @param {string} options.targetId - ID des betroffenen Objekts
   * @param {string} options.details - Zusätzliche Details im JSON-Format
   * @param {string} options.ipAddress - IP-Adresse des Benutzers (optional)
   * @param {boolean} options.success - Erfolg der Aktion (Standard: true)
   */
  async log(action, options = {}) {
    try {
      const {
        userId = pb.authStore.model?.id || null,
        targetType = null,
        targetId = null,
        details = null,
        ipAddress = null,
        success = true,
      } = options;

      // Audit-Log Eintrag erstellen
      const logEntry = {
        action,
        user: userId,
        target_type: targetType,
        target_id: targetId,
        details: details ? JSON.stringify(details) : null,
        ip_address: ipAddress,
        success,
        timestamp: new Date().toISOString(),
      };

      // In PocketBase speichern (falls Collection existiert)
      // Fehler werden stillschweigend ignoriert, um App-Funktionalität nicht zu beeinträchtigen
      // $autoCancel: false verhindert dass Audit-Logs durch Auto-Cancellation verloren gehen
      await pb.collection('audit_logs').create(logEntry, {
        $autoCancel: false
      });

      // Development: Console-Log für Debugging
      if (import.meta.env.DEV) {
        console.log('🔒 Audit Log:', action, {
          user: userId?.substring(0, 8),
          target: targetType ? `${targetType}:${targetId?.substring(0, 8)}` : null,
          success,
        });
      }
    } catch (error) {
      // Logging-Fehler nicht an Benutzer weitergeben
      console.error('Audit logging failed:', error);
    }
  }

  // === AUTHENTIFIZIERUNG ===

  /**
   * Erfolgreicher Login
   */
  async logLogin(userId, email) {
    return this.log('login', {
      userId,
      details: { email },
      success: true,
    });
  }

  /**
   * Fehlgeschlagener Login-Versuch
   */
  async logFailedLogin(email, reason = 'Invalid credentials') {
    return this.log('login_failed', {
      userId: null,
      details: { email, reason },
      success: false,
    });
  }

  /**
   * Logout
   */
  async logLogout(userId) {
    return this.log('logout', {
      userId,
      success: true,
    });
  }

  // === DATENZUGRIFF ===

  /**
   * Zugriff auf Schülerdaten
   */
  async logViewStudent(studentId) {
    return this.log('view_student', {
      targetType: 'student',
      targetId: studentId,
    });
  }

  /**
   * Zugriff auf Notendaten
   */
  async logViewGrades(studentId = null) {
    return this.log('view_grades', {
      targetType: studentId ? 'student' : 'all',
      targetId: studentId,
    });
  }

  /**
   * Zugriff auf Schülerübersicht
   */
  async logViewStudentsOverview() {
    return this.log('view_students_overview', {
      targetType: 'students',
    });
  }

  // === DATENÄNDERUNGEN ===

  /**
   * Schüler erstellt
   */
  async logCreateStudent(studentId, studentName) {
    return this.log('create_student', {
      targetType: 'student',
      targetId: studentId,
      details: { name: studentName },
    });
  }

  /**
   * Schüler aktualisiert
   */
  async logUpdateStudent(studentId, changes) {
    return this.log('update_student', {
      targetType: 'student',
      targetId: studentId,
      details: { changes },
    });
  }

  /**
   * Schüler gelöscht
   */
  async logDeleteStudent(studentId, studentName) {
    return this.log('delete_student', {
      targetType: 'student',
      targetId: studentId,
      details: { name: studentName },
    });
  }

  /**
   * Note erstellt
   */
  async logCreateGrade(gradeId, studentId, subject) {
    return this.log('create_grade', {
      targetType: 'grade',
      targetId: gradeId,
      details: { student_id: studentId, subject },
    });
  }

  /**
   * Note aktualisiert
   */
  async logUpdateGrade(gradeId, studentId, changes) {
    return this.log('update_grade', {
      targetType: 'grade',
      targetId: gradeId,
      details: { student_id: studentId, changes },
    });
  }

  /**
   * Note gelöscht
   */
  async logDeleteGrade(gradeId, studentId) {
    return this.log('delete_grade', {
      targetType: 'grade',
      targetId: gradeId,
      details: { student_id: studentId },
    });
  }

  // === DATENEXPORT ===

  /**
   * Datenexport durchgeführt
   */
  async logDataExport(exportType, recordCount) {
    return this.log('data_export', {
      targetType: 'export',
      details: { type: exportType, record_count: recordCount },
    });
  }

  // === SYSTEM-EVENTS ===

  /**
   * Fehler beim Datenzugriff
   */
  async logAccessError(resource, error) {
    return this.log('access_error', {
      targetType: 'error',
      details: { resource, error: error.message },
      success: false,
    });
  }
}

// Singleton-Instanz exportieren
export const auditLogger = new AuditLogger();
export default auditLogger;
