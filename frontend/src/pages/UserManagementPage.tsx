import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usersApi, type UserProfile, type CreateUserRequest } from '@/api';
import { useAuth } from '@/AuthContext';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Plus, Trash2 } from 'lucide-react';

function RoleBadge({ role }: { role: string }) {
  return (
    <Badge
      variant={role === 'admin' ? 'default' : 'secondary'}
      className="text-[10px] px-1.5 py-0"
    >
      {role}
    </Badge>
  );
}

function UserInitials({ name }: { name: string }) {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary text-[11px] font-bold uppercase">
      {name.charAt(0)}
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<CreateUserRequest>({
    username: '',
    password: '',
    displayName: '',
    email: '',
    role: 'viewer',
  });

  const create = useMutation({
    mutationFn: () => usersApi.create(form),
    onSuccess: () => {
      onCreated();
      onOpenChange(false);
      setForm({ username: '', password: '', displayName: '', email: '', role: 'viewer' });
      toast.success(`User "${form.username}" created`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const set = (field: keyof CreateUserRequest, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Username <span className="text-destructive">*</span></Label>
            <Input value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="jsmith" />
          </div>
          <div className="space-y-1.5">
            <Label>Password <span className="text-destructive">*</span></Label>
            <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••••" />
          </div>
          <div className="space-y-1.5">
            <Label>Display Name</Label>
            <Input value={form.displayName} onChange={(e) => set('displayName', e.target.value)} placeholder="John Smith" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="john@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => set('role', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer (read-only)</SelectItem>
                <SelectItem value="admin">Admin (full access)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate()}
            disabled={create.isPending || !form.username || !form.password}
          >
            {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UserManagementPage() {
  const { user: self } = useAuth();
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });

  const deleteUser = useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setDeleteTarget(null);
      toast.success('User deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: 'admin' | 'viewer' }) =>
      usersApi.updateRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Role updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Users</CardTitle>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Create User
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const isSelf = u.id === self?.id;
                  const joined = new Date(u.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <UserInitials name={u.displayName || u.username} />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {u.username}
                        {isSelf && (
                          <span className="ml-2 text-[10px] text-muted-foreground">(you)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.displayName || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.email || '—'}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          disabled={isSelf || updateRole.isPending}
                          onValueChange={(v) =>
                            updateRole.mutate({ id: u.id, role: v as 'admin' | 'viewer' })
                          }
                        >
                          <SelectTrigger className="h-7 w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">
                              <RoleBadge role="admin" />
                            </SelectItem>
                            <SelectItem value="viewer">
                              <RoleBadge role="viewer" />
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{joined}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          disabled={isSelf}
                          onClick={() => setDeleteTarget(u)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => qc.invalidateQueries({ queryKey: ['users'] })}
      />

      {deleteTarget && (
        <ConfirmDeleteDialog
          open={!!deleteTarget}
          onOpenChange={(v) => !v && setDeleteTarget(null)}
          resourceName={deleteTarget.username}
          resourceType="User"
          onConfirm={() => deleteUser.mutate(deleteTarget.id)}
          isPending={deleteUser.isPending}
        />
      )}
    </>
  );
}
