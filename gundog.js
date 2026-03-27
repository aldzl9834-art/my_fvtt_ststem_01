// gundog.js

import { GundogActor } from "./module/actor/actor.js";
import { GUNDOG } from "./module/lookups.js";
import { GundogVehicleSheet } from "./module/actor/vehicle-sheet.js";
import { GUNDOG_CONFIG, registerSystemSettings } from "./module/config.js";

Hooks.once("init", () => {
  console.log("GUNDOG | 시스템 초기화 중...");

  CONFIG.Actor.documentClass = GundogActor;
  registerSystemSettings();

  // ★ 추가: 컴뱃 트래커 이니셔티브(선공) 굴림 공식 설정
  CONFIG.Combat.initiative = {
    formula: "@initiativeBase", // actor.js에서 연산한 최종 스탯값만 가져옵니다
    decimals: 0
  };

  // 액터 시트 등록
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("gundog", GundogActorSheet, { 
    types: ["character"], 
    makeDefault: true 
  });

  Actors.registerSheet("gundog", GundogVehicleSheet, { 
    types: ["vehicle"], 
    makeDefault: true 
  });
  
  // 아이템 시트 등록
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("gundog", GundogItemSheet, { 
    types: ["weapon", "armor", "attachment", "item", "upkeepitem", "connection", "classarts", "belief", "trait", "vehicleAttachment", "leisure"], // ★ 추가
    makeDefault: true 
  });
});

// 채팅 메시지 내부의 버튼 클릭 이벤트 처리
Hooks.on("renderChatMessage", (message, html, data) => {
  html.find('.gundog-chat-btn').click(async ev => {
    ev.preventDefault();
    const formula = ev.currentTarget.dataset.formula;
    const title = ev.currentTarget.dataset.title;
    const actorId = ev.currentTarget.dataset.actorId;
    
    // 주사위를 굴린 캐릭터 정보 찾기
    const actor = game.actors.get(actorId);
    const speaker = actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker();

    // 주사위 굴림 평가
    const roll = await new Roll(formula).evaluate();
    
    // 주사위 상세 결과값(눈금) 파싱
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

    // 새로운 채팅 메시지 카드 생성
    const chatContent = `
    <div class="dice-roll">
            <div class="gundog-chat-card" style="border-top: 4px solid #d9534f;">
              
              <div class="chat-header">
                <h3 class="chat-skill-name">
                  <i class="fas fa-tint" style="color:#d9534f;"></i> ${title}
                </h3>
                <div class="chat-target">
                  <strong style="color:#d9534f;">대미지 굴림</strong>
                </div>
              </div>
              
              <div class="chat-details">
                <div class="chat-calc" style="word-break:break-all; padding:6px;">
                  결과: ( ${detailString} )
                </div>
              </div>
              
              <div class="chat-dice-total" style="color:#d9534f;">
                ${roll.total}
              </div>
              
              <div class="chat-outcome failure">
                <i class="fas fa-burst"></i> 총 대미지 발생
              </div>
              
            </div>
          </div>`;

    await ChatMessage.create({
      speaker: speaker,
      content: chatContent,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      sound: CONFIG.sounds.dice,
      rolls: [roll]
    });
  });
});

// ★ 매 라운드 시작 시 이니셔티브 초기화
Hooks.on("updateCombat", async (combat, updateData, options, userId) => {
  // 중복 실행을 막기 위해 GM(마스터)의 클라이언트에서만 1번 처리합니다.
  if (!game.user.isGM) return;

  // 라운드 값이 이전 라운드보다 증가했는지 확인 (새 라운드 시작)
  if (updateData.round !== undefined && updateData.round > combat.previous.round) {
    // 트래커에 있는 모든 인원의 이니셔티브 값을 초기화(null) 합니다.
    await combat.resetAll();
  }
});

Hooks.on("preCreateCombatant", (combatant, data, options, userId) => {
  if (combatant.actor) {
    const initBase = combatant.actor.system.initiativeBase || 0;
    combatant.updateSource({ initiative: initBase });
  }
});
// ==========================================
// ★ 2. 라운드 변경 시 이니셔티브를 빈칸이 아닌 '기본 스탯'으로 원상복구
// ==========================================
Hooks.on("updateCombat", async (combat, updateData, options, userId) => {
  if (!game.user.isGM) return;

  // 다음 라운드로 넘어갔을 때 작동합니다.
  if (updateData.round !== undefined && updateData.round > combat.previous.round) {
    
    // 이전 라운드에서 매크로로 받은 '선공 보너스(+100)'를 모두 떼어내고, 다시 기본 스탯으로 되돌립니다.
    const updates = combat.combatants.map(c => {
      const base = c.actor ? (c.actor.system.initiativeBase || 0) : 0;
      return { _id: c.id, initiative: base };
    });
    
    await combat.updateEmbeddedDocuments("Combatant", updates);
    ui.notifications.info(`[라운드 ${updateData.round}] 새 라운드 시작! 기본 스탯 순서로 자동 재정렬되었습니다.`);
  }
});



