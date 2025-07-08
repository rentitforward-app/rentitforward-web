'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  User, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  Search,
  Filter,
  Download,
  AlertTriangle,
  Shield,
  Calendar
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAdmin } from '@/hooks/use-admin';

interface VerificationDocument {
  id: string;
  user_id: string;
  document_type: string;
  front_image_url?: string;
  back_image_url?: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  uploaded_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  verification_status: string;
  stripe_account_id?: string;
  created_at: string;
}

interface VerificationItem {
  document: VerificationDocument;
  user: UserProfile;
}

export default function AdminVerificationPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [verificationItems, setVerificationItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Fetch verification documents
  const fetchVerificationItems = async () => {
    try {
      const response = await fetch('/api/admin/verification');
      const data = await response.json();
      
      if (response.ok) {
        setVerificationItems(data.verification_items || []);
      } else {
        toast.error(data.error || 'Failed to fetch verification items');
      }
    } catch (error) {
      toast.error('Failed to fetch verification items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchVerificationItems();
    }
  }, [isAdmin]);

  // Review document
  const reviewDocument = async (
    documentId: string, 
    action: 'approve' | 'reject', 
    notes?: string
  ) => {
    setProcessingIds(prev => new Set(prev.add(documentId)));
    
    try {
      const response = await fetch('/api/admin/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review_document',
          document_id: documentId,
          verification_status: action === 'approve' ? 'approved' : 'rejected',
          admin_notes: notes,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(`Document ${action}d successfully`);
        fetchVerificationItems(); // Refresh the list
      } else {
        toast.error(data.error || `Failed to ${action} document`);
      }
    } catch (error) {
      toast.error(`Failed to ${action} document`);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  // Filter and search items
  const filteredItems = verificationItems.filter(item => {
    const matchesFilter = filter === 'all' || item.document.verification_status === filter;
    const matchesSearch = searchTerm === '' || 
      item.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.user.full_name && item.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending Review
        </Badge>;
      case 'approved':
        return <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Approved
        </Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
          <span>Loading verification dashboard...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <AlertTriangle className="h-12 w-12 text-red-500" />
            <div className="text-center">
              <h2 className="text-lg font-semibold">Access Denied</h2>
              <p className="text-gray-600">You don't have permission to access this page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Verification Management</h1>
        <p className="text-gray-600">Review and manage user identity verification documents</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-sm text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold">
                {verificationItems.filter(item => item.document.verification_status === 'pending').length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold">
                {verificationItems.filter(item => item.document.verification_status === 'approved').length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <XCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold">
                {verificationItems.filter(item => item.document.verification_status === 'rejected').length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <User className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold">{verificationItems.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                <Button
                  key={status}
                  variant={filter === status ? 'default' : 'outline'}
                  onClick={() => setFilter(status)}
                  className="capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Items List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No verification documents found</h3>
              <p className="text-gray-600">
                {searchTerm || filter !== 'all' 
                  ? 'Try adjusting your filters or search terms.' 
                  : 'No users have submitted verification documents yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => (
            <Card key={item.document.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{item.user.full_name || 'Anonymous User'}</h3>
                        <p className="text-sm text-gray-600">{item.user.email}</p>
                      </div>
                      {getStatusBadge(item.document.verification_status)}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Document Type:</span>
                        <span className="font-medium capitalize">{item.document.document_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Uploaded:</span>
                        <span className="font-medium">
                          {new Date(item.document.uploaded_at).toLocaleDateString()}
                        </span>
                      </div>
                      {item.document.reviewed_at && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Reviewed:</span>
                          <span className="font-medium">
                            {new Date(item.document.reviewed_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {item.document.admin_notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-1">Admin Notes:</p>
                        <p className="text-sm text-gray-600">{item.document.admin_notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="md:w-96">
                    <div className="space-y-3">
                      {item.document.front_image_url && (
                        <div>
                          <p className="text-sm font-medium mb-2">Front Image:</p>
                          <img
                            src={item.document.front_image_url}
                            alt="Document Front"
                            className="w-full h-40 object-cover rounded-lg border"
                          />
                        </div>
                      )}
                      
                      {item.document.back_image_url && (
                        <div>
                          <p className="text-sm font-medium mb-2">Back Image:</p>
                          <img
                            src={item.document.back_image_url}
                            alt="Document Back"
                            className="w-full h-40 object-cover rounded-lg border"
                          />
                        </div>
                      )}
                    </div>

                    {item.document.verification_status === 'pending' && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          onClick={() => reviewDocument(item.document.id, 'approve')}
                          disabled={processingIds.has(item.document.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => {
                            const notes = prompt('Enter rejection reason (optional):');
                            reviewDocument(item.document.id, 'reject', notes || undefined);
                          }}
                          disabled={processingIds.has(item.document.id)}
                          variant="destructive"
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
} 