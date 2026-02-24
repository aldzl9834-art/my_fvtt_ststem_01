// GUNDOG FVTT System

const CLASS_MAIN_BONUS = {
  assault_main: { handgun: 30, dex: 0, con: 5 },
  scout_main:   { handgun: 10, dex: 10, con: 0 }
};

const CLASS_SUB_BONUS = {
  assault_sub: { handgun: 15, dex: 0, con: 0 },
  scout_sub:   { handgun: 10, dex: 5, con: 0 }
};

function getTotalAttribute(system, key) {
  const attrs = system.attributes;
  if (!attrs[key]) return 0;

  const mainClass = system.class?.main;
  const subClass = system.class?.sub;

  const mainBonus = CLASS_MAIN_BONUS[mainClass]?.[key] ?? 0;
  const subBonus  = CLASS_SUB_BONUS[subClass]?.[key] ?? 0;

  // 🔫 핸드건 판정 전용
  if (key === "handgun") {
    const handgunLV = Number(attrs.handgun?.lv) || 0;
    const str = Number(attrs.str?.value) || 0;
    const dex = Number(attrs.dex?.value) || 0;

    return (
      (handgunLV * 10) +
      (str * 3 + dex) +
      mainBonus +
      subBonus
    );
  }

  // 기본 fallback (다른 능력치용)
  const value = Number(attrs[key].value) || 0;
  return value + mainBonus + subBonus;
}

Hooks.once("init", () => {
  Actors.registerSheet("gundog", GundogActorSheet, {
    makeDefault: true
  });
});

class GundogActorSheet extends ActorSheet {

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["gundog"],
      template: "systems/gundog/templates/actor-sheet.hbs",
      width: 400,
      height: 300
    });
  }

getData() {
  const context = super.getData();
  const system = context.actor.system;
  context.system = system;

  context.total = {};

  for (const key of Object.keys(system.attributes)) {
    context.total[key] = getTotalAttribute(system, key);
  }

  return context;
}

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".roll-d100").click(this._onRollD100.bind(this));
  }

  async _onRollD100(event) {
  event.preventDefault();

  const button = event.currentTarget;
  const attributeKey = button.dataset.attribute;
  const label = button.dataset.label ?? "능력 판정";

  const system = this.actor.system;
  const attr = system.attributes[attributeKey];

  if (!attr) {
    ui.notifications.warn(`능력치 ${attributeKey}를 찾을 수 없습니다.`);
    return;
  }

  const base = Number(attr.value) || 0;
  const bonus = Number(attr.bonus) || 0;
  const penalty = Number(attr.penalty) || 0;

  // Dialog HTML
  const content = `
  <div class="gundog-roll-dialog">
    <div><b>${label}</b></div>
    <hr/>
    <div>기본값: <b>${base}</b></div>

    <div style="margin-top:8px;">
      <label>보너스 (+)</label>
      <input type="number" name="bonus" value="${bonus}" />
    </div>

    <div style="margin-top:4px;">
      <label>페널티 (-)</label>
      <input type="number" name="penalty" value="${penalty}" />
    </div>
  </div>
  `;

  new Dialog({
    title: label,
    content,
    buttons: {
      roll: {
        label: "🎲 판정",
        callback: async (html) => {
          const newBonus = Number(html.find('[name="bonus"]').val()) || 0;
          const newPenalty = Number(html.find('[name="penalty"]').val()) || 0;

          // 입력값 저장
          await this.actor.update({
            [`system.attributes.${attributeKey}.bonus`]: newBonus,
            [`system.attributes.${attributeKey}.penalty`]: newPenalty
          });
          
          const baseTarget =
  getTotalAttribute(this.actor.system, attributeKey);

const targetNumber =
  baseTarget + newBonus - newPenalty;


            // 🎲 주사위 굴림
  const tensRoll = await new Roll("1d10").evaluate({ async: true });
  const onesRoll = await new Roll("1d10").evaluate({ async: true });

  const tensValue = (tensRoll.total % 10) * 10;
  const onesValue = onesRoll.total % 10;
  const total = (tensValue + onesValue) === 0 ? 100 : (tensValue + onesValue);
  const achievement = (tensValue / 10) + onesValue;

  // ✅ 성공 판정
  const isSuccess = total <= targetNumber;
  const resultText = isSuccess ? "성공 (SUCCESS)" : "실패 (FAILURE)";
  const resultColor = isSuccess ? "#28a745" : "#dc3545";

  // 🔥 크리 / 펌블
  let resultType = "NORMAL";
  if (total === 100) resultType = "FUMBLE";
  else if (isSuccess && onesValue === 0) resultType = "CRITICAL";

  // 💬 채팅 메시지
  const content = `
  <div class="dice-roll gundog-roll">
    <div class="dice-result">
      <div class="dice-formula">${label} (목표: 1d100<=${targetNumber})</div>
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
          /*const tensRoll = await new Roll("1d10").evaluate({ async: true });
          const onesRoll = await new Roll("1d10").evaluate({ async: true });

          const tens = (tensRoll.total % 10) * 10;
          const ones = onesRoll.total % 10;
          const total = (tens + ones) === 0 ? 100 : tens + ones;

          const isSuccess = total <= targetNumber;

          const chat = `
          <div class="dice-roll gundog-roll">
            <b>${label}</b>
            <div>목표치: ${targetNumber}</div>
            <hr/>
            <div>굴림값: <b>${total}</b></div>
            <b>${isSuccess ? "성공" : "실패"}</b>
          </div>
          `;

          ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            content: chat,
            type: CONST.CHAT_MESSAGE_TYPES.ROLL
          });*/
        }
      },
      cancel: {
        label: "취소"
      }
    },
    default: "roll"
  }).render(true);
}
}