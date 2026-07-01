/*
 Navicat Premium Data Transfer

 Source Server         : JavaPT
 Source Server Type    : MySQL
 Source Server Version : 80041
 Source Host           : localhost:3306
 Source Schema         : partner_system

 Target Server Type    : MySQL
 Target Server Version : 80041
 File Encoding         : 65001

 Date: 30/06/2026 23:13:44
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for betting_scheme
-- ----------------------------
DROP TABLE IF EXISTS `betting_scheme`;
CREATE TABLE `betting_scheme`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键ID，自增长',
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '方案名称，如\"方案A\"、\"方案B\"等',
  `odds` decimal(6, 2) NOT NULL COMMENT '赔率，如1.71、2.0等，用于计算客户回流金额',
  `status` int(0) NOT NULL DEFAULT 1 COMMENT '状态：1-启用，0-停用，控制方案是否参与计算',
  `effective_date` date NULL DEFAULT NULL COMMENT '生效日期，赔率配置的有效日期',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，记录配置创建的时间',
  `updated_at` datetime(3) NOT NULL COMMENT '更新时间，记录配置最后修改的时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `betting_scheme_name_effective_date_key`(`name`, `effective_date`) USING BTREE COMMENT '唯一索引：方案名称+生效日期，确保每天每个方案只有一个赔率配置',
  INDEX `betting_scheme_effective_date_idx`(`effective_date`) USING BTREE COMMENT '索引：生效日期，用于快速查询某天的赔率配置'
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '投注方案赔率配置表-存储每日投注方案的赔率，用于客户盈利计算' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of betting_scheme
-- ----------------------------
INSERT INTO `betting_scheme` VALUES (1, '2', 1.71, 1, '2026-06-08', '2026-06-08 06:24:26.256', '2026-06-08 06:24:26.256');
INSERT INTO `betting_scheme` VALUES (2, '2', 1.72, 1, '2026-06-22', '2026-06-22 06:08:54.274', '2026-06-22 06:18:12.030');
INSERT INTO `betting_scheme` VALUES (3, '3', 50.00, 1, '2026-06-22', '2026-06-22 06:20:47.490', '2026-06-22 06:20:47.490');
INSERT INTO `betting_scheme` VALUES (4, '4', 4.00, 1, '2026-06-22', '2026-06-22 06:24:05.202', '2026-06-22 06:24:05.202');
INSERT INTO `betting_scheme` VALUES (5, '1', 0.10, 1, '2026-06-22', '2026-06-22 06:29:47.956', '2026-06-22 06:29:47.956');

-- ----------------------------
-- Table structure for commission
-- ----------------------------
DROP TABLE IF EXISTS `commission`;
CREATE TABLE `commission`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键ID，自增长',
  `amount` decimal(12, 2) NOT NULL COMMENT '佣金金额，合伙人实际获得的佣金',
  `rate` decimal(5, 2) NOT NULL COMMENT '分润比例，计算佣金时使用的比例（如3.00表示3%）',
  `type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '佣金类型：direct-直推佣金，team-团队佣金',
  `settled` int(0) NOT NULL DEFAULT 0 COMMENT '结算状态：0-未结算，1-已结算，标记佣金是否已发放',
  `partner_id` int(0) NOT NULL COMMENT '合伙人ID，获得佣金的合伙人',
  `transaction_id` int(0) NOT NULL COMMENT '交易ID，产生佣金的交易记录',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，佣金产生的时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `commission_partner_id_idx`(`partner_id`) USING BTREE COMMENT '索引：合伙人ID，用于查询某合伙人的所有佣金',
  INDEX `commission_transaction_id_idx`(`transaction_id`) USING BTREE COMMENT '索引：交易ID，用于查询某交易产生的佣金',
  INDEX `commission_settled_idx`(`settled`) USING BTREE COMMENT '索引：结算状态，用于筛选未结算/已结算佣金',
  CONSTRAINT `commission_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partner` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `commission_transaction_id_fkey` FOREIGN KEY (`transaction_id`) REFERENCES `transaction` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '佣金记录表-记录合伙人获得的佣金明细，包括直推佣金和团队佣金' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of commission
-- ----------------------------
INSERT INTO `commission` VALUES (3, 300.00, 3.00, 'direct', 0, 1, 3, '2026-06-22 06:21:59.205');
INSERT INTO `commission` VALUES (4, 300.00, 3.00, 'direct', 0, 1, 4, '2026-06-22 06:24:35.900');

-- ----------------------------
-- Table structure for customer
-- ----------------------------
DROP TABLE IF EXISTS `customer`;
CREATE TABLE `customer`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键ID，自增长',
  `nickname` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客户昵称，客户的显示名称',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '客户手机号，用于客户识别和联系',
  `open_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '微信OpenID，微信授权登录的唯一标识',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '备注信息，管理员或合伙人添加的客户备注',
  `status` int(0) NOT NULL DEFAULT 1 COMMENT '状态：1-正常，0-禁用，控制客户是否可操作',
  `partner_id` int(0) NOT NULL COMMENT '合伙人ID，客户归属的合伙人',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，客户注册的时间',
  `updated_at` datetime(3) NOT NULL COMMENT '更新时间，客户信息最后修改的时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `customer_open_id_key`(`open_id`) USING BTREE COMMENT '唯一索引：微信OpenID，确保每个微信用户只能注册一次',
  INDEX `customer_partner_id_idx`(`partner_id`) USING BTREE COMMENT '索引：合伙人ID，用于查询某合伙人的所有客户',
  INDEX `customer_open_id_idx`(`open_id`) USING BTREE COMMENT '索引：微信OpenID，用于快速查询微信用户',
  CONSTRAINT `customer_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partner` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '客户信息表-存储客户基本信息和归属关系，管理客户与合伙人的关联' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of customer
-- ----------------------------
INSERT INTO `customer` VALUES (1, 'a18319405400', NULL, NULL, '来自合伙人报备 #1', 1, 1, '2026-06-22 06:13:20.192', '2026-06-22 06:13:20.192');
INSERT INTO `customer` VALUES (2, 'a123456', NULL, NULL, '来自合伙人报备 #2', 1, 1, '2026-06-22 06:42:40.201', '2026-06-22 06:42:40.201');

-- ----------------------------
-- Table structure for customer_report
-- ----------------------------
DROP TABLE IF EXISTS `customer_report`;
CREATE TABLE `customer_report`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键ID，自增长',
  `nickname` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客户昵称，报备的客户名称',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '备注信息，报备说明或客户特征描述',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT '报备状态：pending-待审核，approved-已通过，rejected-已拒绝',
  `partner_id` int(0) NOT NULL COMMENT '合伙人ID，报备客户的合伙人',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，报备提交的时间',
  `updated_at` datetime(3) NOT NULL COMMENT '更新时间，报备状态最后更新的时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `customer_report_partner_id_idx`(`partner_id`) USING BTREE COMMENT '索引：合伙人ID，用于查询某合伙人的所有报备',
  INDEX `customer_report_status_idx`(`status`) USING BTREE COMMENT '索引：报备状态，用于筛选待审核/已通过/已拒绝的报备',
  CONSTRAINT `customer_report_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partner` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '客户报备表-记录合伙人提前报备的潜在客户，避免客户归属冲突' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of customer_report
-- ----------------------------
INSERT INTO `customer_report` VALUES (1, 'a18319405400', '111', 'approved', 1, '2026-06-22 06:13:09.588', '2026-06-22 06:13:20.165');
INSERT INTO `customer_report` VALUES (2, 'a123456', '用户', 'approved', 1, '2026-06-22 06:42:22.094', '2026-06-22 06:42:40.188');

-- ----------------------------
-- Table structure for domain_config
-- ----------------------------
DROP TABLE IF EXISTS `domain_config`;
CREATE TABLE `domain_config`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键ID，自增长',
  `domain` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '域名地址，如https://example.com',
  `type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '域名类型：entry-入口域名（推广链接），landing-落地域名（实际业务）',
  `is_active` int(0) NOT NULL DEFAULT 0 COMMENT '启用状态：1-当前使用，0-备用域名',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '备注信息，域名用途说明或备注',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，域名配置添加的时间',
  `updated_at` datetime(3) NOT NULL COMMENT '更新时间，域名配置最后修改的时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '域名配置表-管理系统访问域名，支持域名切换和防封策略' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of domain_config
-- ----------------------------

-- ----------------------------
-- Table structure for ledger
-- ----------------------------
DROP TABLE IF EXISTS `ledger`;
CREATE TABLE `ledger`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键ID，自增长',
  `record_date` date NOT NULL COMMENT '记录日期，账本记录的日期',
  `title` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '标题，账本记录的标题或说明',
  `invest_amount` decimal(12, 2) NOT NULL COMMENT '投资金额，当天的投资或投注金额',
  `return_amount` decimal(12, 2) NOT NULL COMMENT '回流金额，当天回流或中奖返还的金额',
  `profit_amount` decimal(12, 2) NOT NULL COMMENT '盈亏金额，当天的净盈亏（回流-投资）',
  `partner_id` int(0) NOT NULL COMMENT '合伙人ID，账本所属的合伙人',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，账本记录创建的时间',
  `updated_at` datetime(3) NOT NULL COMMENT '更新时间，账本记录最后修改的时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `ledger_partner_id_idx`(`partner_id`) USING BTREE COMMENT '索引：合伙人ID，用于查询某合伙人的所有账本记录',
  INDEX `ledger_record_date_idx`(`record_date`) USING BTREE COMMENT '索引：记录日期，用于按日期查询账本记录',
  CONSTRAINT `ledger_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partner` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '合伙人账本表-记录合伙人每日投资和收益情况，用于个人财务管理' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of ledger
-- ----------------------------

-- ----------------------------
-- Table structure for material
-- ----------------------------
DROP TABLE IF EXISTS `material`;
CREATE TABLE `material`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键ID，自增长',
  `title` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '素材标题，素材的显示名称',
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文件路径，素材文件的存储路径',
  `file_size` int(0) NULL DEFAULT NULL COMMENT '文件大小，素材文件的大小（字节）',
  `upload_date` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '上传日期，素材上传的时间',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，素材记录创建的时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `material_upload_date_idx`(`upload_date`) USING BTREE COMMENT '索引：上传日期，用于按时间查询素材和自动清理过期素材'
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '素材管理表-存储推广素材和资料文件，支持素材分类和自动清理' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of material
-- ----------------------------

-- ----------------------------
-- Table structure for operation_log
-- ----------------------------
DROP TABLE IF EXISTS `operation_log`;
CREATE TABLE `operation_log`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键ID，自增长',
  `module` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作模块，如\"合伙人管理\"、\"交易管理\"等',
  `action` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作动作，如\"create\"、\"update\"、\"delete\"等',
  `detail` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '操作详情，记录操作的参数、结果等详细信息（JSON格式）',
  `ip` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '操作IP，操作者的IP地址',
  `user_id` int(0) NOT NULL COMMENT '用户ID，执行操作的管理员或员工',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，操作发生的时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `operation_log_user_id_idx`(`user_id`) USING BTREE COMMENT '索引：用户ID，用于查询某用户的所有操作日志',
  INDEX `operation_log_module_idx`(`module`) USING BTREE COMMENT '索引：操作模块，用于按模块筛选操作日志',
  INDEX `operation_log_created_at_idx`(`created_at`) USING BTREE COMMENT '索引：创建时间，用于按时间范围查询操作日志',
  CONSTRAINT `operation_log_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `sys_user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 20 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '操作日志表-记录系统关键操作日志，用于审计和安全监控' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of operation_log
-- ----------------------------
INSERT INTO `operation_log` VALUES (1, 'QA管理', 'create', '{\"params\":{},\"body\":{\"question\":\"这算不算诈骗\",\"answer\":\"111\"},\"result\":\"创建成功\"}', '::1', 1, '2026-06-01 06:23:00.786');
INSERT INTO `operation_log` VALUES (2, '合伙人管理', 'create', '{\"params\":{},\"body\":{\"name\":\"董\",\"phone\":\"18576293019\",\"wechatId\":\"111\",\"parentId\":null,\"directRate\":3,\"teamRate\":1.5,\"rateMode\":\"fixed\",\"tieredRates\":null},\"result\":\"合伙人创建成功\"}', '::1', 1, '2026-06-01 06:29:17.833');
INSERT INTO `operation_log` VALUES (3, '方案管理', 'create', '{\"params\":{},\"body\":{\"effectiveDate\":\"2026-06-08\",\"name\":\"2\",\"odds\":1.71},\"result\":\"方案赔率创建成功\"}', '::1', 1, '2026-06-08 06:24:26.275');
INSERT INTO `operation_log` VALUES (4, '方案管理', 'create', '{\"params\":{},\"body\":{\"effectiveDate\":\"2026-06-22\",\"name\":\"赔率2\",\"odds\":1.72},\"result\":\"方案赔率创建成功\"}', '::1', 1, '2026-06-22 06:08:54.372');
INSERT INTO `operation_log` VALUES (5, '客户报备', 'review', '{\"params\":{\"id\":\"1\"},\"body\":{\"status\":\"approved\"},\"result\":\"审核通过，客户已添加\"}', '::1', 1, '2026-06-22 06:13:20.209');
INSERT INTO `operation_log` VALUES (6, '流水录入', 'create', '{\"params\":{},\"body\":{\"customerId\":1,\"amount\":0.01,\"orderDate\":\"2026-06-22\",\"plan\":\"A\",\"returnAmount\":1000,\"remark\":null},\"result\":\"流水录入成功，佣金已自动计算\"}', '::1', 1, '2026-06-22 06:13:58.143');
INSERT INTO `operation_log` VALUES (7, '流水录入', 'create', '{\"params\":{},\"body\":{\"customerId\":1,\"amount\":10000,\"orderDate\":\"2026-06-22\",\"plan\":\"2\",\"returnAmount\":\"\",\"remark\":null},\"result\":\"流水录入成功，佣金已自动计算\"}', '::1', 1, '2026-06-22 06:17:20.318');
INSERT INTO `operation_log` VALUES (8, '方案管理', 'update', '{\"params\":{\"id\":\"2\"},\"body\":{\"effectiveDate\":\"2026-06-22\",\"name\":\"2\",\"odds\":1.72},\"result\":\"方案赔率更新成功\"}', '::1', 1, '2026-06-22 06:18:12.042');
INSERT INTO `operation_log` VALUES (9, '方案管理', 'create', '{\"params\":{},\"body\":{\"effectiveDate\":\"2026-06-22\",\"name\":\"3\",\"odds\":50},\"result\":\"方案赔率创建成功\"}', '::1', 1, '2026-06-22 06:20:47.501');
INSERT INTO `operation_log` VALUES (10, '流水录入', 'create', '{\"params\":{},\"body\":{\"customerId\":1,\"amount\":10000,\"orderDate\":\"2026-06-22\",\"plan\":\"3\",\"returnAmount\":20000,\"remark\":null},\"result\":\"流水录入成功，佣金已自动计算\"}', '::1', 1, '2026-06-22 06:21:59.248');
INSERT INTO `operation_log` VALUES (11, '流水录入', 'delete', '{\"params\":{\"id\":\"2\"},\"body\":{},\"result\":\"流水已删除，佣金已回退\"}', '::1', 1, '2026-06-22 06:23:02.886');
INSERT INTO `operation_log` VALUES (12, '流水录入', 'delete', '{\"params\":{\"id\":\"1\"},\"body\":{},\"result\":\"流水已删除，佣金已回退\"}', '::1', 1, '2026-06-22 06:23:05.241');
INSERT INTO `operation_log` VALUES (13, '方案管理', 'create', '{\"params\":{},\"body\":{\"effectiveDate\":\"2026-06-22\",\"name\":\"4\",\"odds\":4},\"result\":\"方案赔率创建成功\"}', '::1', 1, '2026-06-22 06:24:05.213');
INSERT INTO `operation_log` VALUES (14, '流水录入', 'create', '{\"params\":{},\"body\":{\"customerId\":1,\"amount\":10000,\"orderDate\":\"2026-06-22\",\"plan\":\"4\",\"returnAmount\":\"\",\"remark\":null},\"result\":\"流水录入成功，佣金已自动计算\"}', '::1', 1, '2026-06-22 06:24:35.927');
INSERT INTO `operation_log` VALUES (15, '方案管理', 'create', '{\"params\":{},\"body\":{\"effectiveDate\":\"2026-06-22\",\"name\":\"1\",\"odds\":0.1},\"result\":\"方案赔率创建成功\"}', '::1', 1, '2026-06-22 06:29:47.968');
INSERT INTO `operation_log` VALUES (16, '客户报备', 'review', '{\"params\":{\"id\":\"2\"},\"body\":{\"status\":\"approved\"},\"result\":\"审核通过，客户已添加\"}', '::1', 1, '2026-06-22 06:42:40.214');
INSERT INTO `operation_log` VALUES (17, '话术管理', 'create', '{\"params\":{},\"body\":{\"id\":null,\"name\":\"风控\",\"parentId\":null,\"sortOrder\":0},\"result\":\"分类创建成功\"}', '::1', 1, '2026-06-22 06:46:53.874');
INSERT INTO `operation_log` VALUES (18, '话术管理', 'create', '{\"params\":{},\"body\":{\"id\":null,\"categoryId\":1,\"title\":\"话语1\",\"content\":\"别用xxx\",\"sortOrder\":0},\"result\":\"话术创建成功\"}', '::1', 1, '2026-06-22 06:47:14.660');
INSERT INTO `operation_log` VALUES (19, '合伙人管理', 'create', '{\"params\":{},\"body\":{\"name\":\"张三\",\"phone\":\"1234567890\",\"wechatId\":\"aaaaa\",\"directRate\":3,\"teamRate\":1,\"rateMode\":\"fixed\",\"tieredRates\":null},\"result\":\"合伙人创建成功\"}', '::1', 1, '2026-06-22 06:50:31.014');

-- ----------------------------
-- Table structure for partner
-- ----------------------------
DROP TABLE IF EXISTS `partner`;
CREATE TABLE `partner`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键ID，自增长',
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '合伙人姓名，合伙人的真实姓名或昵称',
  `wechat_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '微信号，合伙人的微信联系方式',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '手机号，合伙人的手机联系方式',
  `open_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '微信OpenID，微信授权登录的唯一标识',
  `invite_code` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '邀请码，合伙人的专属邀请码，用于邀请下级合伙人',
  `direct_rate` decimal(5, 2) NOT NULL DEFAULT 3.00 COMMENT '直推分润比例，合伙人直接邀请客户获得的佣金比例（%）',
  `team_rate` decimal(5, 2) NOT NULL DEFAULT 1.00 COMMENT '团队分润比例，合伙人从下级合伙人获得的团队佣金比例（%）',
  `rate_mode` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'fixed' COMMENT '分润模式：fixed-固定比例，tiered-阶梯比例',
  `tiered_rates` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '阶梯分润配置，阶梯模式的分润规则（JSON格式）',
  `balance` decimal(12, 2) NOT NULL COMMENT '可用余额，合伙人当前可提现的佣金余额',
  `total_earnings` decimal(12, 2) NOT NULL COMMENT '累计收益，合伙人历史累计获得的佣金总额',
  `status` int(0) NOT NULL DEFAULT 1 COMMENT '状态：1-正常，0-冻结，控制合伙人是否可登录和操作',
  `bound_at` datetime(3) NULL DEFAULT NULL COMMENT '绑定时间，微信授权绑定的时间',
  `parent_id` int(0) NULL DEFAULT NULL COMMENT '上级合伙人ID，合伙人的上级合伙人（二级分销）',
  `staff_id` int(0) NOT NULL COMMENT '员工ID，负责管理该合伙人的员工',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，合伙人注册的时间',
  `updated_at` datetime(3) NOT NULL COMMENT '更新时间，合伙人信息最后修改的时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `partner_invite_code_key`(`invite_code`) USING BTREE COMMENT '唯一索引：邀请码，确保每个合伙人邀请码唯一',
  UNIQUE INDEX `partner_open_id_key`(`open_id`) USING BTREE COMMENT '唯一索引：微信OpenID，确保每个微信只能绑定一个合伙人',
  INDEX `partner_staff_id_idx`(`staff_id`) USING BTREE COMMENT '索引：员工ID，用于查询某员工负责的所有合伙人',
  INDEX `partner_parent_id_idx`(`parent_id`) USING BTREE COMMENT '索引：上级合伙人ID，用于查询某合伙人的团队结构',
  INDEX `partner_invite_code_idx`(`invite_code`) USING BTREE COMMENT '索引：邀请码，用于快速查询邀请码对应的合伙人',
  CONSTRAINT `partner_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `partner` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `partner_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `sys_user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '合伙人信息表-存储合伙人基本信息、分润配置、收益数据等，是系统的核心用户表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of partner
-- ----------------------------
INSERT INTO `partner` VALUES (1, '董', '111', '18576293019', NULL, 'NNLoW44Eyk57', 3.00, 1.50, 'fixed', NULL, 600.00, 600.00, 1, NULL, NULL, 1, '2026-06-01 06:29:17.813', '2026-06-22 06:24:35.904');
INSERT INTO `partner` VALUES (2, '张三', 'aaaaa', '1234567890', NULL, 'wSCzQeW5MhUT', 3.00, 1.00, 'fixed', NULL, 0.00, 0.00, 1, NULL, NULL, 1, '2026-06-22 06:50:30.999', '2026-06-22 06:50:30.999');

-- ----------------------------
-- Table structure for qa_item
-- ----------------------------
DROP TABLE IF EXISTS `qa_item`;
CREATE TABLE `qa_item`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键ID，自增长',
  `question` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '问题内容，常见问题的描述',
  `answer` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '答案内容，问题的解答或说明',
  `sort_order` int(0) NOT NULL DEFAULT 0 COMMENT '排序顺序，问答显示的排序（数字越小越靠前）',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，问答创建的时间',
  `updated_at` datetime(3) NOT NULL COMMENT '更新时间，问答最后修改的时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '问答管理表-存储常见问题解答，用于合伙人客服支持和知识库管理' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of qa_item
-- ----------------------------
INSERT INTO `qa_item` VALUES (1, '这算不算诈骗', '111', 0, '2026-06-01 06:23:00.744', '2026-06-01 06:23:00.744');

-- ----------------------------
-- Table structure for risk_word
-- ----------------------------
DROP TABLE IF EXISTS `risk_word`;
CREATE TABLE `risk_word`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键ID，自增长',
  `bad_word` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '敏感词，需要过滤或替换的词汇',
  `good_word` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '替换词，敏感词的替换词汇',
  `sort_order` int(0) NOT NULL DEFAULT 0 COMMENT '排序顺序，风险词显示的排序（数字越小越靠前）',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，风险词配置创建的时间',
  `updated_at` datetime(3) NOT NULL COMMENT '更新时间，风险词配置最后修改的时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '风险词管理表-存储敏感词和替换词，用于内容审核和风险控制' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of risk_word
-- ----------------------------

-- ----------------------------
-- Table structure for script_category
-- ----------------------------
DROP TABLE IF EXISTS `script_category`;
CREATE TABLE `script_category`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键ID，自增长',
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类名称，话术分类的显示名称',
  `sort_order` int(0) NOT NULL DEFAULT 0 COMMENT '排序顺序，分类显示的排序（数字越小越靠前）',
  `parent_id` int(0) NULL DEFAULT NULL COMMENT '父分类ID，支持多级分类结构',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，分类创建的时间',
  `updated_at` datetime(3) NOT NULL COMMENT '更新时间，分类最后修改的时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `script_category_parent_id_idx`(`parent_id`) USING BTREE COMMENT '索引：父分类ID，用于查询某分类的子分类',
  CONSTRAINT `script_category_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `script_category` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '话术分类表-存储话术分类信息，用于话术内容的分类管理' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of script_category
-- ----------------------------
INSERT INTO `script_category` VALUES (1, '风控', 0, NULL, '2026-06-22 06:46:53.857', '2026-06-22 06:46:53.857');

-- ----------------------------
-- Table structure for script_content
-- ----------------------------
DROP TABLE IF EXISTS `script_content`;
CREATE TABLE `script_content`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键ID，自增长',
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '话术标题，话术的显示名称',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '话术内容，具体的话术文本',
  `sort_order` int(0) NOT NULL DEFAULT 0 COMMENT '排序顺序，话术显示的排序（数字越小越靠前）',
  `category_id` int(0) NOT NULL COMMENT '分类ID，话术所属的分类',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，话术创建的时间',
  `updated_at` datetime(3) NOT NULL COMMENT '更新时间，话术最后修改的时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `script_content_category_id_idx`(`category_id`) USING BTREE COMMENT '索引：分类ID，用于查询某分类下的所有话术',
  CONSTRAINT `script_content_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `script_category` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '话术内容表-存储具体的话术内容，用于合伙人沟通和销售支持' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of script_content
-- ----------------------------
INSERT INTO `script_content` VALUES (1, '话语1', '别用xxx', 0, 1, '2026-06-22 06:47:14.647', '2026-06-22 06:47:14.647');

-- ----------------------------
-- Table structure for settlement
-- ----------------------------
DROP TABLE IF EXISTS `settlement`;
CREATE TABLE `settlement`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键ID，自增长',
  `amount` decimal(12, 2) NOT NULL COMMENT '结算金额，本次结算的佣金金额',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '备注信息，结算说明或备注',
  `partner_id` int(0) NOT NULL COMMENT '合伙人ID，结算的合伙人',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，结算记录创建的时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `settlement_partner_id_idx`(`partner_id`) USING BTREE COMMENT '索引：合伙人ID，用于查询某合伙人的所有结算记录',
  CONSTRAINT `settlement_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partner` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '结算记录表-记录合伙人佣金结算和提现记录，跟踪结算状态' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of settlement
-- ----------------------------

-- ----------------------------
-- Table structure for sys_user
-- ----------------------------
DROP TABLE IF EXISTS `sys_user`;
CREATE TABLE `sys_user`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键ID，自增长',
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户名，登录账号',
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '密码，加密后的密码（bcrypt加密）',
  `real_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '真实姓名，用户的真实姓名或昵称',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '手机号，用户的手机联系方式',
  `role` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色：admin-管理员，staff-员工',
  `status` int(0) NOT NULL DEFAULT 1 COMMENT '状态：1-正常，0-禁用，控制用户是否可登录',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，账号创建的时间',
  `updated_at` datetime(3) NOT NULL COMMENT '更新时间，账号信息最后修改的时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `sys_user_username_key`(`username`) USING BTREE COMMENT '唯一索引：用户名，确保用户名唯一'
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '系统用户表-存储管理员和员工账号信息，管理后台用户权限' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of sys_user
-- ----------------------------
INSERT INTO `sys_user` VALUES (1, 'admin', '$2a$10$qDBknAH/ufVuhiehf.xbcObCIe07rPoYqDT1eapz6J60Jc9a/k1Zi', '超级管理员', '13800000000', 'admin', 1, '2026-06-01 05:31:03.761', '2026-06-01 05:31:03.761');
INSERT INTO `sys_user` VALUES (2, 'staff01', '$2a$10$a9JyjI4p0dLZF/jWUAkrROC2.ZeDBg2FgQ22M1asBK51HkcC41Vsy', '员工小王', '13800000001', 'staff', 1, '2026-06-08 06:16:23.783', '2026-06-08 06:16:23.783');
INSERT INTO `sys_user` VALUES (5, 'staff02', '$2a$10$qDBknAH/ufVuhiehf.xbcObCIe07rPoYqDT1eapz6J60Jc9a/k1Zi', '员工', '13800000001', 'staff', 1, '2026-06-03 14:20:37.000', '2026-06-08 14:20:35.000');

-- ----------------------------
-- Table structure for system_config
-- ----------------------------
DROP TABLE IF EXISTS `system_config`;
CREATE TABLE `system_config`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键ID，自增长',
  `config_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置键，配置参数的名称',
  `config_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置值，配置参数的值',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '配置说明，配置参数的用途说明',
  `updated_at` datetime(3) NOT NULL COMMENT '更新时间，配置参数最后修改的时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `system_config_config_key_key`(`config_key`) USING BTREE COMMENT '唯一索引：配置键，确保配置参数名称唯一'
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '系统配置表-存储系统全局配置参数，控制系统行为和默认值' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of system_config
-- ----------------------------
INSERT INTO `system_config` VALUES (1, 'default_direct_rate', '3.00', '默认直推分润比例(%)', '2026-06-08 06:16:23.809');
INSERT INTO `system_config` VALUES (2, 'default_team_rate', '1.00', '默认团队分润比例(%)', '2026-06-08 06:16:23.822');
INSERT INTO `system_config` VALUES (3, 'material_clean_days', '30', '素材自动清理天数', '2026-06-08 06:16:23.832');
INSERT INTO `system_config` VALUES (4, 'projection_base_amount', '100', '收益推演工具-起始金额', '2026-06-08 06:16:23.841');
INSERT INTO `system_config` VALUES (5, 'projection_default_coefficient', '1.98', '收益推演工具-默认收益系数', '2026-06-08 06:16:23.850');

-- ----------------------------
-- Table structure for transaction
-- ----------------------------
DROP TABLE IF EXISTS `transaction`;
CREATE TABLE `transaction`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键ID，自增长',
  `amount` decimal(12, 2) NOT NULL COMMENT '交易金额，客户的投注或投资金额',
  `order_date` date NOT NULL COMMENT '交易日期，交易发生的日期',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '备注信息，交易说明或备注',
  `plan` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '方案名称，交易对应的投注方案',
  `return_amount` decimal(12, 2) NULL DEFAULT NULL COMMENT '回流金额，客户的中奖返还金额（如有）',
  `is_archived` int(0) NOT NULL DEFAULT 0 COMMENT '归档状态：0-未归档，1-已归档，已归档的交易不参与佣金计算',
  `customer_id` int(0) NOT NULL COMMENT '客户ID，交易所属的客户',
  `operator_id` int(0) NOT NULL COMMENT '操作员ID，录入交易的管理员或员工',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，交易记录创建的时间',
  `updated_at` datetime(3) NOT NULL COMMENT '更新时间，交易记录最后修改的时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `transaction_customer_id_idx`(`customer_id`) USING BTREE COMMENT '索引：客户ID，用于查询某客户的所有交易',
  INDEX `transaction_operator_id_idx`(`operator_id`) USING BTREE COMMENT '索引：操作员ID，用于查询某操作员录入的所有交易',
  INDEX `transaction_order_date_idx`(`order_date`) USING BTREE COMMENT '索引：交易日期，用于按日期查询交易记录',
  INDEX `transaction_is_archived_idx`(`is_archived`) USING BTREE COMMENT '索引：归档状态，用于筛选未归档/已归档交易',
  CONSTRAINT `transaction_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `transaction_operator_id_fkey` FOREIGN KEY (`operator_id`) REFERENCES `sys_user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '交易流水表-记录客户交易流水，是佣金计算的数据来源' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of transaction
-- ----------------------------
INSERT INTO `transaction` VALUES (3, 10000.00, '2026-06-22', NULL, '3', 20000.00, 0, 1, 1, '2026-06-22 06:21:59.196', '2026-06-22 06:21:59.196');
INSERT INTO `transaction` VALUES (4, 10000.00, '2026-06-22', NULL, '4', NULL, 0, 1, 1, '2026-06-22 06:24:35.892', '2026-06-22 06:24:35.892');

SET FOREIGN_KEY_CHECKS = 1;
