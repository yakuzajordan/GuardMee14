import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CameraOff, Square, Radio, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { uploadIncidentMedia } from '../services/storageService';

export default function LiveVideoRecorder({
  coordinates,
  address,
  incidentType,
  description,
  isAnonymous,
  onComplete,
  onError,
}) {
  const [streamActive, setStreamActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [duration, setDuration] = useState(0);

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const stopCameraStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreamActive(false);
  }, []);

  const startCamera = async () => {
    setErrorMessage('');
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStreamActive(true);
    } catch {
      const msg = "Impossible d'accéder à la caméra. Vérifiez les autorisations de votre navigateur.";
      setErrorMessage(msg);
      if (onError) onError(msg);
    }
  };

  const startRecording = () => {
    if (!mediaStreamRef.current) {
      setErrorMessage('Veuillez activer la caméra avant de lancer le direct.');
      return;
    }

    setErrorMessage('');
    chunksRef.current = [];

    let mimeType = 'video/webm';
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) mimeType = 'video/webm;codecs=vp8,opus';
      else if (MediaRecorder.isTypeSupported('video/webm')) mimeType = 'video/webm';
      else if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';
    }

    try {
      const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType, videoBitsPerSecond: 1200000 });
      recorder.ondataavailable = (e) => { if (e.data?.size > 0) chunksRef.current.push(e.data); };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((prev) => prev + 1), 1000);
    } catch {
      const msg = "Votre navigateur ne supporte pas l'enregistrement vidéo requis.";
      setErrorMessage(msg);
      if (onError) onError(msg);
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;
    clearInterval(timerRef.current);
    setIsRecording(false);
    setIsSubmitting(true);

    await new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      recorder.onstop = resolve;
      if (recorder.state !== 'inactive') {
        try { recorder.stop(); } catch { resolve(); }
      } else { resolve(); }
    });

    stopCameraStream();

    try {
      const ext = chunksRef.current[0]?.type?.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunksRef.current, { type: `video/${ext}` });
      const file = new File([blob], `video_${Date.now()}.${ext}`, { type: `video/${ext}` });
      const tempId = `live_${Date.now()}`;
      const url = await uploadIncidentMedia(file, tempId);

      setIsSubmitting(false);
      if (onComplete) {
        onComplete({
          videoUrl: url,
          coordinates: coordinates || [3.848, 11.5021],
          address: address || '',
          type: incidentType || 'autre',
          description: description || 'Signalement vidéo en direct',
          isAnonymous: Boolean(isAnonymous),
        });
      }
    } catch (err) {
      setIsSubmitting(false);
      const msg = "Erreur lors de l'envoi de la vidéo. Réessayez.";
      setErrorMessage(msg);
      if (onError) onError(msg);
    }
  };

  const cancelRecording = () => {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    chunksRef.current = [];
    stopCameraStream();
    setIsRecording(false);
    setIsSubmitting(false);
    setDuration(0);
  };

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm p-4">
      <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover ${!streamActive ? 'hidden' : ''}`}
        />

        {!streamActive && !isSubmitting && (
          <div className="flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <CameraOff size={48} className="mb-2 opacity-50" />
            <p className="text-sm font-medium">Caméra désactivée</p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">
              Activez la caméra pour enregistrer et envoyer votre alerte vidéo.
            </p>
          </div>
        )}

        {isSubmitting && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white p-6 z-20">
            <Loader2 size={40} className="animate-spin text-red-500 mb-3" />
            <p className="font-semibold text-base">Envoi de la vidéo en cours...</p>
            <p className="text-xs text-gray-300 mt-1 text-center">
              Chargement vers Firebase Storage.
            </p>
          </div>
        )}

        {isRecording && (
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600/90 backdrop-blur-xs text-white text-xs font-bold px-3 py-1.5 rounded-full z-10 shadow-sm animate-pulse">
            <Radio size={14} className="animate-spin" />
            <span>ENREGISTREMENT</span>
            <span className="font-mono ml-1">{formatTimer(duration)}</span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {!streamActive ? (
          <button
            type="button"
            onClick={startCamera}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-medium transition cursor-pointer"
          >
            <Camera size={18} />
            <span>Activer la caméra</span>
          </button>
        ) : (
          <>
            {!isRecording && !isSubmitting ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition shadow-sm cursor-pointer"
                >
                  <span className="w-3 h-3 rounded-full bg-white animate-ping mr-1" />
                  <span>Démarrer l'enregistrement</span>
                </button>
                <button
                  type="button"
                  onClick={stopCameraStream}
                  className="px-3 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-sm transition cursor-pointer"
                >
                  Désactiver
                </button>
              </div>
            ) : isRecording ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-sm font-bold transition shadow-sm cursor-pointer"
                >
                  <Square size={16} className="fill-white" />
                  <span>Arrêter et envoyer</span>
                </button>
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="px-3 py-2.5 border border-gray-300 hover:bg-gray-100 text-gray-600 rounded-xl text-sm transition cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            ) : null}

            {streamActive && !isRecording && !isSubmitting && (
              <button
                type="button"
                onClick={() => { stopCameraStream(); setTimeout(startCamera, 300); }}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 p-2 rounded-lg transition ml-auto cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Changer caméra</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
