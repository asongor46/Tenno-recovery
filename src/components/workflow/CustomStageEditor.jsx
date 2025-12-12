import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Plus, Trash2, Save, X } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useStandardToast } from "@/components/shared/useStandardToast";

const defaultStages = [
  { key: "imported", label: "Imported", color: "slate" },
  { key: "agreement_signed", label: "Agreement Signed", color: "blue" },
  { key: "info_completed", label: "Info Completed", color: "indigo" },
  { key: "notary_completed", label: "Notary Completed", color: "purple" },
  { key: "packet_ready", label: "Packet Ready", color: "amber" },
  { key: "filed", label: "Filed", color: "emerald" },
  { key: "approved", label: "Approved", color: "green" },
  { key: "paid", label: "Paid", color: "teal" },
  { key: "closed", label: "Closed", color: "slate" },
];

export default function CustomStageEditor({ onSave }) {
  const [stages, setStages] = useState(defaultStages);
  const [newStage, setNewStage] = useState({ key: "", label: "", color: "blue" });
  const toast = useStandardToast();

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(stages);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setStages(items);
  };

  const addStage = () => {
    if (!newStage.key || !newStage.label) {
      toast.warning("Please enter both key and label");
      return;
    }
    setStages([...stages, newStage]);
    setNewStage({ key: "", label: "", color: "blue" });
  };

  const removeStage = (key) => {
    setStages(stages.filter(s => s.key !== key));
  };

  const handleSave = () => {
    onSave(stages);
    toast.success("Workflow stages saved");
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2">Workflow Stages</h3>
        <p className="text-sm text-slate-500">Drag to reorder, customize labels and colors</p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="stages">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
              {stages.map((stage, index) => (
                <Draggable key={stage.key} draggableId={stage.key} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="flex items-center gap-3 p-3 bg-white border rounded-lg"
                    >
                      <div {...provided.dragHandleProps}>
                        <GripVertical className="w-4 h-4 text-slate-400" />
                      </div>
                      <Badge className={`bg-${stage.color}-100 text-${stage.color}-700 border-0`}>
                        {stage.label}
                      </Badge>
                      <code className="text-xs text-slate-500 flex-1">{stage.key}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStage(stage.key)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="border-t pt-4">
        <p className="text-sm font-medium mb-3">Add New Stage</p>
        <div className="flex gap-2">
          <Input
            placeholder="Stage key (e.g., under_review)"
            value={newStage.key}
            onChange={(e) => setNewStage({ ...newStage, key: e.target.value })}
            className="flex-1"
          />
          <Input
            placeholder="Display label"
            value={newStage.label}
            onChange={(e) => setNewStage({ ...newStage, label: e.target.value })}
            className="flex-1"
          />
          <Button onClick={addStage}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-700">
        <Save className="w-4 h-4 mr-2" />
        Save Workflow Configuration
      </Button>
    </div>
  );
}