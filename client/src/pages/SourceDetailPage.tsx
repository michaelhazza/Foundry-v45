import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function SourceDetailPage() {
  const { sourceId } = useParams<{ sourceId: string }>();
  const navigate = useNavigate();

  const { data: source, isLoading } = useQuery({
    queryKey: ['source', sourceId],
    queryFn: () => api.get<any>(`/api/sources/${sourceId}`),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/sources/${sourceId}`),
    onSuccess: () => navigate('/sources'),
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (!source) return <p className="text-gray-500">Source not found</p>;

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{source.name}</h1>
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-2 ${source.status === 'ready' ? 'bg-green-100 text-green-800' : source.status === 'error' ? 'bg-red-100 text-red-800' : source.status === 'expired' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {source.status}
          </span>
        </div>
        <button onClick={() => { if (confirm('Delete this source?')) deleteMutation.mutate(); }} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Type</dt>
            <dd className="text-gray-900">{source.sourceType}</dd>
          </div>
          {source.originalFilename && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Original Filename</dt>
              <dd className="text-gray-900">{source.originalFilename}</dd>
            </div>
          )}
          {source.mimeType && (
            <div>
              <dt className="text-sm font-medium text-gray-500">MIME Type</dt>
              <dd className="text-gray-900">{source.mimeType}</dd>
            </div>
          )}
          {source.sizeBytes != null && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Size</dt>
              <dd className="text-gray-900">{(source.sizeBytes / 1024).toFixed(1)} KB</dd>
            </div>
          )}
          {source.expiresAt && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Expires</dt>
              <dd className="text-gray-900">{new Date(source.expiresAt).toLocaleDateString()}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="text-gray-900">{new Date(source.createdAt).toLocaleString()}</dd>
          </div>
        </dl>
        {source.detectedColumns && Array.isArray(source.detectedColumns) && source.detectedColumns.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Detected Columns</h3>
            <div className="flex flex-wrap gap-2">
              {source.detectedColumns.map((col: string, i: number) => (
                <span key={i} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">{col}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
