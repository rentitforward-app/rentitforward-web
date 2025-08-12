interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminBookingDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Admin Booking Detail</h1>
      <p>Booking ID: {resolvedParams.id}</p>
      <p>If you can see this, the route and async params are working!</p>
    </div>
  );
}
