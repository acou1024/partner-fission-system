/**
 * Q&A 反驳应对 + 风控红线字典 控制器
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { success, fail } = require('../utils/response');
const logger = require('../utils/logger');

// ======================== QA 反驳应对 ========================

// 获取所有QA列表
const getQaList = async (req, res) => {
  try {
    const list = await prisma.qaItem.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return success(res, list);
  } catch (err) {
    logger.error('获取QA列表失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 创建QA
const createQa = async (req, res) => {
  try {
    const { question, answer } = req.body;
    if (!question || !answer) return fail(res, '问题和回答不能为空');

    const item = await prisma.qaItem.create({
      data: { question, answer },
    });
    return success(res, item, '创建成功');
  } catch (err) {
    logger.error('创建QA失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 更新QA
const updateQa = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer } = req.body;

    const item = await prisma.qaItem.update({
      where: { id: parseInt(id) },
      data: { question, answer },
    });
    return success(res, item, '更新成功');
  } catch (err) {
    logger.error('更新QA失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 删除QA
const deleteQa = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.qaItem.delete({ where: { id: parseInt(id) } });
    return success(res, null, '删除成功');
  } catch (err) {
    logger.error('删除QA失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// ======================== 风控红线字典 ========================

// 获取所有风控词列表
const getRiskWordList = async (req, res) => {
  try {
    const list = await prisma.riskWord.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return success(res, list);
  } catch (err) {
    logger.error('获取风控词列表失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 创建风控词
const createRiskWord = async (req, res) => {
  try {
    const { badWord, goodWord } = req.body;
    if (!badWord || !goodWord) return fail(res, '违规词和安全词不能为空');

    const item = await prisma.riskWord.create({
      data: { badWord, goodWord },
    });
    return success(res, item, '创建成功');
  } catch (err) {
    logger.error('创建风控词失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 更新风控词
const updateRiskWord = async (req, res) => {
  try {
    const { id } = req.params;
    const { badWord, goodWord } = req.body;

    const item = await prisma.riskWord.update({
      where: { id: parseInt(id) },
      data: { badWord, goodWord },
    });
    return success(res, item, '更新成功');
  } catch (err) {
    logger.error('更新风控词失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 删除风控词
const deleteRiskWord = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.riskWord.delete({ where: { id: parseInt(id) } });
    return success(res, null, '删除成功');
  } catch (err) {
    logger.error('删除风控词失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// ======================== 客户画像提取 ========================

// 获取画像匹配的话术（纯前端逻辑，后端只提供话术分类数据）
const getProfilerScripts = async (req, res) => {
  try {
    const categories = await prisma.scriptCategory.findMany({
      where: { parentId: null },
      include: {
        scripts: { orderBy: { sortOrder: 'asc' } },
        children: {
          include: { scripts: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return success(res, categories);
  } catch (err) {
    logger.error('获取画像话术失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

module.exports = {
  getQaList,
  createQa,
  updateQa,
  deleteQa,
  getRiskWordList,
  createRiskWord,
  updateRiskWord,
  deleteRiskWord,
  getProfilerScripts,
};
