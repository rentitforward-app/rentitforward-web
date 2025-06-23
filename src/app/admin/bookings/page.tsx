'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Eye, Download, Calendar, Clock, DollarSign, MapPin, User, Phone, Mail, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';
import { useAdmin } from '../../../hooks/use-admin';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { format } from 'date-fns';

interface Booking {
  id: string;
  item_title: string;
  renter_name: string;
  owner_name: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  payment_status: 'pending' | 'paid' | 'refunded';
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const supabase = createClient();
  const { isAdmin, loading: adminLoading } = useAdmin();

  useEffect(() => {
    if (adminLoading) return;
    if (!isAdmin) return;
    loadBookings();
  }, [isAdmin, adminLoading]);

  const loadBookings = async () => {
    try {
      // Fetch real bookings data from Supabase
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          payment_status,
          created_at,
          start_date,
          end_date,
          total_amount,
          listings:item_id (title),
          renter:renter_id (full_name),
          owner:owner_id (full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading bookings:', error);
        return;
      }

             // Transform the data to match our interface
       const transformedBookings: Booking[] = data.map((booking: any) => ({
        id: booking.id,
        item_title: booking.listings?.title || 'Unknown Item',
        renter_name: booking.renter?.full_name || 'Unknown Renter',
        owner_name: booking.owner?.full_name || 'Unknown Owner',
        start_date: booking.start_date,
        end_date: booking.end_date,
        total_amount: parseFloat(booking.total_amount || '0'),
        status: booking.status as 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled',
        created_at: booking.created_at,
        payment_status: booking.payment_status === 'paid' || booking.payment_status === 'paid_awaiting_release' ? 'paid' : 
                       booking.payment_status === 'refunded' ? 'refunded' : 'pending'
      }));

      setBookings(transformedBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-green-100 text-green-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    
    const displayStatus = status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1);
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {displayStatus}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (adminLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You need admin permissions to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Oversight</h1>
          <p className="text-gray-600">Monitor and manage platform bookings</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{bookings.filter(b => b.status === 'in_progress').length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{bookings.filter(b => b.status === 'pending').length}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(bookings.reduce((sum, b) => sum + b.total_amount, 0))}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search bookings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </Card>

      {/* Bookings Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parties</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{booking.item_title}</div>
                      <div className="text-sm text-gray-500">ID: {booking.id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900">Renter: {booking.renter_name}</div>
                      <div className="text-gray-500">Owner: {booking.owner_name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div>{format(new Date(booking.start_date), 'MMM d, yyyy')}</div>
                      <div className="text-gray-500">to {format(new Date(booking.end_date), 'MMM d, yyyy')}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(booking.total_amount)}
                    </div>
                    <div className="text-xs text-gray-500">{booking.payment_status}</div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(booking.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
} 