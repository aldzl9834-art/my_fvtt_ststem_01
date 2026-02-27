// module/actor/actor.js

import { GUNDOG } from "../lookups.js";

export class GundogActor extends Actor {
  
  prepareData() {
    super.prepareData();
    if (this.type === "character") {
      this._prepareCharacterData(this.system);
    }
  }

  _prepareCharacterData(system) {
    // ★ 에러 방지용 안전장치
    system.capabilities = system.capabilities || {};
    system.skills = system.skills || {};
    system.profile = system.profile || {};
    system.profile.hp = system.profile.hp || { value: 0, max: 0 };
    system.profile.movement = system.profile.movement || { careful: 0, normal: 0, sprint: 0 };
    system.profile.careers = system.profile.careers || {}; // 경력 안전장치 추가
    
    // ★ 추가: 새로 바뀐 구조에 대한 안전장치
    if (typeof system.profile.rewardPoints !== "object") system.profile.rewardPoints = { current: 0, total: 0 };
    if (typeof system.profile.languages !== "object") system.profile.languages = { lang1: "", lang2: "", lang3: "", lang4: "", lang5: "", lang6: "" };

    // 1. 능력치 계산
    for (let [key, cap] of Object.entries(system.capabilities)) {
      cap.total = (Number(cap.value) || 0) + (Number(cap.mod) || 0);
    }

    // ★ 추가: 경력에서 얻은 스킬 보너스를 저장할 임시 객체
    let careerSkillBonuses = {};

    // 2. 클래스 데이터 로드 (기본 빈 객체 구조도 변경)
    const mainClassKey = system.profile.mainClass || "";
    const subClassKey = system.profile.subClass || "";
    
    // 데이터가 없을 때를 대비한 기본값(Fallback)도 mainBonuses와 subBonuses를 가지도록 변경
    const defaultClassData = { mainBonuses: {}, subBonuses: {}, specialties: [] };
    const mainClassData = GUNDOG.classes[mainClassKey] || defaultClassData;
    const subClassData = GUNDOG.classes[subClassKey] || defaultClassData;
    
    // 전문분야 면제 리스트 합치기
    const exemptSpecialties = [...(mainClassData.specialties || []), ...(subClassData.specialties || [])];

    // 3. 스킬 목표값 연산
    for (let [groupKey, group] of Object.entries(system.skills)) {
      
      // ★ 변경된 부분: 메인 클래스는 mainBonuses, 서브 클래스는 subBonuses에서 보정치를 가져옵니다.
      let classGroupBonus = 
        (Number(mainClassData.mainBonuses[groupKey]) || 0) + 
        (Number(subClassData.subBonuses[groupKey]) || 0);

      for (let [skillKey, skill] of Object.entries(group)) {
        let specialtyPenalty = 0;
        if (skill.isSpecialty && !exemptSpecialties.includes(skillKey)) {
          specialtyPenalty = -50;
        }

        let attrs = GUNDOG.skillAttributes[skillKey] || { primary: "physical", secondary: "physical" };
        let primaryCap = system.capabilities[attrs.primary]?.total || 0;
        let secondaryCap = system.capabilities[attrs.secondary]?.total || 0;
        
        let skillMod = Number(skill.mod) || 0;
        let skillLv = Number(skill.lv) || 0;

        // ==========================================
        // ★ 보너스, 페널티, 아이템 보정치 연산 추가
        // ==========================================
        let skillBonus = Number(skill.bonus) || 0;
        let skillPenalty = Number(skill.penalty) || 0; // 양수로 입력해도 빼기로 계산됨
        
        // TODO: 나중에 아이템(무기, 장비 등) 기능이 추가되면 여기서 장착 중인 아이템의 보정치를 가져옵니다.
        // 예시: let itemMod = this.items.filter(i => i.type === 'weapon' && i.system.equipped).reduce(...);
        let itemMod = 0; 
        
        // 시트에 표시하기 위해 임시 저장
        skill.itemMod = itemMod;

        // 최종 Mod (보너스 - 페널티 + 아이템 보정치)
        skill.mod = skillBonus - skillPenalty + itemMod;

        let baseCapValue = 0;

        if (groupKey === "shooting") {
          // 사격계인 경우: 근력 + 재주 + 지력 + 감각
          let physical = system.capabilities.physical?.total || 0;
          let dexterity = system.capabilities.dexterity?.total || 0;
          let intelligence = system.capabilities.intelligence?.total || 0;
          let sense = system.capabilities.sense?.total || 0;
          
          baseCapValue = physical + dexterity + intelligence + sense;
        } else {
          // 그 외의 스킬인 경우: (주능력치 * 3) + 부능력치
          let attrs = GUNDOG.skillAttributes[skillKey] || { primary: "physical", secondary: "physical" };
          let primaryCap = system.capabilities[attrs.primary]?.total || 0;
          let secondaryCap = system.capabilities[attrs.secondary]?.total || 0;
          
          baseCapValue = (primaryCap * 3) + secondaryCap;
        }

        // 최종 목표값 계산 (조건문으로 구한 baseCapValue를 적용)
        skill.targetValue = baseCapValue + (skillLv * 10) + classGroupBonus + skill.mod + specialtyPenalty;
      }
    }

    // ==========================================
    // ★ 4. 내구력(HP) 및 이동력(Movement) 연산 추가 ★
    // ==========================================
    
    // [내구력 계산] (근력 + 체격) * 3 + (터프니스 갯수 * 5)
    let physicalTotal = system.capabilities.physical?.total || 0;
    let constitutionTotal = system.capabilities.constitution?.total || 0;
    let toughnessArtsCount = 0; // TODO: 추후 클래스 아츠 구현 시 연동할 변수 공간
    
    system.profile.hp.max = ((physicalTotal + constitutionTotal) * 3) + (toughnessArtsCount * 5);

    // [이동력 계산] Mobility = 민첩 + athletics(운동) Lv
    let quicknessTotal = system.capabilities.quickness?.total || 0;
    let athleticsLv = Number(system.skills.exercise?.athletics?.lv) || 0;
    let mobility = quicknessTotal + athleticsLv;

    system.profile.movement.careful = Math.ceil(mobility / 2); // 소수점 올림
    system.profile.movement.normal = mobility;
    system.profile.movement.sprint = (mobility * 2) + 20;
  }
}