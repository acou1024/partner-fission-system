const dayjs = require('dayjs');

const formatSchemeDate = (date) => dayjs(date).format('YYYY-MM-DD');

// 赔率按天生效，统一转成 UTC 零点，避免本地时区导致日期错位。
const normalizeSchemeDate = (date) => new Date(`${formatSchemeDate(date)}T00:00:00.000Z`);

const buildSchemeOddsKey = (name, date) => {
  return `${String(name || '').trim().toLowerCase()}__${formatSchemeDate(date)}`;
};

const getSchemeOddsFromMap = (oddsMap, date, name) => {
  return oddsMap.get(buildSchemeOddsKey(name, date));
};

const loadSchemeOddsMap = async (prisma, dates = []) => {
  const uniqueDates = [...new Set(
    dates
      .filter(Boolean)
      .map((item) => formatSchemeDate(item))
  )];

  if (uniqueDates.length === 0) {
    return new Map();
  }

  const records = await prisma.bettingScheme.findMany({
    where: {
      status: 1,
      effectiveDate: {
        in: uniqueDates.map((item) => normalizeSchemeDate(item)),
      },
    },
    select: {
      name: true,
      odds: true,
      effectiveDate: true,
    },
  });

  const oddsMap = new Map();
  records.forEach((record) => {
    oddsMap.set(
      buildSchemeOddsKey(record.name, record.effectiveDate),
      Number(record.odds)
    );
  });

  return oddsMap;
};

module.exports = {
  normalizeSchemeDate,
  formatSchemeDate,
  buildSchemeOddsKey,
  getSchemeOddsFromMap,
  loadSchemeOddsMap,
};
