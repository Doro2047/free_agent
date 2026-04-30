import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from 'react';

export interface DragItem {
  id: string;
  index: number;
  data?: Record<string, unknown>;
}

export interface DragDropContextValue {
  activeId: string | null;
  activeIndex: number | null;
  activeItem: DragItem | null;
  items: DragItem[];
  overId: string | null;
  overIndex: number | null;
  direction: 'horizontal' | 'vertical' | null;
  registerItem: (item: DragItem) => void;
  unregisterItem: (id: string) => void;
  startDrag: (item: DragItem) => void;
  endDrag: () => void;
  setOverId: (id: string | null, index: number) => void;
  setDirection: (direction: 'horizontal' | 'vertical') => void;
  moveItem: (fromIndex: number, toIndex: number) => void;
}

const DragDropContext = createContext<DragDropContextValue | null>(null);

export function useDragDropContext() {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('DragDrop components must be used within DragDropProvider');
  }
  return context;
}

export interface DragDropProviderProps {
  children: ReactNode;
  onDragEnd?: (fromIndex: number, toIndex: number) => void;
}

export function DragDropProvider({ children, onDragEnd }: DragDropProviderProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [activeItem, setActiveItem] = useState<DragItem | null>(null);
  const [items, setItems] = useState<DragItem[]>([]);
  const [overId, setOverId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<'horizontal' | 'vertical' | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const registerItem = useCallback((item: DragItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev;
      return [...prev, item].sort((a, b) => a.index - b.index);
    });
  }, []);

  const unregisterItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const startDrag = useCallback((item: DragItem) => {
    setActiveId(item.id);
    setActiveIndex(item.index);
    setActiveItem(item);
  }, []);

  const endDrag = useCallback(() => {
    if (activeIndex !== null && overIndex !== null && activeIndex !== overIndex) {
      onDragEnd?.(activeIndex, overIndex);
    }
    setActiveId(null);
    setActiveIndex(null);
    setActiveItem(null);
    setOverId(null);
    setOverIndex(null);
    setDirection(null);
  }, [activeIndex, overIndex, onDragEnd]);

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    setItems(prev => {
      const newItems = [...prev];
      const [removed] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, removed);
      return newItems.map((item, idx) => ({ ...item, index: idx }));
    });
  }, []);

  const value: DragDropContextValue = {
    activeId,
    activeIndex,
    activeItem,
    items,
    overId,
    overIndex,
    direction,
    registerItem,
    unregisterItem,
    startDrag,
    endDrag,
    setOverId: (id, index) => {
      setOverId(id);
      setOverIndex(index);
    },
    setDirection,
    moveItem,
  };

  return (
    <DragDropContext.Provider value={value}>
      {children}
    </DragDropContext.Provider>
  );
}

export interface DraggableProps {
  id: string;
  index: number;
  children: (props: {
    dragHandleProps: Record<string, unknown>;
    draggableProps: Record<string, unknown>;
    isDragging: boolean;
    isOver: boolean;
    transform: string | null;
  }) => ReactNode;
  data?: Record<string, unknown>;
  disabled?: boolean;
}

