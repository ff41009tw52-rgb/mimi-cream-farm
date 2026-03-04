import JaywalkingScenario from './scenarios/Jaywalking.js';
import TruckTurnScenario from './scenarios/TruckTurn.js';
import AmbulanceScenario from './scenarios/Ambulance.js'; 
import ConstructionSystem from './scenarios/ConstructionSystem.js'; 
import PhoneScenario from './scenarios/PhoneScenario.js';
import RoadSignScenario from './scenarios/RoadSignScenario.js';

export class ScenarioManager {
    constructor(scene, camera, gameManager, sceneData,dataCollector) { 
        this.scene = scene;
        this.camera = camera;
        this.gameManager = gameManager;
        this.dataCollector = dataCollector; // 保存獨立的實例
        const bounds = sceneData.bounds || null;
        //將所有事件匯入管理器
        this.scenarios = [
            new JaywalkingScenario(),      
            new TruckTurnScenario(sceneData.intersections, sceneData.pedestrians, bounds), 
            new AmbulanceScenario(sceneData.intersections, sceneData.pedestrians, bounds), 
            new ConstructionSystem(),
            new PhoneScenario(),
            new RoadSignScenario()       
        ];

        this.currentScenario = null;
        this.cooldown = 5000; 
        this.lastTriggerTime = Date.now();
        this.setupDebugKeys();
    }

    setupDebugKeys() {
        window.addEventListener('keydown', (e) => {
            // 1. 強制停止 (ESC)
            if (e.key === 'Escape' && this.currentScenario) {
                this.currentScenario.stop(this.scene);
                this.currentScenario = null;
                this.lastTriggerTime = Date.now();
                console.log("🛑 事件強制停止");
                return;
            }

            // 防止重複觸發
            if (this.currentScenario) return;

            // 2. 按鍵觸發 (統一呼叫 activateScenario)
            const key = e.key.toLowerCase();
            
            if (key === 'b') {
                this.activateScenario(this.scenarios[5]);
            }
            if (key === 'v') {
                this.activateScenario(this.scenarios[4]);
            }
            if (key === 'x') {
                // 觸發施工 (index 3)
                this.activateScenario(this.scenarios[3]);
            }
            else if (key === 'q') {
                // 觸發救護車 (index 2)
                this.activateScenario(this.scenarios[2]);
            }
            else if (key === 'w') {
                // 觸發卡車 (index 1)
                this.activateScenario(this.scenarios[1]);
            }
            // 你也可以加個 'e' 測試行人
            else if (key === 'e') {
                this.activateScenario(this.scenarios[0]);
            }
        });
    }

    update(dt, currentNSState, currentEWState) {
        if (this.currentScenario) {
            // 執行當前事件的 update
            const isFinished = this.currentScenario.update(dt, currentNSState, currentEWState, this.camera);
            
            // 如果事件回傳 true (代表結束了)
            if (isFinished) {
                this.currentScenario.stop(this.scene);
                this.currentScenario = null;
                this.lastTriggerTime = Date.now();
                
                // 如果是反應測試事件結束，且玩家沒反應，DataCollector 那邊可能需要判定 "Miss"
                // (不過你的 DataCollector 邏輯裡 startTimer 之後如果不 recordReaction 就會一直是 waiting 狀態，
                // 你可能需要在這裡呼叫 recordMiss()，或者讓玩家自己錯過)
                if (this.dataCollector) {
                    this.dataCollector.recordMiss(); // 確保計時器歸零並結算
                }
            }
            return;
        }

        // 冷卻時間過後，隨機觸發
        if (Date.now() - this.lastTriggerTime > this.cooldown) {
            this.triggerRandom();
        }
    }
    //觸發隨機事件
    triggerRandom() {
        const randomIndex = Math.floor(Math.random() * this.scenarios.length);
        const scenario = this.scenarios[randomIndex];
        
        console.log(`🎲 隨機觸發: ${scenario.name}`);
        this.activateScenario(scenario);
    }

    // ★★★ 核心方法：統一處理啟動與 DataCollector 連動 ★★★
    activateScenario(scenario) {
        this.currentScenario = scenario;
        
        this.currentScenario.start(this.scene, this.camera, this.gameManager);
        this.lastTriggerTime = Date.now();
        
        // 取得名稱
        const eventName = scenario.name || scenario.constructor.name;
        
        // 3. 修正：檢查 this.dataCollector 是否存在
        if (this.dataCollector) {
            // 注意：你原本程式碼這裡少寫了 "this."
            this.dataCollector.recordEventTrigger(eventName);
            console.log(`📝 已記錄事件：${eventName}`);
            
            // 判斷是否啟動反應測試
            if (scenario.hasReactionTest) {
                console.log(`⚡ [Manager] 啟動反應計時: ${eventName}`);
                this.dataCollector.startTimer();
            }
        }
    }
}