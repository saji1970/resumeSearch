import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { AppDispatch, RootState } from '../../store/store'
import { fetchApplications } from '../../store/slices/applicationSlice'
import { Briefcase } from 'lucide-react'

const statusColors: Record<string, string> = {
  applied: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  interview: 'bg-purple-100 text-purple-800',
  offer: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800',
}

export default function ApplicationsPage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { applications, loading } = useSelector((state: RootState) => state.applications)

  useEffect(() => {
    dispatch(fetchApplications())
  }, [dispatch])

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Applications</h1>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading applications...</div>
      ) : applications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Briefcase className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 mb-2">No applications yet</p>
          <p className="text-gray-500 text-sm mb-6">
            Start searching and applying to jobs to see them here
          </p>
          <button
            onClick={() => navigate('/jobs')}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Search Jobs
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <div
              key={application.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/applications/${application.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {application.title || 'Job Application'}
                  </h3>
                  <p className="text-gray-600 mt-1">{application.company}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Applied: {new Date(application.application_date).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    statusColors[application.status] || statusColors.applied
                  }`}
                >
                  {application.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}



