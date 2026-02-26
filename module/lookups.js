// module/lookups.js

export const GUNDOG = {};

GUNDOG.classes = {
  assault: { label: "어설트", groupBonuses: { shooting: 30, fighting: 20 }, specialties: ["explosives"] },
  sniper: { label: "스나이퍼", groupBonuses: { shooting: 15, perception: 5 }, specialties: [] },
  grappler: { label: "그래플러", groupBonuses: { fighting: 15, exercise: 5 }, specialties: [] },
  commander: { label: "커맨더", groupBonuses: { negotiation: 10, generalEducation: 10 }, specialties: [] },
  scout: { label: "스카웃", groupBonuses: { exercise: 10, perception: 10 }, specialties: [] },
  mechanic: { label: "메카닉", groupBonuses: { expertise: 15, generalEducation: 5 }, specialties: ["mechanics"] },
  operator: { label: "오퍼레이터", groupBonuses: { generalEducation: 10, expertise: 10 }, specialties: ["dataProcessing", "communications"] },
  medic: { label: "메딕", groupBonuses: { expertise: 10, negotiation: 5 }, specialties: ["medical"] },
  gunslinger: { label: "건슬링어", groupBonuses: { shooting: 15, exercise: 5 }, specialties: [] },
  cleric: { label: "성직자", groupBonuses: { perception: 15, negotiation: 5 }, specialties: [] },
  gambler: { label: "도박사", groupBonuses: { perception: 10, negotiation: 10 }, specialties: [] },
  negotiator: { label: "협상가", groupBonuses: { negotiation: 20 }, specialties: [] },
  guard: { label: "가드", groupBonuses: { fighting: 10, perception: 10 }, specialties: [] },
  npc: { label: "NPC", groupBonuses: {}, specialties: [] }
},

GUNDOG.skillAttributes = {
  handgun: { primary: "dexterity", secondary: "sense" },
  smg: { primary: "dexterity", secondary: "quickness" },
  rifle: { primary: "sense", secondary: "dexterity" },
  heavyWeaponry: { primary: "physical", secondary: "sense" },
  sniping: { primary: "sense", secondary: "intelligence" },
  mechanics: { primary: "intelligence", secondary: "dexterity" },
  medical: { primary: "intelligence", secondary: "sense" },
  // TODO: 나머지 스킬들도 룰북에 맞게 추가하세요!
};