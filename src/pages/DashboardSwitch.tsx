import React, { useState } from 'react';
import Dashboard from './Dashboard';
import DashboardLegacy from './DashboardLegacy';

// TEMPORARY rollout switch: the new dashboard (bottom nav) is the default;
// opening a dashboard link with ?ui=old falls back to the previous one (tabs on
// top), ?ui=new goes back. The choice is remembered in this browser.
// Once the new dashboard has proven itself, delete DashboardLegacy and this switch.
const UI_KEY = 'dashboard_ui';
const DEFAULT_UI: 'new' | 'old' = 'new';

function resolveUi(): 'new' | 'old' {
  const param = new URLSearchParams(window.location.search).get('ui');
  try {
    if (param === 'new' || param === 'old') localStorage.setItem(UI_KEY, param);
    const stored = localStorage.getItem(UI_KEY);
    return stored === 'new' || stored === 'old' ? stored : DEFAULT_UI;
  } catch {
    // Storage blocked (private mode): honour the URL param for this visit only
    return param === 'new' || param === 'old' ? param : DEFAULT_UI;
  }
}

const DashboardSwitch: React.FC = () => {
  const [ui] = useState(resolveUi);
  return ui === 'new' ? <Dashboard /> : <DashboardLegacy />;
};

export default DashboardSwitch;
