import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CameraOff, Square, Radio, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

/**
 * LiveVideoRecorder
 * Composant de capture et diffusion vidéo en direct avec analyse IA GuardMee
 */
export default function LiveVideoRecorder({
  coordinates,
  address,
  incidentType,
  description,
  isAnonymous,
  onComplete,
  onError,
}) {
  const { socket } = useSocket();

  const [streamActive, setStreamActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [duration, setDuration] = useState(0);

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const currentStreamIdRef = useRef(null);
  const chunkIndexRef = useRef(0);
  const timerRef = useRef(null);

  // Nettoyage de la caméra et des flux
  const stopCameraStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  }, []);

  // Démarrage de la caméra
  const startCamera = async () => {
    setErrorMessage('');
    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
        audio: true,
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        // Fallback sans audio si le micro pose problème
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      }

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => { });
      }
      setStreamActive(true);
    } catch {
      const msg = "Impossible d'accéder à la caméra. Vérifiez les autorisations de votre navigateur.";
      setErrorMessage(msg);
      if (onError) onError(msg);
    }
  };

  // Capture d'un instantané (snapshot base64 pour analyse IA)
  const captureSnapshot = () => {
    if (!videoRef.current) return '';
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      return dataUrl.split(',')[1] || '';
    } catch {
      return '';
    }
  };

  // Démarrer l'enregistrement et le streaming live
  const startRecording = () => {
    if (!socket || !socket.connected) {
      const msg = 'Connexion temps réel indisponible. Veuillez vérifier votre réseau.';
      setErrorMessage(msg);
      if (onError) onError(msg);
      return;
    }

    if (!mediaStreamRef.current) {
      setErrorMessage('Veuillez activer la caméra avant de lancer le direct.');
      return;
    }

    setErrorMessage('');
    const newStreamId = `stream_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    currentStreamIdRef.current = newStreamId;
    chunkIndexRef.current = 0;

    socket.emit('video_stream_start', {
      consent: true,
      streamId: newStreamId,
      coordinates: coordinates || [3.848, 11.5021],
      address: address || '',
      type: incidentType || 'autre',
      description: description || 'Signalement vidéo en direct',
      isAnonymous: Boolean(isAnonymous),
    });
  };

  // Initialisation du MediaRecorder une fois le backend prêt
  const setupMediaRecorder = useCallback((_streamId) => {
    if (!mediaStreamRef.current) return;

    let mimeType = 'video/webm';
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
        mimeType = 'video/webm;codecs=vp8,opus';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      }
    }

    try {
      const recorder = new MediaRecorder(mediaStreamRef.current, {
        mimeType,
        videoBitsPerSecond: 1200000,
      });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0 && currentStreamIdRef.current) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result;
            if (typeof result === 'string') {
              const base64Data = result.split(',')[1];
              if (base64Data && socket && socket.connected) {
                socket.emit('video_chunk', {
                  streamId: currentStreamIdRef.current,
                  chunk: base64Data,
                  index: chunkIndexRef.current++,
                });
              }
            }
          };
          reader.readAsDataURL(event.data);
        }
      };

      recorder.start(1000); // Découpage toutes les secondes
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      const msg = "Votre navigateur ne supporte pas l'enregistrement vidéo requis.";
      setErrorMessage(msg);
      if (onError) onError(msg);
    }
  }, [socket, onError]);

  // Arrêter l'enregistrement et soumettre pour analyse IA
  const stopRecording = () => {
    if (!isRecording && !mediaRecorderRef.current) return;

    clearInterval(timerRef.current);
    setIsSubmitting(true);
    setIsRecording(false);

    // Capture de l'image de synthèse avant arrêt
    const snapshot = captureSnapshot();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignorer
      }
    }

    const streamId = currentStreamIdRef.current;
    if (socket && streamId) {
      socket.emit('video_stream_end', {
        streamId,
        snapshot,
      });
    }

    // Arrêt de la caméra
    stopCameraStream();
  };

  // Annuler la diffusion
  const cancelStreaming = () => {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignorer
      }
    }

    if (socket && currentStreamIdRef.current) {
      socket.emit('video_stream_cancel', { streamId: currentStreamIdRef.current });
    }

    stopCameraStream();
    setIsRecording(false);
    setIsSubmitting(false);
    setDuration(0);
    currentStreamIdRef.current = null;
  };

  // Écouteurs Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleReady = (data) => {
      const streamId = data?.streamId || currentStreamIdRef.current;
      setupMediaRecorder(streamId);
    };

    const handleResult = (data) => {
      setIsSubmitting(false);
      if (onComplete) onComplete(data);
    };

    const handleError = (data) => {
      setIsSubmitting(false);
      setIsRecording(false);
      clearInterval(timerRef.current);
      const msg = data?.message || 'Une erreur est survenue lors de la diffusion vidéo.';
      setErrorMessage(msg);
      if (onError) onError(msg);
    };

    socket.on('video_stream_ready', handleReady);
    socket.on('live_stream_result', handleResult);
    socket.on('video_stream_error', handleError);

    return () => {
      socket.off('video_stream_ready', handleReady);
      socket.off('live_stream_result', handleResult);
      socket.off('video_stream_error', handleError);
    };
  }, [socket, setupMediaRecorder, onComplete, onError]);

  // Nettoyage au démontage du composant
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignorer
        }
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm p-4">
      {/* Zone vidéo */}
      <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover ${!streamActive ? 'hidden' : ''}`}
        />

        {/* Placeholder si caméra inactive */}
        {!streamActive && !isSubmitting && (
          <div className="flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <CameraOff size={48} className="mb-2 opacity-50" />
            <p className="text-sm font-medium">Caméra désactivée</p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">
              Activez la caméra pour diffuser votre alerte en direct avec analyse IA immédiate.
            </p>
          </div>
        )}

        {/* Loader pendant l'analyse IA */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white p-6 z-20">
            <Loader2 size={40} className="animate-spin text-red-500 mb-3" />
            <p className="font-semibold text-base">Traitement & Analyse IA en cours...</p>
            <p className="text-xs text-gray-300 mt-1 text-center">
              Reconnaissance de la situation et acheminement vers les services d'urgence.
            </p>
          </div>
        )}

        {/* Badge REC en direct */}
        {isRecording && (
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600/90 backdrop-blur-xs text-white text-xs font-bold px-3 py-1.5 rounded-full z-10 shadow-sm animate-pulse">
            <Radio size={14} className="animate-spin" />
            <span>EN DIRECT</span>
            <span className="font-mono ml-1">{formatTimer(duration)}</span>
          </div>
        )}
      </div>

      {/* Message d'erreur */}
      {errorMessage && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Barre de contrôles */}
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
                  <span>Lancer le direct</span>
                </button>
                <button
                  type="button"
                  onClick={stopCameraStream}
                  className="px-3 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-sm transition cursor-pointer"
                  title="Fermer la caméra"
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
                  onClick={cancelStreaming}
                  className="px-3 py-2.5 border border-gray-300 hover:bg-gray-100 text-gray-600 rounded-xl text-sm transition cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            ) : null}

            {streamActive && !isRecording && !isSubmitting && (
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setTimeout(startCamera, 300);
                }}
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
