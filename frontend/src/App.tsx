import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/Layout'
import {
  Dashboard,
  Projects,
  ProjectDetail,
  Tasks,
  TaskDetail,
  CreateTask,
  Kanban,
  Settings,
  ContextRules
} from './pages'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="tasks/create" element={<CreateTask />} />
          <Route path="tasks/:id" element={<TaskDetail />} />
          <Route path="tasks/:id/edit" element={<CreateTask />} />
          <Route path="kanban" element={<Kanban />} />
          <Route path="context-rules" element={<ContextRules />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
