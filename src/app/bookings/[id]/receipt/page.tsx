'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PaymentReceipt } from '@/components/receipts/PaymentReceipt';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface PaymentBreakdownData {
  booking: any;
  payment_breakdown: any;
  payment_transactions: any[];
  points_transactions: any[];
  user_points: any;
  view_type: 'renter' | 'owner' | 'admin';
  permissions: {
    is_renter: boolean;
    is_owner: boolean;
    is_admin: boolean;
  };
}

export default function ReceiptPage() {
  const params = useParams();
  const [data, setData] = useState<PaymentBreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPaymentBreakdown() {
      try {
        const response = await fetch(`/api/bookings/${params.id}/payment-breakdown`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch payment breakdown');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchPaymentBreakdown();
    }
  }, [params.id]);

  const handleDownloadReceipt = () => {
    // This would implement PDF generation
    // For now, we'll use the browser's print functionality
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
              <p className="text-gray-600">Loading payment details...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-red-500 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Receipt</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link href="/bookings">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Bookings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || !data.payment_breakdown) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Receipt Not Available</h2>
            <p className="text-gray-600 mb-4">
              Payment breakdown is not available for this booking yet.
            </p>
            <Link href="/bookings">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Bookings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/bookings">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Bookings
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {data.view_type === 'renter' && 'Payment Receipt'}
                  {data.view_type === 'owner' && 'Earnings Receipt'}
                  {data.view_type === 'admin' && 'Payment Breakdown'}
                </h1>
                <p className="text-gray-600">
                  {data.booking.listings.title}
                </p>
              </div>
            </div>
            
            <Button onClick={handleDownloadReceipt} className="hidden sm:flex">
              <Download className="h-4 w-4 mr-2" />
              Download Receipt
            </Button>
          </div>
        </div>

        {/* Receipt */}
        <PaymentReceipt
          booking={data.booking}
          paymentBreakdown={data.payment_breakdown}
          viewType={data.view_type}
          showFullDetails={data.view_type === 'admin'}
        />

        {/* Mobile Download Button */}
        <div className="mt-8 sm:hidden">
          <Button onClick={handleDownloadReceipt} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Download Receipt
          </Button>
        </div>

        {/* Admin Additional Info */}
        {data.view_type === 'admin' && (
          <Card className="mt-6">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Transaction History</h3>
              <div className="space-y-3">
                {data.payment_transactions.map((transaction: any) => (
                  <div key={transaction.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{transaction.transaction_type.replace('_', ' ').toUpperCase()}</p>
                      <p className="text-sm text-gray-600">{transaction.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(transaction.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${transaction.amount.toFixed(2)}</p>
                      <p className={`text-xs px-2 py-1 rounded-full ${
                        transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                        transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {transaction.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {data.points_transactions.length > 0 && (
                <>
                  <h4 className="font-semibold mt-6 mb-3">Points Activity</h4>
                  <div className="space-y-2">
                    {data.points_transactions.map((transaction: any) => (
                      <div key={transaction.id} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <div>
                          <p className="text-sm font-medium">{transaction.description}</p>
                          <p className="text-xs text-gray-600">
                            {new Date(transaction.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className={`font-medium ${
                          transaction.points_amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.points_amount > 0 ? '+' : ''}{transaction.points_amount} points
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
