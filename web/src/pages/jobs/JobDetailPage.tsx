import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchJobById } from '../../store/slices/jobSlice'
import { createApplication } from '../../store/slices/applicationSlice'
import { fetchMasterResume } from '../../store/slices/resumeSlice'
import { aiAPI } from '../../services/api/aiAPI'
import { MapPin, DollarSign, Briefcase, Sparkles } from 'lucide-react'

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { currentJob } = useSelector((state: RootState) => state.jobs)
  const { masterResume } = useSelector((state: RootState) => state.resume)
  const [coverLetter, setCoverLetter] = useState('')
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    if (id) {
      dispatch(fetchJobById(parseInt(id)))
    }
    dispatch(fetchMasterResume())
  }, [dispatch, id])

  const handleGenerateCoverLetter = async () => {
    if (!id) return
    setGeneratingCoverLetter(true)
    try {
      const response = await aiAPI.generateCoverLetter(parseInt(id))
      setCoverLetter(response.cover_letter)
    } catch (error) {
      console.error('Error generating cover letter:', error)
      alert('Failed to generate cover letter. Please try again.')
    } finally {
      setGeneratingCoverLetter(false)
    }
  }

  const handleApply = async () => {
    if (!id || !masterResume) {
      alert('Please upload a resume first')
      navigate('/resume')
      return
    }

    setApplying(true)
    try {
      await dispatch(
        createApplication({
          job_id: parseInt(id),
          cover_letter: coverLetter,
        })
      )
      navigate('/applications')
    } catch (error) {
      console.error('Error applying:', error)
      alert('Failed to submit application. Please try again.')
    } finally {
      setApplying(false)
    }
  }

  if (!currentJob) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12 text-gray-500">Loading job details...</div>
      </div>
    )
  }

  const score = currentJob.compatibility_score || 0
  const scoreColor =
    score >= 80 ? 'bg-green-100 text-green-800' : score >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/jobs')}
        className="text-primary-600 hover:underline mb-4"
      >
        ← Back to Jobs
      </button>

      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{currentJob.title}</h1>
            <p className="text-xl text-gray-600 mt-2">{currentJob.company}</p>
          </div>
          <span className={`px-4 py-2 rounded-full font-medium ${scoreColor}`}>
            {score}% Match
          </span>
        </div>

        <div className="flex flex-wrap gap-4 mb-6 text-gray-600">
          {currentJob.location && (
            <div className="flex items-center gap-2">
              <MapPin size={18} />
              <span>{currentJob.location}</span>
            </div>
          )}
          {currentJob.salary_min && (
            <div className="flex items-center gap-2">
              <DollarSign size={18} />
              <span>
                ${currentJob.salary_min.toLocaleString()}
                {currentJob.salary_max ? ` - $${currentJob.salary_max.toLocaleString()}` : '+'}
              </span>
            </div>
          )}
          {currentJob.remote_options && (
            <div className="flex items-center gap-2">
              <Briefcase size={18} />
              <span className="capitalize">{currentJob.remote_options}</span>
            </div>
          )}
        </div>

        <div className="prose max-w-none mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Job Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{currentJob.description}</p>
        </div>

        {currentJob.match_details && (
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Match Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Skills Match</p>
                <p className="text-lg font-semibold">
                  {currentJob.match_details.skills?.toFixed(0) || 0}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Experience</p>
                <p className="text-lg font-semibold">
                  {currentJob.match_details.experience?.toFixed(0) || 0}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="text-lg font-semibold">
                  {currentJob.match_details.location?.toFixed(0) || 0}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Compensation</p>
                <p className="text-lg font-semibold">
                  {currentJob.match_details.compensation?.toFixed(0) || 0}%
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Cover Letter</h3>
          {!coverLetter ? (
            <button
              onClick={handleGenerateCoverLetter}
              disabled={generatingCoverLetter}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              <Sparkles size={18} />
              {generatingCoverLetter ? 'Generating...' : 'Generate Cover Letter with AI'}
            </button>
          ) : (
            <div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-gray-700 whitespace-pre-wrap">{coverLetter}</p>
              </div>
              <button
                onClick={handleGenerateCoverLetter}
                disabled={generatingCoverLetter}
                className="text-primary-600 hover:underline"
              >
                Regenerate
              </button>
            </div>
          )}
        </div>

        <div className="mt-8">
          <button
            onClick={handleApply}
            disabled={applying || !masterResume}
            className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {applying
              ? 'Submitting Application...'
              : masterResume
              ? 'Apply Now'
              : 'Upload Resume to Apply'}
          </button>
        </div>
      </div>
    </div>
  )
}



