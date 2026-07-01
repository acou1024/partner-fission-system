from PIL import Image, ImageDraw, ImageFont
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "项目知识图谱.png"


def font(size, bold=False):
    candidates = [
        r"C:\Windows\Fonts\msyhbd.ttc" if bold else r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\simhei.ttf",
        r"C:\Windows\Fonts\simsun.ttc",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


W, H = 2400, 1550
img = Image.new("RGB", (W, H), "#f6f8fb")
draw = ImageDraw.Draw(img)

title_font = font(58, True)
subtitle_font = font(28)
section_font = font(34, True)
node_font = font(27, True)
small_font = font(22)
tiny_font = font(19)


def text_size(text, f):
    box = draw.textbbox((0, 0), text, font=f)
    return box[2] - box[0], box[3] - box[1]


def rounded_rect(xy, fill, outline=None, radius=28, width=3):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def center_text(xy, lines, fill="#18202b", f=None, line_gap=8):
    if isinstance(lines, str):
        lines = [lines]
    f = f or node_font
    x1, y1, x2, y2 = xy
    sizes = [text_size(line, f if idx == 0 else small_font) for idx, line in enumerate(lines)]
    total_h = sum(h for _, h in sizes) + line_gap * (len(lines) - 1)
    y = y1 + (y2 - y1 - total_h) / 2
    for idx, line in enumerate(lines):
        use_font = f if idx == 0 else small_font
        tw, th = text_size(line, use_font)
        draw.text((x1 + (x2 - x1 - tw) / 2, y), line, font=use_font, fill=fill)
        y += th + line_gap


def node(x, y, w, h, title, desc, fill, outline):
    xy = (x, y, x + w, y + h)
    rounded_rect(xy, fill=fill, outline=outline)
    center_text(xy, [title, desc], fill="#18202b", f=node_font)
    return xy


def arrow(start, end, color="#64748b", width=5, label=None, label_offset=(0, 0)):
    draw.line((start, end), fill=color, width=width)
    sx, sy = start
    ex, ey = end
    import math

    angle = math.atan2(ey - sy, ex - sx)
    length = 22
    spread = 0.45
    p1 = (
        ex - length * math.cos(angle - spread),
        ey - length * math.sin(angle - spread),
    )
    p2 = (
        ex - length * math.cos(angle + spread),
        ey - length * math.sin(angle + spread),
    )
    draw.polygon([end, p1, p2], fill=color)
    if label:
        mx = (sx + ex) / 2 + label_offset[0]
        my = (sy + ey) / 2 + label_offset[1]
        tw, th = text_size(label, tiny_font)
        pad = 10
        rounded_rect((mx - tw / 2 - pad, my - th / 2 - pad, mx + tw / 2 + pad, my + th / 2 + pad), "#ffffff", "#dbe3ee", 12, 2)
        draw.text((mx - tw / 2, my - th / 2), label, font=tiny_font, fill="#475569")


draw.text((90, 54), "私域合伙人裂变与分销核算系统 · 项目知识图谱", font=title_font, fill="#111827")
draw.text(
    (94, 128),
    "从角色入口到业务闭环：合伙人邀请客户，后台录入流水，系统计算回流、佣金、结算与运营数据",
    font=subtitle_font,
    fill="#526174",
)

sections = [
    ("用户入口", 90, 220, 520, 1120, "#eaf2ff"),
    ("前端页面", 650, 220, 520, 1120, "#eefcf6"),
    ("后端接口", 1210, 220, 520, 1120, "#fff7e8"),
    ("数据与计算", 1770, 220, 540, 1120, "#f4efff"),
]
for title, x, y, w, h, color in sections:
    rounded_rect((x, y, x + w, y + h), fill=color, outline="#d8e0ea", radius=36, width=3)
    draw.text((x + 32, y + 28), title, font=section_font, fill="#1f2937")

admin = node(150, 330, 400, 120, "管理员 / 员工", "登录后台，管理业务与财务", "#dbeafe", "#60a5fa")
partner = node(150, 540, 400, 120, "合伙人", "移动端查看客户、团队、收益", "#dcfce7", "#22c55e")
customer = node(150, 750, 400, 120, "客户", "扫码加入，查看个人流水", "#fee2e2", "#fb7185")

admin_ui = node(710, 300, 400, 120, "管理后台", "数据大盘、合伙人、客户、流水", "#d1fae5", "#10b981")
finance_ui = node(710, 500, 400, 120, "财务管理", "流水录入、客户盈利、结算", "#ccfbf1", "#14b8a6")
knowledge_ui = node(710, 700, 400, 120, "知识库与系统", "素材、话术、风控、员工、域名", "#dcfce7", "#22c55e")
mobile_ui = node(710, 940, 400, 120, "合伙人 H5", "工作台、客户、团队、佣金", "#ecfccb", "#84cc16")
invite_ui = node(710, 1135, 400, 120, "邀请 / 客户页", "邀请码绑定、客户加入、客户查账", "#fef9c3", "#eab308")

auth_api = node(1270, 300, 400, 120, "认证接口", "/api/auth · 登录与鉴权", "#ffedd5", "#fb923c")
admin_api = node(1270, 500, 400, 120, "后台接口", "/api/admin · 管理业务数据", "#fed7aa", "#f97316")
mobile_api = node(1270, 700, 400, 120, "移动端接口", "/api/mobile · 合伙人数据", "#fde68a", "#f59e0b")
invite_api = node(1270, 900, 400, 120, "邀请接口", "/api/invite · 注册与查账", "#fef3c7", "#eab308")

models = node(1835, 285, 410, 120, "核心数据模型", "Partner / Customer / Transaction", "#ede9fe", "#8b5cf6")
commission = node(1835, 470, 410, 120, "佣金计算", "流水金额 × 合伙人分润规则", "#ddd6fe", "#7c3aed")
profit = node(1835, 655, 410, 150, "客户回流与盈亏", "实际回流优先；否则金额 × 当天方案赔率", "#e9d5ff", "#a855f7")
settlement = node(1835, 875, 410, 120, "结算管理", "生成结算记录，扣减余额", "#f3e8ff", "#9333ea")
ops = node(1835, 1060, 410, 150, "运营支撑", "素材、话术、风控、日志、域名", "#fae8ff", "#d946ef")

arrow((550, 390), (710, 360), label="进入后台")
arrow((550, 600), (710, 1000), label="使用 H5")
arrow((550, 810), (710, 1195), label="扫码加入")
arrow((1110, 360), (1270, 360), label="登录")
arrow((1110, 560), (1270, 560), label="业务请求")
arrow((1110, 1000), (1270, 760), label="合伙人数据")
arrow((1110, 1195), (1270, 960), label="客户注册/查账")
arrow((1670, 560), (1835, 345), label="读写")
arrow((1670, 560), (1835, 530), label="录入流水")
arrow((1670, 560), (1835, 730), label="客户盈利")
arrow((1670, 760), (1835, 1125), label="查看素材话术")
arrow((1670, 960), (1835, 345), label="绑定客户")
arrow((2040, 405), (2040, 470), label="流水触发", label_offset=(90, 0))
arrow((2040, 590), (2040, 655), label="统计回流", label_offset=(90, 0))
arrow((2040, 805), (2040, 875), label="进入结算", label_offset=(90, 0))

rounded_rect((140, 1365, 2260, 1470), fill="#ffffff", outline="#d8e0ea", radius=30, width=3)
draw.text((180, 1392), "答辩主线：客户扫码进入系统 → 合伙人沉淀客户 → 后台录入流水 → 自动算佣金与客户盈亏 → 后台结算和运营分析", font=section_font, fill="#111827")

img.save(OUT)
print(str(OUT))
