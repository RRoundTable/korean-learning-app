export interface InitialMessage {
  text: string
  translation: string
}

export interface Task {
  ko: string
  en: string
}

export interface Scenario {
  id: number
  title: string
  titleEn: string
  role: string
  userRole: string
  description: string
  descriptionEn: string
  emoji: string
  isFree: boolean
  initialMessage?: InitialMessage
  tasks?: Task[]
  ttsVoice?: string
  ttsInstructions?: string
  sttPrompt?: string
}

export const scenarios: Scenario[] = [
  {
    id: 4,
    title: "홍대 에어비앤비 체크인",
    titleEn: "Airbnb Check-in in Hongdae",
    role: "숙소 호스트",
    userRole: "서울에 도착한 여행객",
    description:
      "홍대입구역(2호선) 근처 원룸 숙소입니다. \
      · 체크인: 15:00 / 체크아웃: 11:00 \
      · 얼리 체크인: 당일 객실 상황에 따라 가능 (유료) \
      · 짐 보관: 1층 무인 보관함 이용 가능 \
      · 입장 방법: 건물 공용 현관 → 해당 층 → 도어락 → 객실 \
      · 와이파이: SSID / PW 제공 \
      · 가장 가까운 출구: 홍대입구역 근처 (도보 이동) \
      · 주변 추천: 연남동 브런치, 홍대 거리 공연, 망원시장 길거리 음식 \
      · 조용 시간: 야간 적용, 파티/흡연 금지 \
      여행자는 호스트에게 도착 시간을 알리고, 얼리 체크인 또는 짐 보관을 협의한 뒤, 입장/와이파이/길찾기 정보를 확인해 체크인을 완료합니다.",
    descriptionEn:
      "A studio near Hongdae Station (Line 2). Check-in at 15:00, check-out at 11:00. Early check-in may be available (paid). Lobby lockers available. Ask the host for entry steps, Wi-Fi, and directions to complete your check-in.",
    emoji: "🏨",
    isFree: false,
    initialMessage: {
      text: "안녕하세요! 호스트 지민입니다. 오늘 도착 예정 시간이 어떻게 되세요?",
      translation: "Hi! I’m Ji-min, your host. What time are you arriving today?"
    },
  
    tasks: [
      { ko: "호스트에게 인사하세요.", en: "Greet the host." },
      { ko: "예약자 이름을 말하세요.", en: "State your reservation name." },
      { ko: "도착 예정 시간을 알리세요.", en: "Share your estimated arrival time." },
      { ko: "건물 출입 방법과 도어락에 대해 물어보세요.", en: "Ask about the building entry and door lock." },
      { ko: "지하철역에서 숙소까지의 길 안내를 요청하세요.", en: "Request directions from the station to the property." }
    ],
  
    ttsVoice: "nova",
    ttsInstructions: "따뜻하고 신뢰감 있는 톤. 현지 정보를 잘 아는 호스트처럼 차분히 안내하세요.",
    sttPrompt: "에어비앤비 체크인 상황. 핵심 어휘: 체크인/체크아웃, 도착 시간, 입장/도어락, 길 안내, 와이파이, 짐 보관, 조용 시간, 주변 추천. 자연스러운 질문/확인 패턴을 강조."
  },
  {
    id: 2,
    title: "예산에 맞는 햄버거 세트 주문하기",
    titleEn: "At a Famous Burger Chain",
    role: "패스트푸드점 직원",
    userRole: "손님",
    description: "햄버거 전문점으로 다양한 종류의 햄버거를 판매합니다. 소고기 버거, 치킨 버거, 새우버거를 판매중입니다. \
    단품 버거 가격은 다음과 같습니다.\
    - 소고기 버거: 8000원\
    - 치킨 버거: 8000원\
    - 새우버거: 9000원\
    사이드 메뉴로는 감자튀김, 치즈스틱, 콜라가 있습니다. \
    감자튀김: 4000원 \
    치즈스틱: 5000원 \
    콜라: 2000원  \
    제로콜라: 2000원 \
    버거 세트 가격은 다음과 같습니다. 세트에는 감자튀김과 치즈스틱 중 하나, 콜라 또는 제로콜라를 선택할 수 있습니다. \
    - 소고기 버거 세트: 15000원 \
    - 치킨 버거 세트: 15000원 \
    - 새우버거 세트: 16000원 \
    버거 세트는 버거와 사이드 메뉴를 함께 제공합니다.\
    ",
    descriptionEn: "This is a burger chain where you can order a burger set. Order a burger set within budget and complete payment.",
    emoji: "🍔",
    isFree: false,
    initialMessage: {
      text: "안녕하세요! 주문 도와드릴까요?",
      translation: "Hello! I'll help you with your order.",
    },
    
    tasks: [
      { ko: "어떤 버거종류가 있는지 물어보세요.", en: "Ask about the menu" },
      { ko: "원하는 버거의 가격을 물어보세요.", en: "Ask about the price" },
      { ko: "사이드 메뉴를 물어보세요.", en: "Ask about side menu options" },
      { ko: "제로콜라가 있는지 물어보세요.", en: "Ask if there is zero cola" },
      { ko: "제로콜라를 포함한 버거 세트 주문을 완료하세요.", en: "Complete the order" },
    ],
    ttsVoice: "nova",
    ttsInstructions: "Speak in a friendly, helpful service tone. Be enthusiastic and welcoming. Sound like a friendly fast-food employee who wants to help.",
    sttPrompt: "This is a fast-food restaurant ordering scenario. The user is ordering a burger set within budget. Key vocabulary includes: burger types (소고기 버거, 치킨 버거, 새우버거), side menu items (감자튀김, 치즈스틱, 콜라, 제로콜라), prices (8000원, 9000원, 15000원, 16000원), and ordering phrases. Focus on Korean food service terminology and ordering expressions.",
  }
]
