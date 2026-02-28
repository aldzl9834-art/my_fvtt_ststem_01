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
    types: ["weapon", "armor", "attachment", "item", "upkeepitem", "connection"],
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
    context.weapons = [];
    context.headArmors = [];
    context.bodyArmors = [];

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

    context.gridItems = [];
    context.unplacedItems = [];
    context.trashItems = [];
    
    // ★ 추가: 유지 자산 및 커넥션 배열
    context.upkeepItems = []; 
    context.connections = []; 

    let totalMaintenance = 0; // ★ 추가: 총 유지비 합산 변수

    // ★ 수정: 아이템들을 순서(sort)값에 따라 정렬한 후 반복문을 돌립니다.
    const allSortedItems = Array.from(this.actor.items).sort((a, b) => (a.sort || 0) - (b.sort || 0));
    
    // 하나의 반복문으로 소지한 모든 아이템을 정확하게 분배합니다.
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
        context.weapons.push(item); // 무기는 무기 배열로
      } 
      else if (item.type === "armor") {
        if (item.system.armorType === "head") {
          context.headArmors.push(item); // 머리 방어구는 머리 배열로
        } else {
          context.bodyArmors.push(item); // 몸통 방어구는 몸통 배열로
        }
      }

      // --- [유지비 및 커넥션 분류] ---
      if (item.type === "upkeepitem") {
        totalMaintenance += Number(item.system.maintenanceCost) || 0;
        context.upkeepItems.push(item);
      } else if (item.type === "connection") {
        totalMaintenance += Number(item.system.maintenanceCost) || 0;
        context.connections.push(item);
      }

      // --- [CP 관리표(인벤토리) 분류] ---
      // ★ 수정: upkeepitem을 배열 조건에서 삭제하여 인벤토리에 들어가지 않게 합니다.
      if (["weapon", "armor", "item", "attachment"].includes(item.type)) {
        let portX = Math.max(1, Number(item.system.portability?.x) || 1); 
        let portY = Math.max(1, Number(item.system.portability?.y) || 1);
        let gx = Number(item.system.grid?.x);
        let gy = Number(item.system.grid?.y);

        let itemData = {
          id: item.id,
          name: item.name,
          type: item.type, // ★ 추가: HTML에서 타입을 판별하기 위해 넘겨줍니다.
          portX: portX,
          portY: portY,
          w: portX * 40,
          h: portY * 40,
          isWearable: item.system.isWearable
        };

        if (gx === -2 && gy === -2) {
          // 휴지통
          context.trashItems.push(itemData);
        } else {
          // 휴지통에 없는 모든 아이템은 무조건 '보유중인 아이템' 목록에 띄웁니다.
          context.unplacedItems.push(itemData);

          // 방어구 등 '몸에 입는 착용 아이템'은 그리드 배치 불가. 
          // 단, 총기 부착물(attachment)은 예외로 그리드 배치를 허용합니다.
          let canPlaceInGrid = true;
          if (item.system.isWearable && item.type !== "attachment") {
            canPlaceInGrid = false;
          }

          if (canPlaceInGrid && !isNaN(gx) && gx >= 0 && gy >= 0) {
            // 인벤토리(CP 관리표)에 배치 완료된 경우
            itemData.left = gx * 40;
            itemData.top = gy * 40;
            itemData.isPlaced = true; // HBS에서 뱃지를 띄우기 위한 신호
            context.gridItems.push(itemData);
          } else {
            // 미배치 상태
            itemData.isPlaced = false;
          }
        }
      }
    }

    // ★ 추가: 합산된 총 유지비를 캐릭터 시트로 전달
    context.totalMaintenanceCost = totalMaintenance;

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

    // ==========================================// ==========================================
    // ★ 추가: CP 관리표 (드래그 앤 드롭 인벤토리) 이벤트 로직
    // ==========================================
    
    // 아이템 더블 클릭 시 시트 열기
    html.find('.cp-grid-item, .unplaced-item, .trash-item').dblclick(ev => {
      const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
      if (item) item.sheet.render(true);
    });

    // 1. 드래그 시작 (휴지통 아이템 추가)
    html.find('.cp-grid-item, .unplaced-item, .trash-item').on('dragstart', ev => {
      ev.originalEvent.dataTransfer.setData("text/plain", JSON.stringify({
        type: "CPGridItem", actorId: this.actor.id, itemId: ev.currentTarget.dataset.itemId
      }));
      setTimeout(() => $(ev.currentTarget).css("opacity", "0.5"), 10);
    });
    html.find('.cp-grid-item, .unplaced-item, .trash-item').on('dragend', ev => $(ev.currentTarget).css("opacity", "1.0"));

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
          // 총기 부착물이 아닌 일반 착용 방어구 등은 드롭 차단
          if (item.system.isWearable && item.type !== "attachment") {
            return ui.notifications.warn("착용하는 방어구나 의류는 CP 관리표(칸)에 배치할 수 없습니다!");
          }

          let pX = Math.max(1, Number(item.system.portability?.x) || 1);
          let pY = Math.max(1, Number(item.system.portability?.y) || 1);
          
          // 기본 외곽선(10x10) 절대 충돌 검사는 유지 (표 밖으로 나가는 것만 방지)
          if (dropX + pX > 10 || dropY + pY > 10) {
            return ui.notifications.warn("CP 관리표의 영역을 벗어납니다!");
          }

          // 다른 아이템과 겹침(Collision) 방지
          let 일isColliding = false;
          for (let other of this.actor.items) {
            if (other.id === item.id) continue;
            if (["weapon", "armor", "item", "upkeepitem", "attachment"].includes(other.type)) {
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
    // ★ 추가: 보유중인 아이템끼리 순서 변경(스왑) 로직
    // ==========================================
    html.find('.unplaced-item').on('dragover', ev => { 
      ev.preventDefault(); 
      ev.stopPropagation(); // 부모 리스트의 이벤트 방해를 막음
      $(ev.currentTarget).css("border", "2px solid #0056b3"); // 드롭 타겟 표시
    });
    
    html.find('.unplaced-item').on('dragleave', ev => { 
      $(ev.currentTarget).css("border", "1px solid #ccc"); 
    });
    
    html.find('.unplaced-item').on('drop', async ev => {
      ev.preventDefault(); 
      ev.stopPropagation();
      $(ev.currentTarget).css("border", "1px solid #ccc");
      
      let data;
      try { data = JSON.parse(ev.originalEvent.dataTransfer.getData('text/plain')); } catch(err) { return; }
      
      if (data && data.type === "CPGridItem" && data.actorId === this.actor.id) {
        const targetId = ev.currentTarget.dataset.itemId;
        const sourceId = data.itemId;
        
        if (targetId === sourceId) return; // 자기 자신에게 떨어뜨린 경우 무시
        
        const sourceItem = this.actor.items.get(sourceId);
        const targetItem = this.actor.items.get(targetId);
        
        if (sourceItem && targetItem) {
          // 두 아이템의 정렬(Sort) 순서 값을 가져와서 서로 교체합니다.
          let sourceSort = sourceItem.sort || 0;
          let targetSort = targetItem.sort || 0;
          
          if (sourceSort === targetSort) targetSort += 10000; // 초기값이 우연히 같을 경우 보정
          
          let sourceUpdate = { sort: targetSort };
          
          // 만약 CP 그리드(왼쪽 표)에 있던 아이템을 다른 아이템 위에 떨어뜨렸다면, 좌표도 해제합니다.
          if (sourceItem.system.grid?.x !== -1) {
            sourceUpdate["system.grid.x"] = -1;
            sourceUpdate["system.grid.y"] = -1;
          }
          
          await targetItem.update({ sort: sourceSort });
          await sourceItem.update(sourceUpdate);
        }
      }
    });

    // 4. 휴지통으로 드래그해서 버리기 (이하 생략) ...
    html.find('.trash-item-list').on('dragover', ev => { ev.preventDefault(); $(ev.currentTarget).css("background", "#f8d7da"); });
    html.find('.trash-item-list').on('dragleave', ev => { $(ev.currentTarget).css("background", "#fff4f4"); });
    html.find('.trash-item-list').on('drop', async ev => {
      $(ev.currentTarget).css("background", "#fff4f4");
      let data;
      try { data = JSON.parse(ev.originalEvent.dataTransfer.getData('text/plain')); } catch(err) { return; }
      
      if (data && data.type === "CPGridItem" && data.actorId === this.actor.id) {
        ev.preventDefault(); ev.stopPropagation();
        const item = this.actor.items.get(data.itemId);
        // 휴지통으로 가면 좌표를 -2, -2로 설정
        if (item) await item.update({"system.grid.x": -2, "system.grid.y": -2});
      }
    });

    // 5. 휴지통 비우기 버튼
    html.find('.empty-trash-btn').click(async ev => {
      ev.preventDefault();
      // 휴지통에 있는 아이템의 ID들을 수집
      const trashIds = this.actor.items.filter(i => i.system.grid?.x === -2 && i.system.grid?.y === -2).map(i => i.id);
      if (trashIds.length === 0) return ui.notifications.info("휴지통이 비어있습니다.");
      
      let confirm = await Dialog.confirm({
        title: "휴지통 비우기",
        content: "<p>휴지통에 있는 모든 아이템을 캐릭터에서 <strong>영구적으로 삭제</strong>하시겠습니까?</p><p style='color:red; font-size:12px;'>※ 장비 탭에 있는 아이템도 함께 삭제됩니다.</p>",
        yes: () => true,
        no: () => false,
        defaultYes: false
      });

      if (confirm) {
        await this.actor.deleteEmbeddedDocuments("Item", trashIds);
        ui.notifications.info(`${trashIds.length}개의 아이템이 성공적으로 삭제되었습니다.`);
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
      width: 465,
      height: 620,
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
          if (!att.modifiers) continue;
          ['pointBlank', 'short', 'medium', 'long', 'sniping'].forEach(k => {
            computed.rangeBuffs[k] = (Number(computed.rangeBuffs[k]) || 0) + (Number(att.modifiers.rangeBuffs?.[k]) || 0);
            computed.rangePenalties[k] = (Number(computed.rangePenalties[k]) || 0) + (Number(att.modifiers.rangePenalties?.[k]) || 0);
          });
          computed.reliabilityBonus += Number(att.modifiers.reliability) || 0;
          computed.noiseLevelBonus += Number(att.modifiers.noiseLevel) || 0;
          computed.armorPiercingBonus += Number(att.modifiers.armorPiercing) || 0;
          computed.ammoMaxBonus += Number(att.modifiers.ammoMax) || 0;
          computed.snipingBonus += Number(att.modifiers.snipingBonus) || 0;
          computed.snipingPenalty += Number(att.modifiers.snipingPenalty) || 0;
          
         if (att.modifiers.damageNonPen) dmgNonPenArr.push(att.modifiers.damageNonPen);
          if (att.modifiers.damagePen) dmgPenArr.push(att.modifiers.damagePen);
          
          // 탄약 가격 배수 곱연산
          let mult = Number(att.modifiers.ammoMultiplier);
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

  activateListeners(html) {
    super.activateListeners(html);

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
    if (data.type !== "Item") return;

    const dropItem = await Item.implementation.fromDropData(data);
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
    
    // 데미지를 문자열 배열로 모으기
    let dmgNonPenArr = [];
    let dmgPenArr = [];

    for (let slot in this.item.system.attachments) {
      const arr = this.item.system.attachments[slot];
      if (Array.isArray(arr)) {
        for (let att of arr) {
          if (!att.modifiers) continue;
          wBuff += Number(att.modifiers.rangeBuffs?.[rangeKey]) || 0;
          wPenalty += Number(att.modifiers.rangePenalties?.[rangeKey]) || 0;
          sBonus += Number(att.modifiers.snipingBonus) || 0;
          sPenalty += Number(att.modifiers.snipingPenalty) || 0;
          
          if (att.modifiers.damageNonPen) dmgNonPenArr.push(att.modifiers.damageNonPen);
          if (att.modifiers.damagePen) dmgPenArr.push(att.modifiers.damagePen);
        }
      }
    }

    let dmgNonPenBonus = dmgNonPenArr.join(" + ");
    let dmgPenBonus = dmgPenArr.join(" + ");

    let baseTarget = Number(actorSkill.targetValue) || 0;
    let sniperText = "";
    // ★ 수정: 사거리가 '저격'일 때만 부착물의 저격 전용 보너스/페널티를 합산합니다.
    if (rangeKey === "sniping" && (sBonus > 0 || sPenalty > 0)) {
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
            비관통 (${dmgNonPen} <span style="color:blue;">${dmgNonPenBonus ? '+ ' + dmgNonPenBonus : ''}</span>)
          </label>
          <label style="font-weight:bold; font-size:13px; cursor:pointer;">
            <input type="radio" name="damage-type" value="pen"> 
            관통 (${dmgPen} <span style="color:blue;">${dmgPenBonus ? '+ ' + dmgPenBonus : ''}</span>)
          </label>
        </div>

        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:15px; padding:0 5px;">
          <label style="font-weight:bold; font-size:13px; color:#333;">명중 횟수에 따른 추가 다이스 (+Xd6)</label>
          <div style="display:flex; align-items:center; gap:5px;">
            <input type="number" id="extra-hits" value="0" min="0" style="width:50px; text-align:center; height:28px; font-size:14px; font-weight:bold; border:2px solid #333;"/>
            <span style="font-weight:bold; font-size:14px;">d6</span>
          </div>
        </div>

        <div style="display:flex; gap:10px; margin-bottom:15px;">
          <button type="button" id="custom-damage-btn" style="width:100%; background:#d9534f; color:white; border:none; border-radius:3px; height:36px; cursor:pointer; font-weight:bold; font-size:13px;">
            <i class="fas fa-dice"></i> 데미지 굴림
          </button>
        </div>

        <hr style="margin:20px 0; border-top:1px dashed #ccc;">

        <h3 style="border-bottom:2px solid #6f42c1; padding-bottom:5px; margin-bottom:15px; color:#6f42c1;">
          <i class="fas fa-skull-crossbones"></i> 대미지 페널티 굴림 (2d9)
        </h3>
        
        <div style="display:flex; justify-content:space-between; margin-bottom:15px; padding:8px; background:#f9f9f9; border:1px solid #ddd; border-radius:4px;">
          <label style="font-weight:bold; font-size:13px; display:flex; align-items:center; gap:5px;">
            종류:
            <select id="penalty-type" style="height:24px; font-size:12px;">
              <option value="shooting">사격</option>
              <option value="melee">격투</option>
              <option value="vehicle">차량</option>
              <option value="general">범용</option>
            </select>
          </label>
          <label style="font-weight:bold; font-size:13px; display:flex; align-items:center; gap:5px;">
            보정치:
            <input type="number" id="penalty-mod" value="0" style="width:50px; text-align:center; height:24px; font-weight:bold; border:1px solid #ccc;"/>
          </label>
        </div>

        <div style="display:flex; gap:10px;">
          <button type="button" id="custom-penalty-btn" style="flex:2; background:#6f42c1; color:white; border:none; border-radius:3px; height:36px; cursor:pointer; font-weight:bold; font-size:13px;">
            <i class="fas fa-skull"></i> 페널티 굴림
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
          
          // 결과값(total)이 포함되는 구간 찾기
          let resultData = currentTable[currentTable.length - 1]; 
          for (let row of currentTable) {
            if (total >= row.min && total <= row.max) {
              resultData = row;
              break;
            }
          }

          // 표기용 텍스트 강제 고정 (2d9)
          let detailString = `2d9[${diceResults.join(", ")}]`;
          if (pMod > 0) detailString += ` + ${pMod}`;
          else if (pMod < 0) detailString += ` - ${Math.abs(pMod)}`;

          // ==========================================
          // ★ 추가 대미지와 출혈 주사위 자동 굴림
          // ==========================================
          let rollsToSync = [roll]; // 3D 다이스 애니메이션 연동
          let addDmgDetail = "없음";
          let bleedDetail = '<span style="color:red;">없음</span>';

          // 주사위 눈금만 추출해서 콤마로 이어붙여주는 도우미 함수
          const getDiceDetails = (r) => {
            let results = [];
            for (let term of r.terms) {
              if (term.faces && term.results) {
                results.push(...term.results.map(res => res.result));
              }
            }
            return results.join(", ");
          };

          if (resultData.addDmg !== "0") {
            const addRoll = await new Roll(resultData.addDmg).evaluate();
            rollsToSync.push(addRoll);
            const diceStr = getDiceDetails(addRoll);
            addDmgDetail = `${resultData.addDmg} <i class="fas fa-arrow-right" style="margin:0 3px; color:#999;"></i> <strong style="font-size:15px; color:#d9534f;">+${addRoll.total} <span style="font-size:12px; font-weight:normal; color:#555;">[${diceStr}]</span></strong>`;
          }
          
          if (resultData.bleed !== "0") {
            const bleedRoll = await new Roll(resultData.bleed).evaluate();
            rollsToSync.push(bleedRoll);
            const diceStr = getDiceDetails(bleedRoll);
            bleedDetail = `<span style="color:red;">${resultData.bleed} <i class="fas fa-arrow-right" style="margin:0 3px; color:#999;"></i> <strong style="font-size:15px;">${bleedRoll.total} <span style="font-size:12px; font-weight:normal; color:#777;">[${diceStr}]</span></strong></span>`;
          }

          // ★ 선택한 타입이 '차량(vehicle)'이면 '탑승자', 아니면 '출혈'로 라벨 텍스트 지정
          const bleedLabel = (pType === "vehicle") ? "탑승자" : "출혈";

          const chatContent = `
          <div class="dice-roll gundog-roll">
            <div class="dice-result">
              <div class="dice-formula" style="background:#6f42c1; color:white; border-radius:4px 4px 0 0;"><i class="fas fa-skull"></i> ${typeLabels[pType]} 대미지 페널티</div>
              <div class="dice-tooltip" style="padding:5px; background:#fff; border:1px solid #ccc; font-size:12px; margin-bottom:5px; word-break:break-all;">
                페널티 굴림: ( ${detailString} )
              </div>
              <h4 class="dice-total" style="color:#6f42c1; font-size:20px;">판정값 ${total}</h4>
              <div style="margin-top:5px; padding:10px; border:1px solid #6f42c1; background:#f8f0ff; border-radius:4px; font-size:13px; text-align:left;">
                <div style="font-weight:bold; color:#d9534f; margin-bottom:6px; border-bottom:1px dotted #d9534f; padding-bottom:4px;">
                  ${resultData.effect}
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span><strong>추가 대미지:</strong> ${addDmgDetail}</span>
                  <span><strong>${bleedLabel}:</strong> ${bleedDetail}</span>
                </div>
              </div>
            </div>
          </div>`;

          await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: this.item.actor }), 
            content: chatContent, 
            type: CONST.CHAT_MESSAGE_TYPES.ROLL, 
            sound: CONFIG.sounds.dice, 
            rolls: rollsToSync 
          });
        });

        html.find('#custom-close-btn').click(ev => { ev.preventDefault(); rollDialog.close(); });
      }
    });

    rollDialog.render(true);
  }
}