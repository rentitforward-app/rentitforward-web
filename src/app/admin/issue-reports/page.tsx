'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { 
  AlertTriangle, 
  Eye, 
  Filter, 
  Search, 
  Calendar,
  User,
  MapPin,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Flag,
  FileText,
  Camera,
  MessageSquare,
  TrendingUp,
  Download
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import Image from 'next/image';

interface IssueReport {
  id: string;
  booking_id: string;
  reporter_id: string;
  reporter_role: 'owner' | 'renter';
  issue_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  occurred_at: string;
  location: string;
  financial_impact: boolean;
  estimated_cost: number;
  resolution_requested: string;
  resolution_provided?: string;
  photos: string[];
  contact_preference: 'email' | 'phone' | 'message';
  status: 'open' | 'investigating' | 'resolved' | 'closed' | 'escalated';
  assigned_to?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  
  // From view
  booking_start_date: string;
  booking_end_date: string;
  booking_total_amount: number;
  booking_status: string;
  listing_title: string;
  listing_category: string;
  listing_images: string[];
  reporter_name: string;
  reporter_email: string;
  reporter_phone?: string;
  other_party_name: string;
  other_party_email: string;
}

interface ReportStats {
  total_reports: number;
  open_reports: number;
  resolved_reports: number;
  critical_reports: number;
  avg_resolution_time: string;
  reports_by_type: Record<string, number>;
  reports_by_severity: Record<string, number>;
}

export default function AdminIssueReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<IssueReport[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<IssueReport | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all');

  const supabase = createClient();

  useEffect(() => {
    loadReports();
    loadStats();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, statusFilter, severityFilter, typeFilter, searchTerm, dateRange]);

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from('issue_reports_with_details')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load issue reports');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_issue_report_stats');

      if (error) throw error;
      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const filterReports = () => {
    let filtered = reports;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    // Filter by severity
    if (severityFilter !== 'all') {
      filtered = filtered.filter(report => report.severity === severityFilter);
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(report => report.issue_type === typeFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(report =>
        report.title.toLowerCase().includes(term) ||
        report.description.toLowerCase().includes(term) ||
        report.listing_title.toLowerCase().includes(term) ||
        report.reporter_name.toLowerCase().includes(term) ||
        report.other_party_name.toLowerCase().includes(term)
      );
    }

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date();
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      filtered = filtered.filter(report => 
        new Date(report.created_at) >= cutoff
      );
    }

    setFilteredReports(filtered);
  };

  const updateReportStatus = async (reportId: string, newStatus: string, adminNotes?: string) => {
    try {
      const updateData: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'resolved' || newStatus === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      }

      if (adminNotes) {
        updateData.admin_notes = adminNotes;
      }

      const { error } = await supabase
        .from('issue_reports')
        .update(updateData)
        .eq('id', reportId);

      if (error) throw error;

      // Update local state
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, ...updateData }
          : report
      ));

      toast.success(`Report status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating report status:', error);
      toast.error('Failed to update report status');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-600 bg-blue-50';
      case 'investigating': return 'text-purple-600 bg-purple-50';
      case 'resolved': return 'text-green-600 bg-green-50';
      case 'closed': return 'text-gray-600 bg-gray-50';
      case 'escalated': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatIssueType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Issue Reports</h1>
          <p className="text-gray-600">Manage and resolve rental issues</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => router.push('/admin')}>
            Back to Admin
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Reports
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Reports</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_reports}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Reports</p>
                <p className="text-2xl font-bold text-orange-600">{stats.open_reports}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Issues</p>
                <p className="text-2xl font-bold text-red-600">{stats.critical_reports}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolved_reports}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent w-full md:w-64"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="escalated">Escalated</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Severity</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Types</option>
              <option value="damage">Damage</option>
              <option value="missing_parts">Missing Parts</option>
              <option value="malfunction">Malfunction</option>
              <option value="cleanliness">Cleanliness</option>
              <option value="late_pickup">Late Pickup</option>
              <option value="communication">Communication</option>
              <option value="safety">Safety</option>
              <option value="fraud">Fraud</option>
              <option value="other">Other</option>
            </select>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Reports List */}
      {filteredReports.length > 0 ? (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <Card key={report.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex space-x-4 flex-1">
                  {/* Listing Image */}
                  <div className="w-16 h-16 flex-shrink-0">
                    <Image
                      src={report.listing_images[0] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTA5Mzk2IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9IjUwMCI+Tm8gSW1hZ2UgQXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4K'}
                      alt={report.listing_title}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>

                  {/* Report Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {report.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {report.listing_title} • Reported by {report.reporter_name} ({report.reporter_role})
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(report.severity)}`}>
                          {report.severity.charAt(0).toUpperCase() + report.severity.slice(1)}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </span>
                      </div>
                    </div>

                    {/* Issue Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Flag className="w-4 h-4 mr-2" />
                        <span>{formatIssueType(report.issue_type)}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>{format(new Date(report.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="w-4 h-4 mr-2" />
                        <span>{report.other_party_name}</span>
                      </div>
                      {report.financial_impact && (
                        <div className="flex items-center text-sm text-gray-600">
                          <DollarSign className="w-4 h-4 mr-2" />
                          <span>${report.estimated_cost}</span>
                        </div>
                      )}
                    </div>

                    {/* Description Preview */}
                    <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                      {report.description}
                    </p>

                    {/* Additional Info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        {report.photos.length > 0 && (
                          <span className="flex items-center">
                            <Camera className="w-4 h-4 mr-1" />
                            {report.photos.length} photo{report.photos.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {format(new Date(report.created_at), 'h:mm a')}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(report);
                            setShowDetails(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                        
                        {report.status === 'open' && (
                          <Button
                            size="sm"
                            onClick={() => updateReportStatus(report.id, 'investigating')}
                          >
                            Start Investigation
                          </Button>
                        )}
                        
                        {report.status === 'investigating' && (
                          <Button
                            size="sm"
                            onClick={() => updateReportStatus(report.id, 'resolved')}
                          >
                            Mark Resolved
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No issue reports found
          </h3>
          <p className="text-gray-500">
            No reports match your current filters.
          </p>
        </Card>
      )}

      {/* Report Details Modal would go here */}
      {/* This would be a comprehensive modal showing all report details, photos, timeline, etc. */}
    </div>
  );
}
