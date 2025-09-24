import { useState } from 'react';
import { FaceIdWidget } from '../components/face/FaceIdWidget';
import { Button } from '../components/ui/button';
import { enrollFace } from '../services/face-api';

export default function EnrollFace() {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [embedding, setEmbedding] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  async function handleSubmit() {
    if (!embedding) {
      setMessage('Capture um rosto antes de enviar.');
      return;
    }
    if (!name) {
      setMessage('Informe o nome.');
      return;
    }

    setLoading(true);
    setMessage('Enviando cadastro...');
    const res = await enrollFace({ name, role: role || undefined, embedding });
    if (!res.ok) {
      setMessage(res.error || 'Falha no cadastro.');
    } else {
      setMessage('Cadastro realizado com sucesso.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-50">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Cadastro FaceID</h1>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm text-stone-300">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 outline-none"
              placeholder="Seu nome"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-stone-300">Cargo (opcional)</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 outline-none"
              placeholder="Ex: Estoquista"
            />
          </div>
        </div>

        <FaceIdWidget requireLiveness onCapture={(emb) => setEmbedding(emb)} />

        <div className="flex gap-3 items-center">
          <Button onClick={handleSubmit} disabled={loading || !embedding}>
            {loading ? 'Enviando...' : 'Cadastrar'}
          </Button>
          <div className="text-sm text-stone-400 min-h-5">{message}</div>
        </div>
      </div>
    </div>
  );
}
