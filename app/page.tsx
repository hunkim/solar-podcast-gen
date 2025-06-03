"use client"

import { useState, useCallback } from "react"
import { Sidebar } from "@/components/sidebar"
import { MainContent } from "@/components/main-content"
import { AuthProvider } from "@/components/auth-provider"

export default function Home() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Use useCallback to memoize these functions to prevent them from
  // being recreated on every render
  const handleSelectProject = useCallback((id: string) => {
    setSelectedProject(id || null)
  }, [])

  const handleNewProject = useCallback(() => {
    setSelectedProject(null)
  }, [])

  return (
    <AuthProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          selectedProject={selectedProject}
          onSelectProject={handleSelectProject}
          onNewProject={handleNewProject}
        />
        <MainContent
          selectedProject={selectedProject}
          onNewProject={handleNewProject}
          sidebarOpen={sidebarOpen}
        />
      </div>
    </AuthProvider>
  )
}
