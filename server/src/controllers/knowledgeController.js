/**
 * 知识库控制器 - 素材图片 & 话术管理
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { success, paginate, fail } = require('../utils/response');
const logger = require('../utils/logger');

// ==================== 素材图片管理 ====================

// 压缩图片（服务端自动压缩）
const compressImage = async (filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return;

    const tempPath = filePath + '.tmp';
    await sharp(filePath)
      .resize(1200, null, { withoutEnlargement: true }) // 最大宽度1200px，等比缩放
      .jpeg({ quality: 80 })
      .toFile(tempPath);

    fs.unlinkSync(filePath);
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    logger.warn('图片压缩失败（使用原图）:', err.message);
  }
};

// 上传素材图片
const uploadMaterial = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return fail(res, '请选择要上传的图片');
    }

    const materials = [];
    for (const file of req.files) {
      // 服务端自动压缩
      await compressImage(file.path);
      const compressedSize = fs.existsSync(file.path) ? fs.statSync(file.path).size : file.size;

      const material = await prisma.material.create({
        data: {
          title: req.body.title || file.originalname,
          filePath: `/uploads/${file.filename}`,
          fileSize: compressedSize,
          uploadDate: req.body.uploadDate ? new Date(req.body.uploadDate) : new Date(),
        },
      });
      materials.push(material);
    }

    return success(res, materials, `成功上传 ${materials.length} 张图片`);
  } catch (err) {
    logger.error('上传素材失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 获取素材列表（按日期分组）
const getMaterials = async (req, res) => {
  try {
    const { page = 1, pageSize = 30, date } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const where = {};
    if (date) {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setDate(dayEnd.getDate() + 1);
      where.uploadDate = { gte: dayStart, lt: dayEnd };
    }

    const [list, total] = await Promise.all([
      prisma.material.findMany({
        where,
        skip,
        take: parseInt(pageSize),
        orderBy: { uploadDate: 'desc' },
      }),
      prisma.material.count({ where }),
    ]);

    return paginate(res, list, total, parseInt(page), parseInt(pageSize));
  } catch (err) {
    logger.error('获取素材列表失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 删除素材
const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const material = await prisma.material.findUnique({ where: { id: parseInt(id) } });
    if (!material) {
      return fail(res, '素材不存在');
    }

    // 删除物理文件
    const filePath = path.join(process.cwd(), material.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.material.delete({ where: { id: parseInt(id) } });
    return success(res, null, '素材已删除');
  } catch (err) {
    logger.error('删除素材失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 清理N天前的旧素材
const cleanOldMaterials = async (req, res) => {
  try {
    const { days = 30 } = req.body;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    // 查找要删除的素材
    const oldMaterials = await prisma.material.findMany({
      where: { uploadDate: { lt: cutoffDate } },
    });

    // 删除物理文件
    for (const material of oldMaterials) {
      const filePath = path.join(process.cwd(), material.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // 删除数据库记录
    const result = await prisma.material.deleteMany({
      where: { uploadDate: { lt: cutoffDate } },
    });

    return success(res, { deleted: result.count }, `已清理 ${result.count} 张过期素材`);
  } catch (err) {
    logger.error('清理旧素材失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// ==================== 话术管理 ====================

// 获取话术分类树
const getScriptCategories = async (req, res) => {
  try {
    const categories = await prisma.scriptCategory.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: true, // 三级
            scripts: { orderBy: { sortOrder: 'asc' } },
          },
          orderBy: { sortOrder: 'asc' },
        },
        scripts: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return success(res, categories);
  } catch (err) {
    logger.error('获取话术分类失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 创建话术分类
const createScriptCategory = async (req, res) => {
  try {
    const { name, parentId, sortOrder } = req.body;
    if (!name) {
      return fail(res, '分类名称不能为空');
    }

    const category = await prisma.scriptCategory.create({
      data: {
        name,
        parentId: parentId ? parseInt(parentId) : null,
        sortOrder: sortOrder || 0,
      },
    });

    return success(res, category, '分类创建成功');
  } catch (err) {
    logger.error('创建话术分类失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 更新话术分类
const updateScriptCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sortOrder } = req.body;

    const category = await prisma.scriptCategory.update({
      where: { id: parseInt(id) },
      data: { name, sortOrder: sortOrder || 0 },
    });

    return success(res, category, '分类更新成功');
  } catch (err) {
    logger.error('更新话术分类失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 删除话术分类（级联删除子分类和话术内容）
const deleteScriptCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // 检查是否有子分类
    const childCount = await prisma.scriptCategory.count({
      where: { parentId: parseInt(id) },
    });
    if (childCount > 0) {
      return fail(res, '请先删除子分类');
    }

    // 删除分类下的话术内容
    await prisma.scriptContent.deleteMany({ where: { categoryId: parseInt(id) } });
    await prisma.scriptCategory.delete({ where: { id: parseInt(id) } });

    return success(res, null, '分类已删除');
  } catch (err) {
    logger.error('删除话术分类失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 创建话术内容
const createScript = async (req, res) => {
  try {
    const { categoryId, title, content, sortOrder } = req.body;
    if (!categoryId || !title || !content) {
      return fail(res, '分类、标题和内容不能为空');
    }

    const script = await prisma.scriptContent.create({
      data: {
        categoryId: parseInt(categoryId),
        title,
        content,
        sortOrder: sortOrder || 0,
      },
    });

    return success(res, script, '话术创建成功');
  } catch (err) {
    logger.error('创建话术失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 更新话术内容
const updateScript = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, sortOrder } = req.body;

    const script = await prisma.scriptContent.update({
      where: { id: parseInt(id) },
      data: { title, content, sortOrder: sortOrder || 0 },
    });

    return success(res, script, '话术更新成功');
  } catch (err) {
    logger.error('更新话术失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 删除话术内容
const deleteScript = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.scriptContent.delete({ where: { id: parseInt(id) } });
    return success(res, null, '话术已删除');
  } catch (err) {
    logger.error('删除话术失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 批量导入话术
const bulkImportScripts = async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return fail(res, '导入数据不能为空');
    }

    let created = 0;
    for (const item of items) {
      if (!item.categoryId || !item.title || !item.content) continue;
      await prisma.scriptContent.create({
        data: {
          categoryId: parseInt(item.categoryId),
          title: item.title.trim(),
          content: item.content.trim(),
          sortOrder: item.sortOrder || 0,
        },
      });
      created++;
    }

    return success(res, { created }, `成功导入 ${created} 条话术`);
  } catch (err) {
    logger.error('批量导入话术失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

module.exports = {
  uploadMaterial,
  getMaterials,
  deleteMaterial,
  cleanOldMaterials,
  getScriptCategories,
  createScriptCategory,
  updateScriptCategory,
  deleteScriptCategory,
  createScript,
  updateScript,
  deleteScript,
  bulkImportScripts,
};
