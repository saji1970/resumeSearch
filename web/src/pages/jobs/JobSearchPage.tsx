import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { AppDispatch, RootState } from '../../store/store'
import { fetchJobs, setFilters } from '../../store/slices/jobSlice'
import { Search, MapPin, DollarSign } from 'lucide-react'

export default function JobSearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { jobs, loading, filters } = useSelector((state: RootState) => state.jobs)

  useEffect(() => {
    dispatch(fetchJobs(filters))
  }, [dispatch, filters])

  const handleSearch = () => {
    const newFilters = { 
      ...filters, 
      search: searchQuery,
      // Enable web search when user enters a search query
      search_web: searchQuery ? true : false
    }
    dispatch(setFilters(newFilters))
    dispatch(fetchJobs(newFilters))
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800'
    if (score >= 60) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Job Search</h1>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search jobs on the web by title, company, or keywords..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Job List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2"></div>
          <p>Searching the web for jobs...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 mb-2">No jobs found. Try adjusting your search.</p>
          {filters.search && (
            <p className="text-sm text-gray-500">Make sure SERPER_API_KEY is configured in backend/.env for web search</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/jobs/${job.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">{job.title}</h3>
                  <p className="text-gray-600 mt-1">{job.company}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                    {job.location && (
                      <div className="flex items-center gap-1">
                        <MapPin size={16} />
                        <span>{job.location}</span>
                      </div>
                    )}
                    {job.salary_min && (
                      <div className="flex items-center gap-1">
                        <DollarSign size={16} />
                        <span>
                          ${job.salary_min.toLocaleString()}
                          {job.salary_max ? ` - $${job.salary_max.toLocaleString()}` : '+'}
                        </span>
                      </div>
                    )}
                  </div>
                  {job.description && (
                    <p className="text-gray-600 mt-3 line-clamp-2">{job.description}</p>
                  )}
                </div>
                {job.compatibility_score !== undefined && (
                  <span
                    className={`ml-4 px-4 py-2 rounded-full text-sm font-medium ${getScoreColor(
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
    </div>
  )
}



