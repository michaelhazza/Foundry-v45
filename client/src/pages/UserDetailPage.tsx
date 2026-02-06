import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getUser } from '../lib/api';

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = getUser();

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.get<any>(`/api/users/${userId}`),
  });

  const updateRoleMutation = useMutation({
    mutationFn: (role: string) => api.patch(`/api/users/${userId}`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user', userId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/users/${userId}`),
    onSuccess: () => navigate('/users'),
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (!user) return <p className="text-gray-500">User not found</p>;

  const isAdmin = currentUser?.role === 'admin';
  const isSelf = currentUser?.id === userId;

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user.email}</h1>
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-2 ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
            {user.role}
          </span>
        </div>
        {isAdmin && !isSelf && (
          <button onClick={() => { if (confirm('Remove this user?')) deleteMutation.mutate(); }} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Remove User</button>
        )}
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="text-gray-900">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Role</dt>
            <dd className="text-gray-900">{user.role}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Joined</dt>
            <dd className="text-gray-900">{new Date(user.createdAt).toLocaleString()}</dd>
          </div>
        </dl>
        {isAdmin && !isSelf && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Change Role</h3>
            <div className="flex space-x-3">
              <button onClick={() => updateRoleMutation.mutate('admin')} disabled={user.role === 'admin'} className="px-3 py-2 bg-purple-600 text-white rounded-md text-sm disabled:opacity-50 hover:bg-purple-700">Set Admin</button>
              <button onClick={() => updateRoleMutation.mutate('member')} disabled={user.role === 'member'} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-50 hover:bg-blue-700">Set Member</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
