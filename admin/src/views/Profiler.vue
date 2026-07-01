<template>
  <div>
    <el-card shadow="never">
      <template #header>
        <span style="font-weight: 700; font-size: 16px;">🎯 高精度客户画像提取</span>
        <span style="color: #86868b; font-size: 13px; margin-left: 12px;">根据客户特征，智能匹配最优转化话术流</span>
      </template>

      <el-row :gutter="24">
        <!-- 维度1：流量来源 -->
        <el-col :span="8">
          <div class="dim-section">
            <div class="dim-label">1. 流量来源 (非常关键)</div>
            <el-radio-group v-model="selections.source" class="dim-radio-group">
              <el-radio v-for="opt in sourceOptions" :key="opt.value" :value="opt.value" border class="dim-radio">
                {{ opt.label }}
              </el-radio>
            </el-radio-group>
          </div>
        </el-col>

        <!-- 维度2：核心诉求 -->
        <el-col :span="8">
          <div class="dim-section">
            <div class="dim-label">2. 核心诉求/痛点</div>
            <el-radio-group v-model="selections.intention" class="dim-radio-group">
              <el-radio v-for="opt in intentionOptions" :key="opt.value" :value="opt.value" border class="dim-radio">
                {{ opt.label }}
              </el-radio>
            </el-radio-group>
          </div>
        </el-col>

        <!-- 维度3：基础画像 -->
        <el-col :span="8">
          <div class="dim-section">
            <div class="dim-label">3. 基础画像</div>
            <el-radio-group v-model="selections.persona" class="dim-radio-group">
              <el-radio v-for="opt in personaOptions" :key="opt.value" :value="opt.value" border class="dim-radio">
                {{ opt.label }}
              </el-radio>
            </el-radio-group>
          </div>
        </el-col>
      </el-row>

      <div style="text-align: center; margin-top: 20px;">
        <el-button type="primary" size="large" @click="analyze" style="width: 320px; font-size: 15px; letter-spacing: 2px;">
          ⚡ 提取最精准转化话术
        </el-button>
        <el-button v-if="matchedCategory" @click="resetAll" style="margin-left: 12px;">重置</el-button>
      </div>
    </el-card>

    <!-- 匹配结果 -->
    <el-card v-if="matchedCategory" shadow="never" style="margin-top: 16px; border-color: #22c55e;">
      <template #header>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <el-tag type="success" effect="dark" style="margin-right: 8px;">✅ 精准匹配</el-tag>
            <span style="font-size: 18px; font-weight: 800;">{{ matchedCategory.name }}</span>
          </div>
          <div>
            <el-tag v-for="tag in matchedCategory.tags" :key="tag" style="margin-left: 6px;" type="info">{{ tag }}</el-tag>
          </div>
        </div>
      </template>

      <el-alert :title="'核心策略：' + matchedCategory.strategy" type="warning" show-icon :closable="false" style="margin-bottom: 20px;" />

      <div v-for="script in matchedCategory.scripts" :key="script.id" class="script-card">
        <div class="script-header">
          <span class="script-title">{{ script.title }}</span>
          <el-button size="small" type="primary" text @click="copyText(script.content)">
            📋 复制话术
          </el-button>
        </div>
        <div class="script-body">{{ script.content }}</div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const selections = ref({ source: '', intention: '', persona: '' })
const matchedCategory = ref(null)

const sourceOptions = [
  { value: 'friend', label: '亲戚/熟人' },
  { value: 'boss', label: 'Boss直聘' },
  { value: 'qq', label: 'QQ/网络泛粉' },
  { value: 'offline', label: '周边大B端' },
]

const intentionOptions = [
  { value: 'startup', label: '找创业项目' },
  { value: 'parttime', label: '找副业赚菜钱' },
  { value: 'debt', label: '急需上岸还债' },
  { value: 'entertainment', label: '娱乐消遣' },
]

const personaOptions = [
  { value: 'youth', label: '20-30岁青年' },
  { value: 'mom', label: '全职宝妈/主妇' },
  { value: 'men', label: '35岁+生意男' },
]

