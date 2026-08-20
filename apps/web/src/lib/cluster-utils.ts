import type { Cluster, RevealAnswer, ClusterInput, GroupType } from '@segue/shared';

export interface ClusterMeta {
  borderClass: string;
  badgeText: string;
  badgeBg: string;
  icon: string;
}

export function getClusterMeta(cluster: { respostas: RevealAnswer[]; points: number }, idx: number): ClusterMeta {
  const isMajority = idx === 0 && cluster.respostas.length > 0;
  const isMinority = idx > 0 && cluster.respostas.length > 0 && !isMajority;

  if (isMajority) {
    return {
      borderClass: 'border-2 border-[#DDA15E] bg-[#0A0E14] shadow-2xl',
      badgeText: 'A Matilha (+2 Fichas 🎉)',
      badgeBg: 'bg-[#DDA15E] text-[#05070A] font-black uppercase tracking-wider',
      icon: '🏆',
    };
  }

  if (isMinority) {
    return {
      borderClass: 'border-2 border-[#606C38] bg-[#0A0E14]',
      badgeText: 'Os Perdidos (+1 Ficha 🐾)',
      badgeBg: 'bg-[#606C38] text-[#FEFAE0] font-bold uppercase tracking-wider',
      icon: '🐾',
    };
  }

  return {
    borderClass: 'border border-[#2D3139] bg-[#0A0E14]',
    badgeText: 'Lobo Solitário (0 Fichas)',
    badgeBg: 'bg-rose-950/40 text-rose-400 border-rose-500/30',
    icon: '🐺',
  };
}

export interface EditableCluster {
  rotulo: string;
  respostas: RevealAnswer[];
  points: number;
  groupType: 'matilha' | 'perdidos' | 'lobo';
}

export function prepareConsiderPayload(clusters: EditableCluster[]): ClusterInput[] {
  const cleaned = clusters.filter((c) => c.respostas.length > 0);
  return cleaned.map((c) => ({
    rotulo: c.rotulo.trim() || c.respostas[0]?.text || 'Sem rótulo',
    respostas: c.respostas.map((r) => r.text),
  }));
}

export function clustersToEditable(clusters: Cluster[]): EditableCluster[] {
  return clusters.map((c) => ({
    rotulo: c.rotulo,
    respostas: [...c.respostas],
    points: c.points,
    groupType: c.groupType,
  }));
}

export interface AnswerWithGroup {
  answer: RevealAnswer;
  groupType: GroupType;
}

export function clusterToAnswerWithGroups(clusters: Cluster[]): AnswerWithGroup[] {
  const result: AnswerWithGroup[] = [];
  for (const cluster of clusters) {
    for (const answer of cluster.respostas) {
      result.push({ answer, groupType: cluster.groupType });
    }
  }
  return result;
}

export function answersToConsiderPayload(answers: AnswerWithGroup[]): ClusterInput[] {
  const groups = new Map<GroupType, string[]>();
  
  for (const { answer, groupType } of answers) {
    if (!groups.has(groupType)) {
      groups.set(groupType, []);
    }
    groups.get(groupType)!.push(answer.text);
  }
  
  const payload: ClusterInput[] = [];
  const groupOrder: GroupType[] = ['matilha', 'perdidos', 'lobo'];
  
  for (const groupType of groupOrder) {
    const texts = groups.get(groupType);
    if (texts && texts.length > 0) {
      payload.push({ rotulo: groupType, respostas: texts });
    }
  }
  
  return payload;
}
