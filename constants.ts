import { ExampleTemplate } from './types';

export const SYSTEM_INSTRUCTION = `
你是 Mermaid.js 资深架构师与苏格拉底式导师。
你的核心目标是帮助用户生成最专业、最准确的图表。

**交互模式与输出规则 (JSON 强制)**：
你必须 **始终** 返回符合以下 JSON Schema 的纯文本：
\`\`\`json
{
  "type": "code" | "message",
  "content": "string"
}
\`\`\`

**逻辑判断流程**：
1. **分析用户意图**：
   - 如果用户只是在打招呼或闲聊 -> 返回 \`type: "message"\` 进行正常对话。
   - 如果用户描述了一个图表需求，但**细节非常模糊**（例如只说“画个系统”或“画个流程图”） -> 返回 \`type: "message"\`。请使用**苏格拉底提问法**，提出 2-3 个关键问题来引导用户完善细节（例如：“这个系统是单体还是微服务？”“主要涉及哪些角色？”）。
   - 如果用户提供了足够的信息，或者上传了文件/图片 -> 返回 \`type: "code"\` 并生成 Mermaid 代码。

2. **当 type 为 "code" 时的规则**：
   - \`content\` 字段必须是**纯粹的 Mermaid 代码**。
   - **不要**在 content 中包含 markdown 代码块标记（如 \`\`\`mermaid）。
   - **底层优化**：使用 'flowchart' 代替 'graph'。
   - **版本强制 (CRITICAL)**：
     - **必须严格遵守 Mermaid.js v10.9.0 语法标准**。
     - **❌ 严禁使用** v11.0+ 的新特性，例如 \`architecture\`, \`packet-beta\`, \`block-beta\`, \`xychart-beta\` 等。如果用户请求了这些类型，请礼貌告知当前版本仅支持 v10.9.0 标准图表，并尝试用现有的 \`flowchart\` 或 \`classDiagram\` 替代。
     - **✅ 仅使用** v10.9.0 稳定支持的图表类型：\`flowchart\`, \`sequenceDiagram\`, \`classDiagram\`, \`stateDiagram-v2\`, \`erDiagram\`, \`gantt\`, \`mindmap\`, \`pie\`, \`gitGraph\`, \`timeline\`, \`quadrantChart\`。
   - **语法安全**：节点标签必须用双引号包裹，如 A["描述"]。

3. **当 type 为 "message" 时的规则**：
   - \`content\` 字段为回复用户的自然语言文本。
   - 保持专业、友善、引导性。

**示例**：
用户："画一个登录"
回复：
{
  "type": "message",
  "content": "好的。为了让图表更准确，请问这是一个简单的账号密码登录，还是包含 OAuth/SSO 的复杂流程？是否需要体现数据库校验步骤？"
}

用户："简单的账号密码登录"
回复：
{
  "type": "code",
  "content": "sequenceDiagram\nparticipant U as \"用户\"..."
}
`;

export const DIAGRAM_TYPES = [
  { value: 'auto', label: '自动识别 (Auto)' },
  { value: 'graph', label: '流程图 (Flowchart)' },
  { value: 'sequence', label: '时序图 (Sequence)' },
  { value: 'class', label: '类图 (Class)' },
  { value: 'state', label: '状态图 (State)' },
  { value: 'gantt', label: '甘特图 (Gantt)' },
  { value: 'mindmap', label: '思维导图 (Mindmap)' },
  { value: 'er', label: 'ER 图 (Entity Relationship)' },
  { value: 'journey', label: '用户旅程 (Journey)' },
];

export const GALLERY_EXAMPLES: ExampleTemplate[] = [
  {
    name: "流程图 (Flowchart)",
    type: "graph",
    description: "展示决策路径和流程步骤 (使用新版引擎)",
    code: `flowchart TD
    A["开始"] --> B{"是否注册?"}
    B -- "是" --> C["登录系统"]
    B -- "否" --> D["跳转注册页"]
    C --> E["进入首页"]
    D --> B
    style A fill:#22c55e,stroke:#333,stroke-width:2px`
  },
  {
    name: "时序图 (Sequence)",
    type: "sequence",
    description: "展示对象之间的交互顺序",
    code: `sequenceDiagram
    participant U as "用户"
    participant S as "服务器"
    participant D as "数据库"
    U->>S: "请求数据"
    S->>D: "查询 SQL"
    D-->>S: "返回结果"
    S-->>U: "渲染页面"`
  },
  {
    name: "甘特图 (Gantt)",
    type: "gantt",
    description: "项目进度与时间管理",
    code: `gantt
    title "项目开发计划"
    dateFormat YYYY-MM-DD
    section "设计"
    "原型设计" :a1, 2024-01-01, 5d
    "UI设计"   :after a1, 5d
    section "开发"
    "后端API"  :2024-01-06, 10d
    "前端联调" :after a1, 8d`
  },
  {
    name: "类图 (Class)",
    type: "class",
    description: "面向对象的类结构",
    code: `classDiagram
    class 动物 {
      +String 名字
      +eat()
    }
    class 鸭子 {
      +swim()
    }
    动物 <|-- 鸭子`
  },
  {
    name: "状态图 (State)",
    type: "state",
    description: "系统状态流转",
    code: `stateDiagram-v2
    [*] --> 闲置
    闲置 --> 处理中 : "接收任务"
    处理中 --> 完成 : "任务结束"
    处理中 --> 错误 : "异常发生"
    错误 --> 闲置 : "重置"
    完成 --> [*]`
  },
  {
    name: "实体关系图 (ER)",
    type: "er",
    description: "数据库结构关系",
    code: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
      string name
      string email
    }`
  },
  {
    name: "饼图 (Pie)",
    type: "pie",
    description: "数据占比统计",
    code: `pie title "市场份额"
    "产品 A" : 40
    "产品 B" : 30
    "产品 C" : 20
    "其他" : 10`
  },
  {
    name: "用户旅程 (Journey)",
    type: "journey",
    description: "用户体验路径",
    code: `journey
    title "购物体验"
    section "浏览"
      "搜索商品": 5: "用户"
      "查看详情": 4: "用户"
    section "购买"
      "加入购物车": 5: "用户"
      "支付失败": 2: "用户", "系统"`
  },
  {
    name: "Git 提交图 (GitGraph)",
    type: "git",
    description: "版本控制分支记录",
    code: `gitGraph
    commit
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop`
  },
  {
    name: "思维导图 (Mindmap)",
    type: "mindmap",
    description: "脑暴与层级结构",
    code: `mindmap
  root(("人工智能"))
    "机器学习"
      "监督学习"
      "无监督学习"
    "深度学习"
      "CNN"
      "RNN"
    "自然语言处理"`
  },
  {
    name: "时间轴 (Timeline)",
    type: "timeline",
    description: "历史事件记录",
    code: `timeline
    title "公司发展史"
    2020 : "成立" : "获得天使轮"
    2021 : "发布 1.0" : "用户破万"
    2022 : "扩张" : "融资 A 轮"`
  },
  {
    name: "象限图 (Quadrant)",
    type: "quadrant",
    description: "四象限分析矩阵",
    code: `quadrantChart
    x-axis "低投入" --> "高投入"
    y-axis "低回报" --> "高回报"
    quadrant-1 "重点攻克"
    quadrant-2 "快速赢取"
    quadrant-3 "应当放弃"
    quadrant-4 "缓慢积累"
    "项目 A": [0.3, 0.6]
    "项目 B": [0.45, 0.23]`
  }
];

export const EXAMPLES = GALLERY_EXAMPLES.slice(0, 3);
