import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClusterSwitcher } from '../components/ClusterSwitcher';
import { clusterApi } from '../api';

vi.mock('../api', () => ({
  clusterApi: {
    getClusters: vi.fn(),
    createCluster: vi.fn(),
    deleteCluster: vi.fn(),
  },
}));

let queryClient: QueryClient;

const originalLocation = window.location;
const originalConfirm = window.confirm;

beforeAll(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { reload: vi.fn() },
  });
  window.confirm = vi.fn();
});

afterAll(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  window.confirm = originalConfirm;
});

describe('ClusterSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ClusterSwitcher />
      </QueryClientProvider>
    );
  };

  it('renders correctly with default local cluster', async () => {
    (clusterApi.getClusters as any).mockResolvedValue([]);
    renderComponent();
    expect(screen.getByText('Local Cluster')).toBeInTheDocument();
  });

  it('populates dropdown with fetched clusters', async () => {
    const user = userEvent.setup();
    (clusterApi.getClusters as any).mockResolvedValue([
      { id: 1, name: 'prod-cluster' }
    ]);
    renderComponent();

    // Click trigger to open dropdown
    const triggerBtn = screen.getByRole('button');
    await user.click(triggerBtn);

    await waitFor(() => {
      expect(screen.getByText('prod-cluster')).toBeInTheDocument();
    });
    // Local cluster is always an option
    const options = screen.getAllByText('Local Cluster');
    expect(options.length).toBeGreaterThan(0);
  });

  it('switches active cluster on click and reloads page', async () => {
    const user = userEvent.setup();
    (clusterApi.getClusters as any).mockResolvedValue([
      { id: 1, name: 'prod-cluster' }
    ]);
    renderComponent();

    const triggerBtn = screen.getByRole('button');
    await user.click(triggerBtn);

    await waitFor(() => {
      expect(screen.getByText('prod-cluster')).toBeInTheDocument();
    });

    await user.click(screen.getByText('prod-cluster'));

    expect(localStorage.getItem('tm_cluster')).toBe('prod-cluster');
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('opens add cluster dialog and connects a new cluster', async () => {
    const user = userEvent.setup();
    (clusterApi.getClusters as any).mockResolvedValue([]);
    (clusterApi.createCluster as any).mockResolvedValue({ name: 'new-cluster' });
    
    renderComponent();

    const triggerBtn = screen.getByRole('button');
    await user.click(triggerBtn);

    await waitFor(() => screen.getByText('Add Remote Cluster'));
    await user.click(screen.getByText('Add Remote Cluster'));

    // Verify dialog opened
    await waitFor(() => expect(screen.getByText('API Server URL')).toBeInTheDocument());

    // Fill form
    const [nameInput, urlInput, tokenInput] = [
      screen.getByPlaceholderText('e.g. prod-us-east-1'),
      screen.getByPlaceholderText('https://your-cluster:6443'),
      screen.getByPlaceholderText('eyJhbGciOiJSUzI1NiIs…')
    ];

    await user.type(nameInput, 'new-cluster');
    await user.type(urlInput, 'https://test:6443');
    await user.type(tokenInput, 'abc-token');

    const connectBtn = screen.getByRole('button', { name: 'Connect & Encrypt' });
    await user.click(connectBtn);

    expect(clusterApi.createCluster).toHaveBeenCalledWith('new-cluster', 'https://test:6443', 'abc-token', '');
    
    await waitFor(() => {
      expect(localStorage.getItem('tm_cluster')).toBe('new-cluster');
      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  it('deletes a cluster when trash icon is clicked', async () => {
    const user = userEvent.setup();
    (clusterApi.getClusters as any).mockResolvedValue([
      { id: 99, name: 'stale-cluster' }
    ]);
    (clusterApi.deleteCluster as any).mockResolvedValue({});
    (window.confirm as any).mockReturnValue(true); // User says yes to dialog

    renderComponent();

    const triggerBtn = screen.getByRole('button');
    await user.click(triggerBtn);

    await waitFor(() => screen.getByText('stale-cluster'));

    const dropdownItem = screen.getByText('stale-cluster').closest('div[role="menuitem"]');
    // The trash icon is an SVG rendered unconditionally in the component (or after load). 
    // We can rely on clicking the svg or setting an explicit testid if needed. 
    // For now we look for the SVG inside the parent:
    const svgIcon = dropdownItem?.querySelector('svg.lucide-trash-2') as Element;
    expect(svgIcon).toBeInTheDocument();

    await user.click(svgIcon);

    expect(clusterApi.deleteCluster).toHaveBeenCalledWith(99, expect.anything());
  });
});
