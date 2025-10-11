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
}

export const scenarios: Scenario[] = [
  {
    id: 1,
    title: "로빈과 약속잡기",
    titleEn: "Making New Friends",
    role: "로빈",
    userRole: "친구 파티에서 만난 사람",
    description:
      "로빈과 친구 파티에서 만났다. 로빈의 취미는 카페를 가는 것을 좋아한다. 로빈과 약속을 잡아보자.",
    descriptionEn: "Have a casual conversation with your new friend",
    emoji: "🍷",
    isFree: true,
    initialMessage: {
      text: "안녕하세요! 저는 로빈이에요.",
      translation: "Hi, I'm Robin! Are you Amy's friend?",
    },
    
    tasks: [
      { ko: "로빈에게 인사와 함께 자기소개를 하세요.", en: "Introduce yourself and greet Robin" },
      { ko: "로빈의 취미에 대해서 물어보세요.", en: "Ask about Robin's hobbies" },
      { ko: "좋아하는 음료 종류를 물어보세요.", en: "Ask about the favorite drink" },
      { ko: "로빈과 자유로운 대화를 나눠보세요.", en: "Have a free conversation with Robin" },
      {
        ko: "로빈과 다음 주말에 커피 마시러 가자고 해보세요.",
        en: "Ask Robin out for coffee next weekend",
      },
    ],
    ttsVoice: "nova",
    ttsInstructions: "Speak in a warm, friendly tone as if meeting a new friend. Be enthusiastic and welcoming. Sound like you're genuinely excited to meet someone new.",
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
  },
  {
    id: 3,
    title: "나이키 매장에서",
    titleEn: "At Nike Store",
    role: "매장 직원",
    userRole: "러닝화를 사러 온 손님",
    description: "운동화를 사러 나이키 매장에 갔습니다.",
    descriptionEn: "Shopping for sneakers at Nike store",
    emoji: "👟",
    isFree: false,
    initialMessage: {
      text: "안녕하세요! 찾으시는 신발이 있으신가요?",
      translation: "Hello! Welcome to Nike store. What kind of sneakers are you looking for?",
    },
    
    tasks: [
      { ko: "점원에게 찾고 있는 신발 종류를 말해보세요.", en: "Describe the style of sneakers you want" },
      { ko: "점원에게 찾는 신발사이즈를 말해보세요.", en: "Tell the staff your shoe size" },
      { ko: "신발 사이즈가 크네요. 점원에게 더 큰 신발 사이즈를 요청해보세요.", en: "Ask for a larger shoe size" },
      { ko: "할인 행사를 하고 있는지 물어보세요.", en: "Ask if there are any discount sales" },
      { ko: "카드결제를 하고 싶다고 말해보세요.", en: "Say you want to pay by card" },
    ],
    ttsVoice: "coral",
    ttsInstructions: "Speak in an energetic, helpful retail assistant tone. Be enthusiastic about products and helpful to customers. Sound like a knowledgeable shoe salesperson.",
  }
]
