import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Logo from '../components/Logo';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { isFirebaseConfigured } from '../config/firebase';
import { loginWithGoogle } from '../services/firebaseAuth';
import { getApiErrorMessage } from '../services/api';

export default function RegisterPage() {
  const { register, setSession } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (!form.email && !form.phone) {
      setError('Email ou numéro de téléphone requis');
      return;
    }
    setLoading(true);
    try {
      const result = await register({
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        password: form.password,
      });
      if (result.requiresPhoneVerification) {
        navigate('/verification-sms');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erreur lors de l\'inscription'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await loginWithGoogle();
      setSession(data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Erreur inscription Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <Logo size="lg" />
          <h1 className="text-2xl sm:text-3xl font-bold mt-5 tracking-tight">Créer un compte</h1>
          <p className="text-gray-500 text-sm mt-2">Rejoignez la communauté GuardMee</p>
        </div>

        <Card className="!p-6 sm:!p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-urgence text-sm p-3.5 rounded-xl border border-red-100 animate-slide-down">
                {error}
              </div>
            )}

            <Input
              label="Nom complet *"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <Input
              label="Email"
              type="email"
              placeholder="votre@email.cm"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone (+237)</label>
              <div className="flex">
                <span className="px-3 py-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl text-gray-500 text-sm font-medium">
                  +237
                </span>
                <input
                  type="tel"
                  placeholder="6XX XXX XXX"
                  pattern="[6-9][0-9]{8}"
                  className="input-field rounded-l-none flex-1"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <Input
              label="Mot de passe *"
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            <Input
              label="Confirmer le mot de passe *"
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            />

            <Button type="submit" variant="danger" size="lg" className="w-full mt-2" loading={loading}>
              S'inscrire
            </Button>

            {isFirebaseConfigured() && (
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
                  onClick={handleGoogleRegister}
                  disabled={loading}
                >
                  S'inscrire avec Google
                </Button>
              </>
            )}
          </form>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          Déjà un compte ?{' '}
          <Link to="/connexion" className="text-securite font-semibold hover:underline active:opacity-70">
            Se connecter
          </Link>
        </p>
      </div>
    </Layout>
  );
}
