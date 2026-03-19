import { useState } from 'react'
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'

interface UseResourceFormOptions<T> {
  mutationFn: () => Promise<T>
  invalidateKeys: QueryKey[]
  onClose: () => void
  successMessage?: string
}

export function useResourceForm<T>({
  mutationFn,
  invalidateKeys,
  onClose,
  successMessage = 'Resource created successfully',
}: UseResourceFormOptions<T>) {
  const queryClient = useQueryClient()
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key as readonly unknown[] })
      }
      toast.success(successMessage)
      setError('')
      onClose()
    },
    onError: (err: Error) => {
      setError(err.message || 'An unexpected error occurred')
    },
  })

  return {
    error,
    clearError: () => setError(''),
    isPending: mutation.isPending,
    submit: mutation.mutate,
  }
}
