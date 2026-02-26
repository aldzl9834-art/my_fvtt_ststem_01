// module/lookups.js

export const GUNDOG = {};

GUNDOG.classes = {
  assault: { 
    label: "어설트", 
    mainBonuses: { shooting: 30, fighting: 20, exercise: 15, perception: 10, negotiation: 10, generalEducation: 10, expertise: 10 }, 
    subBonuses: { shooting: 20, fighting: 15, exercise: 15, perception: 10, negotiation: 10, generalEducation: 10, expertise: 10 }, // 서브 클래스일 때의 보정치 추가
    specialties: [] 
  },
  sniper: { 
    label: "스나이퍼", 
    mainBonuses: { shooting: 30, fighting: 10, exercise: 20, perception: 15, negotiation: 10, generalEducation: 10, expertise: 10 }, 
    subBonuses: { shooting: 20, fighting: 10, exercise: 15, perception: 15, negotiation: 10, generalEducation: 10, expertise: 10 }, 
    specialties: [] 
  },
  grappler: { 
    label: "그래플러", 
    mainBonuses: { shooting: 10, fighting: 30, exercise: 20, perception: 15, negotiation: 10, generalEducation: 10, expertise: 10 }, 
    subBonuses: { shooting: 10, fighting: 20, exercise: 15, perception: 15, negotiation: 10, generalEducation: 10, expertise: 10 }, 
    specialties: [] 
  },
  commander: { 
    label: "커맨더", 
    mainBonuses: { shooting: 25, fighting: 10, exercise: 10, perception: 10, negotiation: 20, generalEducation: 20, expertise: 10 }, 
    subBonuses: { shooting: 20, fighting: 10, exercise: 10, perception: 10, negotiation: 15, generalEducation: 15, expertise: 10 }, 
    specialties: [] 
  },
  scout: { 
    label: "스카웃", 
    mainBonuses: { shooting: 10, fighting: 10, exercise: 25, perception: 20, negotiation: 10, generalEducation: 15, expertise: 15 }, 
    subBonuses: { shooting: 10, fighting: 10, exercise: 20, perception: 20, negotiation: 10, generalEducation: 10, expertise: 10 }, 
    specialties: [] 
  },
  mechanic: { 
    label: "메카닉", 
    mainBonuses: { shooting: 10, fighting: 10, exercise: 10, perception: 20, negotiation: 10, generalEducation: 15, expertise: 30 }, 
    subBonuses: { shooting: 10, fighting: 10, exercise: 10, perception: 15, negotiation: 10, generalEducation: 15, expertise: 20 }, 
    specialties: ["mechanics", "explosives"] 
  },
  operator: { 
    label: "오퍼레이터", 
    mainBonuses: { shooting: 10, fighting: 10, exercise: 10, perception: 10, negotiation: 15, generalEducation: 30, expertise: 20 }, 
    subBonuses: { shooting: 10, fighting: 10, exercise: 10, perception: 10, negotiation: 10, generalEducation: 20, expertise: 20 }, 
    specialties: ["dataProcessing", "communications"] 
  },
  medic: { 
    label: "메딕", 
    mainBonuses: { shooting: 10, fighting: 10, exercise: 10, perception: 10, negotiation: 20, generalEducation: 15, expertise: 30 }, 
    subBonuses: { shooting: 10, fighting: 10, exercise: 10, perception: 10, negotiation: 15, generalEducation: 15, expertise: 20 }, 
    specialties: ["medical"] 
  },
  gunslinger: { 
    label: "건슬링어", 
    mainBonuses: { shooting: 30, fighting: 15, exercise: 20, perception: 10, negotiation: 10, generalEducation: 10, expertise: 10 }, 
    subBonuses: { shooting: 20, fighting: 15, exercise: 15, perception: 10, negotiation: 10, generalEducation: 10, expertise: 10 }, 
    specialties: [] 
  },
  cleric: { 
    label: "성직자", 
    mainBonuses: { shooting: 10, fighting: 10, exercise: 10, perception: 20, negotiation: 25, generalEducation: 20, expertise: 10 }, 
    subBonuses: { shooting: 10, fighting: 10, exercise: 10, perception: 15, negotiation: 20, generalEducation: 15, expertise: 10 }, 
    specialties: [] 
  },
  gambler: { 
    label: "도박사", 
    mainBonuses: { shooting: 15, fighting: 15, exercise: 15, perception: 15, negotiation: 15, generalEducation: 15, expertise: 15 }, 
    subBonuses: { shooting: 15, fighting: 15, exercise: 15, perception: 15, negotiation: 15, generalEducation: 15, expertise: 15 }, 
    specialties: [] 
  },
  negotiator: { 
    label: "협상가", 
    mainBonuses: { shooting: 10, fighting: 10, exercise: 10, perception: 15, negotiation: 30, generalEducation: 20, expertise: 10 }, 
    subBonuses: { shooting: 10, fighting: 10, exercise: 10, perception: 15, negotiation: 20, generalEducation: 15, expertise: 10 }, 
    specialties: [] 
  },
  guard: { 
    label: "가드", 
    mainBonuses: { shooting: 20, fighting: 25, exercise: 20, perception: 15, negotiation: 10, generalEducation: 10, expertise: 10 }, 
    subBonuses: { shooting: 10, fighting: 15, exercise: 20, perception: 15, negotiation: 10, generalEducation: 10, expertise: 10 }, 
    specialties: [] 
  },
  npc: { 
    label: "NPC", 
    mainBonuses: {}, 
    subBonuses: {}, 
    specialties: [] 
  }
};

