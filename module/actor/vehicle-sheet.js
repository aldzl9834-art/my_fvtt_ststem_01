export class GundogVehicleSheet extends ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["gundog", "sheet", "actor", "vehicle"],
      template: "systems/gundog/templates/vehicle-sheet.hbs",
      width: 850,  // CP 관리표를 위해 넓이 확장
      height: 850, // 세로 공간 확보
      resizable: true,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "profile" }] 
    });
  }

  getData() {
    const context = super.getData();
    context.system = context.data.system || context.actor.system; 
    
    context.attachments = { top: [], under: [], side: [], tire: [], weapon: [], body: [], glass: [] };
    let mods = { hp: 0, armor: 0, defense: 0, speedNormal: 0, speedLimit: 0, handling: 0, maintenanceCost: 0 };

    // 1. CP 관리표 10x30 셀 데이터 초기화
    context.cpColNumbers = Array.from({length: 10}, (_, i) => i + 1);
    context.cpRowNumbers = Array.from({length: 30}, (_, i) => {
      let num = i + 1;
      return { num: num, isFifth: num % 5 === 0 }; // 5칸마다 눈금 표시용 플래그
    });

    context.gridCells = [];
    const invMaxX = Number(context.system.inventoryMax?.x) || 10;
    const invMaxY = Number(context.system.inventoryMax?.y) || 30;
    const isSimplified = context.system.simplifiedWeightRule || false; // ★ 추가: 간이 중량 규칙 켜짐 여부 확인

    for (let y = 0; y < 30; y++) {
      for (let x = 0; x < 10; x++) {
        context.gridCells.push({ 
          x, 
          y, 
          // ★ 수정: 간이 중량 규칙이 켜져있으면(!isSimplified) 무조건 비활성화(false) 처리
          isActive: !isSimplified && (x < invMaxX) && (y < invMaxY),
          isFifthRow: (y + 1) % 5 === 0 
        });
      }
    }

    context.gridItems = [];
    context.unplacedItems = [];
    let cpItemIndex = 0;
    let totalCargoCells = 0; // ★ 추가: 화물의 총 칸수를 저장할 변수

    // 2. 아이템 분류 및 합산
    const allSortedItems = Array.from(this.actor.items).sort((a, b) => (a.sort || 0) - (b.sort || 0));

    for (let item of allSortedItems) {
      if (item.type === "vehicleAttachment") {
        // ★ 수정: "장착(isWearable)" 체크박스가 켜져 있을 때만 차량 능력치에 반영하고 그리드를 건너뜁니다.
        if (item.system.isWearable) {
          let type = item.system.attachmentType || "top";
          if (context.attachments[type]) context.attachments[type].push(item);
          
          let m = item.system.modifiers || {};
          mods.hp += Number(m.hp) || 0;
          mods.armor += Number(m.armor) || 0;
          mods.defense += Number(m.defense) || 0;
          mods.speedNormal += Number(m.speedNormal) || 0;
          mods.speedLimit += Number(m.speedLimit) || 0;
          mods.handling += Number(m.handling) || 0;
          mods.maintenanceCost += Number(item.system.maintenanceCost) || 0;
          
          continue; // ★ 장착 중이므로 아래의 CP 관리표(화물) 목록으로 내려가지 않고 바로 다음 아이템으로 넘어감
        }
      }

      // --- [차량 적재량(CP 인벤토리) 분류] ---
      if (["weapon", "armor", "item", "attachment", "vehicleAttachment"].includes(item.type)) {
        let pxVal = item.system.portability?.x;
        let pyVal = item.system.portability?.y;
        let portX = (pxVal !== undefined && pxVal !== "") ? Number(pxVal) : 1; 
        let portY = (pyVal !== undefined && pyVal !== "") ? Number(pyVal) : 1;
        
        // 화물의 가로 x 세로 칸수를 모두 더해줍니다.
        totalCargoCells += (portX * portY);

        let gx = Number(item.system.grid?.x);
        let gy = Number(item.system.grid?.y);

        let itemData = {
          id: item.id, name: item.name, type: item.type,
          portX: portX, portY: portY, 
          w: portX === 0 ? 40 : portX * 40, 
          h: portY === 0 ? 40 : portY * 40,
          isWearable: item.system.isWearable
        };

        itemData.gridLabel = cpItemIndex < 26 
          ? String.fromCharCode(65 + cpItemIndex) 
          : String.fromCharCode(64 + Math.floor(cpItemIndex / 26)) + String.fromCharCode(65 + (cpItemIndex % 26));
        cpItemIndex++;

        context.unplacedItems.push(itemData);

        if (!isNaN(gx) && gx >= 0 && gy >= 0) {
          itemData.left = gx * 40;
          itemData.top = gy * 40;
          itemData.isPlaced = true;
          context.gridItems.push(itemData);
        } else {
          itemData.isPlaced = false;
        }
      }
    }

    // 최종 합산 계산
    context.computed = {
      hpMax: (Number(context.system.hp?.max) || 0) + mods.hp,
      armor: (Number(context.system.armor) || 0) + mods.armor,
      defense: (Number(context.system.defense) || 0) + mods.defense,
      speedNormal: (Number(context.system.speed?.normal) || 0) + mods.speedNormal,
      speedLimit: (Number(context.system.speed?.limit) || 0) + mods.speedLimit,
      handling: (Number(context.system.handling) || 0) + mods.handling,
      maintenanceCost: (Number(context.system.maintenanceCost) || 0) + mods.maintenanceCost,
      mods: mods,
      totalVcpCells: (Number(context.system.vcp) || 0) * 50,
      totalCargoCells: totalCargoCells // ★ 추가: 총 화물 칸수
    };
    
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.options.editable) return;

    // ==========================================
    // ★ 추가: 엔터키 버그 수정
    // ==========================================
    html.find('input').on('keydown', function(ev) {
      if (ev.key === "Enter") {
        ev.preventDefault();
        $(this).blur(); 
      }
    });

    // 기존 부착물 삭제/편집 이벤트
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if (item) item.sheet.render(true);
    });

    html.find('.item-delete').click(async ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if (item) await item.delete();
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
    // ========================================================
    // ★ [유지비 전용] 평소엔 최종값, 클릭 시 기본값 표시 스크립트
    // ========================================================
    
    // 1. 시트가 열릴 때: 최종 합산값(computed)에 콤마를 찍어서 보여줍니다.
    html.find('.dynamic-cost-input, .dynamic-stat-input').each(function() {
      let computedVal = Number($(this).data('computed')) || 0;
      $(this).val(computedVal.toLocaleString('en-US'));
    });

    // 2. 사용자가 클릭(포커스)할 때: 수정하기 편하도록 기본값(base)을 콤마 없이 띄웁니다.
    html.find('.dynamic-cost-input, .dynamic-stat-input').focus(function() {
      let baseVal = Number($(this).data('base')) || 0;
      if (baseVal === 0) $(this).val(""); 
      else $(this).val(baseVal);
    });

    // 3. 포커스를 잃었을 때(수정 취소 등): 다시 원래의 최종 합산값으로 되돌려 보여줍니다.
    html.find('.dynamic-cost-input, .dynamic-stat-input').blur(function() {
      let computedVal = Number($(this).data('computed')) || 0;
      $(this).val(computedVal.toLocaleString('en-US'));
    });

    // 4. 입력 완료 시: 변경된 '기본값'을 파운드리 DB에 확실하게 저장합니다.
    html.find('.dynamic-cost-input, .dynamic-stat-input').change(async (ev) => {
      ev.preventDefault();
      const field = ev.currentTarget.dataset.field;
      
      let rawVal = String(ev.currentTarget.value).replace(/,/g, '');
      let val = Number(rawVal) || 0;
      
      // DB 업데이트 (이후 시트가 자동 재렌더링되며 합산 로직이 다시 돌아갑니다)
      await this.actor.update({ [field]: val });
    });



    // ==========================================
    // 차량 CP 관리표(인벤토리) 특수 기능
    // ==========================================

    // 간이 중량 규칙 토글
    html.find('.toggle-simplified-weight').click(async ev => {
      ev.preventDefault();
      const current = this.actor.system.simplifiedWeightRule || false;
      const willBeOn = !current; // 토글 후의 상태

      // 1. 액터의 간이 중량 규칙 상태 업데이트
      await this.actor.update({"system.simplifiedWeightRule": willBeOn});

      // 2. 만약 규칙을 '켜는(On)' 것이라면, 그리드에 배치된 모든 아이템을 빼냅니다.
      if (willBeOn) {
        const itemUpdates = [];
        
        for (let item of this.actor.items) {
          if (["weapon", "armor", "item", "attachment", "vehicleAttachment"].includes(item.type)) {
            let gx = Number(item.system.grid?.x);
            // 그리드에 배치된(좌표가 0 이상인) 아이템인지 확인
            if (!isNaN(gx) && gx >= 0) {
              itemUpdates.push({
                _id: item.id,
                "system.grid.x": -1,
                "system.grid.y": -1,
                "system.grid.type": "none" // 소속 초기화
              });
            }
          }
        }
        
        // 업데이트할 아이템이 있다면 일괄 업데이트 처리
        if (itemUpdates.length > 0) {
          await this.actor.updateEmbeddedDocuments("Item", itemUpdates);
          ui.notifications.info("간이 중량 규칙이 활성화되어, 그리드에 배치되었던 모든 화물이 목록으로 이동되었습니다.");
        }
      }
    });

    // 한계치 싱크 업데이트
    html.find('.sync-input').change(async ev => {
      const field = ev.currentTarget.dataset.field;
      // ★ 콤마 제거 로직 추가
      let rawVal = String(ev.currentTarget.value).replace(/,/g, '');
      let val = Number(rawVal) || 0;
      
      if (val < 1) val = 1;
      
      if (field === "system.inventoryMax.x" && val > 10) val = 10;
      if (field === "system.inventoryMax.y" && val > 30) val = 30;
      
      await this.actor.update({ [field]: val });
    });

    // CP 관리표 드래그 시작/종료
    // 1. 드래그 가능한 아이템에 부착물(.attachment-item) 추가
    html.find('.cp-grid-item, .unplaced-item, .attachment-item').dblclick(ev => {
      const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
      if (item) item.sheet.render(true);
    });

    html.find('.cp-grid-item, .unplaced-item, .attachment-item').on('dragstart', ev => {
      ev.originalEvent.dataTransfer.setData("text/plain", JSON.stringify({
        type: "CPGridItem", actorId: this.actor.id, itemId: ev.currentTarget.dataset.itemId
      }));
      setTimeout(() => $(ev.currentTarget).css("opacity", "0.5"), 10);
    });
    html.find('.cp-grid-item, .unplaced-item, .attachment-item').on('dragend', ev => $(ev.currentTarget).css("opacity", "1.0"));

    // 2. [추가] 장착 해제 버튼(화살표 아래) 클릭 이벤트
    html.find('.item-unequip').click(async ev => {
      ev.preventDefault(); ev.stopPropagation();
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if (item) {
        // 장착을 해제하면 자동으로 '화물 및 아이템' 목록으로 돌아갑니다.
        await item.update({"system.isWearable": false, "system.attachmentType": ""});
        ui.notifications.info(`${item.name}의 장착이 해제되었습니다.`);
      }
    });

    // 3. [추가] 부착물 슬롯으로 드롭 (장착하기)
    html.find('.attachment-slot').on('dragover', ev => {
      ev.preventDefault();
      $(ev.currentTarget).css("background", "#e8f4ff"); // 올려놓을 때 하이라이트 효과
    });
    html.find('.attachment-slot').on('dragleave', ev => {
      $(ev.currentTarget).css("background", "#f4f4f4");
    });
    html.find('.attachment-slot').on('drop', async ev => {
      $(ev.currentTarget).css("background", "#f4f4f4");
      let data; try { data = JSON.parse(ev.originalEvent.dataTransfer.getData('text/plain')); } catch(err) { return; }

      if (data && data.type === "CPGridItem") {
        ev.preventDefault(); ev.stopPropagation();
        const sourceActor = game.actors.get(data.actorId);
        if (!sourceActor) return;
        const item = sourceActor.items.get(data.itemId);
        const slotType = ev.currentTarget.dataset.slot; // 어느 부위인지 (top, under 등)

        if (item) {
          if (item.type !== "vehicleAttachment") {
            return ui.notifications.warn("차량 부착물(Vehicle Attachment)만 장착할 수 있습니다.");
          }

          if (sourceActor.id === this.actor.id) {
            // 자신의 화물칸에 있던 아이템 장착
            await item.update({
              "system.isWearable": true,
              "system.attachmentType": slotType,
              "system.grid.x": -1, // 그리드에서 빼기
              "system.grid.y": -1
            });
          } else {
            // 다른 캐릭터에서 드래그 해온 경우 복사 후 장착
            let newItemData = item.toObject();
            newItemData.system.isWearable = true;
            newItemData.system.attachmentType = slotType;
            newItemData.system.grid = { x: -1, y: -1, type: "none" };

            await this.actor.createEmbeddedDocuments("Item", [newItemData]);
            await sourceActor.deleteEmbeddedDocuments("Item", [item.id]);
            ui.notifications.info(`[${sourceActor.name}]의 <${item.name}>을(를) 차량 부착물로 장착했습니다.`);
          }
        }
      }
    });

    // 4. (기존 코드 유지 및 보완) 미배치 목록으로 빼기 드롭
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
            // ★ 수정: 화물칸으로 돌릴 때 부착물 상태도 해제(isWearable: false) 되도록 추가
            await item.update({"system.grid.x": -1, "system.grid.y": -1, "system.grid.type": "none", "system.isWearable": false});
          } else {
            let newItemData = item.toObject();
            newItemData.system.grid = { x: -1, y: -1, type: "none" };
            newItemData.system.isWearable = false;
            
            await this.actor.createEmbeddedDocuments("Item", [newItemData]);
            await sourceActor.deleteEmbeddedDocuments("Item", [item.id]);
            ui.notifications.info(`[${sourceActor.name}]의 <${item.name}>을(를) 차량 미배치 목록으로 옮겼습니다.`);
          }
        }
      }
    });

    // 미배치 목록으로 빼기 (캐릭터 -> 차량 연동)
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
            ui.notifications.info(`[${sourceActor.name}]의 <${item.name}>을(를) 차량 미배치 목록으로 옮겼습니다.`);
          }
        }
      }
    });

    // 아이템 완전 삭제 버튼
    html.find('.unplaced-item-delete').click(async ev => {
      ev.preventDefault(); ev.stopPropagation(); 
      const li = $(ev.currentTarget).parents(".unplaced-item");
      const itemId = li.data("itemId");
      let confirm = await Dialog.confirm({
        title: "아이템 영구 삭제",
        content: "<p>이 아이템을 영구적으로 삭제하시겠습니까?</p>",
        yes: () => true, no: () => false, defaultYes: false
      });
      if (confirm) {
        await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
      }
    });
  }
}