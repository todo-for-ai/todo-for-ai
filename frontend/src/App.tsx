import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/Layout'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthGuard } from './components/AuthGuard'
import {
  Dashboard,
  Projects,
  ProjectDetail,
  CreateProject,
  TaskDetail,
  CreateTask,
  Kanban,
  Settings,
  ContextRules,
  CreateContextRule,
  RuleMarketplace,
  MCPInstallation,
  APIDocumentation
} from './pages'
import Login from './pages/Login'
import Profile from './pages/Profile'
import UserManagement from './pages/UserManagement'
import TermsOfService from './pages/TermsOfService'
import PrivacyPolicy from './pages/PrivacyPolicy'

function App() {
  return (
    <ThemeProvider options={{
      enablePersistence: true,
      defaultThemeId: 'default',
      followSystemDarkMode: true,
      storageKey: 'milkdown-theme-id'
    }}>
      <Router>
        <Routes>
          {/* 根目录重定向 */}
          <Route path="/" element={<Navigate to="/todo-for-ai/pages" replace />} />

          {/* 公开页面 - 不需要认证 */}
          <Route path="/todo-for-ai/pages/login" element={<Login />} />
          <Route path="/todo-for-ai/pages/terms" element={<TermsOfService />} />
          <Route path="/todo-for-ai/pages/privacy" element={<PrivacyPolicy />} />

          {/* 主应用 - 需要认证 */}
          <Route path="/todo-for-ai/pages" element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }>
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/create" element={<CreateProject />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="projects/:id/edit" element={<CreateProject />} />
            <Route path="tasks/create" element={<CreateTask />} />
            <Route path="tasks/:id" element={<TaskDetail />} />
            <Route path="tasks/:id/edit" element={<CreateTask />} />
            <Route path="kanban" element={<Kanban />} />
            <Route path="context-rules" element={<ContextRules />} />
            <Route path="context-rules/create" element={<CreateContextRule />} />
            <Route path="context-rules/:id/edit" element={<CreateContextRule />} />
            <Route path="rule-marketplace" element={<RuleMarketplace />} />
            <Route path="mcp-installation" element={<MCPInstallation />} />
            <Route path="api-documentation" element={<APIDocumentation />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
            <Route path="user-management" element={<UserManagement />} />
          </Route>

          {/* 捕获所有未匹配的路由，重定向到首页 */}
          <Route path="*" element={<Navigate to="/todo-for-ai/pages" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App
