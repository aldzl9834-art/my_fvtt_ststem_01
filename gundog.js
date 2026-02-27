// gundog.js

import { GundogActor } from "./module/actor/actor.js";
import { GUNDOG } from "./module/lookups.js"; // 이제 아래에서 사용합니다!

Hooks.once("init", () => {
  console.log("GUNDOG | 시스템 초기화 중...");

  CONFIG.Actor.documentClass = GundogActor;

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("gundog", GundogActorSheet, { 
    types: ["character"], 
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

    // 백스토리와 노트 값이 비어있을 때를 대비한 안전한 텍스트 변환
    const backstory = this.actor.system.profile.backstory || "";
    const notes = this.actor.system.profile.notes || "";
    
    // ★ 추가: ProseMirror 에디터를 위한 백 스토리 및 특이사항 텍스트 변환
    context.enrichedBackstory = await TextEditor.enrichHTML(this.actor.system.profile.backstory, {
      async: true, secrets: this.actor.isOwner, rollData: context.rollData
    });
    context.enrichedNotes = await TextEditor.enrichHTML(this.actor.system.profile.notes, {
      async: true, secrets: this.actor.isOwner, rollData: context.rollData
    });

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