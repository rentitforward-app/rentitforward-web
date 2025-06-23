'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  MoreHorizontal,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Calendar,
  Shield,
  Star,
  Package,
  DollarSign,
  Clock,
  Download,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/hooks/use-admin';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  avatar_url?: string;
  verified: boolean;
  identity_verified: boolean;
  rating: number;
  total_reviews: number;
  role: string;
  created_at: string;
  updated_at: string;
  listings_count: number;
  bookings_as_renter_count: number;
  bookings_as_owner_count: number;
  total_earned?: number;
  total_spent?: number;
}

type SortOption = 'created_at' | 'updated_at' | 'rating' | 'listings_count';
type FilterOption = 'all' | 'verified' | 'unverified' | 'admin' | 'user';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('created_at');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  
  const supabase = createClient();
  const { isAdmin, loading: adminLoading } = useAdmin();

  useEffect(() => {
    if (adminLoading) return;
    if (!isAdmin) return;
    loadUsers();
  }, [isAdmin, adminLoading]);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchTerm, sortBy, filterBy]);

  const loadUsers = async () => {
    try {
      // Fetch real user data from Supabase profiles table with aggregated statistics
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          phone_number,
          avatar_url,
          role,
          verified,
          identity_verified,
          rating,
          total_reviews,
          created_at,
          updated_at
        `);

      if (error) {
        console.error('Error loading users:', error);
        return;
      }

      // Get listings count for each user
      const usersWithStats = await Promise.all(
        data.map(async (user) => {
          const [listingsResponse, renterBookingsResponse, ownerBookingsResponse] = await Promise.all([
            supabase.from('listings').select('id').eq('owner_id', user.id),
            supabase.from('bookings').select('id').eq('renter_id', user.id),
            supabase.from('bookings').select('id').eq('owner_id', user.id),
          ]);

          return {
            ...user,
            listings_count: listingsResponse.data?.length || 0,
            bookings_as_renter_count: renterBookingsResponse.data?.length || 0,
            bookings_as_owner_count: ownerBookingsResponse.data?.length || 0,
            total_earned: 0, // Would need to calculate from payments
            total_spent: 0, // Would need to calculate from payments
          };
        })
      );

      setUsers(usersWithStats);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortUsers = () => {
    let filtered = [...users];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(user => user.role === filterBy);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updated_at':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'rating':
          return b.rating - a.rating;
        case 'listings_count':
          return b.listings_count - a.listings_count;
        default:
          return 0;
      }
    });

    setFilteredUsers(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'admin':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Admin</span>;
      case 'user':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">User</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Unknown</span>;
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleUserAction = (user: User, action: string) => {
    console.log(`${action} user:`, user);
    // Implement user actions here
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage and monitor platform users</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => {}}>
            <Download className="w-4 h-4 mr-2" />
            Export Users
          </Button>
          <Button onClick={() => {}}>
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role === 'user').length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Verified Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.verified).length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role === 'user' && !u.verified).length}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Users</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="created_at">Sort by: Newest</option>
              <option value="updated_at">Sort by: Last Updated</option>
              <option value="rating">Sort by: Rating</option>
              <option value="listings_count">Sort by: Listings</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trust Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Earnings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {user.full_name}
                          </div>
                          {user.verified && (
                            <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        {user.phone_number && (
                          <div className="text-xs text-gray-400">{user.phone_number}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTrustScoreColor(user.rating)}`}>
                      {user.rating}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-4 text-xs">
                      <div className="flex items-center">
                        <Package className="h-3 w-3 text-gray-400 mr-1" />
                        {user.listings_count}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                        {user.bookings_as_renter_count + user.bookings_as_owner_count}
                      </div>
                      <div className="flex items-center">
                        <Star className="h-3 w-3 text-gray-400 mr-1" />
                        {user.rating}/5
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="text-sm font-medium">{formatCurrency(user.total_earned || 0)}</div>
                    <div className="text-xs text-gray-500">Spent: {formatCurrency(user.total_spent || 0)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(user.updated_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserModal(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUserAction(user, 'edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUserAction(user, user.role === 'admin' ? 'remove' : 'promote')}
                        className={user.role === 'admin' ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'}
                      >
                        {user.role === 'admin' ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No users found</h3>
            <p className="text-sm text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </Card>

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowUserModal(false)} />
            <div className="relative bg-white rounded-lg max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">
                      {selectedUser.full_name}
                    </h4>
                    <p className="text-gray-600">{selectedUser.email}</p>
                    {selectedUser.phone_number && (
                      <p className="text-gray-500">{selectedUser.phone_number}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Account Info</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        {getStatusBadge(selectedUser.role)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Verified:</span>
                        <span>{selectedUser.verified ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Trust Score:</span>
                        <span className={`font-medium ${getTrustScoreColor(selectedUser.rating)}`}>
                          {selectedUser.rating}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Member Since:</span>
                        <span>{format(new Date(selectedUser.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Activity</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Listings:</span>
                        <span>{selectedUser.listings_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Bookings:</span>
                        <span>{selectedUser.bookings_as_renter_count + selectedUser.bookings_as_owner_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Reviews:</span>
                        <span>{selectedUser.total_reviews}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Average Rating:</span>
                        <span>{selectedUser.rating}/5</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Financial</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-sm text-green-600">Total Earned</div>
                      <div className="text-xl font-semibold text-green-700">
                        {formatCurrency(selectedUser.total_earned || 0)}
                      </div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm text-blue-600">Total Spent</div>
                      <div className="text-xl font-semibold text-blue-700">
                        {formatCurrency(selectedUser.total_spent || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={() => setShowUserModal(false)}>
                    Close
                  </Button>
                  <Button onClick={() => handleUserAction(selectedUser, 'edit')}>
                    Edit User
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 