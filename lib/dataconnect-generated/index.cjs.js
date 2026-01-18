const { queryRef, executeQuery, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'mep-connector',
  service: 'mep-v2',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

const getUserConstellationRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'getUserConstellation', inputVars);
}
getUserConstellationRef.operationName = 'getUserConstellation';
exports.getUserConstellationRef = getUserConstellationRef;

exports.getUserConstellation = function getUserConstellation(dcOrVars, vars) {
  return executeQuery(getUserConstellationRef(dcOrVars, vars));
};

const getLessonDetailsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'getLessonDetails', inputVars);
}
getLessonDetailsRef.operationName = 'getLessonDetails';
exports.getLessonDetailsRef = getLessonDetailsRef;

exports.getLessonDetails = function getLessonDetails(dcOrVars, vars) {
  return executeQuery(getLessonDetailsRef(dcOrVars, vars));
};