export function Draggable({ id, index, children, data, disabled = false }: DraggableProps) {
  const { activeId, overId, registerItem, unregisterItem, startDrag, endDrag, setOverId, direction } = useDragDropContext();
  const dragRef = useRef<HTMLDivElement>(null);
  const isDragging = activeId === id;
  const isOver = overId === id;

  useEffect(() => {
    if (!disabled) {
      registerItem({ id, index, data });
    }
    return () => unregisterItem(id);
  }, [id, index, data, disabled, registerItem, unregisterItem]);

  useEffect(() => {
    if (!disabled && isDragging && overId && overIndex !== null) {
      const items = itemsRef.current;
      const fromIndex = items.findIndex(i => i.id === id);
      const toIndex = items.findIndex(i => i.id === overId);
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        const newItems = [...items];
        const [removed] = newItems.splice(fromIndex, 1);
        newItems.splice(toIndex, 0, removed);
        registerItem({ id, index: toIndex, data });
      }
    }
  }, [isDragging, overId, overIndex, id, data, disabled, registerItem]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    startDrag({ id, index, data });
  }, [disabled, id, index, data, startDrag]);

  const handlePointerUp = useCallback(() => {
    if (disabled) return;
    endDrag();
  }, [disabled, endDrag]);

  useEffect(() => {
    if (isDragging) {
      const handlePointerMove = (e: PointerEvent) => {
        if (!dragRef.current) return;
        const rect = dragRef.current.getBoundingClientRect();
        const parentRect = dragRef.current.parentElement?.getBoundingClientRect();
        if (!parentRect) return;
        
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const children = Array.from(dragRef.current.parentElement?.children || []) as HTMLElement[];
        let targetId: string | null = null;
        let targetIndex: number | null = null;
        
        children.forEach((child, idx) => {
          if (child === dragRef.current) return;
          const childRect = child.getBoundingClientRect();
          if (direction === 'horizontal') {
            if (e.clientX >= childRect.left && e.clientX <= childRect.right) {
              targetId = child.getAttribute('data-draggable-id');
              targetIndex = parseInt(child.getAttribute('data-draggable-index') || '0', 10);
            }
          } else {
            if (e.clientY >= childRect.top && e.clientY <= childRect.bottom) {
              targetId = child.getAttribute('data-draggable-id');
              targetIndex = parseInt(child.getAttribute('data-draggable-index') || '0', 10);
            }
          }
        });
        
        if (targetId) {
          setOverId(targetId, targetIndex);
        }
      };
      
      const handleGlobalPointerUp = () => {
        endDrag();
      };
      
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handleGlobalPointerUp);
      
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handleGlobalPointerUp);
      };
    }
  }, [isDragging, direction, endDrag, setOverId]);

  const transform = isDragging ? 'scale(1.02)' : null;

  return (
    <div
      ref={dragRef}
      data-draggable-id={id}
      data-draggable-index={index}
      {...(isDragging ? { 'data-dragging': true } : {})}
      {...(isOver ? { 'data-over': true } : {})}
    >
      {children({
        dragHandleProps: {
          onPointerDown: handlePointerDown,
          onPointerUp: handlePointerUp,
          style: { cursor: disabled ? 'not-allowed' : 'grab' },
        },
        draggableProps: {
          style: {
            opacity: isDragging ? 0.5 : 1,
            transition: isDragging ? 'none' : 'transform 200ms ease',
          },
        },
        isDragging,
        isOver,
        transform,
      })}
    </div>
  );
}

export interface DroppableProps {
  id: string;
  children: (props: { isOver: boolean }) => ReactNode;
  direction?: 'horizontal' | 'vertical';
}

export function Droppable({ id, children, direction = 'vertical' }: DroppableProps) {
  const { overId, setDirection } = useDragDropContext();
  const isOver = overId === id;

  useEffect(() => {
    setDirection(direction);
  }, [direction, setDirection]);

  return (
    <div data-droppable-id={id}>
      {children({ isOver })}
    </div>
  );
}

export interface SortableListProps<T> {
  items: T[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  renderItem: (item: T, index: number, helpers: {
    dragHandleProps: Record<string, unknown>;
    draggableProps: Record<string, unknown>;
    isDragging: boolean;
    isOver: boolean;
  }) => ReactNode;
  getItemId: (item: T) => string;
  direction?: 'horizontal' | 'vertical';
  className?: string;
}

export function SortableList<T>({
  items,
  onReorder,
  renderItem,
  getItemId,
  direction = 'vertical',
  className,
}: SortableListProps<T>) {
  return (
    <DragDropProvider onDragEnd={onReorder}>
      <Droppable id="sortable-list" direction={direction}>
        {() => (
          <div className={className} style={{ display: direction === 'horizontal' ? 'flex' : 'block' }}>
            {items.map((item, index) => (
              <Draggable
                key={getItemId(item)}
                id={getItemId(item)}
                index={index}
                data={{ item }}
              >
                {(helpers) => renderItem(item, index, helpers)}
              </Draggable>
            ))}
          </div>
        )}
      </Droppable>
    </DragDropProvider>
  );
}

export const DragDrop = {
  Provider: DragDropProvider,
  Draggable,
  Droppable,
  SortableList,
};
