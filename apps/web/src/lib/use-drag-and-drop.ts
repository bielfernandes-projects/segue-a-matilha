import { useCallback } from 'react';
import type { EditableCluster } from '../lib/cluster-utils';

export interface DragHandlers {
  onDragStart: (fromCluster: number, answerIdx: number) => React.DragEventHandler;
  onDragOver: React.DragEventHandler;
  onDropToCluster: (toCluster: number) => React.DragEventHandler;
  onDropToNewCluster: React.DragEventHandler;
}

export function useDragAndDrop(
  clusters: EditableCluster[],
  setClusters: React.Dispatch<React.SetStateAction<EditableCluster[]>>
): DragHandlers {
  // Native HTML5 Drag & Drop (desktop)
  const onDragStart = useCallback(
    (fromCluster: number, answerIdx: number) => (e: React.DragEvent) => {
      e.dataTransfer?.setData('text/plain', JSON.stringify({ fromCluster, answerIdx }));
      e.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent, toClusterIndex: number) => {
      e.preventDefault();
      const data = JSON.parse(e.dataTransfer?.getData('text/plain') || '{}');
      if (data.fromCluster >= 0 && data.answerIdx >= 0 && toClusterIndex >= 0) {
        setClusters((prev) => {
          const next = prev.map((c) => ({ ...c, respostas: [...c.respostas] }));
          const [moved] = next[data.fromCluster].respostas.splice(data.answerIdx, 1);
          next[toClusterIndex].respostas.push(moved);
          return next;
        });
      }
    },
    [setClusters]
  );

  const onDropToNewCluster = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const data = JSON.parse(e.dataTransfer?.getData('text/plain') || '{}');
      if (data.fromCluster >= 0 && data.answerIdx >= 0) {
        setClusters((prev) => {
          const next = prev.map((c) => ({ ...c, respostas: [...c.respostas] }));
          const newCluster: EditableCluster = {
            rotulo: '',
            respostas: [next[data.fromCluster].respostas[data.answerIdx]],
            points: 0,
            groupType: 'lobo',
          };
          next[data.fromCluster].respostas.splice(data.answerIdx, 1);
          return [...next, newCluster];
        });
      }
    },
    [setClusters]
  );

  const onDropToCluster = useCallback(
    (toCluster: number) => (e: React.DragEvent) => {
      e.preventDefault();
      const data = JSON.parse(e.dataTransfer?.getData('text/plain') || '{}');
      if (data.fromCluster >= 0 && data.answerIdx >= 0) {
        setClusters((prev) => {
          const next = prev.map((c) => ({ ...c, respostas: [...c.respostas] }));
          const [moved] = next[data.fromCluster].respostas.splice(data.answerIdx, 1);
          next[toCluster].respostas.push(moved);
          return next;
        });
      }
    },
    [setClusters]
  );

const dragHandlers = {
    onDragStart,
    onDragOver,
    onDropToCluster,
    onDropToNewCluster: onDropToNewCluster as React.DragEventHandler,
  };

return dragHandlers;
}