class GundogActorSheet extends ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["gundog", "sheet", "actor"],
      template: "systems/gundog/templates/actor-sheet.hbs",
      width: 850,            // ★ 가로 크기 850px 고정
      height: 960,           // 세로 크기 기본값 지정
      resizable: false,      // ★ 시트 크기 조절(드래그) 비활성화
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "profile" }]
    });
  }

 async getData() {
    const context = super.getData();
    context.system = this.actor.system;

    // ★ 추가: 예금, 현금 콤마(,) 텍스트 데이터 생성
    
    context.formattedBank = Number(context.system.profile?.wealth?.bank || 0).toLocaleString();
    context.formattedCash = Number(context.system.profile?.wealth?.cash || 0).toLocaleString();

    // ==========================================
    // ★ 추가: 특징(Trait)의 RP 상한 수정치 자동 합산
    // ==========================================
    let totalRpMod = 0;
    // 캐릭터가 가진 모든 아이템을 검사해서 '특징(trait)'이면 rpModifier 값을 더합니다.
    for (let item of this.actor.items) {
      if (item.type === "trait") {
        totalRpMod += (Number(item.system.rpModifier) || 0);
      }
    }
    
    // 기본 RP 최대치 + 특징 수정치 합산 = 최종 RP 최대치 (HTML로 전달)
    context.computedRpMax = (Number(context.system.profile?.rewardPoints?.total) || 0) + totalRpMod;

    // 에디터 활성화를 위한 필수 권한 데이터 명시
    context.editable = this.isEditable;
    context.owner = this.actor.isOwner;
    
    // HTML 시트에서 드롭다운 메뉴를 그릴 수 있도록 클래스 데이터를 전달합니다.
    context.gundogClasses = GUNDOG.classes;
    
    // 능력치 영문 키값을 한글로 예쁘게 출력하기 위한 라벨 데이터
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
    
    // HBS 파일에서 경력 이름을 한글로 매핑하기 위해 넘겨줍니다.
    context.gundogCareerList = GUNDOG.careerList;
    context.gundogSkillNames = GUNDOG.skillNames;
    context.gundogGroupNames = GUNDOG.groupNames;
    context.gundogAffiliations = GUNDOG.affiliations;

    // 경력 스킬 그룹화
    context.careerDisplay = {};
    const careers = context.system.profile.careers || {};
    
    for (let [slotId, career] of Object.entries(careers)) {
      if (!career.name) continue; 
      let careerData = GUNDOG.careerList[career.name];
      let getDisplay = (skillKey) => {
        if (!skillKey) return "";
        let skillName = GUNDOG.skillNames[skillKey] || skillKey;
        if (careerData && careerData.skills[skillKey]) return skillName;
        let parentGroup = null;
        for (let [gKey, skills] of Object.entries(GUNDOG.skillGroups)) {
          if (skills.includes(skillKey)) { parentGroup = gKey; break; }
        }
        if (parentGroup && careerData && careerData.skills[parentGroup]) {
          let groupName = GUNDOG.groupNames[parentGroup] || parentGroup;
          return `${groupName}[${skillName}]`;
        }
        return skillName;
      };
      context.careerDisplay[slotId] = {
        label: careerData?.label || career.name,
        skill1: getDisplay(career.skill1),
        skill2: getDisplay(career.skill2)
      };
    }

    // ==========================================
    // ★ 1. 장비(Equipment) 탭 분류용 배열 
    // ==========================================
    context.mainWeapons = [];
    context.subWeapons = [];
    context.inventoryWeapons = [];
    context.headArmors = [];
    context.bodyArmors = [];
    context.inventoryArmors = [];

    // ==========================================
    // ★ 2. 아이템(CP 관리표) 탭 분류용 배열
    // ==========================================
    const invMaxX = Number(this.actor.system.profile.inventoryMax?.x) || 10;
    const invMaxY = Number(this.actor.system.profile.inventoryMax?.y) || 10;
    
    context.gridCells = [];
    for (let i = 0; i < 100; i++) {
      let x = i % 10;
      let y = Math.floor(i / 10);
      context.gridCells.push({
        isActive: (x < invMaxX && y < invMaxY) // 사용 가능한 칸인지 여부
      });
    }
    
    // ★ 추가: 가방(Bag) 4x4 그리드 셀
    const bagGridCells = [];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        bagGridCells.push({ x, y, isActive: true });
      }
    }
    context.bagGridCells = bagGridCells;

    context.gridItems = [];
    context.bagGridItems = [];
    context.unplacedItems = [];
    // trashItems 배열은 이제 사용하지 않으므로 지웠습니다.
    
    // 유지 자산 및 커넥션 배열
    context.upkeepItems = []; 
    context.connections = []; 
    context.classArts = [];
    context.beliefs = []; 
    context.traits = [];  

    let totalMaintenance = 0; // 총 유지비 합산 변수
    let cpItemIndex = 0; // ★ 추가: A, B, C 라벨 부여를 위한 순서 인덱스

    // 아이템들을 순서(sort)값에 따라 정렬한 후 반복문을 돌립니다.
    const allSortedItems = Array.from(this.actor.items).sort((a, b) => (a.sort || 0) - (b.sort || 0));
    
    for (let item of allSortedItems) {
      
      // --- [장비 탭 분류] ---
      if (item.type === "weapon") {
        let computedAmmoMax = 0;
        const atts = item.system.attachments || {};
        for (let slot in atts) {
          if (Array.isArray(atts[slot])) {
            for (let att of atts[slot]) {
              if (att.modifiers && att.modifiers.ammoMax) {
                computedAmmoMax += Number(att.modifiers.ammoMax) || 0;
              }
            }
          }
        }
        item.computedAmmoMax = computedAmmoMax;
        item.finalMaxAmmo = (Number(item.system.ammo?.max) || 0) + computedAmmoMax;
        
        // ★ 수정: 장착 상태에 따라 각기 다른 배열로 보냅니다.        
        if (item.system.equippedSlot === "main") {
          context.mainWeapons.push(item);
        } else if (item.system.equippedSlot === "sub") {
          context.subWeapons.push(item);
        } else {
          context.inventoryWeapons.push(item);
        }
      }

      else if (item.type === "armor") {
        if (item.system.equipped) {
          if (item.system.armorType === "head") context.headArmors.push(item);
          else context.bodyArmors.push(item);
        } else {
          context.inventoryArmors.push(item);
        }
      }

      // --- [유지비 및 커넥션 분류] ---
      if (item.type === "upkeepitem") {
        totalMaintenance += Number(item.system.maintenanceCost) || 0;
        context.upkeepItems.push(item);
      } else if (item.type === "connection") {
        totalMaintenance += Number(item.system.maintenanceCost) || 0;
        context.connections.push(item);
      } else if (item.type === "classarts") {
        context.classArts.push(item);
      } else if (item.type === "belief") {
        context.beliefs.push(item);
      } else if (item.type === "trait") {
        totalMaintenance += Number(item.system.maintenanceCost) || 0;
        context.traits.push(item);
      }
    
    // ==========================================

      // --- [CP 관리표(인벤토리) 분류] ---
      if (["weapon", "armor", "item", "attachment"].includes(item.type)) {
        // ★ 빈칸일 때는 1로 처리하되, 명시적으로 0을 입력하면 0을 허용
        let pxVal = item.system.portability?.x;
        let pyVal = item.system.portability?.y;
        let portX = (pxVal !== undefined && pxVal !== "") ? Number(pxVal) : 1; 
        let portY = (pyVal !== undefined && pyVal !== "") ? Number(pyVal) : 1;
        
        let gx = Number(item.system.grid?.x);
        let gy = Number(item.system.grid?.y);
        let gType = item.system.grid?.type || "cp";

        let itemData = {
          id: item.id,
          name: item.name,
          type: item.type,
          portX: portX,
          portY: portY,
          // ★ 0x0 아이템이라도 마우스로 잡을 수 있도록 시각적 크기는 최소 1칸(40px)으로 보장합니다.
          w: portX === 0 ? 40 : portX * 40,
          h: portY === 0 ? 40 : portY * 40,
          isWearable: item.system.isWearable
        };

        itemData.gridLabel = cpItemIndex < 26 
          ? String.fromCharCode(65 + cpItemIndex) 
          : String.fromCharCode(64 + Math.floor(cpItemIndex / 26)) + String.fromCharCode(65 + (cpItemIndex % 26));
        cpItemIndex++;

        context.unplacedItems.push(itemData);

        let canPlaceInGrid = true;
        if (item.system.isWearable && item.type !== "attachment") {
          canPlaceInGrid = false;
        }

        if (canPlaceInGrid && !isNaN(gx) && gx >= 0 && gy >= 0) {
          itemData.left = gx * 40;
          itemData.top = gy * 40;
          itemData.isPlaced = true;
          itemData.gType = gType; 
          
          if (gType === "bag") {
            context.bagGridItems.push(itemData);
          } else {
            context.gridItems.push(itemData);
          }
        } else {
          itemData.isPlaced = false;
        }
      }
    }

      const leisures = this.actor.system.profile?.leisures;
    if (leisures) {
      for (let i = 1; i <= 6; i++) {
        const slot = leisures[i];
        if (slot && slot.name) {
          totalMaintenance += Number(slot.maintenanceCost) || 0;
        }
      }
    }

    // ★ 추가: 합산된 총 유지비를 캐릭터 시트로 전달
    context.totalMaintenanceCost = totalMaintenance;

    return context;
  }

  //캐릭터 시트 부분

  activateListeners(html) {
    super.activateListeners(html);

    // ==========================================
    // ★ 추가: 엔터키 버그 수정 (입력 중 첫번째 버튼 강제 클릭 방지)
    // ==========================================
    html.find('input').on('keydown', function(ev) {
      if (ev.key === "Enter") {
        ev.preventDefault();
        $(this).blur(); // 포커스를 해제하여 데이터를 정상적으로 저장시킴
      }
    });

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
      
      // ★ 콤마(,)가 포함된 문자열이 들어오면 콤마를 먼저 제거합니다.
      let rawVal = String(ev.currentTarget.value).replace(/,/g, '');
      let val = rawVal;
      
      if (ev.currentTarget.dataset.dtype === "Number") {
        val = Number(rawVal) || 0;
      }
      await this.actor.update({ [field]: val });
    });

    // ==========================================
    // ★ 추가: 콤마(,) 자동 포맷 및 저장 에러 방지
    // ==========================================
    // 1. 시트가 열릴 때: DB에 저장된 숫자(50000)를 가져와서 콤마(50,000)를 찍어 보여줍니다.
    html.find('.comma-input').each(function() {
      let val = Number($(this).val()) || 0;
      if ($(this).val() !== "") {
        $(this).val(val.toLocaleString('en-US'));
      }
    });

    // 2. 사용자가 클릭(포커스)할 때: 수정하기 편하도록 콤마를 임시로 싹 지워줍니다.
    html.find('.comma-input').focus(function() {
      let rawVal = String($(this).val()).replace(/,/g, '');
      if (rawVal === "0") $(this).val(""); // 0일 때는 빈칸으로 만들어 바로 타이핑하기 좋게 만듬
      else $(this).val(rawVal);
    });

    // 3. 입력 완료(엔터 or 다른 곳 클릭) 시: 다시 콤마를 찍고 DB에 확실하게 저장합니다.
    html.find('.comma-input').change(async (ev) => {
      ev.preventDefault();
      const field = ev.currentTarget.dataset.field; // data-field 값(경로)을 가져옴
      
      // 콤마를 지우고 순수한 숫자로 변환
      let rawVal = String(ev.currentTarget.value).replace(/,/g, '');
      let val = Number(rawVal) || 0;
      
      // 화면에는 즉시 콤마가 찍힌 형태로 변환해서 띄워줌
      $(ev.currentTarget).val(val.toLocaleString('en-US'));
      
      // FVTT 엔진 대신 우리가 직접 DB에 안전하게 저장!
      await this.actor.update({ [field]: val });
    });

    // ==========================================
    // ★ 추가: 읽기 전용 자동 계산 항목 콤마 표시 (.readonly-comma)
    // ==========================================
    html.find('.readonly-comma').each(function() {
      let rawVal = String($(this).val()).replace(/,/g, '');
      let val = Number(rawVal) || 0;
      // 화면을 열 때 콤마만 쓱 찍어주고 어떠한 추가 이벤트도 발생시키지 않습니다.
      $(this).val(val.toLocaleString('en-US'));
    });

    // ==========================================
    // ★ 추가: RP 최대치 클릭 시 텍스트 <-> 입력칸 스위칭
    // ==========================================
    html.find('.rp-display').click(function() {
      $(this).hide();
      $(this).siblings('.rp-input').show().focus();
    });

    html.find('.rp-input').blur(function() {
      // 포커스를 잃으면 다시 텍스트로 전환 (값이 바뀌면 FVTT가 알아서 저장하고 새로고침함)
      $(this).hide();
      $(this).siblings('.rp-display').show();
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

    // ★ 추가: 클래스 아츠 사용 여부 토글 이벤트

    html.find('.item-use-toggle').click(ev => {
      ev.preventDefault();
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if (item) {
        item.update({"system.used": !item.system.used});
      }
    });

    // ==========================================
    // ★ 추가: CP 관리표 (드래그 앤 드롭 인벤토리) 이벤트 로직
    // ==========================================
    
    // 아이템 더블 클릭 시 시트 열기
    html.find('.cp-grid-item, .unplaced-item').dblclick(ev => {
      const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
      if (item) item.sheet.render(true);
    });

    // 1. 드래그 시작
    html.find('.cp-grid-item, .unplaced-item').on('dragstart', ev => {
      ev.originalEvent.dataTransfer.setData("text/plain", JSON.stringify({
        type: "CPGridItem", actorId: this.actor.id, itemId: ev.currentTarget.dataset.itemId
      }));
      setTimeout(() => $(ev.currentTarget).css("opacity", "0.5"), 10);
    });
    html.find('.cp-grid-item, .unplaced-item').on('dragend', ev => $(ev.currentTarget).css("opacity", "1.0"));

    // ==========================================
    // ★ CP 관리표 & 가방 드래그 앤 드롭 (차량 <-> 캐릭터 교환 지원)
    // ==========================================
    html.find('.cp-grid-wrapper').on('dragover', ev => ev.preventDefault());
    html.find('.cp-grid-wrapper').on('drop', async ev => {
      let data; try { data = JSON.parse(ev.originalEvent.dataTransfer.getData('text/plain')); } catch(err) { return; }
      
      if (data && data.type === "CPGridItem") {
        ev.preventDefault(); ev.stopPropagation(); 
        const wrapper = $(ev.currentTarget);
        const offset = wrapper.offset();
        const dropX = Math.floor((ev.originalEvent.pageX - offset.left) / 40);
        const dropY = Math.floor((ev.originalEvent.pageY - offset.top) / 40);
        
        const sourceActor = game.actors.get(data.actorId);
        if (!sourceActor) return;
        const item = sourceActor.items.get(data.itemId);
        
        if (item) {
          // 캐릭터의 방어구는 그리드에 놓을 수 없지만 외부에서 가져온건 예외처리
          if (item.system.isWearable && item.type !== "attachment" && sourceActor.id === this.actor.id) {
            return ui.notifications.warn("착용하는 방어구나 의류는 그리드에 배치할 수 없습니다!");
          }
          
          // 0을 허용하는 휴대치 파싱
          let pxVal = item.system.portability?.x;
          let pyVal = item.system.portability?.y;
          let pX = (pxVal !== undefined && pxVal !== "") ? Number(pxVal) : 1;
          let pY = (pyVal !== undefined && pyVal !== "") ? Number(pyVal) : 1;
          
          if (dropX + pX > 10 || dropY + pY > 10) return ui.notifications.warn("CP 관리표의 영역을 벗어납니다!");

          let isColliding = false;
          // ★ 0x0 (부피가 없는) 아이템은 충돌 검사를 무시하여 겹쳐놓을 수 있습니다.
          if (pX > 0 && pY > 0) {
            for (let other of this.actor.items) {
              if (sourceActor.id === this.actor.id && other.id === item.id) continue;
              let oType = other.system.grid?.type || "cp";
              if (oType !== "cp") continue; 
              if (["weapon", "armor", "item", "attachment"].includes(other.type)) {
                let oX = Number(other.system.grid?.x), oY = Number(other.system.grid?.y);
                if (oX >= 0 && oY >= 0) {
                  let opxVal = other.system.portability?.x;
                  let opyVal = other.system.portability?.y;
                  let opX = (opxVal !== undefined && opxVal !== "") ? Number(opxVal) : 1;
                  let opY = (opyVal !== undefined && opyVal !== "") ? Number(opyVal) : 1;
                  
                  // 바닥에 깔린 다른 아이템이 0x0인 경우에도 충돌 무시
                  if (opX > 0 && opY > 0) { 
                    if (dropX < oX + opX && dropX + pX > oX && dropY < oY + opY && dropY + pY > oY) { isColliding = true; break; }
                  }
                }
              }
            }
          }
          if (isColliding) return ui.notifications.warn("다른 아이템과 위치가 겹칩니다! 빈 공간을 찾으세요.");
          
          if (sourceActor.id === this.actor.id) {
            await item.update({"system.grid.x": dropX, "system.grid.y": dropY, "system.grid.type": "cp"});
          } else {
            let newItemData = item.toObject();
            newItemData.system.grid = { x: dropX, y: dropY, type: "cp" };
            if (newItemData.system.equipped !== undefined) newItemData.system.equipped = false;
            if (newItemData.system.equippedSlot !== undefined) newItemData.system.equippedSlot = "";
            await this.actor.createEmbeddedDocuments("Item", [newItemData]);
            await sourceActor.deleteEmbeddedDocuments("Item", [item.id]);
            ui.notifications.info(`[${sourceActor.name}]에게서 <${item.name}>을(를) 가져왔습니다.`);
          }
        }
      }
    });

    // 가방(Bag) 그리드로 드롭
    html.find('.bag-grid-wrapper').on('dragover', ev => ev.preventDefault());
    html.find('.bag-grid-wrapper').on('drop', async ev => {
      let data; try { data = JSON.parse(ev.originalEvent.dataTransfer.getData('text/plain')); } catch(err) { return; }
      if (data && data.type === "CPGridItem") {
        ev.preventDefault(); ev.stopPropagation(); 
        const wrapper = $(ev.currentTarget);
        const offset = wrapper.offset();
        const dropX = Math.floor((ev.originalEvent.pageX - offset.left) / 40);
        const dropY = Math.floor((ev.originalEvent.pageY - offset.top) / 40);
        
        const sourceActor = game.actors.get(data.actorId);
        if (!sourceActor) return;
        const item = sourceActor.items.get(data.itemId);
        
        if (item) {
          if (item.system.isWearable && item.type !== "attachment" && sourceActor.id === this.actor.id) return ui.notifications.warn("착용 방어구는 가방에 넣을 수 없습니다!");
          let pX = Math.max(1, Number(item.system.portability?.x) || 1);
          let pY = Math.max(1, Number(item.system.portability?.y) || 1);
          if (dropX + pX > 4 || dropY + pY > 4) return ui.notifications.warn("가방(4x4)의 영역을 벗어납니다!");

          let isColliding = false;
          for (let other of this.actor.items) {
            if (sourceActor.id === this.actor.id && other.id === item.id) continue;
            let oType = other.system.grid?.type || "cp";
            if (oType !== "bag") continue;
            if (["weapon", "armor", "item", "attachment"].includes(other.type)) {
              let oX = Number(other.system.grid?.x), oY = Number(other.system.grid?.y);
              if (oX >= 0 && oY >= 0) {
                let opX = Math.max(1, Number(other.system.portability?.x) || 1), opY = Math.max(1, Number(other.system.portability?.y) || 1);
                if (dropX < oX + opX && dropX + pX > oX && dropY < oY + opY && dropY + pY > oY) { isColliding = true; break; }
              }
            }
          }
          if (isColliding) return ui.notifications.warn("가방 안의 다른 아이템과 겹칩니다!");
          
          if (sourceActor.id === this.actor.id) {
            await item.update({"system.grid.x": dropX, "system.grid.y": dropY, "system.grid.type": "bag"});
          } else {
            let newItemData = item.toObject();
            newItemData.system.grid = { x: dropX, y: dropY, type: "bag" };
            if (newItemData.system.equipped !== undefined) newItemData.system.equipped = false;
            if (newItemData.system.equippedSlot !== undefined) newItemData.system.equippedSlot = "";
            await this.actor.createEmbeddedDocuments("Item", [newItemData]);
            await sourceActor.deleteEmbeddedDocuments("Item", [item.id]);
            ui.notifications.info(`[${sourceActor.name}]에게서 <${item.name}>을(를) 가방으로 가져왔습니다.`);
          }
        }
      }
    });
    
    // 미배치 목록으로 빼기
    html.find('.unplaced-item-list').on('dragover', ev => { ev.preventDefault(); $(ev.currentTarget).css("background", "#f0f0f0"); });
    html.find('.unplaced-item-list').on('dragleave', ev => { $(ev.currentTarget).css("background", "#fafafa"); });
    html.find('.unplaced-item-list').on('drop', async ev => {
      $(ev.currentTarget).css("background", "#fafafa");
      let data; try { data = JSON.parse(ev.originalEvent.dataTransfer.getData('text/plain')); } catch(err) { return; }
      
      if (data && data.type === "CPGridItem") {
        ev.preventDefault(); ev.stopPropagation();
        const sourceActor = game.actors.get(data.actorId);
        if (!sourceActor) return;
        const item = sourceActor.items.get(data.itemId);
        
        if (item) {
          if (sourceActor.id === this.actor.id) {
            await item.update({"system.grid.x": -1, "system.grid.y": -1, "system.grid.type": "none"});
          } else {
            let newItemData = item.toObject();
            newItemData.system.grid = { x: -1, y: -1, type: "none" };
            if (newItemData.system.equipped !== undefined) newItemData.system.equipped = false;
            if (newItemData.system.equippedSlot !== undefined) newItemData.system.equippedSlot = "";
            await this.actor.createEmbeddedDocuments("Item", [newItemData]);
            await sourceActor.deleteEmbeddedDocuments("Item", [item.id]);
            ui.notifications.info(`[${sourceActor.name}]에게서 <${item.name}>을(를) 가져왔습니다.`);
          }
        }
      }
    });

    // 4. 보유중인 아이템끼리 순서 변경(스왑) 로직
    html.find('.unplaced-item').on('dragover', ev => { ev.preventDefault(); ev.stopPropagation(); $(ev.currentTarget).css("border", "2px solid #0056b3"); });
    html.find('.unplaced-item').on('dragleave', ev => { $(ev.currentTarget).css("border", "1px solid #ccc"); });
    html.find('.unplaced-item').on('drop', async ev => {
      ev.preventDefault(); ev.stopPropagation();
      $(ev.currentTarget).css("border", "1px solid #ccc");
      let data;
      try { data = JSON.parse(ev.originalEvent.dataTransfer.getData('text/plain')); } catch(err) { return; }
      if (data && data.type === "CPGridItem" && data.actorId === this.actor.id) {
        const targetId = ev.currentTarget.dataset.itemId;
        const sourceId = data.itemId;
        if (targetId === sourceId) return; 
        const sourceItem = this.actor.items.get(sourceId);
        const targetItem = this.actor.items.get(targetId);
        if (sourceItem && targetItem) {
          let sourceSort = sourceItem.sort || 0;
          let targetSort = targetItem.sort || 0;
          if (sourceSort === targetSort) targetSort += 10000; 
          let sourceUpdate = { sort: targetSort };
          if (sourceItem.system.grid?.x !== -1) {
            sourceUpdate["system.grid.x"] = -1;
            sourceUpdate["system.grid.y"] = -1;
            sourceUpdate["system.grid.type"] = "none"; // type 초기화
          }
          await targetItem.update({ sort: sourceSort });
          await sourceItem.update(sourceUpdate);
        }
      }
    });

    // 5. 개별 삭제 버튼 이벤트 (휴지통 대체)
    html.find('.unplaced-item-delete').click(async ev => {
      ev.preventDefault();
      ev.stopPropagation(); 
      const li = $(ev.currentTarget).parents(".unplaced-item");
      const itemId = li.data("itemId");
      
      let confirm = await Dialog.confirm({
        title: "아이템 영구 삭제",
        content: "<p>이 아이템을 영구적으로 삭제하시겠습니까?</p><p style='color:red; font-size:12px;'>※ 장비 탭에 있는 아이템도 함께 삭제됩니다.</p>",
        yes: () => true,
        no: () => false,
        defaultYes: false
      });

      if (confirm) {
        await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
        ui.notifications.info("아이템이 성공적으로 삭제되었습니다.");
      }
    });
    
    // 2. CP 그리드로 드롭 (위치 계산 및 충돌 방지)
    html.find('.cp-grid-wrapper').on('dragover', ev => ev.preventDefault());
    html.find('.cp-grid-wrapper').on('drop', async ev => {
      let data;
      try { data = JSON.parse(ev.originalEvent.dataTransfer.getData('text/plain')); } catch(err) { return; }
      
      // 내 인벤토리 안에서 움직이는 거라면 기본 시트 드롭 기능을 막습니다.
      if (data && data.type === "CPGridItem" && data.actorId === this.actor.id) {
        ev.preventDefault();
        ev.stopPropagation(); 

        const wrapper = $(ev.currentTarget);
        const offset = wrapper.offset();
        const mouseX = ev.originalEvent.pageX - offset.left;
        const mouseY = ev.originalEvent.pageY - offset.top;
        
        const dropX = Math.floor(mouseX / 40);
        const dropY = Math.floor(mouseY / 40);
        
        const item = this.actor.items.get(data.itemId);
        if (item) {
          let pX = Math.max(1, Number(item.system.portability?.x) || 1);
          let pY = Math.max(1, Number(item.system.portability?.y) || 1);
          
          // 외곽선 충돌 검사
          if (dropX + pX > 10 || dropY + pY > 10) {
            return ui.notifications.warn("CP 관리표의 영역을 벗어납니다!");
          }

          // 다른 아이템과 겹침(Collision) 방지
          let isColliding = false;
          for (let other of this.actor.items) {
            if (other.id === item.id) continue;
            if (["weapon", "armor", "item", "upkeepitem"].includes(other.type)) {
              let oX = Number(other.system.grid?.x);
              let oY = Number(other.system.grid?.y);
              if (oX >= 0 && oY >= 0) {
                let opX = Math.max(1, Number(other.system.portability?.x) || 1);
                let opY = Math.max(1, Number(other.system.portability?.y) || 1);
                
                // 사각형 교차 검사 (AABB)
                if (dropX < oX + opX && dropX + pX > oX && dropY < oY + opY && dropY + pY > oY) {
                   isColliding = true; break;
                }
              }
            }
          }

          if (isColliding) return ui.notifications.warn("다른 아이템과 위치가 겹칩니다! 빈 공간을 찾으세요.");
          await item.update({"system.grid.x": dropX, "system.grid.y": dropY});
        }
      }
    });

    // 3. 미배치 목록으로 드래그해서 빼기
    html.find('.unplaced-item-list').on('dragover', ev => { ev.preventDefault(); $(ev.currentTarget).css("background", "#f0f0f0"); });
    html.find('.unplaced-item-list').on('dragleave', ev => { $(ev.currentTarget).css("background", "#fafafa"); });
    html.find('.unplaced-item-list').on('drop', async ev => {
      $(ev.currentTarget).css("background", "#fafafa");
      let data;
      try { data = JSON.parse(ev.originalEvent.dataTransfer.getData('text/plain')); } catch(err) { return; }
      
      if (data && data.type === "CPGridItem" && data.actorId === this.actor.id) {
        ev.preventDefault(); ev.stopPropagation();
        const item = this.actor.items.get(data.itemId);
        if (item) await item.update({"system.grid.x": -1, "system.grid.y": -1});
      }
    });

    // ==========================================
    // ★ 여가 행동 (Leisure) 장착 및 해제 로직
    // ==========================================
    
    // 1. 여가 행동 해제 (휴지통 아이콘 클릭 시)
    html.find('.remove-leisure').click(async (ev) => {
      ev.preventDefault();
      const slotId = ev.currentTarget.dataset.slot;
      // 해당 슬롯의 데이터를 초기화합니다.
      await this.actor.update({
        [`system.profile.leisures.${slotId}`]: { name: "", leisureSlot: 0, maintenanceCost: 0, effect: "" }
      });
    });

    // 2. 여가 행동 드래그 앤 드롭 장착
    html.find('.leisure-slot').on('drop', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const slotId = ev.currentTarget.dataset.slot;
      
      let data;
      try { data = JSON.parse(ev.originalEvent.dataTransfer.getData('text/plain')); } catch (err) { return; }
      
      let dropItem = null;
      // 기본 아이템 드래그 또는 CP 관리표 드래그 모두 지원
      if (data.type === "Item") {
        dropItem = await Item.implementation.fromDropData(data);
      } else if (data.type === "CPGridItem") {
        const dragActor = game.actors.get(data.actorId);
        if (dragActor) dropItem = dragActor.items.get(data.itemId);
      }

      if (!dropItem) return;

      // 여가 행동 타입인지 검사
      if (dropItem.type !== "leisure") {
        ui.notifications.warn("이 슬롯에는 '여가 행동' 아이템만 장착할 수 있습니다.");
        return;
      }

      // 아이템의 데이터를 슬롯에 복사하여 저장 (효과는 description에서 가져옴)
      await this.actor.update({
        [`system.profile.leisures.${slotId}`]: {
          name: dropItem.name,
          leisureSlot: dropItem.system.leisureSlot || 0,
          maintenanceCost: dropItem.system.maintenanceCost || 0,
          effect: dropItem.system.description || ""
        }
      });
    });
    
    // ==========================================
    // ★ 무기 드래그 앤 드롭 장착 로직
    // ==========================================
    // ★ 1. [핵심 추가] 무기를 마우스로 끌기 시작할 때 아이템 정보를 쥐어주는 코드
    html.find('.item[draggable="true"]').on('dragstart', ev => {
      ev.originalEvent.dataTransfer.setData("text/plain", JSON.stringify({
        type: "CPGridItem", // CP 관리표와 동일한 데이터 형식을 사용하여 인벤토리 연동
        actorId: this.actor.id, 
        itemId: ev.currentTarget.dataset.itemId
      }));
    });

    // 2. 브라우저의 드롭 차단 기본 동작을 해제하여 드롭존으로 만듭니다.
    html.find('.weapon-equip-slot').on('dragover', (ev) => {
      ev.preventDefault();
    });

    // 3. 실제 드롭 동작 처리
    html.find('.weapon-equip-slot').on('drop', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation(); // 아이템이 인벤토리에 중복 복사되는 버그 차단

      const targetSlot = ev.currentTarget.dataset.slot; // "main" 또는 "sub"

      let data;
      try { data = JSON.parse(ev.originalEvent.dataTransfer.getData('text/plain')); } catch (err) { return; }

      let dropItem = null;
      if (data.type === "Item") {
        dropItem = await Item.implementation.fromDropData(data);
      } else if (data.type === "CPGridItem") {
        const dragActor = game.actors.get(data.actorId);
        if (dragActor) dropItem = dragActor.items.get(data.itemId);
      }

      if (!dropItem) return;

      // 무기인지 검사
      if (dropItem.type !== "weapon") {
        ui.notifications.warn("이 슬롯에는 '무기'만 장착할 수 있습니다.");
        return;
      }

      // 내 인벤토리에 있는 무기가 맞는지 확인
      const actualItem = this.actor.items.get(dropItem.id);
      if (!actualItem) {
        ui.notifications.warn("현재 캐릭터가 소지한 무기만 장착할 수 있습니다.");
        return;
      }

      // 이미 해당 슬롯에 장착된 다른 무기가 있다면, 기존 무기부터 해제("")
      const currentEquipped = this.actor.items.find(i => i.type === "weapon" && i.system.equippedSlot === targetSlot);
      if (currentEquipped && currentEquipped.id !== actualItem.id) {
        await currentEquipped.update({ "system.equippedSlot": "" });
      }

      // 드래그한 무기를 해당 슬롯(main 또는 sub)으로 장착 처리
      await actualItem.update({ "system.equippedSlot": targetSlot });
    });
    
    // ==========================================
    // ★ 장착 해제 버튼 로직
    // ==========================================
    html.find('.unequip-btn').click(async (ev) => {
      ev.preventDefault();
      const itemId = ev.currentTarget.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) {
        // 장착 슬롯을 비워주면 소지 무기 목록으로 다시 내려갑니다.
        await item.update({ "system.equippedSlot": "" });
      }
    });

    // ==========================================
    // ★ 무기 더블클릭 시 상세 시트 열기
    // ==========================================
    html.find('.weapon-equip-slot .item, .armor-equip-slot .item, .item[draggable="true"]').dblclick(ev => {
      ev.preventDefault();
      const itemId = ev.currentTarget.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) item.sheet.render(true);
    });

    // ==========================================
    // ★ 방어구 드래그 앤 드롭 장착 로직
    // ==========================================
    
    // 브라우저의 드롭 차단 해제
    html.find('.armor-equip-slot').on('dragover', (ev) => {
      ev.preventDefault();
    });

    html.find('.armor-equip-slot').on('drop', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();

      const targetSlot = ev.currentTarget.dataset.slot; // "head" 또는 "body"

      let data;
      try { data = JSON.parse(ev.originalEvent.dataTransfer.getData('text/plain')); } catch (err) { return; }

      let dropItem = null;
      if (data.type === "Item") {
        dropItem = await Item.implementation.fromDropData(data);
      } else if (data.type === "CPGridItem") {
        const dragActor = game.actors.get(data.actorId);
        if (dragActor) dropItem = dragActor.items.get(data.itemId);
      }

      if (!dropItem) return;

      if (dropItem.type !== "armor") {
        ui.notifications.warn("이 슬롯에는 '방어구'만 장착할 수 있습니다.");
        return;
      }

      const actualItem = this.actor.items.get(dropItem.id);
      if (!actualItem) {
        ui.notifications.warn("현재 캐릭터가 소지한 방어구만 장착할 수 있습니다.");
        return;
      }

      // 방어구 부위(머리/몸통)가 슬롯과 일치하는지 검사
      if (actualItem.system.armorType !== targetSlot) {
        const slotName = targetSlot === "head" ? "머리" : "몸통";
        ui.notifications.warn(`이 방어구는 [${slotName}] 전용 방어구가 아닙니다.`);
        return;
      }

      // 이미 장착된 같은 부위의 방어구가 있다면 먼저 해제(false) 처리
      const currentEquipped = this.actor.items.find(i => i.type === "armor" && i.system.armorType === targetSlot && i.system.equipped);
      if (currentEquipped && currentEquipped.id !== actualItem.id) {
        await currentEquipped.update({ "system.equipped": false });
      }

      // 드래그한 방어구를 장착(true) 처리
      await actualItem.update({ "system.equipped": true });
    });

    // ==========================================
    // ★ 방어구 장착 해제 버튼 로직
    // ==========================================
    html.find('.unequip-armor-btn').click(async (ev) => {
      ev.preventDefault();
      const itemId = ev.currentTarget.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) {
        // 장착 해제 시 자동으로 소지 방어구 목록으로 돌아갑니다.
        await item.update({ "system.equipped": false });
      }
    });
    
    // 🌟 [추가] 캐릭터 시트에서 스마트폰 모듈 실행
        html.find('.btn-open-smartphone').click(ev => {
            ev.preventDefault(); // 기본 클릭 동작(링크 이동 등) 방지
            
            // 토큰을 찾을 필요 없이, 현재 열려있는 시트의 주인(this.actor)을 바로 넘겨줍니다!
            if (window.GundogSmartphoneApp) {
                new window.GundogSmartphoneApp(this.actor).render(true);
            } else {
                ui.notifications.error("📱 스마트폰 시스템이 로드되지 않았거나 오류가 있습니다.");
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
        <p style="font-size:12px; color:#666;">경력과 습득할 스킬 2개를 선택하세요.</p>
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

    const skillName = $(button).find('.s-name').text().trim() || skillKey.toUpperCase();
    
    // =======================================================
    // ★ 변수 선언부 (이곳에서 baseTarget이 정의됩니다!)
    // =======================================================
    const targetValue = Number(skill.targetValue) || 0;
    const skillLv = Number(skill.lv) || 0;
    const itemMod = Number(skill.itemMod) || 0;
    const baseTarget = targetValue - itemMod; 

    // =======================================================
    // 1. 팝업 창(Dialog) HTML 템플릿
    // =======================================================
    let dialogTemplate = `
      <div class="gundog-roll-dialog">
        
        <div class="dialog-header">
          <h3 class="dialog-skill-name">${skillName} 판정</h3>
          <div class="dialog-target">
            <span class="base-val">기본 ${baseTarget}</span>
            <span class="item-val">${itemMod >= 0 ? '+' : ''}${itemMod} (장비)</span>
            <span class="equals">=</span>
            <strong>${targetValue}</strong>
          </div>
        </div>

        <div class="dialog-modifiers">
          <div class="mod-group bonus-group">
            <label>보너스 (+)</label>
            <input type="number" id="roll-bonus" value="0" autofocus />
          </div>
          <div class="mod-group penalty-group">
            <label>페널티 (-)</label>
            <input type="number" id="roll-penalty" value="0" />
          </div>
        </div>

      </div>
    `;

    // =======================================================
    // 2. 팝업 창 실행 및 버튼 동작
    // =======================================================
    new Dialog({
      title: `${skillName} 판정`,
      content: dialogTemplate,
      buttons: {
        roll: {
          label: "",
          icon: '<i class="fas fa-dice-d20"></i>',
          callback: async (html) => {
            const bonus = parseInt(html.find('#roll-bonus').val()) || 0;
            const penalty = parseInt(html.find('#roll-penalty').val()) || 0;
            const finalModifier = bonus - penalty;
            const finalTarget = targetValue + finalModifier;

            const roll = await new Roll("1d100").evaluate({async: true});
            const total = roll.total;
            
            const tensValue = total === 100 ? 0 : Math.floor(total / 10) * 10;
            const onesValue = total === 100 ? 0 : total % 10;
            const achievement = Math.floor(tensValue / 10) + onesValue + skillLv;

            const isSuccess = total <= finalTarget; 
            const resultText = isSuccess ? "성공" : "실패";
            const resultColor = isSuccess ? "#28a745" : "#dc3545";

            let resultType = "NORMAL";
            if (total === 100) resultType = "FUMBLE";
            else if (isSuccess && onesValue === 0) resultType = "CRITICAL";

            let modifierInfo = "";
            if (finalModifier !== 0) {
              modifierInfo = `<div class="chat-modifier">수정치 적용: <strong>${finalModifier > 0 ? '+'+finalModifier : finalModifier}</strong></div>`;
            }

            // 성공/실패에 따라 클래스 이름 부여 (CSS에서 색상 제어)
            const resultStatusClass = isSuccess ? "success" : "failure";

            // 새로운 채팅창 카드 HTML 구조
            const content = `
            <div class="gundog-chat-card">
              
              <div class="chat-header">
                <h3 class="chat-skill-name">${skillName}</h3>
                <span class="chat-target">성공률: <strong>${finalTarget}</strong> </span>
              </div>
              
              <div class="chat-details">
                ${modifierInfo}
                <div class="chat-calc">10의 자리(${tensValue / 10}) + 1의 자리(${onesValue}) + 스킬 Lv(${skillLv})</div>
              </div>
              
              <div class="chat-roll-result">
                <div class="chat-dice-total">${total}</div>
                <div class="chat-outcome ${resultStatusClass}">
                  ${resultText}
                  ${isSuccess ? `<span class="chat-achievement">| 달성치(${achievement})</span>` : ""}
                  ${resultType === "CRITICAL" ? `<span class="chat-critical">🔥CRITICAL</span>` : ""}
                  ${resultType === "FUMBLE" ? `<span class="chat-fumble">💀FUMBLE</span>` : ""}
                </div>
              </div>
              
            </div>`;

            await ChatMessage.create({
              speaker: ChatMessage.getSpeaker({ actor: this.actor }),
              content,
              type: CONST.CHAT_MESSAGE_TYPES.ROLL,
              sound: CONFIG.sounds.dice,
              rolls: [roll]
            });
          }
        },
        cancel: {
          label: "",
          icon: '<i class="fas fa-times"></i>'
        }
      },
      default: "roll"
    }, 
    {
      classes: ["dialog", "gundog-roll-app"], 
      width: 320 
    }).render(true);
  }
}

// 아이템 데이터와 HTML을 연결해주는 ItemSheet 클래스

// gundog.js 파일 맨 아래의 GundogItemSheet 클래스를 아래 코드로 업데이트하세요!

class GundogItemSheet extends ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["gundog", "sheet", "item"],
      template: "systems/gundog/templates/item-sheet.hbs",
      width: 465,
      height: 670,
      resizable: false,
      dragDrop: [{ dragSelector: null, dropSelector: ".attachment-slot" }]
    });
  }

  // ★ 추가: 무기 시트 출력 시 부착물 보너스 합산
  getData() {
    const context = super.getData();
    context.system = this.item.system; 

    context.isWeapon = (this.item.type === "weapon");
    context.isArmor = (this.item.type === "armor");
    context.isAttachment = (this.item.type === "attachment");
    context.isItem = (this.item.type === "item");
    context.isUpkeepItem = (this.item.type === "upkeepitem");
    context.isConnection = (this.item.type === "connection");
    context.isClassArts = (this.item.type === "classarts");
    context.isBelief = (this.item.type === "belief");
    context.isTrait = (this.item.type === "trait");
    context.isLeisure = (this.item.type === "leisure");
    context.isVehicleAttachment = (this.item.type === "vehicleAttachment");

    context.formattedPrice = Number(context.system.price || 0).toLocaleString();
    context.formattedAmmoPrice = Number(context.system.ammoPrice || 0).toLocaleString();
    context.formattedMaintenanceCost = Number(context.system.maintenanceCost || 0).toLocaleString();
    
    context.gundogClasses = GUNDOG.classes;

    if (context.isWeapon) {
      context.safeAttachments = {
        sight: Array.isArray(context.system.attachments?.sight) ? context.system.attachments.sight : [],
        common: Array.isArray(context.system.attachments?.common) ? context.system.attachments.common : [],
        underbarrel: Array.isArray(context.system.attachments?.underbarrel) ? context.system.attachments.underbarrel : [],
        muzzle: Array.isArray(context.system.attachments?.muzzle) ? context.system.attachments.muzzle : [],
        magazine: Array.isArray(context.system.attachments?.magazine) ? context.system.attachments.magazine : []
      };

      let computed = {
        ammoMultiplier: 1, // 탄약 가격 배수 초기값
        rangeBuffs: duplicate(context.system.rangeModifiers?.buffs || {}),
        rangePenalties: duplicate(context.system.rangeModifiers?.penalties || {}),
        reliabilityBonus: 0,
        noiseLevelBonus: 0,
        armorPiercingBonus: 0,
        ammoMaxBonus: 0,
        snipingBonus: 0,
        snipingPenalty: 0,
        damageNonPenBonus: "",
        damagePenBonus: ""
      };
      
      let dmgNonPenArr = [];
      let dmgPenArr = [];

      const atts = context.safeAttachments;
      for (let slot in atts) {
        for (let att of atts[slot]) {
          // ★ 수정: 인벤토리(actor)에 있는 실시간 부착물 원본 데이터를 불러옵니다.
          let liveItem = this.item.actor ? this.item.actor.items.get(att.id) : game.items.get(att.id);
          let mods = liveItem ? liveItem.system.modifiers : att.modifiers;

          if (!mods) continue;
          ['pointBlank', 'short', 'medium', 'long', 'sniping'].forEach(k => {
            computed.rangeBuffs[k] = (Number(computed.rangeBuffs[k]) || 0) + (Number(mods.rangeBuffs?.[k]) || 0);
            computed.rangePenalties[k] = (Number(computed.rangePenalties[k]) || 0) + (Number(mods.rangePenalties?.[k]) || 0);
          });
          computed.reliabilityBonus += Number(mods.reliability) || 0;
          computed.noiseLevelBonus += Number(mods.noiseLevel) || 0;
          computed.armorPiercingBonus += Number(mods.armorPiercing) || 0;
          computed.ammoMaxBonus += Number(mods.ammoMax) || 0;
          computed.snipingBonus += Number(mods.snipingBonus) || 0;
          computed.snipingPenalty += Number(mods.snipingPenalty) || 0;
          
          if (mods.damageNonPen) dmgNonPenArr.push(mods.damageNonPen);
          if (mods.damagePen) dmgPenArr.push(mods.damagePen);
          
          let mult = Number(mods.ammoMultiplier);
          if (mult && mult > 0) computed.ammoMultiplier *= mult;
        }
      }

      // ★ 추가: 무기가 캐릭터에게 장착(소지)되어 있다면, 지정된 스킬의 lv 값을 가져와 관통력(AP)에 합산합니다.
      if (this.item.actor && context.system.skill) {
        const skillKey = context.system.skill;
        let groupKey = "";
        // 해당 스킬이 어느 그룹에 있는지 찾기
        for (let [gKey, skills] of Object.entries(GUNDOG.skillGroups)) {
          if (skills.includes(skillKey)) { groupKey = gKey; break; }
        }
        // 캐릭터의 해당 스킬 lv 값 추출 및 더하기
        if (groupKey && this.item.actor.system.skills[groupKey]?.[skillKey]) {
          const skillLv = Number(this.item.actor.system.skills[groupKey][skillKey].lv) || 0;
          computed.armorPiercingBonus += skillLv;
        }
      }

      // 최종 탄약 가격 계산 및 표시 여부 판별
      computed.finalAmmoPrice = (Number(context.system.ammoPrice) || 0) * computed.ammoMultiplier;
      
      computed.formattedFinalAmmoPrice = computed.finalAmmoPrice.toLocaleString(); // ★ 새로 추가된 줄
      
      computed.showFinalAmmoPrice = computed.ammoMultiplier > 1;

      // 부호에 따라 색상을 입혀주는 도우미 함수
      const getModStr = (val) => {
        if (!val) return "";
        return val > 0 ? `<span style="color:blue;">(+${val})</span>` : `<span style="color:red;">(${val})</span>`;
      };
      computed.relStr = getModStr(computed.reliabilityBonus);
      computed.noiseStr = getModStr(computed.noiseLevelBonus);
      computed.apStr = getModStr(computed.armorPiercingBonus);
      computed.ammoStr = getModStr(computed.ammoMaxBonus);

      computed.damageNonPenBonus = dmgNonPenArr.join(" + ");
      computed.damagePenBonus = dmgPenArr.join(" + ");
      context.computed = computed;
    }
    return context;
  }

  //아이템 시트 부분

  activateListeners(html) {
    super.activateListeners(html);

    // ==========================================
    // ★ 추가: 엔터키 버그 수정
    // ==========================================
    html.find('input').on('keydown', function(ev) {
      if (ev.key === "Enter") {
        ev.preventDefault();
        $(this).blur(); 
      }
    });

    // ==========================================
    // ★ 추가: 콤마(,) 전용 입력칸 실시간 동기화 로직
    // ==========================================
    html.find('.comma-input').change(async (ev) => {
      ev.preventDefault();
      const field = ev.currentTarget.dataset.field; // 저장할 DB 경로
      
      // 입력된 값에서 콤마(,)를 모두 제거한 뒤 순수한 숫자로 변환합니다.
      const rawVal = String(ev.currentTarget.value).replace(/,/g, '');
      const val = Number(rawVal) || 0;
      
      await this.item.update({ [field]: val });
    });

    // ==========================================
    // ★ 사거리 수정치: 텍스트 <-> 입력칸 스위칭 로직 (아이템 시트 전용)
    // ==========================================
    html.find('.mod-display').on('click', function(ev) {
      ev.preventDefault(); // 다른 클릭 이벤트와 꼬이는 것을 방지
      $(this).hide(); // 텍스트 숨김
      $(this).siblings('.mod-input').show().focus(); // 숨겨진 입력칸 등장
    });

    html.find('.mod-input').on('blur', function() {
      // 포커스를 잃으면 다시 텍스트로 전환
      $(this).hide();
      $(this).siblings('.mod-display').show();
    });

    // ★ 자물쇠 토글 버튼 클릭 이벤트
    html.find('.toggle-item-lock').click(ev => {
      ev.preventDefault();
      this.item.update({ "system.locked": !this.item.system.locked });
    });

    // ★ 시트가 잠겨있다면 모든 입력칸 비활성화 및 부착물 해제 버튼 숨기기
    if (this.item.system.locked) {
      html.find('input, select, textarea').prop('disabled', true);
      html.find('.remove-attachment').hide();
    }

    // 부착물 해제
    html.find('.remove-attachment').click(ev => {
      ev.preventDefault();
      const slot = ev.currentTarget.dataset.slot;
      const index = ev.currentTarget.dataset.index;
      
      let currentData = this.item.system.attachments[slot];
      let currentArr = Array.isArray(currentData) ? duplicate(currentData) : [];
      
      if (currentArr.length > index) {
        
        // ★ 추가: 해제하는 부착물이 '탄창'일 경우, 무기에 남은 탄알을 탄창 아이템에 백업
        if (slot === "magazine" && this.item.actor) {
          const magId = currentArr[index].id;
          const magItem = this.item.actor.items.get(magId);
          if (magItem) {
            magItem.update({ "system.ammo.value": this.item.system.ammo?.value || 0 });
          }
          // 무기 안에 들어있는 총알은 0으로 비움 (탄창을 뺐으므로)
          this.item.update({ "system.ammo.value": 0 });
        }

        currentArr.splice(index, 1);
        this.item.update({ [`system.attachments.${slot}`]: currentArr });
      }
    });

    // 부착물 이름 클릭 시 상세 시트 열기
    html.find('.attachment-edit').click(ev => {
      ev.preventDefault();
      const itemId = ev.currentTarget.dataset.id;
      if (!itemId) return;

      let attachedItem = this.item.actor ? this.item.actor.items.get(itemId) : game.items.get(itemId);
      if (!attachedItem) attachedItem = game.items.get(itemId);

      if (attachedItem) attachedItem.sheet.render(true);
      else ui.notifications.warn("원본 부착물 아이템을 찾을 수 없습니다.");
    });

    // 사격 판정 버튼 열기
    html.find('.roll-weapon').click(this._onRollWeapon.bind(this));
  }

  // 드롭 이벤트 (이전과 동일)
  async _onDrop(event) {
    event.preventDefault();

    // ★ 잠겨있을 때는 부착물 장착 불가
    if (this.item.system.locked) {
      ui.notifications.warn("시트가 잠겨있어 부착물을 장착할 수 없습니다.");
      return;
    }

    const slotTarget = $(event.target).closest('.attachment-slot');
    if (!slotTarget.length) return;
    const slot = slotTarget.data("slot");

    let data;
    try { data = JSON.parse(event.dataTransfer.getData('text/plain')); } catch (err) { return; }
    
    let dropItem = null;

    // ★ 수정: 기본 Item 드래그와 CP 관리표(CPGridItem) 드래그 모두 지원
    if (data.type === "Item") {
      dropItem = await Item.implementation.fromDropData(data);
    } else if (data.type === "CPGridItem") {
      // CP 그리드에서 드래그한 아이템인 경우, 해당 캐릭터의 인벤토리에서 아이템을 찾아옵니다.
      const dragActor = game.actors.get(data.actorId);
      if (dragActor) dropItem = dragActor.items.get(data.itemId);
    }

    if (!dropItem) return;

    if (dropItem.type !== "attachment") {
      ui.notifications.warn("총기 부착물(Attachment) 아이템만 장착할 수 있습니다!");
      return;
    }

    if (dropItem.system.attachType !== slot) {
      const slotNames = { sight: "조준경(상부)", common: "총기 악세서리(공통)", underbarrel: "총기 악세서리(하부)", muzzle: "총구 부착물(오른쪽)", magazine: "탄창" };
      ui.notifications.error(`[${dropItem.name}] 아이템은 ${slotNames[dropItem.system.attachType]} 전용입니다.`);
      return;
    }

    const newAttachment = {
      id: dropItem.id,
      name: dropItem.name,
      modifiers: duplicate(dropItem.system.modifiers)
    };

    let currentData = this.item.system.attachments[slot];
    let currentArr = Array.isArray(currentData) ? duplicate(currentData) : [];
    
    // ★ 추가: 탄창(magazine)을 무기에 장착하는 경우
    if (slot === "magazine" && this.item.actor) {
      // 기존에 꽂혀있던 탄창이 있다면, 빼기 전에 무기의 현재 탄알을 예전 탄창에 백업
      if (currentArr.length > 0) {
        const oldMagItem = this.item.actor.items.get(currentArr[0].id);
        if (oldMagItem) {
          oldMagItem.update({ "system.ammo.value": this.item.system.ammo?.value || 0 });
        }
        // 새 탄창으로 교체하는 것이므로 기존 탄창 목록을 비워줍니다.
        currentArr = []; 
      }
      
      // 새 탄창이 가지고 있는 탄알 수를 무기에 장전합니다.
      this.item.update({ "system.ammo.value": dropItem.system.ammo?.value || 0 });
    }

    currentArr.push(newAttachment);
    this.item.update({ [`system.attachments.${slot}`]: currentArr });
  }

  // 안전하게 작성된 주사위 판정 창 로직
  async _onRollWeapon(event) {
    event.preventDefault();

    if (!this.item.actor) {
      ui.notifications.warn("이 무기가 캐릭터의 장비 탭에 소지되어 있어야만 판정할 수 있습니다.");
      return;
    }

    const rangeKey = event.currentTarget.dataset.range;
    const rangeLabels = { pointBlank: "지근거리", short: "근거리", medium: "중거리", long: "장거리", sniping: "저격" };
    const rangeLabel = rangeLabels[rangeKey];

    let skillKey = this.item.system.skill; 
    
    // ★ 추가: 클릭한 사거리가 '저격'이라면, 무기 기본스킬을 무시하고 강제로 'sniping' 스킬을 사용합니다.
    if (rangeKey === "sniping") {
      skillKey = "sniping";
    }

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

   let wBuff = Number(this.item.system.rangeModifiers.buffs[rangeKey]) || 0;
    let wPenalty = Number(this.item.system.rangeModifiers.penalties[rangeKey]) || 0;
    let sBonus = 0; let sPenalty = 0;
    let ammoMaxBonus = 0; // ★ 추가: 탄약 최대치 보너스 
    
    // 데미지를 문자열 배열로 모으기
    let dmgNonPenArr = [];
    let dmgPenArr = [];

    for (let slot in this.item.system.attachments) {
      const arr = this.item.system.attachments[slot];
      if (Array.isArray(arr)) {
        for (let att of arr) {
          // 실시간 부착물 추적 안전장치
          let liveItem = this.item.actor ? this.item.actor.items.get(att.id) : game.items.get(att.id);
          let mods = liveItem ? liveItem.system.modifiers : att.modifiers;

          if (!mods) continue;
          wBuff += Number(mods.rangeBuffs?.[rangeKey]) || 0;
          wPenalty += Number(mods.rangePenalties?.[rangeKey]) || 0;
          sBonus += Number(mods.snipingBonus) || 0;
          sPenalty += Number(mods.snipingPenalty) || 0;
          ammoMaxBonus += Number(mods.ammoMax) || 0; // ★ 최대 탄약 합산
          
          if (mods.damageNonPen) dmgNonPenArr.push(mods.damageNonPen);
          if (mods.damagePen) dmgPenArr.push(mods.damagePen);
        }
      }
    }

    let dmgNonPenBonus = dmgNonPenArr.join(" + ");
    let dmgPenBonus = dmgPenArr.join(" + ");

    let baseTarget = Number(actorSkill.targetValue) || 0;
    let sniperText = "";
    
    if (rangeKey === "sniping" && (sBonus > 0 || sPenalty > 0)) {
      baseTarget = baseTarget + sBonus - sPenalty;
      sniperText = `<br><span style="color:#17a2b8; font-size:11px;">(부착물 저격 보정: +${sBonus} / -${sPenalty} 적용됨)</span>`;
    }

    const initialTarget = baseTarget + wBuff - wPenalty;
    const dmgNonPen = this.item.system.damageNonPenetrating || "0";
    const dmgPen = this.item.system.damagePenetrating || "0";
    
    // ★ 탄약 데이터 추출
    const currentAmmo = this.item.system.ammo?.value || 0;
    const maxAmmo = (Number(this.item.system.ammo?.max) || 0) + ammoMaxBonus;

    const content = `
     <form class="gundog-weapon-dialog">
        
        <div class="w-header">
          <div class="w-actor-name">
            <i class="fas fa-user"></i> ${this.item.actor.name}
          </div>
          <div class="w-item-title-row">
            <div class="w-item-name">
              <i class="fas fa-crosshairs"></i> ${this.item.name} <span class="w-range">(${rangeLabel})</span>
            </div>
            <div class="w-ammo-box">
              <i class="fas fa-cubes" style="color:#666;"></i> 탄약:
              <input type="number" id="dialog-ammo-value" value="${currentAmmo}" />
              <span style="font-weight:bold; color:#666;">/ ${maxAmmo}</span>
            </div>
          </div>
        </div>
        
        <div class="w-stat-row">
          <span>스킬 목표값 (${GUNDOG.skillNames[skillKey]}):</span> <strong>${baseTarget}</strong>
        </div>
        ${sniperText}
        <div class="w-stat-row">
          <span>사거리 보정 (기본+부착물):</span> <strong>+${wBuff} / -${wPenalty}</strong>
        </div>
        
        <div class="w-stat-highlight">
          <span>1차 연산 목표값:</span> <span>${initialTarget}</span>
        </div>
        
        <div class="w-dialog-modifiers">
          <div class="w-mod-group w-bonus-group">
            <label>추가 보너스 (+)</label>
            <input type="number" id="roll-bonus" value="0" />
          </div>
          <div class="w-mod-group w-penalty-group">
            <label>추가 페널티 (-)</label>
            <input type="number" id="roll-penalty" value="0" />
          </div>
        </div>

        <div class="w-final-target">
          <span class="label">최종 목표값:</span>
          <span id="final-target" class="value">${initialTarget}</span>
        </div>

        <button type="button" id="custom-roll-btn" class="w-btn w-btn-roll">
          <i class="fas fa-dice-d10"></i> 명중 판정 굴림
        </button>

        <hr class="w-divider">

        <h3 class="w-section-title red">
          <i class="fas fa-burst"></i> 데미지 굴림
        </h3>
        
        <div class="w-options-box">
          <label>
            <input type="radio" name="damage-type" value="non-pen" checked> 
            비관통 (${dmgNonPen} <span class="w-dmg-bonus">${dmgNonPenBonus ? '+ ' + dmgNonPenBonus : ''}</span>)
          </label>
          <label>
            <input type="radio" name="damage-type" value="pen"> 
            관통 (${dmgPen} <span class="w-dmg-bonus">${dmgPenBonus ? '+ ' + dmgPenBonus : ''}</span>)
          </label>
        </div>

        <div class="w-extra-hits">
          <label>명중 횟수에 따른 추가 다이스 (+Xd6)</label>
          <div style="display:flex; align-items:center; gap:5px;">
            <input type="number" id="extra-hits" value="0" min="0" />
            <span style="font-weight:bold; font-size:14px;">d6</span>
          </div>
        </div>

        <button type="button" id="custom-damage-btn" class="w-btn w-btn-dmg">
          <i class="fas fa-dice"></i> 데미지 굴림
        </button>

        <hr class="w-divider">

        <h3 class="w-section-title purple">
          <i class="fas fa-skull-crossbones"></i> 대미지 페널티 굴림 (2d9)
        </h3>
        
        <div class="w-options-box">
          <label>종류:
            <select id="penalty-type">
              <option value="shooting">사격</option>
              <option value="melee">격투</option>
              <option value="vehicle">차량</option>
              <option value="general">범용</option>
            </select>
          </label>
          <label>보정치:
            <input type="number" id="penalty-mod" value="0" />
          </label>
        </div>

        <div class="w-btn-group">
          <button type="button" id="custom-penalty-btn" class="w-btn w-btn-pen">
            <i class="fas fa-skull"></i> 페널티 굴림
          </button>
          <button type="button" id="custom-close-btn" class="w-btn w-btn-close">
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

        // ==========================================
        // ★ 1. 다이얼로그에서 숫자를 바꾸면 무기 아이템에 즉시 저장
        // ==========================================
        const ammoInput = html.find('#dialog-ammo-value');
        const weaponItem = this.item;

        ammoInput.on('change', async (ev) => {
          const newAmmo = Number(ev.currentTarget.value) || 0;
          await weaponItem.update({ "system.ammo.value": newAmmo });
        });

        // ==========================================
        // ★ 2. 캐릭터 시트에서 무기 탄약을 바꾸면 다이얼로그 창의 숫자도 즉시 변경
        // ==========================================
        const hookId = Hooks.on("updateItem", (item, updateData) => {
          if (item.id === weaponItem.id && updateData.system?.ammo?.value !== undefined) {
            // 사용자가 다이얼로그 입력칸을 타이핑하고 있지 않을 때만 숫자를 갱신합니다
            if (!ammoInput.is(':focus')) {
              ammoInput.val(updateData.system.ammo.value);
            }
          }
        });
        
        // 창이 닫힐 때 이 훅(Hook)을 제거하기 위해 다이얼로그 요소에 임시 저장
        html.data("ammoHookId", hookId);

        html.find('#custom-roll-btn').click(async (ev) => {
          ev.preventDefault();
          const finalTargetValue = initialTarget + (Number(bInput.val()) || 0) - (Number(pInput.val()) || 0);

          // ★ 수정: 1d100으로 굴리고 3D 주사위용 데이터 생성
          const roll = await new Roll("1d100").evaluate();
          const total = roll.total;
          
          const tensValue = total === 100 ? 0 : Math.floor(total / 10) * 10;
          const onesValue = total === 100 ? 0 : total % 10;
          
          // 1. 기존 달성치 연산 (주사위 눈금 + 스킬 Lv)
          const skillLv = Number(actorSkill.lv) || 0;
          const achievement = Math.floor(tensValue / 10) + onesValue + skillLv;
          
          // 2. 무기의 기본 관통력(AP) 및 부착물 관통력 보너스 가져오기
          const baseAP = Number(this.item.system.armorPiercing) || 0;
          let attachAP = 0;
          for (let slot in this.item.system.attachments) {
            const arr = this.item.system.attachments[slot];
            if (Array.isArray(arr)) {
              for (let att of arr) {
                if (att.modifiers && att.modifiers.armorPiercing) {
                  attachAP += Number(att.modifiers.armorPiercing) || 0;
                }
              }
            }
          }
          
          // 3. 최종 관통력 (달성치 + 기본 AP + 부착물 AP)
          const finalPiercing = achievement + baseAP + attachAP;
          
          const isSuccess = total <= finalTargetValue;
          const resultText = isSuccess ? "명중" : "빗나감";
          const resultColor = isSuccess ? "#28a745" : "#dc3545";

          let resultType = "NORMAL";
          if (total === 100) resultType = "FUMBLE";
          else if (isSuccess && onesValue === 0) resultType = "CRITICAL";

          const chatContent = `
          <div class="dice-roll gundog-roll" style="border-radius:5px;">
            <div class="dice-result">
              
              <div class="gundog-chat-header">
                <i class="fas fa-crosshairs"></i> ${this.item.name} <span class="range-tag">(${rangeLabel})</span>
              </div>
              
              <div class="gundog-chat-subheader">
                ${GUNDOG.skillNames[skillKey]} (성공률: ${finalTargetValue})
              </div>
              
              <div class="dice-formula gundog-chat-formula">
                10의 자리(${tensValue / 10}) + 1의 자리(${onesValue})
              </div>
              
              <h4 class="dice-total gundog-chat-total" style="color:#000000">${total}</h4>
              
              <div class="gundog-chat-result" style="background:${resultColor};">
                <span>${resultText}</span>
                ${isSuccess ? `<span class="result-piercing">| 관통력(${finalPiercing})</span>` : ""}
                ${resultType === "CRITICAL" ? `<span class="result-crit"><i class="fas fa-fire"></i> CRITICAL</span>` : ""}
                ${resultType === "FUMBLE" ? `<span class="result-fumble"><i class="fas fa-skull"></i> FUMBLE</span>` : ""}
              </div>
              
            </div>
          </div>`;

          await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: this.item.actor }), 
            content: chatContent, 
            type: CONST.CHAT_MESSAGE_TYPES.ROLL, 
            sound: CONFIG.sounds.dice,
            rolls: [roll] // ★ 핵심: 3D 주사위 연동
          });
        });

        html.find('#custom-damage-btn').click(async (ev) => {
          ev.preventDefault();
          const dmgType = html.find('input[name="damage-type"]:checked').val();
          let baseDamage = (dmgType === "pen") ? dmgPen : dmgNonPen;
          let bonusDamage = (dmgType === "pen") ? dmgPenBonus : dmgNonPenBonus;
          if (!baseDamage || baseDamage.trim() === "") baseDamage = "0";

          const extraHits = Number(html.find('#extra-hits').val()) || 0;
          let formula = baseDamage;
          if (bonusDamage) formula += ` + ${bonusDamage}`;
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
          <div class="dice-roll">
            <div class="gundog-chat-card">
              
              <div class="chat-header">
                <h3 class="chat-skill-name"><i class="fas fa-burst" style="color:#d9534f;"></i> ${this.item.name}</h3>
                <div class="chat-target">
                  <strong style="color:#444;font-size:12px">${damageLabel}</strong>
                </div>
              </div>
              
              <div class="chat-details">
                <div class="chat-calc" style="word-break:break-all; padding:6px;">
                  값: ( ${detailString} )
                </div>
              </div>
              
              <div class="chat-dice-total" style="color:#292929; margin-bottom:0px">
                ${roll.total}
              </div>
              `;

          await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: this.item.actor }), content: chatContent, type: CONST.CHAT_MESSAGE_TYPES.ROLL, sound: CONFIG.sounds.dice, rolls: [roll]
          });
        });

       // ★ 추가: 대미지 페널티 굴림 로직 (0~9 주사위 처리 적용)
        html.find('#custom-penalty-btn').click(async (ev) => {
          ev.preventDefault();
          const pType = html.find('#penalty-type').val();
          const pMod = Number(html.find('#penalty-mod').val()) || 0;

          // 실제 굴림은 2d10으로 하여 3D 주사위를 띄우되, 10이 나오면 0으로 계산합니다.
          const roll = await new Roll("2d10").evaluate();
          
          let diceTotal = 0;
          let diceResults = [];
          roll.terms[0].results.forEach(r => {
            let val = r.result === 10 ? 0 : r.result; // 10은 0으로 취급
            diceTotal += val;
            diceResults.push(val);
          });

          const total = diceTotal + pMod; // 0~9 범위 2개 합산 + 보정치

          // ==========================================
          // ★ 대미지 페널티 결과표
          // ==========================================
          const penaltyTable = {
            shooting: [
              { min: -99, max: 0, effect: "급소를 꿰뚫는 일격. 대상은 [사망]한다.", addDmg: "0", bleed: "0" },
              { min: 1, max: 1, effect: "과다 출혈로 인해 신체 기능이 거의 마비된다. [추가D] 4D6 / [출혈] 2D6 / [중상]-40% / [몽롱함 판정] 15", addDmg: "4d6", bleed: "2d6" },
              { min: 2, max: 2, effect: "과다 출혈로 인해 의식이 희미해진다. [추가D] 3D6 / [출혈] 2D6 / [중상]-30% / [몽롱함 판정] 14", addDmg: "3d6", bleed: "2d6" },
              { min: 3, max: 3, effect: "출혈로 인해 제대로 서 있기조차 힘들다. [추가D] 3D6 / [출혈] 2D6 / [중상]-30% / [몽롱함 판정] 13", addDmg: "3d6", bleed: "2d6" },
              { min: 4, max: 4, effect: "출혈로 인해 움직일 때마다 고통이 가중된다. [추가D] 3D6 / [출혈] 1D6 / [중상]-20% / [몽롱함 판정] 12", addDmg: "3d6", bleed: "1d6" },
              { min: 5, max: 5, effect: "출혈로 인해 피가 새어 나오며 전투 지속이 위험해진다. [추가D] 2D6 / [출혈] 1D6 / [중상]-20% / [몽롱함 판정] 11", addDmg: "2d6", bleed: "1d6" },
              { min: 6, max: 6, effect: "충격 부위를 제대로 쓰지 못한다. [추가D] 2D6 / [경상]-20% / [몽롱함 판정] 11", addDmg: "2d6", bleed: "0" },
              { min: 7, max: 7, effect: "극심한 통증으로 시야가 일시적으로 흐려진다. [추가D] 2D6 / [경상]-20% / [몽롱함 판정] 10", addDmg: "2d6", bleed: "0" },
              { min: 8, max: 8, effect: "근육이 경직되어 즉각적인 대응이 어렵다. [추가D] 2D6 / [경상]-20% / [몽롱함 판정] 8", addDmg: "2d6", bleed: "0" },
              { min: 9, max: 9, effect: "통증으로 신음하며 움직임이 둔해진다. [추가D] 2D6 / [경상]-20% / [몽롱함 판정] 6", addDmg: "2d6", bleed: "0" },
              { min: 10, max: 10, effect: "균형을 잃고 크게 휘청인다. [추가D] 2D6 / [경상]-20% / [몽롱함 판정] 4", addDmg: "2d6", bleed: "0" },
              { min: 11, max: 11, effect: "팔이나 어깨에 충격을 받아 사격 자세를 유지하기 힘들다. [추가D] 2D6 / [경상]-20%", addDmg: "2d6", bleed: "0" },
              { min: 12, max: 12, effect: "호흡이 흐트러지며 조준이 어려워진다. [추가D] 1D6 / [경상]-20%", addDmg: "1d6", bleed: "0" },
              { min: 13, max: 13, effect: "순간적인 통증으로 반응이 한 박자 늦어진다. [추가D] 1D6 / [경상]-10%", addDmg: "1d6", bleed: "0" },
              { min: 14, max: 14, effect: "충격으로 자세가 크게 흐트러진다. [쇼크]-20%", addDmg: "0", bleed: "0" },
              { min: 15, max: 15, effect: "충격으로 비틀거린다. [쇼크]-10%", addDmg: "0", bleed: "0" },
              { min: 16, max: 16, effect: "충격으로 멍해진다. [불안정]", addDmg: "0", bleed: "0" },
              { min: 17, max: 17, effect: "충격으로 손에 든 무기를 떨어뜨린다. 여럿이라면 무작위로 선택한다.", addDmg: "0", bleed: "0" },
              { min: 18, max: 99, effect: "불행 중 다행, 페널티는 없었다.", addDmg: "0", bleed: "0" }
            ],
            melee: [
              { min: -99, max: 0, effect: "급소에 대한 강력한 일격. 대상은 [사망]한다.", addDmg: "0", bleed: "0" },
              { min: 1, max: 1, effect: "치명적인 일격으로 의식이 흐려지며 쓰러진다. [추가D] 4D6 / [출혈] 2D6 / [중상]-40% / [몽롱함 판정] 15", addDmg: "4d6", bleed: "2d6" },
              { min: 2, max: 2, effect: "과다 출혈로 신체를 지탱하는 것조차 어렵다. [추가D] 3D6 / [출혈] 2D6 / [중상]-30% / [몽롱함 판정] 14", addDmg: "3d6", bleed: "2d6" },
              { min: 3, max: 3, effect: "출혈로 인해 타격 부위가 심하게 손상된다. [추가D] 3D6 / [출혈] 1D6 / [중상]-20% / [몽롱함 판정] 14 / [불안정]", addDmg: "3d6", bleed: "1d6" },
              { min: 4, max: 4, effect: "출혈 발생. 피부가 찢어지며 피가 흐르기 시작한다. [추가D] 2D6 / [출혈] 1D6 / [중상]-20% / [몽롱함 판정] 14", addDmg: "2d6", bleed: "1d6" },
              { min: 5, max: 5, effect: "타격 부위가 붓고 기능이 크게 저하된다. [추가D] 2D6 / [중상]-20% / [몽롱함 판정] 12 / [불안정]", addDmg: "2d6", bleed: "0" },
              { min: 6, max: 6, effect: "팔이나 다리를 제대로 쓰지 못한다. [추가D] 2D6 / [경상]-20% / [몽롱함 판정] 11", addDmg: "2d6", bleed: "0" },
              { min: 7, max: 7, effect: "강한 타격으로 시야가 흔들리고 판단이 흐려진다. [추가D] 2D6 / [경상]-20% / [몽롱함 판정] 10", addDmg: "2d6", bleed: "0" },
              { min: 8, max: 8, effect: "근육이 경련을 일으켜 반격이 늦어진다. [추가D] 2D6 / [경상]-20% / [몽롱함 판정] 8", addDmg: "2d6", bleed: "0" },
              { min: 9, max: 9, effect: "통증으로 몸을 제대로 가누기 힘들다. [추가D] 2D6 / [경상]-20% / [몽롱함 판정] 6", addDmg: "2d6", bleed: "0" },
              { min: 10, max: 10, effect: "균형을 잃고 크게 밀려난다. [추가D] 1D6 / [경상]-20% / [몽롱함 판정] 6", addDmg: "1d6", bleed: "0" },
              { min: 11, max: 11, effect: "뼈나 관절에 충격이 가해져 움직임이 둔해진다. [추가D] 1D6 / [경상]-10% / [몽롱함 판정] 6", addDmg: "1d6", bleed: "0" },
              { min: 12, max: 12, effect: "숨이 턱 막히며 순간적으로 행동이 멈춘다. [추가D] 1D6 / [경상]-10% / [불안정]", addDmg: "1d6", bleed: "0" },
              { min: 13, max: 13, effect: "타격을 제대로 흡수하지 못해 몸이 굳는다. [추가D] 1D6 / [경상]-10%", addDmg: "1d6", bleed: "0" },
              { min: 14, max: 14, effect: "충격으로 자세가 크게 흐트러진다. [쇼크]-20%", addDmg: "0", bleed: "0" },
              { min: 15, max: 15, effect: "충격으로 비틀거린다. [쇼크]-10%", addDmg: "0", bleed: "0" },
              { min: 16, max: 16, effect: "충격으로 멍해진다. [불안정]", addDmg: "0", bleed: "0" },
              { min: 17, max: 17, effect: "충격으로 손에 든 무기를 떨어뜨린다. 여럿이라면 무작위로 선택한다.", addDmg: "0", bleed: "0" },
              { min: 18, max: 99, effect: "불행 중 다행, 페널티는 없었다.", addDmg: "0", bleed: "0" }
            ],
            vehicle: [
              { min: -99, max: 0, effect: "[크래시]한다. [체이스]에서 제외]", addDmg: "0", bleed: "0" },
              { min: 1, max: 1, effect: "[차량D] 4D6 / [탑승자D] 3D6 / [조작성]-40% / [스핀 판정]", addDmg: "4d6", bleed: "3d6" },
              { min: 2, max: 2, effect: "[차량D] 3D6 / [탑승자D] 3D6 / [조작성]-30% / [스핀 판정]", addDmg: "3d6", bleed: "3d6" },
              { min: 3, max: 3, effect: "[탑승자D] 3D6 / [조작성]-20% / [스핀 판정]", addDmg: "0", bleed: "3d6" },
              { min: 4, max: 4, effect: "[차량D] 3D6 / [조작성]-20% / [스핀 판정]", addDmg: "3d6", bleed: "0" },
              { min: 5, max: 5, effect: "[탑승자D] 3D6 / [조작성]-10% / [스핀 판정]", addDmg: "0", bleed: "3d6" },
              { min: 6, max: 6, effect: "[차량D] 3D6 / [조작성]-10% / [스핀 판정]", addDmg: "3d6", bleed: "0" },
              { min: 7, max: 7, effect: "[탑승자D] 2D6 / [스피드]-2 / [스핀 판정]", addDmg: "0", bleed: "2d6" },
              { min: 8, max: 8, effect: "[차량D] 2D6 / [스피드]-2 / [스핀 판정]", addDmg: "2d6", bleed: "0" },
              { min: 9, max: 9, effect: "[탑승자D] 2D6 / [조종판정]-20% / [스핀 판정]", addDmg: "0", bleed: "2d6" },
              { min: 10, max: 10, effect: "[차량D] 2D6 / [조종판정]-20% / [스핀 판정]", addDmg: "2d6", bleed: "0" },
              { min: 11, max: 11, effect: "[탑승자D] 2D6 / [조종판정]-20%", addDmg: "0", bleed: "2d6" },
              { min: 12, max: 12, effect: "[차량D] 2D6 / [조종판정]-20%", addDmg: "2d6", bleed: "0" },
              { min: 13, max: 13, effect: "[차량D] 1D6 / [조종판정]-20%", addDmg: "1d6", bleed: "0" },
              { min: 14, max: 14, effect: "[차량D] 1D6 / [조종판정]-10%", addDmg: "1d6", bleed: "0" },
              { min: 15, max: 15, effect: "공격이 탑승자를 스친다. 무작위로 선택한 탑승자 1명에게 [쇼크]-20%", addDmg: "0", bleed: "0" },
              { min: 16, max: 16, effect: "공격이 탑승자에게 맞을 뻔했다. 무작위로 선택한 탑승자 1명에게 [쇼크]-10%", addDmg: "0", bleed: "0" },
              { min: 17, max: 17, effect: "차량이 구불구불 달린다. 탑승자 전원은 <운동> 성공판정. 실패하면 [불안정]", addDmg: "0", bleed: "0" },
              { min: 18, max: 99, effect: "불행 중 다행, 페널티는 없었다.", addDmg: "0", bleed: "0" }
            ],
            general: [
              { min: -99, max: 0, effect: "치명상을 입었다. 대상은 [사망]한다.", addDmg: "0", bleed: "0" },
              { min: 1, max: 1, effect: "[추가D] 4D6 / [출혈] 2D6 / [중상]-40% / [몽롱함 판정] 15", addDmg: "4d6", bleed: "2d6" },
              { min: 2, max: 2, effect: "[추가D] 3D6 / [출혈] 2D6 / [중상]-30% / [몽롱함 판정] 14", addDmg: "3d6", bleed: "2d6" },
              { min: 3, max: 3, effect: "[추가D] 2D6 / [출혈] 1D6 / [중상]-30% / [몽롱함 판정] 13 / [불안정]", addDmg: "2d6", bleed: "1d6" },
              { min: 4, max: 4, effect: "[추가D] 2D6 / [출혈] 1D6 / [중상]-30% / [몽롱함 판정] 12", addDmg: "2d6", bleed: "1d6" },
              { min: 5, max: 5, effect: "[추가D] 2D6 / [중상]-20% / [몽롱함 판정] 12 / [불안정]", addDmg: "2d6", bleed: "0" },
              { min: 6, max: 6, effect: "[추가D] 1D6 / [중상]-20% / [몽롱함 판정] 11", addDmg: "1d6", bleed: "0" },
              { min: 7, max: 7, effect: "[추가D] 1D6 / [경상]-30% / [몽롱함 판정] 10", addDmg: "1d6", bleed: "0" },
              { min: 8, max: 8, effect: "[추가D] 1D6 / [경상]-30% / [몽롱함 판정] 8", addDmg: "1d6", bleed: "0" },
              { min: 9, max: 9, effect: "[추가D] 1D6 / [경상]-30% / [몽롱함 판정] 6", addDmg: "1d6", bleed: "0" },
              { min: 10, max: 10, effect: "[추가D] 1D6 / [경상]-20% / [몽롱함 판정] 6", addDmg: "1d6", bleed: "0" },
              { min: 11, max: 11, effect: "[경상]-20% / [몽롱함 판정] 6", addDmg: "0", bleed: "0" },
              { min: 12, max: 12, effect: "[경상]-20% / [불안정]", addDmg: "0", bleed: "0" },
              { min: 13, max: 13, effect: "[경상]-20%", addDmg: "0", bleed: "0" },
              { min: 14, max: 14, effect: "[경상]-10%", addDmg: "0", bleed: "0" },
              { min: 15, max: 15, effect: "충격으로 자세가 크게 흐트러진다. [쇼크]-20%", addDmg: "0", bleed: "0" },
              { min: 16, max: 16, effect: "충격으로 비틀거린다. [쇼크]-10%", addDmg: "0", bleed: "0" },
              { min: 17, max: 17, effect: "충격으로 멍해진다 [불안정]", addDmg: "0", bleed: "0" },
              { min: 18, max: 99, effect: "불행 중 다행, 페널티는 없었다.", addDmg: "0", bleed: "0" }
            ]
          };

          const typeLabels = { shooting: "사격", melee: "격투", vehicle: "차량", general: "범용" };
          const currentTable = penaltyTable[pType];
          
          let resultData = currentTable[currentTable.length - 1]; 
          for (let row of currentTable) {
            if (total >= row.min && total <= row.max) {
              resultData = row;
              break;
            }
          }

          let detailString = `2d9[${diceResults.join(", ")}]`;
          if (pMod > 0) detailString += ` + ${pMod}`;
          else if (pMod < 0) detailString += ` - ${Math.abs(pMod)}`;

          // ==========================================
          // ★ 수동 굴림 버튼 생성 로직
          // ==========================================
          let rollsToSync = [roll]; // 2d9 주사위만 3D 애니메이션 연동
          let addDmgDetail = "없음";
          let bleedDetail = '<span style="color:red;">없음</span>';
          
          const actorId = this.item.actor ? this.item.actor.id : "";
          const bleedLabel = (pType === "vehicle") ? "탑승자" : "출혈";

          // 추가 대미지 버튼 생성
          if (resultData.addDmg !== "0") {
            addDmgDetail = `<button type="button" class="gundog-chat-btn" data-formula="${resultData.addDmg}" data-title="추가 대미지" data-actor-id="${actorId}" style="height:24px; line-height:12px; font-size:11px; padding:0 8px; background:#d9534f; color:white; border:none; border-radius:3px; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.2);"><i class="fas fa-dice"></i> ${resultData.addDmg} 굴림</button>`;
          }
          
          // 출혈(탑승자) 대미지 버튼 생성
          if (resultData.bleed !== "0") {
            bleedDetail = `<button type="button" class="gundog-chat-btn" data-formula="${resultData.bleed}" data-title="${bleedLabel} 대미지" data-actor-id="${actorId}" style="height:24px; line-height:12px; font-size:11px; padding:0 8px; background:#dc3545; color:white; border:none; border-radius:3px; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.2);"><i class="fas fa-tint"></i> ${resultData.bleed} 굴림</button>`;
          }

          // 채팅창에 띄울 내용 조합
          const chatContent = `
          <div class="dice-roll">
            <div class="gundog-chat-card" style="border-top: 4px solid #6f42c1;">
              
              <div class="chat-header">
                <h3 class="chat-skill-name">
                  <i class="fas fa-skull" style="color:#6f42c1;"></i> ${typeLabels[pType]} 페널티
                </h3>
              </div>
              
              <div class="chat-details">
                <div class="chat-calc" style="word-break:break-all; padding:6px;">
                  굴림: ( ${detailString} )
                </div>
              </div>
              
              <div class="chat-dice-total" style="color:#6f42c1;">
                ${total}
              </div>
              
              <div class="chat-penalty-box">
                <div class="chat-penalty-effect">
                  ${resultData.effect}
                </div>
                <div class="chat-penalty-details">
                  <span><strong>추가 대미지:</strong> ${addDmgDetail}</span>
                  <span><strong>${bleedLabel}:</strong> ${bleedDetail}</span>
                </div>
              </div>
              
            </div>
          </div>`;

          // 주사위 굴림 결과 메시지 출력
          await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: this.item.actor }), 
            content: chatContent, 
            type: CONST.CHAT_MESSAGE_TYPES.ROLL, 
            sound: CONFIG.sounds.dice, 
            rolls: rollsToSync 
          });
        });

        // ★ 추가: 다이얼로그 창이 닫힐 때 실시간 동기화 연결고리를 끊어줍니다
      close: (html) => {
        const hookId = html.data("ammoHookId");
        if (hookId) Hooks.off("updateItem", hookId);
      }

        html.find('#custom-close-btn').click(ev => { ev.preventDefault(); rollDialog.close(); });
      }
    });

    rollDialog.render(true);
  }
}