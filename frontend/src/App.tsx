import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { k8sApi } from '@/api';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { ThemeProvider, useTheme } from '@/components/ThemeProvider';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardPage } from '@/pages/DashboardPage';
import { IngressRoutesPage } from '@/pages/IngressRoutesPage';
import { MiddlewaresPage } from '@/pages/MiddlewaresPage';
import { TLSOptionsPage } from '@/pages/TLSOptionsPage';
import { IngressRouteTCPPage } from '@/pages/IngressRouteTCPPage';
import { IngressRouteUDPPage } from '@/pages/IngressRouteUDPPage';
import { TraefikServicesPage } from '@/pages/TraefikServicesPage';
import { ServersTransportsPage } from '@/pages/ServersTransportsPage';
import MiddlewareTCPPage from '@/pages/MiddlewareTCPPage';
import GatewayClassesPage from '@/pages/GatewayClassesPage';
import GatewaysPage from '@/pages/GatewaysPage';
import HTTPRoutesPage from '@/pages/HTTPRoutesPage';
import ObservabilityPage from '@/pages/ObservabilityPage';
import { PluginsPage } from '@/pages/PluginsPage';
import { TopologyPage } from '@/pages/TopologyPage';
import AboutPage from '@/pages/AboutPage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from 'sonner';

export type Page = 'dashboard' | 'topology' | 'ingressroutes' | 'ingressroutetcps' | 'ingressrouteudps' | 'traefikservices' | 'serverstransports' | 'middlewares' | 'middlewaretcps' | 'tlsoptions' | 'gatewayclasses' | 'gateways' | 'httproutes' | 'observability' | 'plugins' | 'about';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function AppContent() {
  const [page, setPage] = useState<Page>(() => {
    const saved = localStorage.getItem('tm_page') as Page | null;
    const valid: Page[] = ['dashboard','topology','ingressroutes','ingressroutetcps','ingressrouteudps','traefikservices','serverstransports','middlewares','middlewaretcps','tlsoptions','gatewayclasses','gateways','httproutes','observability','plugins','about'];
    return (saved && valid.includes(saved)) ? saved : 'dashboard';
  });
  const [activeNamespace, setActiveNamespace] = useState<string>(() => {
    return localStorage.getItem('tm_namespace') || 'default';
  });

  const handleNavigate = (p: Page) => {
    setPage(p);
    localStorage.setItem('tm_page', p);
  };

  const handleNamespaceChange = (ns: string) => {
    setActiveNamespace(ns);
    localStorage.setItem('tm_namespace', ns);
  };

  const { data: namespaces = [] } = useQuery({
    queryKey: ['namespaces'],
    queryFn: k8sApi.getNamespaces,
    refetchInterval: 60000,
  });

  const isTopology = page === 'topology';

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background font-sans text-foreground">
        <AppSidebar
          activePage={page}
          onNavigate={handleNavigate}
          namespaces={namespaces}
          activeNamespace={activeNamespace}
          onNamespaceChange={handleNamespaceChange}
        />

        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="flex h-14 items-center gap-4 border-b border-border bg-background px-6 lg:h-[60px]">
            <SidebarTrigger />
            <div className="flex-1 flex justify-between items-center">
              <h1 className="text-lg font-semibold tracking-tight">
                {page === 'dashboard' && 'Cluster Overview'}
                {page === 'topology' && `Network Topology (${activeNamespace})`}
                {page === 'ingressroutes' && `IngressRoutes (${activeNamespace})`}
                {page === 'ingressroutetcps' && `TCP Routes (${activeNamespace})`}
                {page === 'ingressrouteudps' && `UDP Routes (${activeNamespace})`}
                {page === 'traefikservices' && `Traefik Services (${activeNamespace})`}
                {page === 'serverstransports' && `ServersTransports (${activeNamespace})`}
                {page === 'middlewares' && `Middlewares (${activeNamespace})`}
                {page === 'middlewaretcps' && `TCP Middlewares (${activeNamespace})`}
                {page === 'tlsoptions' && `TLS Options (${activeNamespace})`}
                {page === 'gatewayclasses' && `Gateway Classes (Cluster-Wide)`}
                {page === 'gateways' && `Gateways (${activeNamespace})`}
                {page === 'httproutes' && `HTTPRoutes (${activeNamespace})`}
                {page === 'observability' && `Observability (${activeNamespace})`}
                {page === 'plugins' && `Plugins (${activeNamespace})`}
                {page === 'about' && 'About'}
              </h1>
              <ThemeToggle />
            </div>
          </header>

          <div className={`flex-1 overflow-y-auto bg-muted/30 ${isTopology ? '' : 'p-6 md:p-8'}`}>
            <div className={isTopology ? 'h-full' : 'mx-auto max-w-6xl w-full'}>
              {page === 'dashboard' && <DashboardPage namespace={activeNamespace} />}
              {page === 'topology' && <TopologyPage namespace={activeNamespace} />}
              {page === 'ingressroutes' && <IngressRoutesPage namespace={activeNamespace} />}
              {page === 'ingressroutetcps' && <IngressRouteTCPPage namespace={activeNamespace} />}
              {page === 'ingressrouteudps' && <IngressRouteUDPPage namespace={activeNamespace} />}
              {page === 'traefikservices' && <TraefikServicesPage namespace={activeNamespace} />}
              {page === 'serverstransports' && <ServersTransportsPage namespace={activeNamespace} />}
              {page === 'middlewares' && <MiddlewaresPage namespace={activeNamespace} />}
              {page === 'middlewaretcps' && <MiddlewareTCPPage namespace={activeNamespace} />}
              {page === 'tlsoptions' && <TLSOptionsPage namespace={activeNamespace} />}
              {page === 'gatewayclasses' && <GatewayClassesPage />}
              {page === 'gateways' && <GatewaysPage namespace={activeNamespace} />}
              {page === 'httproutes' && <HTTPRoutesPage namespace={activeNamespace} />}
              {page === 'observability' && <ObservabilityPage namespace={activeNamespace} />}
              {page === 'plugins' && <PluginsPage namespace={activeNamespace} />}
              {page === 'about' && <AboutPage />}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="ui-theme">
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
        <Toaster richColors position="bottom-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
