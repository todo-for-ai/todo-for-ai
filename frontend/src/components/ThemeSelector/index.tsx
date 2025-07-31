import React, { useState } from 'react'
import { Button, Dropdown, Card, Space, Typography, Tooltip, Modal } from 'antd'
import {
  BgColorsOutlined,
  CheckOutlined,
  EyeOutlined,
  MoonOutlined,
  SunOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useThemeContext } from '../../contexts/ThemeContext'
import type { Theme } from '../../types/theme'
import './ThemeSelector.css'

const { Text, Title } = Typography

interface ThemeSelectorProps {
  // 显示模式：按钮 | 下拉菜单 | 卡片网格
  mode?: 'button' | 'dropdown' | 'grid'
  // 是否显示预览
  showPreview?: boolean
  // 是否显示主题描述
  showDescription?: boolean
  // 自定义样式
  style?: React.CSSProperties
  // 自定义类名
  className?: string
  // 按钮大小
  size?: 'small' | 'middle' | 'large'
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  mode = 'button',
  // showPreview = true,  // 暂时注释掉未使用的参数
  showDescription = true,
  style,
  className,
  size = 'middle'
}) => {
  const { t } = useTranslation()
  const { currentTheme, availableThemes, setTheme, isDarkMode, toggleDarkMode } = useThemeContext()
  const [previewModalVisible, setPreviewModalVisible] = useState(false)
  const [previewTheme, setPreviewTheme] = useState<Theme | null>(null)

  // 获取主题的翻译名称
  const getThemeName = (theme: Theme) => {
    return t(`themes.${theme.id}`, theme.name)
  }

  // 主题预览卡片
  const ThemePreviewCard: React.FC<{ theme: Theme; isActive?: boolean; onClick?: () => void }> = ({ 
    theme, 
    isActive = false, 
    onClick 
  }) => (
    <Card
      className={`theme-preview-card ${isActive ? 'active' : ''}`}
      size="small"
      hoverable
      onClick={onClick}
      style={{
        width: 200,
        cursor: 'pointer',
        border: isActive ? `2px solid ${theme.colors.primary}` : '1px solid #d9d9d9'
      }}
      actions={[
        <Tooltip title={t('themes.selector.previewTheme')} key="preview">
          <EyeOutlined onClick={(e) => {
            e.stopPropagation()
            setPreviewTheme(theme)
            setPreviewModalVisible(true)
          }} />
        </Tooltip>,
        <Tooltip title={isActive ? t('themes.selector.currentTheme') : t('themes.selector.applyTheme')} key="apply">
          {isActive ? <CheckOutlined style={{ color: theme.colors.primary }} /> : <SettingOutlined />}
        </Tooltip>
      ]}
    >
      <div className="theme-preview-content">
        {/* 主题色彩预览 */}
        <div className="theme-colors" style={{ marginBottom: '12px' }}>
          <div className="color-strip">
            <div 
              className="color-block" 
              style={{ backgroundColor: theme.colors.primary }}
              title="主色"
            />
            <div 
              className="color-block" 
              style={{ backgroundColor: theme.colors.editorBackground }}
              title="背景色"
            />
            <div 
              className="color-block" 
              style={{ backgroundColor: theme.colors.textPrimary }}
              title="文字色"
            />
            <div 
              className="color-block" 
              style={{ backgroundColor: theme.colors.codeText }}
              title="代码色"
            />
          </div>
        </div>
        
        {/* 主题信息 */}
        <div className="theme-info">
          <Title level={5} style={{ margin: 0, fontSize: '14px' }}>
            {getThemeName(theme)}
            {theme.isDark && <MoonOutlined style={{ marginLeft: '4px', fontSize: '12px' }} />}
            {!theme.isDark && <SunOutlined style={{ marginLeft: '4px', fontSize: '12px' }} />}
          </Title>
          {showDescription && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {theme.description}
            </Text>
          )}
        </div>
      </div>
    </Card>
  )

  // 下拉菜单项
  const dropdownItems = availableThemes.map(theme => ({
    key: theme.id,
    label: (
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          minWidth: '180px'
        }}
      >
        <Space>
          <div 
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: theme.colors.primary,
              border: '1px solid #d9d9d9'
            }}
          />
          <span>{getThemeName(theme)}</span>
          {theme.isDark && <MoonOutlined style={{ fontSize: '12px' }} />}
        </Space>
        {currentTheme.id === theme.id && <CheckOutlined style={{ color: theme.colors.primary }} />}
      </div>
    ),
    onClick: () => setTheme(theme.id)
  }))

  // 按钮模式
  if (mode === 'button') {
    return (
      <Space style={style} className={className}>
        <Dropdown
          menu={{ items: dropdownItems }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Button 
            icon={<BgColorsOutlined />} 
            size={size}
            type="text"
          >
            {getThemeName(currentTheme)}
          </Button>
        </Dropdown>
        
        <Tooltip title={isDarkMode ? t('themes.selector.switchToLight') : t('themes.selector.switchToDark')}>
          <Button 
            icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
            size={size}
            type="text"
            onClick={toggleDarkMode}
          />
        </Tooltip>
      </Space>
    )
  }

  // 下拉菜单模式
  if (mode === 'dropdown') {
    return (
      <div style={style} className={className}>
        <Dropdown
          menu={{ items: dropdownItems }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Button icon={<BgColorsOutlined />} size={size}>
            {t('themes.selector.theme')}: {getThemeName(currentTheme)}
          </Button>
        </Dropdown>
      </div>
    )
  }

  // 网格模式
  return (
    <div style={style} className={className}>
      <div className="theme-grid">
        {availableThemes.map(theme => (
          <ThemePreviewCard
            key={theme.id}
            theme={theme}
            isActive={currentTheme.id === theme.id}
            onClick={() => setTheme(theme.id)}
          />
        ))}
      </div>

      {/* 主题预览模态框 */}
      <Modal
        title={`${t('themes.selector.previewTheme')}: ${previewTheme ? getThemeName(previewTheme) : ''}`}
        open={previewModalVisible}
        onCancel={() => {
          setPreviewModalVisible(false)
          setPreviewTheme(null)
        }}
        footer={[
          <Button key="cancel" onClick={() => setPreviewModalVisible(false)}>
            {t('themes.selector.cancel')}
          </Button>,
          <Button
            key="apply"
            type="primary"
            onClick={() => {
              if (previewTheme) {
                setTheme(previewTheme.id)
              }
              setPreviewModalVisible(false)
              setPreviewTheme(null)
            }}
          >
            {t('themes.selector.applyTheme')}
          </Button>
        ]}
        width={800}
      >
        {previewTheme && (
          <div className="theme-preview-modal">
            <div className="preview-info" style={{ marginBottom: '16px' }}>
              <Space direction="vertical" size="small">
                <Text><strong>主题名称:</strong> {getThemeName(previewTheme)}</Text>
                <Text><strong>主题描述:</strong> {previewTheme.description}</Text>
                <Text><strong>主题类型:</strong> {previewTheme.isDark ? '深色主题' : '浅色主题'}</Text>
              </Space>
            </div>
            
            <div className="preview-colors">
              <Title level={5}>色彩方案</Title>
              <div className="color-palette">
                {Object.entries(previewTheme.colors).slice(0, 8).map(([key, color]) => (
                  <div key={key} className="color-item">
                    <div 
                      className="color-swatch" 
                      style={{ backgroundColor: color }}
                    />
                    <Text style={{ fontSize: '12px' }}>{key}</Text>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="preview-sample" style={{ marginTop: '16px' }}>
              <Title level={5}>样式预览</Title>
              <div 
                className="sample-content"
                style={{
                  padding: '16px',
                  backgroundColor: previewTheme.colors.editorBackground,
                  border: `1px solid ${previewTheme.colors.editorBorder}`,
                  borderRadius: previewTheme.borders.borderRadius,
                  fontFamily: previewTheme.fonts.fontFamily,
                  fontSize: previewTheme.fonts.fontSize,
                  lineHeight: previewTheme.fonts.lineHeight,
                  color: previewTheme.colors.textPrimary
                }}
              >
                <h3 style={{ color: previewTheme.colors.textPrimary, margin: '0 0 12px 0' }}>
                  {t('themes.selector.sampleTitle')}
                </h3>
                <p style={{ color: previewTheme.colors.textSecondary, margin: '0 0 12px 0' }}>
                  {t('themes.selector.sampleText')}
                </p>
                <code 
                  style={{
                    background: previewTheme.colors.codeBackground,
                    color: previewTheme.colors.codeText,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontFamily: previewTheme.fonts.codeFontFamily
                  }}
                >
                  console.log('Hello Theme!')
                </code>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ThemeSelector
