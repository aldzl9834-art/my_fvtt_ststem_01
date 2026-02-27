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

};

// 30가지 스킬의 한글 이름 매핑 (보너스 스킬 선택용)

GUNDOG.skillNames = {
  handgun: "핸드건", smg: "기관단총(SMG)", rifle: "라이플", heavyWeaponry: "중화기", sniping: "저격",
  fighting: "격투", meleeCombat: "무기전투", throwing: "투척", toughness: "강인함",
  negotiation: "교섭술", psychology: "심리학", procurement: "조달",
  athletics: "운동", urbanAction: "시가지행동", fieldcraft: "국지행동",
  tactics: "전술", dataProcessing: "정보처리", survival: "서바이벌", knowledge: "지식", language: "언어", art: "예술",
  situationalAwareness: "상황파악", detection: "감지", willpower: "정신력",
  sleightOfHand: "손감각", mechanics: "메카닉", explosives: "폭발물", medical: "의료", communications: "통신", piloting: "조종"
};

GUNDOG.skillGroups = {
  shooting: ["handgun", "smg", "rifle", "heavyWeaponry", "sniping"],
  fighting: ["fighting", "meleeCombat", "throwing", "toughness"],
  negotiation: ["negotiation", "psychology", "procurement"],
  exercise: ["athletics", "urbanAction", "fieldcraft"],
  generalEducation: ["tactics", "dataProcessing", "survival", "knowledge", "language", "art"],
  perception: ["situationalAwareness", "detection", "willpower"],
  expertise: ["sleightOfHand", "mechanics", "explosives", "medical", "communications", "piloting"]
};

// 7가지 그룹 스킬의 한글 이름 매핑 (출력용)
GUNDOG.groupNames = {
  shooting: "사격계 ①",
  fighting: "격투계 ①",
  negotiation: "교섭계 ①",
  exercise: "운동계 ①",
  generalEducation: "교양계 ①",
  perception: "지각계 ①",
  expertise: "기술계 ①"
};