GUNDOG.skillAttributes = {
  // 사격계
  handgun: { primary: "dexterity", secondary: "sense" },
  smg: { primary: "dexterity", secondary: "quickness" },
  rifle: { primary: "sense", secondary: "dexterity" },
  heavyWeaponry: { primary: "physical", secondary: "sense" },
  sniping: { primary: "sense", secondary: "intelligence" },
  // 격투계
  fighting: { primary: "physical", secondary: "quickness" },
  meleeCombat: { primary: "physical", secondary: "quickness" },
  throwing: { primary: "physical", secondary: "quickness" },
  toughness: { primary: "physical", secondary: "quickness" },
  // 운동계
  athletics: { primary: "quickness", secondary: "physical" },
  urbanAction : { primary: "quickness", secondary: "physical" },
  fieldcraft: { primary: "quickness", secondary: "physical" },
  // 지각계
  situationalAwareness: { primary: "sense", secondary: "intelligence" },
  detection: { primary: "sense", secondary: "intelligence" },
  willpower: { primary: "sense", secondary: "intelligence" },
  // 교섭계
  negotiation: { primary: "charisma", secondary: "intelligence" },
  psychology: { primary: "charisma", secondary: "intelligence" },
  procurement: { primary: "charisma", secondary: "intelligence" },
  // 교양계
  tactics: { primary: "intelligence", secondary: "charisma" },
  dataProcessing: { primary: "intelligence", secondary: "charisma" },
  survival: { primary: "intelligence", secondary: "charisma" },
  knowledge: { primary: "intelligence", secondary: "charisma" },
  language: { primary: "intelligence", secondary: "charisma" },
  art: { primary: "intelligence", secondary: "charisma" },
  // 기술계
  sleightOfHand: { primary: "dexterity", secondary: "intelligence" },
  mechanics: { primary: "dexterity", secondary: "intelligence" },
  explosives: { primary: "dexterity", secondary: "intelligence" },
  medical: { primary: "dexterity", secondary: "intelligence" },
  communications: { primary: "dexterity", secondary: "intelligence" },
  piloting: { primary: "dexterity", secondary: "intelligence" }

  // TODO: 나머지 스킬들도 룰북에 맞게 추가하세요!
};