/* 45-demo.js —— 内置示例：没配置 Key 也能先看效果；同时用作回归测试 */
(function () {
  const MT = (window.MT = window.MT || {});

  const demo = {
    meta: {
      topic: '分数应用题 · 已知部分求总量', grade: 6, method: 'arithmetic',
      unit1: true, unit1Used: true, gradeFit: 'ok', note: ''
    },
    problem: {
      text: '小明有 48 元，小红的钱是小明的 3/4，两个人一共有多少元？',
      givens: [
        { name: '小明', value: '48', unit: '元' },
        { name: '小红', value: '小明的 3/4', unit: '' }
      ],
      question: '两个人一共有多少元？'
    },
    plan: { headline: '把小明的钱看作单位 1', relation: '总数 = 48 × (1 + 3/4)' },
    diagram: {
      type: 'segment',
      title: '两个人的钱',
      parts: [
        { id: 'a', ratio: 4, label: '小明', value: '48 元', color: 'blue' },
        { id: 'b', ratio: 3, label: '小红', value: '? 元', color: 'orange' }
      ],
      total: { id: 'total', label: '一共', value: '? 元' },
      unitOne: { id: 'a', label: '1' },
      question: { id: 'q', label: '一共多少元？' }
    },
    steps: [
      {
        phase: '理解', title: '先看清楚谁的钱是单位 1',
        text: '小明有 48 元，小红的钱是小明的 3/4。把小明这一整段看成「1」，小红就是其中的 3 份。',
        math: '', why: '「是……的 3/4」里，「的」字后面的量就是单位 1。',
        ops: [{ op: 'focus', ids: ['a'], text: '这一整段是单位 1' }, { op: 'dim', ids: ['b'] }]
      },
      {
        phase: '关系', title: '合起来是几分之几',
        text: '一段是小明，一段是小红，合起来就是 1 + 3/4 = 7/4 个「小明」。',
        math: '1 + 3/4 = 7/4', why: '4 份加 3 份，一共 7 份，所以是 7/4。',
        ops: [{ op: 'focus', ids: ['a', 'b'], text: '合起来 7 份' }, { op: 'set', id: 'total', text: '7 份' }]
      },
      {
        phase: '列式', title: '求出 1 份是多少',
        text: '小明 48 元正好是 4 份，那 1 份就是 48 ÷ 4 = 12 元。',
        math: '48 ÷ 4 = 12', why: '把 48 元平均分成 4 份，每份就是 12 元。',
        ops: [{ op: 'focus', ids: ['a'], text: '4 份 = 48 元' }, { op: 'set', id: 'b', text: '3 份' }]
      },
      {
        phase: '计算', title: '小红的钱',
        text: '小红是 3 份，12 × 3 = 36 元，也就是 48 × 3/4 = 36 元。',
        math: '48 × 3/4 = 36', why: '求一个数的几分之几，用乘法。',
        ops: [{ op: 'set', id: 'b', text: '36 元' }, { op: 'mark', id: 'b', text: '✓' }]
      },
      {
        phase: '计算', title: '两个人合起来',
        text: '48 + 36 = 84，两个人一共 84 元。',
        math: '48 + 36 = 84', why: '也可以直接用 48 × 7/4 = 84，一步算出总数。',
        ops: [{ op: 'set', id: 'total', text: '84 元' }, { op: 'pulse', ids: ['total'] }]
      },
      {
        phase: '检验', title: '回头看一遍',
        text: '84 − 48 = 36，36 ÷ 48 = 3/4，和小红是小明的 3/4 完全对得上。',
        math: '84 - 48 = 36', why: '把答案代回题目，条件都成立，说明算对了。',
        ops: [{ op: 'mark', id: 'total', text: '✓' }, { op: 'focus', ids: ['total'] }]
      }
    ],
    answer: { value: '84', unit: '元', sentence: '两个人一共有 84 元。' },
    checks: ['48 × 3/4 = 36', '48 + 36 = 84', '84 - 48 = 36'],
    warning: ''
  };

  /* 折扣与盈亏：把定价看作单位 1，用数量轴看四个量的位置 */
  const discount = {
    meta: { topic: '折扣与盈亏 · 求成本', grade: 6, method: 'arithmetic', unit1: true, unit1Used: true, gradeFit: 'ok', note: '' },
    problem: {
      text: '一台电脑，若按定价打九折销售，则可获得利润 500 元；若按定价打八折销售，则会亏损 100 元。这台电脑的成本是多少元？',
      givens: [{ name: '九折', value: '赚 500', unit: '元' }, { name: '八折', value: '亏 100', unit: '元' }],
      question: '这台电脑的成本是多少元？'
    },
    plan: { headline: '把定价看作单位 1', relation: '定价的 10% = 500 + 100 = 600 元' },
    diagram: {
      type: 'numberline', title: '定价、售价与成本', min: 0.75, max: 1.03,
      ticks: [
        { id: 't8', value: 0.8, label: '八折' },
        { id: 't9', value: 0.9, label: '九折' },
        { id: 't10', value: 1, label: '定价' }
      ],
      refs: [{ id: 'cost', at: 0.8167, label: '成本 4900 元', color: 'green' }],
      spans: [
        { id: 's1', from: 0.8, to: 0.9, label: '相差 600 元 = 定价的 10%', color: 'orange' },
        { id: 's2', from: 0.8, to: 0.8167, label: '亏 100', color: 'red' },
        { id: 's3', from: 0.8167, to: 0.9, label: '赚 500', color: 'green' }
      ]
    },
    steps: [
      {
        phase: '理解', title: '定价就是单位 1',
        text: '九折就是定价的 90%，八折就是定价的 80%。两个售价差多少，全看定价。',
        math: '', why: '打折都是"按定价的百分之几卖"，所以定价是标准量，也就是单位 1。',
        ops: [{ op: 'focus', ids: ['t8', 't9'], text: '八折和九折，差 1 折' }, { op: 'hide', ids: ['cost'] }]
      },
      {
        phase: '关系', title: '一折正好是 600 元',
        text: '九折赚 500，八折亏 100，中间差了 500 + 100 = 600 元——这 600 元就是定价的一折。',
        math: '500 + 100 = 600', why: '从赚 500 变成亏 100，一共往下掉了 600 元。',
        ops: [{ op: 'focus', ids: ['s1'], text: '这 1 折 = 600 元' }]
      },
      {
        phase: '列式', title: '定价的 10% 是 600 元',
        text: '600 ÷ 10% = 6000，定价是 6000 元。',
        math: '600 / 0.1 = 6000', why: '已知一个数的 10% 是多少，求这个数，用除法。',
        ops: [{ op: 'set', id: 't10', text: '定价 6000' }, { op: 'focus', ids: ['t10'], text: '定价 6000 元' }, { op: 'pulse', ids: ['t10'] }]
      },
      {
        phase: '计算', title: '用九折倒推成本',
        text: '九折卖 6000 × 90% = 5400 元，赚 500，所以成本是 5400 − 500 = 4900 元。',
        math: '6000 * 0.9 - 500 = 4900', why: '成本 = 售价 − 利润，售价 = 定价 × 折扣。',
        ops: [{ op: 'set', id: 't9', text: '九折 5400' }, { op: 'show', ids: ['cost'] }, { op: 'focus', ids: ['cost'], text: '成本落在这' }, { op: 'mark', id: 't9', text: '5400' }]
      },
      {
        phase: '检验', title: '八折真的亏 100 吗',
        text: '八折卖 4800 元，4800 − 4900 = −100，正好亏 100 元，和题目对得上。',
        math: '6000 * 0.8 - 4900 = -100', why: '两个条件都验一遍，答案才靠谱。',
        ops: [{ op: 'set', id: 't8', text: '八折 4800' }, { op: 'focus', ids: ['s2'], text: '亏 100' }, { op: 'pulse', ids: ['cost'] }]
      }
    ],
    answer: { value: '4900', unit: '元', sentence: '这台电脑的成本是 4900 元。' },
    checks: ['500 + 100 = 600', '600 / 0.1 = 6000', '6000 * 0.9 - 500 = 4900', '6000 * 0.8 - 4900 = -100'],
    warning: ''
  };

  /* 浓度题：水不变 → 浓度条；配比 → 十字交叉（中途换图） */
  const solution = {
    meta: { topic: '浓度问题 · 倒来倒去', grade: 6, method: 'arithmetic', unit1: false, unit1Used: false, gradeFit: 'above', note: '这是一道奥数浓度题' },
    problem: {
      text: '甲容器中有纯酒精 10 kg，乙容器中有水 18 kg。第一次将甲容器中的一部分纯酒精倒入乙容器中使酒精与水混合；第二次将乙容器中一部分酒精溶液倒入甲容器中，这时甲容器中溶液的酒精含量为 65%，乙容器中溶液的酒精含量为 25%。第二次从乙容器倒入多少千克酒精溶液到甲容器？',
      givens: [{ name: '甲', value: '纯酒精 10', unit: 'kg' }, { name: '乙', value: '水 18', unit: 'kg' }],
      question: '第二次从乙倒入多少千克溶液到甲？'
    },
    plan: { headline: '水一点没变，先用它算出乙的总量', relation: '乙总量 = 18 ÷ 75%，再按 40 : 35 分配' },
    diagram: {
      type: 'percentbar', title: '乙容器里的溶液', note: '水从头到尾都是 18 kg',
      rows: [{
        id: 'yi', label: '乙容器', total: '? kg',
        segments: [
          { id: 'yi-a', pct: 25, label: '酒精 ?', color: 'orange' },
          { id: 'yi-w', pct: 75, label: '水 18 kg', color: 'blue' }
        ]
      }]
    },
    steps: [
      {
        phase: '理解', title: '先找那个没变的东西',
        text: '乙容器里的水，从头到尾都是 18 kg。后来乙的浓度是 25%，说明水占了 75%。',
        math: '', why: '倒进倒出，水既没增加也没减少，这是破题的钥匙。',
        ops: [{ op: 'focus', ids: ['yi-w'], text: '水一直没变' }, { op: 'dim', ids: ['yi-a'] }]
      },
      {
        phase: '计算', title: '用水的占比反推乙的总量',
        text: '18 ÷ 75% = 24，乙里一共 24 kg；酒精就是 24 − 18 = 6 kg。甲剩下 10 − 6 = 4 kg。',
        math: '18 / 0.75 = 24', why: '水占 75%，18 kg 对应 75%，求整体用除法。',
        ops: [{ op: 'set', id: 'yi', text: '24 kg' }, { op: 'set', id: 'yi-a', text: '酒精 6 kg' }, { op: 'mark', id: 'yi-a', text: '6 kg' }]
      },
      {
        phase: '关系', title: '换个视角：十字交叉',
        text: '现在甲里是 4 kg 纯酒精，要配上 25% 的溶液，配成 65%。',
        math: '10 - 6 = 4',
        why: '两瓶不同浓度的东西倒在一起，用十字交叉算质量比最快。',
        ops: [{ op: 'focus', ids: ['r1', 'r2'], text: '100% 和 25% 配成 65%' }],
        diagram: {
          type: 'cross', title: '配成 65%',
          rows: [
            { id: 'r1', label: '纯酒精', value: '100%', share: '40 份', color: 'orange' },
            { id: 'r2', label: '乙溶液', value: '25%', share: '35 份', color: 'blue' }
          ],
          mid: { id: 'mid', value: '65%', label: '混合后' },
          ratio: '40 : 35 = 8 : 7',
          note: '4 kg 对应 8 份，每份 0.5 kg'
        }
      },
      {
        phase: '列式', title: '份数比就是质量比',
        text: '100 和 65 差 35，65 和 25 差 40，所以纯酒精 : 溶液 = 40 : 35 = 8 : 7。',
        math: '', why: '交叉相减，得到的两个差就是两边的份数。',
        ops: [{ op: 'focus', ids: ['r1'], text: '40 份' }, { op: 'focus', ids: ['r2'], text: '35 份' }, { op: 'pulse', ids: ['mid'] }]
      },
      {
        phase: '计算', title: '按份数求出答案',
        text: '4 kg 对应 8 份，1 份就是 0.5 kg，7 份就是 3.5 kg。',
        math: '4 / 8 * 7 = 3.5', why: '先求 1 份，再乘份数，这是份数问题的老套路。',
        ops: [{ op: 'set', id: 'r2', text: '3.5 kg' }, { op: 'mark', id: 'r2', text: '✓' }]
      },
      {
        phase: '检验', title: '代回去看浓度',
        text: '甲最后 7.5 kg，酒精 4 + 0.875 = 4.875 kg，4.875 ÷ 7.5 = 65%，正好对得上。',
        math: '4.875 / 7.5 = 0.65', why: '浓度 = 酒精 ÷ 溶液总量，两边都要回到 65% 和 25%。',
        ops: [{ op: 'focus', ids: ['mid'] }, { op: 'mark', id: 'mid', text: '✓' }]
      }
    ],
    answer: { value: '3.5', unit: '千克', sentence: '第二次从乙倒了 3.5 千克溶液。' },
    checks: ['18 / 0.75 = 24', '24 - 18 = 6', '4 / 8 * 7 = 3.5', '4.875 / 7.5 = 0.65'],
    warning: ''
  };

  const examples = [
    { label: '分数 · 单位1', grade: 6, text: '小明有 48 元，小红的钱是小明的 3/4，两个人一共有多少元？' },
    { label: '和差问题', grade: 4, text: '甲、乙两盒共有 48 张卡片，甲盒比乙盒多 12 张。两盒各有多少张卡片？' },
    { label: '鸡兔同笼', grade: 5, text: '笼子里有鸡和兔共 8 只，一共有 26 只脚。鸡和兔各有几只？' },
    { label: '相遇问题', grade: 5, text: 'A、B 两地相距 300 千米。甲车从 A 地出发，每小时行 60 千米；乙车从 B 地出发，每小时行 40 千米。两车同时相向而行，几小时后相遇？' },
    { label: '长方形面积', grade: 4, text: '一个长方形的长是 8 厘米，宽是 5 厘米，它的面积是多少平方厘米？' },
    { label: '圆柱体积', grade: 6, text: '一个圆柱的底面半径是 2 厘米，高是 5 厘米，它的体积是多少立方厘米？' },
    { label: '简易方程', grade: 5, text: '一个数的 3 倍再加上 5，结果是 26。这个数是多少？' },
    { label: '折扣盈亏', grade: 6, text: discount.problem.text },
    { label: '浓度问题', grade: 6, text: solution.problem.text }
  ];

  MT.demo = { lessons: [demo, discount, solution], examples };
})();
