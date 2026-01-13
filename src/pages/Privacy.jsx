import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Database, Lock, Eye, UserCheck, Mail } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header mit Zurück-Button */}
        <div className="mb-8">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Anmeldung
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-blue-400" />
            <h1 className="text-4xl font-bold">Datenschutzerklärung</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Letzte Aktualisierung: {new Date().toLocaleDateString('de-CH')}
          </p>
        </div>

        <div className="space-y-8">
          {/* 1. Verantwortliche Stelle */}
          <section className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-start gap-3 mb-4">
              <UserCheck className="w-6 h-6 text-blue-400 mt-1" />
              <div>
                <h2 className="text-2xl font-semibold mb-2">1. Verantwortliche Stelle</h2>
                <p className="text-slate-300 mb-4">
                  Verantwortlich für die Verarbeitung personenbezogener Daten im Sinne des Schweizer Datenschutzgesetzes (nDSG) ist:
                </p>
                <div className="bg-slate-900 rounded p-4 border border-slate-600">
                  <p className="text-slate-300">
                    <strong>TeacherOrg</strong><br />
                    [Ihre Schule/Organisation]<br />
                    [Adresse]<br />
                    [PLZ Ort], Schweiz
                  </p>
                  <p className="text-slate-300 mt-3">
                    <strong>Kontakt:</strong><br />
                    E-Mail: [Ihre E-Mail-Adresse]<br />
                    Telefon: [Ihre Telefonnummer]
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Erhobene Daten */}
          <section className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-start gap-3 mb-4">
              <Database className="w-6 h-6 text-blue-400 mt-1" />
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-2">2. Welche Daten werden erhoben?</h2>
                <p className="text-slate-300 mb-4">
                  TeacherOrg erhebt und verarbeitet folgende personenbezogene Daten:
                </p>

                <div className="space-y-4">
                  <div className="bg-slate-900 rounded p-4 border border-slate-600">
                    <h3 className="font-semibold text-blue-400 mb-2">Lehrpersonen-Daten:</h3>
                    <ul className="list-disc list-inside text-slate-300 space-y-1">
                      <li>Name (Benutzername, vollständiger Name)</li>
                      <li>E-Mail-Adresse</li>
                      <li>Passwort (verschlüsselt gespeichert)</li>
                      <li>Rolle (Lehrer, Administrator)</li>
                      <li>Anmeldeaktivitäten (Zeitpunkt, IP-Adresse)</li>
                    </ul>
                  </div>

                  <div className="bg-slate-900 rounded p-4 border border-slate-600">
                    <h3 className="font-semibold text-blue-400 mb-2">Schüler-Daten:</h3>
                    <ul className="list-disc list-inside text-slate-300 space-y-1">
                      <li>Name (Vor- und Nachname)</li>
                      <li>Klassenzugehörigkeit</li>
                      <li>Leistungsdaten (Noten, Kompetenzen)</li>
                      <li>Anwesenheit und Verhalten (optional)</li>
                      <li>Gruppenzuordnungen</li>
                      <li>Zugewiesene Ämtli/Aufgaben</li>
                    </ul>
                  </div>

                  <div className="bg-slate-900 rounded p-4 border border-slate-600">
                    <h3 className="font-semibold text-blue-400 mb-2">Technische Daten:</h3>
                    <ul className="list-disc list-inside text-slate-300 space-y-1">
                      <li>Audit-Logs (Zugriffe, Änderungen, Zeitstempel)</li>
                      <li>Nutzungsdaten (verwendete Features, Einstellungen)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Zweck der Datenverarbeitung */}
          <section className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-start gap-3 mb-4">
              <Eye className="w-6 h-6 text-blue-400 mt-1" />
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-2">3. Zweck der Datenverarbeitung</h2>
                <p className="text-slate-300 mb-4">
                  Die Verarbeitung personenbezogener Daten erfolgt ausschließlich für folgende Zwecke:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 bg-slate-900 rounded p-4 border border-slate-600">
                  <li><strong>Unterrichtsverwaltung:</strong> Planung und Dokumentation des Unterrichts</li>
                  <li><strong>Leistungserfassung:</strong> Erfassung und Verwaltung von Noten und Kompetenzen</li>
                  <li><strong>Klassenverwaltung:</strong> Organisation von Klassen, Gruppen und Ämtli</li>
                  <li><strong>Kommunikation:</strong> Bereitstellung von Informationen an Lehrpersonen</li>
                  <li><strong>Sicherheit:</strong> Audit-Logging zur Nachvollziehbarkeit von Datenzugriffen</li>
                  <li><strong>Systemfunktionalität:</strong> Gewährleistung des ordnungsgemäßen Betriebs</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 4. Rechtsgrundlage */}
          <section className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-2xl font-semibold mb-2">4. Rechtsgrundlage</h2>
            <p className="text-slate-300">
              Die Verarbeitung personenbezogener Daten erfolgt auf Grundlage von:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3 bg-slate-900 rounded p-4 border border-slate-600">
              <li><strong>Art. 6 Abs. 1 nDSG:</strong> Erfüllung eines öffentlichen Auftrags (Bildungsauftrag)</li>
              <li><strong>Einwilligung:</strong> Bei Nutzung optionaler Features</li>
              <li><strong>Berechtigtes Interesse:</strong> Sicherstellung der Systemsicherheit und Integrität</li>
            </ul>
          </section>

          {/* 5. Datenweitergabe */}
          <section className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-2xl font-semibold mb-2">5. Weitergabe von Daten</h2>
            <div className="bg-slate-900 rounded p-4 border border-slate-600">
              <p className="text-slate-300 mb-3">
                <strong className="text-blue-400">Keine Weitergabe an Dritte:</strong>
              </p>
              <p className="text-slate-300">
                Ihre Daten werden <strong>nicht</strong> an Dritte weitergegeben, verkauft oder anderweitig übermittelt.
                Ausnahmen gelten nur bei:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-1 mt-3">
                <li>Gesetzlicher Verpflichtung (z.B. behördliche Anordnung)</li>
                <li>Ihrer ausdrücklichen Einwilligung</li>
              </ul>
            </div>
          </section>

          {/* 6. Datenspeicherung */}
          <section className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-start gap-3 mb-4">
              <Lock className="w-6 h-6 text-blue-400 mt-1" />
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-2">6. Speicherort und Sicherheit</h2>

                <div className="space-y-4">
                  <div className="bg-slate-900 rounded p-4 border border-slate-600">
                    <h3 className="font-semibold text-blue-400 mb-2">Speicherort:</h3>
                    <p className="text-slate-300">
                      Alle Daten werden ausschließlich auf Servern in der <strong>Schweiz</strong> gespeichert
                      (Exoscale Datacenter).
                    </p>
                  </div>

                  <div className="bg-slate-900 rounded p-4 border border-slate-600">
                    <h3 className="font-semibold text-blue-400 mb-2">Sicherheitsmaßnahmen:</h3>
                    <ul className="list-disc list-inside text-slate-300 space-y-1">
                      <li>Verschlüsselte Datenübertragung (HTTPS/TLS)</li>
                      <li>Passwort-Hashing mit modernen Algorithmen</li>
                      <li>Zugriffskontrolle (nur autorisierte Lehrpersonen)</li>
                      <li>Audit-Logging aller Datenzugriffe</li>
                      <li>Regelmäßige Sicherheitsbackups</li>
                      <li>Code-Verschleierung in Produktionsumgebung</li>
                    </ul>
                  </div>

                  <div className="bg-slate-900 rounded p-4 border border-slate-600">
                    <h3 className="font-semibold text-blue-400 mb-2">Aufbewahrungsfristen:</h3>
                    <ul className="list-disc list-inside text-slate-300 space-y-1">
                      <li><strong>Schülerdaten:</strong> Bis zum Ende des Schuljahres + 1 Jahr (gesetzliche Vorgabe)</li>
                      <li><strong>Audit-Logs:</strong> 12 Monate (Compliance-Anforderung)</li>
                      <li><strong>Lehrpersonen-Daten:</strong> Solange das Konto aktiv ist</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 7. Rechte der Betroffenen */}
          <section className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-2xl font-semibold mb-2">7. Ihre Rechte (gemäß nDSG)</h2>
            <p className="text-slate-300 mb-4">
              Betroffene Personen (Lehrpersonen, Eltern/Erziehungsberechtigte) haben folgende Rechte:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 rounded p-4 border border-slate-600">
                <h3 className="font-semibold text-blue-400 mb-2">✓ Auskunftsrecht</h3>
                <p className="text-slate-300 text-sm">
                  Sie können jederzeit Auskunft über die zu Ihrer Person gespeicherten Daten verlangen.
                </p>
              </div>

              <div className="bg-slate-900 rounded p-4 border border-slate-600">
                <h3 className="font-semibold text-blue-400 mb-2">✓ Berichtigungsrecht</h3>
                <p className="text-slate-300 text-sm">
                  Sie können die Korrektur unrichtiger Daten verlangen.
                </p>
              </div>

              <div className="bg-slate-900 rounded p-4 border border-slate-600">
                <h3 className="font-semibold text-blue-400 mb-2">✓ Löschungsrecht</h3>
                <p className="text-slate-300 text-sm">
                  Sie können die Löschung Ihrer Daten verlangen, soweit keine gesetzlichen Aufbewahrungspflichten bestehen.
                </p>
              </div>

              <div className="bg-slate-900 rounded p-4 border border-slate-600">
                <h3 className="font-semibold text-blue-400 mb-2">✓ Datenportabilität</h3>
                <p className="text-slate-300 text-sm">
                  Sie können Ihre Daten in einem strukturierten, gängigen Format erhalten.
                </p>
              </div>

              <div className="bg-slate-900 rounded p-4 border border-slate-600">
                <h3 className="font-semibold text-blue-400 mb-2">✓ Widerspruchsrecht</h3>
                <p className="text-slate-300 text-sm">
                  Sie können der Verarbeitung Ihrer Daten widersprechen.
                </p>
              </div>

              <div className="bg-slate-900 rounded p-4 border border-slate-600">
                <h3 className="font-semibold text-blue-400 mb-2">✓ Beschwerderecht</h3>
                <p className="text-slate-300 text-sm">
                  Sie können sich beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) beschweren.
                </p>
              </div>
            </div>
          </section>

          {/* 8. Cookies und Tracking */}
          <section className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-2xl font-semibold mb-2">8. Cookies und Tracking</h2>
            <div className="bg-slate-900 rounded p-4 border border-slate-600">
              <p className="text-slate-300 mb-3">
                <strong className="text-blue-400">Minimaler Einsatz:</strong>
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                <li><strong>Session-Cookies:</strong> Für die Anmeldung erforderlich (technisch notwendig)</li>
                <li><strong>LocalStorage:</strong> Speicherung von Benutzereinstellungen (Theme, Sprache)</li>
                <li><strong>Keine Tracking-Cookies:</strong> Es werden keine Analyse- oder Marketing-Cookies verwendet</li>
                <li><strong>Keine Drittanbieter-Dienste:</strong> Kein Google Analytics, Facebook Pixel, etc.</li>
              </ul>
            </div>
          </section>

          {/* 9. Kontakt */}
          <section className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-start gap-3 mb-4">
              <Mail className="w-6 h-6 text-blue-400 mt-1" />
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-2">9. Kontakt bei Fragen</h2>
                <p className="text-slate-300 mb-4">
                  Bei Fragen zum Datenschutz oder zur Ausübung Ihrer Rechte kontaktieren Sie uns:
                </p>
                <div className="bg-slate-900 rounded p-4 border border-slate-600">
                  <p className="text-slate-300">
                    <strong>E-Mail:</strong> [Ihre Datenschutz-E-Mail]<br />
                    <strong>Telefon:</strong> [Ihre Telefonnummer]<br />
                    <strong>Post:</strong> [Ihre Adresse]
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 10. Änderungen */}
          <section className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-2xl font-semibold mb-2">10. Änderungen dieser Datenschutzerklärung</h2>
            <p className="text-slate-300">
              Diese Datenschutzerklärung kann bei Bedarf aktualisiert werden. Die jeweils aktuelle Version
              ist in der Anwendung verfügbar. Wesentliche Änderungen werden Ihnen mitgeteilt.
            </p>
            <p className="text-slate-400 text-sm mt-3">
              Stand: {new Date().toLocaleDateString('de-CH', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </section>

          {/* Footer */}
          <div className="text-center pt-8 border-t border-slate-700">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück zur Anmeldung
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
