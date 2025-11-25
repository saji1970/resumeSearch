import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchApplicationById } from '../../store/slices/applicationSlice'

const statusColors: Record<string, string> = {
  applied: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  interview: 'bg-purple-100 text-purple-800',
  offer: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800',
}

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { currentApplication } = useSelector((state: RootState) => state.applications)

  useEffect(() => {
    if (id) {
      dispatch(fetchApplicationById(parseInt(id)))
    }
  }, [dispatch, id])

  if (!currentApplication) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12 text-gray-500">Loading application details...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/applications')}
        className="text-primary-600 hover:underline mb-4"
      >
        ← Back to Applications
      </button>

      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {currentApplication.title || 'Application Details'}
            </h1>
            <p className="text-xl text-gray-600 mt-2">{currentApplication.company}</p>
          </div>
          <span
            className={`px-4 py-2 rounded-full font-medium ${
              statusColors[currentApplication.status] || statusColors.applied
            }`}
          >
            {currentApplication.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="border-t pt-6">
          <div className="mb-6">
            <p className="text-sm text-gray-600">Applied Date</p>
            <p className="text-lg font-medium mt-1">
              {new Date(currentApplication.application_date).toLocaleDateString()}
            </p>
          </div>

          {currentApplication.cover_letter && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Cover Letter</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{currentApplication.cover_letter}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



