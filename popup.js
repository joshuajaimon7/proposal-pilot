// ProposalPilot - Popup Controller
// Intelligent pitch generation, tone adaptation, profile customization, license validation

document.addEventListener('DOMContentLoaded', async () => {
  const statusBar = document.getElementById('statusBar');
  const statusText = document.getElementById('statusText');
  const emptyState = document.getElementById('emptyState');
  const jobView = document.getElementById('jobView');
  const jobTitle = document.getElementById('jobTitle');
  const jobBudget = document.getElementById('jobBudget');
  const skillsRow = document.getElementById('skillsRow');
  const proposalOutput = document.getElementById('proposalOutput');
  const wordCount = document.getElementById('wordCount');
  const openDemoBtn = document.getElementById('openDemoBtn');

  // Action buttons
  const copyProposalBtn = document.getElementById('copyProposalBtn');
  const regenerateBtn = document.getElementById('regenerateBtn');
  const profileSettingsBtn = document.getElementById('profileSettingsBtn');

  // Settings Modal
  const settingsModal = document.getElementById('settingsModal');
  const settingsCloseBtn = document.getElementById('settingsCloseBtn');
  const settingName = document.getElementById('settingName');
  const settingRole = document.getElementById('settingRole');
  const settingPortfolio = document.getElementById('settingPortfolio');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');

  // Upgrade Modal
  const upgradeBtn = document.getElementById('upgradeBtn');
  const proUpgradeLink = document.getElementById('proUpgradeLink');
  const upgradeModal = document.getElementById('upgradeModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const startCheckoutBtn = document.getElementById('startCheckoutBtn');
  const proHeaderBadge = document.getElementById('proHeaderBadge');
  const footerBanner = document.getElementById('footerBanner');
  const licenseKeyInput = document.getElementById('licenseKeyInput');
  const activateKeyBtn = document.getElementById('activateKeyBtn');
  const licenseStatus = document.getElementById('licenseStatus');

  let activeJob = null;
  let currentTone = 'concise'; // 'concise' | 'technical' | 'results'
  let userProfile = { name: '', role: '', portfolio: '' };
  let isProUser = false;
  let dailyUsageCount = 0;
  const DAILY_FREE_LIMIT = 3;

  // Load storage: Pro status, profile, usage
  if (chrome.storage && chrome.storage.local) {
    const data = await chrome.storage.local.get([
      'proposal_pilot_is_pro',
      'proposal_pilot_profile',
      'proposal_pilot_daily'
    ]);

    isProUser = !!data.proposal_pilot_is_pro;
    if (data.proposal_pilot_profile) {
      userProfile = data.proposal_pilot_profile;
      settingName.value = userProfile.name || '';
      settingRole.value = userProfile.role || '';
      settingPortfolio.value = userProfile.portfolio || '';
    }

    const todayKey = new Date().toISOString().slice(0, 10);
    if (data.proposal_pilot_daily && data.proposal_pilot_daily.date === todayKey) {
      dailyUsageCount = data.proposal_pilot_daily.count || 0;
    }

    if (isProUser) {
      proHeaderBadge.innerText = 'PRO ACTIVE';
      upgradeBtn.style.display = 'none';
      footerBanner.innerHTML = '<span>Pro License Active</span>';
    }
  }

  function showUpgrade() { upgradeModal.style.display = 'flex'; }
  function hideUpgrade() { upgradeModal.style.display = 'none'; }
  upgradeBtn.addEventListener('click', showUpgrade);
  proUpgradeLink.addEventListener('click', (e) => { e.preventDefault(); showUpgrade(); });
  modalCloseBtn.addEventListener('click', hideUpgrade);

  // Buy License
  startCheckoutBtn.addEventListener('click', () => {
    if (confirm('Simulate purchasing ProposalPilot Pro lifetime license?')) {
      chrome.storage.local.set({ proposal_pilot_is_pro: true }, () => {
        alert('ProposalPilot Pro license activated.');
        location.reload();
      });
    }
  });

  // Activate Key
  activateKeyBtn.addEventListener('click', () => {
    const key = (licenseKeyInput.value || '').trim();
    if (key.length < 5) {
      licenseStatus.style.color = '#fca5a5';
      licenseStatus.innerText = 'Please enter a valid license key.';
      return;
    }
    chrome.storage.local.set({ proposal_pilot_is_pro: true, proposal_pilot_key: key }, () => {
      licenseStatus.style.color = '#6ee7b7';
      licenseStatus.innerText = 'License activated successfully.';
      setTimeout(() => location.reload(), 700);
    });
  });

  // Settings Handlers
  profileSettingsBtn.addEventListener('click', () => { settingsModal.style.display = 'flex'; });
  settingsCloseBtn.addEventListener('click', () => { settingsModal.style.display = 'none'; });
  saveSettingsBtn.addEventListener('click', () => {
    userProfile = {
      name: settingName.value.trim(),
      role: settingRole.value.trim(),
      portfolio: settingPortfolio.value.trim()
    };
    chrome.storage.local.set({ proposal_pilot_profile: userProfile }, () => {
      settingsModal.style.display = 'none';
      if (activeJob) generatePitch(activeJob, currentTone);
    });
  });

  openDemoBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('demo-test.html') });
  });

  // Proposal Generation Algorithm
  function generatePitch(job, tone) {
    if (!job) return;

    if (!isProUser && dailyUsageCount >= DAILY_FREE_LIMIT) {
      showUpgrade();
      return;
    }

    const title = job.title || 'your project';
    const primarySkill = job.skills && job.skills.length > 0 ? job.skills[0] : 'this stack';
    const signer = userProfile.name ? `\n\nBest,\n${userProfile.name}${userProfile.role ? ` (${userProfile.role})` : ''}` : '';
    const portfolioLine = userProfile.portfolio ? `\nYou can review relevant work here: ${userProfile.portfolio}` : '';

    let draft = '';

    if (tone === 'concise') {
      draft = `Hi there,\n\nI reviewed your requirements for ${title}. I have direct experience building with ${primarySkill} and can step in immediately to deliver clean, production-ready work without handholding.\n\n• Clear timeline & daily milestone updates\n• Clean, documented code tested for edge cases\n• Direct communication via your preferred tool\n${portfolioLine}\n\nLet me know if you'd like to discuss the next steps.\n${signer}`;
    } else if (tone === 'technical') {
      draft = `Hi,\n\nRegarding ${title}: my focus is on modular architecture, strict typing, and high performance with ${primarySkill}.\n\nHere is how I would structure this:\n1. Audit existing requirements & finalize data models\n2. Implement core business logic with automated test coverage\n3. Deliver clean, maintainable documentation for easy handoff\n${portfolioLine}\n\nI can start this week. Available for a technical walkthrough whenever you're ready.\n${signer}`;
    } else if (tone === 'results') {
      draft = `Hi,\n\nI saw your post for ${title} and understand the priority is fast, reliable execution with zero back-and-forth friction.\n\nI specialize in ${primarySkill} with an emphasis on high turnaround and measurable delivery:\n• Fast kickoff within 24 hours\n• Complete solution built to scale\n• Dedicated post-delivery support included\n${portfolioLine}\n\nWould love to hear more about your target deadline.\n${signer}`;
    }

    proposalOutput.value = draft.trim();
    updateWordCount();

    // Increment daily usage
    if (!isProUser) {
      dailyUsageCount++;
      const todayKey = new Date().toISOString().slice(0, 10);
      chrome.storage.local.set({
        proposal_pilot_daily: { date: todayKey, count: dailyUsageCount }
      });
    }
  }

  function updateWordCount() {
    const text = proposalOutput.value.trim();
    const count = text ? text.split(/\s+/).length : 0;
    wordCount.innerText = `${count} words`;
  }

  proposalOutput.addEventListener('input', updateWordCount);

  // Tone Tabs
  document.querySelectorAll('.tone-tab').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('.tone-tab').forEach(b => b.classList.remove('active'));
      tabBtn.classList.add('active');
      currentTone = tabBtn.getAttribute('data-tone');
      generatePitch(activeJob, currentTone);
    });
  });

  regenerateBtn.addEventListener('click', () => {
    if (activeJob) generatePitch(activeJob, currentTone);
  });

  copyProposalBtn.addEventListener('click', () => {
    const text = proposalOutput.value;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const orig = copyProposalBtn.innerHTML;
      copyProposalBtn.innerHTML = '<span>Copied</span>';
      setTimeout(() => copyProposalBtn.innerHTML = orig, 1600);
    });
  });

  // Query Active Tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    statusText.innerText = 'Cannot access current tab.';
    emptyState.style.display = 'block';
    return;
  }

  function requestScan() {
    chrome.tabs.sendMessage(tab.id, { type: 'SCAN_JOB' }, (res) => {
      if (chrome.runtime.lastError || !res || !res.job || !res.job.isValid) {
        statusText.innerText = 'No job post found on this page.';
        emptyState.style.display = 'block';
        return;
      }

      activeJob = res.job;
      jobTitle.innerText = activeJob.title;
      jobBudget.innerText = activeJob.budget || '';

      skillsRow.innerHTML = '';
      if (activeJob.skills && activeJob.skills.length > 0) {
        activeJob.skills.slice(0, 4).forEach(s => {
          const pill = document.createElement('span');
          pill.className = 'skill-pill';
          pill.innerText = s;
          skillsRow.appendChild(pill);
        });
      }

      statusText.innerText = 'Job details detected';
      emptyState.style.display = 'none';
      jobView.style.display = 'flex';
      generatePitch(activeJob, currentTone);
    });
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['content.css']
    });
    requestScan();
  } catch (err) {
    requestScan();
  }
});
