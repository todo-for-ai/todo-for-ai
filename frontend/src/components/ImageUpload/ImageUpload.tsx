import { useState } from 'react'
import { Upload, message, Modal, Progress } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'
import { api } from '../../api'

interface ImageUploadProps {
  value?: string[]
  onChange?: (urls: string[]) => void
  onInsertMarkdown?: (markdown: string) => void
  maxCount?: number
  maxSize?: number // MB
  taskId?: number
  disabled?: boolean
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value = [],
  onChange,
  onInsertMarkdown,
  maxCount = 10,
  maxSize = 5,
  taskId,
  disabled = false,
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewImage, setPreviewImage] = useState('')
  const [previewTitle, setPreviewTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // 获取base64预览
  const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })

  // 预览图片
  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj as File)
    }

    setPreviewImage(file.url || (file.preview as string))
    setPreviewVisible(true)
    setPreviewTitle(file.name || file.url!.substring(file.url!.lastIndexOf('/') + 1))
  }

  // 文件上传前验证
  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/')
    if (!isImage) {
      message.error('只能上传图片文件!')
      return false
    }

    const isLtMaxSize = file.size / 1024 / 1024 < maxSize
    if (!isLtMaxSize) {
      message.error(`图片大小不能超过 ${maxSize}MB!`)
      return false
    }

    return true
  }

  // 自定义上传
  const customUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError, onProgress } = options
    
    if (!taskId) {
      message.error('请先保存任务后再上传图片')
      onError?.(new Error('Task ID is required'))
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const response = await api.upload(
        `/api/tasks/${taskId}/attachments`,
        file as File,
        (progress) => {
          setUploadProgress(progress)
          onProgress?.({ percent: progress })
        }
      )

      if (response.data) {
        const imageUrl = response.data.file_path
        const newUrls = [...value, imageUrl]
        onChange?.(newUrls)
        
        // 自动插入Markdown
        if (onInsertMarkdown) {
          const filename = response.data.original_filename
          const markdown = `![${filename}](${imageUrl})`
          onInsertMarkdown(markdown)
        }

        onSuccess?.(response.data)
        message.success('图片上传成功')
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      onError?.(error)
      message.error(error.response?.data?.error?.message || '图片上传失败')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // 文件列表变化
  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList)
  }

  // 删除图片
  const handleRemove = (file: UploadFile) => {
    const newUrls = value.filter(url => url !== file.url)
    onChange?.(newUrls)
  }

  // 上传按钮
  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>上传图片</div>
    </div>
  )

  return (
    <>
      <Upload
        listType="picture-card"
        fileList={fileList}
        onPreview={handlePreview}
        onChange={handleChange}
        onRemove={handleRemove}
        beforeUpload={beforeUpload}
        customRequest={customUpload}
        disabled={disabled || uploading}
        maxCount={maxCount}
        multiple
        accept="image/*"
      >
        {fileList.length >= maxCount ? null : uploadButton}
      </Upload>

      {uploading && (
        <div style={{ marginTop: 16 }}>
          <Progress 
            percent={uploadProgress} 
            status="active"
            format={(percent) => `上传中 ${percent}%`}
          />
        </div>
      )}

      <Modal
        open={previewVisible}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        centered
      >
        <img 
          alt="preview" 
          style={{ width: '100%' }} 
          src={previewImage} 
        />
      </Modal>

      {value.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>已上传的图片:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {value.map((url, index) => (
              <div 
                key={index}
                style={{
                  position: 'relative',
                  width: 80,
                  height: 80,
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
              >
                <img 
                  src={url} 
                  alt={`image-${index}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onClick={() => {
                    setPreviewImage(url)
                    setPreviewTitle(`图片 ${index + 1}`)
                    setPreviewVisible(true)
                  }}
                />
                <div 
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    padding: '2px 4px',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    const newUrls = value.filter((_, i) => i !== index)
                    onChange?.(newUrls)
                  }}
                >
                  <DeleteOutlined />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export default ImageUpload
