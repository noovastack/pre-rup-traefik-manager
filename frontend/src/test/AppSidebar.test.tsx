import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppSidebar } from '../components/AppSidebar';
import { useAuth } from '../AuthContext';

// Mock the AuthContext hook
vi.mock('../AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock the ClusterSwitcher since it does its own data fetching/context
vi.mock('../components/ClusterSwitcher', () => ({
  ClusterSwitcher: () => <div data-testid="cluster-switcher">ClusterSwitcher</div>,
}));

// We need a dummy SidebarProvider because AppSidebar uses Sidebar components that require context
import { SidebarProvider } from '../components/ui/sidebar';

describe('AppSidebar', () => {
  const defaultProps = {
    activePage: 'dashboard' as any,
    onNavigate: vi.fn(),
    namespaces: ['default', 'kube-system'],
    activeNamespace: 'default',
    onNamespaceChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderSidebar = (props = defaultProps) => {
    return render(
      <SidebarProvider>
        <AppSidebar {...props} />
      </SidebarProvider>
    );
  };

  it('renders navigation groups and brand header', () => {
    (useAuth as any).mockReturnValue({ user: null, logout: vi.fn() });
    renderSidebar();

    expect(screen.getByText('Pre Rup Traefik Manager')).toBeInTheDocument();
    expect(screen.getByText('Cluster')).toBeInTheDocument();
    expect(screen.getByText('HTTP / HTTPS')).toBeInTheDocument();
    expect(screen.getByText('Gateway API')).toBeInTheDocument();
  });

  it('indicates the active page correctly', () => {
    (useAuth as any).mockReturnValue({ user: null, logout: vi.fn() });
    renderSidebar({ ...defaultProps, activePage: 'gateways' as any });

    const gatewaysButton = screen.getByText('Gateways').closest('button');
    expect(gatewaysButton?.className).toContain('bg-indigo-600/10'); // The active style for Gateway API group
  });

  it('calls onNavigate when a menu item is clicked', async () => {
    (useAuth as any).mockReturnValue({ user: null, logout: vi.fn() });
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    renderSidebar({ ...defaultProps, onNavigate });

    await user.click(screen.getByText('Middlewares'));
    expect(onNavigate).toHaveBeenCalledWith('middlewares');
  });

  it('displays user profile info if user is logged in', () => {
    (useAuth as any).mockReturnValue({
      user: { username: 'testuser', role: 'viewer', displayName: 'Test User' },
      logout: vi.fn(),
    });
    renderSidebar();

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('viewer')).toBeInTheDocument();
  });

  it('displays user management for admins only', () => {
    // Admin user
    (useAuth as any).mockReturnValue({
      user: { username: 'admin', role: 'admin' },
      logout: vi.fn(),
    });
    const { unmount } = renderSidebar();
    expect(screen.getByText('User Management')).toBeInTheDocument();
    
    unmount();

    // Viewer user
    (useAuth as any).mockReturnValue({
      user: { username: 'viewer', role: 'viewer' },
      logout: vi.fn(),
    });
    renderSidebar();
    expect(screen.queryByText('User Management')).not.toBeInTheDocument();
  });

  it('calls logout when sign out is clicked', async () => {
    const logoutMock = vi.fn();
    (useAuth as any).mockReturnValue({ user: null, logout: logoutMock });
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByText('Sign out'));
    expect(logoutMock).toHaveBeenCalled();
  });
});
