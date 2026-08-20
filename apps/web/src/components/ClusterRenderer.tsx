import React, { useState, useRef } from 'react';
import { GripVertical } from 'lucide-react';
import type { EditableCluster, ClusterMeta } from '../lib/cluster-utils';
import type { RevealAnswer } from '@segue/shared';
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

interface TouchDragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  element: HTMLElement | null;
  fromCluster: number;
  answerIdx: number;
  answer: RevealAnswer;
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
  const [touchDragState, setTouchDragState] = useState<TouchDragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    element: null,
    fromCluster: -1,
    answerIdx: -1,
    answer: null as any,
  });
  const dragPreviewRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent, answerIdx: number, answer: RevealAnswer) => {
    const touch = e.touches[0];
    const element = e.currentTarget as HTMLElement;
    
    setTouchDragState({
      isDragging: true,
      startX: touch.clientX,
      startY: touch.clientY,
      element,
      fromCluster: index,
      answerIdx,
      answer,
    });
    
    element.classList.add('dragging');
    element.style.opacity = '0.5';
    
    // Create drag preview
    if (dragPreviewRef.current) {
      dragPreviewRef.current.textContent = `${answer.playerName}: ${answer.text}`;
      dragPreviewRef.current.style.left = `${touch.clientX + 10}px`;
      dragPreviewRef.current.style.top = `${touch.clientY + 10}px`;
      dragPreviewRef.current.style.display = 'block';
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDragState.isDragging || !touchDragState.element) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    
    // Update preview position
    if (dragPreviewRef.current) {
      dragPreviewRef.current.style.left = `${touch.clientX + 10}px`;
      dragPreviewRef.current.style.top = `${touch.clientY + 10}px`;
    }
    
    // Check for drop zones under finger
    const dropZones = document.querySelectorAll('.drop-zone');
    dropZones.forEach(zone => {
      const rect = zone.getBoundingClientRect();
      if (
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      ) {
        zone.classList.add('drag-over');
      } else {
        zone.classList.remove('drag-over');
      }
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchDragState.isDragging) return;
    
    const touch = e.changedTouches[0];
    
    // Find drop zone under finger
    const dropZone = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.drop-zone');
    let targetClusterIndex = -1;
    
    if (dropZone) {
      // Find which cluster this drop zone belongs to
      const clusterRenderers = document.querySelectorAll('[data-cluster-index]');
      clusterRenderers.forEach((renderer, idx) => {
        if (renderer.contains(dropZone)) {
          targetClusterIndex = idx;
        }
      });
      
      // Also check the "new cluster" zone in RevealScreen
      const newClusterZone = document.querySelector('.drop-zone[onDrop*="onDropToNewCluster"]');
      if (newClusterZone && newClusterZone.contains(dropZone)) {
        targetClusterIndex = -1; // Special value for new cluster
      }
    }
    
    // Execute drop
    if (targetClusterIndex >= 0) {
      drag.onDropToCluster(targetClusterIndex)({} as React.DragEvent);
    } else if (targetClusterIndex === -1 && dropZone) {
      drag.onDropToNewCluster({} as React.DragEvent);
    }
    
    // Cleanup
    document.querySelectorAll('.drop-zone').forEach(zone => zone.classList.remove('drag-over'));
    if (touchDragState.element) {
      touchDragState.element.classList.remove('dragging');
      touchDragState.element.style.opacity = '1';
    }
    if (dragPreviewRef.current) {
      dragPreviewRef.current.style.display = 'none';
    }
    
    setTouchDragState({
      isDragging: false,
      startX: 0,
      startY: 0,
      element: null,
      fromCluster: -1,
      answerIdx: -1,
      answer: null as any,
    });
  };

  return (
    <>
      <div
        className={`${compact ? 'p-4 rounded-xl' : 'p-5 rounded-2xl'} ${meta.borderClass} space-y-3 transition-all`}
        style={{ userSelect: 'none' }}
        data-cluster-index={index}
      >
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
          {cluster.respostas.map((answer, answerIdx) => {
            const isCurrent = answer.playerId === currentPlayerId;
            return (
              <div
                key={answer.playerId}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border cursor-grab active:cursor-grabbing ${
                  isCurrent
                    ? 'bg-[#11161D] border-[#DDA15E] text-[#FEFAE0] ring-1 ring-[#DDA15E]'
                    : 'bg-[#11161D] border-[#2D3139] text-[#B0B0B0]'
                }`}
                draggable
                onDragStart={drag.onDragStart(index, answerIdx)}
                onTouchStart={(e) => handleTouchStart(e, answerIdx, answer)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: 'none' }}
              >
                <GripVertical className="w-4 h-4 text-[#606C38] cursor-grab opacity-50 hover:opacity-100" />
                <DogAvatar avatarId={answer.avatarId} size={20} />
                <span style={{ color: isCurrent ? answer.color : undefined }}>{answer.playerName}</span>
                <span className="text-[10px] text-[#DDA15E] font-mono">+{cluster.points} pts</span>
              </div>
            );
          })}
        </div>

        <div
          className={`drop-zone border-2 border-dashed border-[#2D3139] rounded-${compact ? 'lg' : 'xl'} p-3 min-h-[${compact ? '50px' : '60px'}]`}
          onDragOver={drag.onDragOver}
        >
          {cluster.respostas.length === 0 && (
            <p className="text-center text-[11px] text-[#606C38] italic">Arraste respostas aqui</p>
          )}
        </div>
      </div>

      {/* Global drag preview for touch */}
      <div
        ref={dragPreviewRef}
        className="fixed pointer-events-none z-[100] bg-[#05070A] border border-[#DDA15E] rounded-xl px-3 py-2 text-sm font-medium text-[#DDA15E] shadow-xl"
        style={{
          display: 'none',
          transform: 'translate(-50%, -50%)',
          maxWidth: '200px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      />
    </>
  );
};