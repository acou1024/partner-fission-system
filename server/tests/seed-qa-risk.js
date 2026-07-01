/**
 * 预置 QA 反驳应对 + 风控红线字典 初始数据
 * 数据来源：体彩系统.html 中的默认数据
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== 开始预置 QA + 风控词数据 ===');

  // QA 反驳应对
  const qaItems = [
    { question: '这是赌博吗？违法的吧？', answer: '千万别误会，这是中国体育彩票，国家公益彩票。我们用理财的思维来买彩票，讲究的是策略，不是瞎赌。' },
    { question: '如果不中怎么办？会亏很多吗？', answer: '我们有阶梯式计划，前6把哪怕输了，第7把中也能回本赚钱。而且前7天严格跟单亏了算我的。' },
    { question: '你们是不是骗子？网上这种多了去了', answer: '理解你的顾虑。我们是实体体彩店，开了十几年了，店面视频随时拍给你看。国家体彩可不是野鸡平台，每一注都有官方记录可查。' },
    { question: '我没钱，玩不起', answer: '不需要大资金，最低10块钱就能跟一期。我们讲究小资金大策略，不是豪赌。先拿个零花钱试试水，感受一下再说。' },
    { question: '万一你们跑路了怎么办？', answer: '我们是实体店经营，营业执照、体彩授权都齐全的。而且彩票是在中国体育彩票官方渠道购买，钱不经过我们手，你自己的账户自己管。' },
    { question: '我朋友之前玩这个亏了很多', answer: '那是因为没有策略、没有纪律。我们和散户最大的区别就是有专业的数据分析和严格的止损机制。我们不是碰运气，是用大数法则做概率。' },
  ];

  const existingQa = await prisma.qaItem.count();
  if (existingQa === 0) {
    for (const qa of qaItems) {
      await prisma.qaItem.create({ data: qa });
    }
    console.log(`✅ 创建了 ${qaItems.length} 条 QA 反驳话术`);
  } else {
    console.log(`⏭️ QA 已有 ${existingQa} 条数据，跳过`);
  }

  // 风控红线字典
  const riskWords = [
    { badWord: '理财 / 投资', goodWord: '长期计划 / 赚零花钱' },
    { badWord: '收益率', goodWord: '胜率 / 加鸡腿' },
    { badWord: '倍投 / 赌', goodWord: '阶梯式玩法 / 玩数据' },
    { badWord: '包赚 / 必中', goodWord: '概率高 / 拿下的机会大' },
    { badWord: '保本 / 稳赚', goodWord: '体验 / 试试水' },
    { badWord: '赌博 / 赌钱', goodWord: '买彩票 / 玩一把' },
    { badWord: '返利 / 分红', goodWord: '奖励 / 小惊喜' },
    { badWord: '代理 / 下线', goodWord: '合伙人 / 团队伙伴' },
    { badWord: '充值 / 入金', goodWord: '参与 / 跟一期' },
    { badWord: '提现 / 出金', goodWord: '领奖 / 兑奖' },
  ];

  const existingRisk = await prisma.riskWord.count();
  if (existingRisk === 0) {
    for (const rw of riskWords) {
      await prisma.riskWord.create({ data: rw });
    }
    console.log(`✅ 创建了 ${riskWords.length} 条风控词`);
  } else {
    console.log(`⏭️ 风控词已有 ${existingRisk} 条数据，跳过`);
  }

  console.log('=== 预置数据完成 ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
