import { useState, useEffect, useRef } from 'react'
import MDEditor from '@uiw/react-md-editor'
import { Button, Space, Tooltip, message, Modal, Tabs } from 'antd'
import {
  FullscreenOutlined,
  FullscreenExitOutlined,
  SaveOutlined,
  EyeOutlined,
  EditOutlined,
  CopyOutlined,
  PictureOutlined
} from '@ant-design/icons'
import { ImageUpload } from '../ImageUpload'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'

const { TabPane } = Tabs

interface MarkdownEditorProps {
  value?: string
  onChange?: (value: string) => void
  onSave?: (value: string) => void
  placeholder?: string
  height?: number
  autoSave?: boolean
  autoSaveInterval?: number
  readOnly?: boolean
  hideToolbar?: boolean
  preview?: 'live' | 'edit' | 'preview'
  taskId?: number
  enableImageUpload?: boolean
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value = '',
  onChange,
  onSave,
  placeholder = '请输入内容...',
  height = 400,
  autoSave = false,
  autoSaveInterval = 30000, // 30秒
  readOnly = false,
  hideToolbar = false,
  preview = 'live',
  taskId,
  enableImageUpload = false,
}) => {
  const [content, setContent] = useState(value)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [previewMode, setPreviewMode] = useState<'live' | 'edit' | 'preview'>(preview)
  const [lastSaved, setLastSaved] = useState<string>(value)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [imageModalVisible, setImageModalVisible] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const autoSaveTimerRef = useRef<number | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 同步外部value变化
  useEffect(() => {
    if (value !== content) {
      setContent(value)
      setLastSaved(value)
      setHasUnsavedChanges(false)
    }
  }, [value])

  // 内容变化处理
  const handleChange = (val: string = '') => {
    setContent(val)
    setHasUnsavedChanges(val !== lastSaved)
    onChange?.(val)

    // 重置自动保存定时器
    if (autoSave && onSave) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
      autoSaveTimerRef.current = setTimeout(() => {
        handleSave(val)
      }, autoSaveInterval)
    }
  }

  // 保存处理
  const handleSave = (contentToSave?: string) => {
    const saveContent = contentToSave || content
    onSave?.(saveContent)
    setLastSaved(saveContent)
    setHasUnsavedChanges(false)
    message.success('保存成功')

    // 清除自动保存定时器
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
  }

  // 全屏切换
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (editorRef.current?.requestFullscreen) {
        editorRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  // 复制内容
  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      message.success('内容已复制到剪贴板')
    }).catch(() => {
      message.error('复制失败')
    })
  }

  // 预览模式切换
  const togglePreviewMode = () => {
    const modes: Array<'live' | 'edit' | 'preview'> = ['live', 'edit', 'preview']
    const currentIndex = modes.indexOf(previewMode)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    setPreviewMode(nextMode)
  }

  // 插入Markdown文本
  const insertMarkdown = (markdown: string) => {
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = content.substring(0, start) + markdown + content.substring(end)
      setContent(newContent)
      handleChange(newContent)

      // 设置光标位置
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + markdown.length, start + markdown.length)
      }, 0)
    } else {
      // 如果没有textarea引用，直接在末尾添加
      const newContent = content + '\n' + markdown
      setContent(newContent)
      handleChange(newContent)
    }
  }

  // 打开图片上传对话框
  const handleImageUpload = () => {
    if (!taskId) {
      message.warning('请先保存任务后再上传图片')
      return
    }
    setImageModalVisible(true)
  }

  // 清理定时器
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S 保存
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        if (onSave && hasUnsavedChanges) {
          handleSave()
        }
      }
      // F11 全屏
      if (e.key === 'F11') {
        e.preventDefault()
        toggleFullscreen()
      }
      // Ctrl+Shift+P 切换预览模式
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        togglePreviewMode()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [hasUnsavedChanges, previewMode])

  const customToolbar = !hideToolbar && (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '8px 12px',
      borderBottom: '1px solid #d9d9d9',
      backgroundColor: '#fafafa'
    }}>
      <Space>
        <Tooltip title="切换预览模式 (Ctrl+Shift+P)">
          <Button 
            type="text" 
            size="small"
            icon={previewMode === 'edit' ? <EyeOutlined /> : <EditOutlined />}
            onClick={togglePreviewMode}
          >
            {previewMode === 'live' ? '实时预览' : previewMode === 'edit' ? '编辑模式' : '预览模式'}
          </Button>
        </Tooltip>
        <Tooltip title="复制内容">
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={handleCopy}
          />
        </Tooltip>
        {enableImageUpload && (
          <Tooltip title="插入图片">
            <Button
              type="text"
              size="small"
              icon={<PictureOutlined />}
              onClick={handleImageUpload}
              disabled={readOnly}
            />
          </Tooltip>
        )}
      </Space>
      
      <Space>
        {hasUnsavedChanges && (
          <span style={{ fontSize: '12px', color: '#faad14' }}>
            有未保存的更改
          </span>
        )}
        {onSave && (
          <Tooltip title="保存 (Ctrl+S)">
            <Button 
              type="text" 
              size="small"
              icon={<SaveOutlined />}
              onClick={() => handleSave()}
              disabled={!hasUnsavedChanges}
            >
              保存
            </Button>
          </Tooltip>
        )}
        <Tooltip title="全屏 (F11)">
          <Button 
            type="text" 
            size="small"
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={toggleFullscreen}
          />
        </Tooltip>
      </Space>
    </div>
  )

  return (
    <div 
      ref={editorRef}
      className={`markdown-editor ${isFullscreen ? 'fullscreen' : ''}`}
      style={{
        border: '1px solid #d9d9d9',
        borderRadius: '8px',
        overflow: 'hidden',
        ...(isFullscreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          backgroundColor: '#fff',
        })
      }}
    >
      {customToolbar}
      <MDEditor
        value={content}
        onChange={handleChange}
        preview={previewMode}
        hideToolbar
        visibleDragbar={false}
        textareaProps={{
          placeholder,
          style: {
            fontSize: 14,
            lineHeight: 1.6,
            fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
          },
          readOnly,
        }}
        height={isFullscreen ? window.innerHeight - 60 : height}
        data-color-mode="light"
      />

      {/* 图片上传模态框 */}
      <Modal
        title="上传图片"
        open={imageModalVisible}
        onCancel={() => setImageModalVisible(false)}
        footer={null}
        width={600}
      >
        <Tabs defaultActiveKey="upload">
          <TabPane tab="上传图片" key="upload">
            <ImageUpload
              value={uploadedImages}
              onChange={setUploadedImages}
              onInsertMarkdown={(markdown) => {
                insertMarkdown(markdown)
                setImageModalVisible(false)
              }}
              taskId={taskId}
              maxCount={5}
              maxSize={5}
            />
          </TabPane>
          <TabPane tab="使用说明" key="help">
            <div style={{ padding: '16px 0' }}>
              <h4>图片上传说明：</h4>
              <ul>
                <li>支持 JPG、PNG、GIF 等常见图片格式</li>
                <li>单个图片大小不超过 5MB</li>
                <li>一次最多上传 5 张图片</li>
                <li>上传成功后会自动插入 Markdown 格式的图片链接</li>
              </ul>

              <h4>Markdown 图片语法：</h4>
              <pre style={{
                background: '#f5f5f5',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '13px'
              }}>
                {`![图片描述](图片链接)
![示例图片](https://example.com/image.jpg)`}
              </pre>
            </div>
          </TabPane>
        </Tabs>
      </Modal>
    </div>
  )
}

export default MarkdownEditor
