import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getUser } from '../lib/api';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const user = getUser();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  const { data: org, isLoading } = useQuery({
    queryKey: ['organisation'],
    queryFn: () => api.get<any>('/api/organisation'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { name: string }) => api.patch('/api/organisation', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisation'] });
      setEditing(false);
    },
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Organisation</h2>
        {editing ? (
          <div className="flex items-center space-x-3">
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            <button onClick={() => updateMutation.mutate({ name })} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
            <button onClick={() => setEditing(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancel</button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-900 font-medium">{org?.name}</p>
              <p className="text-sm text-gray-500">ID: {org?.id}</p>
            </div>
            {user?.role === 'admin' && (
              <button onClick={() => { setName(org?.name || ''); setEditing(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Edit</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
