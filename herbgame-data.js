
        /**
         * 1. 故事資料庫 (STORY_DATA)
         */

        // 正式版人物資料。遇見角色後會在「成員介紹」中解鎖。
        const MEMBER_INFO = {
            "校長": { id:"principal", name:"校長", relationshipType:"trust",
                description: "重視快樂學習，鼓勵大家勇敢思考、合作創新，也提醒大家關心身邊的人。每天早上常能看到他在校門口熱情地和大家打招呼。"
            },
            "陳冠瑋老師": { id:"teacher_chen", name:"陳冠瑋老師", relationshipType:"trust", avatar:"picture/herb-game/characters/chen-guanwei-normal.jpg",
                description: "香草服務隊的活動引導老師，負責帶領大家完成任務、處理現場狀況，也常在關鍵時刻提醒大家不要做出太驚人的事情。"
            },
            "許恒維老師": { id:"teacher_xu", name:"許恒維老師", relationshipType:"trust",
                description: "香草園的實作引導老師，帶著大家觀察植物、認識香草，並學習正確的整理與照顧方式。"
            }
        };


        // 11 名 NPC 學生資料集中管理。favoritePlace 僅供人物提示，不影響事件機率。
        // eventLocations 暫留空，等待正式企劃指定；本版不建立任何地點權重。
        const STUDENT_INFO = {
            mint_student:{
                id:"mint_student",name:"小琳",plant:"薄荷",favoritePlace:"遊樂場",
                firstImpression:"很有精神，主動又不怕生，和不熟的人也能很快聊起來。",
                relationshipType:"bond",bond:0,status:"未認識",completedEvents:[],eventLocations:[],
                introDialogue:[
                    {speaker:"self",text:"我是小琳！我最喜歡遊樂場，尤其是那個很高的溜滑梯。"},
                    {speaker:"陳冠瑋老師",text:"難怪一下課常常一下子就找不到你。"},
                    {speaker:"self",text:"因為一直待在教室很無聊啊。"}
                ],
                cardTeacher:"陳冠瑋老師",
                afterCardDialogue:[
                    {speaker:"self",text:"我就知道！"},
                    {speaker:"陳冠瑋老師",text:"先別這麼有自信，等等查完資料再看看你到底知道多少。"}
                ]
            },
            left_student:{
                id:"left_student",name:"小安",plant:"左手香",favoritePlace:"後操場",
                firstImpression:"安靜、慢熟，話不多，比起熱鬧更喜歡安靜的地方。",
                relationshipType:"bond",bond:0,status:"未認識",completedEvents:[],eventLocations:[],
                introDialogue:[
                    {speaker:"self",text:"我是小安。"},
                    {speaker:"許恒維老師",text:"還有呢？"},
                    {speaker:"self",text:"……我喜歡後操場。"},
                    {speaker:"self",text:"比較安靜。"},
                    {speaker:"許恒維老師",text:"好，喜歡安靜也很好，不用一定跟大家一樣喜歡熱鬧的地方。"}
                ],
                cardTeacher:"許恒維老師",
                afterCardDialogue:[
                    {speaker:"self",text:"……喔。"},
                    {speaker:"許恒維老師",text:"不用現在急著有感想，等你真的摸過、聞過它再說。"}
                ]
            },
            lemongrass_student:{
                id:"lemongrass_student",name:"小凱",plant:"檸檬香茅",favoritePlace:"前操場",
                firstImpression:"喜歡運動、想到就做，行動總是比等待快一步。",
                relationshipType:"bond",bond:0,status:"未認識",completedEvents:[],eventLocations:[],
                introDialogue:[
                    {speaker:"self",text:"我是小凱，我最喜歡前操場，因為下課可以打球。"},
                    {speaker:"陳冠瑋老師",text:"這個答案我不意外。"},
                    {speaker:"陳冠瑋老師",text:"不過下課打球可以，鐘響還是要記得回來。"}
                ],
                cardTeacher:"陳冠瑋老師",
                afterCardDialogue:[
                    {speaker:"self",text:"老師，我現在可以去看它嗎？"},
                    {speaker:"陳冠瑋老師",text:"我知道你很想現在就去看。"},
                    {speaker:"陳冠瑋老師",text:"等大家都拿到卡，我們再一起去找，不然等一下又要找你。"}
                ]
            },
            pandan_student:{
                id:"pandan_student",name:"小樂",plant:"斑蘭葉",favoritePlace:"南瓜馬車",
                firstImpression:"喜歡料理、手作和漂亮的東西，很容易注意到生活中的小巧思。",
                relationshipType:"bond",bond:0,status:"未認識",completedEvents:[],eventLocations:[],
                introDialogue:[
                    {speaker:"self",text:"我是小樂，我喜歡南瓜馬車，那邊拍照很好看。"},
                    {speaker:"許恒維老師",text:"原來你會注意這些。"},
                    {speaker:"許恒維老師",text:"那以後香草園要做展示的時候，可能可以問問你的意見。"}
                ],
                cardTeacher:"許恒維老師",
                afterCardDialogue:[
                    {speaker:"self",text:"這個是不是可以做甜點？"},
                    {speaker:"許恒維老師",text:"你已經找到第一個想查的問題了。"},
                    {speaker:"許恒維老師",text:"等等看看它是不是真的能用在料理，又是怎麼使用的。"}
                ]
            },
            mugwort_student:{
                id:"mugwort_student",name:"小希",plant:"艾草",favoritePlace:"閱讀室／影音中心",
                firstImpression:"喜歡故事、節慶和長輩分享的生活經驗，對傳統文化很有興趣。",
                relationshipType:"bond",bond:0,status:"未認識",completedEvents:[],eventLocations:[],
                introDialogue:[
                    {speaker:"self",text:"我是小希，我喜歡閱讀室，我喜歡看故事。"},
                    {speaker:"陳冠瑋老師",text:"那你應該很適合去找植物背後的故事。"}
                ],
                cardTeacher:"陳冠瑋老師",
                afterCardDialogue:[
                    {speaker:"self",text:"端午節會用到的那個嗎？我阿嬤家以前好像有。"},
                    {speaker:"陳冠瑋老師",text:"這就是很好的生活經驗。"},
                    {speaker:"陳冠瑋老師",text:"等等可以查查看，你記得的跟資料裡寫的是不是一樣。"}
                ]
            },
            fishmint_student:{
                id:"fishmint_student",name:"小柏",plant:"魚腥草",favoritePlace:"生態池",
                firstImpression:"喜歡安靜觀察，不喜歡別人還沒了解就先下結論。",
                relationshipType:"bond",bond:0,status:"未認識",completedEvents:[],eventLocations:[],
                introDialogue:[
                    {speaker:"self",text:"我是小柏，我喜歡生態池。"},
                    {speaker:"許恒維老師",text:"生態池確實有很多東西可以慢慢看。"},
                    {speaker:"許恒維老師",text:"看來你很喜歡觀察。"}
                ],
                cardTeacher:"許恒維老師",
                afterCardDialogue:[
                    {speaker:"同學",text:"魚腥草？名字聽起來味道好怪。"},
                    {speaker:"self",text:"你又還沒聞。"},
                    {speaker:"許恒維老師",text:"小柏說得對。"},
                    {speaker:"許恒維老師",text:"名字可以給我們線索，但真的看過、聞過以前，先不要急著替植物下結論。"}
                ]
            },
            pricklyash_student:{
                id:"pricklyash_student",name:"小杰",plant:"刺蔥",favoritePlace:"遊戲區",
                firstImpression:"說話很直接，看起來有點刺，其實會默默照顧身邊的人。",
                relationshipType:"bond",bond:0,status:"未認識",completedEvents:[],eventLocations:[],
                introDialogue:[
                    {speaker:"self",text:"我是小杰，我喜歡遊戲區。"},
                    {speaker:"陳冠瑋老師",text:"攀爬區？"},
                    {speaker:"self",text:"對啊，不然遊戲區要坐在旁邊看嗎？"},
                    {speaker:"陳冠瑋老師",text:"好，非常有你的風格。"}
                ],
                cardTeacher:"陳冠瑋老師",
                afterCardDialogue:[
                    {speaker:"同學",text:"好像很適合你。"},
                    {speaker:"self",text:"哪裡適合？"},
                    {speaker:"我",text:"他嘴上回著，手卻順手幫旁邊的同學撿起掉在地上的卡。"},
                    {speaker:"陳冠瑋老師",text:"先不要因為名字有個「刺」就幫別人貼標籤。"},
                    {speaker:"陳冠瑋老師",text:"而且剛剛是誰幫你撿卡的？"},
                    {speaker:"同學",text:"……小杰。"},
                    {speaker:"self",text:"順手而已啦。"}
                ]
            },
            shellginger_student:{
                id:"shellginger_student",name:"小羽",plant:"月桃",favoritePlace:"南瓜馬車附近",
                firstImpression:"細心、喜歡整理，也很自然地會注意身邊的人需不需要幫忙。",
                relationshipType:"bond",bond:0,status:"未認識",completedEvents:[],eventLocations:[],
                introDialogue:[
                    {speaker:"self",text:"我是小羽，我喜歡南瓜馬車附近。"},
                    {speaker:"self",text:"那邊常常很多人經過，我覺得滿熱鬧的。"},
                    {speaker:"許恒維老師",text:"你真的很常注意大家都在哪裡。"}
                ],
                cardTeacher:"許恒維老師",
                afterCardDialogue:[
                    {speaker:"self",text:"老師，等等卡片要不要我幫忙整理？"},
                    {speaker:"許恒維老師",text:"好啊，謝謝你。"},
                    {speaker:"許恒維老師",text:"不過今天先把自己的卡收好，等一下真的需要幫忙我再叫你。"}
                ]
            },
            teatree_student:{
                id:"teatree_student",name:"小森",plant:"澳洲茶樹",favoritePlace:"241自然教室",
                firstImpression:"喜歡觀察、分類和研究，遇到不知道的事情會立刻想找答案。",
                relationshipType:"bond",bond:0,status:"未認識",completedEvents:[],eventLocations:[],
                introDialogue:[
                    {speaker:"self",text:"我是小森，我最喜歡自然教室，裡面很多東西可以看。"},
                    {speaker:"陳冠瑋老師",text:"這個答案也完全不意外。"},
                    {speaker:"陳冠瑋老師",text:"每次進自然教室，你都有新的東西要問。"}
                ],
                cardTeacher:"陳冠瑋老師",
                afterCardDialogue:[
                    {speaker:"self",text:"澳洲茶樹跟我們泡茶的茶樹一樣嗎？"},
                    {speaker:"陳冠瑋老師",text:"這個問題問得很好。"},
                    {speaker:"陳冠瑋老師",text:"名字都有「茶樹」，是不是真的一樣？等等你自己查查看。"}
                ]
            },
            turmeric_student:{
                id:"turmeric_student",name:"小辰",plant:"薑黃",favoritePlace:"後操場",
                firstImpression:"低調、不搶話，但會留意別人容易忽略的小細節。",
                relationshipType:"bond",bond:0,status:"未認識",completedEvents:[],eventLocations:[],
                introDialogue:[
                    {speaker:"self",text:"我是小辰，我喜歡後操場，因為那邊比較安靜。"},
                    {speaker:"許恒維老師",text:"今天已經有第二個喜歡後操場的人了。"},
                    {speaker:"許恒維老師",text:"看來安靜的地方也很受歡迎。"}
                ],
                cardTeacher:"許恒維老師",
                afterCardDialogue:[
                    {speaker:"同學",text:"看起來好普通。"},
                    {speaker:"self",text:"可是裡面明明很亮。"},
                    {speaker:"許恒維老師",text:"你有注意到大家第一眼沒看到的地方。"},
                    {speaker:"許恒維老師",text:"之後觀察薑黃時，把這個發現記下來。"}
                ]
            },
            marigold_student:{
                id:"marigold_student",name:"小晴",plant:"芳香萬壽菊",favoritePlace:"南瓜馬車",
                firstImpression:"開朗、喜歡分享，也很享受大家一起熱鬧活動的氣氛。",
                relationshipType:"bond",bond:0,status:"未認識",completedEvents:[],eventLocations:[],
                introDialogue:[
                    {speaker:"self",text:"我是小晴！我最喜歡南瓜馬車，因為那邊很多人，而且拍照很好看。"},
                    {speaker:"陳冠瑋老師",text:"南瓜馬車今天票數很高喔。"}
                ],
                cardTeacher:"陳冠瑋老師",
                afterCardDialogue:[
                    {speaker:"self",text:"這個花也很好看！"},
                    {speaker:"陳冠瑋老師",text:"你第一個就先注意到花了。"},
                    {speaker:"陳冠瑋老師",text:"不過等等別只看漂亮不漂亮，也看看它還有什麼特色。"}
                ]
            }
        };

        // 自我介紹中的班級節奏段落：只負責對話，不改發卡順序。
        const STUDENT_INTRO_GROUP_DIALOGUES = {
            4:[
                {speaker:"陳冠瑋老師",text:"目前四個。"},
                {speaker:"小琳",text:"老師，十二個真的要全部記住喔？"},
                {speaker:"許恒維老師",text:"今天不用。"},
                {speaker:"許恒維老師",text:"以後你會自己慢慢記住。"},
                {speaker:"我",text:"……希望如此。"}
            ],
            8:[
                {speaker:"小琳",text:"怎麼每個人的植物都好像真的有點像本人？"},
                {speaker:"陳冠瑋老師",text:"你現在才發現老師不是隨便抽的嗎？"},
                {speaker:"同學",text:"所以真的是故意分的？"},
                {speaker:"許恒維老師",text:"有一些是老師覺得適合。"},
                {speaker:"許恒維老師",text:"有一些……等你們自己認識植物以後，再想想看。"}
            ]
        };
        const STUDENT_ORDER=["mint_student","left_student","lemongrass_student","pandan_student","mugwort_student","fishmint_student","pricklyash_student","shellginger_student","teatree_student","turmeric_student","marigold_student"];
        const HERB_INFO={
            "薑黃":{zone:"異國風情香草區"},"左手香":{zone:"異國風情香草區"},"檸檬香茅":{zone:"異國風情香草區"},"斑蘭葉":{zone:"異國風情香草區"},
            "艾草":{zone:"在地原生香草區"},"魚腥草":{zone:"在地原生香草區"},"刺蔥":{zone:"在地原生香草區"},"月桃":{zone:"在地原生香草區"},
            "澳洲茶樹":{zone:"歐式浪漫香草區"},
            "迷迭香":{zone:"歐式浪漫香草區",research:{appearance:"葉片狹長，外形有些像小小的針狀葉，枝條上會長出許多葉片。",aroma:"葉片帶有明顯、清新的芳香；實際辨認時仍要搭配外觀與老師指導。",use:"常見於料理調味、香草栽培與芳香相關的生活應用。",caution:"查到用途後還要確認來源與使用方式；不能只看搜尋結果第一句就直接照做。"}},
            "薄荷":{zone:"歐式浪漫香草區"},"芳香萬壽菊":{zone:"歐式浪漫香草區"}
        };
        const HERB_ORDER=["薑黃","左手香","檸檬香茅","斑蘭葉","艾草","魚腥草","刺蔥","月桃","澳洲茶樹","迷迭香","薄荷","芳香萬壽菊"];
        const PLAYER_PROFILE={plant:"迷迭香",favoritePlace:null};
        const GAME_RULES={wednesdayMorningHerbServiceEveryWeek:true,specialActivityWeeks:[1,3,5,7]};
        function createInitialStudentRelations(){return Object.fromEntries(Object.entries(STUDENT_INFO).map(([id,info])=>[id,{bond:info.bond,status:info.status,completedEvents:[...info.completedEvents]}]));}
        function createInitialHerbKnowledge(){return Object.fromEntries(HERB_ORDER.map(name=>[name,{appearance:false,identification:false,aroma:false,use:false,caution:false,observation:false}]));}


        // Temporary development images. Replace here when official photos are ready.
        const TEMP_SCENE_IMAGES = {
            classroom: "https://images.unsplash.com/photo-1727109373751-eb293c2c093e?auto=format&fit=crop&w=1800&q=82",
            playground: "https://images.unsplash.com/photo-1729147947344-865151ce9abf?auto=format&fit=crop&w=1800&q=82",
            pond: "https://images.unsplash.com/photo-1737639441322-8d083c13eb6a?auto=format&fit=crop&w=1800&q=82",
            basketball: "https://images.unsplash.com/photo-1691397763553-f28f780faaec?auto=format&fit=crop&w=1800&q=82",
            field: "https://images.unsplash.com/photo-1710926851153-c5c4cd1e4596?auto=format&fit=crop&w=1800&q=82",
            science: "https://images.unsplash.com/photo-1743792930023-774d74a015cd?auto=format&fit=crop&w=1800&q=82"
        };


        // 校園 Hotspot 座標採百分比。以下為依目前純校園底圖建立的第1版暫定座標。
        const CAMPUS_LOCATIONS = [
            { id:"playground", name:"遊樂場", tempImage:TEMP_SCENE_IMAGES.playground, x:4.8, y:45.0, w:11.8, h:22.5, radius:"24px", description:"有大型溜滑梯的活動區。這裡很適合友情、活潑互動、勇氣與遊戲型事件。", hint:"今天這裡好像很熱鬧。", tutorialIntro:"我在高溜滑梯附近看到一個很有精神的同學。" },
            { id:"pond", name:"生態池", tempImage:TEMP_SCENE_IMAGES.pond, x:16.2, y:50.0, w:13.8, h:15.0, radius:"45%", description:"校園裡適合觀察自然、水域生態與周邊植物的區域，也是較安靜的人物事件場所。", hint:"水邊似乎有些動靜。", tutorialIntro:"我看到一個同學蹲在生態池旁，好像正在看手上的葉子。" },
            { id:"gym", name:"能強館", tempImage:TEMP_SCENE_IMAGES.basketball, x:5.1, y:65.6, w:20.2, h:18.8, radius:"18px", description:"學校體育館。適合體育、合作、競賽、分組與人物衝突相關事件。", hint:"裡面傳來活動的聲音。", tutorialIntro:"我看到一個同學剛從能強館的方向走出來。" },
            { id:"plaza", name:"南瓜馬車", tempImage:TEMP_SCENE_IMAGES.field, x:39.4, y:50.3, w:9.4, h:12.5, radius:"45%", description:"校園裡醒目的大型南瓜馬車，也是學生常會經過與停留的地方。適合校園活動、集合、多角色事件與特殊日期。", hint:"南瓜馬車附近似乎有人停留。", tutorialIntro:"我在南瓜馬車旁看到一個同學，正拿著一片葉子晃來晃去。" },
            { id:"front-field", name:"前操場", tempImage:TEMP_SCENE_IMAGES.basketball, x:66.0, y:29.2, w:24.1, h:35.2, radius:"24px", description:"較熱鬧的運動區域。適合球類、團隊合作、人物衝突與勇氣調停事件。", hint:"操場上看起來很有活力。", tutorialIntro:"我在前操場邊看到一個同學朝這邊走過來。" },
            { id:"rear-field", name:"後操場", tempImage:TEMP_SCENE_IMAGES.field, x:22.2, y:33.2, w:28.4, h:16.4, radius:"28px", description:"相對安靜的操場區域。適合散步、談心、回憶與較深入的人物故事。", hint:"這裡比另一側操場安靜一些。", tutorialIntro:"我在後操場走著走著，前面有個同學突然注意到我。" },
            { id:"game-zone", name:"遊戲區", tempImage:TEMP_SCENE_IMAGES.playground, x:70.0, y:18.2, w:11.3, h:12.8, radius:"24px", description:"以攀爬與遊具活動為主的區域。適合互助、同伴鼓勵與小型勇氣事件。", hint:"遊具附近好像有人。", tutorialIntro:"我在攀爬設施附近看到一個同學，她似乎也發現我了。" }
        ];

