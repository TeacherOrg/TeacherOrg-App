import { Calendar, Heart } from "lucide-react";

export function FooterSection() {
  const currentYear = new Date().getFullYear();

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-950 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">TimeGrid</span>
            </div>
            <p className="text-slate-500 text-sm max-w-xs mb-4">
              Die moderne Lösung für Schulorganisation. Plane deinen Unterricht von Jahr bis Stunde.
            </p>
            <p className="text-slate-600 text-xs">
              &copy; {currentYear} TimeGrid. Alle Rechte vorbehalten.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Navigation</h3>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => scrollToSection('story-flow')}
                className="text-slate-500 hover:text-white transition-colors text-left text-sm"
              >
                Features
              </button>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="text-slate-500 hover:text-white transition-colors text-left text-sm"
              >
                Startseite
              </button>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Rechtliches</h3>
            <div className="flex flex-col gap-3">
              <a href="#" className="text-slate-500 hover:text-white transition-colors text-sm">
                Impressum
              </a>
              <a href="#" className="text-slate-500 hover:text-white transition-colors text-sm">
                Datenschutz
              </a>
              <a href="#" className="text-slate-500 hover:text-white transition-colors text-sm">
                Nutzungsbedingungen
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/5">
          <p className="text-center text-slate-600 text-sm flex items-center justify-center gap-1">
            Entwickelt mit
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            für Bildung
          </p>
        </div>
      </div>
    </footer>
  );
}
