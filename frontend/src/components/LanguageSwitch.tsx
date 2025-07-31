import React from 'react'
import { Select } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import { useTranslation } from '../i18n/hooks/useTranslation'
import { changeLanguage, getLanguageDisplayName, type SupportedLanguage } from '../i18n'

const { Option } = Select

interface LanguageSwitchProps {
  style?: React.CSSProperties
  size?: 'small' | 'middle' | 'large'
  showIcon?: boolean
}

const LanguageSwitch: React.FC<LanguageSwitchProps> = ({ 
  style, 
  size = 'middle', 
  showIcon = true 
}) => {
  const { language } = useTranslation()

  const handleLanguageChange = async (newLanguage: SupportedLanguage) => {
    await changeLanguage(newLanguage)
    // 刷新页面以确保所有组件都使用新语言
    window.location.reload()
  }

  return (
    <Select
      value={language}
      onChange={handleLanguageChange}
      style={{ minWidth: 120, ...style }}
      size={size}
      suffixIcon={showIcon ? <GlobalOutlined /> : undefined}
    >
      <Option value="zh-CN">{getLanguageDisplayName('zh-CN')}</Option>
      <Option value="en">{getLanguageDisplayName('en')}</Option>
    </Select>
  )
}

export default LanguageSwitch
