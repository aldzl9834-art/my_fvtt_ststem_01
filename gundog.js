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
      width: 650,
      height: 700,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "skills" }]
    });
  }

  getData() {
    const context = super.getData();
    context.system = this.actor.system; 
    
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

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".roll-skill").click(this._onRollSkill.bind(this));
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