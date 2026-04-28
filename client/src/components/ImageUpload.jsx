import { useCallback, useState } from 'react'

const ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,image/gif'
const MAX_FILES = 5
const MAX_SIZE = 10 * 1024 * 1024

export default function ImageUpload({ files, setFiles, maxFiles = MAX_FILES }) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  const validateAndAdd = (newFiles) => {
    setError('')
    const valid = []
    for (const f of Array.from(newFiles)) {
      if (!ACCEPT.includes(f.type)) { setError('Only JPEG, PNG, WebP, GIF allowed'); continue }
      if (f.size > MAX_SIZE) { setError(`"${f.name}" exceeds 10MB`); continue }
      valid.push(f)
    }
    const combined = [...files, ...valid].slice(0, maxFiles)
    setFiles(combined)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    validateAndAdd(e.dataTransfer.files)
  }, [files])

  const removeFile = (idx) => setFiles(files.filter((_, i) => i !== idx))

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <label
        className={`flex flex-col items-center justify-center h-28 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
          dragging ? 'border-blue-500 bg-blue-950/20' : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/40'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input type="file" multiple accept={ACCEPT} className="hidden"
          onChange={(e) => validateAndAdd(e.target.files)} />
        <svg className="w-8 h-8 text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-sm text-gray-400">Drop photos or <span className="text-blue-400 underline">browse</span></p>
        <p className="text-xs text-gray-600 mt-1">JPEG, PNG, WebP, GIF · Max 10MB · Up to {maxFiles}</p>
      </label>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Preview grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {files.map((file, idx) => (
            <div key={idx} className="relative group aspect-square">
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-full h-full object-cover rounded-xl border border-gray-700"
              />
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 hover:bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              >
                ✕
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 rounded-b-xl text-[9px] text-gray-300 p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {file.name}
              </div>
            </div>
          ))}
          {files.length < maxFiles && (
            <label className="aspect-square flex items-center justify-center rounded-xl border border-dashed border-gray-700 hover:border-gray-500 cursor-pointer text-gray-500 hover:text-gray-400 transition-colors">
              <input type="file" multiple accept={ACCEPT} className="hidden"
                onChange={(e) => validateAndAdd(e.target.files)} />
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </label>
          )}
        </div>
      )}

      {files.length > 0 && (
        <p className="text-xs text-gray-600">{files.length}/{maxFiles} photos selected</p>
      )}
    </div>
  )
}
