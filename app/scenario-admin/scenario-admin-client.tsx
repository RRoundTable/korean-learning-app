"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Archive,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Users,
  Trophy,
  Zap,
  Settings
} from 'lucide-react';
import { ScenarioListResponse, ScenarioResponse } from '@/lib/types/admin';
import { ScenarioForm } from './components/scenario-form';
import { StatusBadge } from './components/status-badge';

interface ScenarioAdminClientProps {
  initialData: ScenarioListResponse;
}

export function ScenarioAdminClient({ initialData }: ScenarioAdminClientProps) {
  const [scenarios, setScenarios] = useState(initialData?.scenarios || []);
  const [pagination, setPagination] = useState(initialData?.pagination || { page: 1, limit: 20, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<ScenarioResponse | null>(null);

  // Refresh data on component mount to ensure we have the latest data
  useEffect(() => {
    fetchScenarios(1, '', 'all');
  }, []);

  // Fetch scenarios with current filters
  const fetchScenarios = async (page = 1, search = searchTerm, status = statusFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(status !== 'all' && { status }),
      });

      const response = await fetch(`/api/admin/scenarios?${params}`);
      if (!response.ok) throw new Error('Failed to fetch scenarios');
      
      const data = await response.json();
      setScenarios(data.scenarios);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    fetchScenarios(1, value, statusFilter);
  };

  // Handle status filter
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    fetchScenarios(1, searchTerm, status);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    fetchScenarios(page, searchTerm, statusFilter);
  };

  // Handle scenario selection
  const handleScenarioSelect = (scenarioId: string) => {
    setSelectedScenarios(prev => 
      prev.includes(scenarioId) 
        ? prev.filter(id => id !== scenarioId)
        : [...prev, scenarioId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedScenarios.length === scenarios?.length) {
      setSelectedScenarios([]);
    } else {
      setSelectedScenarios(scenarios?.map(s => s.id) || []);
    }
  };

  // Handle status update
  const handleStatusUpdate = async (scenarioId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/scenarios/${scenarioId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      // Get the updated scenario data from the response
      const updatedScenario = await response.json();
      
      // Update local state with the actual server response
      setScenarios(prev => prev.map(s => 
        s.id === scenarioId ? { ...s, status: updatedScenario.status } : s
      ));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Handle delete
  const handleDelete = async (scenarioId: string) => {
    try {
      const response = await fetch(`/api/admin/scenarios/${scenarioId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete scenario');

      // Update local state
      setScenarios(prev => prev.filter(s => s.id !== scenarioId));
      setPagination(prev => ({ ...prev, total: prev.total - 1 }));
    } catch (error) {
      console.error('Error deleting scenario:', error);
    }
  };

  // Handle bulk status update
  const handleBulkStatusUpdate = async (newStatus: string) => {
    try {
      const promises = selectedScenarios.map(id => 
        fetch(`/api/admin/scenarios/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
      );

      const responses = await Promise.all(promises);
      
      // Check if all requests were successful
      const failedRequests = responses.filter(response => !response.ok);
      if (failedRequests.length > 0) {
        throw new Error(`Failed to update ${failedRequests.length} scenarios`);
      }

      // Update local state with the new status
      setScenarios(prev => prev.map(s => 
        selectedScenarios.includes(s.id) ? { ...s, status: newStatus } : s
      ));
      setSelectedScenarios([]);
    } catch (error) {
      console.error('Error updating bulk status:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Scenarios</p>
                <p className="text-2xl font-bold text-foreground">
                  {pagination?.total || 0}
                </p>
              </div>
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Public</p>
                <p className="text-2xl font-bold text-foreground">
                  {scenarios?.filter(s => s.status === 'public').length || 0}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Trophy className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Draft</p>
                <p className="text-2xl font-bold text-foreground">
                  {scenarios?.filter(s => s.status === 'draft').length || 0}
                </p>
              </div>
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Archived</p>
                <p className="text-2xl font-bold text-foreground">
                  {scenarios?.filter(s => s.status === 'archived').length || 0}
                </p>
              </div>
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search scenarios..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsFormOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Scenario
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedScenarios.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedScenarios.length} scenario(s) selected
                </span>
              </div>
              <div className="flex gap-2">
                <Select onValueChange={handleBulkStatusUpdate}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Update status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedScenarios([])}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scenarios Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Scenarios ({pagination?.total || 0})</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedScenarios.length === scenarios?.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading scenarios...</p>
              </div>
            ) : scenarios?.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No scenarios found</p>
              </div>
            ) : (
              scenarios?.map((scenario) => (
                <div
                  key={scenario.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedScenarios.includes(scenario.id)}
                      onChange={() => handleScenarioSelect(scenario.id)}
                      className="rounded"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{scenario.emoji}</span>
                        <div>
                          <h3 className="font-semibold text-foreground">{scenario.title}</h3>
                          <p className="text-sm text-muted-foreground">{scenario.title_en}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{scenario.role} • {scenario.user_role}</span>
                        <span>{scenario.task_count} tasks</span>
                        <span>{scenario.is_free ? 'Free' : 'Premium'}</span>
                        <span>Updated {new Date(scenario.updated_at).toISOString().split('T')[0]}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={scenario.status} />
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingScenario(scenario as any);
                          setIsFormOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <Select onValueChange={(value) => handleStatusUpdate(scenario.id, value)}>
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Scenario</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{scenario.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(scenario.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {pagination?.total_pages && pagination.total_pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination?.page || 1) - 1) * (pagination?.limit || 20) + 1} to {Math.min((pagination?.page || 1) * (pagination?.limit || 20), pagination?.total || 0)} of {pagination?.total || 0} scenarios
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange((pagination?.page || 1) - 1)}
                  disabled={(pagination?.page || 1) <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination?.total_pages || 1) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={(pagination?.page || 1) === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange((pagination?.page || 1) + 1)}
                  disabled={(pagination?.page || 1) >= (pagination?.total_pages || 1)}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scenario Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingScenario ? 'Edit Scenario' : 'Create New Scenario'}
            </DialogTitle>
          </DialogHeader>
          <ScenarioForm
            scenario={editingScenario}
            onClose={() => {
              setIsFormOpen(false);
              setEditingScenario(null);
            }}
            onSuccess={() => {
              setIsFormOpen(false);
              setEditingScenario(null);
              fetchScenarios(pagination?.page || 1, searchTerm, statusFilter);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
