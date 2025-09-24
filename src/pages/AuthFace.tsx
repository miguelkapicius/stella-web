import { useState } from 'react';
import { FaceIdWidget } from '../components/face/FaceIdWidget';
import { Button } from '../components/ui/button';
import { authenticateFace } from '../services/face-api';

export default function AuthFace() {
  const [embedding, setEmbedding] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  async function handleSubmit() {
    if (!embedding) {
      setMessage('Capture um rosto antes de autenticar.');
      return;
    }

    setLoading(true);
    setMessage('Autenticando...');
    const res = await authenticateFace({ embedding });
    if (!res.ok) {
      setMessage(res.error || 'Falha na autenticação.');
    } else {
      setMessage('Autenticado com sucesso.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-50">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Autenticação FaceID</h1>

        <FaceIdWidget onCapture={(emb) => setEmbedding(emb)} />

        <div className="flex gap-3 items-center">
          <Button onClick={handleSubmit} disabled={loading || !embedding}>
            {loading ? 'Autenticando...' : 'Entrar'}
          </Button>
          <div className="text-sm text-stone-400 min-h-5">{message}</div>
        </div>
      </div>
    </div>
  );
}
