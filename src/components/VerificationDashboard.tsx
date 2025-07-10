'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Upload, 
  Eye, 
  ExternalLink,
  Shield,
  CreditCard,
  FileText,
  Camera,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface VerificationStatus {
  connected: boolean;
  onboarding_complete: boolean;
  verification: {
    overall_status: 'unverified' | 'pending' | 'verified' | 'rejected';
    identity_verification: {
      status: string;
      details: any;
    };
    document_verification: {
      front_uploaded: boolean;
      back_uploaded: boolean;
      status: string;
    };
    requirements: {
      currently_due: string[];
      eventually_due: string[];
      past_due: string[];
      pending_verification: string[];
    };
  };
  capabilities: {
    charges_enabled: boolean;
    payouts_enabled: boolean;
    details_submitted: boolean;
  };
  requirements: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
    pending_verification: string[];
    disabled_reason?: string;
  };
}

interface VerificationDashboardProps {
  className?: string;
}

export const VerificationDashboard = ({ className }: VerificationDashboardProps) => {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<{
    front?: File;
    back?: File;
  }>({});

  // Fetch verification status
  const fetchStatus = useCallback(async () => {
    try {
      console.log('🔍 Fetching verification status...');
      const response = await fetch('/api/payments/stripe/connect');
      const data = await response.json();
      
      console.log('📊 API Response:', { status: response.status, data });
      
      if (response.ok) {
        setStatus(data);
        console.log('✅ Status updated successfully');
      } else {
        console.error('❌ API Error:', data);
        toast.error(data.error || `Failed to fetch verification status (${response.status})`);
      }
    } catch (error) {
      console.error('💥 Network Error:', error);
      toast.error('Network error - Failed to fetch verification status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Create Connect account
  const createConnectAccount = async () => {
    setActionLoading('create_account');
    try {
      const response = await fetch('/api/payments/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_account' }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Connect account created! Starting onboarding...');
        // Automatically create onboarding link
        await createOnboardingLink();
      } else {
        toast.error(data.error || 'Failed to create Connect account');
      }
    } catch (error) {
      toast.error('Failed to create Connect account');
    } finally {
      setActionLoading(null);
    }
  };

  // Create onboarding link
  const createOnboardingLink = async () => {
    setActionLoading('onboarding');
    try {
      const response = await fetch('/api/payments/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_onboarding_link' }),
      });

      const data = await response.json();
      if (response.ok) {
        window.location.href = data.onboarding_url;
      } else {
        toast.error(data.error || 'Failed to create onboarding link');
        setActionLoading(null);
      }
    } catch (error) {
      toast.error('Failed to create onboarding link');
      setActionLoading(null);
    }
  };

  // Create login link
  const openAccountDashboard = async () => {
    setActionLoading('dashboard');
    try {
      const response = await fetch('/api/payments/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_login_link' }),
      });

      const data = await response.json();
      if (response.ok) {
        window.open(data.login_url, '_blank');
      } else {
        toast.error(data.error || 'Failed to access account dashboard');
      }
    } catch (error) {
      toast.error('Failed to access account dashboard');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle file selection
  const handleFileSelect = (type: 'front' | 'back', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB');
        return;
      }
      
      setSelectedFiles(prev => ({ ...prev, [type]: file }));
    }
  };

  // Upload verification documents
  const uploadDocuments = async (documentType: 'identity_document' | 'address_document') => {
    if (!selectedFiles.front) {
      toast.error('Please select a front image');
      return;
    }

    setActionLoading(`upload_${documentType}`);
    
    try {
      // Convert files to base64
      const frontBase64 = await fileToBase64(selectedFiles.front);
      const backBase64 = selectedFiles.back ? await fileToBase64(selectedFiles.back) : undefined;

      const response = await fetch('/api/payments/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload_verification_document',
          document_type: documentType,
          front_image: frontBase64,
          back_image: backBase64,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Documents uploaded successfully!');
        setSelectedFiles({});
        fetchStatus();
      } else {
        toast.error(data.error || 'Failed to upload documents');
      }
    } catch (error) {
      toast.error('Failed to upload documents');
    } finally {
      setActionLoading(null);
    }
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remove data:image/jpeg;base64, prefix
      };
      reader.onerror = error => reject(error);
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'pending':
        return <Badge variant="warning"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Not Started</Badge>;
    }
  };

  // Calculate verification progress
  const getVerificationProgress = () => {
    if (!status) return 0;
    
    let progress = 0;
    if (status.connected) progress += 25;
    if (status.capabilities?.details_submitted) progress += 25;
    if (status.capabilities?.charges_enabled) progress += 25;
    if (status.verification?.overall_status === 'verified') progress += 25;
    
    return Math.min(progress, 100);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Verification Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-gray-600">{getVerificationProgress()}%</span>
            </div>
            <Progress value={getVerificationProgress()} className="h-2" />
            
            {status?.verification?.overall_status && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Status</span>
                {getStatusBadge(status.verification.overall_status)}
              </div>
            )}

            {status?.requirements?.disabled_reason && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm font-medium">Account Disabled</p>
                <p className="text-red-600 text-sm">{status.requirements.disabled_reason}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Connect Account Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Seller Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Stripe Connect Account</p>
                <p className="text-sm text-gray-600">Required for receiving payments as a sharer</p>
              </div>
              <div className="flex items-center space-x-2">
                {status?.connected ? (
                  getStatusBadge(status.onboarding_complete ? 'verified' : 'pending')
                ) : (
                  <Button 
                    onClick={createConnectAccount}
                    disabled={actionLoading === 'create_account'}
                    size="sm"
                  >
                    {actionLoading === 'create_account' ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Create Account
                  </Button>
                )}
              </div>
            </div>

            {status?.connected && (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Charges:</span>
                    <span className={`ml-2 ${status.capabilities?.charges_enabled ? 'text-green-600' : 'text-red-600'}`}>
                      {status.capabilities?.charges_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Payouts:</span>
                    <span className={`ml-2 ${status.capabilities?.payouts_enabled ? 'text-green-600' : 'text-red-600'}`}>
                      {status.capabilities?.payouts_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  {!status.onboarding_complete && (
                    <Button 
                      onClick={createOnboardingLink}
                      disabled={actionLoading === 'onboarding'}
                      size="sm"
                    >
                      {actionLoading === 'onboarding' ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Complete Setup
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline"
                    onClick={openAccountDashboard}
                    disabled={actionLoading === 'dashboard'}
                    size="sm"
                  >
                    {actionLoading === 'dashboard' ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Account Dashboard
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Document Upload */}
      {status?.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Document Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Identity Document */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Identity Document</p>
                    <p className="text-sm text-gray-600">Driver's license, passport, or government ID</p>
                  </div>
                  {getStatusBadge(status.verification?.document_verification?.status || 'unverified')}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Front of Document</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileSelect('front', e)}
                        className="hidden"
                        id="front-upload"
                      />
                      <label htmlFor="front-upload" className="cursor-pointer">
                        {selectedFiles.front ? (
                          <div className="space-y-2">
                            <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                            <p className="text-sm font-medium">{selectedFiles.front.name}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Camera className="w-8 h-8 text-gray-400 mx-auto" />
                            <p className="text-sm text-gray-600">Click to upload front</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Back of Document</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileSelect('back', e)}
                        className="hidden"
                        id="back-upload"
                      />
                      <label htmlFor="back-upload" className="cursor-pointer">
                        {selectedFiles.back ? (
                          <div className="space-y-2">
                            <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                            <p className="text-sm font-medium">{selectedFiles.back.name}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Camera className="w-8 h-8 text-gray-400 mx-auto" />
                            <p className="text-sm text-gray-600">Click to upload back</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => uploadDocuments('identity_document')}
                  disabled={!selectedFiles.front || actionLoading === 'upload_identity_document'}
                  className="w-full"
                >
                  {actionLoading === 'upload_identity_document' ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload Identity Document
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requirements */}
      {status?.requirements && (
        (status.requirements.currently_due?.length || 0) > 0 || 
        (status.requirements.past_due?.length || 0) > 0 ||
        (status.requirements.pending_verification?.length || 0) > 0
      ) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Outstanding Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(status.requirements?.past_due?.length || 0) > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="font-medium text-red-800 mb-2">Past Due Requirements</p>
                  <ul className="text-sm text-red-600 space-y-1">
                    {status.requirements.past_due?.map((req, index) => (
                      <li key={index}>• {req.replace(/_/g, ' ')}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(status.requirements?.currently_due?.length || 0) > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="font-medium text-yellow-800 mb-2">Currently Due</p>
                  <ul className="text-sm text-yellow-600 space-y-1">
                    {status.requirements.currently_due?.map((req, index) => (
                      <li key={index}>• {req.replace(/_/g, ' ')}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(status.requirements?.pending_verification?.length || 0) > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="font-medium text-blue-800 mb-2">Pending Verification</p>
                  <ul className="text-sm text-blue-600 space-y-1">
                    {status.requirements.pending_verification?.map((req, index) => (
                      <li key={index}>• {req.replace(/_/g, ' ')}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button 
          variant="outline" 
          onClick={fetchStatus}
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Refresh Status
        </Button>
      </div>
    </div>
  );
}; 