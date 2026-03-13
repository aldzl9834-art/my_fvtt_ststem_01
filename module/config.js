// 시스템 전역 설정 객체 생성
export const GUNDOG_CONFIG = {};

// FVTT 코어 시스템 설정을 덮어씌우는 함수
export function registerSystemSettings() {
  console.log("GUNDOG | 시스템 기본 설정(Config) 불러오는 중...");

  // ==========================================
  // ★ 상태 이상(Status Effects) 목록 전면 교체
  // ==========================================
  CONFIG.statusEffects = [
    {
      id: "bleeding",
      name: "출혈",
      icon: "icons/svg/blood.svg"
    },
    {
      id: "stun",
      name: "몽롱함",
      icon: "icons/svg/daze.svg"
    },
    {
      id: "suppressed",
      name: "경상",
      icon: "icons/svg/downgrade.svg"
    },
    {
      id: "prone",
      name: "넘어짐",
      icon: "icons/svg/falling.svg"
    },
    {
      id: "blind",
      name: "착란",
      icon: "icons/svg/blind.svg"
    },
    {
      id: "dead",
      name: "사망",
      icon: "icons/svg/skull.svg"
    }
    // 필요한 만큼 현대전 상태 이상을 콤마(,)로 이어서 추가하시면 됩니다.
  ];

  // 앞으로 추가될 다른 코어 설정들도 이곳에 모아둡니다.
  // 예: CONFIG.fontDefinitions = ... 
}