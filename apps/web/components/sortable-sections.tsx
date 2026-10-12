"use client";
import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Section } from "@stayguide/shared";
import { SectionEditor } from "./section-editor";

interface SortableSectionProps {
  section: Section;
  onUpdate: (section: Section) => void;
  onDelete: () => void;
}

function SortableSection({ section, onUpdate, onDelete }: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="sortable-section">
      <SectionEditor
        section={section}
        onUpdate={onUpdate}
        onDelete={onDelete}
        isDragging={isDragging}
        dragHandle={
          <button
            type="button"
            className="drag-handle-button"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVertical size={16} />
          </button>
        }
      />
    </div>
  );
}

interface SortableSectionsProps {
  sections: Section[];
  onReorder: (sections: Section[]) => void;
  onUpdateSection: (section: Section) => void;
  onDeleteSection: (id: string) => void;
}

export function SortableSections({
  sections,
  onReorder,
  onUpdateSection,
  onDeleteSection,
}: SortableSectionsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);

      const reordered = arrayMove(sections, oldIndex, newIndex);
      onReorder(reordered);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sections.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="sortable-sections">
          {sections.map((section) => (
            <SortableSection
              key={section.id}
              section={section}
              onUpdate={onUpdateSection}
              onDelete={() => onDeleteSection(section.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
