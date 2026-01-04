import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Calendar, Menu, X, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GlowButton } from "../ui/GlowButton";
import { createPageUrl } from "@/utils";

export function LandingNav() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  // Background opacity based on scroll
  const bgOpacity = useTransform(scrollY, [0, 100], [0, 1]);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  // Close mobile menu on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <>
      <motion.header
        className="fixed top-0 left-0 right-0 z-50"
      >
        {/* Background with blur */}
        <motion.div
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl border-b border-white/5"
          style={{ opacity: bgOpacity }}
        />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">TimeGrid</span>
            </motion.div>

            {/* Desktop Navigation */}
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="hidden md:flex items-center gap-8"
            >
              <button
                onClick={() => scrollToSection('story-flow')}
                className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('story-flow')}
                className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
              >
                Workflow
              </button>

              <GlowButton
                onClick={() => navigate(createPageUrl('Timetable'))}
                size="sm"
              >
                Jetzt starten
                <ArrowRight className="w-4 h-4" />
              </GlowButton>
            </motion.nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 md:hidden"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu content */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative pt-20 px-6"
          >
            <div className="flex flex-col gap-4">
              <button
                onClick={() => scrollToSection('story-flow')}
                className="text-left p-4 rounded-xl text-white hover:bg-white/5 transition-colors text-lg font-medium"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('story-flow')}
                className="text-left p-4 rounded-xl text-white hover:bg-white/5 transition-colors text-lg font-medium"
              >
                Workflow
              </button>

              <div className="pt-4 border-t border-white/10">
                <GlowButton
                  onClick={() => {
                    navigate(createPageUrl('Timetable'));
                    setMobileMenuOpen(false);
                  }}
                  className="w-full justify-center"
                  size="lg"
                >
                  Jetzt starten
                  <ArrowRight className="w-5 h-5" />
                </GlowButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
