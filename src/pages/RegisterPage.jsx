import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Logo from '../components/Logo';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { isFirebaseConfigured } from '../config/firebase';
import { loginWithGoogle } from '../services/firebaseAuth';
import { getApiErrorMessage } from '../services/api';
import { useI18n } from '../context/i18nContext';

export default function RegisterPage() {
  const { t } = useI18n();
  const { register, setSession } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (!form.email && !form.phone) {
      setError('Un email ou un numéro de téléphone est requis');
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
      setError(getApiErrorMessage(err, "Erreur lors de l'inscription"));
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

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return null;
    if (p.length < 6) return { label: 'Trop court', color: 'bg-red-400', width: '20%' };
    if (p.length < 8) return { label: 'Faible', color: 'bg-orange-400', width: '40%' };
    if (!/[A-Z]/.test(p) || !/[0-9]/.test(p)) return { label: 'Moyen', color: 'bg-yellow-400', width: '65%' };
    return { label: 'Fort', color: 'bg-green-500', width: '100%' };
  };

  const strength = passwordStrength();

  return (
    <Layout>
      <div className="max-w-md mx-auto w-full py-4">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('auth.register.title')}</h1>
          <p className="text-gray-500 text-sm mt-2">{t('auth.register.subtitle')}</p>
        </div>

        <Card className="!p-6 sm:!p-8 animate-fade-in-up delay-150 shadow-xl shadow-gray-200/60">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2.5 bg-red-50 text-urgence text-sm p-3.5 rounded-xl border border-red-100 animate-slide-down">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <Input
              label={t('auth.register.name') + ' *'}
              type="text"
              required
              placeholder="Jean Dupont"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <Input
              label={t('auth.register.email')}
              type="email"
              placeholder="votre@email.cm"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.register.phone')}</label>
              <div className="flex">
                <span className="px-3 py-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl text-gray-500 text-sm font-medium">
                  🇨🇲 +237
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.register.password')} *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Minimum 6 caractères"
                  className="input-field pr-11"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {strength && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Force du mot de passe</span>
                    <span className={`text-xs font-medium ${strength.color === 'bg-green-500' ? 'text-green-600' : strength.color === 'bg-yellow-400' ? 'text-yellow-600' : 'text-red-600'}`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                      style={{ width: strength.width }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le mot de passe *</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  placeholder="Répétez le mot de passe"
                  className={`input-field pr-11 ${form.confirmPassword && form.password !== form.confirmPassword ? 'border-urgence focus:ring-urgence/20' : ''}`}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.confirmPassword && form.password === form.confirmPassword && (
                <p className="text-xs text-success mt-1 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  Mots de passe identiques
                </p>
              )}
            </div>

            <Button type="submit" variant="danger" size="lg" className="w-full mt-2 glow-urgence" loading={loading}>
              {!loading && <UserPlus size={18} />}
              {t('auth.register.submit')}
            </Button>

            {isFirebaseConfigured() && (
              <>
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-3 text-gray-400 font-medium">ou s'inscrire avec</span>
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
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {t('auth.login.google')}
                </Button>
              </>
            )}
          </form>
        </Card>

        <p className="text-xs text-gray-400 text-center mt-4 animate-fade-in-up delay-300">
          En créant un compte, vous acceptez nos conditions d'utilisation
        </p>

        <p className="text-center text-sm text-gray-500 mt-3 animate-fade-in-up delay-400">
          {t('auth.register.hasAccount')}{' '}
          <Link to="/connexion" className="text-securite font-semibold hover:underline active:opacity-70">
            {t('nav.login')} →
          </Link>
        </p>
      </div>
    </Layout>
  );
}
