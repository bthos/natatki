/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

// #region agent log
try {
  fetch('http://127.0.0.1:7245/ingest/a9c7a28d-4ab4-49fd-a383-1feb72e20337',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.js:9',message:'index.js entry point called',data:{appName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
} catch(e) {}
// #endregion

// #region agent log
try {
  fetch('http://127.0.0.1:7245/ingest/a9c7a28d-4ab4-49fd-a383-1feb72e20337',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.js:12',message:'Registering component',data:{appName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
} catch(e) {}
// #endregion
AppRegistry.registerComponent(appName, () => App);
// #region agent log
try {
  fetch('http://127.0.0.1:7245/ingest/a9c7a28d-4ab4-49fd-a383-1feb72e20337',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.js:14',message:'Component registered successfully',data:{appName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
} catch(e) {}
// #endregion

