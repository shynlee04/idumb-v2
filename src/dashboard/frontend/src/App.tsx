/**
 * App — Root component with React Router + QueryClient.
 *
 * Dashboard-first landing: root "/" goes to DashboardPage (per user decision).
 * AppShell provides the sidebar + outlet layout for all pages.
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AppShell } from "@/components/layout/AppShell"
import { DashboardPage } from "@/pages/DashboardPage"
import { ChatPage } from "@/pages/ChatPage"
import { TasksPage } from "@/pages/TasksPage"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 5000,
      staleTime: 2000,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:sessionId" element={<ChatPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/tasks/:taskId" element={<TasksPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
