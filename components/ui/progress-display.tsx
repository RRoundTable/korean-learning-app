// 진행도 표시 컴포넌트

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Play, 
  SkipForward, 
  Trophy,
  Star,
  Target,
  TrendingUp,
  Award
} from 'lucide-react'
import { Card, CardContent } from './card'
import { Progress } from './progress'
import { Badge } from './badge'
import { Button } from './button'
import { 
  SessionProgress, 
  TaskProgress, 
  ProgressMetrics,
  TaskStatus 
} from '@/lib/types/progress'

const TASK_STATUS_ICONS = {
  pending: Clock,
  in_progress: Play,
  completed: CheckCircle,
  failed: XCircle,
  skipped: SkipForward
}

const TASK_STATUS_COLORS = {
  pending: 'text-muted-foreground',
  in_progress: 'text-blue-500',
  completed: 'text-green-500',
  failed: 'text-red-500',
  skipped: 'text-yellow-500'
}

interface TaskProgressItemProps {
  task: TaskProgress
  taskName: string
  isActive: boolean
  onClick?: () => void
}

export function TaskProgressItem({ task, taskName, isActive, onClick }: TaskProgressItemProps) {
  const IconComponent = TASK_STATUS_ICONS[task.status]
  const colorClass = TASK_STATUS_COLORS[task.status]

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
        isActive 
          ? 'border-primary bg-primary/5 shadow-md' 
          : 'border-border hover:border-primary/50'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <motion.div
          animate={task.status === 'in_progress' ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <IconComponent className={`w-5 h-5 ${colorClass}`} />
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm truncate">{taskName}</h4>
            {task.score && (
              <Badge variant="secondary" className="ml-2">
                {task.score}/10
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {task.attempts > 0 && (
              <span>시도 {task.attempts}/{task.maxAttempts}</span>
            )}
            {task.timeSpent > 0 && (
              <span>{Math.round(task.timeSpent / 1000)}초</span>
            )}
            {task.status === 'failed' && task.errors.length > 0 && (
              <span className="text-red-500">오류 {task.errors.length}개</span>
            )}
          </div>

          {task.feedback && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {task.feedback}
            </p>
          )}
        </div>

        {task.status === 'in_progress' && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
          />
        )}
      </div>
    </motion.div>
  )
}

interface ProgressOverviewProps {
  metrics: ProgressMetrics
  achievementLevel: {
    level: number
    title: string
    description: string
    nextLevelProgress: number
  }
}

export function ProgressOverview({ metrics, achievementLevel }: ProgressOverviewProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* 성취도 레벨 */}
          <div className="text-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center gap-2 mb-2"
            >
              <Award className="w-6 h-6 text-yellow-500" />
              <span className="text-lg font-bold">레벨 {achievementLevel.level}</span>
            </motion.div>
            <h3 className="font-medium text-primary">{achievementLevel.title}</h3>
            <p className="text-sm text-muted-foreground">{achievementLevel.description}</p>
            
            {achievementLevel.level < 5 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>다음 레벨까지</span>
                  <span>{Math.round(achievementLevel.nextLevelProgress)}%</span>
                </div>
                <Progress value={achievementLevel.nextLevelProgress} className="h-2" />
              </div>
            )}
          </div>

          {/* 주요 메트릭스 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">완료율</span>
              </div>
              <p className="text-xl font-bold text-green-500">
                {Math.round(metrics.completionRate)}%
              </p>
            </div>

            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">평균 점수</span>
              </div>
              <p className="text-xl font-bold text-yellow-500">
                {metrics.averageScore.toFixed(1)}/10
              </p>
            </div>

            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">연속 성공</span>
              </div>
              <p className="text-xl font-bold text-blue-500">
                {metrics.currentStreak}
              </p>
            </div>

            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">소요 시간</span>
              </div>
              <p className="text-xl font-bold text-purple-500">
                {Math.round(metrics.totalTimeSpent / 60000)}분
              </p>
            </div>
          </div>

          {/* 상세 통계 */}
          <div className="pt-3 border-t border-border">
            <div className="flex justify-between text-sm">
              <span className="text-green-500">✅ 성공: {metrics.successfulTasks}</span>
              <span className="text-red-500">❌ 실패: {metrics.failedTasks}</span>
              <span className="text-yellow-500">⏭️ 건너뜀: {metrics.skippedTasks}</span>
            </div>
            
            {metrics.bestStreak > 0 && (
              <div className="text-center mt-2">
                <Badge variant="outline" className="text-xs">
                  <Trophy className="w-3 h-3 mr-1" />
                  최고 연속 성공: {metrics.bestStreak}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface TaskListProgressProps {
  session: SessionProgress
  taskNames: { [taskId: string]: string }
  onTaskClick?: (taskId: string) => void
}

export function TaskListProgress({ session, taskNames, onTaskClick }: TaskListProgressProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">작업 진행도</h3>
            <Badge variant="outline">
              {session.currentTaskIndex + 1} / {session.totalTasks}
            </Badge>
          </div>

          <div className="space-y-2">
            <AnimatePresence>
              {session.tasks.map((task, index) => (
                <TaskProgressItem
                  key={task.taskId}
                  task={task}
                  taskName={taskNames[task.taskId] || `작업 ${index + 1}`}
                  isActive={index === session.currentTaskIndex}
                  onClick={() => onTaskClick?.(task.taskId)}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* 전체 진행률 */}
          <div className="pt-3 border-t border-border">
            <div className="flex justify-between text-sm mb-2">
              <span>전체 진행률</span>
              <span>{Math.round((session.currentTaskIndex / session.totalTasks) * 100)}%</span>
            </div>
            <Progress 
              value={(session.currentTaskIndex / session.totalTasks) * 100} 
              className="h-2"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface SessionCompleteProps {
  session: SessionProgress
  metrics: ProgressMetrics
  achievementLevel: {
    level: number
    title: string
    description: string
    nextLevelProgress: number
  }
  onRestart?: () => void
  onContinue?: () => void
}

export function SessionComplete({ 
  session, 
  metrics, 
  achievementLevel, 
  onRestart, 
  onContinue 
}: SessionCompleteProps) {
  const completedTasks = session.tasks.filter(t => t.status === 'completed')
  const totalScore = completedTasks.reduce((sum, task) => sum + (task.score || 0), 0)
  const sessionDuration = session.completedAt 
    ? session.completedAt.getTime() - session.startedAt.getTime()
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center p-6"
    >
      <motion.div
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
      </motion.div>

      <h2 className="text-2xl font-bold mb-2">세션 완료!</h2>
      <p className="text-muted-foreground mb-6">
        훌륭한 한국어 회화 연습이었습니다!
      </p>

      {/* 결과 요약 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{totalScore}</p>
            <p className="text-sm text-muted-foreground">총 점수</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{Math.round(sessionDuration / 60000)}</p>
            <p className="text-sm text-muted-foreground">소요 시간 (분)</p>
          </CardContent>
        </Card>
      </div>

      {/* 성취도 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Award className="w-6 h-6 text-yellow-500" />
            <span className="text-lg font-bold">레벨 {achievementLevel.level} - {achievementLevel.title}</span>
          </div>
          <p className="text-sm text-muted-foreground">{achievementLevel.description}</p>
        </CardContent>
      </Card>

      {/* 액션 버튼 */}
      <div className="flex gap-3 justify-center">
        {onRestart && (
          <Button variant="outline" onClick={onRestart}>
            다시 연습하기
          </Button>
        )}
        {onContinue && (
          <Button onClick={onContinue}>
            다음 시나리오
          </Button>
        )}
      </div>
    </motion.div>
  )
}
