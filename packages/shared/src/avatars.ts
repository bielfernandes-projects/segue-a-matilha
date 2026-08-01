export interface DogBreedAvatar {
  id: string;
  name: string;
  breed: string;
  emoji: string;
  color: string;
  bgGradient: string;
  quote: string;
}

export const DOG_AVATARS: DogBreedAvatar[] = [
  { id: 'husky', name: 'Maluco do Ártico', breed: 'Husky Siberiano', emoji: '🐺', color: '#3B82F6', bgGradient: 'from-blue-600 to-indigo-800', quote: 'Uivando alto e seguindo a matilha!' },
  { id: 'golden', name: 'Caramelo Supremo', breed: 'Golden Retriever', emoji: '🦮', color: '#F59E0B', bgGradient: 'from-amber-400 to-yellow-600', quote: 'Amigo de todo mundo, concordo com a maioria!' },
  { id: 'beagle', name: 'Detetive de Petiscos', breed: 'Beagle', emoji: '🐕', color: '#D97706', bgGradient: 'from-amber-600 to-orange-700', quote: 'Faro aguçado para achar a resposta certa!' },
  { id: 'pastor', name: 'Comandante Rex', breed: 'Pastor Alemão', emoji: '🐕‍🦺', color: '#10B981', bgGradient: 'from-emerald-600 to-teal-800', quote: 'Liderando com disciplina e foco total.' },
  { id: 'pug', name: 'Lord Ronrom', breed: 'Pug', emoji: '🐶', color: '#EC4899', bgGradient: 'from-pink-500 to-rose-700', quote: 'Ressabiado mas sempre no meio da galera.' },
  { id: 'border_collie', name: 'Einstein Canino', breed: 'Border Collie', emoji: '🧠', color: '#8B5CF6', bgGradient: 'from-violet-600 to-purple-800', quote: 'Calculando a probabilidade estatística das respostas.' },
  { id: 'poodle', name: 'Madame Charmosa', breed: 'Poodle', emoji: '🐩', color: '#F472B6', bgGradient: 'from-pink-400 to-purple-500', quote: 'Com elegância e muito estilo no palpite!' },
  { id: 'shiba', name: 'Doge da Matilha', breed: 'Shiba Inu', emoji: '🦊', color: '#EF4444', bgGradient: 'from-orange-500 to-red-600', quote: 'Much consensus, very majority, wow!' },
  { id: 'frenchie', name: 'Batata Frita', breed: 'Bulldog Francês', emoji: '🐽', color: '#64748B', bgGradient: 'from-slate-500 to-slate-700', quote: 'Pequeno no tamanho, gigante nas ideias!' },
  { id: 'corgi', name: 'Pão de Forma', breed: 'Corgi', emoji: '🍞', color: '#EAB308', bgGradient: 'from-yellow-500 to-amber-600', quote: 'Rebolando em direção às 2 fichas!' },
  { id: 'dalmata', name: 'Cento e Um', breed: 'Dálmata', emoji: '🐾', color: '#94A3B8', bgGradient: 'from-slate-400 to-gray-600', quote: 'Marcando presença com pinta de vencedor.' },
  { id: 'pitbull', name: 'Thor Coração de Pudim', breed: 'Pitbull', emoji: '💪', color: '#06B6D4', bgGradient: 'from-cyan-600 to-blue-700', quote: 'Forte na amizade e na sintonia do grupo!' },
  { id: 'salsicha', name: 'Rei Salsicha', breed: 'Dachshund', emoji: '🌭', color: '#B45309', bgGradient: 'from-amber-700 to-yellow-900', quote: 'Longo na intuição, rápido na resposta.' },
  { id: 'rottweiler', name: 'Guardião da Noite', breed: 'Rottweiler', emoji: '🛡️', color: '#334155', bgGradient: 'from-slate-700 to-slate-900', quote: 'Protegendo a pontuação da matilha.' },
  { id: 'wolf', name: 'Alfa da Noite', breed: 'Lobo Guará', emoji: '🐺', color: '#1E293B', bgGradient: 'from-slate-800 to-zinc-950', quote: 'O clássico lobo que busca a matilha!' },
  { id: 'samoyeda', name: 'Nuvem de Algodão', breed: 'Samoyeda', emoji: '☁️', color: '#38BDF8', bgGradient: 'from-sky-400 to-indigo-600', quote: 'Sempre sorrindo e concordando com todos!' },
  { id: 'pinscher', name: '50% Tremedeira 50% Ódio', breed: 'Pinscher', emoji: '⚡', color: '#DC2626', bgGradient: 'from-red-600 to-rose-900', quote: 'Digitando rápido antes que o tempo esgote!' },
  { id: 'labrador', name: 'Choco', breed: 'Labrador', emoji: '🍫', color: '#78350F', bgGradient: 'from-amber-800 to-amber-950', quote: 'Pronto para nadar nas fichas de pontuação!' },
  { id: 'chowchow', name: 'Ursinho de Língua Azul', breed: 'Chow Chow', emoji: '🐻', color: '#C2410C', bgGradient: 'from-orange-700 to-red-800', quote: 'Fofo, fofinho e super afinado com a maioria.' },
  { id: 'doberman', name: 'Sombra Prata', breed: 'Doberman', emoji: '⚡', color: '#475569', bgGradient: 'from-slate-600 to-slate-800', quote: 'Postura impecável e reflexos rápidos.' },
];

export function getAvatarById(id: string): DogBreedAvatar {
  return DOG_AVATARS.find((a) => a.id === id) || DOG_AVATARS[0];
}

export function getAvatarColor(id: string): string {
  return getAvatarById(id).color;
}
