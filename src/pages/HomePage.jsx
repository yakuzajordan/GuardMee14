import { Shield, Map, Bell, Users, Zap, Smartphone, ArrowRight } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const features = [
  { icon: Shield, title: 'Signalement rapide', desc: 'Signalez un incident en quelques secondes avec photo et géolocalisation GPS.', color: 'text-urgence bg-red-50' },
  { icon: Map, title: 'Carte en temps réel', desc: 'Visualisez les zones à risque sur une carte interactive avec heatmap.', color: 'text-securite bg-blue-50' },
  { icon: Bell, title: 'Alertes géolocalisées', desc: 'Recevez des notifications quand un incident survient près de chez vous.', color: 'text-warning bg-amber-50' },
  { icon: Users, title: 'Communauté active', desc: 'Rejoignez des milliers de citoyens engagés pour la sécurité au Cameroun.', color: 'text-success bg-green-50' },
  { icon: Zap, title: 'Intervention rapide', desc: 'Les agents de sécurité coordonnent les interventions en temps réel.', color: 'text-securite bg-blue-50' },
  { icon: Smartphone, title: 'Optimisé 3G/4G', desc: 'Fonctionne même avec une connexion lente. Mode hors-ligne disponible.', color: 'text-gray-600 bg-gray-50' },
];

const incidentTypes = [
  'Agression', 'Accident', 'Incendie', 'Inondation',
  'Coupure électricité/eau', 'Vol', 'Danger sanitaire',
];

export default function HomePage() {
  return (
    <Layout>
      <section className="hero-gradient text-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-14 mb-10 sm:mb-14">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold bg-white/15 backdrop-blur rounded-full border border-white/20">
            🇨🇲 Cameroun · Sécurité communautaire
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 leading-tight tracking-tight">
            Protégez votre communauté avec{' '}
            <span className="text-red-300">GuardMee</span>
          </h1>
          <p className="text-base sm:text-lg text-blue-100/90 mb-8 leading-relaxed max-w-xl">
            La plateforme communautaire de signalement et d'alerte en temps réel des zones à risque au Cameroun.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <Button to="/inscription" variant="danger" size="lg" className="w-full sm:w-auto">
              Commencer gratuitement
              <ArrowRight size={18} />
            </Button>
            <Button to="/carte" variant="glass" size="lg" className="w-full sm:w-auto">
              Voir la carte
            </Button>
          </div>
        </div>
        <div className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 opacity-[0.07] text-[120px] sm:text-[200px] select-none pointer-events-none">
          🛡️
        </div>
      </section>

      <section className="mb-12 sm:mb-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Comment ça marche ?</h2>
        <p className="text-gray-500 text-center mb-8 text-sm sm:text-base">Trois étapes pour agir rapidement</p>
        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
          {[
            { step: '1', title: 'Signalez', desc: 'Décrivez l\'incident, ajoutez une photo et votre position GPS.' },
            { step: '2', title: 'Alertez', desc: 'La communauté et les agents sont notifiés instantanément.' },
            { step: '3', title: 'Intervenez', desc: 'Les services d\'urgence coordonnent une réponse rapide.' },
          ].map((s, i) => (
            <Card key={s.step} hover className="text-center" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="w-12 h-12 bg-gradient-to-br from-urgence to-urgence-dark text-white rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-lg shadow-urgence/20">
                {s.step}
              </div>
              <h3 className="font-bold text-lg mb-2">{s.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{s.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-12 sm:mb-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">Fonctionnalités</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc, color }) => (
            <Card key={title} hover>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon size={22} />
              </div>
              <h3 className="font-semibold mb-1.5">{title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-12 sm:mb-16">
        <h2 className="text-2xl font-bold text-center mb-6">Types d'incidents signalables</h2>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {incidentTypes.map((t) => (
            <span
              key={t}
              className="badge bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-securite/30 cursor-default"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      <Card>
        <h2 className="text-xl sm:text-2xl font-bold mb-3">Documentation API</h2>
        <p className="text-gray-600 mb-5 text-sm sm:text-base leading-relaxed">
          GuardMee expose une API RESTful complète documentée avec Swagger pour l'intégration avec d'autres services.
        </p>
        <Button
          href="http://localhost:5000/api/docs"
          variant="outline"
          size="md"
        >
          Accéder à la documentation Swagger
          <ArrowRight size={16} />
        </Button>
      </Card>
    </Layout>
  );
}