// 内置专属话术库（与体彩系统.html 一致）
const scriptLibrary = {
  youth: {
    name: '20-30岁人群 (大学生/职场新人)',
    tags: ['怕被割', '要数据', '薅羊毛'],
    strategy: '去油腻，讲效率，包装成"数据套利"',
    scripts: [
      { id: 'y1', title: '第1步：破冰 (筛选意向)', content: '哈喽，刚看你主页感觉网感不错。我们工作室正在招几个做线上数据录入的兼职合伙人，主要做体彩私域流量这块。不影响你主业，每天手机操作半小时就行，赚个夜孵钱也是香的。有没有兴趣了解下？' },
      { id: 'y2', title: '第2步：建立信任', content: '这是我们上周带的一个新人跑出来的数据。我们不是瞎蒙的，团队有专门的数学模型分析。简单说就是跟着我们SOP计划走，做大概率的套利。不需要你懂球，会看手机就行。' },
      { id: 'y3', title: '第3步：抛出杀手锧', content: '我知道现在的年轻人都怕被割韭菜。咱们有个"7天试用期"。你先进群潜水，前7天跟着计划挂个小单。要是亏了，本金我全额补给你；要是赚了，都算你的。主打真实，觉得合适再长做。' },
      { id: 'y4', title: '第4步：收网 (拉群)', content: '行，爽快。那我拉你进内部群，你先潜水看懂了再操作。记住一点：按计划走，别上头。' }
    ]
  },
  mom: {
    name: '30-45岁女性 (全职宝妈)',
    tags: ['要安全', '补贴家用', '怕风险'],
    strategy: '打亲情牌，晒实体店环境，承诺包赔',
    scripts: [
      { id: 'm1', title: '第1步：破冰 (建立共情)', content: '你好呀。看你照顾家庭挺辛苦的，想着你应该需要一份灵活的副业。我们这边实体店招线上兼职，在家带娃顺手就能做。发不了大财，但赚个买菜钱稳稳当当的。' },
      { id: 'm2', title: '第2步：建立信任', content: '我们开了十几年老店了，这是店里的视频。体彩是国家项目，正规合法的。我们想找细心的人帮忙维护线上客户，绝对安全，你放心。' },
      { id: 'm3', title: '第3步：杀手锧 (兆底)', content: '妹子，赚钱都不容易，所以我给新人都承诺"无忧体验"。前7天你跟着做，万一亏了，亏多少我补多少。你就当来体验一下，没有任何损失。' }
    ]
  },
  men: {
    name: '35-50岁男性 (生意人/想翻身)',
    tags: ['要翻身', '慕强', '讲义气'],
    strategy: '秀肌肉(流水)，讲项目，立规矩',
    scripts: [
      { id: 'e1', title: '第1步：破冰', content: '哥们，看了你资料也是做过事的人。我这边是正规体彩连锁，正扩充线上合伙人。这年头实体难做，但这块现金流很好。跟着策略走，一个月拿个1-2万喝茶钱问题不大。' },
      { id: 'e2', title: '第2步：秀肌肉', content: '打开天窗说亮话。我做这个十几年，月流水几百个W。我不缺人，缺的是能一起做大的兄弟。我有内幕分析，就看你有没有魄力了解一下。' },
      { id: 'e3', title: '第3步：霸气承诺', content: '做生意讲究诚意。前7天你来试，赚了算你的，亏了算我的招待费，本金全退。我看重的是你这个人能不能长期一起做大。' }
    ]
  },
  friend_intro: {
    name: '亲友/熟人 (朋友圈裂变)',
    tags: ['信任度高', '防备心低', '怕伤感情'],
    strategy: '极度日常化，去推销感，强调"带你喝汤"和"我兆底"',
    scripts: [
      { id: 'f1', title: '第1步：日常寒暄切入', content: '兄弟/姐妹，最近忙啥呢？我最近在实体体彩店那边弄了个线上数据跑单的活儿，跟着跑了跑还不错，每天赚个饭钱没啥问题。' },
      { id: 'f2', title: '第2步：消除"赌博"顾虑', content: '先说好不是让你去瞎赌啊，是跟着专门的大数法则做2-3球计划。你看这是我这几天的记录。你就当是个超短期的零用钱理财，每天花两分钟就行。' },
      { id: 'f3', title: '第3步：强信任兆底', content: '咱们这关系我肯定不能坑你。你想玩的话，拿个几十一百块钱试个水。我给你兆底，前5期你要是按计划走还亏了，就算我请你喝几杯奶茶了，全退给你。' }
    ]
  },
  qq_startup: {
    name: 'QQ/网络创业粉 (泛流量)',
    tags: ['想暴富', '找项目', '执行力强'],
    strategy: '抛出"合伙人"身份，强调0成本、大平台、赚分润',
    scripts: [
      { id: 'q1', title: '第1步：直接亮底牌', content: '你好，看你空间资料也是想找点项目做。咱们直接点，我这边是正规体彩实体店，目前在招线上合伙人，不需要你投资囤货，只要你有执行力。' },
      { id: 'q2', title: '第2步：讲清盈利模式', content: '我们的核心壁垒是专业团队出计划单。你的任务不用你懂球，就是按我们SOP去建群、发计划单。群里客户跟着买赚钱了，我们给你返流水的分润。' },
      { id: 'q3', title: '第3步：免责测试 (拉群)', content: '你肯定怕被割韭菜。这样，我给你开个特权，你自己先进我们内部群潜水5天，看看每天的准现率和别人怎么拿提成的。看懂了再决定做不做。' }
    ]
  },
  boss_jobseeker: {
    name: 'Boss直聘/兼职求职粉',
    tags: ['找工作', '要稳定', '怕骗押金'],
    strategy: '用HR口吻，强调用SOP工作，无任何前置费用',
    scripts: [
      { id: 'b1', title: '第1步：面试官口吻', content: '您好，看了您的简历。我们门店目前在招募线上社群运营专员（可兼职），不需要坐班打卡，每天利用业余时间用手机操作即可。' },
      { id: 'b2', title: '第2步：打消拉客恐惧', content: '这份工作不是让你去大街上拉客。我们有成熟的引流渠道和数据单。你的工作内容是按照SOP流程，在群里维护客户、发布计划单。踏实干一个月几千块零花没问题。' },
      { id: 'b3', title: '第3步：旁听式入职', content: '我们不收任何培训费、押金。您可以先以旁听生的身份，进我们的工作群观察5天。看看这套模式是怎么运转的，觉得能胜任我们再正式线上签约。' }
    ]
  }
}

