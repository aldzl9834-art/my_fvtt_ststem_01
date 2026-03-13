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
    html.find('.cp-grid-item, .unplaced-item').dblclick(ev => {
      const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
      if (item) item.sheet.render(true);
    });

    html.find('.cp-grid-item, .unplaced-item').on('dragstart', ev => {
      ev.originalEvent.dataTransfer.setData("text/plain", JSON.stringify({
        type: "CPGridItem", actorId: this.actor.id, itemId: ev.currentTarget.dataset.itemId
      }));
      setTimeout(() => $(ev.currentTarget).css("opacity", "0.5"), 10);
    });
    html.find('.cp-grid-item, .unplaced-item').on('dragend', ev => $(ev.currentTarget).css("opacity", "1.0"));

   // CP 그리드로 드롭 (캐릭터 -> 차량 연동)
    html.find('.cp-grid-wrapper').on('dragover', ev => ev.preventDefault());
    html.find('.cp-grid-wrapper').on('drop', async ev => {
      if (this.actor.system.simplifiedWeightRule) {
        return ui.notifications.warn("간이 중량 규칙이 적용 중이므로 그리드에 화물을 직접 배치할 수 없습니다.");
      }

      let data; try { data = JSON.parse(ev.originalEvent.dataTransfer.getData('text/plain')); } catch(err) { return; }
      
      // ★ 수정: 내 아이디인지 검사하는 조건을 빼서 외부(캐릭터) 드래그 허용
      if (data && data.type === "CPGridItem") {
        ev.preventDefault(); ev.stopPropagation(); 
        const wrapper = $(ev.currentTarget);
        const offset = wrapper.offset();
        const dropX = Math.floor((ev.originalEvent.pageX - offset.left) / 40);
        const dropY = Math.floor((ev.originalEvent.pageY - offset.top) / 40);
        
        // 원본 캐릭터(출처)와 아이템 정보를 가져옵니다.
        const sourceActor = game.actors.get(data.actorId);
        if (!sourceActor) return;
        const item = sourceActor.items.get(data.itemId);
        
        if (item) {
          let pxVal = item.system.portability?.x;
          let pyVal = item.system.portability?.y;
          let pX = (pxVal !== undefined && pxVal !== "") ? Number(pxVal) : 1;
          let pY = (pyVal !== undefined && pyVal !== "") ? Number(pyVal) : 1;
          
          if (dropX + pX > 10 || dropY + pY > 30) return ui.notifications.warn("차량 CP 관리표의 영역을 벗어납니다!");

          let isColliding = false;
          // ★ 0x0 아이템 충돌 무시
          if (pX > 0 && pY > 0) {
            for (let other of this.actor.items) {
              if (sourceActor.id === this.actor.id && other.id === item.id) continue;
              if (["weapon", "armor", "item", "attachment", "vehicleAttachment"].includes(other.type)) {
                let oX = Number(other.system.grid?.x), oY = Number(other.system.grid?.y);
                if (oX >= 0 && oY >= 0) {
                  let opxVal = other.system.portability?.x;
                  let opyVal = other.system.portability?.y;
                  let opX = (opxVal !== undefined && opxVal !== "") ? Number(opxVal) : 1;
                  let opY = (opyVal !== undefined && opyVal !== "") ? Number(opyVal) : 1;
                  
                  if (opX > 0 && opY > 0) {
                    if (dropX < oX + opX && dropX + pX > oX && dropY < oY + opY && dropY + pY > oY) { isColliding = true; break; }
                  }
                }
              }
            }
          }
          if (isColliding) return ui.notifications.warn("다른 아이템과 위치가 겹칩니다! 빈 공간을 찾으세요.");
          
          // 내부 이동
          if (sourceActor.id === this.actor.id) {
            await item.update({"system.grid.x": dropX, "system.grid.y": dropY, "system.grid.type": "cp"});
          } else {
            // 외부 이동
            let newItemData = item.toObject(); 
            newItemData.system.grid = { x: dropX, y: dropY, type: "cp" };
            if (newItemData.system.equipped !== undefined) newItemData.system.equipped = false;
            if (newItemData.system.equippedSlot !== undefined) newItemData.system.equippedSlot = "";
            
            await this.actor.createEmbeddedDocuments("Item", [newItemData]);
            await sourceActor.deleteEmbeddedDocuments("Item", [item.id]);
            ui.notifications.info(`[${sourceActor.name}]의 <${item.name}>을(를) 차량 화물칸으로 옮겼습니다.`);
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