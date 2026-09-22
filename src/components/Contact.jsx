import React from 'react';

export default function Contact() {
  return (
    <section className="self contact-page" aria-labelledby="contact-title">
      <div className="contact-details glass-effect">
        <h1 id="contact-title">Contact Me</h1>
        <div className="contact-list">
          <a href="mailto:theodorez888@gmail.com?subject=Hey%20Theodore!">
            <img src="/contact/gmail_logo.png" alt="" className="contact-icon-invert" />
            <span><small>Email</small>theodorez888@gmail.com</span>
          </a>
          <a href="https://github.com/FowlFarmer" target="_blank" rel="noopener noreferrer">
            <img src="/contact/gh_logo.png" alt="" className="contact-icon-invert" />
            <span><small>GitHub</small>FowlFarmer</span>
          </a>
          <a href="https://www.linkedin.com/in/zhutheodore" target="_blank" rel="noopener noreferrer">
            <span className="contact-linkedin-icon" aria-hidden="true">in</span>
            <span><small>LinkedIn</small>Theodore Zhu</span>
          </a>
          <div>
            <img src="/contact/discord_logo.png" alt="" />
            <span><small>Discord</small>zhong.li</span>
          </div>
        </div>
      </div>
      <div className="contact-resume">
        <a className="rounded-button resume-download" href="/downloads/resume_theodore.pdf" download="resume_theodore.pdf">Download résumé <span aria-hidden="true">↓</span></a>
        <a href="/downloads/resume_theodore.pdf" aria-label="Open Theodore Zhu’s résumé PDF">
          <img src="/downloads/resume_theodore.png" alt="Theodore Zhu’s résumé" width="850" height="1100" />
        </a>
      </div>
    </section>
  );
}
