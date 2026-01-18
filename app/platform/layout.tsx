import MaestroSidebar from './components/MaestroSidebar';

export default function PlatformLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-charcoal">
            <MaestroSidebar />
            <main className="flex-grow overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
