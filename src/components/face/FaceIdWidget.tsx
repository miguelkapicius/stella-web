import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { cn } from '../../lib/utils';
import { attachStreamToVideo, extractEmbeddingFromVideo, getUserMediaStream, livenessHeadMove, loadFaceModels, stopStream, waitForVideoReady } from '../../services/face';

export type FaceIdWidgetProps = {
  requireLiveness?: boolean;
  onCapture?: (embedding: number[]) => void;
};

// const MAX_VIDEO_READY_RETRIES = 5;

export function FaceIdWidget({ requireLiveness = false, onCapture }: FaceIdWidgetProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [detected, setDetected] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [message, setMessage] = useState<string>('');

  // security hint
  const isSecure = useMemo(() => window.isSecureContext || location.hostname === 'localhost', []);

  useEffect(() => {
    let mounted = true;
    async function start() {
      try {
        if (!isSecure) {
          console.warn('Acesso à câmera requer contexto seguro (HTTPS) ou localhost.');
        }
        await loadFaceModels();
        const s = await getUserMediaStream();
        if (!mounted) return;
        setStream(s);
        if (videoRef.current) {
          await attachStreamToVideo(videoRef.current, s);
          const ready = await waitForVideoReady(videoRef.current);
          if (!ready) {
            setMessage('Câmera não ficou pronta. Verifique permissões e tente novamente.');
          }
        }
      } catch (e: any) {
        setMessage(e?.message || 'Falha ao acessar câmera (permita o uso e recarregue a página).');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    start();
    return () => {
      mounted = false;
      stopStream(stream);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // simple periodic detection indicator (no heavy state returned)
  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;

    async function tick() {
      if (cancelled) return;
      if (videoRef.current && videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
        const res = await extractEmbeddingFromVideo(videoRef.current);
        setDetected(!!res.detected);
      }
      timer = window.setTimeout(tick, 700) as unknown as number;
    }

    if (!isLoading) tick();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [isLoading]);

  const handleCapture = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      setIsCapturing(true);
      setMessage('');

      if (requireLiveness) {
        setMessage('Verificando vivacidade, mova a cabeça para os lados...');
        const liveOk = await livenessHeadMove(videoRef.current);
        if (!liveOk) {
          setMessage('Vivacidade não confirmada. Tente novamente movendo a cabeça.');
          setIsCapturing(false);
          return;
        }
      }

      setMessage('Analisando rosto...');
      const res = await extractEmbeddingFromVideo(videoRef.current);
      if (!res.detected || !res.embedding) {
        setMessage('Nenhum rosto encontrado. Ajuste o enquadramento e tente novamente.');
        setIsCapturing(false);
        return;
      }

      setMessage('Rosto capturado com sucesso.');
      onCapture?.(res.embedding);
    } catch (e: any) {
      setMessage(e?.message || 'Falha na captura');
    } finally {
      setIsCapturing(false);
    }
  }, [onCapture, requireLiveness]);

  const handleRecapture = useCallback(async () => {
    setMessage('Reiniciando câmera...');
    try {
      stopStream(stream);
      const s = await getUserMediaStream();
      setStream(s);
      if (videoRef.current) {
        await attachStreamToVideo(videoRef.current, s);
        await waitForVideoReady(videoRef.current);
      }
      setMessage('');
    } catch (e: any) {
      setMessage(e?.message || 'Falha ao reiniciar câmera');
    }
  }, [stream]);

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <div className={cn('relative rounded-xl overflow-hidden bg-black aspect-video border', detected ? 'ring-2 ring-green-500' : 'ring-2 ring-stone-700')}>
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton className="w-24 h-24 rounded-full" />
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        )}
        <div className="absolute left-2 top-2 px-2 py-1 rounded text-xs bg-black/60 text-white">
          {detected ? 'Rosto detectado' : 'Nenhum rosto encontrado'}
        </div>
      </div>

      {message && (
        <div className="text-sm text-stone-300 min-h-5">{message}</div>
      )}

      <div className="flex gap-2">
        <Button onClick={handleCapture} disabled={isLoading || isCapturing}>
          {isCapturing ? 'Capturando...' : 'Capturar'}
        </Button>
        <Button variant="outline" onClick={handleRecapture} disabled={isLoading || isCapturing}>
          Recapturar
        </Button>
      </div>

      <div className="text-xs text-stone-500">
        Dica: fique em um ambiente iluminado e centralize o rosto no quadro.
      </div>
    </div>
  );
}
