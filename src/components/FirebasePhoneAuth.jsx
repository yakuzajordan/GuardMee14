import { useState } from 'react';
import { initPhoneRecaptcha, loginWithPhone, confirmPhoneCode } from '../services/firebaseAuth';

export default function FirebasePhoneAuth({ onSuccess, onError }) {
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      initPhoneRecaptcha('recaptcha-container');
      const result = await loginWithPhone(phone);
      setConfirmation(result);
      setStep('code');
    } catch (err) {
      onError?.(err.message || 'Erreur envoi SMS');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await confirmPhoneCode(confirmation, code, name || 'Utilisateur');
      onSuccess?.(data);
    } catch (err) {
      onError?.(err.message || 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div id="recaptcha-container" />

      {step === 'phone' ? (
        <form onSubmit={handleSendCode} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Téléphone (+237)</label>
            <div className="flex">
              <span className="px-3 py-3 bg-gray-100 border border-r-0 rounded-l-xl text-gray-500 text-sm">+237</span>
              <input
                type="tel"
                required
                placeholder="6XX XXX XXX"
                pattern="[6-9][0-9]{8}"
                className="flex-1 px-4 py-3 border rounded-r-xl focus:ring-2 focus:ring-securite outline-none"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 border border-securite text-securite rounded-xl text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
          >
            {loading ? 'Envoi...' : 'Recevoir le code SMS'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-3">
          <input
            type="text"
            placeholder="Votre nom"
            className="w-full px-4 py-2 border rounded-xl text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text"
            required
            maxLength={6}
            placeholder="Code SMS"
            className="w-full px-4 py-3 border rounded-xl text-center text-xl tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-securite text-white rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Vérification...' : 'Vérifier le code'}
          </button>
          <button type="button" onClick={() => setStep('phone')} className="text-sm text-gray-500 hover:underline w-full">
            Changer de numéro
          </button>
        </form>
      )}
    </div>
  );
}
