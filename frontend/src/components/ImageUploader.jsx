import { useState } from 'react';
import { uploadImage } from '../api/client.js';
import Button from './Button.jsx';

export default function ImageUploader({ label = '이미지', onUploaded }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  async function handleUpload() {
    if (!file) return;

    setStatus('loading');
    try {
      const result = await uploadImage(file);
      setPreviewUrl(result.imageUrl);
      onUploaded(result.imageUrl);
      setError('');
      setStatus('success');
    } catch (uploadError) {
      setError(uploadError.message);
      setStatus('error');
    }
  }

  return (
    <div className="upload-box">
      <label>
        {label}
        <input
          type="file"
          accept="image/*"
          onChange={(event) => {
            const nextFile = event.target.files?.[0] || null;
            setFile(nextFile);
            setError('');
            setStatus('idle');
            if (nextFile) {
              setPreviewUrl(URL.createObjectURL(nextFile));
            }
          }}
        />
      </label>
      {previewUrl && (
        <div className="upload-preview">
          <img src={previewUrl} alt="업로드 미리보기" />
        </div>
      )}
      <Button type="button" variant="secondary" disabled={!file || status === 'loading'} onClick={handleUpload}>
        {status === 'loading' ? '업로드 중' : '이미지 업로드'}
      </Button>
      {status === 'success' && <p className="helper-text">이미지 URL이 연결되었습니다.</p>}
      {status === 'error' && <p className="helper-text error">{error}</p>}
    </div>
  );
}
