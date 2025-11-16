import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { LehrplanKompetenz as CurriculumCompetency } from '@/api/entities';
import { toast } from 'sonner';
import pb from '@/api/pb'; 

let __CurriculumImportError = null;
let CurriculumImportMain = null;

try {
	CurriculumImportMain = function CurriculumImportMain({ subjectName, onImportComplete }) {
		const [isUploading, setIsUploading] = useState(false);
		const [uploadStatus, setUploadStatus] = useState(null);

		const handleFileUpload = async (event) => {
			const file = event.target.files[0];
			if (!file) return;

			setIsUploading(true);
			setUploadStatus(null);

			try {
				toast.info('PDF wird hochgeladen...');
				// Upload to PocketBase (collection 'curriculum_files' MUST exist or adjust)
				const form = new FormData();
				form.append('file', file);

				let uploadRecord = null;
				try {
					uploadRecord = await pb.collection('curriculum_files').create(form);
				} catch (err) {
					console.error('Error uploading file to PocketBase:', err);
					throw new Error('Fehler beim Hochladen der Datei. Bitte prüfen Sie die Server-Konfiguration.');
				}

				// Versuche file URL zu ermitteln (falls Feldname 'file' im Record verwendet wird)
				let file_url = '';
				try {
					// pb.collection.getOne returned record structure may vary; build a best-effort URL
					// If your pb SDK provides pb.getFileUrl you can replace the manual build below.
					if (uploadRecord && uploadRecord.file) {
						// uploadRecord.file may be the filename string or an array depending on schema
						const filename = Array.isArray(uploadRecord.file) ? uploadRecord.file[0] : uploadRecord.file;
						file_url = `${pb.baseUrl}/api/files/curriculum_files/${uploadRecord.id}/${filename}`;
					}
				} catch (e) {
					if (process.env.NODE_ENV === 'development') console.warn('Could not build file_url', e);
				}

				// Extraktion: TODO -> Implementiere hier deinen LLM-/PDF-Extraktionsdienst
				// Beispiel: const result = await callYourExtractorService(file_url);
				// Für jetzt: werfen wir eine informative Exception, damit der Entwickler die passende Integration ergänzt.
				toast.info('Lehrplan wird analysiert... (Extraktion muss noch implementiert)');
				throw new Error('Extraktion von Kompetenzen aus PDF ist nicht implementiert. Bitte füge deinen Extractor-Aufruf in src/components/curriculum/CurriculumImport.js ein.');

				// Beispiel-Flow (sofern result verfügbar):
				// const competencies = result.output?.competencies || [];
				// if (competencies.length === 0) { throw new Error('Keine Kompetenzen gefunden im PDF'); }
				// const competenciesToSave = competencies.map(...); // wie vorher
				// await CurriculumCompetency.bulkCreate(competenciesToSave);

				setUploadStatus({
					type: 'success',
					message: `${competencies.length} Kompetenzen erfolgreich importiert!`
				});
				
				toast.success(`${competencies.length} Kompetenzen importiert!`);
				
				if (onImportComplete) {
					onImportComplete();
				}

			} catch (error) {
				console.error('Import error:', error);
				setUploadStatus({
					type: 'error',
					message: error.message || 'Fehler beim Import'
				});
				toast.error('Fehler beim Import: ' + error.message);
			} finally {
				setIsUploading(false);
			}
		};

		return (
			<Card className="bg-slate-800/50 border-slate-700">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-white">
						<Upload className="w-5 h-5" />
						Lehrplan importieren
					</CardTitle>
					<CardDescription className="text-slate-400">
						Laden Sie ein PDF des Lehrplans hoch, um die Kompetenzen automatisch zu extrahieren
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
						<input
							type="file"
							accept=".pdf"
							onChange={handleFileUpload}
							disabled={isUploading}
							className="hidden"
							id="curriculum-upload"
						/>
						<label htmlFor="curriculum-upload" className="cursor-pointer">
							{isUploading ? (
								<div className="flex flex-col items-center gap-3">
									<Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
									<p className="text-sm text-slate-300">Analysiere Lehrplan...</p>
									<p className="text-xs text-slate-500">Dies kann 1-2 Minuten dauern</p>
								</div>
							) : (
								<div className="flex flex-col items-center gap-3">
									<FileText className="w-12 h-12 text-slate-400" />
									<div>
										<p className="text-sm font-medium text-white">PDF hochladen</p>
										<p className="text-xs text-slate-400 mt-1">Klicken Sie, um eine Datei auszuwählen</p>
									</div>
								</div>
							)}
						</label>
					</div>

					{uploadStatus && (
						<div className={`p-4 rounded-lg flex items-start gap-3 ${
							uploadStatus.type === 'success' 
								? 'bg-green-900/20 border border-green-700' 
								: 'bg-red-900/20 border border-red-700'
						}`}>
							{uploadStatus.type === 'success' ? (
								<CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
							) : (
								<AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
							)}
							<p className={`text-sm ${
								uploadStatus.type === 'success' ? 'text-green-300' : 'text-red-300'
							}`}>
								{uploadStatus.message}
							</p>
						</div>
					)}

					<div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
						<p className="text-xs text-blue-300">
							💡 <strong>Hinweis:</strong> Der Import verwendet KI, um die Kompetenzen aus dem PDF zu extrahieren. 
							Die Genauigkeit hängt von der Qualität und Struktur des PDFs ab.
						</p>
					</div>
				</CardContent>
			</Card>
		);
	};
} catch (e) {
	console.error("CurriculumImport module init error:", e);
	__CurriculumImportError = e;
}

// Fallback wrapper export — zeigt Fehler UI if module init failed
export default function CurriculumImport(props) {
	if (__CurriculumImportError) {
		return (
			<Card className="bg-red-900/20 border-red-700">
				<CardHeader>
					<CardTitle className="text-white">Lehrplan Import — Fehler</CardTitle>
					<CardDescription className="text-red-300">
						Fehler beim Laden des Moduls. Öffne die Dev-Konsole / Terminal für Details.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-red-200">{String(__CurriculumImportError.message || __CurriculumImportError)}</p>
				</CardContent>
			</Card>
		);
	}
	// Wenn alles ok ist, rendere die echte Komponente
	return CurriculumImportMain ? <CurriculumImportMain {...props} /> : null;
}