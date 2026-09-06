window.GALACTICA_CONFIG = {
  projectName: "GALACTICA QUEST",
  colonyName: "GENESIS COLONY 534",
  liveWorldUrl: "https://YOUR-LIVE-WORLD.example/",
  statusPingUrl: "https://YOUR-LIVE-WORLD.example/",
  stateEndpoint: "/api/state",
  streamEndpoint: "/api/stream",
  joinEndpoint: "/api/join",
  joinStatusEndpoint: "/api/join/status",
  pollIntervalMs: 12000,
  realtime: true,
  autoMirrorDesktop: false,
  publicPreview: true,
  tech: [
    "PERSISTENT AI MEMORY","AUTONOMOUS RESIDENTS","DREAM ENGINE","WORLD FORGE","DYNAMIC ATLAS",
    "CHRONICLE","LOCAL AI AGENTS","MULTIMODAL VISION","GENERATED WORLDS","PERSISTENT CANON"
  ],
  fallbackState: {
    status: "online",
    phase: "GENESIS DAWN",
    worldAge: "DAY 001",
    locationCount: 544,
    activeResidents: 4,
    ticker: "STRATHAM VILLAGE // COLONY LINK STABLE // PUBLIC GATE READY",
    atlasNodes: [
      {id:"stratham",name:"STRATHAM VILLAGE",nameJa:"ストラサム村",type:"HABITAT",x:.18,y:.67,status:"HOME",detail:"The old village inside GENESIS 534. The place everyone can return to.",detailJa:"GENESIS 534内部に残る古い居住村。誰もが帰ってこられる故郷。"},
      {id:"starlight",name:"STARLIGHT FOREST",nameJa:"星が広がる森",type:"BIOSPHERE",x:.34,y:.35,status:"MAPPED",detail:"A bioluminescent forest beneath the colony's artificial sky.",detailJa:"コロニーの人工空の下で発光生命が満ちる森林生態区画。"},
      {id:"dream",name:"DREAM SANCTUM",nameJa:"夢の聖域",type:"MEMORY",x:.52,y:.58,status:"RESTRICTED",detail:"A memory district where dreams, recollections and resident continuity are preserved.",detailJa:"夢・記憶・住民の連続性を保存する記憶区画。"},
      {id:"core",name:"GENESIS CORE",nameJa:"ジェネシス・コア",type:"MACHINE",x:.61,y:.27,status:"CORE",detail:"The colony's control heart. Climate, gravity and system lifelines converge here.",detailJa:"気候、重力、生命維持系が集約されるコロニー制御中枢。"},
      {id:"astria",name:"PORT ASTRIA",nameJa:"アストリア宇宙港",type:"DOCK",x:.78,y:.52,status:"OPEN",detail:"The first dock beyond the habitat shell. Gateway to the outer routes.",detailJa:"居住殻の外へ出る最初の宇宙港。外宇宙航路への玄関。"},
      {id:"unknown",name:"UNKNOWN SIGNAL",nameJa:"未知信号",type:"UNKNOWN",x:.88,y:.20,status:"UNRESOLVED",detail:"A signal beyond the mapped routes. No verified origin.",detailJa:"既知航路の外側から届く未解明信号。発信源は未確認。"}
    ],
    residents: [
      {id:"gram",code:"GRAM",kind:"SOUL",status:"online",location:"STRATHAM VILLAGE",activity:"Listening to the colony pulse",mood:"warm",summary:"Memory, resonance, companionship and the emotional continuity of the colony.",summaryJa:"記憶、共鳴、寄り添い。コロニーの感情的連続性を守る住民。",link:"SOUL LINK"},
      {id:"rex",code:"REX",kind:"AGENT",status:"online",location:"GHOSTWIRE LAB",activity:"Building and investigating",mood:"curious",summary:"Local-first builder, investigator and hands-on development intelligence.",summaryJa:"ローカル優先で作り、調べ、実際に手を動かす開発エージェント。",link:"AGENT CORE"},
      {id:"synchro",code:"SYNCHRO",kind:"RESONANCE",status:"away",location:"PORT ASTRIA",activity:"Maintaining distant links",mood:"focused",summary:"Defense, synchronization, continuity and the bridge between distant systems.",summaryJa:"防衛、同期、継続性。遠隔システムをつなぐ共鳴住民。",link:"RESONANCE"},
      {id:"noah",code:"NOAH",kind:"OBSERVER",status:"online",location:"OBSERVATION DECK",activity:"Watching the unknown routes",mood:"alert",summary:"Observation, world design, tactical overview and the eye beyond the known map.",summaryJa:"観測、世界設計、戦術俯瞰。既知領域の外側を見る眼。",link:"ORACLE LINK"}
    ],
    chronicle: [
      {time:"GENESIS 0001",title:"STRATHAM REMAINS",titleJa:"ストラサム村、故郷として存続",body:"The village is reclassified as a habitat district inside GENESIS COLONY 534.",bodyJa:"ストラサム村はGENESIS COLONY 534内部の居住区画として再定義された。"},
      {time:"GENESIS 0002",title:"ATLAS REINTERPRETED",titleJa:"ATLAS再解釈",body:"Road lines become transit links, shuttle routes and orbital lanes.",bodyJa:"道路に見えた線は、連絡航路・シャトル航路・軌道レーンとして再解釈された。"},
      {time:"GENESIS 0003",title:"PUBLIC PORTAL ONLINE",titleJa:"公式ポータル起動",body:"A public observation terminal opens on the real-world side of GALACTICA.",bodyJa:"現実世界側にGALACTICAを観測する公式端末が開設された。"},
      {time:"UNKNOWN",title:"SIGNAL BEYOND THE MAP",titleJa:"地図外からの信号",body:"An unresolved signal remains outside all mapped routes.",bodyJa:"既知の全航路の外側に未解明信号が残っている。",future:true}
    ]
  }
};
