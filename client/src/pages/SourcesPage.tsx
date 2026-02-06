import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function SourcesPage() {
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [page, setPage] = useState(1);

  const { data: sourcesData, isLoading } = useQuery({
    queryKey: ['sources', page],
    queryFn: () => api.get<{ data: any[]; pagination: any }>(`/api/sources?page=${page}&limit=20`),
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: { name: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('name', data.name);
      return api.upload('/api/sources/upload', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      setShowUpload(false);
      setName('');
      setFile(null);
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sources</h1>
        <button onClick={() => setShowUpload(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Upload Source</button>
      </div>

      {showUpload && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Upload Source File</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (file) uploadMutation.mutate({ name, file }); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">File (CSV, Excel, or JSON, max 50MB)</label>
              <input type="file" accept=".csv,.xlsx,.json" onChange={e => setFile(e.target.files?.[0] || null)} className="mt-1 block w-full" />
            </div>
            <div className="flex space-x-3">
              <button type="submit" disabled={!file} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">Upload</button>
              <button type="button" onClick={() => setShowUpload(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sourcesData?.data?.map((source: any) => (
                <tr key={source.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/sources/${source.id}`}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{source.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{source.sourceType}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${source.status === 'ready' ? 'bg-green-100 text-green-800' : source.status === 'error' ? 'bg-red-100 text-red-800' : source.status === 'expired' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {source.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(source.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sourcesData?.pagination && (
            <div className="px-6 py-3 flex justify-between items-center border-t">
              <span className="text-sm text-gray-500">Total: {sourcesData.pagination.total}</span>
              <div className="flex space-x-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Previous</button>
                <button disabled={sourcesData.data.length < 20} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
