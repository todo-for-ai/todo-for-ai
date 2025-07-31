import React from 'react'
import { Layout } from 'antd'
import { GithubOutlined } from '@ant-design/icons'
import { useTranslation } from '../../i18n/hooks/useTranslation'
import './Footer.css'

const { Footer: AntFooter } = Layout

interface FooterProps {
  className?: string
  style?: React.CSSProperties
}

const Footer: React.FC<FooterProps> = ({ className, style }) => {
  const { tc } = useTranslation()

  const currentYear = new Date().getFullYear()
  const version = 'v1.0'

  return (
    <AntFooter
      className={`app-footer ${className || ''}`}
      style={{
        textAlign: 'center',
        padding: '12px 24px',
        background: '#f5f5f5',
        borderTop: '1px solid #e8e8e8',
        fontSize: '13px',
        color: '#666',
        lineHeight: '1.4',
        ...style
      }}
    >
      <div className="footer-content">
        <span className="footer-version">
          {tc('footer.version')} {version}
        </span>
        <span className="footer-separator">•</span>
        <span className="footer-copyright">
          {tc('footer.copyright')} © {currentYear}
        </span>
        <a
          href="https://github.com/todo-for-ai/todo-for-ai"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-github-link"
          title={tc('footer.visitGitHub')}
        >
          <GithubOutlined />
          <span className="footer-github-text">Todo for AI</span>
        </a>
      </div>
    </AntFooter>
  )
}

export default Footer
