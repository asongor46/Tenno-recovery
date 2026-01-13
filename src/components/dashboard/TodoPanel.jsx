import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import LoadingState from "@/components/shared/LoadingState";

const priorityColors = {
  low: "border-slate-200 bg-slate-50",
  medium: "border-blue-200 bg-blue-50",
  high: "border-amber-200 bg-amber-50",
  urgent: "border-red-200 bg-red-50",
};

export default function TodoPanel({ todos, isLoading }) {
  const queryClient = useQueryClient();

  const handleComplete = async (todoId) => {
    try {
      await base44.entities.Todo.update(todoId, {
        is_completed: true,
        completed_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast.success("Task completed");
    } catch (error) {
      console.error("Error completing task:", error);
      toast.error("Failed to complete task");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">To-Do</h2>
        <LoadingState message="Loading tasks..." />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="bg-white rounded-2xl border border-slate-100 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">To-Do</h2>
        <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700">
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {todos?.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">All tasks completed!</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {todos?.map((todo) => (
            <div
              key={todo.id}
              className={`flex items-start gap-3 p-3 rounded-xl border ${priorityColors[todo.priority]} transition-all hover:shadow-sm`}
            >
              <button
                onClick={() => handleComplete(todo.id)}
                className="flex-shrink-0 mt-0.5"
              >
                {todo.is_completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300 hover:text-emerald-500 transition-colors" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${todo.is_completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                  {todo.title}
                </p>
                {todo.description && (
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{todo.description}</p>
                )}
                {todo.due_date && (
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">
                      {format(new Date(todo.due_date), "MMM d")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}