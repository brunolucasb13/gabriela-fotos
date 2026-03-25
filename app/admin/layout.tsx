export default function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 via-rose-50/70 to-white px-4 py-6 sm:px-6 sm:py-8">
      {children}
    </main>
  );
}

