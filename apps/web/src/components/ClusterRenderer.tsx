import React from 'react';
import { GripVertical } from 'lucide-react';
import type { EditableCluster, ClusterMeta } from '../lib/cluster-utils';
import { getClusterMeta } from '../lib/cluster-utils';
import { DogAvatar } from './DogAvatar';
import type { DragHandlers } from '../lib/use-drag-and-drop';

interface ClusterRendererProps {
  cluster: EditableCluster;
  index: number;
  currentPlayerId: string;
  drag: DragHandlers;
  onLabelChange: (index: number, label: string) => void;
  compact?: boolean;
}

export const ClusterRenderer: React.FC<ClusterRendererProps> = ({
  cluster,
  index,
  currentPlayerId,
  drag,
  onLabelChange,
  compact = false,
}) => {
  const meta: ClusterMeta = getClusterMeta(cluster, index);
  const variants = Array.from(new Set(cluster.respostas.map((r) => r.text)));

  return (
    <div className={`${compact ? 'p-4 rounded-xl' : 'p-5 rounded-2xl'} ${meta.borderClass} space-y-3 transition-all`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className={compact ? 'text-xl' : 'text-2xl'}>{meta.icon}</span>
          <input
            type="text"
            value={cluster.rotulo}
            onChange={(e) => onLabelChange(index, e.target.value)}
            className={`${compact ? 'text-lg' : 'text-xl'} font-black uppercase tracking-tight italic text-[#FEFAE0] bg-transparent border-none outline-none focus:ring-1 focus:ring-[#DDA15E] rounded px-1`}
            style={{ minWidth: compact ? '140px' : '120px' }}
          />
          <span className="text-xs font-mono font-bold text-[#DDA15E] bg-[#11161D] border border-[#2D3139] px-2.5 py-0.5 rounded-full">
            {cluster.respostas.length} {cluster.respostas.length === 1 ? 'voto' : 'votos'}
          </span>
        </div>

        <div className={`px-3 py-1 rounded-full text-xs border ${meta.badgeBg} flex items-center gap-1.5`}>
          <span>{meta.badgeText}</span>
        </div>
      </div>

      {variants.length > 0 && variants.length !== cluster.respostas.length && (
        <p className="text-[11px] text-[#B0B0B0] italic">
          Variações digitadas: {variants.map((a) => `"${a}"`).join(', ')}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {cluster.respostas.map((r, answerIdx) => {
          const isCurrent = r.playerId === currentPlayerId;
          return (
            <div
              key={r.playerId}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border cursor-grab active:cursor-grabbing ${
                isCurrent
                  ? 'bg-[#11161D] border-[#DDA15E] text-[#FEFAE0] ring-1 ring-[#DDA15E]'
                  : 'bg-[#11161D] border-[#2D3139] text-[#B0B0B0]'
              }`}
              draggable
              onDragStart={drag.onDragStart(index, answerIdx)}
            >
              <GripVertical className="w-4 h-4 text-[#606C38] cursor-grab opacity-50 hover:opacity-100" />
              <DogAvatar avatarId={r.avatarId} size={20} />
              <span style={{ color: isCurrent ? r.color : undefined }}>{r.playerName}</span>
              <span className="text-[10px] text-[#DDA15E] font-mono">+{cluster.points} pts</span>
            </div>
          );
        })}
      </div>

      <div
        className={`drop-zone border-2 border-dashed border-[#2D3139] rounded-${compact ? 'lg' : 'xl'} p-3 min-h-[${compact ? '50px' : '60px'}]`}
        onDragOver={drag.onDragOver}
        onDrop={drag.onDropToCluster(index)}
      >
        {cluster.respostas.length === 0 && (
          <p className="text-center text-[11px] text-[#606C38] italic">Arraste respostas aqui</p>
        )}
      </div>
    </div>
  );
};
