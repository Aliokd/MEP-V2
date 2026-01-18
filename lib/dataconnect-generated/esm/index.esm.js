import { queryRef, executeQuery, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'mep-connector',
  service: 'mep-v2',
  location: 'us-central1'
};

export const getUserConstellationRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'getUserConstellation', inputVars);
}
getUserConstellationRef.operationName = 'getUserConstellation';

export function getUserConstellation(dcOrVars, vars) {
  return executeQuery(getUserConstellationRef(dcOrVars, vars));
}

export const getLessonDetailsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'getLessonDetails', inputVars);
}
getLessonDetailsRef.operationName = 'getLessonDetails';

export function getLessonDetails(dcOrVars, vars) {
  return executeQuery(getLessonDetailsRef(dcOrVars, vars));
}

