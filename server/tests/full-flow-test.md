# 全流程测试文档

## 测试前提
- 后端运行在 http://localhost:3000
- 数据库已初始化（seed 数据已导入）

## 测试流程（按业务顺序）

### 阶段1：基础验证
1. 健康检查 `GET /api/health`
2. 管理员登录 `POST /api/auth/login` (admin/admin123)
3. 获取用户信息 `GET /api/auth/userinfo`

### 阶段2：系统配置（管理员）
4. 获取系统配置 `GET /api/admin/system/configs`
5. 更新系统配置 `PUT /api/admin/system/configs`
6. 添加域名 `POST /api/admin/system/domains`
7. 切换域名 `PUT /api/admin/system/domains/:id/switch`
8. 获取域名列表 `GET /api/admin/system/domains`

### 阶段3：员工管理
9. 获取员工列表 `GET /api/admin/system/staff`
10. 创建员工 `POST /api/admin/system/staff`

### 阶段4：合伙人管理（核心）
11. 创建合伙人A `POST /api/admin/partners`
12. 创建合伙人B（A的下级） `POST /api/admin/partners`
13. 获取合伙人列表 `GET /api/admin/partners`
14. 获取合伙人详情 `GET /api/admin/partners/:id`
15. 更新合伙人 `PUT /api/admin/partners/:id`
16. 生成邀请二维码 `GET /api/admin/partners/:id/qrcode`

### 阶段5：客户管理
17. 创建客户（归属合伙人A） `POST /api/admin/customers`
18. 获取客户列表 `GET /api/admin/customers`
19. 更新客户 `PUT /api/admin/customers/:id`

### 阶段6：流水录入 → 佣金自动计算
20. 录入流水1000元（客户→合伙人A） `POST /api/admin/transactions`
    - 验证：自动生成直推佣金 = 1000 * 3% = 30元
    - 验证：上级合伙人（如有）自动生成团队佣金
21. 获取流水列表 `GET /api/admin/transactions`

### 阶段7：结算管理
22. 创建结算（给合伙人A出款） `POST /api/admin/settlements`
    - 验证：合伙人余额扣减
23. 获取结算列表 `GET /api/admin/settlements`

### 阶段8：数据大盘
24. 获取大盘概览 `GET /api/admin/dashboard/overview`
25. 获取流水排行 `GET /api/admin/dashboard/ranking`

### 阶段9：客户报备
26. 合伙人报备客户 `POST /api/mobile/report`
27. 管理员获取待审核报备 `GET /api/admin/reports`
28. 管理员审核报备 `PUT /api/admin/reports/:id/review`

### 阶段10：知识库
29. 上传素材图片 `POST /api/admin/materials`
30. 获取素材列表 `GET /api/admin/materials`
31. 创建话术类别 `POST /api/admin/scripts/categories`
32. 创建话术内容 `POST /api/admin/scripts`
33. 获取话术列表 `GET /api/admin/scripts/categories`

### 阶段11：移动端合伙人API
34. 合伙人模拟登录 `POST /api/auth/wechat/login` (dev_mode)
35. 获取工作台数据 `GET /api/mobile/workbench`
36. 获取我的客户 `GET /api/mobile/customers`
37. 获取我的团队 `GET /api/mobile/team`
38. 获取佣金明细 `GET /api/mobile/commissions`
39. 获取结算记录 `GET /api/mobile/settlements`
40. 获取素材 `GET /api/mobile/materials`
41. 获取话术 `GET /api/mobile/scripts`
42. 获取推演配置 `GET /api/mobile/projection-config`

### 阶段12：邀请码流程
43. 验证邀请码 `GET /api/invite/validate/:code`

### 阶段13：员工数据隔离
44. 员工登录 `POST /api/auth/login` (staff01/staff123)
45. 员工获取合伙人列表（只能看自己名下） `GET /api/admin/partners`
46. 员工访问管理员接口（应返回403） `GET /api/admin/system/configs`

### 阶段14：操作日志
47. 获取操作日志 `GET /api/admin/system/logs`

### 阶段15：清理
48. 删除测试话术 `DELETE /api/admin/scripts/:id`
49. 删除测试话术类别 `DELETE /api/admin/scripts/categories/:id`
50. 删除测试素材 `DELETE /api/admin/materials/:id`
51. 删除测试域名 `DELETE /api/admin/system/domains/:id`

## 验证标准
- 所有接口返回 `code: 200`（除权限测试外）
- 佣金计算正确（直推3%，团队1%）
- 结算后余额正确扣减
- 员工数据隔离有效
- 操作日志正确记录
