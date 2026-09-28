import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

export default function VerifySMSPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateUser } = useAuth();
  const navigate = useNavigate();

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.verifySMS(code);
      updateUser(res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await authAPI.resendSMS();
      setError('');
      alert('Code renvoyé par SMS');
    } catch {
      setError('Impossible de renvoyer le code');
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto text-center">
        <div className="text-5xl mb-4">📱</div>
        <h1 className="text-2xl font-bold mb-2">Vérification SMS</h1>
        <p className="text-gray-500 mb-8">Entrez le code à 6 chiffres envoyé sur votre téléphone</p>

        <form onSubmit={handleVerify} className="bg-white rounded-2xl p-6 shadow-sm border space-y-4">
          {error && <div className="bg-red-50 text-urgence text-sm p-3 rounded-lg">{error}</div>}
          <input
            type="text"
            maxLength={6}
            required
            placeholder="000000"
            className="w-full px-4 py-4 border rounded-xl text-center text-2xl tracking-widest focus:ring-2 focus:ring-securite outline-none"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          <button
            type="submit" disabled={loading}
            className="w-full py-3 bg-securite text-white rounded-xl font-semibold disabled:opacity-50"
          >
            {loading ? 'Vérification...' : 'Vérifier'}
          </button>
          <button type="button" onClick={handleResend} className="text-securite text-sm hover:underline">
            Renvoyer le code
          </button>
        </form>
      </div>
    </Layout>
  );
}
