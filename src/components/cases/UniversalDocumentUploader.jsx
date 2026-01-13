import React, { useState, useCallback } from 'react';
import { Upload, FileText, Brain, CheckCircle, AlertTriangle, Loader2, FileCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';
import { useStandardToast } from '@/components/shared/useStandardToast';

export default function UniversalDocumentUploader({ onComplete }) {
  const [uploadState, setUploadState] = useState('idle');
  const [file, setFile] = useState(null);
  const [classification, setClassification] = useState(null);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const toast = useStandardToast();

  const handleFileSelect = useCallback((e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processFile(selectedFile);
    }
  }, []);

  const processFile = async (file) => {
    try {
      setUploadState('uploading');
      setProgress(20);

      // Step 1: Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({
        file,
        public: true
      });
      
      setProgress(40);
      setUploadState('classifying');

      // Step 2: Classify document
      const { data: classResult } = await base44.functions.invoke('classifyDocument', {
        file_url,
        filename: file.name
      });

      setClassification(classResult);
      setProgress(60);
      setUploadState('processing');

      // Step 3: Route to appropriate handler
      const processResult = await routeDocument(file_url, classResult);
      
      setResult(processResult);
      setProgress(100);
      setUploadState('complete');

      toast.success(`Document processed: ${classResult.classification}`);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadState('error');
      toast.error('Failed to process document: ' + error.message);
    }
  };

  const routeDocument = async (file_url, classResult) => {
    const { classification, details } = classResult;

    switch (classification) {
      case 'SURPLUS_LIST':
        toast.info('Surplus list detected - use PDF Case Builder');
        return { 
          action: 'redirect_to_pdf_builder',
          file_url,
          message: 'This appears to be a surplus list. Use the PDF Case Builder to extract cases.'
        };

      case 'CLAIM_FORM':
        const { data: formData } = await base44.functions.invoke('analyzeAndStoreForm', {
          file_url,
          county_hint: details.county,
          state_hint: details.state
        });
        
        return {
          action: 'form_added',
          form_id: formData.form_id,
          county: details.county,
          message: `Added ${formData.form_analysis.form_name} to form library`
        };

      case 'FILING_INSTRUCTIONS':
        return {
          action: 'extract_county_intel',
          file_url,
          county: details.county,
          message: 'Filing instructions detected - county intelligence will be extracted'
        };

      case 'PROPERTY_RECORD':
      case 'CASE_DOCUMENT':
        return {
          action: 'attach_to_case',
          file_url,
          message: 'Document ready to attach to a case'
        };

      default:
        return {
          action: 'manual_review',
          file_url,
          message: 'Document classification uncertain - manual review recommended'
        };
    }
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete(result);
    }
    // Reset
    setFile(null);
    setClassification(null);
    setResult(null);
    setUploadState('idle');
    setProgress(0);
  };

  const getStateIcon = () => {
    switch (uploadState) {
      case 'uploading': return <Upload className="w-5 h-5 animate-bounce" />;
      case 'classifying': return <Brain className="w-5 h-5 animate-pulse" />;
      case 'processing': return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'complete': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getStateMessage = () => {
    switch (uploadState) {
      case 'uploading': return 'Uploading file...';
      case 'classifying': return 'Analyzing document type...';
      case 'processing': return 'Processing document...';
      case 'complete': return 'Processing complete!';
      case 'error': return 'Error processing document';
      default: return 'Ready to upload';
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          {getStateIcon()}
          Intelligent Document Upload
        </CardTitle>
        <CardDescription className="text-slate-400">
          Upload any document - the system will automatically classify and process it
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Zone */}
        {uploadState === 'idle' && (
          <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-emerald-500 transition-colors">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="text-lg font-medium text-white mb-2">
                Drop a file or click to upload
              </p>
              <p className="text-sm text-slate-400">
                PDF, Image, or Screenshot
              </p>
            </label>
          </div>
        )}

        {/* Progress */}
        {uploadState !== 'idle' && uploadState !== 'complete' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">{getStateMessage()}</span>
              <span className="text-slate-400">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Classification Result */}
        {classification && (
          <div className="bg-slate-900 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">Document Type:</span>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                {classification.classification}
              </Badge>
            </div>
            
            {classification.details.county && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">County:</span>
                <span className="text-sm text-white">
                  {classification.details.county}
                  {classification.details.state && `, ${classification.details.state}`}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Confidence:</span>
              <span className="text-sm text-white">
                {Math.round(classification.confidence * 100)}%
              </span>
            </div>

            {classification.details.indicators?.length > 0 && (
              <div className="pt-2 border-t border-slate-700">
                <span className="text-xs text-slate-500">Detection Indicators:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {classification.details.indicators.slice(0, 3).map((indicator, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-slate-800 text-slate-300 border-slate-600">
                      {indicator}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Processing Result */}
        {result && uploadState === 'complete' && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileCheck className="w-5 h-5 text-emerald-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-emerald-300 mb-1">
                  {result.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
                <p className="text-sm text-emerald-400">
                  {result.message}
                </p>
              </div>
            </div>

            {result.action === 'form_added' && (
              <div className="mt-3 pt-3 border-t border-emerald-500/20">
                <Button 
                  size="sm" 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleComplete}
                >
                  View Form Library
                </Button>
              </div>
            )}

            {result.action === 'redirect_to_pdf_builder' && (
              <div className="mt-3 pt-3 border-t border-emerald-500/20">
                <Button 
                  size="sm" 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    if (onComplete) {
                      onComplete({ action: 'open_pdf_builder', file_url: result.file_url });
                    }
                  }}
                >
                  Open PDF Case Builder
                </Button>
              </div>
            )}

            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-3 text-slate-400"
              onClick={() => {
                setUploadState('idle');
                setFile(null);
                setClassification(null);
                setResult(null);
              }}
            >
              Upload Another Document
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}