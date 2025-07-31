import React from 'react'
import { Typography } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { useTranslation } from '../../i18n/hooks/useTranslation'
import './ComplianceNotice.css'

const { Text } = Typography

interface ComplianceNoticeProps {
  className?: string
  style?: React.CSSProperties
  size?: 'small' | 'default'
}

/**
 * 合规说明组件
 * 用于在公开/私有设置旁边显示合规提醒
 */
const ComplianceNotice: React.FC<ComplianceNoticeProps> = ({
  className,
  style,
  size = 'small'
}) => {
  const { t } = useTranslation('common')

  return (
    <div 
      className={`compliance-notice ${size} ${className || ''}`}
      style={style}
    >
      <Text 
        type="secondary" 
        className="compliance-text"
        style={{ 
          fontSize: size === 'small' ? '12px' : '13px',
          lineHeight: size === 'small' ? '16px' : '18px'
        }}
      >
        <ExclamationCircleOutlined 
          style={{ 
            marginRight: '4px', 
            color: '#faad14',
            fontSize: size === 'small' ? '12px' : '13px'
          }} 
        />
        {t('compliance.notice')}
      </Text>
    </div>
  )
}

export default ComplianceNotice
