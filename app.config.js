const appJson = require('./app.json');

module.exports = () => {
  const baseConfig = appJson.expo ?? {};
  const existingExtra = baseConfig.extra ?? {};
  const existingEas = existingExtra.eas ?? {};
  const projectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    process.env.EAS_PROJECT_ID ||
    existingEas.projectId;

  return {
    ...baseConfig,
    extra: {
      ...existingExtra,
      eas: projectId
        ? {
            ...existingEas,
            projectId,
          }
        : existingEas,
    },
  };
};
