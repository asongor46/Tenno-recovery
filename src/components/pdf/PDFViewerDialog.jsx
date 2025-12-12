import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ZoomIn,
  ZoomOut,
  Download,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileText,
  Edit3,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

/**
 * Advanced PDF Viewer Dialog
 * Features: View, zoom, navigate, annotate, view form fields
 */
export default function PDFViewerDialog({ 
  open, 
  onClose, 
  pdfUrl, 
  title = "PDF Viewer",
  showFormFields = false,
  onFieldClick = null,
  annotations = []
}) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [formFields, setFormFields] = useState([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const changePage = (offset) => {
    setPageNumber(prevPageNumber => {
      const newPage = prevPageNumber + offset;
      return Math.min(Math.max(1, newPage), numPages);
    });
  };

  const changeScale = (delta) => {
    setScale(prevScale => Math.min(Math.max(0.5, prevScale + delta), 3.0));
  };

  const handlePageClick = (event) => {
    if (!showFormFields || !onFieldClick) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    onFieldClick({ page: pageNumber, x, y });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="view" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="view">View PDF</TabsTrigger>
            {showFormFields && (
              <TabsTrigger value="fields">Form Fields ({formFields.length})</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="view" className="flex-1 flex flex-col overflow-hidden mt-4">
            {/* Controls */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changePage(-1)}
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
                  onClick={() => changePage(1)}
                  disabled={pageNumber >= numPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changeScale(-0.2)}
                  disabled={scale <= 0.5}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium w-16 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changeScale(0.2)}
                  disabled={scale >= 3.0}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {showFormFields && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <Edit3 className="w-3 h-3 mr-1" />
                    Click to map fields
                  </Badge>
                )}
                <a href={pdfUrl} download target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </a>
              </div>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 overflow-auto bg-slate-100 rounded-lg p-4">
              <div className="flex justify-center">
                {pdfUrl ? (
                  <div 
                    onClick={handlePageClick}
                    className={`relative ${showFormFields ? 'cursor-crosshair' : ''}`}
                  >
                    <Document
                      file={pdfUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      loading={
                        <div className="flex items-center justify-center h-96">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                        </div>
                      }
                      error={
                        <div className="text-center text-red-600 p-8">
                          <p className="font-medium">Failed to load PDF</p>
                          <p className="text-sm mt-2">Please check the URL and try again</p>
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

                    {/* Show annotation markers */}
                    {annotations
                      .filter(a => a.page === pageNumber)
                      .map((annotation, idx) => (
                        <div
                          key={idx}
                          className="absolute bg-blue-500 bg-opacity-30 border-2 border-blue-600 rounded cursor-pointer hover:bg-opacity-50"
                          style={{
                            left: `${annotation.x}%`,
                            top: `${annotation.y}%`,
                            width: '100px',
                            height: '30px',
                            transform: 'translate(-50%, -50%)',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAnnotation(annotation);
                          }}
                          title={annotation.label || 'Mapped field'}
                        >
                          {annotation.label && (
                            <span className="text-xs text-blue-900 font-medium px-1">
                              {annotation.label}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center text-slate-500 py-12">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No PDF loaded</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {showFormFields && (
            <TabsContent value="fields" className="flex-1 overflow-auto mt-4">
              <div className="space-y-2">
                {formFields.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>Click on the PDF to map form fields</p>
                  </div>
                ) : (
                  formFields.map((field, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{field.name}</p>
                          <p className="text-xs text-slate-500">
                            Page {field.page} • Position: ({Math.round(field.x)}, {Math.round(field.y)})
                          </p>
                        </div>
                        <Badge variant="outline">{field.type || 'text'}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Selected Annotation Info */}
        {selectedAnnotation && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-blue-900">{selectedAnnotation.label}</p>
                <p className="text-xs text-blue-700 mt-1">
                  Mapped to: <span className="font-mono">{selectedAnnotation.caseField}</span>
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAnnotation(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}