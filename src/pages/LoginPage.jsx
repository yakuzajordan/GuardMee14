import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Logo from '../components/Logo';
import FirebasePhoneAuth from '../components/FirebasePhoneAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { isFirebaseConfigured } from '../config/firebase';
import { getApiErrorMessage } from '../services/api';

const navigateByRole = (navigate, role) => {
  if (role === 'admin') navigate('/admin');
  else if (role === 'agent' || role === 'moderateur') navigate('/agent');
  else navigate('/dashboard');
};

export default function LoginPage() {
  const { login, loginGoogle, setSession, firebaseEnabled } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '', twoFactorCode: '' });
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPhoneAuth, setShowPhoneAuth] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(form.identifier, form.password, form.twoFactorCode || undefined);
      if (result.requires2FA) {
        setRequires2FA(true);
        setLoading(false);
        return;
      }
      navigateByRole(navigate, result.user.role);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erreur de connexion'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await loginGoogle();
      navigateByRole(navigate, result.user.role);
    } catch (err) {
      setError(err.message || 'Erreur connexion Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <Logo size="lg" />
          <h1 className="text-2xl sm:text-3xl font-bold mt-5 tracking-tight">Connexion</h1>
          <p className="text-gray-500 text-sm mt-2">Accédez à votre compte GuardMee</p>
        </div>

        {firebaseEnabled && (
          <div className="mb-4 flex items-center gap-2 justify-center">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-700 font-medium">Firebase connecté</span>
          </div>
        )}

        <Card className="!p-6 sm:!p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-urgence text-sm p-3.5 rounded-xl border border-red-100 animate-slide-down">
                {error}
              </div>
            )}

            <Input
              label="Email ou téléphone (+237)"
              type="text"
              required
              placeholder="email@exemple.cm ou 670000000"
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
            />

            <Input
              label="Mot de passe"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            {requires2FA && (
              <Input
                label="Code 2FA"
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={form.twoFactorCode}
                onChange={(e) => setForm({ ...form, twoFactorCode: e.target.value })}
              />
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full mt-2" loading={loading}>
              Se connecter
            </Button>

            {firebaseEnabled && (
              <>
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-3 text-gray-400">ou via Firebase</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continuer avec Google
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  className="w-full"
                  onClick={() => setShowPhoneAuth(!showPhoneAuth)}
                >
                  {showPhoneAuth ? 'Masquer' : 'Connexion par SMS (+237)'}
                </Button>

                {showPhoneAuth && (
                  <FirebasePhoneAuth
                    onSuccess={(data) => {
                      setSession(data);
                      navigateByRole(navigate, data.user.role);
                    }}
                    onError={(msg) => setError(msg)}
                  />
                )}
              </>
            )}
          </form>
        </Card>

        {!isFirebaseConfigured() && (
          <p className="text-xs text-gray-400 text-center mt-4">
            Configurez Firebase dans .env pour activer Google et SMS
          </p>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          Pas encore de compte ?{' '}
          <Link to="/inscription" className="text-securite font-semibold hover:underline active:opacity-70">
            S'inscrire
          </Link>
        </p>
      </div>
    </Layout>
  );
}
