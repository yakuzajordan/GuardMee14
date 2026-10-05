import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Button from '../components/ui/Button';

export default function VerifySMSPage() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="max-w-md mx-auto text-center py-8">
        <div className="animate-bounce-in">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
            <svg className="w-12 h-12 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Compte créé avec succès !</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Votre compte GuardMee a été créé. La vérification du téléphone se fait via Firebase Phone Auth.
          </p>
          <Button
            onClick={() => navigate('/dashboard')}
            variant="primary"
            size="lg"
            className="w-full glow-securite"
          >
            Accéder au tableau de bord →
          </Button>
        </div>
      </div>
    </Layout>
  );
}
