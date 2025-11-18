const {
  createState,
  tickState,
  buildSnapshot
} = require('../../shared/dataEngine');

const state = createState();

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store'
};

exports.handler = async () => {
  // Advance the simulator so each invocation returns fresh data
  tickState(state);
  const snapshot = buildSnapshot(state);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(snapshot)
  };
};

