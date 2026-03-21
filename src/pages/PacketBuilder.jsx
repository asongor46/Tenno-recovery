import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import {
  PackageOpen,
  Search,
  FileText,
  GripVertical,
  Eye,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import BulkPacketGenerator from "@/components/packet/BulkPacketGenerator";

import RoleGuard from "@/components/rbac/RoleGuard";
import ProUpgradePrompt from "@/components/shared/ProUpgradePrompt";

export default function PacketBuilder() {
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });
  const { data: agentProfile } = useQuery({
    queryKey: ["agentProfile", currentUser?.email],
    queryFn: () => base44.entities.AgentProfile.filter({ email: currentUser.email }).then(r => r[0] || null),
    enabled: !!currentUser?.email,
  });
  const isPro = currentUser?.role === "admin" || agentProfile?.plan === "pro";
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelectedCases, setBulkSelectedCases] = useState([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  const { data: cases = [], isLoading: casesLoading } = useQuery({
    queryKey: ["cases-for-packet"],
    queryFn: () => base44.entities.Case.filter({ stage: "packet_ready" }, "-updated_date", 100),
  });

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ["documents", selectedCaseId],
    queryFn: () => base44.entities.Document.filter({ case_id: selectedCaseId }, "order"),
    enabled: !!selectedCaseId,
  });

  const selectedCase = cases.find(c => c.id === selectedCaseId);

  const filteredCases = cases.filter(c =>
    c.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.case_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const queryClient = useQueryClient();

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    const items = Array.from(documents);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    // Update order in database
    for (let i = 0; i < items.length; i++) {
      await base44.entities.Document.update(items[i].id, { order: i });
    }
    
    queryClient.invalidateQueries({ queryKey: ["documents", selectedCaseId] });
  };

  const requiredDocs = [
    { type: "agreement", label: "Signed Agreement" },
    { type: "claim_form", label: "Claim Form" },
    { type: "id_front", label: "ID (Front)" },
    { type: "id_back", label: "ID (Back)" },
    { type: "notary_page", label: "Notary Page" },
  ];

  const checkDocuments = () => {
    const docTypes = documents.map(d => d.category);
    return requiredDocs.map(req => ({
      ...req,
      present: docTypes.includes(req.type),
    }));
  };

  if (!isPro && agentProfile !== undefined) {
    return <ProUpgradePrompt feature="Packet Builder" onDismiss={() => window.history.back()} />;
  }

  return (
    <RoleGuard allowedRoles={["admin", "agent"]}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
            <PackageOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Packet Builder</h1>
            <p className="text-slate-500">Generate and organize filing packets</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={bulkMode ? "default" : "outline"}
            onClick={() => {
              setBulkMode(!bulkMode);
              setBulkSelectedCases([]);
            }}
          >
            <Layers className="w-4 h-4 mr-2" />
            {bulkMode ? "Exit Bulk Mode" : "Bulk Mode"}
          </Button>
          {bulkMode && bulkSelectedCases.length > 0 && (
            <Button
              onClick={() => setShowBulkDialog(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Generate {bulkSelectedCases.length} Packets
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Case Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Case</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {casesLoading ? (
                <p className="text-center text-slate-500 py-4">Loading...</p>
              ) : filteredCases.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No cases ready for packet</p>
              ) : (
                filteredCases.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      selectedCaseId === c.id && !bulkMode
                        ? "bg-emerald-500/10 border-emerald-500 border"
                        : "bg-slate-800/50 hover:bg-slate-700/50"
                    }`}
                  >
                    {bulkMode && (
                      <Checkbox
                        checked={bulkSelectedCases.includes(c.id)}
                        onCheckedChange={() => {
                          setBulkSelectedCases(prev =>
                            prev.includes(c.id)
                              ? prev.filter(id => id !== c.id)
                              : [...prev, c.id]
                          );
                        }}
                      />
                    )}
                    <button
                      onClick={() => !bulkMode && setSelectedCaseId(c.id)}
                      className="flex-1 text-left"
                    >
                      <p className="font-medium text-slate-900">{c.owner_name}</p>
                      <p className="text-sm text-slate-500">{c.case_number}</p>
                    </button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Document List */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {selectedCase ? `Documents for ${selectedCase.owner_name}` : "Select a case"}
            </CardTitle>
            {selectedCase && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    try {
                      const { data } = await base44.functions.invoke("generateFilledPacket", {
                        case_id: selectedCase.id
                      });
                      if (data.status === 'success') {
                        toast.success(`Generated ${data.forms_generated} forms for ${data.county}`);
                        queryClient.invalidateQueries({ queryKey: ["documents", selectedCase.id] });
                      }
                    } catch (error) {
                      toast.error("Error: " + error.message);
                    }
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Generate Forms
                </Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  <Download className="w-4 h-4 mr-2" /> Export PDF
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!selectedCase ? (
              <div className="text-center py-12 text-slate-500">
                <PackageOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Select a case to view and organize documents</p>
              </div>
            ) : docsLoading ? (
              <p className="text-center text-slate-500 py-8">Loading documents...</p>
            ) : (
              <>
                {/* Document Checklist */}
                <div className="mb-6 p-4 bg-slate-800/50 rounded-lg">
                  <h4 className="font-medium text-sm mb-3">Document Checklist</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {checkDocuments().map((doc) => (
                      <div
                        key={doc.type}
                        className={`flex items-center gap-2 text-sm ${
                          doc.present ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {doc.present ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        {doc.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Draggable Document List */}
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="documents">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2"
                      >
                        {documents.length === 0 ? (
                          <p className="text-center text-slate-500 py-8">No documents uploaded</p>
                        ) : (
                          documents.map((doc, index) => (
                            <Draggable key={doc.id} draggableId={doc.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`flex items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-lg ${
                                    snapshot.isDragging ? "shadow-lg" : ""
                                  }`}
                                >
                                  <div
                                    {...provided.dragHandleProps}
                                    className="text-slate-400 cursor-grab"
                                  >
                                    <GripVertical className="w-5 h-5" />
                                  </div>
                                  <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-slate-500" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{doc.name}</p>
                                    <p className="text-xs text-slate-500 capitalize">
                                      {doc.category.replace(/_/g, " ")}
                                    </p>
                                  </div>
                                  <Badge variant="secondary" className="text-xs">
                                    {index + 1}
                                  </Badge>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bulk Generator Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bulk Packet Generation</DialogTitle>
          </DialogHeader>
          <BulkPacketGenerator
            cases={cases.filter(c => bulkSelectedCases.includes(c.id))}
            onClose={() => {
              setShowBulkDialog(false);
              setBulkSelectedCases([]);
              setBulkMode(false);
              queryClient.invalidateQueries({ queryKey: ["documents"] });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
    </RoleGuard>
  );
}