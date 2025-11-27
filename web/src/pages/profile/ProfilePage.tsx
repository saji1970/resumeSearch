import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { logout } from '../../store/slices/authSlice'
import { useNavigate } from 'react-router-dom'
import { User, Phone, MapPin, LogOut, Settings, Linkedin, Globe, X } from 'lucide-react'
import { userAPI, UserProfile } from '../../services/api/userAPI'

export default function ProfilePage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  
  // Form fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [professionalSummary, setProfessionalSummary] = useState('')
  const [careerGoals, setCareerGoals] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [otherWebsites, setOtherWebsites] = useState<string[]>([])
  
  // Job search criteria
  const [jobTitles, setJobTitles] = useState<string[]>([])
  const [preferredLocations, setPreferredLocations] = useState<string[]>([])
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const [remotePreference, setRemotePreference] = useState<string>('')
  
  const [newJobTitle, setNewJobTitle] = useState('')
  const [newLocation, setNewLocation] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const profileData = await userAPI.getProfile()
      setProfile(profileData)
      
      setName(profileData.name || '')
      setPhone(profileData.phone || '')
      setLocation(profileData.location || '')
      setProfessionalSummary(profileData.professional_summary || '')
      setCareerGoals(profileData.career_goals || '')
      setLinkedinUrl(profileData.linkedin_url || '')
      setOtherWebsites(profileData.other_websites || [])
      
      if (profileData.job_search_criteria) {
        setJobTitles(profileData.job_search_criteria.job_titles || [])
        setPreferredLocations(profileData.job_search_criteria.preferred_locations || [])
        setSalaryMin(profileData.job_search_criteria.salary_expectations?.min?.toString() || '')
        setSalaryMax(profileData.job_search_criteria.salary_expectations?.max?.toString() || '')
        setRemotePreference(profileData.job_search_criteria.remote_preference || '')
      }
    } catch (error: any) {
      console.error('Error loading profile:', error)
      alert('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const profileData: any = {}
      if (linkedinUrl) profileData.linkedin_url = linkedinUrl
      if (otherWebsites.length > 0) profileData.other_websites = otherWebsites

      const response = await userAPI.updateProfileWithResume(file, profileData)
      
      alert(
        response.metadataExtracted
          ? 'Resume uploaded and analyzed! Skills and job roles have been extracted.'
          : 'Resume uploaded successfully!'
      )
      loadProfile()
    } catch (error: any) {
      console.error('Error uploading resume:', error)
      alert(error.response?.data?.error || 'Failed to upload resume')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      
      const jobSearchCriteria = {
        job_titles: jobTitles,
        preferred_locations: preferredLocations,
        salary_expectations: {
          min: salaryMin ? parseInt(salaryMin) : undefined,
          max: salaryMax ? parseInt(salaryMax) : undefined,
          currency: 'USD',
        },
        remote_preference: remotePreference || undefined,
      }

      await userAPI.updateProfile({
        name,
        phone,
        location,
        professional_summary: professionalSummary,
        career_goals: careerGoals,
        linkedin_url: linkedinUrl,
        other_websites: otherWebsites,
        job_search_criteria: jobSearchCriteria,
      })

      alert('Profile updated successfully')
      setEditMode(false)
      loadProfile()
    } catch (error: any) {
      console.error('Error saving profile:', error)
      alert(error.response?.data?.error || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const addJobTitle = () => {
    if (newJobTitle.trim()) {
      setJobTitles([...jobTitles, newJobTitle.trim()])
      setNewJobTitle('')
    }
  }

  const removeJobTitle = (index: number) => {
    setJobTitles(jobTitles.filter((_, i) => i !== index))
  }

  const addLocation = () => {
    if (newLocation.trim()) {
      setPreferredLocations([...preferredLocations, newLocation.trim()])
      setNewLocation('')
    }
  }

  const removeLocation = (index: number) => {
    setPreferredLocations(preferredLocations.filter((_, i) => i !== index))
  }

  const addWebsite = () => {
    if (websiteUrl.trim()) {
      setOtherWebsites([...otherWebsites, websiteUrl.trim()])
      setWebsiteUrl('')
    }
  }

  const removeWebsite = (index: number) => {
    setOtherWebsites(otherWebsites.filter((_, i) => i !== index))
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <button
          onClick={() => setEditMode(!editMode)}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {editMode ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-lg shadow p-8 mb-6">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="text-primary-600" size={48} />
          </div>
          <div className="flex-1">
            {editMode ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-2xl font-bold text-gray-900 border-b-2 border-gray-300 focus:border-primary-600 outline-none"
                placeholder="Your Name"
              />
            ) : (
              <h2 className="text-2xl font-bold text-gray-900">{profile?.name || user?.name || 'User'}</h2>
            )}
            <p className="text-gray-600">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          {editMode ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  placeholder="City, State"
                />
              </div>
            </>
          ) : (
            <>
              {profile?.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="text-gray-400" size={20} />
                  <span className="text-gray-700">{profile.phone}</span>
                </div>
              )}
              {profile?.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="text-gray-400" size={20} />
                  <span className="text-gray-700">{profile.location}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Resume Upload Section */}
      <div className="bg-white rounded-lg shadow p-8 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Resume</h3>
        <div className="mb-4">
          <label className="block mb-2">
            <span className="sr-only">Upload resume</span>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleResumeUpload}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
          </label>
          {uploading && <p className="text-sm text-gray-600 mt-2">Uploading and analyzing...</p>}
        </div>
        {profile?.suggested_job_roles && profile.suggested_job_roles.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Suggested Job Roles:</p>
            <div className="flex flex-wrap gap-2">
              {profile.suggested_job_roles.map((role, idx) => (
                <span key={idx} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
                  {role}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow p-8 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Profile Information</h3>
        {editMode ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Professional Summary</label>
              <textarea
                value={professionalSummary}
                onChange={(e) => setProfessionalSummary(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                placeholder="Brief summary of your professional background..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Career Goals</label>
              <textarea
                value={careerGoals}
                onChange={(e) => setCareerGoals(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                placeholder="Your career aspirations and goals..."
              />
            </div>
          </>
        ) : (
          <>
            {profile?.professional_summary && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Summary:</p>
                <p className="text-gray-900">{profile.professional_summary}</p>
              </div>
            )}
            {profile?.career_goals && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Career Goals:</p>
                <p className="text-gray-900">{profile.career_goals}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* LinkedIn & Websites */}
      <div className="bg-white rounded-lg shadow p-8 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">LinkedIn & Websites</h3>
        {editMode ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  placeholder="https://yourwebsite.com"
                />
                <button
                  onClick={addWebsite}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
            {otherWebsites.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {otherWebsites.map((url, idx) => (
                  <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm flex items-center gap-2">
                    {url}
                    <button onClick={() => removeWebsite(idx)} className="text-gray-500 hover:text-gray-700">
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {profile?.linkedin_url && (
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-2"
              >
                <Linkedin size={20} />
                View LinkedIn Profile
              </a>
            )}
            {otherWebsites.length > 0 && (
              <div className="space-y-2">
                {otherWebsites.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary-600 hover:text-primary-700"
                  >
                    <Globe size={20} />
                    {url}
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Job Search Criteria */}
      <div className="bg-white rounded-lg shadow p-8 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Job Search Criteria</h3>
        {editMode ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Job Titles</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addJobTitle()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  placeholder="e.g., Senior Product Manager"
                />
                <button
                  onClick={addJobTitle}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Add
                </button>
              </div>
              {jobTitles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {jobTitles.map((title, idx) => (
                    <span key={idx} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm flex items-center gap-2">
                      {title}
                      <button onClick={() => removeJobTitle(idx)} className="text-primary-600 hover:text-primary-800">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Locations</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  placeholder="e.g., Atlanta, GA or Remote"
                />
                <button
                  onClick={addLocation}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Add
                </button>
              </div>
              {preferredLocations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {preferredLocations.map((loc, idx) => (
                    <span key={idx} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm flex items-center gap-2">
                      {loc}
                      <button onClick={() => removeLocation(idx)} className="text-primary-600 hover:text-primary-800">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Salary Expectations</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  placeholder="Min"
                />
                <input
                  type="number"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  placeholder="Max"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Remote Preference</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setRemotePreference('remote')}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    remotePreference === 'remote'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Remote
                </button>
                <button
                  onClick={() => setRemotePreference('hybrid')}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    remotePreference === 'hybrid'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Hybrid
                </button>
                <button
                  onClick={() => setRemotePreference('onsite')}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    remotePreference === 'onsite'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Onsite
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {jobTitles.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Job Titles:</p>
                <div className="flex flex-wrap gap-2">
                  {jobTitles.map((title, idx) => (
                    <span key={idx} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
                      {title}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {preferredLocations.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Locations:</p>
                <div className="flex flex-wrap gap-2">
                  {preferredLocations.map((loc, idx) => (
                    <span key={idx} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
                      {loc}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(salaryMin || salaryMax) && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Salary:</p>
                <p className="text-gray-900">${salaryMin || '0'} - ${salaryMax || '∞'}</p>
              </div>
            )}
            {remotePreference && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Remote Preference:</p>
                <p className="text-gray-900 capitalize">{remotePreference}</p>
              </div>
            )}
          </>
        )}
      </div>

      {editMode && (
        <div className="bg-white rounded-lg shadow p-8 mb-6">
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Account Actions</h3>
        <div className="space-y-3">
          <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
            <Settings size={20} />
            <span>Settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  )
}
