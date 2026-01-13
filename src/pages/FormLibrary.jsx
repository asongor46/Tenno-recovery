import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Upload, Search, CheckCircle, XCircle, FileCheck, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import UniversalDocumentUploader from '@/components/cases/UniversalDocumentUploader';
import LoadingState from '@/components/shared/LoadingState';

export default function FormLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploader, setShowUploader] = useState(false);

  const { data: forms = [], isLoading, refetch } = useQuery({
    queryKey: ['formLibrary'],
    queryFn: () => base44.entities.FormLibrary.list('-created_date', 200)
  });

  const filteredForms = forms.filter(f =>
    f.form_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.county_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.form_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formTypeColors = {
    claim_form: 'bg-blue-100 text-blue-700',
    affidavit: 'bg-purple-100 text-purple-700',
    assignment: 'bg-green-100 text-green-700',
    cover_sheet: 'bg-yellow-100 text-yellow-700',
    w9: 'bg-orange-100 text-orange-700',
    other: 'bg-slate-100 text-slate-700'
  };

  if (isLoading) {
    return <LoadingState message="Loading form library..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Form Library</h1>
          <p className="text-slate-400 mt-1">{filteredForms.length} forms in library</p>
        </div>
        <Button 
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setShowUploader(true)}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Form
        </Button>
      </div>

      {/* Search */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search forms by name, county, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-white">{forms.length}</div>
            <div className="text-sm text-slate-400">Total Forms</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-white">
              {forms.filter(f => f.is_fillable_pdf).length}
            </div>
            <div className="text-sm text-slate-400">Fillable PDFs</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-white">
              {new Set(forms.map(f => f.county_name)).size}
            </div>
            <div className="text-sm text-slate-400">Counties</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-white">
              {forms.reduce((sum, f) => sum + (f.times_used || 0), 0)}
            </div>
            <div className="text-sm text-slate-400">Times Used</div>
          </CardContent>
        </Card>
      </div>

      {/* Forms Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Forms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Form Name</TableHead>
                  <TableHead className="text-slate-300">County</TableHead>
                  <TableHead className="text-slate-300">Type</TableHead>
                  <TableHead className="text-slate-300 text-center">Fillable</TableHead>
                  <TableHead className="text-slate-300 text-center">Notary</TableHead>
                  <TableHead className="text-slate-300 text-center">Pages</TableHead>
                  <TableHead className="text-slate-300 text-center">Fields</TableHead>
                  <TableHead className="text-slate-300 text-right">Used</TableHead>
                  <TableHead className="text-slate-300"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredForms.map((form) => (
                  <TableRow key={form.id} className="border-slate-700 hover:bg-slate-700/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-white">{form.form_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {form.county_name}
                      {form.state && `, ${form.state}`}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${formTypeColors[form.form_type]} border-0 capitalize`}>
                        {form.form_type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {form.is_fillable_pdf ? (
                        <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-slate-500 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {form.requires_notary ? (
                        <FileCheck className="w-5 h-5 text-purple-400 mx-auto" />
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-slate-300">
                      {form.page_count || '—'}
                    </TableCell>
                    <TableCell className="text-center text-slate-300">
                      {form.detected_fields?.length || 0}
                    </TableCell>
                    <TableCell className="text-right text-slate-300">
                      {form.times_used || 0}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(form.blank_template_url, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploader} onOpenChange={setShowUploader}>
        <DialogContent className="max-w-2xl bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Upload Form to Library</DialogTitle>
          </DialogHeader>
          <UniversalDocumentUploader
            onComplete={(result) => {
              setShowUploader(false);
              refetch();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}