GUNDOG.careerList = {
  career_soldier: {
    label: "군인(병사)",
    skills: {
      shooting: "사격계 ①",
      fighting: "격투계 ①",
      urbanAction: "시가지행동",
      fieldcraft: "국지행동"
    }
  },

  career_officer: {
    label: "군인(사관)",
    skills: {
      shooting: "사격계 ①",
      situationalAwareness: "상황파악",
      negotiation: "교섭계 ①",
      tactics: "전술"
    }
  },

  career_sniper: {
    label: "군인(저격병)",
    skills: {
      sniping: "저격",
      exercise: "운동계 ①",
      willpower: "정신력",
      survival: "서바이벌"
    }
  },

  career_engineer: {
    label: "군인(공병)",
    skills: {
      shooting: "사격계 ①",
      toughness: "강인함",
      survival: "서바이벌",
      expertise: "기술계 ①"
    }
  },
  
  career_specialforces: {
    label: "특수부대",
    skills: {
      shooting: "사격계 ①",
      fighting: "격투계 ①",
      exercise: "운동계 ①",
      perception: "지각계 ①"
    }
  },

  career_mercenary: {
    label: "용병",
    skills: {
      shooting: "사격계 ①",
      exercise: "운동계 ①",
      detection: "감지", 
      procurement: "조달"
    }
  },

  career_police: {
    label: "경찰",
    skills: {
      handgun: "핸드건",
      fighting: "격투계 ①",
      detection: "감지", 
      negotiation: "교섭계 ①"
    }
  },

  career_negotiator: {
    label: "교섭인",
    skills: {
      willpower: "정신력",
      negotiation: "교섭계 ①",
      knowledge: "지식", 
      language: "언어"
    }
  },

  career_EOD: {
    label: "폭발물 처리반",
    skills: {
      willpower: "정신력",
      sleightOfHand: "손감각",
      mechanics: "메카닉",
      explosives: "폭발물"
    }
  },

  career_agent: {
    label: "공작원",
    skills: {
      perception: "지각계 ①",
      negotiation: "교섭계 ①",
      generalEducation: "교양계 ①",
      expertise: "기술계 ①"
    }
  },

  career_detective: {
    label: "탐정",
    skills: {
      urbanAction: "시가지행동",
      detection: "감지", 
      negotiation: "교섭계 ①",
      expertise: "기술계 ①"
    }
  },

  career_bountyhunter: {
    label: "바운티 헌터",
    skills: {
      shooting: "사격계 ①",
      fighting: "격투계 ①",
      urbanAction: "시가지행동",
      procurement: "조달"
    }
  },

  career_bodyguard: {
    label: "보디가드/바운서",
    skills: {
      handgun: "핸드건",
      smg: "기관단총(SMG)",
      fighting: "격투계 ①",
      perception: "지각계 ①"
    }
  },

  career_fighter: {
    label: "격투가",
    skills: {
      fighting: "격투계 ①",
      athletics: "운동",
      willpower: "정신력",
      tactics: "전술"
    }
  },

  career_athlete: {
    label: "운동선수",
    skills: {
      throwing: "투척",
      toughness: "강인함",
      exercise: "운동계 ①",
      willpower: "정신력"
    }
  },

  career_hunter: {
    label: "헌터",
    skills: {
      rifle: "라이플", 
      sniping: "저격",
      fieldcraft: "국지행동",
      survival: "서바이벌"
    }
  },

   career_driver: {
    label: "드라이버/파일럿/선원",
    skills: {
      situationalAwareness: "상황파악", 
      survival: "서바이벌",
      mechanics: "메카닉",
      piloting: "조종"
    }
  },

  career_stuntman: {
    label: "스턴트맨",
    skills: {
      toughness: "강인함",
      athletics: "운동",
      willpower: "정신력",
      piloting: "조종"
    }
  },

  career_mechanic: {
    label: "메카닉",
    skills: {
      procurement: "조달",
      sleightOfHand: "손감각",
      mechanics: "메카닉",
      piloting: "조종"
    }
  },

  career_haekeo: {
    label: "해커",
    skills: {
      procurement: "조달",
      dataProcessing: "정보처리", 
      knowledge: "지식", 
      communications: "통신"
    }
  },

  career_terrorist: {
    label: "테러리스트",
    skills: {
      urbanAction: "시가지행동",
      willpower: "정신력",
      procurement: "조달",
      explosives: "폭발물"
    }
  },

  career_guerrilla: {
    label: "게릴라",
    skills: {
      handgun: "핸드건",
      fieldcraft: "국지행동",
      detection: "감지", 
      survival: "서바이벌"
    }
  },

  career_criminal: {
    label: "범죄자",
    skills: {
      handgun: "핸드건",
      fighting: "격투계 ①",
      exercise: "운동계 ①",
      sleightOfHand: "손감각"
    }
  },

  career_intelligent_crime: {
    label: "지능범",
    skills: {
      negotiation: "교섭계 ①",
      fieldcraft: "국지행동",
      knowledge: "지식", 
      language: "언어"
    }
  },

  career_street_gang: {
    label: "스트리트 갱",
    skills: {
      handgun: "핸드건",
      fighting: "격투계 ①",
      athletics: "운동", 
      urbanAction: "시가지행동", 
    }
  },

  career_bike_gang: {
    label: "바이크 갱",
    skills: {
      handgun: "핸드건",
      exercise: "운동계 ①",
      mechanics: "메카닉",
      piloting: "조종"
    }
  },

  career_mafia: {
    label: "갱/마피아/야쿠자",
    skills: {
      shooting: "사격계 ①",
      exercise: "운동계 ①",
      negotiation: "교섭술", 
      procurement: "조달"
    }
  },

  career_prostitute: {
    label: "창부/남창",
    skills: {
      negotiation: "교섭술", 
      procurement: "조달" ,
      art: "예술",
      sleightOfHand: "손감각"
    }
  },

  career_bomber: {
    label: "폭탄마",
    skills: {
      urbanAction: "시가지행동", 
      procurement: "조달" ,
      sleightOfHand: "손감각",
      explosives: "폭발물"
    }
  },

  career_hitman: {
    label: "히트맨",
    skills: {
      shooting: "사격계 ①",
      fighting: "격투계 ①",
      urbanAction: "시가지행동", 
      procurement: "조달"
    }
  },

  career_doctor: {
    label: "의사",
    skills: {
      negotiation: "교섭술", 
      psychology: "심리학", 
      knowledge: "지식", 
      medical: "의료"
    }
  },

  career_scholar: {
    label: "학자",
    skills: {
      negotiation: "교섭계 ①",
      knowledge: "지식", 
      language: "언어", 
      art: "예술"
    }
  },

  career_reporter: {
    label: "기자",
    skills: {
      detection: "감지", 
      negotiation: "교섭계 ①",
      knowledge: "지식", 
      art: "예술"
    }
  },

  career_chef: {
    label: "요리사",
    skills: {
      fighting: "격투계 ①",
      negotiation: "교섭술", 
      art: "예술",
      sleightOfHand: "손감각"
    }
  },

  career_fortune_teller: {
    label: "점술사",
    skills: {
      detection: "감지", 
      willpower: "정신력",
      negotiation: "교섭술", 
      procurement: "조달"
    }
  },

  career_artist: {
    label: "작가/예술인",
    skills: {
      willpower: "정신력",
      knowledge: "지식", 
      art: "예술",
      sleightOfHand: "손감각"
    }
  },

  career_playactor: {
    label: "배우",
    skills: {
      negotiation: "교섭술",
      procurement: "조달",
      knowledge: "지식", 
      art: "예술"
    }
  },

  career_businessman: {
    label: "사업가/상인",
    skills: {
      negotiation: "교섭술",
      procurement: "조달",
      knowledge: "지식", 
      art: "예술"
    }
  },

  career_religionist: {
    label: "종교가",
    skills: {
      toughness: "강인함",
      willpower: "정신력",
      negotiation: "교섭계 ①",
      knowledge: "지식"
    }
  },

  career_butler: {
    label: "집사/메이드",
    skills: {
      detection: "감지",
      negotiation: "교섭술",
      psychology: "심리학", 
      art: "예술"
    }
  }
};

// 소속 리스트 * 영문 키 값은 시트의 CSS 클래스 이름(affiliation-키값)으로 사용됩니다. //
GUNDOG.affiliations = {
  gundog: "건독",
  mercenary: "용병",
  criminal: "범죄자",
  sweeper: "청소부",
  detective: "탐정",
  bountyHunter: "바운티 헌터",
  specialist: "전문가"
};