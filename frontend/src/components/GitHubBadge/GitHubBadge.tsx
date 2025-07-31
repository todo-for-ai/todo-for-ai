import React from 'react'
import { Button, Tooltip } from 'antd'
import { GithubOutlined } from '@ant-design/icons'
import { useTranslation } from '../../i18n/hooks/useTranslation'
import './GitHubBadge.css'

interface GitHubBadgeProps {
  repositoryUrl?: string
  className?: string
  style?: React.CSSProperties
}

const GitHubBadge: React.FC<GitHubBadgeProps> = ({
  repositoryUrl = 'https://github.com/todo-for-ai/todo-for-ai',
  className,
  style
}) => {
  const { tc } = useTranslation()

  const handleClick = () => {
    window.open(repositoryUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <Tooltip title={tc('github.visitRepository')} placement="bottom">
      <Button
        type="text"
        icon={<GithubOutlined />}
        onClick={handleClick}
        className={`github-badge ${className || ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          color: '#666',
          fontSize: '18px',
          transition: 'all 0.2s ease',
          ...style
        }}
        aria-label={tc('github.visitRepository')}
      />
    </Tooltip>
  )
}

export default GitHubBadge
