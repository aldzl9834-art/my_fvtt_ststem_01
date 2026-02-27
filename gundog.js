// gundog.js

import { GundogActor } from "./module/actor/actor.js";
import { GUNDOG } from "./module/lookups.js"; // 이제 아래에서 사용합니다!

Hooks.once("init", () => {
  console.log("GUNDOG | 시스템 초기화 중...");

  CONFIG.Actor.documentClass = GundogActor;

  // 액터 시트 등록
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("gundog", GundogActorSheet, { 
    types: ["character"], 
    makeDefault: true 
  });
  // 아이템 시트 등록
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("gundog", GundogItemSheet, { 
    types: ["weapon", "armor"],
    makeDefault: true 
  });
});

class GundogActorSheet extends ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["gundog", "sheet", "actor"],
      template: "systems/gundog/templates/actor-sheet.hbs",
      width: 850,            // ★ 가로 크기 850px 고정
      height: 750,           // 세로 크기 기본값 지정
      resizable: false,      // ★ 시트 크기 조절(드래그) 비활성화
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "profile" }]
    });
  }

 async getData() {
    const context = super.getData();
    context.system = this.actor.system;

    // 에디터 활성화를 위한 필수 권한 데이터 명시
    context.editable = this.isEditable;
    context.owner = this.actor.isOwner;
    
    // ★ HTML 시트에서 드롭다운 메뉴를 그릴 수 있도록 클래스 데이터를 전달합니다.
    context.gundogClasses = GUNDOG.classes;
    
    // ★ 추가: 능력치 영문 키값을 한글로 예쁘게 출력하기 위한 라벨 데이터
    context.capabilityLabels = {
      physical: "근력 (Physical)",
      dexterity: "재주 (Dexterity)",
      quickness: "민첩 (Quickness)",
      intelligence: "지력 (Intelligence)",
      sense: "감각 (Sense)",
      charisma: "매력 (Charisma)",
      constitution: "체격 (Constitution)",
      appearance: "외견 (Appearance)"
    };
    
    // ★ 추가: HBS 파일에서 경력 이름을 한글로 매핑하기 위해 넘겨줍니다.
    context.gundogCareerList = GUNDOG.careerList; //경력 리스트
    context.gundogSkillNames = GUNDOG.skillNames; //스킬 이름 리스트
    context.gundogAffiliations = GUNDOG.affiliations; //소속 데이터

    // 경력 스킬 그룹화
    context.careerDisplay = {};
    const careers = context.system.profile.careers || {};
    
    for (let [slotId, career] of Object.entries(careers)) {
      if (!career.name) continue; // 비어있는 슬롯은 패스
      
      let careerData = GUNDOG.careerList[career.name];
      
      let getDisplay = (skillKey) => {
        if (!skillKey) return "";
        let skillName = GUNDOG.skillNames[skillKey] || skillKey;
        
        // 1. 경력에서 지정한 단일 스킬을 그대로 고른 경우 (예: "rifle")
        if (careerData && careerData.skills[skillKey]) {
          return skillName;
        } 
        
        // 2. 그룹 스킬(예: "shooting")을 통해 하위 세부 스킬을 고른 경우
        let parentGroup = null;
        for (let [gKey, skills] of Object.entries(GUNDOG.skillGroups)) {
          if (skills.includes(skillKey)) {
            parentGroup = gKey;
            break;
          }
        }
        
        // 부모 그룹이 확인되고, 그 경력이 해당 그룹 선택을 허용했다면 포맷팅
        if (parentGroup && careerData && careerData.skills[parentGroup]) {
          let groupName = GUNDOG.groupNames[parentGroup] || parentGroup;
          return `${groupName}[${skillName}]`;
        }
        
        return skillName;
      };

      // 화면에 뿌려질 최종 글자만 담아서 저장
      context.careerDisplay[slotId] = {
        label: careerData?.label || career.name,
        skill1: getDisplay(career.skill1),
        skill2: getDisplay(career.skill2)
      };
    }

    // ==========================================
    // ★ 추가: 아이템(장비) 분류 로직
    // ==========================================
    context.weapons = [];
    context.headArmors = [];
    context.bodyArmors = [];

    // 액터가 소지한 모든 아이템을 반복하며 종류별로 분류합니다.
    for (let item of this.actor.items) {
      if (item.type === "weapon") {
        context.weapons.push(item);
      } else if (item.type === "armor") {
        if (item.system.armorType === "head") {
          context.headArmors.push(item);
        } else {
          // 기본값은 몸통(body)으로 처리
          context.bodyArmors.push(item);
        }
      }
    }

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".roll-skill").click(this._onRollSkill.bind(this));
    
    // ★ 추가: 경력 슬롯 클릭 이벤트 연결
    html.find(".career-slot").click(this._onCareerClick.bind(this));

    // ★ 추가: 보너스 스킬 클릭 이벤트 연결
    html.find(".bonus-skill-slot").click(this._onBonusSkillClick.bind(this));

    // ★ 추가: 초기화(휴지통) 버튼 이벤트 연결
    html.find(".reset-career").click(this._onResetCareer.bind(this));
    html.find(".reset-bonus-skills").click(this._onResetBonusSkills.bind(this));

    // ★ 추가: 소속(Affiliation) 잠금 토글 버튼 이벤트
    html.find(".toggle-affiliation").click(ev => {
      ev.preventDefault();
      const select = html.find(".affiliation-select");
      const icon = $(ev.currentTarget).find("i");

      // 현재 잠겨있다면 (disabled 상태라면) -> 잠금 해제
      if (select.prop("disabled")) {
        select.prop("disabled", false);
        select.css({"background": "#fff", "cursor": "pointer"});
        icon.removeClass("fa-lock").addClass("fa-lock-open").css("color", "#28a745"); // 초록색 열린 자물쇠로 변경
        ui.notifications.info("소속을 변경할 수 있습니다.");
      } 
      // 현재 열려있다면 -> 다시 잠금
      else {
        select.prop("disabled", true);
        select.css({"background": "#f0f0f0", "cursor": "not-allowed"});
        icon.removeClass("fa-lock-open").addClass("fa-lock").css("color", "#dc3545"); // 빨간색 닫힌 자물쇠로 변경
      }
    });

    // ==========================================
    // ★ 추가: 중복 입력칸(Profile 탭) 동기화 이벤트 (콤마 버그 해결)
    // ==========================================
    html.find('.sync-input').change(async (ev) => {
      ev.preventDefault();
      const field = ev.currentTarget.dataset.field;
      let val = ev.currentTarget.value;
      if (ev.currentTarget.dataset.dtype === "Number") {
        val = Number(val) || 0;
      }
      // 직접 DB를 업데이트합니다.
      await this.actor.update({ [field]: val });
    });

    // 1. 아이템 수정 (연필 아이콘 클릭 시 아이템 시트 열기)
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if (item) item.sheet.render(true);
    });

    // 2. 아이템 삭제 (휴지통 아이콘 클릭)
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteEmbeddedDocuments("Item", [li.data("itemId")]);
    });

    // 3. 장착 상태 토글 (체크박스 아이콘 클릭)
    html.find('.item-equip').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if (item) {
        item.update({"system.equipped": !item.system.equipped});
      }
    });
    
  }

  // ★ 초기화 기능 함수들 추가 ★
  async _onResetCareer(event) {
    event.preventDefault();
    event.stopPropagation(); // 부모인 career-slot의 클릭 이벤트가 같이 실행되는 것을 막습니다.
    const slotId = event.currentTarget.dataset.slot;

    // 초기화 재확인 팝업
    let confirm = await Dialog.confirm({
      title: "경력 초기화",
      content: "<p>정말로 이 경력을 삭제하고 다시 선택하시겠습니까?</p>",
      yes: () => true,
      no: () => false,
      defaultYes: false
    });

    if (confirm) {
      this.actor.update({
        [`system.profile.careers.${slotId}.name`]: "",
        [`system.profile.careers.${slotId}.skill1`]: "",
        [`system.profile.careers.${slotId}.skill2`]: ""
      });
    }
  }

  async _onResetBonusSkills(event) {
    event.preventDefault();
    event.stopPropagation(); // 부모 클릭 방지

    let confirm = await Dialog.confirm({
      title: "보너스 스킬 초기화",
      content: "<p>정말로 보너스 스킬을 초기화하고 다시 선택하시겠습니까?</p>",
      yes: () => true,
      no: () => false,
      defaultYes: false
    });

    if (confirm) {
      this.actor.update({
        "system.profile.bonusSkills.skill1": "",
        "system.profile.bonusSkills.skill2": "",
        "system.profile.bonusSkills.skill3": ""
      });
    }
  }

  // ★ 추가: 경력 선택 팝업창 띄우기 함수
  async _onCareerClick(event) {
    event.preventDefault();
    const slotId = event.currentTarget.dataset.slot; // slot1 ~ slot5
    const currentCareer = this.actor.system.profile.careers[slotId].name;

    // 이미 경력이 들어있다면 튕겨냅니다.
    if (currentCareer) {
      ui.notifications.warn("이미 선택된 경력은 변경할 수 없습니다!");
      return;
    }

    // 드롭다운에 넣을 경력 리스트 HTML 생성
    let careerOptions = `<option value="">-- 경력 선택 --</option>`;
    for (let [key, data] of Object.entries(GUNDOG.careerList)) {
      careerOptions += `<option value="${key}">${data.label}</option>`;
    }

    const content = `
      <form style="padding:10px;">
        <p style="font-size:12px; color:#666;">경력과 습득할 스킬 2개를 선택하세요. (한 번 저장하면 취소 불가)</p>
        <div class="form-group">
          <label><strong>경력 목록</strong></label>
          <select id="career-select" style="width:100%; height:28px;">${careerOptions}</select>
        </div>
        <div class="form-group" style="margin-top:10px;">
          <label><strong>스킬 선택 1</strong></label>
          <select id="skill-select-1" disabled style="width:100%; height:28px;"><option value="">-- 경력을 먼저 선택하세요 --</option></select>
        </div>
        <div class="form-group" style="margin-top:10px;">
          <label><strong>스킬 선택 2</strong></label>
          <select id="skill-select-2" disabled style="width:100%; height:28px;"><option value="">-- 경력을 먼저 선택하세요 --</option></select>
        </div>
      </form>
    `;

    new Dialog({
      title: "경력 추가",
      content: content,
      buttons: {
        save: {
          label: '<i class="fas fa-check"></i> 확정 및 저장',
          callback: (html) => {
            const cName = html.find('#career-select').val();
            const s1 = html.find('#skill-select-1').val();
            const s2 = html.find('#skill-select-2').val();

            if (!cName || !s1 || !s2) {
              ui.notifications.error("경력과 2개의 스킬을 모두 선택해야 합니다.");
              return;
            }
            if (s1 === s2) {
              ui.notifications.error("서로 다른 두 개의 스킬을 선택해야 합니다.");
              return;
            }

            // 캐릭터 데이터 업데이트 (저장)
            this.actor.update({
              [`system.profile.careers.${slotId}.name`]: cName,
              [`system.profile.careers.${slotId}.skill1`]: s1,
              [`system.profile.careers.${slotId}.skill2`]: s2
            });
          }
        },
        cancel: {
          label: "취소"
        }
      },
      // 팝업창 내에서 경력을 바꿀 때마다 스킬 리스트를 4개짜리로 바꿔주는 스크립트
      render: (html) => {
        html.find('#career-select').change((ev) => {
          const selected = ev.target.value;
          const $s1 = html.find('#skill-select-1');
          const $s2 = html.find('#skill-select-2');
          
          if (selected && GUNDOG.careerList[selected]) {
            const skills = GUNDOG.careerList[selected].skills;
            let opts = `<option value="">-- 스킬 선택 --</option>`;
            
            for (let [sk, slabel] of Object.entries(skills)) {
              
              // ★ 추가된 로직: 현재 스킬 키(sk)가 그룹 스킬(예: shooting)인지 확인
              if (GUNDOG.skillGroups[sk]) {
                // 그룹 스킬이라면 묶음(optgroup)으로 만들어서 하위 스킬들을 나열합니다.
                opts += `<optgroup label="[ ${slabel} ]">`;
                for (let childSk of GUNDOG.skillGroups[sk]) {
                  // 하위 스킬의 키값과 한글 이름(skillNames)을 가져와 옵션으로 추가
                  opts += `<option value="${childSk}">${GUNDOG.skillNames[childSk]}</option>`;
                }
                opts += `</optgroup>`;
              } else {
                // 단일 스킬이라면 그대로 추가합니다.
                opts += `<option value="${sk}">${slabel}</option>`;
              }
              
            }
            
            $s1.html(opts).prop('disabled', false);
            $s2.html(opts).prop('disabled', false);
          } else {
            $s1.html(`<option value="">-- 경력을 먼저 선택하세요 --</option>`).prop('disabled', true);
            $s2.html(`<option value="">-- 경력을 먼저 선택하세요 --</option>`).prop('disabled', true);
          }
        });
      }
    }).render(true);
  }

  // ★ 추가: 보너스 스킬 선택 팝업창 로직
  async _onBonusSkillClick(event) {
    event.preventDefault();
    const bonusSkills = this.actor.system.profile.bonusSkills;

    // 이미 보너스 스킬이 선택되어 있다면 튕겨냅니다.
    if (bonusSkills && bonusSkills.skill1) {
      ui.notifications.warn("이미 선택된 보너스 스킬은 변경할 수 없습니다!");
      return;
    }

    // 30개 스킬 드롭다운 HTML 생성
    let skillOptions = `<option value="">-- 스킬 선택 --</option>`;
    for (let [key, label] of Object.entries(GUNDOG.skillNames)) {
      skillOptions += `<option value="${key}">${label}</option>`;
    }

    const content = `
      <form style="padding:10px;">
        <p style="font-size:12px; color:#666;">습득할 보너스 스킬 3가지를 선택하세요. (중복 선택 가능, 저장 후 취소 불가)</p>
        <div class="form-group">
          <label><strong>스킬 1</strong></label>
          <select id="b-skill-1" style="width:100%; height:28px;">${skillOptions}</select>
        </div>
        <div class="form-group" style="margin-top:10px;">
          <label><strong>스킬 2</strong></label>
          <select id="b-skill-2" style="width:100%; height:28px;">${skillOptions}</select>
        </div>
        <div class="form-group" style="margin-top:10px;">
          <label><strong>스킬 3</strong></label>
          <select id="b-skill-3" style="width:100%; height:28px;">${skillOptions}</select>
        </div>
      </form>
    `;

    new Dialog({
      title: "보너스 스킬 선택",
      content: content,
      buttons: {
        save: {
          label: '<i class="fas fa-check"></i> 확정 및 저장',
          callback: (html) => {
            const s1 = html.find('#b-skill-1').val();
            const s2 = html.find('#b-skill-2').val();
            const s3 = html.find('#b-skill-3').val();

            // 유효성 검사 (빈칸이 있는지만 체크하고 중복 체크 로직은 삭제)
            if (!s1 || !s2 || !s3) {
              ui.notifications.error("3개의 스킬을 모두 선택해야 합니다.");
              return;
            }

            // 캐릭터 데이터 업데이트 (저장)
            this.actor.update({
              "system.profile.bonusSkills.skill1": s1,
              "system.profile.bonusSkills.skill2": s2,
              "system.profile.bonusSkills.skill3": s3
            });
          }
        },
        cancel: { label: "취소" }
      }
    }).render(true);
  }

  async _onRollSkill(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const groupKey = button.dataset.group;
    const skillKey = button.dataset.skill;

    const system = this.actor.system;
    const skill = system.skills[groupKey]?.[skillKey];

    if (!skill) {
      ui.notifications.warn("스킬 데이터를 찾을 수 없습니다.");
      return;
    }

    const targetValue = skill.targetValue;

    const tensRoll = await new Roll("1d10").evaluate();
    const onesRoll = await new Roll("1d10").evaluate();

    const tensValue = (tensRoll.total % 10) * 10;
    const onesValue = onesRoll.total % 10;
    const total = (tensValue + onesValue) === 0 ? 100 : (tensValue + onesValue);
    const achievement = (tensValue / 10) + onesValue;

    const isSuccess = total <= targetValue;
    const resultText = isSuccess ? "성공 (SUCCESS)" : "실패 (FAILURE)";
    const resultColor = isSuccess ? "#28a745" : "#dc3545";

    let resultType = "NORMAL";
    if (total === 100) resultType = "FUMBLE";
    else if (isSuccess && onesValue === 0) resultType = "CRITICAL";

    const content = `
    <div class="dice-roll gundog-roll">
      <div class="dice-result">
        <div class="dice-formula">${skillKey.toUpperCase()} 판정 (목표: 1d100 <= ${targetValue})</div>
        <div class="dice-formula">10의 자리 (${tensValue}) + 1의 자리 (${onesValue})</div>
        <h4 class="dice-total">${total}</h4>
        <div style="background:${resultColor}; color:white; padding:5px; text-align:center;">
          ${resultText}
          ${isSuccess ? ` | 달성치(${achievement})` : ""}
          ${resultType === "CRITICAL" ? " 🔥CRITICAL" : ""}
          ${resultType === "FUMBLE" ? " 💀FUMBLE" : ""}
        </div>
      </div>
    </div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL
    });
  }
}

// 아이템 데이터와 HTML을 연결해주는 ItemSheet 클래스

// gundog.js 파일 맨 아래의 GundogItemSheet 클래스를 아래 코드로 업데이트하세요!

class GundogItemSheet extends ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["gundog", "sheet", "item"],
      template: "systems/gundog/templates/item-sheet.hbs",
      width: 520,
      height: 650,
      resizable: true,
      dragDrop: [{ dragSelector: null, dropSelector: ".attachment-slot" }]
    });
  }

  // ★ 추가: 무기 시트 출력 시 부착물 보너스 합산
  getData() {
    const context = super.getData();
    context.system = this.item.system; 

    if (this.item.type === "weapon") {
      let computed = {
        rangeBuffs: duplicate(context.system.rangeModifiers?.buffs || {}),
        rangePenalties: duplicate(context.system.rangeModifiers?.penalties || {}),
        reliability: Number(context.system.reliability) || 0,
        noiseLevel: Number(context.system.noiseLevel) || 0,
        armorPiercing: Number(context.system.armorPiercing) || 0,
        ammoMax: Number(context.system.ammo?.max) || 0,
        snipingBonus: 0,
        snipingPenalty: 0,
        damageNonPenBonus: 0,
        damagePenBonus: 0
      };

      const atts = context.system.attachments || {};
      for (let slot in atts) {
        if (Array.isArray(atts[slot])) {
          for (let att of atts[slot]) {
            if (!att.modifiers) continue;
            ['pointBlank', 'short', 'medium', 'long'].forEach(k => {
              computed.rangeBuffs[k] = (Number(computed.rangeBuffs[k]) || 0) + (Number(att.modifiers.rangeBuffs?.[k]) || 0);
              computed.rangePenalties[k] = (Number(computed.rangePenalties[k]) || 0) + (Number(att.modifiers.rangePenalties?.[k]) || 0);
            });
            computed.reliability += Number(att.modifiers.reliability) || 0;
            computed.noiseLevel += Number(att.modifiers.noiseLevel) || 0;
            computed.armorPiercing += Number(att.modifiers.armorPiercing) || 0;
            computed.ammoMax += Number(att.modifiers.ammoMax) || 0;
            computed.snipingBonus += Number(att.modifiers.snipingBonus) || 0;
            computed.snipingPenalty += Number(att.modifiers.snipingPenalty) || 0;
            computed.damageNonPenBonus += Number(att.modifiers.damageNonPen) || 0;
            computed.damagePenBonus += Number(att.modifiers.damagePen) || 0;
          }
        }
      }
      context.computed = computed;
    }
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // ★ 수정: 배열에서 부착물 삭제
    html.find('.remove-attachment').click(ev => {
      ev.preventDefault();
      const slot = ev.currentTarget.dataset.slot;
      const index = ev.currentTarget.dataset.index;
      
      let currentArr = duplicate(this.item.system.attachments[slot] || []);
      currentArr.splice(index, 1);
      
      this.item.update({ [`system.attachments.${slot}`]: currentArr });
    });

    html.find('.roll-weapon').click(this._onRollWeapon.bind(this));
  }

  // ★ 수정: 배열에 부착물 추가
  async _onDrop(event) {
    event.preventDefault();
    const slotTarget = $(event.target).closest('.attachment-slot');
    if (!slotTarget.length) return;
    const slot = slotTarget.data("slot");

    let data;
    try { data = JSON.parse(event.dataTransfer.getData('text/plain')); } catch (err) { return; }
    if (data.type !== "Item") return;

    const dropItem = await Item.implementation.fromDropData(data);
    if (!dropItem) return;

    if (dropItem.type !== "attachment") {
      ui.notifications.warn("총기 부착물(Attachment) 아이템만 장착할 수 있습니다!");
      return;
    }

    // ★ 추가: 드롭한 슬롯과 부착물의 '장착 부위'가 일치하는지 검사합니다.
    if (dropItem.system.attachType !== slot) {
      const slotNames = { sight: "조준경(상부)", common: "총기 악세서리(공통)", underbarrel: "총기 악세서리(하부)", muzzle: "총구 부착물(오른쪽)" };
      ui.notifications.error(`[${dropItem.name}] 아이템은 ${slotNames[dropItem.system.attachType]} 전용입니다. 현재 슬롯에 장착할 수 없습니다.`);
      return;
    }

    // 부착물의 모든 수정치를 배열에 저장
    const newAttachment = {
      id: dropItem.id,
      name: dropItem.name,
      modifiers: duplicate(dropItem.system.modifiers)
    };

    let currentArr = duplicate(this.item.system.attachments[slot] || []);
    currentArr.push(newAttachment);

    this.item.update({ [`system.attachments.${slot}`]: currentArr });
  }

  // ★ 수정: 굴림 시 합산된 보너스(computed)를 적용
  async _onRollWeapon(event) {
    event.preventDefault();

    if (!this.item.actor) {
      ui.notifications.warn("이 무기가 캐릭터의 장비 탭에 소지되어 있어야만 판정할 수 있습니다.");
      return;
    }

    const rangeKey = event.currentTarget.dataset.range;
    const rangeLabels = { pointBlank: "지근거리", short: "근거리", medium: "중거리", long: "장거리" };
    const rangeLabel = rangeLabels[rangeKey];

    const skillKey = this.item.system.skill; 
    let groupKey = "";
    for (let [gKey, skills] of Object.entries(GUNDOG.skillGroups)) {
      if (skills.includes(skillKey)) { groupKey = gKey; break; }
    }

    if (!groupKey) {
      ui.notifications.error("해당 무기의 사용 스킬을 시스템에서 찾을 수 없습니다.");
      return;
    }

    const actorSkill = this.item.actor.system.skills[groupKey]?.[skillKey];
    if (!actorSkill) {
      ui.notifications.error("캐릭터에게 해당 스킬의 데이터가 존재하지 않습니다.");
      return;
    }

    // 1. 합산 데이터 불러오기 (getData와 동일한 연산)
    let wBuff = Number(this.item.system.rangeModifiers.buffs[rangeKey]) || 0;
    let wPenalty = Number(this.item.system.rangeModifiers.penalties[rangeKey]) || 0;
    let sBonus = 0; let sPenalty = 0;
    let dmgNonPenBonus = 0; let dmgPenBonus = 0;

    for (let slot in this.item.system.attachments) {
      const arr = this.item.system.attachments[slot];
      if (Array.isArray(arr)) {
        for (let att of arr) {
          if (!att.modifiers) continue;
          wBuff += Number(att.modifiers.rangeBuffs?.[rangeKey]) || 0;
          wPenalty += Number(att.modifiers.rangePenalties?.[rangeKey]) || 0;
          sBonus += Number(att.modifiers.snipingBonus) || 0;
          sPenalty += Number(att.modifiers.snipingPenalty) || 0;
          dmgNonPenBonus += Number(att.modifiers.damageNonPen) || 0;
          dmgPenBonus += Number(att.modifiers.damagePen) || 0;
        }
      }
    }

    let baseTarget = Number(actorSkill.targetValue) || 0;
    
    // 저격(sniping) 스킬일 경우 추가 보너스 적용
    let sniperText = "";
    if (skillKey === "sniping" && (sBonus > 0 || sPenalty > 0)) {
      baseTarget = baseTarget + sBonus - sPenalty;
      sniperText = `<br><span style="color:#17a2b8; font-size:11px;">(부착물 저격 보정: +${sBonus} / -${sPenalty} 적용됨)</span>`;
    }

    const initialTarget = baseTarget + wBuff - wPenalty;
    const dmgNonPen = this.item.system.damageNonPenetrating || "0";
    const dmgPen = this.item.system.damagePenetrating || "0";

    const content = `
      <form style="padding:10px;">
        <h3 style="border-bottom:2px solid #222; padding-bottom:5px; margin-bottom:15px;">
          <i class="fas fa-crosshairs"></i> ${this.item.name} (${rangeLabel} 사격)
        </h3>
        
        <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:13px; color:#555;">
          <span>스킬 목표값 (${GUNDOG.skillNames[skillKey]}):</span> <strong>${baseTarget}</strong>
        </div>
        ${sniperText}
        <div style="display:flex; justify-content:space-between; margin-bottom:15px; font-size:13px; color:#555;">
          <span>사거리 보정 (기본+부착물):</span> <strong>+${wBuff} / -${wPenalty}</strong>
        </div>
        
        <div style="display:flex; justify-content:space-between; margin-bottom:15px; font-size:14px; font-weight:bold; color:#0056b3; padding:5px; background:#f4f8ff; border:1px solid #cce5ff;">
          <span>1차 연산 목표값:</span> <span>${initialTarget}</span>
        </div>
        
        <div style="display:flex; gap:10px;">
          <div class="form-group" style="flex:1;">
            <label style="font-weight:bold; color:#28a745;">추가 보너스 (+)</label>
            <input type="number" id="roll-bonus" value="0" style="width:100%; text-align:center; height:30px; font-size:14px; border:2px solid #28a745;"/>
          </div>
          <div class="form-group" style="flex:1;">
            <label style="font-weight:bold; color:#dc3545;">추가 페널티 (-)</label>
            <input type="number" id="roll-penalty" value="0" style="width:100%; text-align:center; height:30px; font-size:14px; border:2px solid #dc3545;"/>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px; padding:10px; background:#fff3cd; border:1px solid #ffeeba; border-radius:4px;">
          <span style="font-size:16px; font-weight:bold; color:#856404;">최종 목표값:</span>
          <span id="final-target" style="font-size:24px; font-weight:bold; color:#d9534f;">${initialTarget}</span>
        </div>

        <button type="button" id="custom-roll-btn" style="width:100%; margin-top:10px; background:#0056b3; color:white; border:none; border-radius:3px; height:36px; cursor:pointer; font-weight:bold; font-size:13px;">
          <i class="fas fa-dice-d10"></i> 명중 판정 굴림 (반복 가능)
        </button>

        <hr style="margin:20px 0; border-top:1px dashed #ccc;">

        <h3 style="border-bottom:2px solid #d9534f; padding-bottom:5px; margin-bottom:15px; color:#d9534f;">
          <i class="fas fa-burst"></i> 데미지 굴림
        </h3>
        
        <div style="display:flex; justify-content:space-around; margin-bottom:15px; padding:8px; background:#f9f9f9; border:1px solid #ddd; border-radius:4px;">
          <label style="font-weight:bold; font-size:13px; cursor:pointer;">
            <input type="radio" name="damage-type" value="non-pen" checked> 
            비관통 (${dmgNonPen} <span style="color:blue;">+${dmgNonPenBonus}</span>)
          </label>
          <label style="font-weight:bold; font-size:13px; cursor:pointer;">
            <input type="radio" name="damage-type" value="pen"> 
            관통 (${dmgPen} <span style="color:blue;">+${dmgPenBonus}</span>)
          </label>
        </div>

        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:15px; padding:0 5px;">
          <label style="font-weight:bold; font-size:13px; color:#333;">명중 횟수에 따른 추가 다이스 (+Xd6)</label>
          <div style="display:flex; align-items:center; gap:5px;">
            <input type="number" id="extra-hits" value="0" min="0" style="width:50px; text-align:center; height:28px; font-size:14px; font-weight:bold; border:2px solid #333;"/>
            <span style="font-weight:bold; font-size:14px;">d6</span>
          </div>
        </div>

        <div style="display:flex; gap:10px;">
          <button type="button" id="custom-damage-btn" style="flex:2; background:#d9534f; color:white; border:none; border-radius:3px; height:36px; cursor:pointer; font-weight:bold; font-size:13px;">
            <i class="fas fa-dice"></i> 데미지 굴림
          </button>
          <button type="button" id="custom-close-btn" style="flex:1; border:1px solid #999; border-radius:3px; height:36px; cursor:pointer; background:#f0f0f0; font-weight:bold;">
            닫기
          </button>
        </div>
      </form>
    `;

    let rollDialog = new Dialog({
      title: "사격 & 데미지 판정",
      content: content,
      buttons: {}, 
      render: (html) => {
        const bInput = html.find('#roll-bonus');
        const pInput = html.find('#roll-penalty');
        const fTarget = html.find('#final-target');

        const updateTarget = () => {
          const b = Number(bInput.val()) || 0;
          const p = Number(pInput.val()) || 0;
          fTarget.text(initialTarget + b - p);
        };

        bInput.on('input', updateTarget);
        pInput.on('input', updateTarget);

        html.find('#custom-roll-btn').click(async (ev) => {
          ev.preventDefault();
          const finalTargetValue = initialTarget + (Number(bInput.val()) || 0) - (Number(pInput.val()) || 0);

          const tensRoll = await new Roll("1d10").evaluate();
          const onesRoll = await new Roll("1d10").evaluate();
          const tensValue = (tensRoll.total % 10) * 10;
          const onesValue = onesRoll.total % 10;
          const total = (tensValue + onesValue) === 0 ? 100 : (tensValue + onesValue);
          const achievement = (tensValue / 10) + onesValue;
          const isSuccess = total <= finalTargetValue;
          const resultText = isSuccess ? "명중 (HIT)" : "빗나감 (MISS)";
          const resultColor = isSuccess ? "#28a745" : "#dc3545";

          let resultType = "NORMAL";
          if (total === 100) resultType = "FUMBLE";
          else if (isSuccess && onesValue === 0) resultType = "CRITICAL";

          const chatContent = `
          <div class="dice-roll gundog-roll">
            <div class="dice-result">
              <div class="dice-formula" style="background:#222; color:white; border-radius:4px 4px 0 0;">
                <i class="fas fa-crosshairs"></i> ${this.item.name} (${rangeLabel})
              </div>
              <div class="dice-formula" style="font-size:12px; border-top:none;">
                ${GUNDOG.skillNames[skillKey]} 판정 (목표값: ${finalTargetValue})
              </div>
              <div class="dice-formula">주사위: ${tensValue} + ${onesValue}</div>
              <h4 class="dice-total">${total}</h4>
              <div style="background:${resultColor}; color:white; padding:6px; text-align:center; font-weight:bold; font-size:14px; border-radius:0 0 4px 4px;">
                ${resultText} ${isSuccess ? ` | 달성치(${achievement})` : ""} ${resultType === "CRITICAL" ? " 🔥CRITICAL" : ""} ${resultType === "FUMBLE" ? " 💀FUMBLE" : ""}
              </div>
            </div>
          </div>`;

          await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: this.item.actor }), content: chatContent, type: CONST.CHAT_MESSAGE_TYPES.ROLL, sound: CONFIG.sounds.dice
          });
        });

        html.find('#custom-damage-btn').click(async (ev) => {
          ev.preventDefault();
          const dmgType = html.find('input[name="damage-type"]:checked').val();
          let baseDamage = (dmgType === "pen") ? dmgPen : dmgNonPen;
          let bonusDamage = (dmgType === "pen") ? dmgPenBonus : dmgNonPenBonus;
          if (!baseDamage || baseDamage.trim() === "") baseDamage = "0";

          const extraHits = Number(html.find('#extra-hits').val()) || 0;
          let formula = `${baseDamage} + ${bonusDamage}`;
          if (extraHits > 0) formula += ` + ${extraHits}d6`;

          const roll = await new Roll(formula).evaluate();
          const damageLabel = (dmgType === "pen") ? "관통 데미지 (AP 적용)" : "비관통 데미지";

          let detailParts = [];
          for (let term of roll.terms) {
            if (term.faces && term.results) {
              let diceResults = term.results.map(r => r.result).join(", ");
              detailParts.push(`${term.number}d${term.faces}[${diceResults}]`);
            } else if (term.operator) detailParts.push(term.operator);
            else if (term.number !== undefined) detailParts.push(term.number);
            else detailParts.push(term.expression || term.term || "");
          }
          let detailString = detailParts.join(" ");

          const chatContent = `
          <div class="dice-roll gundog-roll">
            <div class="dice-result">
              <div class="dice-formula" style="background:#d9534f; color:white; border-radius:4px 4px 0 0;"><i class="fas fa-burst"></i> ${this.item.name}</div>
              <div class="dice-formula" style="font-size:12px; border-top:none; font-weight:bold; color:#d9534f;">${damageLabel}</div>
              <div class="dice-tooltip" style="padding:5px; background:#fff; border:1px solid #ccc; font-size:12px; margin-bottom:5px; word-break:break-all;">
                결과: ( ${detailString} )
              </div>
              <h4 class="dice-total" style="color:#d9534f;">총 ${roll.total} 데미지</h4>
            </div>
          </div>`;

          await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: this.item.actor }), content: chatContent, type: CONST.CHAT_MESSAGE_TYPES.ROLL, sound: CONFIG.sounds.dice, rolls: [roll]
          });
        });

        html.find('#custom-close-btn').click(ev => { ev.preventDefault(); rollDialog.close(); });
      }
    });

    rollDialog.render(true);
  }
}