import { useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useTask, useTasks } from "@/hooks/useTasks"
import { TaskSidebar } from "@/components/tasks/TaskSidebar"
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel"

export function TasksPage() {
  const navigate = useNavigate()
  const { taskId } = useParams<{ taskId: string }>()
  const { data: snapshot } = useTasks()
  const { data: selectedTaskResponse } = useTask(taskId)

  const allTasks = snapshot?.tasks ?? []

  const selectedTask = useMemo(() => {
    if (selectedTaskResponse?.task) return selectedTaskResponse.task
    if (!taskId) return null
    return allTasks.find((task) => task.id === taskId) ?? null
  }, [selectedTaskResponse, allTasks, taskId])

  return (
    <div className="flex h-full">
      <div className="w-80 min-w-[20rem]">
        <TaskSidebar
          snapshot={snapshot}
          selectedTaskId={taskId}
          onSelectTask={(id) => navigate(`/tasks/${id}`)}
        />
      </div>
      <div className="min-w-0 flex-1">
        <TaskDetailPanel task={selectedTask} />
      </div>
    </div>
  )
}
