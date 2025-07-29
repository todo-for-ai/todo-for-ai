import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/Layout'
import { ThemeProvider } from './contexts/ThemeContext'
import {
  Dashboard,
  Projects,
  ProjectDetail,
  CreateProject,
  Tasks,
  TaskDetail,
  CreateTask,
  Settings,
  ContextRules,
  CreateContextRule,
  MCPInstallation,
  APIDocumentation
} from './pages'

function App() {
  return (
    <ThemeProvider options={{
      enablePersistence: true,
      defaultThemeId: 'default',
      followSystemDarkMode: true,
      storageKey: 'todo-for-ai-theme'
    }}>
      <Router>
        <Routes>
          {/* 根目录重定向 */}
          <Route path="/" element={<Navigate to="/todo-for-ai/pages" replace />} />

          <Route path="/todo-for-ai/pages" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/create" element={<CreateProject />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="projects/:id/edit" element={<CreateProject />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="tasks/create" element={<CreateTask />} />
            <Route path="tasks/:id" element={<TaskDetail />} />
            <Route path="tasks/:id/edit" element={<CreateTask />} />
            <Route path="context-rules" element={<ContextRules />} />
            <Route path="context-rules/create" element={<CreateContextRule />} />
            <Route path="context-rules/:id/edit" element={<CreateContextRule />} />
            <Route path="mcp-installation" element={<MCPInstallation />} />
            <Route path="api-documentation" element={<APIDocumentation />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* 捕获所有未匹配的路由，重定向到首页 */}
          <Route path="*" element={<Navigate to="/todo-for-ai/pages" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App