const analyze = () => {
  const { source, intention, persona } = selections.value
  if (!source && !intention && !persona) {
    return ElMessage.warning('请至少勾选一个维度')
  }

  // 匹配优先级逻辑（与体彩系统.html ProfilerView 完全一致）
  let matchKey = 'youth'
  if (source === 'friend') matchKey = 'friend_intro'
  else if (source === 'boss') matchKey = 'boss_jobseeker'
  else if (source === 'qq' && intention === 'startup') matchKey = 'qq_startup'
  else if (intention === 'debt') matchKey = 'youth'
  else if (persona === 'mom' || intention === 'parttime') matchKey = 'mom'
  else if (persona === 'men' || source === 'offline') matchKey = 'men'
  else if (source === 'qq') matchKey = 'qq_startup'

  matchedCategory.value = scriptLibrary[matchKey]
  ElMessage.success('✅ 已精准匹配话术流')
}

const resetAll = () => {
  selections.value = { source: '', intention: '', persona: '' }
  matchedCategory.value = null
}

const copyText = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    ElMessage.success('已复制到剪贴板')
  })
}
</script>

<style scoped>
.dim-section {
  margin-bottom: 16px;
}
.dim-label {
  font-size: 14px;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 12px;
}
.dim-radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dim-radio {
  width: 100%;
  margin-right: 0 !important;
}
.script-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  transition: all 0.2s;
}
.script-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.08);
}
.script-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.script-title {
  font-size: 14px;
  font-weight: 700;
  color: #3b82f6;
}
.script-body {
  font-size: 14px;
  color: #1d1d1f;
  line-height: 1.8;
  white-space: pre-wrap;
}
</style>
