// ProposalPilot - Content Script
// Detects and parses Upwork, LinkedIn, and general freelance job postings

(function () {
  function cleanText(txt) {
    if (!txt) return '';
    return txt.replace(/\s+/g, ' ').trim();
  }

  function detectJobDetails() {
    let title = '';
    let description = '';
    let skills = [];
    let budget = '';

    // Upwork Job Page Selectors
    const upworkTitle = document.querySelector('header h1, h1.job-title, [data-test="job-title"], h4[data-test="job-title"]');
    const upworkDesc = document.querySelector('[data-test="JobDescription"], .job-description, .air3-line-clamp, [data-test="job-description-text"]');
    const upworkSkills = document.querySelectorAll('[data-test="Skill"], span.air3-token, .skills-list span');
    const upworkBudget = document.querySelector('[data-test="BudgetAmount"], [data-test="HourlyRate"], .budget');

    // LinkedIn Job Page Selectors
    const linkedinTitle = document.querySelector('.job-details-jobs-unified-top-card__job-title, h1.t-24');
    const linkedinDesc = document.querySelector('.jobs-description-content__text, #job-details');

    // Generic / Demo grounds
    const genericTitle = document.querySelector('h1, h2.job-title, .job-heading');
    const genericDesc = document.querySelector('.job-description, .post-body, article');

    // Assign detected fields
    title = cleanText(upworkTitle?.innerText || linkedinTitle?.innerText || genericTitle?.innerText || document.title);
    description = cleanText(upworkDesc?.innerText || linkedinDesc?.innerText || genericDesc?.innerText || '');

    if (upworkSkills.length > 0) {
      skills = Array.from(upworkSkills).map(s => cleanText(s.innerText)).filter(Boolean);
    } else {
      const skillElements = document.querySelectorAll('.skill-badge, .tag, [data-skill]');
      skills = Array.from(skillElements).map(s => cleanText(s.innerText)).filter(Boolean);
    }

    budget = cleanText(upworkBudget?.innerText || document.querySelector('.job-budget')?.innerText || '');

    return {
      title,
      description,
      skills,
      budget,
      url: window.location.href,
      isValid: description.length > 30 || title.length > 5
    };
  }

  function showInPagePill() {
    if (document.getElementById('proposal-pilot-pill')) return;
    const job = detectJobDetails();
    if (!job.isValid) return;

    const pill = document.createElement('div');
    pill.id = 'proposal-pilot-pill';
    pill.innerHTML = `
      <span class="proposal-pilot-status">Job Detected</span>
      <button class="proposal-pilot-btn" id="proposal-pilot-draft-btn">Draft Proposal</button>
    `;

    pill.querySelector('#proposal-pilot-draft-btn').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP_FOR_JOB' });
      showToast('Proposal ready. Open ProposalPilot from toolbar.');
    });

    document.body.appendChild(pill);
  }

  function showToast(message) {
    const existing = document.getElementById('proposal-pilot-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'proposal-pilot-toast';
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        setTimeout(() => toast.remove(), 250);
      }
    }, 2400);
  }

  setTimeout(() => {
    if (window.location.hostname.includes('upwork.com') || window.location.hostname.includes('linkedin.com')) {
      showInPagePill();
    }
  }, 1000);

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SCAN_JOB') {
      const job = detectJobDetails();
      sendResponse({ success: true, job });
      return true;
    }
  });
})();
