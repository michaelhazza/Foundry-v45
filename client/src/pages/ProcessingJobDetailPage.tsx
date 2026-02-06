import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function ProcessingJobDetailPage() {
  const { projectId, jobId } = useParams<{ projectId: string; jobId: string }>();

  const { data: job, isLoading } = useQuery({
    queryKey: ['processing-job', projectId, jobId],
    queryFn: () => api.get<any>(`/api/projects/${projectId}/processing-jobs/${jobId}`),
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (!job) return <p className="text-gray-500">Job not found</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Processing Job</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${job.status === 'completed' ? 'bg-green-100 text-green-800' : job.status === 'failed' ? 'bg-red-100 text-red-800' : job.status === 'processing' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {job.status}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Triggered By</dt>
            <dd className="text-gray-900">{job.triggeredBy}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="text-gray-900">{new Date(job.createdAt).toLocaleString()}</dd>
          </div>
          {job.startedAt && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Started</dt>
              <dd className="text-gray-900">{new Date(job.startedAt).toLocaleString()}</dd>
            </div>
          )}
          {job.completedAt && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Completed</dt>
              <dd className="text-gray-900">{new Date(job.completedAt).toLocaleString()}</dd>
            </div>
          )}
          {job.sourceRecordCount != null && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Source Records</dt>
              <dd className="text-gray-900">{job.sourceRecordCount.toLocaleString()}</dd>
            </div>
          )}
        </dl>

        {job.errorDetails && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-red-600 mb-2">Error Details</h3>
            <pre className="p-3 bg-red-50 rounded text-sm overflow-auto text-red-800">{JSON.stringify(job.errorDetails, null, 2)}</pre>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Config Snapshot</h3>
          <pre className="p-3 bg-gray-50 rounded text-sm overflow-auto">{JSON.stringify(job.configSnapshot, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
