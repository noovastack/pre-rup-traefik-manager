import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { LayoutDashboard, Route, ShieldAlert, LogOut, ChevronDown, LockKeyhole, Server, Network, Globe, Activity, Blocks, Map, Info } from 'lucide-react';
import type { Page } from '@/App';
import { useAuth } from '@/AuthContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from './ui/button';

import { ClusterSwitcher } from './ClusterSwitcher';

// Navigation configuration — separated from JSX for readability
const navGroups: {
  label: string;
  accentColor: string;
  items: { page: Page; label: string; icon: React.ElementType; iconColor: string }[];
}[] = [
  {
    label: 'Cluster',
    accentColor: 'blue',
    items: [
      { page: 'dashboard', label: 'Overview', icon: LayoutDashboard, iconColor: 'text-blue-400' },
      { page: 'topology', label: 'Network Map', icon: Map, iconColor: 'text-cyan-400' },
    ],
  },
  {
    label: 'HTTP / HTTPS',
    accentColor: 'blue',
    items: [
      { page: 'ingressroutes', label: 'IngressRoutes', icon: Route, iconColor: 'text-blue-400' },
      { page: 'middlewares', label: 'Middlewares', icon: ShieldAlert, iconColor: 'text-amber-500' },
    ],
  },
  {
    label: 'Gateway API',
    accentColor: 'indigo',
    items: [
      { page: 'gatewayclasses', label: 'GatewayClasses', icon: Globe, iconColor: 'text-indigo-400' },
      { page: 'gateways', label: 'Gateways', icon: Globe, iconColor: 'text-blue-400' },
      { page: 'httproutes', label: 'HTTPRoutes', icon: Route, iconColor: 'text-sky-400' },
    ],
  },
  {
    label: 'TCP',
    accentColor: 'emerald',
    items: [
      { page: 'ingressroutetcps', label: 'TCP Routes', icon: Server, iconColor: 'text-emerald-400' },
      { page: 'middlewaretcps', label: 'TCP Middlewares', icon: ShieldAlert, iconColor: 'text-emerald-500' },
    ],
  },
  {
    label: 'UDP',
    accentColor: 'purple',
    items: [
      { page: 'ingressrouteudps', label: 'UDP Routes', icon: Network, iconColor: 'text-purple-400' },
    ],
  },
  {
    label: 'Advanced',
    accentColor: 'rose',
    items: [
      { page: 'traefikservices', label: 'TraefikServices', icon: Network, iconColor: 'text-rose-400' },
      { page: 'serverstransports', label: 'ServersTransports', icon: Network, iconColor: 'text-rose-500' },
      { page: 'tlsoptions', label: 'TLS Options', icon: LockKeyhole, iconColor: 'text-rose-600' },
      { page: 'observability', label: 'Observability', icon: Activity, iconColor: 'text-emerald-500' },
      { page: 'plugins', label: 'WASM Plugins', icon: Blocks, iconColor: 'text-emerald-400' },
    ],
  },
];

// Active state accent color per group
const accentStyles: Record<string, string> = {
  blue: 'border-l-blue-500 bg-blue-600/10 text-blue-300',
  indigo: 'border-l-indigo-500 bg-indigo-600/10 text-indigo-300',
  emerald: 'border-l-emerald-500 bg-emerald-600/10 text-emerald-300',
  purple: 'border-l-purple-500 bg-purple-600/10 text-purple-300',
  rose: 'border-l-rose-500 bg-rose-600/10 text-rose-300',
};

