import { useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { AppDispatch, RootState } from '../../store/store'
import { uploadResume, fetchMasterResume } from '../../store/slices/resumeSlice'
import { Upload, FileText, CheckCircle } from 'lucide-react'

export default function ResumeUploadPage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { masterResume, loading } = useSelector((state: RootState) => state.resume)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (validTypes.includes(file.type)) {
      setSelectedFile(file)
    } else {
      alert('Please select a PDF, DOC, or DOCX file')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    const result = await dispatch(uploadResume(selectedFile))
    if (uploadResume.fulfilled.match(result)) {
      await dispatch(fetchMasterResume())
      setSelectedFile(null)
      alert('Resume uploaded and analyzed successfully!')
    } else {
      alert('Failed to upload resume. Please try again.')
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        {masterResume ? 'Update Your Resume' : 'Upload Your Resume'}
      </h1>

      <div className="bg-white rounded-lg shadow p-8">
        <p className="text-gray-600 mb-6">
          Upload your resume to get started with AI-powered job matching. We support PDF, DOC, and
          DOCX formats.
        </p>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-600">Analyzing your resume with AI...</p>
          </div>
        ) : (
          <>
            <div
              onDragEnter={(e) => {
                e.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                setDragActive(false)
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center ${
                dragActive
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:border-primary-400'
              }`}
            >
              <Upload className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-700 mb-2">
                {selectedFile ? selectedFile.name : 'Drag and drop your resume here'}
              </p>
              <p className="text-sm text-gray-500 mb-4">or</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleFileSelect(file)
                  }
                }}
              />
            </div>

            {selectedFile && (
              <div className="mt-6 flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FileText className="text-primary-600" size={24} />
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleUpload}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Upload
                </button>
              </div>
            )}

            {masterResume && (
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Current Resume</h3>
                <div className="flex items-center gap-3 bg-green-50 rounded-lg p-4">
                  <CheckCircle className="text-green-600" size={24} />
                  <div>
                    <p className="font-medium text-gray-900">{masterResume.file_name}</p>
                    <p className="text-sm text-gray-500">
                      Uploaded {new Date(masterResume.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}



