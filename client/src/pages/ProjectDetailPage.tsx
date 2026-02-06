import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [linkSourceId, setLinkSourceId] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get<any>(`/api/projects/${projectId}`),
  });

  const { data: projectSourcesData } = useQuery({
    queryKey: ['project-sources', projectId],
    queryFn: () => api.get<{ data: any[]; pagination: any }>(`/api/projects/${projectId}/sources?limit=100`),
  });

  const { data: jobsData } = useQuery({
    queryKey: ['processing-jobs', projectId],
    queryFn: () => api.get<{ data: any[]; pagination: any }>(`/api/projects/${projectId}/processing-jobs?limit=20`),
  });

  const { data: datasetsData } = useQuery({
    queryKey: ['datasets', projectId],
    queryFn: () => api.get<{ data: any[]; pagination: any }>(`/api/projects/${projectId}/datasets?limit=20`),
  });

  const { data: orgSources } = useQuery({
    queryKey: ['sources'],
    queryFn: () => api.get<{ data: any[]; pagination: any }>('/api/sources?limit=100'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/projects/${projectId}`),
    onSuccess: () => navigate('/projects'),
  });

  const linkSourceMutation = useMutation({
    mutationFn: (data: { sourceId: string; mappingConfig: object }) =>
      api.post(`/api/projects/${projectId}/sources`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-sources', projectId] });
      setShowLinkForm(false);
      setLinkSourceId('');
    },
  });

  const createJobMutation = useMutation({
    mutationFn: () => api.post(`/api/projects/${projectId}/processing-jobs`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['processing-jobs', projectId] }),
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (!project) return <p className="text-gray-500">Project not found</p>;

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          {project.description && <p className="text-gray-600 mt-1">{project.description}</p>}
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-2 ${project.status === 'active' ? 'bg-green-100 text-green-800' : project.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
            {project.status}
          </span>
        </div>
        <button onClick={() => { if (confirm('Delete this project?')) deleteMutation.mutate(); }} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
      </div>

      {/* Sources Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Linked Sources</h2>
          <button onClick={() => setShowLinkForm(true)} className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">Link Source</button>
        </div>
        {showLinkForm && (
          <div className="mb-4 p-4 border rounded-md">
            <select value={linkSourceId} onChange={e => setLinkSourceId(e.target.value)} className="mr-2 px-3 py-2 border rounded-md">
              <option value="">Select source...</option>
              {orgSources?.data?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={() => linkSourceMutation.mutate({ sourceId: linkSourceId, mappingConfig: {} })} disabled={!linkSourceId} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-50">Link</button>
            <button onClick={() => setShowLinkForm(false)} className="ml-2 px-3 py-2 bg-gray-200 rounded-md text-sm">Cancel</button>
          </div>
        )}
        <ul className="space-y-2">
          {projectSourcesData?.data?.map((ps: any) => (
            <li key={ps.id}>
              <a href={`/projects/${projectId}/sources/${ps.id}`} className="block p-3 rounded-md hover:bg-gray-50 border">
                Source: {ps.sourceId} | Mapping v{ps.mappingConfigVersion}
              </a>
            </li>
          ))}
          {projectSourcesData?.data?.length === 0 && <p className="text-gray-500 text-sm">No linked sources.</p>}
        </ul>
      </div>

      {/* Processing Jobs Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Processing Jobs</h2>
          <button onClick={() => createJobMutation.mutate()} className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">Run Job</button>
        </div>
        <ul className="space-y-2">
          {jobsData?.data?.map((job: any) => (
            <li key={job.id}>
              <a href={`/projects/${projectId}/processing-jobs/${job.id}`} className="block p-3 rounded-md hover:bg-gray-50 border">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mr-2 ${job.status === 'completed' ? 'bg-green-100 text-green-800' : job.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{job.status}</span>
                Created: {new Date(job.createdAt).toLocaleString()}
              </a>
            </li>
          ))}
          {jobsData?.data?.length === 0 && <p className="text-gray-500 text-sm">No processing jobs.</p>}
        </ul>
      </div>

      {/* Datasets Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Datasets</h2>
        <ul className="space-y-2">
          {datasetsData?.data?.map((ds: any) => (
            <li key={ds.id}>
              <a href={`/projects/${projectId}/datasets/${ds.id}`} className="block p-3 rounded-md hover:bg-gray-50 border">
                <div className="font-medium">{ds.name} v{ds.version}</div>
                <div className="text-sm text-gray-500">{ds.format} | {ds.recordCount} records</div>
              </a>
            </li>
          ))}
          {datasetsData?.data?.length === 0 && <p className="text-gray-500 text-sm">No datasets yet.</p>}
        </ul>
      </div>
    </div>
  );
}
