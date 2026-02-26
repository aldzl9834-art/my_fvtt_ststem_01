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

    // 1. 능력치 계산
    for (let [key, cap] of Object.entries(system.capabilities)) {
      cap.total = (Number(cap.value) || 0) + (Number(cap.mod) || 0);
    }

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
  }
}