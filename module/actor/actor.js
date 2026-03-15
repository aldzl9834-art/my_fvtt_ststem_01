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

    // ==========================================
    // ★ 장착 중인 방어구 보정치 미리 계산하기
    // ==========================================
    let armorMods = {
      groups: { shooting: 0, fighting: 0, expertise: 0 },
      skills: { urbanAction: 0, fieldcraft: 0, detection: 0, situationalAwareness: 0, athletics: 0 },
      movement: { base: 0, cautious: 0, normal: 0, sprint: 0 }
    };

    // 1. 캐릭터가 가진 아이템 중 '장착 중인 방어구'의 보정치를 싹 긁어옵니다.
    for (let item of this.items) {
      if (item.type === "armor" && item.system.equipped) {
        const mods = item.system.modifiers || {};
        
        if (mods.skillGroups) {
          armorMods.groups.shooting += Number(mods.skillGroups.shooting) || 0;
          armorMods.groups.fighting += Number(mods.skillGroups.fighting) || 0;
          armorMods.groups.expertise += Number(mods.skillGroups.expertise) || 0;
        }
        if (mods.skills) {
          armorMods.skills.urbanAction += Number(mods.skills.urbanAction) || 0;
          armorMods.skills.fieldcraft += Number(mods.skills.fieldcraft) || 0;
          armorMods.skills.detection += Number(mods.skills.detection) || 0;
          armorMods.skills.situationalAwareness += Number(mods.skills.situationalAwareness) || 0;
          armorMods.skills.athletics += Number(mods.skills.athletics) || 0;
        }
        if (mods.movement) {
          armorMods.movement.base += Number(mods.movement.base) || 0;
          armorMods.movement.cautious += Number(mods.movement.cautious) || 0;
          armorMods.movement.normal += Number(mods.movement.normal) || 0;
          armorMods.movement.sprint += Number(mods.movement.sprint) || 0;
        }
      }
    }

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

        // 방어구의 스킬 그룹 보정치를 가져옵니다.
        let groupMod = armorMods.groups[groupKey] || 0;
        
        // ★ 핵심: 현재 계산 중인 스킬이 '강인함(toughness)'이라면 그룹 보정치를 적용하지 않습니다(0으로 처리).
        if (skillKey === "toughness") {
          groupMod = 0;
        }
        
       // 그룹 보정치(강인함 제외됨)와 개별 스킬 보정치를 합산합니다.
        let itemMod = groupMod + (armorMods.skills[skillKey] || 0);
        
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
    
    // ★ 수정: 액터가 가진 아이템 중 타입이 'classarts'이고 이름에 '터프니스'가 포함된 아이템의 개수를 실시간으로 셉니다.
    let toughnessArtsCount = this.items.filter(item => item.type === "classarts" && item.name.includes("터프니스")).length;
    
    system.profile.hp.max = ((physicalTotal + constitutionTotal) * 3) + (toughnessArtsCount * 5);

    // [이동력 계산] Mobility = 민첩 + athletics(운동) Lv + 방어구 기본 이동력 보정치
    let quicknessTotal = system.capabilities.quickness?.total || 0;
    let athleticsLv = Number(system.skills.exercise?.athletics?.lv) || 0;
    let mobility = quicknessTotal + athleticsLv + armorMods.movement.base;

    system.profile.movement.careful = Math.ceil(mobility / 2) + armorMods.movement.cautious; // 소수점 올림 + 신중한 이동 보정
    system.profile.movement.normal = mobility + armorMods.movement.normal; // 일반 이동 보정
    system.profile.movement.sprint = (mobility * 2) + 20 + armorMods.movement.sprint; // 전력질주 보정

    // ==========================================
    // ★ 5. 유지비 (Maintenance Cost) 연산 (뼈대) ★
    // ==========================================
    
    // TODO: 추후 Item 시스템이 연동되면 생활 랭크, 주거, 차량, 차고, 커넥션 등의 아이템을 필터링하여 합산합니다.
    let baseMaintenance = 0; // 기타 기본 유지비
    let itemMaintenance = 0; // 아이템에 의한 유지비 합산액

    // 최종 유지비 계산
    system.profile.maintenanceCost = baseMaintenance + itemMaintenance;

    // ==========================================
    // ★ 6. 이니셔티브(선공) 기본 스탯 연산 ★
    // ==========================================
    let tacticsVal = Number(system.skills?.generalEducation?.tactics?.targetValue) || 0;
    let awarenessVal = Number(system.skills?.perception?.situationalAwareness?.targetValue) || 0;

    // '컴뱃 센스' 클래스 아츠 보유 여부 체크 (띄어쓰기 무시)
    const hasCombatSense = this.items.some(i => i.type === "classarts" && i.name.replace(/\s/g, '').includes("컴뱃센스"));

    // 컴뱃 센스가 있으면 둘 중 높은 값, 없으면 전술(tactics) 값 사용
    let initBase = tacticsVal;
    if (hasCombatSense && awarenessVal > tacticsVal) {
      initBase = awarenessVal;
    }

    // 연산된 값을 시스템 데이터에 저장 (이 값이 @initiativeBase가 됩니다)
    system.initiativeBase = initBase;
  }
}