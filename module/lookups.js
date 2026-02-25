// module/lookups.js

export const GUNDOG = {};

/**
 * 14가지 클래스 정의 데이터
 * label: 화면에 표시될 이름 (다국어 번역 키를 넣을 수도 있습니다)
 * groupBonuses: 스킬 그룹별 부여되는 보정치
 * specialties: 패널티(-50)가 면제되는 전문분야 스킬 키(Key) 목록
 */
GUNDOG.classes = {
  assault: {
    label: "어설트",
    groupBonuses: { shooting: 10, fighting: 5 },
    specialties: ["explosives"] // 폭발물 디버프 면제 (임시 배정)
  },
  sniper: {
    label: "스나이퍼",
    groupBonuses: { shooting: 15, perception: 5 },
    specialties: []
  },
  grappler: {
    label: "그래플러",
    groupBonuses: { fighting: 15, exercise: 5 },
    specialties: []
  },
  commander: {
    label: "커맨더",
    groupBonuses: { negotiation: 10, generalEducation: 10 },
    specialties: []
  },
  scout: {
    label: "스카웃",
    groupBonuses: { exercise: 10, perception: 10 },
    specialties: []
  },
  mechanic: {
    label: "메카닉",
    groupBonuses: { expertise: 15, generalEducation: 5 },
    specialties: ["mechanics"] // 메카닉 디버프 면제
  },
  operator: {
    label: "오퍼레이터",
    groupBonuses: { generalEducation: 10, expertise: 10 },
    specialties: ["dataProcessing", "communications"] // 정보처리, 통신 디버프 면제
  },
  medic: {
    label: "메딕",
    groupBonuses: { expertise: 10, negotiation: 5 },
    specialties: ["medical"] // 의료 디버프 면제
  },
  gunslinger: {
    label: "건슬링어",
    groupBonuses: { shooting: 15, exercise: 5 },
    specialties: []
  },
  cleric: {
    label: "성직자",
    groupBonuses: { perception: 15, negotiation: 5 },
    specialties: []
  },
  gambler: {
    label: "도박사",
    groupBonuses: { perception: 10, negotiation: 10 },
    specialties: []
  },
  negotiator: {
    label: "협상가",
    groupBonuses: { negotiation: 20 },
    specialties: []
  },
  guard: {
    label: "가드",
    groupBonuses: { fighting: 10, perception: 10 },
    specialties: []
  },
  npc: {
    label: "NPC",
    groupBonuses: {},
    specialties: []
  }
},
// module/lookups.js 기존 GUNDOG.classes 아래에 추가

/**
 * 스킬별 주 능력치(primary)와 부 능력치(secondary) 매핑
 * 값은 template.json에 정의한 capabilities의 key 값과 동일해야 합니다.
 * (physical, dexterity, quickness, intelligence, sense, charisma, constitution, appearance)
 */
GUNDOG.skillAttributes = {
  // 사격계
  handgun: { primary: "dexterity", secondary: "sense" },
  smg: { primary: "dexterity", secondary: "quickness" },
  rifle: { primary: "sense", secondary: "dexterity" },
  heavyWeaponry: { primary: "physical", secondary: "sense" },
  sniping: { primary: "sense", secondary: "intelligence" },
  
  // 기술계 (전문분야 예시)
  mechanics: { primary: "intelligence", secondary: "dexterity" },
  medical: { primary: "intelligence", secondary: "sense" },
  
  // ... 나머지 30개 스킬에 대해서도 동일하게 작성 (생략)
};