"use client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useEffect, useState } from "react";
import { GripVertical, Plus } from "lucide-react";
import { GuideIcon } from "./ui";
import type { Section } from "@stayguide/shared";

interface DndSortableSectionListProps {
  sections: Section[];
  onReorder: (sections: Section[]) => void;
  onAddSection: () => void;
  selectedId?: string;
  onSelectSection: (id: string) => void;
  tr: (key: string, params?: Record<string, any>) => string;
}

export function DndSortableSectionList({
  sections,
  onReorder,
  onAddSection,
  selectedId,
  onSelectSection,
  tr,
}: DndSortableSectionListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ariaLiveMessage, setAriaLiveMessage] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8,
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
    const section = sections.find((s) => s.id === event.active.id);
    if (section) {
      setAriaLiveMessage(
        tr("Picked up section {title}", { title: section.title }),
      );
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newSections = arrayMove(sections, oldIndex, newIndex);
        onReorder(newSections);

        const activeSection = sections.find((s) => s.id === active.id);
        const overSection = sections.find((s) => s.id === over.id);
        if (activeSection && overSection) {
          setAriaLiveMessage(
            tr("{moved} moved after {target}", {
              moved: activeSection.title,
              target: overSection.title,
            }),
          );
        }
      }
    } else {
      setAriaLiveMessage("");
    }
  }

  const activeSectionId = activeId;
  const itemIds = sections.map((s) => s.id);

  return (
    <>
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {ariaLiveMessage}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={itemIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="section-list-container">
            {sections.map((section) => (
              <DndSortableItem
                key={section.id}
                section={section}
                isActive={activeSectionId === section.id}
                isSelected={selectedId === section.id}
                onSelect={() => onSelectSection(section.id)}
                tr={tr}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeSectionId ? (
            <div className="dnd-overlay-item">
              {sections.find((s) => s.id === activeSectionId)?.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <button onClick={onAddSection} className="add-section-button">
        <Plus size={15} />
        {tr("Add section")}
      </button>
    </>
  );
}

interface DndSortableItemProps {
  section: Section;
  isActive: boolean;
  isSelected: boolean;
  onSelect: () => void;
  tr: (key: string) => string;
}

function DndSortableItem({
  section,
  isActive,
  isSelected,
  onSelect,
  tr,
}: DndSortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortableItem(section.id);

  return (
    <button
      ref={setNodeRef}
      onClick={onSelect}
      {...attributes}
      {...listeners}
      className={`sortable-section-item ${isSelected ? "active" : ""} ${isDragging ? "dragging" : ""}`}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      aria-pressed={isSelected}
      aria-label={tr("Edit {title}", { title: section.title })}
    >
      <div className="grip-handle" {...listeners}>
        <GripVertical size={12} />
      </div>
      <GuideIcon name={section.icon} size={15} />
      <span className="section-title">{section.title}</span>
    </button>
  );
}

// Re-export sortable item hook
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function useSortableItem(id: string) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return {
    attributes,
    listeners,
    setNodeRef,
    transform: CSS.Transform.toString(transform),
    transition,
    isDragging,
  };
}
