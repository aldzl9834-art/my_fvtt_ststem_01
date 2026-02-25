
export const GUNDOG = {};

/**
 * 14가지 클래스 정의 데이터
 * label: 화면(시트)에 표시될 이름
 * groupBonuses: 해당 클래스가 스킬 그룹 전체에 주는 보정치
 * skillBonuses: 해당 클래스가 특정 개별 스킬에 주는 보정치
 */
GUNDOG.classes = {
  assault: {
    label: "어설트",
    groupBonuses: { shooting: 10, fighting: 5 },
    skillBonuses: { rifle: 5, heavyWeaponry: 5 }
  },
  sniper: {
    label: "스나이퍼",
    groupBonuses: { shooting: 10, perception: 5 },
    skillBonuses: { sniping: 10, situationalAwareness: 5 }
  },
  grappler: {
    label: "그래플러",
    groupBonuses: { fighting: 15 },
    skillBonuses: { meleeCombat: 10, toughness: 5 }
  },
  commander: {
    label: "커맨더",
    groupBonuses: { negotiation: 10, generalEducation: 5 },
    skillBonuses: { tactics: 10 }
  },
  scout: {
    label: "스카웃",
    groupBonuses: { exercise: 10, perception: 10 },
    skillBonuses: { fieldcraft: 5, detection: 5 }
  },
  mechanic: {
    label: "메카닉",
    groupBonuses: { expertise: 5 },
    skillBonuses: { mechanics: 15 } // 메카닉 전문분야
  },
  operator: {
    label: "오퍼레이터",
    groupBonuses: { generalEducation: 5, expertise: 5 },
    skillBonuses: { dataProcessing: 15, communications: 5 } // 정보처리 전문분야
  },
  medic: {
    label: "메딕",
    groupBonuses: { expertise: 5, negotiation: 5 },
    skillBonuses: { medical: 15, psychology: 5 } // 의료 전문분야
  },
  gunslinger: {
    label: "건슬링어",
    groupBonuses: { shooting: 15 },
    skillBonuses: { handgun: 10, smg: 5 }
  },
  cleric: {
    label: "성직자",
    groupBonuses: { perception: 10, negotiation: 5 },
    skillBonuses: { willpower: 10 }
  },
  gambler: {
    label: "도박사",
    groupBonuses: { perception: 5, negotiation: 5 },
    skillBonuses: { sleightOfHand: 10, psychology: 5 }
  },
  negotiator: {
    label: "협상가",
    groupBonuses: { negotiation: 15 },
    skillBonuses: { procurement: 10, language: 5 }
  },
  guard: {
    label: "가드",
    groupBonuses: { fighting: 5, perception: 5 },
    skillBonuses: { toughness: 10, situationalAwareness: 5 }
  },
  npc: {
    label: "NPC",
    groupBonuses: {},
    skillBonuses: {}
  }
};