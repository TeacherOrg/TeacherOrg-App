import React from 'react';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import { Printer, Copy, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CredentialsPrintModal({
  isOpen,
  onClose,
  credentials, // [{name, email, password}]
  className,   // Class name for header
}) {
  const generateLoginUrl = (email) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/login?email=${encodeURIComponent(email)}`;
  };

  const handlePrint = async () => {
    // QR-Codes als Data-URLs generieren BEVOR das Fenster geöffnet wird
    const qrDataUrls = await Promise.all(
      credentials.map(cred =>
        QRCode.toDataURL(generateLoginUrl(cred.email), {
          width: 100,
          margin: 1,
          color: { dark: '#1e40af', light: '#ffffff' }
        })
      )
    );

    const printWindow = window.open('', '_blank');

    const cardsHtml = credentials.map((cred, idx) => `
      <div class="credential-card">
        <div class="card-header">${cred.name}</div>
        <div class="card-body">
          <div class="card-info">
            <div class="info-row">
              <span class="info-label">E-Mail:</span>
              <span class="info-value">${cred.email}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Passwort:</span>
              <span class="password-value">${cred.password}</span>
            </div>
          </div>
          <div class="qr-section">
            <img src="${qrDataUrls[idx]}" alt="QR Code" class="qr-image" />
            <span class="qr-label">QR scannen zum Login</span>
          </div>
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Zugangskarten - ${className || 'Klasse'}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @page { size: A4; margin: 10mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 10mm; }

          .page-header {
            text-align: center;
            margin-bottom: 8mm;
            padding-bottom: 4mm;
            border-bottom: 2px solid #1e40af;
          }

          .page-title {
            font-size: 18pt;
            font-weight: bold;
            color: #1e40af;
          }

          .page-subtitle {
            font-size: 10pt;
            color: #666;
            margin-top: 2mm;
          }

          .print-hint {
            text-align: center;
            padding: 8mm;
            background: #f0f9ff;
            border: 1px dashed #3b82f6;
            border-radius: 8px;
            margin-bottom: 8mm;
            color: #1e40af;
            font-size: 11pt;
          }

          .cards-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6mm;
          }

          .credential-card {
            border: 2px solid #1e40af;
            border-radius: 8px;
            padding: 10px;
            page-break-inside: avoid;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          }

          .card-header {
            font-size: 13pt;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #cbd5e1;
          }

          .card-body {
            display: flex;
            gap: 10px;
          }

          .card-info {
            flex: 1;
          }

          .info-row {
            margin-bottom: 6px;
          }

          .info-label {
            font-size: 8pt;
            color: #64748b;
            display: block;
            margin-bottom: 1px;
          }

          .info-value {
            font-size: 10pt;
            font-weight: 500;
            color: #334155;
            word-break: break-all;
          }

          .password-value {
            font-family: 'Consolas', 'Courier New', monospace;
            background: #fef3c7;
            padding: 3px 6px;
            border-radius: 4px;
            font-size: 11pt;
            letter-spacing: 1px;
            font-weight: bold;
            color: #92400e;
            display: inline-block;
          }

          .qr-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-width: 90px;
          }

          .qr-image {
            width: 80px;
            height: 80px;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 4px;
            background: white;
          }

          .qr-label {
            font-size: 7pt;
            color: #64748b;
            margin-top: 3px;
            text-align: center;
          }

          .footer {
            margin-top: 10mm;
            padding-top: 4mm;
            border-top: 1px solid #e2e8f0;
            font-size: 9pt;
            color: #64748b;
            text-align: center;
          }

          .footer-warning {
            color: #b45309;
            font-weight: 500;
          }

          @media print {
            .no-print { display: none !important; }
            .print-hint { display: none !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="print-hint no-print">
          Drücke <strong>Strg+P</strong> (oder Cmd+P) um als PDF zu speichern oder zu drucken
        </div>

        <div class="page-header">
          <div class="page-title">Zugangsdaten: ${className || 'Klasse'}</div>
          <div class="page-subtitle">Erstellt am ${new Date().toLocaleDateString('de-CH')} um ${new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>

        <div class="cards-container">
          ${cardsHtml}
        </div>

        <div class="footer">
          <p class="footer-warning">Dieses Dokument enthält vertrauliche Zugangsdaten. Bitte sicher aufbewahren und nach Verteilung vernichten.</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  const copyToClipboard = () => {
    const text = credentials
      .map(c => `${c.name}\n${c.email}\n${c.password}`)
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
    toast.success('In Zwischenablage kopiert');
  };

  if (!isOpen) return null;

  // Dynamische Grid-Klasse: 1 Spalte bei 1-2 Karten, 2 Spalten bei mehr
  const gridClass = credentials.length <= 2
    ? 'grid grid-cols-1 gap-4'
    : 'grid grid-cols-2 gap-3';

  // Dynamische QR-Grösse: grösser bei Einzelkarte
  const qrSize = credentials.length === 1 ? 140 : 80;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1002] backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            Zugangskarten
            <span className="text-sm font-normal text-slate-500">
              ({credentials.length} {credentials.length === 1 ? 'Karte' : 'Karten'})
            </span>
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
          {/* Preview Cards */}
          <div className="flex-1 overflow-y-auto py-2">
            <div className={gridClass}>
              {credentials.map((cred, idx) => (
                <div
                  key={idx}
                  className="border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800"
                >
                  <div className="font-bold text-lg text-blue-700 dark:text-blue-400 border-b border-slate-200 dark:border-slate-600 pb-2 mb-3">
                    {cred.name}
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-3 min-w-0">
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">E-Mail:</span>
                        <div className="text-base font-medium text-slate-700 dark:text-slate-200 break-all">
                          {cred.email}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Passwort:</span>
                        <code className="inline-block bg-yellow-100 dark:bg-yellow-900/40 px-3 py-1.5 rounded-lg font-mono text-lg font-bold text-yellow-800 dark:text-yellow-200 tracking-wider">
                          {cred.password}
                        </code>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                        <QRCodeSVG
                          value={generateLoginUrl(cred.email)}
                          size={qrSize}
                          level="M"
                          fgColor="#1e40af"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                        Login-QR
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="outline"
              onClick={copyToClipboard}
              className="border-slate-300 dark:border-slate-600"
            >
              <Copy className="w-4 h-4 mr-2" />
              Kopieren
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Printer className="w-4 h-4 mr-2" />
              Druckvorschau
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
