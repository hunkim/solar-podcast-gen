"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { MainContent } from "@/components/main-content"
import { AuthProvider } from "@/components/auth-provider"

export default function Home() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <AuthProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          selectedProject={selectedProject}
          onSelectProject={setSelectedProject}
          onNewProject={() => setSelectedProject(null)}
        />
        <MainContent
          selectedProject={selectedProject}
          onNewProject={() => setSelectedProject(null)}
          sidebarOpen={sidebarOpen}
        />
      </div>
    </AuthProvider>
  )
}