export function AppSidebar({
  activePage,
  onNavigate,
  namespaces,
  activeNamespace,
  onNamespaceChange,
}: {
  activePage: Page;
  onNavigate: (p: Page) => void;
  namespaces: string[];
  activeNamespace: string;
  onNamespaceChange: (ns: string) => void;
}) {
  const { logout } = useAuth();

  return (
    <Sidebar className="border-r border-zinc-800/40 bg-zinc-950/95 text-zinc-300">
      {/* ── Brand Header ──────────────────────────────────────────── */}
      <SidebarHeader className="border-b border-zinc-800/40 p-0">
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 font-bold text-white text-sm shadow-lg shadow-blue-500/25">
              T
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-zinc-950 pulse-dot" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-zinc-100 tracking-wide leading-tight">Traefik Manager</span>
              <span className="text-[10px] text-zinc-500 font-medium">Kubernetes Dashboard</span>
            </div>
          </div>
        </div>
        
        {/* ── Context Switchers ────────────────────────────────────── */}
        <div className="px-3 pb-3 space-y-2">
          <ClusterSwitcher />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between bg-zinc-900/80 border-zinc-800/60 text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-colors h-9 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span className="truncate font-medium">NS: {activeNamespace}</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 opacity-40" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-zinc-900 border-zinc-800 text-zinc-300">
              {namespaces.length === 0 ? (
                <DropdownMenuItem disabled>Loading namespaces…</DropdownMenuItem>
              ) : (
                namespaces.map(ns => (
                  <DropdownMenuItem 
                    key={ns} 
                    onClick={() => onNamespaceChange(ns)}
                    className="hover:bg-blue-600/20 hover:text-blue-400 focus:bg-blue-600/20 focus:text-blue-400 cursor-pointer"
                  >
                    {ns}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarHeader>

      {/* ── Navigation Groups ──────────────────────────────────────── */}
      <SidebarContent className="gap-0 py-1 px-1">
        {navGroups.map((group, groupIdx) => (
          <div key={group.label}>
            {groupIdx > 0 && (
              <SidebarSeparator className="mx-3 my-1 bg-zinc-800/40" />
            )}
            <SidebarGroup className="px-1 py-1">
              <SidebarGroupLabel className="text-[10px] uppercase font-bold tracking-[0.15em] text-zinc-500/80 mb-0.5 pl-3">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {group.items.map((item) => {
                    const isActive = activePage === item.page;
                    const activeStyle = accentStyles[group.accentColor] || accentStyles.blue;
                    
                    return (
                      <SidebarMenuItem key={item.page}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => onNavigate(item.page)}
                          className={`
                            rounded-lg transition-colors duration-150 h-9
                            border-l-2 border-l-transparent
                            hover:bg-zinc-800/50 hover:border-l-zinc-600
                            ${isActive ? activeStyle : 'text-zinc-400'}
                          `}
                          tooltip={item.label}
                        >
                          <div className={`flex h-6 w-6 items-center justify-center rounded-md ${isActive ? 'bg-white/10' : 'bg-zinc-800/50'} transition-colors`}>
                            <item.icon className={`h-3.5 w-3.5 ${isActive ? 'text-current' : item.iconColor}`} />
                          </div>
                          <span className={`text-[13px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        ))}
      </SidebarContent>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <SidebarFooter className="border-t border-zinc-800/40 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activePage === 'about'}
              onClick={() => onNavigate('about')}
              className={`rounded-lg transition-colors duration-150 h-9 border-l-2 border-l-transparent hover:bg-zinc-800/50 hover:border-l-zinc-600 ${activePage === 'about' ? 'border-l-zinc-500 bg-zinc-600/10 text-zinc-300' : 'text-zinc-400'}`}
              tooltip="About"
            >
              <div className={`flex h-6 w-6 items-center justify-center rounded-md ${activePage === 'about' ? 'bg-white/10' : 'bg-zinc-800/50'} transition-colors`}>
                <Info className="h-3.5 w-3.5" />
              </div>
              <span className="text-[13px] font-medium">About</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={logout}
              className="text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors rounded-lg h-9 border-l-2 border-l-transparent hover:border-l-red-500"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800/50">
                <LogOut className="h-3.5 w-3.5" />
              </div>
              <span className="text-[13px] font-medium">Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
