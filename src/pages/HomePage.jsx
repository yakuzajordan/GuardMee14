import { Shield, Map, Bell, Users, Zap, Smartphone, ArrowRight, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const features = [
  { icon: Shield, title: 'Signalement rapide', desc: 'Signalez un incident en quelques secondes avec photo et géolocalisation GPS.', color: 'text-urgence', bg: 'bg-red-50', ring: 'ring-red-200' },
  { icon: Map, title: 'Carte en temps réel', desc: 'Visualisez les zones à risque sur une carte interactive avec heatmap.', color: 'text-securite', bg: 'bg-blue-50', ring: 'ring-blue-200' },
  { icon: Bell, title: 'Alertes géolocalisées', desc: 'Recevez des notifications quand un incident survient près de chez vous.', color: 'text-warning', bg: 'bg-amber-50', ring: 'ring-amber-200' },
  { icon: Users, title: 'Communauté active', desc: 'Rejoignez des milliers de citoyens engagés pour la sécurité au Cameroun.', color: 'text-success', bg: 'bg-green-50', ring: 'ring-green-200' },
  { icon: Zap, title: 'Intervention rapide', desc: 'Les agents de sécurité coordonnent les interventions en temps réel.', color: 'text-securite', bg: 'bg-blue-50', ring: 'ring-blue-200' },
  { icon: Smartphone, title: 'Optimisé 3G/4G', desc: 'Fonctionne même avec une connexion lente. Mode hors-ligne disponible.', color: 'text-gray-600', bg: 'bg-gray-50', ring: 'ring-gray-200' },
];

const incidentTypes = [
  { label: 'Agression', icon: '🚨', color: 'bg-red-50 text-red-700 border-red-200' },
  { label: 'Accident', icon: '🚗', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { label: 'Incendie', icon: '🔥', color: 'bg-red-50 text-red-700 border-red-200' },
  { label: 'Inondation', icon: '🌊', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Coupure électricité', icon: '⚡', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { label: 'Vol', icon: '🔓', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { label: 'Danger sanitaire', icon: '⚕️', color: 'bg-green-50 text-green-700 border-green-200' },
];

const stats = [
  { value: '12K+', label: 'Citoyens actifs' },
  { value: '3.4K', label: 'Incidents résolus' },
  { value: '< 8min', label: 'Temps de réponse moyen' },
  { value: '10', label: 'Régions couvertes' },
];

export default function HomePage() {
  return (
    <Layout>
      {/* ── Hero ── */}
      <section className="hero-gradient text-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-14 mb-10 sm:mb-16 relative min-h-[340px] flex items-center">
        <div className="relative z-10 max-w-2xl animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-5 text-xs font-semibold bg-white/15 backdrop-blur rounded-full border border-white/20">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse-urgence" />
            🇨🇲 Cameroun · Sécurité communautaire · En direct
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight tracking-tight">
            Protégez votre{' '}
            <br className="hidden sm:block" />
            communauté avec{' '}
            <span className="relative">
              <span style={{ color: '#FC8181' }}>GuardMee</span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                <path d="M0 6 Q50 2 100 6 Q150 10 200 6" stroke="rgba(252,129,129,0.6)" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </span>
          </h1>

          <p className="text-base sm:text-lg text-blue-100/90 mb-8 leading-relaxed max-w-xl">
            La plateforme communautaire de signalement et d'alerte en temps réel des zones à risque au Cameroun.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <Button to="/inscription" variant="danger" size="lg" className="w-full sm:w-auto glow-urgence">
              Commencer gratuitement
              <ArrowRight size={18} />
            </Button>
            <Button to="/carte" variant="glass" size="lg" className="w-full sm:w-auto">
              <Map size={18} />
              Voir la carte live
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center gap-4 mt-8 text-xs text-blue-200/80">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              Gratuit
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              Mode hors-ligne
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              Signalement anonyme
            </span>
          </div>
        </div>

        {/* Floating shield decoration */}
        <div className="absolute right-6 sm:right-12 top-1/2 -translate-y-1/2 opacity-[0.12] select-none pointer-events-none animate-float hidden sm:block">
          <svg viewBox="0 0 200 200" className="w-48 h-48 sm:w-64 sm:h-64" fill="white">
            <path d="M100 10L20 44v60c0 42 32 81 80 94 48-13 80-52 80-94V44L100 10z" />
            <circle cx="100" cy="90" r="26" fill="rgba(255,255,255,0.3)" />
            <circle cx="100" cy="90" r="13" fill="rgba(255,255,255,0.5)" />
          </svg>
        </div>

        {/* Animated dots decoration */}
        <div className="absolute top-6 right-6 grid grid-cols-3 gap-1.5 opacity-20 select-none pointer-events-none hidden lg:grid">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 bg-white rounded-full" style={{ animationDelay: `${i * 200}ms` }} />
          ))}
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12 sm:mb-16">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/80 p-4 text-center shadow-sm animate-fade-in-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <p className="text-2xl sm:text-3xl font-extrabold text-securite tracking-tight">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── How it works ── */}
      <section className="mb-12 sm:mb-16">
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 mb-3 text-xs font-semibold bg-blue-50 text-securite rounded-full border border-blue-100">
            Comment ça marche
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Trois étapes pour agir</h2>
          <p className="text-gray-500 text-sm sm:text-base mt-2">Rapide, simple, efficace</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 relative">
          {/* Connecting line (desktop) */}
          <div className="absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-0.5 bg-gradient-to-r from-urgence/30 via-securite/30 to-success/30 hidden sm:block" />

          {[
            { step: '1', title: 'Signalez', desc: "Décrivez l'incident, ajoutez une photo et votre position GPS automatique.", icon: '📍', color: 'from-urgence to-urgence-dark' },
            { step: '2', title: 'Alertez', desc: 'La communauté et les agents sont notifiés instantanément sur mobile.', icon: '🔔', color: 'from-securite to-securite-dark' },
            { step: '3', title: 'Intervenez', desc: 'Les services d\'urgence coordonnent une réponse rapide et géolocalisée.', icon: '🚑', color: 'from-success to-emerald-700' },
          ].map((s, i) => (
            <Card key={s.step} hover className="text-center relative animate-fade-in-up" style={{ animationDelay: `${i * 120}ms` }}>
              <div className={`relative w-14 h-14 bg-gradient-to-br ${s.color} text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg`}>
                {s.step}
                <span className="absolute -top-1 -right-1 text-base">{s.icon}</span>
              </div>
              <h3 className="font-bold text-lg mb-2">{s.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mb-12 sm:mb-16">
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 mb-3 text-xs font-semibold bg-red-50 text-urgence rounded-full border border-red-100">
            Fonctionnalités
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Tout ce dont vous avez besoin</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc, color, bg, ring }, i) => (
            <Card key={title} hover className={`animate-fade-in-up`} style={{ animationDelay: `${i * 80}ms` }}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${bg} ring-1 ${ring}`}>
                <Icon size={22} className={color} />
              </div>
              <h3 className="font-semibold mb-1.5 text-gray-800">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Incident types ── */}
      <section className="mb-12 sm:mb-16">
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Types d'incidents signalables</h2>
          <p className="text-gray-500 text-sm mt-2">Catégories disponibles sur GuardMee</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {incidentTypes.map((t, i) => (
            <span
              key={t.label}
              className={`badge border cursor-default hover:shadow-md hover:-translate-y-0.5 transition-all ${t.color} animate-fade-in-up`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="mr-1.5">{t.icon}</span>
              {t.label}
            </span>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-securite to-securite-dark rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-white text-center animate-fade-in-up">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-8 w-32 h-32 bg-white rounded-full blur-2xl" />
          <div className="absolute bottom-4 right-8 w-24 h-24 bg-urgence rounded-full blur-xl" />
        </div>
        <div className="relative z-10">
          <p className="text-4xl mb-4">🛡️</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Rejoignez la communauté GuardMee</h2>
          <p className="text-blue-100/90 mb-7 max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
            Créez votre compte gratuitement et commencez à contribuer à la sécurité de votre communauté dès aujourd'hui.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button to="/inscription" variant="white" size="lg">
              Créer un compte gratuit
              <ChevronRight size={18} />
            </Button>
            <Button to="/connexion" variant="glass" size="lg">
              Se connecter
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
