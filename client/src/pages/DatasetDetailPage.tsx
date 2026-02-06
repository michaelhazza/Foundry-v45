import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function DatasetDetailPage() {
  const { projectId, datasetId } = useParams<{ projectId: string; datasetId: string }>();
  const navigate = useNavigate();

  const { data: dataset, isLoading } = useQuery({
    queryKey: ['dataset', projectId, datasetId],
    queryFn: () => api.get<any>(`/api/projects/${projectId}/datasets/${datasetId}`),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/projects/${projectId}/datasets/${datasetId}`),
    onSuccess: () => navigate(`/projects/${projectId}`),
  });

  async function handleDownload() {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`/api/projects/${projectId}/datasets/${datasetId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = dataset?.name || 'dataset';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (!dataset) return <p className="text-gray-500">Dataset not found</p>;

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{dataset.name}</h1>
          <p className="text-gray-600">Version {dataset.version}</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={handleDownload} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Download</button>
          <button onClick={() => { if (confirm('Delete this dataset?')) deleteMutation.mutate(); }} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Format</dt>
            <dd className="text-gray-900">{dataset.format}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Records</dt>
            <dd className="text-gray-900">{dataset.recordCount.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Size</dt>
            <dd className="text-gray-900">{(dataset.sizeBytes / 1024).toFixed(1)} KB</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="text-gray-900">{new Date(dataset.createdAt).toLocaleString()}</dd>
          </div>
        </dl>
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Lineage</h3>
          <pre className="p-3 bg-gray-50 rounded text-sm overflow-auto">{JSON.stringify(dataset.lineage, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
