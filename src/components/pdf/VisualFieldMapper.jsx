import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ZoomIn,
  ZoomOut,
  Trash2,
  Save,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

/**
 * Visual Field Mapper - Interactive PDF field mapping
 * Click on PDF to create field mappings to case data
 */
export default function VisualFieldMapper({ 
  pdfUrl, 
  initialMappings = {},
  onSave
}) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [mappings, setMappings] = useState(initialMappings);
  const [fieldMarkers, setFieldMarkers] = useState([]);
  const [editingField, setEditingField] = useState(null);

  // Available case fields for mapping
  const caseFields = [
    { value: "owner_name", label: "Owner Name" },
    { value: "property_address", label: "Property Address" },
    { value: "parcel_number", label: "Parcel Number" },
    { value: "case_number", label: "Case Number" },
    { value: "surplus_amount", label: "Surplus Amount" },
    { value: "sale_date", label: "Sale Date" },
    { value: "sale_amount", label: "Sale Amount" },
    { value: "judgment_amount", label: "Judgment Amount" },
    { value: "county", label: "County" },
    { value: "state", label: "State" },
    { value: "owner_email", label: "Owner Email" },
    { value: "owner_phone", label: "Owner Phone" },
    { value: "owner_address", label: "Owner Mailing Address" },
  ];

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handlePageClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const newMarker = {
      id: Date.now(),
      page: pageNumber,
      x,
      y,
      pdfFieldName: `field_${fieldMarkers.length + 1}`,
      caseField: "",
    };

    setFieldMarkers([...fieldMarkers, newMarker]);
    setEditingField(newMarker.id);
  };

  const updateMarker = (id, updates) => {
    setFieldMarkers(fieldMarkers.map(m => 
      m.id === id ? { ...m, ...updates } : m
    ));
  };

  const removeMarker = (id) => {
    setFieldMarkers(fieldMarkers.filter(m => m.id !== id));
    if (editingField === id) setEditingField(null);
  };

  const handleSave = () => {
    const newMappings = {};
    fieldMarkers.forEach(marker => {
      if (marker.pdfFieldName && marker.caseField) {
        newMappings[marker.pdfFieldName] = marker.caseField;
      }
    });

    onSave({
      field_mappings: newMappings,
      field_locations: fieldMarkers.map(m => ({
        pdf_field: m.pdfFieldName,
        page: m.page,
        x: m.x,
        y: m.y,
      })),
    });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* PDF Viewer */}
      <div className="lg:col-span-2 space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageNumber(p => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium">
              Page {pageNumber} of {numPages || '?'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScale(s => Math.min(2.5, s + 0.2))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <MapPin className="w-3 h-3 mr-1" />
          Click on the PDF where you want to map a field
        </Badge>

        {/* PDF Canvas */}
        <div className="border rounded-lg overflow-auto bg-slate-100 p-4" style={{ maxHeight: '70vh' }}>
          <div className="flex justify-center">
            <div 
              onClick={handlePageClick}
              className="relative cursor-crosshair"
            >
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>

              {/* Field Markers */}
              {fieldMarkers
                .filter(m => m.page === pageNumber)
                .map((marker) => (
                  <div
                    key={marker.id}
                    className={`absolute rounded cursor-pointer transition-all ${
                      editingField === marker.id
                        ? 'bg-emerald-500 bg-opacity-40 border-2 border-emerald-600'
                        : 'bg-blue-500 bg-opacity-30 border-2 border-blue-600'
                    }`}
                    style={{
                      left: `${marker.x}%`,
                      top: `${marker.y}%`,
                      width: '120px',
                      height: '35px',
                      transform: 'translate(-50%, -50%)',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingField(marker.id);
                    }}
                  >
                    <div className="text-xs font-medium px-2 py-1 truncate">
                      {marker.caseField ? (
                        <span className="text-blue-900">
                          {caseFields.find(f => f.value === marker.caseField)?.label || marker.caseField}
                        </span>
                      ) : (
                        <span className="text-slate-600 italic">Click to map</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Field Editor Panel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Field Mappings ({fieldMarkers.length})</h3>
          <Button
            onClick={handleSave}
            disabled={fieldMarkers.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
            size="sm"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Mappings
          </Button>
        </div>

        {/* Selected Field Editor */}
        {editingField && (
          <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-lg">
            <p className="text-sm font-semibold text-emerald-900 mb-3">Editing Selected Field</p>
            
            {(() => {
              const marker = fieldMarkers.find(m => m.id === editingField);
              if (!marker) return null;

              return (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">PDF Field Name</label>
                    <Input
                      value={marker.pdfFieldName}
                      onChange={(e) => updateMarker(marker.id, { pdfFieldName: e.target.value })}
                      placeholder="e.g., owner_name_field"
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 block mb-1">Map to Case Field</label>
                    <Select
                      value={marker.caseField}
                      onValueChange={(value) => updateMarker(marker.id, { caseField: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select case field" />
                      </SelectTrigger>
                      <SelectContent>
                        {caseFields.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeMarker(marker.id)}
                    className="w-full text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    Remove Field
                  </Button>
                </div>
              );
            })()}
          </div>
        )}

        {/* All Mappings List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {fieldMarkers.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No fields mapped yet</p>
              <p className="text-xs mt-1">Click on the PDF to start mapping</p>
            </div>
          ) : (
            fieldMarkers.map((marker) => (
              <div
                key={marker.id}
                onClick={() => setEditingField(marker.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  editingField === marker.id
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {marker.pdfFieldName}
                    </p>
                    {marker.caseField ? (
                      <p className="text-xs text-emerald-600 mt-1">
                        → {caseFields.find(f => f.value === marker.caseField)?.label}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600 mt-1">⚠ Not mapped</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      Page {marker.page}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMarker(marker.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}