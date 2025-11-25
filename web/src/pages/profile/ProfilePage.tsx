import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { logout } from '../../store/slices/authSlice'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Phone, MapPin, LogOut, Settings } from 'lucide-react'

export default function ProfilePage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  const { masterResume } = useSelector((state: RootState) => state.resume)

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Profile</h1>

      <div className="bg-white rounded-lg shadow p-8 mb-6">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="text-primary-600" size={48} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user?.name || 'User'}</h2>
            <p className="text-gray-600">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          {user?.phone && (
            <div className="flex items-center gap-3">
              <Phone className="text-gray-400" size={20} />
              <span className="text-gray-700">{user.phone}</span>
            </div>
          )}
          {user?.location && (
            <div className="flex items-center gap-3">
              <MapPin className="text-gray-400" size={20} />
              <span className="text-gray-700">{user.location}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-8 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Resume Status</h3>
        {masterResume ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{masterResume.file_name}</p>
              <p className="text-sm text-gray-500">
                Uploaded {new Date(masterResume.created_at).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => navigate('/resume')}
              className="px-4 py-2 text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
            >
              Update
            </button>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">No resume uploaded yet</p>
            <button
              onClick={() => navigate('/resume')}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Upload Resume
            </button>
          </div>
        )}
      </div>

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



