export type LearningTask = {
  id: string
  ko: string
  en?: string
  status: 'pending' | 'success' | 'failed'
}

export type ScenarioConstraints = {
  priceLimit?: number
  bannedDrinks?: string[]
  preferred?: string[]
}

export type Scenario = {
  id: string
  title: string
  titleEn?: string
  description?: string
  constraints: ScenarioConstraints
  tasks: LearningTask[]
}

export type Progress = {
  completed: number
  total: number
}

export type UserState = {
  currentTaskId: string
  currentTaskIndex: number
  taskStatuses: Record<string, LearningTask['status']>
  attempts: number
  lastUserText?: string
}

// 하드코딩된 커피숍 시나리오
export const coffeeShopScenario: Scenario = {
  id: "coffee-shop-1",
  title: "아늑한 동네 카페에서",
  titleEn: "At a Cozy Neighborhood Cafe",
  description: "커피숍에서 조건에 맞는 음료를 주문하는 연습을 해보세요.",
  constraints: {
    priceLimit: 5000,
    bannedDrinks: ["energy drink", "에너지 드링크"],
    preferred: ["latte", "라떼", "아메리카노", "americano"]
  },
  tasks: [
    {
      id: "t-0",
      ko: "직원에게 인사하고 메뉴를 요청하세요",
      en: "Greet the staff and ask for the menu",
      status: "pending"
    },
    {
      id: "t-1", 
      ko: "가격을 확인하세요",
      en: "Check the price",
      status: "pending"
    },
    {
      id: "t-2",
      ko: "금지된 음료를 피하고 선호 음료를 선택하세요",
      en: "Avoid banned drinks and choose preferred drinks",
      status: "pending"
    },
    {
      id: "t-3",
      ko: "최종 주문을 완료하세요",
      en: "Complete your final order",
      status: "pending"
    }
  ]
}

// 초기 사용자 상태
export const createInitialUserState = (scenario: Scenario): UserState => ({
  currentTaskId: scenario.tasks[0]?.id || "",
  currentTaskIndex: 0,
  taskStatuses: scenario.tasks.reduce((acc, task) => {
    acc[task.id] = "pending"
    return acc
  }, {} as Record<string, LearningTask['status']>),
  attempts: 0
})

// 진행도 계산
export const calculateProgress = (userState: UserState, scenario: Scenario): Progress => {
  const completed = Object.values(userState.taskStatuses).filter(status => status === "success").length
  return {
    completed,
    total: scenario.tasks.length
  }
}

// 다음 작업으로 이동
export const getNextTask = (currentTaskIndex: number, scenario: Scenario): LearningTask | null => {
  const nextIndex = currentTaskIndex + 1
  return nextIndex < scenario.tasks.length ? scenario.tasks[nextIndex] : null
}

// 현재 작업 가져오기
export const getCurrentTask = (userState: UserState, scenario: Scenario): LearningTask | null => {
  return scenario.tasks.find(task => task.id === userState.currentTaskId) || null
}
