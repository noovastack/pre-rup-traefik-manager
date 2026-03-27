import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GatewaysPage from '../pages/GatewaysPage';
import '@testing-library/jest-dom';
import { k8sApi, capabilitiesApi } from '../api';

// Mock the API calls
vi.mock('../api', () => ({
  k8sApi: {
    getGateways: vi.fn(),
    deleteGateway: vi.fn(),
  },
  capabilitiesApi: {
    get: vi.fn(),
  },
}));

// Mock the Toaster so we don't need real DOM for it
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

let queryClient: QueryClient;

describe('GatewaysPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }, // disable retries for tests
    });
  });

  const renderHook = (ui: React.ReactNode) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it('shows CRD missing warning if Gateway API is not installed', async () => {
    (capabilitiesApi.get as any).mockResolvedValue({ gatewayApi: false });
    (k8sApi.getGateways as any).mockResolvedValue([]);

    renderHook(<GatewaysPage namespace="default" />);

    await waitFor(() => {
      expect(screen.getByText('Gateway API CRDs Not Installed')).toBeInTheDocument();
    });
    expect(screen.getByText(/gateway.networking.k8s.io/)).toBeInTheDocument();
  });

  it('renders loading state initially', () => {
    // Provide an unresolved promise to keep it in loading state
    (k8sApi.getGateways as any).mockReturnValue(new Promise(() => {}));
    (capabilitiesApi.get as any).mockResolvedValue({ gatewayApi: true });

    renderHook(<GatewaysPage namespace="default" />);

    expect(screen.getByText('Loading Gateways…')).toBeInTheDocument();
  });

  it('renders empty state if no gateways are returned', async () => {
    (capabilitiesApi.get as any).mockResolvedValue({ gatewayApi: true });
    (k8sApi.getGateways as any).mockResolvedValue([]);

    renderHook(<GatewaysPage namespace="default" />);

    await waitFor(() => {
      expect(screen.getByText('No Gateways found')).toBeInTheDocument();
    });
    expect(screen.getByText(/There are no Gateways defined in the default namespace/)).toBeInTheDocument();
  });

  it('renders a list of gateways', async () => {
    (capabilitiesApi.get as any).mockResolvedValue({ gatewayApi: true });
    (k8sApi.getGateways as any).mockResolvedValue([
      {
        metadata: { name: 'test-gateway' },
        spec: {
          gatewayClassName: 'traefik',
          listeners: [
            { name: 'web', protocol: 'HTTP', port: 80 },
            { name: 'websecure', protocol: 'HTTPS', port: 443, hostname: 'example.com' }
          ]
        }
      }
    ]);

    renderHook(<GatewaysPage namespace="default" />);

    await waitFor(() => {
      expect(screen.getByText('test-gateway')).toBeInTheDocument();
    });

    // Check listeners
    expect(screen.getByText('web')).toBeInTheDocument();
    expect(screen.getByText('HTTP:80')).toBeInTheDocument();
    expect(screen.getByText('websecure')).toBeInTheDocument();
    expect(screen.getByText('HTTPS:443')).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });

  it('opens delete confirmation and calls API on confirm', async () => {
    const user = userEvent.setup();
    (capabilitiesApi.get as any).mockResolvedValue({ gatewayApi: true });
    (k8sApi.getGateways as any).mockResolvedValue([
      { metadata: { name: 'delete-me' }, spec: {} }
    ]);
    (k8sApi.deleteGateway as any).mockResolvedValue({});

    renderHook(<GatewaysPage namespace="test-ns" />);

    await waitFor(() => screen.getByText('delete-me'));

    // Find and click the Delete button for the gateway
    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteBtn);

    // Dialog should open
    await waitFor(() => screen.getByText(/Are you sure you want to delete/));

    // Confirm deletion (find the Delete button inside the dialog specifically)
    const dialogs = screen.getAllByRole('dialog');
    const activeDialog = dialogs[dialogs.length - 1]; // Use topmost
    
    // In our UI, the confirm button has the variant "destructive" which we can identify, 
    // or just find the button with exact string 'Delete' inside the dialog.
    const confirmBtn = Array.from(activeDialog.querySelectorAll('button')).find(b => b.textContent === 'Delete');
    
    await Promise.all([
      user.click(confirmBtn!),
      waitFor(() => expect(k8sApi.deleteGateway).toHaveBeenCalledWith('test-ns', 'delete-me')),
    ]);
  });
});
