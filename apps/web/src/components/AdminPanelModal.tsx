import React, { useState, useEffect } from 'react';
import { X, Shield, Check, Trash2, Plus, RefreshCw, Key } from 'lucide-react';
import type { Question, QuestionStatus } from '@segue/shared';

interface AdminPanelModalProps {
  onClose: () => void;
}

type Tab = 'pendente' | 'aprovada' | 'add';

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ onClose }) => {
  const [passkey, setPasskey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('pendente');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newCategory, setNewCategory] = useState('Geral');

  const token = passkey.trim();

  const headers = { 'Content-Type': 'application/json', 'x-admin-token': token };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Digite o token de admin.');
      return;
    }
    setError('');
    setIsAuthenticated(true);
  };

  const fetchQuestions = async (status?: QuestionStatus) => {
    setLoading(true);
    try {
      const url = status ? `/api/admin/questions?status=${status}` : '/api/admin/questions';
      const res = await fetch(url, { headers });
      if (res.ok) {
        setQuestions((await res.json()) as Question[]);
      } else {
        setError('Token inválido ou sem permissão.');
        setIsAuthenticated(false);
      }
    } catch {
      setError('Erro ao carregar perguntas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      void fetchQuestions(activeTab === 'add' ? undefined : (activeTab as QuestionStatus));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthenticated]);

  const handleAction = async (questionId: string, action: 'approve' | 'reject' | 'delete') => {
    try {
      if (action === 'delete') {
        const res = await fetch(`/api/admin/questions/${questionId}`, { method: 'DELETE', headers });
        if (!res.ok) setError('Falha ao excluir.');
      } else {
        const status: QuestionStatus = action === 'approve' ? 'approved' : 'rejected';
        const res = await fetch(`/api/admin/questions/${questionId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status }),
        });
        if (!res.ok) setError('Falha ao atualizar.');
      }
      void fetchQuestions(activeTab === 'add' ? undefined : (activeTab as QuestionStatus));
    } catch {
      setError('Erro de conexão.');
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: newQuestionText.trim(), category: newCategory, status: 'approved' }),
      });
      if (res.ok) {
        setNewQuestionText('');
        setActiveTab('aprovada');
      } else {
        setError('Falha ao adicionar pergunta.');
      }
    } catch {
      setError('Erro de conexão.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#05070A]/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-[#0A0E14] border-2 border-[#2D3139] rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-[#2D3139]">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#DDA15E]" />
            <h2 className="text-xl font-black uppercase tracking-tight italic text-[#FEFAE0]">
              Painel de Curadoria Admin
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#A3A3A3] hover:text-[#FEFAE0] hover:bg-[#11161D] rounded-xl transition-colors cursor-pointer border border-transparent hover:border-[#2D3139]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAuthenticated ? (
          <form onSubmit={handleLogin} className="space-y-4 py-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                {error}
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-2">
                Token de Admin (definido no servidor)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="Digite o token de admin..."
                  required
                  className="w-full bg-[#11161D] border-b-2 border-[#2D3139] focus:border-[#DDA15E] px-4 py-3 text-[#FEFAE0] placeholder:text-[#2D3139] text-base font-bold outline-none transition-all rounded-t-xl pl-10"
                />
                <Key className="w-4 h-4 text-[#A3A3A3] absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-[#DDA15E] text-[#05070A] font-black uppercase tracking-tighter text-lg hover:bg-[#FEFAE0] transition-colors cursor-pointer shadow-xl"
            >
              Acessar Painel
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-[#2D3139] pb-2 flex-wrap">
              <button
                onClick={() => setActiveTab('pendente')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'pendente' ? 'bg-[#DDA15E] text-[#05070A]' : 'text-[#A3A3A3] hover:text-[#FEFAE0]'
                }`}
              >
                Pendentes (Sugestões)
              </button>
              <button
                onClick={() => setActiveTab('aprovada')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'aprovada' ? 'bg-[#606C38] text-[#FEFAE0]' : 'text-[#A3A3A3] hover:text-[#FEFAE0]'
                }`}
              >
                Aprovadas (Pool Oficial)
              </button>
              <button
                onClick={() => setActiveTab('add')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'add'
                    ? 'bg-[#11161D] text-[#DDA15E] border border-[#2D3139]'
                    : 'text-[#A3A3A3] hover:text-[#FEFAE0]'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Pergunta
              </button>
            </div>

            {activeTab === 'add' ? (
              <form onSubmit={handleAddQuestion} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-2">
                    Texto da Pergunta
                  </label>
                  <input
                    type="text"
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    placeholder="Ex: Qual o melhor sabor de picolé na praia?"
                    required
                    className="w-full bg-[#11161D] border-b-2 border-[#2D3139] focus:border-[#DDA15E] px-4 py-3 text-[#FEFAE0] placeholder:text-[#2D3139] text-base font-bold outline-none rounded-t-xl"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-2">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Ex: Boteco & Comida, Cotidiano..."
                    required
                    className="w-full bg-[#11161D] border-b-2 border-[#2D3139] focus:border-[#DDA15E] px-4 py-3 text-[#FEFAE0] placeholder:text-[#2D3139] text-base font-bold outline-none rounded-t-xl"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-[#606C38] text-[#FEFAE0] font-black uppercase tracking-tighter text-lg hover:bg-[#FEFAE0] hover:text-[#05070A] transition-colors cursor-pointer"
                >
                  Adicionar ao Banco de Perguntas
                </button>
              </form>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                {loading ? (
                  <p className="text-center text-xs text-[#A3A3A3] py-4 flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Carregando perguntas...
                  </p>
                ) : questions.length === 0 ? (
                  <p className="text-center text-xs text-[#A3A3A3] py-4">
                    Nenhuma pergunta com status "{activeTab}".
                  </p>
                ) : (
                  questions.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-[#11161D] border border-[#2D3139] text-xs"
                    >
                      <div className="space-y-1 pr-2">
                        <p className="font-bold text-[#FEFAE0]">"{q.text}"</p>
                        <span className="text-[10px] text-[#A3A3A3]">
                          Autor: {q.author || 'Sistema'} | Categoria: {q.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {activeTab === 'pendente' && (
                          <button
                            onClick={() => handleAction(q.id, 'approve')}
                            className="p-2 rounded-xl bg-[#606C38]/20 hover:bg-[#606C38] text-[#FEFAE0] border border-[#606C38] cursor-pointer transition-colors"
                            title="Aprovar Pergunta"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleAction(q.id, 'delete')}
                          className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900 text-rose-300 border border-rose-500/40 cursor-pointer transition-colors"
                          title="Excluir Pergunta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
