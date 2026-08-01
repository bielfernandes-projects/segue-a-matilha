import { buildApp } from '@segue/game';

// Funcao serverless unica que expoe a API REST do jogo.
// Todas as rotas /api/* sao roteadas para aqui via vercel.json.
export const config = {
  maxDuration: 60,
};

export default buildApp();
