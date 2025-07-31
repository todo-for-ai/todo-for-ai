import React, { useState } from 'react'
import { MessageOutlined } from '@ant-design/icons'
import { Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'
import './WeChatGroup.css'

interface WeChatGroupProps {
  className?: string
}

const WeChatGroup: React.FC<WeChatGroupProps> = ({ className }) => {
  const { t, i18n } = useTranslation()
  const [isHovered, setIsHovered] = useState(false)

  // 只在简体中文模式下显示
  if (i18n.language !== 'zh-CN') {
    return null
  }

  return (
    <div 
      className={`wechat-group-widget ${className || ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Tooltip 
        title={t('wechatGroup.tooltip', 'Join AI Discussion Group')}
        placement="left"
      >
        <div className="wechat-group-icon">
          <MessageOutlined />
          <span className="wechat-group-text">AI交流群</span>
        </div>
      </Tooltip>
      
      {isHovered && (
        <div className="wechat-group-qr-popup">
          <div className="qr-popup-content">
            <div className="qr-popup-header">
              <h4>{t('wechatGroup.title', '加入AI交流群')}</h4>
            </div>
            <div className="qr-popup-body">
              <img 
                src="/images/wechat-group-qr.png" 
                alt={t('wechatGroup.qrAlt', 'WeChat Group QR Code')}
                className="qr-code-image"
              />
              <p className="qr-popup-description">
                {t('wechatGroup.description', '扫描二维码加入微信群，反馈问题和建议')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WeChatGroup
