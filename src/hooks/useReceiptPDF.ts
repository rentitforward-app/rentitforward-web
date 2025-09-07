'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

export function useReceiptPDF() {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadReceipt = async (bookingId: string) => {
    setIsGenerating(true);
    
    try {
      const response = await fetch(`/api/bookings/${bookingId}/receipt-pdf`);
      
      if (!response.ok) {
        throw new Error('Failed to generate receipt');
      }
      
      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `rent-it-forward-receipt-${bookingId.slice(-8)}.pdf`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Receipt downloaded successfully!');
      
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Failed to download receipt. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    downloadReceipt,
    isGenerating,
  };
}

