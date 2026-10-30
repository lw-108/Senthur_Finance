module.exports = {
  Platform: {
    OS: 'ios',
    select: (objs) => objs.ios || objs.default,
  },
  StyleSheet: {
    create: (styles) => styles,
    absoluteFill: {},
  },
  Dimensions: {
    get: () => ({ width: 375, height: 812 }),
  },
};
