/**
 * Video Chapters v1.1.2 – lightweight runtime
 * (c) Made by Dave Group Ltd
 * https://github.com/madebydave/video-chapters
 *
 * Usage:
 *   <script src="video-chapters.js"></script>
 *   <script>
 *     VideoChapters({ slug: '/my-page', chapters: [...], ... });
 *   </script>
 */
;(function (root) {
  'use strict';

  // ── Helpers ──────────────────────────────────────────────────────
  function timeToSeconds(t) {
    if (!t) return 0;
    var p = t.split(':').map(Number);
    if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
    if (p.length === 2) return p[0] * 60 + p[1];
    return p[0] || 0;
  }

  function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // ── Defaults ────────────────────────────────────────────────────
  var DEFAULTS = {
    slug: '',
    mode: 'popup',         // 'popup' | 'inline'
    position: 'below',     // 'below' | 'overlay'
    popupPosition: 'bottom-right',
    popupWidth: 340,
    btnStyle: 'icon-text',  // 'icon' | 'icon-text' | 'text'
    heading: 'Chapters',
    headingSize: '1.1em',
    descSize: '0.9em',
    showPlayIcon: true,
    showDescriptions: true,
    font: '',
    chapters: [],
    colors: {
      accent: 'hsl(0,0%,20%)',
      title: 'hsl(0,0%,7%)',
      desc: 'hsl(0,0%,40%)',
      border: 'hsl(0,0%,85%)',
      hover: 'hsl(0,0%,96%)'
    },
    // Inline-only
    maxWidth: 0,           // 0 = no constraint
    borderWidth: 1,
    borderRadius: 6,
    padding: '1.25em',
    dividerStyle: 'solid'
  };

  function merge(a, b) {
    var r = {};
    for (var k in a) r[k] = a[k];
    for (var k in b) {
      if (b[k] !== null && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k]) {
        r[k] = merge(a[k], b[k]);
      } else {
        r[k] = b[k];
      }
    }
    return r;
  }

  // ── SVG icons ───────────────────────────────────────────────────
  function menuSvg(size, fill) {
    return '<svg aria-hidden="true" viewBox="0 0 20 20" fill="none" style="width:' + size + 'px;height:' + size + 'px">'
      + '<rect x="1" y="3" width="18" height="2.5" rx="1" fill="' + fill + '"/>'
      + '<rect x="1" y="8.75" width="18" height="2.5" rx="1" fill="' + fill + '"/>'
      + '<rect x="1" y="14.5" width="18" height="2.5" rx="1" fill="' + fill + '"/></svg>';
  }

  function playSvg(color, size) {
    var s = size || 14;
    return '<svg aria-hidden="true" viewBox="0 0 16 16" fill="none" style="width:' + s + 'px;height:' + s + 'px;flex-shrink:0">'
      + '<circle cx="8" cy="8" r="7.5" stroke="' + color + '" stroke-width="1"/>'
      + '<path d="M6.5 5L11 8L6.5 11V5Z" fill="' + color + '"/></svg>';
  }

  // ── CSS generators ──────────────────────────────────────────────
  function fontImport(font) {
    if (!font || font === 'Inherit') return '';
    return "@import url('https://fonts.googleapis.com/css2?family=" + font.replace(/ /g, '+') + ":wght@400;600&display=swap'); ";
  }

  function fontRule(font) {
    if (!font || font === 'Inherit') return '';
    return "font-family:'" + font + "',sans-serif; ";
  }

  function buildPopupCSS(c, cfg) {
    var fi = fontImport(cfg.font), fr = fontRule(cfg.font);
    var posMap = {
      'top-left': 'bottom:calc(100% + 8px);left:0;',
      'top-right': 'bottom:calc(100% + 8px);right:0;',
      'bottom-left': 'top:calc(100% + 8px);left:0;',
      'bottom-right': 'top:calc(100% + 8px);right:0;'
    };
    // Position is set dynamically by positionPopup() on open — CSS just sets a default
    return fi
      + '.vcp-wrap{position:relative;display:inline-block;' + fr + '}'
      + '.vcp-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid ' + c.border + ';border-radius:6px;background:#fff;cursor:pointer;font-size:13px;font-weight:500;color:' + c.title + ';' + fr + 'transition:background .15s}'
      + '.vcp-btn:hover{background:' + c.hover + '}'
      + '.vcp-btn:focus-visible{outline:2px solid ' + c.accent + ';outline-offset:2px}'
      + '.vcp-popup{display:none;position:absolute;top:calc(100% + 8px);right:0;width:' + cfg.popupWidth + 'px;max-width:calc(100vw - 24px);max-height:400px;overflow:hidden;background:#fff;border:1px solid ' + c.border + ';border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.12);z-index:9999}'
      + '.vcp-popup.open{display:flex;flex-direction:column}'
      + '.vcp-header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:.5px solid rgba(128,128,128,.15);flex-shrink:0;background:#fff;border-radius:10px 10px 0 0}'
      + '.vcp-header h4{margin:0;font-size:' + cfg.headingSize + ';color:' + c.title + '}'
      + '.vcp-close{width:28px;height:28px;border:none;background:transparent;cursor:pointer;font-size:18px;color:rgba(128,128,128,.5);display:flex;align-items:center;justify-content:center;border-radius:4px}'
      + '.vcp-close:hover{background:rgba(128,128,128,.08);color:rgba(128,128,128,.8)}'
      + '.vcp-close:focus-visible{outline:2px solid ' + c.accent + ';outline-offset:1px}'
      + '.vcp-list{overflow-y:auto;padding:6px 12px 12px;flex:1}'
      + '.vcp-ch{display:flex;gap:10px;padding:8px 6px;border-radius:6px;cursor:pointer;transition:background .15s;align-items:flex-start}'
      + '.vcp-ch:hover,.vcp-ch:focus-visible{background:' + c.hover + ';outline:none}'
      + '.vcp-ch:focus-visible{box-shadow:0 0 0 2px ' + c.accent + '}'
      + '.vcp-ch:hover .vcp-time,.vcp-ch:focus-visible .vcp-time{text-decoration:underline}'
      + '.vcp-ch.active{background:' + c.hover + '}'
      + '.vcp-time{display:flex;align-items:center;gap:5px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;color:' + c.accent + ';font-size:13px;min-width:70px;padding-top:1px}'
      + '.vcp-info{display:flex;flex-direction:column;gap:1px}'
      + '.vcp-title{font-weight:600;font-size:13px;color:' + c.title + '}'
      + '.vcp-desc{font-size:' + cfg.descSize + ';color:' + c.desc + ';line-height:1.4}'
      + '@media(max-width:480px){.vcp-popup{position:fixed!important;bottom:0!important;top:auto!important;left:0!important;right:0!important;width:100vw!important;max-width:100vw!important;max-height:60vh!important;border-radius:12px 12px 0 0!important;box-shadow:0 -4px 30px rgba(0,0,0,.15)}.vcp-ch{padding:10px 6px}}';
  }

  function buildInlineCSS(c, cfg) {
    var fi = fontImport(cfg.font), fr = fontRule(cfg.font);
    var div = cfg.dividerStyle === 'none' ? 'none' : cfg.dividerStyle === 'dashed' ? '.5px dashed rgba(128,128,128,.3)' : '.5px solid rgba(128,128,128,.15)';

    var mw = cfg.maxWidth > 0 ? 'max-width:' + cfg.maxWidth + 'px;' : '';
    return fi
      + '.video-chapters{' + mw + fr + 'border:' + (cfg.borderWidth > 0 ? cfg.borderWidth + 'px solid ' + c.border : 'none') + ';border-radius:' + cfg.borderRadius + 'px;padding:' + (cfg.borderWidth > 0 ? cfg.padding : '0') + '}'
      + '.video-chapters h4{margin:0 0 1em;font-size:' + cfg.headingSize + ';color:' + c.title + ';font-weight:600}'
      + '.chapter{display:flex;gap:14px;padding:10px 12px;border-radius:6px;cursor:pointer;transition:background .2s;align-items:flex-start;border-bottom:' + div + '}'
      + '.chapter:last-child{border-bottom:none}'
      + '.chapter:hover,.chapter:focus-visible{background:' + c.hover + ';outline:none}'
      + '.chapter:focus-visible{box-shadow:0 0 0 2px ' + c.accent + '}'
      + '.chapter:hover .ch-time,.chapter:focus-visible .ch-time{text-decoration:underline}'
      + '.chapter:hover .ch-play,.chapter:focus-visible .ch-play{opacity:1}'
      + '.chapter.active{background:' + c.hover + '}'
      + '.chapter.active .ch-play{opacity:1}'
      + '.ch-time-col{display:flex;align-items:center;gap:6px;min-width:80px;padding-top:1px}'
      + '.ch-play{width:16px;height:16px;opacity:.35;transition:opacity .2s;flex-shrink:0}'
      + '.ch-play svg{display:block}'
      + '.ch-time{font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;color:' + c.accent + '}'
      + '.ch-info{display:flex;flex-direction:column;gap:2px}'
      + '.ch-title{font-weight:600;color:' + c.title + '}'
      + '.ch-desc{font-size:' + cfg.descSize + ';color:' + c.desc + ';line-height:1.5}'
      + '@media(max-width:480px){.chapter{gap:10px;padding:8px}.ch-time-col{min-width:60px}}';
  }

  function injectionCSS(cfg) {
    if (cfg.position === 'overlay') {
      return '.vcb-video-container{position:relative}'
        + '.vcb-injected-wrap{position:absolute;bottom:48px;right:12px;z-index:10;opacity:0;transition:opacity .25s;pointer-events:none}'
        + '.vcb-video-container:hover .vcb-injected-wrap,.vcb-injected-wrap.vcb-pinned{opacity:1;pointer-events:auto}'
        + '.vcb-injected-wrap .vcp-popup{z-index:9999}'
        + '.vcb-injected-wrap .vcp-btn{background:rgba(0,0,0,.65);color:#fff;border-color:rgba(255,255,255,.2);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}'
        + '.vcb-injected-wrap .vcp-btn:hover{background:rgba(0,0,0,.8)}'
        + '.vcb-injected-wrap .vcp-btn svg rect{fill:#fff}';
    }
    return '.course-item{overflow:visible!important}'
      + '.course-item__lesson-content{overflow:visible!important}'
      + '.content-wrapper{overflow:visible!important}'
      + '.vcb-injected-wrap{display:flex;justify-content:flex-end;padding:6px 16px 0 0;margin-top:-25px;position:relative;z-index:10}'
      + '.vcb-injected-wrap .vcp-popup{z-index:100}'
      + '@media(max-width:480px){.vcb-injected-wrap{margin-top:-8px;padding:6px 12px 0 0}}';
  }

  // ── HTML builders ───────────────────────────────────────────────
  function buildPopupHTML(cfg) {
    var c = cfg.colors;
    var valid = cfg.chapters.filter(function (ch) { return ch.t && ch.title; });
    var btnContent;
    if (cfg.btnStyle === 'icon') btnContent = menuSvg(20, c.title);
    else if (cfg.btnStyle === 'icon-text') btnContent = menuSvg(16, c.title) + ' <span>' + esc(cfg.heading) + '</span>';
    else btnContent = '<span>' + esc(cfg.heading) + '</span>';

    var rows = valid.map(function (ch) {
      var pl = cfg.showPlayIcon ? playSvg(c.accent) + ' ' : '';
      var d = cfg.showDescriptions && ch.desc ? '<span class="vcp-desc">' + esc(ch.desc) + '</span>' : '';
      return '<div class="vcp-ch" role="button" tabindex="0" aria-label="Jump to ' + esc(ch.t) + ' — ' + esc(ch.title) + '" data-time="' + timeToSeconds(ch.t) + '">'
        + '<span class="vcp-time">' + pl + esc(ch.t) + '</span>'
        + '<div class="vcp-info"><span class="vcp-title">' + esc(ch.title) + '</span>' + d + '</div></div>';
    }).join('');

    return '<div class="vcp-wrap">'
      + '<button class="vcp-btn" aria-haspopup="true" aria-expanded="false">' + btnContent + '</button>'
      + '<div class="vcp-popup" role="dialog" aria-label="' + esc(cfg.heading) + '">'
      + '<div class="vcp-header"><h4>' + esc(cfg.heading) + '</h4>'
      + '<button class="vcp-close" aria-label="Close chapters">&times;</button></div>'
      + '<div class="vcp-list" role="navigation" aria-label="Video chapters">' + rows + '</div></div></div>';
  }

  function buildInlineHTML(cfg) {
    var c = cfg.colors;
    var valid = cfg.chapters.filter(function (ch) { return ch.t && ch.title; });
    var pIcon = playSvg(c.accent, 16);

    var rows = valid.map(function (ch) {
      var play = cfg.showPlayIcon ? '<div class="ch-play">' + pIcon + '</div>' : '';
      var d = cfg.showDescriptions && ch.desc ? '<span class="ch-desc">' + esc(ch.desc) + '</span>' : '';
      return '<div class="chapter" role="button" tabindex="0" aria-label="Jump to ' + esc(ch.t) + ' — ' + esc(ch.title) + '" data-time="' + timeToSeconds(ch.t) + '">'
        + '<div class="ch-time-col">' + play + '<span class="ch-time">' + esc(ch.t) + '</span></div>'
        + '<div class="ch-info"><span class="ch-title">' + esc(ch.title) + '</span>' + d + '</div></div>';
    }).join('');

    return '<div class="video-chapters" role="navigation" aria-label="Video chapters">'
      + '<h4>' + esc(cfg.heading) + '</h4>' + rows + '</div>';
  }

  // ── Smart positioning ────────────────────────────────────────────
  function positionPopup(btn, popup, cfg) {
    // On mobile, popup is fixed via CSS — skip JS positioning
    if (window.innerWidth <= 480) return;

    var rect = btn.getBoundingClientRect();
    var spaceBelow = window.innerHeight - rect.bottom;
    var spaceAbove = rect.top;
    var popupHeight = Math.min(popup.scrollHeight || 400, 400); // max-height is 400
    var isRight = (cfg.popupPosition || 'bottom-right').indexOf('right') !== -1;

    // Pick direction: open upward if not enough room below AND more room above
    var openAbove = spaceBelow < popupHeight + 16 && spaceAbove > spaceBelow;

    if (openAbove) {
      popup.style.top = 'auto';
      popup.style.bottom = 'calc(100% + 8px)';
    } else {
      popup.style.bottom = 'auto';
      popup.style.top = 'calc(100% + 8px)';
    }
    popup.style.left = isRight ? 'auto' : '0';
    popup.style.right = isRight ? '0' : 'auto';

    // Dynamic max-height for desktop: constrain to available space
    var availableSpace = openAbove ? spaceAbove - 16 : spaceBelow - 16;
    var constrainedHeight = Math.min(400, Math.max(200, availableSpace));
    popup.style.maxHeight = constrainedHeight + 'px';
  }

  // ── Event wiring ────────────────────────────────────────────────
  function wirePopup(container, cfg) {
    var btn = container.querySelector('.vcp-btn');
    var popup = container.querySelector('.vcp-popup');
    var close = container.querySelector('.vcp-close');
    if (!btn || !popup) return;

    btn.addEventListener('click', function () {
      var open = popup.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
      if (open) positionPopup(btn, popup, cfg);
    });

    if (close) {
      close.addEventListener('click', function () {
        popup.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    }

    document.addEventListener('click', function (e) {
      if (popup.classList.contains('open') && !container.querySelector('.vcp-wrap').contains(e.target)) {
        popup.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && popup.classList.contains('open')) {
        popup.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      }
    });
  }

  function wireChapters(container, selector) {
    function seekChapter(el) {
      var seconds = parseFloat(el.getAttribute('data-time'));
      var section = el.closest('section') || document.body;
      var video = section.querySelector('video') || document.querySelector('video');
      container.querySelectorAll(selector).forEach(function (c) {
        c.classList.remove('active');
        c.setAttribute('aria-current', 'false');
      });
      el.classList.add('active');
      el.setAttribute('aria-current', 'true');
      if (video) { video.currentTime = seconds; video.play(); }
      // Close popup if in popup mode
      var popup = container.querySelector('.vcp-popup');
      if (popup) {
        popup.classList.remove('open');
        var btn = container.querySelector('.vcp-btn');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    }

    container.querySelectorAll(selector).forEach(function (ch) {
      ch.addEventListener('click', function (e) { e.preventDefault(); seekChapter(this); });
      ch.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); seekChapter(this); }
      });
    });
  }

  // ── Injection logic ─────────────────────────────────────────────
  function findInsertPoint(video, cfg) {
    var videoBlock = video.closest('.sqs-block') || video.closest('[class*="fe-block"]') || video.parentElement;

    if (cfg.position === 'overlay') {
      return { parent: videoBlock, mode: 'append' };
    }

    var courseContainer = video.closest('.course-item__video-container');
    if (courseContainer) {
      return { parent: courseContainer.parentNode, mode: 'after', ref: courseContainer };
    }

    var section = video.closest('section') || video.closest('[data-section-id]');
    var grid = section ? section.querySelector('.fluid-engine') : null;
    if (grid) {
      return { parent: grid.parentNode, mode: 'after', ref: grid };
    }

    return {
      parent: videoBlock.parentNode,
      mode: videoBlock.nextSibling ? 'before' : 'append',
      ref: videoBlock.nextSibling || null
    };
  }

  // ── Main entry point ────────────────────────────────────────────
  function VideoChapters(userCfg) {
    var cfg = merge(DEFAULTS, userCfg || {});
    var c = cfg.colors;

    // Normalise chapter keys: accept both 'time' and 't'
    cfg.chapters = cfg.chapters.map(function (ch) {
      return { t: ch.t || ch.time || '', title: ch.title || '', desc: ch.desc || '' };
    });

    // Slug check
    if (cfg.slug) {
      var slug = cfg.slug.charAt(0) === '/' ? cfg.slug : '/' + cfg.slug;
      if (window.location.pathname !== slug) return;
    }

    var containerClass = cfg.mode === 'popup' ? 'vcp-wrap' : 'video-chapters';

    function inject() {
      if (document.querySelector('.' + containerClass)) return;
      var video = document.querySelector('video');
      if (!video) return;

      // CSS
      var styleEl = document.createElement('style');
      var css = cfg.mode === 'popup' ? buildPopupCSS(c, cfg) : buildInlineCSS(c, cfg);
      css += injectionCSS(cfg);
      styleEl.textContent = css;
      document.head.appendChild(styleEl);

      // HTML
      var wrapper = document.createElement('div');
      wrapper.className = 'vcb-injected-wrap';
      wrapper.innerHTML = cfg.mode === 'popup' ? buildPopupHTML(cfg) : buildInlineHTML(cfg);

      // Insert
      var point = findInsertPoint(video, cfg);
      if (point.mode === 'append') {
        if (cfg.position === 'overlay') {
          point.parent.classList.add('vcb-video-container');
          point.parent.appendChild(wrapper);
          // Keep visible while popup open
          var popup = wrapper.querySelector('.vcp-popup');
          if (popup) {
            var obs = new MutationObserver(function () {
              wrapper.classList.toggle('vcb-pinned', popup.classList.contains('open'));
            });
            obs.observe(popup, { attributes: true, attributeFilter: ['class'] });
          }
        } else {
          point.parent.appendChild(wrapper);
        }
      } else if (point.mode === 'after') {
        point.parent.insertBefore(wrapper, point.ref.nextSibling);
      } else if (point.mode === 'before') {
        point.parent.insertBefore(wrapper, point.ref);
      }

      // Wire events
      if (cfg.mode === 'popup') {
        wirePopup(wrapper, cfg);
        wireChapters(wrapper, '.vcp-ch');
      } else {
        wireChapters(wrapper, '.chapter');
      }
    }

    // Run or wait for DOM / video
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', inject);
    } else {
      inject();
    }

    if (!document.querySelector('video')) {
      var obs = new MutationObserver(function () {
        if (document.querySelector('video')) { obs.disconnect(); inject(); }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }

  // Expose globally
  root.VideoChapters = VideoChapters;

})(typeof window !== 'undefined' ? window : this);
