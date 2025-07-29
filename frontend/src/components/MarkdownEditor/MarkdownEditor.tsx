import { useState } from 'react'
import { Button, Tooltip, message, Modal, Tabs } from 'antd'
import {
  PictureOutlined
} from '@ant-design/icons'
import { ImageUpload } from '../ImageUpload'
import MilkdownEditor from '../MilkdownEditor'

const { TabPane } = Tabs

interface MarkdownEditorProps {
  value?: string
  onChange?: (value: string) => void
  onSave?: (value: string) => void
  placeholder?: string
  height?: number
  minHeight?: string | number
  maxHeight?: string | number
  autoHeight?: boolean
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
  minHeight,
  maxHeight,
  autoHeight = false,
  autoSave = false,
  autoSaveInterval = 30000, // 30秒
  readOnly = false,
  hideToolbar = false,
  preview = 'live',
  taskId,
  enableImageUpload = false,
}) => {
  const [imageModalVisible, setImageModalVisible] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])

  // 插入Markdown文本
  const insertMarkdown = (markdown: string) => {
    // 简单地在末尾添加内容
    const newContent = value + '\n' + markdown
    onChange?.(newContent)
  }

  // 打开图片上传对话框
  const handleImageUpload = () => {
    if (!taskId) {
      message.warning('请先保存任务后再上传图片')
      return
    }
    setImageModalVisible(true)
  }

  return (
    <div style={{ position: 'relative' }}>
      <MilkdownEditor
        value={value}
        onChange={onChange}
        onSave={onSave}
        placeholder={placeholder}
        height={height}
        minHeight={minHeight}
        maxHeight={maxHeight}
        autoHeight={autoHeight}
        readOnly={readOnly}
        hideToolbar={hideToolbar}
        preview={preview}
        autoSave={autoSave}
        autoSaveInterval={autoSaveInterval}
        taskId={taskId}
        enableImageUpload={enableImageUpload}
      />

      {/* 图片上传按钮 - 如果启用了图片上传且没有隐藏工具栏 */}
      {enableImageUpload && !hideToolbar && !readOnly && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '60px',
          zIndex: 10
        }}>
          <Tooltip title="插入图片">
            <Button
              type="text"
              size="small"
              icon={<PictureOutlined />}
              onClick={handleImageUpload}
            />
          </Tooltip>
        </div>
      )}

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
