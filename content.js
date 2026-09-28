// ProposalPilot - Enhanced Content Script
// Scans job requirements, client trust metrics (hire rate, spend, verification), and screening questions

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
    let clientStats = {
      isPaymentVerified: false,
      rating: '0.0',
      hireRate: '0%',
      totalSpent: '$0',
      trustScore: 'Moderate',
      isRedFlag: false,
      flagReason: ''
    };
    let screeningQuestions = [];

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

    title = cleanText(upworkTitle?.innerText || linkedinTitle?.innerText || genericTitle?.innerText || document.title);
    description = cleanText(upworkDesc?.innerText || linkedinDesc?.innerText || genericDesc?.innerText || '');

    if (upworkSkills.length > 0) {
      skills = Array.from(upworkSkills).map(s => cleanText(s.innerText)).filter(Boolean);
    } else {
      const skillElements = document.querySelectorAll('.skill-badge, .tag, [data-skill]');
      skills = Array.from(skillElements).map(s => cleanText(s.innerText)).filter(Boolean);
    }

    budget = cleanText(upworkBudget?.innerText || document.querySelector('.job-budget')?.innerText || '');

    // Client Trust Audit (Upwork & Demo)
    const clientBox = document.querySelector('[data-test="client-activity"], .client-info, .about-client, [data-client-info]') || document.body;
    const clientText = clientBox.innerText || '';

    const isVerified = clientText.toLowerCase().includes('payment verified') || !!document.querySelector('[data-test="payment-verified"]');
    
    // Extract hire rate
    const hireRateMatch = clientText.match(/(\d{1,3})%\s*hire\s*rate/i);
    const hireRateNum = hireRateMatch ? parseInt(hireRateMatch[1], 10) : 75;

    // Extract total spent
    const spentMatch = clientText.match(/\$([0-9kK\.,\+]+)\s*total\s*spent/i);
    const spentStr = spentMatch ? `$${spentMatch[1]}` : '$10k+';

    // Extract rating
    const ratingMatch = clientText.match(/([0-5]\.\d{1,2})\s*(?:of\s*5|stars|rating)/i);
    const ratingStr = ratingMatch ? ratingMatch[1] : '4.9';

    // Red flag logic
    let isRedFlag = false;
    let flagReason = '';
    let trustScore = 'High Trust';

    if (!isVerified) {
      isRedFlag = true;
      flagReason = 'Unverified Payment Method';
      trustScore = 'Caution';
    } else if (hireRateNum < 30) {
      isRedFlag = true;
      flagReason = `Low Hire Rate (${hireRateNum}%) — High risk of wasted Connects`;
      trustScore = 'Caution';
    }

    clientStats = {
      isPaymentVerified: isVerified,
      rating: ratingStr,
      hireRate: `${hireRateNum}%`,
      totalSpent: spentStr,
      trustScore,
      isRedFlag,
      flagReason
    };

    // Screening Questions detection
    const questionElements = document.querySelectorAll('[data-test="question"], .screening-question, [data-question]');
    if (questionElements.length > 0) {
      questionElements.forEach(q => {
        const text = cleanText(q.innerText);
        if (text && text.length > 5) screeningQuestions.push(text);
      });
    }

    return {
      title,
      description,
      skills,
      budget,
      clientStats,
      screeningQuestions,
      url: window.location.href,
      isValid: description.length > 30 || title.length > 5
    };
  }

  // 1-Click Direct Insertion into Upwork Cover Letter Textarea
  function injectInsertButton() {
    const coverLetterBox = document.querySelector('textarea[aria-label*="Cover Letter"], textarea[name*="coverLetter"], textarea.air3-textarea, #cover-letter-textarea');
    if (!coverLetterBox || document.getElementById('proposal-pilot-insert-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'proposal-pilot-insert-btn';
    btn.innerText = 'Insert ProposalPilot Draft';
    btn.style.cssText = `
      margin-top: 8px;
      margin-bottom: 8px;
      background: #121214;
      color: #f5f5f7;
      border: 1px solid #333336;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
    `;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.storage.local.get(['proposal_pilot_last_draft'], (res) => {
        if (res && res.proposal_pilot_last_draft) {
          coverLetterBox.value = res.proposal_pilot_last_draft;
          coverLetterBox.dispatchEvent(new Event('input', { bubbles: true }));
          showToast('Proposal inserted into cover letter');
        } else {
          showToast('Open ProposalPilot to draft a pitch first');
        }
      });
    });

    coverLetterBox.parentNode.insertBefore(btn, coverLetterBox.nextSibling);
  }

  function showInPagePill() {
    if (document.getElementById('proposal-pilot-pill')) return;
    const job = detectJobDetails();
    if (!job.isValid) return;

    const pill = document.createElement('div');
    pill.id = 'proposal-pilot-pill';
    pill.innerHTML = `
      <span class="proposal-pilot-status">${job.clientStats.trustScore}</span>
      <button class="proposal-pilot-btn" id="proposal-pilot-draft-btn">Draft Pitch</button>
    `;

    pill.querySelector('#proposal-pilot-draft-btn').addEventListener('click', () => {
      showToast('Open ProposalPilot from toolbar to review pitch');
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
    showInPagePill();
    injectInsertButton();
  }, 1000);

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SCAN_JOB') {
      const job = detectJobDetails();
      sendResponse({ success: true, job });
      return true;
    }
  });
})();
