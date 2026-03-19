import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Minimal localStorage stub
vi.stubGlobal('localStorage', {
  getItem: (_key: string) => null,
  setItem: () => {},
  removeItem: () => {},
})

describe('api request error handling', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.resetModules()
  })

  it('throws the server error.message when present', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'cluster not found' } }),
    })

    const { k8sApi } = await import('@/api')
    await expect(k8sApi.getNamespaces()).rejects.toThrow('cluster not found')
  })

  it('falls back to HTTP status string when no error message', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    })

    const { k8sApi } = await import('@/api')
    await expect(k8sApi.getNamespaces()).rejects.toThrow('HTTP 503')
  })

  it('returns data on successful response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ['default', 'kube-system'],
    })

    const { k8sApi } = await import('@/api')
    const result = await k8sApi.getNamespaces()
    expect(result).toEqual(['default', 'kube-system'])
  })
})
