import React, { useState } from 'react';
import { X, MessageSquarePlus, Send, CheckCircle2 } from 'lucide-react';

interface SuggestQuestionModalProps {
  onClose: () => void;
}

export const SuggestQuestionModal: React.FC<SuggestQuestionModalProps> = ({ onClose }) => {
  const [questionText, setQuestionText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() || questionText.trim().length < 5) {
      setError('A pergunta deve ter pelo menos 5 caracteres.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/questions/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: questionText.trim(),
          author: authorName.trim() || 'Jogador Anônimo',
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao enviar pergunta.');
      }
    } catch {
      setError('Erro de conexão ao enviar sugestão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#05070A]/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-[#0A0E14] border-2 border-[#2D3139] rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#2D3139]">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-[#DDA15E]" />
            <h2 className="text-xl font-black uppercase tracking-tight italic text-[#FEFAE0]">
              Sugerir Pergunta para o Jogo
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#A3A3A3] hover:text-[#FEFAE0] hover:bg-[#11161D] rounded-xl transition-colors cursor-pointer border border-transparent hover:border-[#2D3139]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-6 rounded-xl bg-[#11161D] border-2 border-[#606C38] text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-[#606C38] mx-auto" />
            <h3 className="text-lg font-black uppercase tracking-tight italic text-[#FEFAE0]">
              Pergunta Enviada com Sucesso! 🐾
            </h3>
            <p className="text-xs text-[#A3A3A3] font-medium">
              Sua sugestão foi salva com o status{' '}
              <strong className="text-[#DDA15E]">"pendente"</strong> e passará pela curadoria admin para entrar no banco
              oficial!
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 rounded-xl bg-[#606C38] text-[#FEFAE0] text-xs font-bold uppercase tracking-wider hover:bg-[#FEFAE0] hover:text-[#05070A] transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-2">
                Texto da Pergunta (Sem resposta correta factual!)
              </label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Ex: Qual é o melhor salgado de lanchonete da tarde?"
                rows={3}
                required
                maxLength={140}
                className="w-full bg-[#11161D] border-b-2 border-[#2D3139] focus:border-[#DDA15E] p-4 text-[#FEFAE0] placeholder:text-[#2D3139] text-base font-bold outline-none transition-all rounded-t-xl resize-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-2">
                Seu Nome (Autor - Opcional)
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Ex: Rex, Ana, Anônimo..."
                maxLength={25}
                className="w-full bg-[#11161D] border-b-2 border-[#2D3139] focus:border-[#DDA15E] px-4 py-3 text-[#FEFAE0] placeholder:text-[#2D3139] text-base font-bold outline-none transition-all rounded-t-xl"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-[#DDA15E] text-[#05070A] font-black uppercase tracking-tighter text-lg hover:bg-[#FEFAE0] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xl"
            >
              <Send className="w-5 h-5" />
              <span>{loading ? 'Enviando...' : 'Enviar para a Curadoria'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
