// module/actor/actor.js (GundogActor 클래스 내부)

  _prepareCharacterData(system) 
    // 1. 능력치(Capabilities) 기본 계산 (value + mod)
    for (let [key, cap] of Object.entries(system.capabilities)) {
      cap.total = (Number(cap.value) || 0) + (Number(cap.mod) || 0);
    }

    // 2. 클래스 데이터 가져오기
    const mainClassKey = system.profile?.mainClass || "";
    const subClassKey = system.profile?.subClass || "";
    const mainClassData = GUNDOG.classes[mainClassKey] || { groupBonuses: {}, specialties: [] };
    const subClassData = GUNDOG.classes[subClassKey] || { groupBonuses: {}, specialties: [] };

    // 디버프가 면제되는 전문분야 목록 합치기
    const exemptSpecialties = [...(mainClassData.specialties || []), ...(subClassData.specialties || [])];

    // 3. 스킬(Skills) 최종 목표값 계산
    for (let [groupKey, group] of Object.entries(system.skills)) {
      // 해당 그룹이 받는 클래스 보정치 합산
      let classGroupBonus = 
        (Number(mainClassData.groupBonuses[groupKey]) || 0) + 
        (Number(subClassData.groupBonuses[groupKey]) || 0);

      for (let [skillKey, skill] of Object.entries(group)) {
        // 전문분야 디버프 처리 (-50)
        let specialtyPenalty = 0;
        if (skill.isSpecialty && !exemptSpecialties.includes(skillKey)) {
          specialtyPenalty = -50;
        }

        // 스킬과 연결된 주/부 능력치 가져오기
        let attrs = GUNDOG.skillAttributes[skillKey] || { primary: "physical", secondary: "physical" };
        let primaryCap = system.capabilities[attrs.primary]?.total || 0;
        let secondaryCap = system.capabilities[attrs.secondary]?.total || 0;

        // 아이템/유저가 입력한 스킬 개별 보정치
        let skillMod = Number(skill.mod) || 0;
        
        // 스킬 레벨
        let skillLv = Number(skill.lv) || 0;

        // ==========================================
        // 최종 주사위 굴림 목표값 계산
        // (주능력치 * 3) + 부능력치 + (Lv * 10) + 클래스수정값 + 아이템/수동보정치 + 전문분야패널티
        // ==========================================
        skill.targetValue = (primaryCap * 3) + secondaryCap + (skillLv * 10) + classGroupBonus + skillMod + specialtyPenalty;
      }
    }