import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function ProjectSourceDetailPage() {
  const { projectId, projectSourceId } = useParams<{ projectId: string; projectSourceId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editMapping, setEditMapping] = useState(false);
  const [mappingJson, setMappingJson] = useState('');

  const { data: projectSource, isLoading } = useQuery({
    queryKey: ['project-source', projectId, projectSourceId],
    queryFn: () => api.get<any>(`/api/projects/${projectId}/sources/${projectSourceId}`),
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get<any>(`/api/projects/${projectId}`),
  });

  const { data: schema } = useQuery({
    queryKey: ['schema', project?.canonicalSchemaId],
    queryFn: () => api.get<any>(`/api/canonical-schemas/${project.canonicalSchemaId}`),
    enabled: !!project?.canonicalSchemaId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: { mappingConfig?: object; filterRules?: object }) =>
      api.patch(`/api/projects/${projectId}/sources/${projectSourceId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-source', projectId, projectSourceId] });
      setEditMapping(false);
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: () => api.delete(`/api/projects/${projectId}/sources/${projectSourceId}`),
    onSuccess: () => navigate(`/projects/${projectId}`),
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (!projectSource) return <p className="text-gray-500">Project source not found</p>;

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Source Mapping</h1>
          <p className="text-gray-600">Source ID: {projectSource.sourceId}</p>
          <p className="text-gray-600">Mapping Version: {projectSource.mappingConfigVersion}</p>
        </div>
        <button onClick={() => { if (confirm('Unlink this source?')) unlinkMutation.mutate(); }} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Unlink</button>
      </div>

      {schema && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-2">Target Schema: {schema.name}</h2>
          <p className="text-sm text-gray-600">{schema.description}</p>
          <pre className="mt-2 p-3 bg-gray-50 rounded text-sm overflow-auto">{JSON.stringify(schema.definition, null, 2)}</pre>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Mapping Configuration</h2>
          <button onClick={() => { setMappingJson(JSON.stringify(projectSource.mappingConfig, null, 2)); setEditMapping(true); }} className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">Edit</button>
        </div>
        {editMapping ? (
          <div>
            <textarea value={mappingJson} onChange={e => setMappingJson(e.target.value)} rows={10} className="w-full px-3 py-2 border rounded-md font-mono text-sm" />
            <div className="mt-2 flex space-x-2">
              <button onClick={() => { try { updateMutation.mutate({ mappingConfig: JSON.parse(mappingJson) }); } catch { alert('Invalid JSON'); } }} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Save</button>
              <button onClick={() => setEditMapping(false)} className="px-3 py-2 bg-gray-200 rounded-md text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <pre className="p-3 bg-gray-50 rounded text-sm overflow-auto">{JSON.stringify(projectSource.mappingConfig, null, 2)}</pre>
        )}
      </div>

      {projectSource.filterRules && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Filter Rules</h2>
          <pre className="p-3 bg-gray-50 rounded text-sm overflow-auto">{JSON.stringify(projectSource.filterRules, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
