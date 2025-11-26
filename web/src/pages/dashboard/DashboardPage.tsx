import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { AppDispatch, RootState } from '../../store/store'
import { fetchJobs } from '../../store/slices/jobSlice'
import { fetchApplications } from '../../store/slices/applicationSlice'
import { Briefcase, TrendingUp, CheckCircle } from 'lucide-react'

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  const { jobs, loading: jobsLoading } = useSelector((state: RootState) => state.jobs)
  const { applications } = useSelector((state: RootState) => state.applications)

  useEffect(() => {
    dispatch(fetchJobs({ limit: 5 }))
    dispatch(fetchApplications())
  }, [dispatch])

  const topJobs = jobs.slice(0, 3)
  const stats = {
    applications: applications.length,
    interviews: applications.filter((a) => a.status === 'interview').length,
    offers: applications.filter((a) => a.status === 'offer').length,
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800'
    if (score >= 60) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name || 'User'}!
        </h1>
        <p className="text-gray-600 mt-2">Here's your job search overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Applications</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.applications}</p>
            </div>
            <Briefcase className="text-primary-600" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Interviews</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.interviews}</p>
            </div>
            <TrendingUp className="text-blue-600" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Offers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.offers}</p>
            </div>
            <CheckCircle className="text-green-600" size={40} />
          </div>
        </div>
      </div>

      {/* Recommended Jobs */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Recommended Jobs</h2>
        </div>
        <div className="p-6">
          {jobsLoading ? (
            <div className="text-center py-8 text-gray-500">Loading jobs...</div>
          ) : topJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No jobs found. Start searching to find opportunities!
            </div>
          ) : (
            <div className="space-y-4">
              {topJobs.map((job) => (
                <div
                  key={job.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                      <p className="text-gray-600 mt-1">{job.company}</p>
                      {job.location && (
                        <p className="text-sm text-gray-500 mt-1">{job.location}</p>
                      )}
                    </div>
                    {job.compatibility_score !== undefined && (
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(
                          job.compatibility_score
                        )}`}
                      >
                        {job.compatibility_score}% Match
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => navigate('/jobs')}
            className="mt-4 text-primary-600 font-medium hover:underline"
          >
            View All Jobs →
          </button>
        </div>
      </div>
    </div>
  )
}



