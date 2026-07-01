/**
 * 统一响应格式工具
 */

// 成功响应
const success = (res, data = null, message = '操作成功') => {
  return res.json({
    code: 200,
    message,
    data,
  });
};

// 分页成功响应
const paginate = (res, list, total, page, pageSize) => {
  return res.json({
    code: 200,
    message: '操作成功',
    data: {
      list,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    },
  });
};

// 失败响应
const fail = (res, message = '操作失败', code = 400) => {
  return res.status(code).json({
    code,
    message,
    data: null,
  });
};

// 未授权
const unauthorized = (res, message = '未登录或登录已过期') => {
  return res.status(401).json({
    code: 401,
    message,
    data: null,
  });
};

// 无权限
const forbidden = (res, message = '无权限访问') => {
  return res.status(403).json({
    code: 403,
    message,
    data: null,
  });
};

module.exports = { success, paginate, fail, unauthorized, forbidden };
