import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function DashboardPage() {
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<{ data: any[]; pagination: any }>('/api/projects?limit=5'),
  });

  const { data: sourcesData } = useQuery({
    queryKey: ['sources'],
    queryFn: () => api.get<{ data: any[]; pagination: any }>('/api/sources?limit=5'),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
            <a href="/projects" className="text-sm text-blue-600 hover:text-blue-500">View all</a>
          </div>
          {projectsData?.data?.length === 0 && <p className="text-gray-500">No projects yet.</p>}
          <ul className="space-y-3">
            {projectsData?.data?.map((project: any) => (
              <li key={project.id}>
                <a href={`/projects/${project.id}`} className="block p-3 rounded-md hover:bg-gray-50 border border-gray-200">
                  <div className="font-medium text-gray-900">{project.name}</div>
                  <div className="text-sm text-gray-500">Status: {project.status}</div>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Sources</h2>
            <a href="/sources" className="text-sm text-blue-600 hover:text-blue-500">View all</a>
          </div>
          {sourcesData?.data?.length === 0 && <p className="text-gray-500">No sources yet.</p>}
          <ul className="space-y-3">
            {sourcesData?.data?.map((source: any) => (
              <li key={source.id}>
                <a href={`/sources/${source.id}`} className="block p-3 rounded-md hover:bg-gray-50 border border-gray-200">
                  <div className="font-medium text-gray-900">{source.name}</div>
                  <div className="text-sm text-gray-500">Status: {source.status}</div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
