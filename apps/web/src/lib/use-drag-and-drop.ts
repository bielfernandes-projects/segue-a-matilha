import { useCallback } from 'react';
import type { EditableCluster } from './cluster-utils';

export interface DragHandlers {
  onDragStart: (fromCluster: number, answerIdx: number) => React.DragEventHandler;
  onDragOver: React.DragEventHandler;
  onDropToCluster: (toCluster: number) => React.DragEventHandler;
  onDropToNewCluster: () => React.DragEventHandler;
}

export function useDragAndDrop(
  clusters: EditableCluster[],
  setClusters: React.Dispatch<React.SetStateAction<EditableCluster[]>>
): DragHandlers {
  const onDragStart = useCallback(
    (fromCluster: number, answerIdx: number): React.DragEventHandler =>
      (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ fromCluster, answerIdx }));
        e.dataTransfer.effectAllowed = 'move';
      },
    []
  );

  const onDragOver = useCallback<React.DragEventHandler>((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDropToCluster = useCallback(
    (toCluster: number): React.DragEventHandler =>
      (e) => {
        e.preventDefault();
        try {
          const data = JSON.parse(e.dataTransfer.getData('text/plain'));
          if (data.fromCluster !== toCluster) {
            setClusters((prev) => {
              const next = prev.map((c) => ({ ...c, respostas: [...c.respostas] }));
              const [moved] = next[data.fromCluster].respostas.splice(data.answerIdx, 1);
              next[toCluster].respostas.push(moved);
              return next;
            });
          }
        } catch {
          // ignore invalid drag data
        }
      },
    [setClusters]
  );

  const onDropToNewCluster = useCallback(
    (): React.DragEventHandler =>
      (e) => {
        e.preventDefault();
        try {
          const data = JSON.parse(e.dataTransfer.getData('text/plain'));
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
        } catch {
          // ignore invalid drag data
        }
      },
    [setClusters]
  );

  return { onDragStart, onDragOver, onDropToCluster, onDropToNewCluster };
}
