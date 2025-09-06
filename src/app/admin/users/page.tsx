'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  is_banned?: boolean;
  ban_reason?: string;
  ban_expires_at?: string;
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  const router = useRouter();
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, filterBy, itemsPerPage]);

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
        console.error('Error details:', JSON.stringify(error, null, 2));
        return;
      }

      if (!data) {
        console.log('No user data returned from Supabase');
        setUsers([]);
        return;
      }

      console.log('Loaded users from Supabase:', data.length);

      // If no users found, show empty state
      if (data.length === 0) {
        console.log('No users found in database');
        setUsers([]);
        return;
      }

      // Get listings count for each user
      const usersWithStats = await Promise.all(
        data.map(async (user) => {
          try {
            const [listingsResponse, renterBookingsResponse, ownerBookingsResponse] = await Promise.allSettled([
              supabase.from('listings').select('id').eq('owner_id', user.id),
              supabase.from('bookings').select('id').eq('renter_id', user.id),
              supabase.from('bookings').select('id').eq('owner_id', user.id),
            ]);

            const listingsCount = listingsResponse.status === 'fulfilled' ? listingsResponse.value.data?.length || 0 : 0;
            const renterBookingsCount = renterBookingsResponse.status === 'fulfilled' ? renterBookingsResponse.value.data?.length || 0 : 0;
            const ownerBookingsCount = ownerBookingsResponse.status === 'fulfilled' ? ownerBookingsResponse.value.data?.length || 0 : 0;

            return {
              ...user,
              listings_count: listingsCount,
              bookings_as_renter_count: renterBookingsCount,
              bookings_as_owner_count: ownerBookingsCount,
              total_earned: 0, // Would need to calculate from payments
              total_spent: 0, // Would need to calculate from payments
            };
          } catch (userError) {
            console.error(`Error processing user ${user.id}:`, userError);
            return {
              ...user,
              listings_count: 0,
              bookings_as_renter_count: 0,
              bookings_as_owner_count: 0,
              total_earned: 0,
              total_spent: 0,
            };
          }
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

  // Pagination helper functions
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
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
                  ID Verification
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Earnings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Join Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentUsers.map((user) => (
                <tr 
                  key={user.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/admin/users/${user.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.full_name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {user.full_name}
                          </div>
                          {user.verified && (
                            <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                          )}
                          {user.is_banned && (
                            <Ban className="ml-2 h-4 w-4 text-red-500" />
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
                    <div className="flex items-center">
                      {user.identity_verified ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          <span className="text-sm font-medium">Verified</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600">
                          <XCircle className="w-4 h-4 mr-1" />
                          <span className="text-sm font-medium">Not Verified</span>
                        </div>
                      )}
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
                    {format(new Date(user.created_at), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {currentUsers.length === 0 && filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No users found</h3>
            <p className="text-sm text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </Card>

      {/* Pagination Controls */}
      {filteredUsers.length > 0 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">{Math.min(endIndex, filteredUsers.length)}</span> of{' '}
                <span className="font-medium">{filteredUsers.length}</span> users
              </p>
              <div className="flex items-center space-x-2">
                <label htmlFor="items-per-page" className="text-sm text-gray-700">
                  Show:
                </label>
                <select
                  id="items-per-page"
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                {generatePageNumbers().map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      page === currentPage
                        ? 'z-10 bg-red-50 border-red-500 text-red-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

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
                        <span className="text-gray-500">Role:</span>
                        <span className="font-medium">{selectedUser.role}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email Verified:</span>
                        <span className={selectedUser.verified ? 'text-green-600' : 'text-red-600'}>
                          {selectedUser.verified ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">ID Verified:</span>
                        <span className={selectedUser.identity_verified ? 'text-green-600' : 'text-red-600'}>
                          {selectedUser.identity_verified ? 'Yes' : 'No'}
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