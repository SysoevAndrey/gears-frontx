import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { cx } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { useDataGridContext } from '../../../services/core/data-grid-context';
import { readRecord } from '../drag-data';
import type { DataGridDragDropPluginApi } from '../drag-drop-types';
import styles from './data-grid-drag-drop.module.css';

interface DataGridDragDropContentProps {
  children?: ReactNode;
}

export function DataGridDragDropContent({ children }: DataGridDragDropContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const context = useDataGridContext();
  const { useDragDropStore, handleDrop } =
    context.plugins.getPlugin<DataGridDragDropPluginApi>('dragDrop')!;

  const isDragging = useDragDropStore((s) => s.isDragging);
  const isRootDropTarget = useDragDropStore((s) => s.isRootDropTarget);

  useEffect(() => {
    if (!contentRef.current) return;

    return combine(
      dropTargetForElements({
        element: contentRef.current,
        getData: () => ({ type: 'data-grid-root' }),
      }),
      monitorForElements({
        // A page can hold several grids with this plugin, and another grid's rows are drag
        // sources too: only a drag that began in this plugin instance is this one's to track.
        canMonitor: ({ source }) => source.data.pluginStore === useDragDropStore,
        onDragStart: ({ source }) => {
          const record = readRecord(source.data);
          if (!record) return;

          useDragDropStore.setState({ isDragging: true, draggedRecordId: record.id });
        },
        onDropTargetChange: ({ location }) => {
          const targets = location.current.dropTargets;
          const rowTarget = targets.find((t) => t.data.type === 'data-grid-row');
          const rootTarget = targets.find((t) => t.data.type === 'data-grid-root');
          const dropEdge = rowTarget ? extractClosestEdge(rowTarget.data) : null;
          const targetRecord = rowTarget ? readRecord(rowTarget.data) : undefined;

          useDragDropStore.setState({
            dropTargetRecordId: targetRecord?.id,
            dropEdge: dropEdge === 'top' || dropEdge === 'bottom' ? dropEdge : undefined,
            isRootDropTarget: !rowTarget && !!rootTarget,
          });
        },
        onDrop: ({ source, location }) => {
          const targets = location.current.dropTargets;
          const sourceRecord = readRecord(source.data);

          if (targets.length > 0 && sourceRecord) {
            const rowTarget = targets.find((t) => t.data.type === 'data-grid-row');
            handleDrop(sourceRecord, rowTarget ? readRecord(rowTarget.data) : undefined);
          }

          useDragDropStore.setState({
            isDragging: false,
            draggedRecordId: undefined,
            dropTargetRecordId: undefined,
            dropEdge: undefined,
            isRootDropTarget: false,
          });
        },
      }),
    );
  }, [useDragDropStore, handleDrop]);

  return (
    <div
      ref={contentRef}
      className={cx(styles.content, isDragging && isRootDropTarget && styles.contentRootDropping)}
    >
      {children}
    </div>
  );
}
