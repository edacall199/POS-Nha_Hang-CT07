import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Order Menu | RestoPOS',
  description: 'Mời quý khách chọn món',
};

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-10 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <span className="font-bold">R</span>
          </div>
          <span className="font-bold text-lg">RestoPOS</span>
        </div>
      </header>
      <main>
        {children}
      </main>
    </div>
  );
}
