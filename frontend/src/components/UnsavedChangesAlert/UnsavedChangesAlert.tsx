import React from 'react'
import { Alert } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { useTranslation } from '../../i18n/hooks/useTranslation'
import './UnsavedChangesAlert.css'

interface UnsavedChangesAlertProps {
  visible: boolean
  onSave?: () => void
  className?: string
  style?: React.CSSProperties
}

const UnsavedChangesAlert: React.FC<UnsavedChangesAlertProps> = ({
  visible,
  onSave,
  className,
  style
}) => {
  const { tp } = useTranslation('createTask')

  if (!visible) return null

  return (
    <Alert
      message={tp('messages.unsavedChanges')}
      type="warning"
      icon={<ExclamationCircleOutlined />}
      showIcon
      closable={false}
      className={`unsaved-changes-alert ${className || ''}`}
      style={{
        marginBottom: '16px',
        borderRadius: '8px',
        border: '1px solid #faad14',
        background: 'linear-gradient(135deg, #fffbe6 0%, #fff7e6 100%)',
        ...style
      }}
      action={
        onSave ? (
          <span
            onClick={onSave}
            style={{
              color: '#1890ff',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            立即保存
          </span>
        ) : undefined
      }
    />
  )
}

export default UnsavedChangesAlert
